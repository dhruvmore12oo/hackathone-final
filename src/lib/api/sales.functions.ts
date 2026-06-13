import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SalesOrderStatusLabel = "Draft" | "Confirmed" | "Partially Delivered" | "Fully Delivered" | "Cancelled";

export type SalesOrderListItem = {
  id: string;
  orderNumber: string;
  customer: string;
  amount: number;
  status: SalesOrderStatusLabel;
  date: string;
  items: { id: string; sku: string; name: string; qty: number; reservedQty: number; deliveredQty: number; price: number }[];
};

export type ProcurementAction = {
  type: "PO" | "MO";
  id: string;
  number: string;
  productId: string;
  qty: number;
};

const salesOrderIdSchema = z.object({
  id: z.string().min(1),
});

const deliverSalesOrderSchema = z.object({
  id: z.string().min(1),
  lines: z.array(z.object({
    lineId: z.string().min(1),
    deliveredQty: z.number().positive(),
  })).min(1),
});

const createSalesOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required."),
  lines: z.array(z.object({
    productId: z.string().min(1),
    qty: z.number().positive(),
  })).min(1, "At least one order line is required."),
});

const statusLabels: Record<string, SalesOrderStatusLabel> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PARTIALLY_DELIVERED: "Partially Delivered",
  FULLY_DELIVERED: "Fully Delivered",
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

function mapSalesOrder(order: any): SalesOrderListItem {
  return {
    id: order.id,
    orderNumber: order.soNumber,
    customer: order.customerName,
    amount: toNumber(order.totalAmount),
    status: statusLabels[order.status] ?? "Draft",
    date: order.createdAt.toISOString().slice(0, 10),
    items: order.lines.map((line: any) => ({
      id: line.id,
      sku: line.product.sku,
      name: line.product.name,
      qty: toNumber(line.orderedQty),
      reservedQty: toNumber(line.reservedQty),
      deliveredQty: toNumber(line.deliveredQty),
      price: toNumber(line.unitPrice),
    })),
  };
}

export const listSalesOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");

  await requirePermission("sales:read");

  const orders = await prisma.salesOrder.findMany({
    include: {
      lines: {
        include: { product: true },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map(mapSalesOrder);
});

export const createSalesOrder = createServerFn({ method: "POST" })
  .inputValidator(createSalesOrderSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["sales:write", "sales:create"]);
    const productIds = data.lines.map((line) => line.productId);
    const uniqueProductIds = [...new Set(productIds)];
    const products = await prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
        isActive: true,
      },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new Response("One or more selected products are invalid.", { status: 400 });
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const totalAmount = data.lines.reduce((sum, line) => {
      const product = productsById.get(line.productId);
      return sum + line.qty * toNumber(product!.salesPrice);
    }, 0);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.salesOrder.create({
        data: {
          soNumber: makeDocumentNumber("SO"),
          customerName: data.customerName.trim(),
          status: "DRAFT",
          totalAmount,
          createdById: user.id,
          lines: {
            create: data.lines.map((line) => {
              const product = productsById.get(line.productId)!;

              return {
                productId: line.productId,
                orderedQty: line.qty,
                unitPrice: product.salesPrice,
              };
            }),
          },
        },
        include: {
          lines: {
            include: { product: true },
            orderBy: { id: "asc" },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Sales Orders",
          action: "CREATED",
          entityType: "SalesOrder",
          entityId: created.id,
          description: `Created ${created.soNumber} for ${created.customerName}.`,
        },
      });

      return created;
    });

    return { data: mapSalesOrder(order) };
  });

export const confirmSalesOrder = createServerFn({ method: "POST" })
  .inputValidator(salesOrderIdSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["sales:write", "sales:approve"]);
    const procurementActions: ProcurementAction[] = [];

    await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: data.id },
        include: {
          lines: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        throw new Response("Sales order not found.", { status: 404 });
      }

      if (order.status !== "DRAFT") {
        throw new Response("Only draft sales orders can be confirmed.", { status: 409 });
      }

      for (const line of order.lines) {
        const orderedQty = toNumber(line.orderedQty);
        const onHand = toNumber(line.product.onHandQty);
        const reserved = toNumber(line.product.reservedQty);
        const freeToUse = Math.max(onHand - reserved, 0);
        const reserveQty = Math.min(orderedQty, freeToUse);
        const shortageQty = orderedQty - reserveQty;

        if (reserveQty > 0) {
          await tx.product.update({
            where: { id: line.productId },
            data: { reservedQty: { increment: reserveQty } },
          });

          await tx.salesOrderLine.update({
            where: { id: line.id },
            data: { reservedQty: reserveQty },
          });
        }

        if (shortageQty <= 0) continue;

        if (!line.product.procureOnDemand) {
          throw new Response(`${line.product.sku} has a shortage of ${shortageQty}, but procure-on-demand is disabled.`, { status: 409 });
        }

        if (line.product.procurementType === "BUY") {
          if (!line.product.vendorId) {
            throw new Response(`${line.product.sku} requires a vendor before auto-purchase can run.`, { status: 409 });
          }

          const po = await tx.purchaseOrder.create({
            data: {
              poNumber: makeDocumentNumber("PO"),
              vendorId: line.product.vendorId,
              status: "DRAFT",
              sourceType: "AUTO",
              sourceSoId: order.id,
              totalAmount: shortageQty * toNumber(line.product.costPrice),
              createdById: user.id,
              lines: {
                create: {
                  productId: line.productId,
                  orderedQty: shortageQty,
                  unitCost: line.product.costPrice,
                },
              },
            },
          });

          procurementActions.push({
            type: "PO",
            id: po.id,
            number: po.poNumber,
            productId: line.productId,
            qty: shortageQty,
          });
        }

        if (line.product.procurementType === "MANUFACTURE") {
          const bom = await tx.billOfMaterials.findUnique({
            where: { productId: line.productId },
            include: {
              lines: { include: { componentProduct: true } },
              operations: { orderBy: { sequence: "asc" } },
            },
          });

          if (!bom || !bom.isActive) {
            throw new Response(`${line.product.sku} requires an active BoM before auto-manufacturing can run.`, { status: 409 });
          }

          const mo = await tx.manufacturingOrder.create({
            data: {
              moNumber: makeDocumentNumber("MO"),
              productId: line.productId,
              qty: shortageQty,
              status: "IN_PROGRESS",
              startedAt: new Date(),
              sourceType: "AUTO",
              sourceSoId: order.id,
              bomId: bom.id,
              components: {
                create: bom.lines.map((bomLine) => {
                  const reqQty = toNumber(bomLine.qty) * shortageQty;
                  const onHand = toNumber(bomLine.componentProduct.onHandQty);
                  const reserved = toNumber(bomLine.componentProduct.reservedQty);
                  const freeToUse = Math.max(onHand - reserved, 0);
                  const reserveQty = Math.min(reqQty, freeToUse);
                  return {
                    productId: bomLine.componentProductId,
                    requiredQty: reqQty,
                    reservedQty: reserveQty,
                  };
                }),
              },
              workOrders: {
                create: bom.operations.map((operation) => ({
                  operationName: operation.name,
                  workCenterId: operation.workCenterId,
                  durationMins: operation.durationMins,
                  sequence: operation.sequence,
                })),
              },
            },
            include: { components: true }
          });

          for (const component of mo.components) {
             const resQty = toNumber(component.reservedQty);
             if (resQty > 0) {
               await tx.product.update({
                 where: { id: component.productId },
                 data: { reservedQty: { increment: resQty } }
               });
             }
          }

          procurementActions.push({
            type: "MO",
            id: mo.id,
            number: mo.moNumber,
            productId: line.productId,
            qty: shortageQty,
          });
        }
      }

      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Sales Orders",
          action: "CONFIRMED",
          entityType: "SalesOrder",
          entityId: order.id,
          description: `Confirmed ${order.soNumber} and ran procurement checks.`,
        },
      });
    });

    const order = await prisma.salesOrder.findUniqueOrThrow({
      where: { id: data.id },
      include: {
        lines: {
          include: { product: true },
          orderBy: { id: "asc" },
        },
      },
    });

    return {
      data: mapSalesOrder(order),
      procurementActions,
    };
  });

export const deliverSalesOrder = createServerFn({ method: "POST" })
  .inputValidator(deliverSalesOrderSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");
    const { hasPermission } = await import("../auth/roles");

    const user = await requirePermission(["sales:write", "sales:edit_own"]);

    await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: data.id },
        include: {
          lines: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        throw new Response("Sales order not found.", { status: 404 });
      }

      if (!hasPermission(user.role, "sales:write") && order.createdById !== user.id) {
        throw new Response("Forbidden: You can only edit your own sales orders.", { status: 403 });
      }

      if (!["CONFIRMED", "PARTIALLY_DELIVERED"].includes(order.status)) {
        throw new Response("Only confirmed sales orders can be delivered.", { status: 409 });
      }

      for (const requestedLine of data.lines) {
        const line = order.lines.find((item) => item.id === requestedLine.lineId);

        if (!line) {
          throw new Response("Sales order line not found.", { status: 404 });
        }

        const deliveredQty = requestedLine.deliveredQty;
        const orderedQty = toNumber(line.orderedQty);
        const alreadyDelivered = toNumber(line.deliveredQty);
        const remainingQty = orderedQty - alreadyDelivered;

        if (deliveredQty > remainingQty) {
          throw new Response("Delivered quantity cannot exceed the remaining order quantity.", { status: 409 });
        }

        const onHand = toNumber(line.product.onHandQty);
        const productReserved = toNumber(line.product.reservedQty);
        const lineReserved = toNumber(line.reservedQty);
        const releaseReservedQty = Math.min(productReserved, lineReserved, deliveredQty);

        if (onHand < deliveredQty) {
          throw new Response(`${line.product.sku} does not have enough on-hand stock for delivery.`, { status: 409 });
        }

        await tx.product.update({
          where: { id: line.productId },
          data: {
            onHandQty: { decrement: deliveredQty },
            reservedQty: { decrement: releaseReservedQty },
          },
        });

        await tx.salesOrderLine.update({
          where: { id: line.id },
          data: {
            deliveredQty: { increment: deliveredQty },
            reservedQty: { decrement: releaseReservedQty },
          },
        });

        await tx.stockLedgerEntry.create({
          data: {
            productId: line.productId,
            qtyBefore: onHand,
            qtyChange: -deliveredQty,
            qtyAfter: onHand - deliveredQty,
            sourceModule: "Sales Delivery",
            sourceRefId: order.id,
            sourceRefType: "SalesOrder",
            userId: user.id,
            notes: `Delivered ${deliveredQty} units for ${order.soNumber}.`,
          },
        });
      }

      const freshLines = await tx.salesOrderLine.findMany({
        where: { salesOrderId: order.id },
      });

      const isFullyDelivered = freshLines.every((line) => toNumber(line.deliveredQty) >= toNumber(line.orderedQty));

      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          status: isFullyDelivered ? "FULLY_DELIVERED" : "PARTIALLY_DELIVERED",
          deliveredAt: isFullyDelivered ? new Date() : null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Sales Orders",
          action: "DELIVERED",
          entityType: "SalesOrder",
          entityId: order.id,
          description: `Delivered stock for ${order.soNumber}.`,
        },
      });
    });

    const order = await prisma.salesOrder.findUniqueOrThrow({
      where: { id: data.id },
      include: {
        lines: {
          include: { product: true },
          orderBy: { id: "asc" },
        },
      },
    });

    return { data: mapSalesOrder(order) };
  });

export const cancelSalesOrder = createServerFn({ method: "POST" })
  .inputValidator(salesOrderIdSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["sales:write", "sales:delete"]);

    await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: data.id },
        include: {
          lines: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        throw new Response("Sales order not found.", { status: 404 });
      }

      if (!["DRAFT", "CONFIRMED"].includes(order.status)) {
        throw new Response("Only draft or confirmed sales orders can be cancelled.", { status: 409 });
      }

      for (const line of order.lines) {
        const lineReserved = toNumber(line.reservedQty);

        if (lineReserved > 0) {
          await tx.product.update({
            where: { id: line.productId },
            data: { reservedQty: { decrement: lineReserved } },
          });

          await tx.salesOrderLine.update({
            where: { id: line.id },
            data: { reservedQty: 0 },
          });
        }
      }

      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Sales Orders",
          action: "CANCELLED",
          entityType: "SalesOrder",
          entityId: order.id,
          description: `Cancelled ${order.soNumber} and released reserved stock.`,
        },
      });
    });

    const order = await prisma.salesOrder.findUniqueOrThrow({
      where: { id: data.id },
      include: {
        lines: {
          include: { product: true },
          orderBy: { id: "asc" },
        },
      },
    });

    return { data: mapSalesOrder(order) };
  });
