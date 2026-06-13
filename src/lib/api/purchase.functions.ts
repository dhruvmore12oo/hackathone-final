import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PurchaseOrderStatusLabel = "Draft" | "Pending Approval" | "Approved" | "Confirmed" | "Partially Received" | "Fully Received" | "Cancelled";

export type PurchaseOrderListItem = {
  id: string;
  poNumber: string;
  vendor: string;
  itemSummary: string;
  amount: number;
  status: PurchaseOrderStatusLabel;
  sourceType: "Manual" | "Auto";
  sourceSoNumber: string | null;
  date: string;
  lines: { id: string; sku: string; name: string; orderedQty: number; receivedQty: number; unitCost: number }[];
};

const purchaseOrderIdSchema = z.object({
  id: z.string().min(1),
});

const createPurchaseOrderSchema = z.object({
  vendorId: z.string().min(1),
  lines: z.array(z.object({
    productId: z.string().min(1),
    qty: z.number().positive(),
  })).min(1),
});

const receivePurchaseOrderSchema = z.object({
  id: z.string().min(1),
  lines: z.array(z.object({
    lineId: z.string().min(1),
    receivedQty: z.number().positive(),
  })).min(1),
});

const statusLabels: Record<string, PurchaseOrderStatusLabel> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  CONFIRMED: "Confirmed",
  PARTIALLY_RECEIVED: "Partially Received",
  FULLY_RECEIVED: "Fully Received",
  CANCELLED: "Cancelled",
};

function toNumber(value: { toString: () => string }) {
  return Number(value.toString());
}

function makeDocumentNumber(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}-${stamp}-${suffix}`;
}

function mapPurchaseOrder(order: any): PurchaseOrderListItem {
  const lines: PurchaseOrderListItem["lines"] = order.lines.map((line: any) => ({
    id: line.id,
    sku: line.product.sku,
    name: line.product.name,
    orderedQty: toNumber(line.orderedQty),
    receivedQty: toNumber(line.receivedQty),
    unitCost: toNumber(line.unitCost),
  }));

  return {
    id: order.id,
    poNumber: order.poNumber,
    vendor: order.vendor.name,
    itemSummary: lines.map((line) => `${line.name} x ${line.orderedQty}`).join(", "),
    amount: toNumber(order.totalAmount),
    status: statusLabels[order.status] ?? "Draft",
    sourceType: order.sourceType === "AUTO" ? "Auto" : "Manual",
    sourceSoNumber: order.sourceSo?.soNumber ?? null,
    date: order.createdAt.toISOString().slice(0, 10),
    lines,
  };
}

export const listPurchaseOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");

  await requirePermission("purchase:read");

  const orders = await prisma.purchaseOrder.findMany({
    include: {
      vendor: true,
      sourceSo: true,
      lines: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map(mapPurchaseOrder);
});

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .inputValidator(createPurchaseOrderSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["purchase:write", "purchase:create"]);
    const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });

    if (!vendor || !vendor.isActive) {
      throw new Response("Vendor is required.", { status: 400 });
    }

    const productIds = [...new Set(data.lines.map((line) => line.productId))];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new Response("One or more selected products are invalid.", { status: 400 });
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const totalAmount = data.lines.reduce((sum, line) => {
      const product = productsById.get(line.productId);
      return sum + line.qty * toNumber(product!.costPrice);
    }, 0);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          poNumber: makeDocumentNumber("PO"),
          vendorId: vendor.id,
          status: "DRAFT",
          sourceType: "MANUAL",
          totalAmount,
          createdById: user.id,
          lines: {
            create: data.lines.map((line) => {
              const product = productsById.get(line.productId)!;

              return {
                productId: line.productId,
                orderedQty: line.qty,
                unitCost: product.costPrice,
              };
            }),
          },
        },
        include: {
          vendor: true,
          sourceSo: true,
          lines: { include: { product: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Purchase Orders",
          action: "CREATED",
          entityType: "PurchaseOrder",
          entityId: created.id,
          description: `Created ${created.poNumber}.`,
        },
      });

      return created;
    });

    return { data: mapPurchaseOrder(order) };
  });

export const requestPurchaseApproval = createServerFn({ method: "POST" })
  .inputValidator(purchaseOrderIdSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["purchase:write"]);

    await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({ where: { id: data.id } });

      if (!order) {
        throw new Response("Purchase order not found.", { status: 404 });
      }

      if (order.status !== "DRAFT") {
        throw new Response("Only draft purchase orders can be submitted for approval.", { status: 409 });
      }

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: "PENDING_APPROVAL",
        },
      });

      await tx.approvalRequest.create({
        data: {
          module: "PURCHASE",
          entityId: order.id,
          requestedById: user.id,
          status: "PENDING",
        }
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Purchase Orders",
          action: "REQUESTED_APPROVAL",
          entityType: "PurchaseOrder",
          entityId: order.id,
          description: `Requested approval for ${order.poNumber}.`,
        },
      });
    });

    const order = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: data.id },
      include: {
        vendor: true,
        sourceSo: true,
        lines: { include: { product: true } },
      },
    });

    return { data: mapPurchaseOrder(order) };
  });

export const approvePurchaseOrder = createServerFn({ method: "POST" })
  .inputValidator(purchaseOrderIdSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["approvals:manage"]);

    await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({ where: { id: data.id } });

      if (!order) {
        throw new Response("Purchase order not found.", { status: 404 });
      }

      if (order.status !== "PENDING_APPROVAL") {
        throw new Response("Only pending purchase orders can be approved.", { status: 409 });
      }

      const approval = await tx.approvalRequest.findFirst({
        where: { module: "PURCHASE", entityId: order.id, status: "PENDING" },
      });

      if (approval && approval.requestedById === user.id) {
         throw new Response("You cannot approve your own request.", { status: 403 });
      }

      if (approval) {
        await tx.approvalRequest.update({
          where: { id: approval.id },
          data: { status: "APPROVED", reviewerId: user.id, reviewedAt: new Date() }
        });
      }

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Purchase Orders",
          action: "APPROVED",
          entityType: "PurchaseOrder",
          entityId: order.id,
          description: `Approved ${order.poNumber}.`,
        },
      });
    });

    const order = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: data.id },
      include: {
        vendor: true,
        sourceSo: true,
        lines: { include: { product: true } },
      },
    });

    return { data: mapPurchaseOrder(order) };
  });

export const receivePurchaseOrder = createServerFn({ method: "POST" })
  .inputValidator(receivePurchaseOrderSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");
    const { hasPermission } = await import("../auth/roles");

    const user = await requirePermission(["purchase:write", "purchase:edit_own"]);

    await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id: data.id },
        include: {
          lines: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        throw new Response("Purchase order not found.", { status: 404 });
      }

      if (!hasPermission(user.role, "purchase:write") && order.createdById !== user.id) {
        throw new Response("Forbidden: You can only edit your own purchase orders.", { status: 403 });
      }

      if (!["CONFIRMED", "PARTIALLY_RECEIVED"].includes(order.status)) {
        throw new Response("Only confirmed purchase orders can be received.", { status: 409 });
      }

      const receiveMap = new Map(data.lines.map((l) => [l.lineId, l.receivedQty]));

      for (const line of order.lines) {
        const receiveQty = receiveMap.get(line.id);
        if (!receiveQty || receiveQty <= 0) continue;

        const orderedQty = toNumber(line.orderedQty);
        const alreadyReceived = toNumber(line.receivedQty);
        const maxReceivable = orderedQty - alreadyReceived;
        const actualReceive = Math.min(receiveQty, maxReceivable);

        if (actualReceive <= 0) continue;

        const onHand = toNumber(line.product.onHandQty);

        await tx.product.update({
          where: { id: line.productId },
          data: {
            onHandQty: { increment: actualReceive },
          },
        });

        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: {
            receivedQty: { increment: actualReceive },
          },
        });

        await tx.stockLedgerEntry.create({
          data: {
            productId: line.productId,
            qtyBefore: onHand,
            qtyChange: actualReceive,
            qtyAfter: onHand + actualReceive,
            sourceModule: "Purchase Receipt",
            sourceRefId: order.id,
            sourceRefType: "PurchaseOrder",
            userId: user.id,
            notes: `Received ${actualReceive} units against ${order.poNumber}.`,
          },
        });
      }

      const updatedLines = await tx.purchaseOrderLine.findMany({
        where: { poId: order.id },
      });

      const allFullyReceived = updatedLines.every(
        (line) => toNumber(line.receivedQty) >= toNumber(line.orderedQty),
      );

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: allFullyReceived ? "FULLY_RECEIVED" : "PARTIALLY_RECEIVED",
          receivedAt: allFullyReceived ? new Date() : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Purchase Orders",
          action: "RECEIVED",
          entityType: "PurchaseOrder",
          entityId: order.id,
          description: `Received goods for ${order.poNumber}${allFullyReceived ? " (fully received)." : " (partial receipt)."}`,
        },
      });
    });

    const order = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: data.id },
      include: {
        vendor: true,
        sourceSo: true,
        lines: { include: { product: true } },
      },
    });

    return { data: mapPurchaseOrder(order) };
  });

export const cancelPurchaseOrder = createServerFn({ method: "POST" })
  .inputValidator(purchaseOrderIdSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["purchase:write", "purchase:delete"]);

    await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({ where: { id: data.id } });

      if (!order) {
        throw new Response("Purchase order not found.", { status: 404 });
      }

      if (!["DRAFT", "CONFIRMED"].includes(order.status)) {
        throw new Response("Only draft or confirmed purchase orders can be cancelled.", { status: 409 });
      }

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Purchase Orders",
          action: "CANCELLED",
          entityType: "PurchaseOrder",
          entityId: order.id,
          description: `Cancelled ${order.poNumber}.`,
        },
      });
    });

    const order = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: data.id },
      include: {
        vendor: true,
        sourceSo: true,
        lines: { include: { product: true } },
      },
    });

    return { data: mapPurchaseOrder(order) };
  });
