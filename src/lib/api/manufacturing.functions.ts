import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ManufacturingOrderStatusLabel = "Draft" | "In Progress" | "Completed" | "Cancelled";

export type ManufacturingOrderListItem = {
  id: string;
  moNumber: string;
  product: string;
  sku: string;
  qty: number;
  progress: number;
  status: ManufacturingOrderStatusLabel;
  due: string | null;
  linkedSO: string | null;
  components: { id: string; sku: string; name: string; requiredQty: number; reservedQty: number; consumedQty: number }[];
  workOrders: { id: string; name: string; status: string; sequence: number; durationMins: number }[];
};

const manufacturingOrderIdSchema = z.object({
  id: z.string().min(1),
});

const workOrderStatusSchema = z.object({
  workOrderId: z.string().min(1),
  action: z.enum(["start", "complete"]),
});

const createManufacturingOrderSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().positive(),
  scheduledDate: z.string().optional().nullable(),
});

const statusLabels: Record<string, ManufacturingOrderStatusLabel> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
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

function mapManufacturingOrder(order: any): ManufacturingOrderListItem {
  const totalWorkOrders = order.workOrders.length;
  const completedWorkOrders = order.workOrders.filter((workOrder: any) => workOrder.status === "COMPLETED").length;

  return {
    id: order.id,
    moNumber: order.moNumber,
    product: order.product.name,
    sku: order.product.sku,
    qty: toNumber(order.qty),
    progress: order.status === "COMPLETED" ? 100 : totalWorkOrders > 0 ? Math.round((completedWorkOrders / totalWorkOrders) * 100) : 0,
    status: statusLabels[order.status] ?? "Draft",
    due: order.scheduledDate?.toISOString().slice(0, 10) ?? null,
    linkedSO: order.sourceSo?.soNumber ?? null,
    components: order.components.map((component: any) => ({
      id: component.id,
      sku: component.product.sku,
      name: component.product.name,
      requiredQty: toNumber(component.requiredQty),
      reservedQty: toNumber(component.reservedQty),
      consumedQty: toNumber(component.consumedQty),
    })),
    workOrders: order.workOrders.map((workOrder: any) => ({
      id: workOrder.id,
      name: workOrder.operationName,
      status: workOrder.status,
      sequence: workOrder.sequence,
      durationMins: workOrder.durationMins,
    })),
  };
}

export const listManufacturingOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");

  await requirePermission("manufacturing:read");

  const orders = await prisma.manufacturingOrder.findMany({
    include: {
      product: true,
      sourceSo: true,
      components: {
        include: { product: true },
      },
      workOrders: {
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map(mapManufacturingOrder);
});

export const createManufacturingOrder = createServerFn({ method: "POST" })
  .inputValidator(createManufacturingOrderSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["manufacturing:write", "manufacturing:production_entry"]);
    const product = await prisma.product.findUnique({ where: { id: data.productId } });

    if (!product || !product.isActive) {
      throw new Response("Product not found.", { status: 404 });
    }

    if (product.procurementType !== "MANUFACTURE") {
      throw new Response("Only manufactured products can create manufacturing orders.", { status: 400 });
    }

    const bom = await prisma.billOfMaterials.findUnique({
      where: { productId: product.id },
      include: {
        lines: true,
        operations: { orderBy: { sequence: "asc" } },
      },
    });

    if (!bom || !bom.isActive) {
      throw new Response("This product needs an active BoM before an MO can be created.", { status: 409 });
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.manufacturingOrder.create({
        data: {
          moNumber: makeDocumentNumber("MO"),
          productId: product.id,
          qty: data.qty,
          status: "DRAFT",
          sourceType: "MANUAL",
          bomId: bom.id,
          assigneeId: user.id,
          scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
          components: {
            create: bom.lines.map((line) => ({
              productId: line.componentProductId,
              requiredQty: toNumber(line.qty) * data.qty,
            })),
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
        include: {
          product: true,
          sourceSo: true,
          components: { include: { product: true } },
          workOrders: { orderBy: { sequence: "asc" } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Manufacturing",
          action: "CREATED",
          entityType: "ManufacturingOrder",
          entityId: created.id,
          description: `Created ${created.moNumber} for ${product.sku}.`,
        },
      });

      return created;
    });

    return { data: mapManufacturingOrder(order) };
  });

export const startManufacturingOrder = createServerFn({ method: "POST" })
  .inputValidator(manufacturingOrderIdSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["manufacturing:write", "manufacturing:update_progress"]);

    await prisma.$transaction(async (tx) => {
      const order = await tx.manufacturingOrder.findUnique({
        where: { id: data.id },
        include: {
          components: {
            include: { product: true },
          },
          workOrders: { orderBy: { sequence: "asc" } },
        },
      });

      if (!order) {
        throw new Response("Manufacturing order not found.", { status: 404 });
      }

      if (order.status !== "DRAFT") {
        throw new Response("Only draft manufacturing orders can be started.", { status: 409 });
      }

      for (const component of order.components) {
        const requiredQty = toNumber(component.requiredQty);
        const onHand = toNumber(component.product.onHandQty);
        const reserved = toNumber(component.product.reservedQty);
        const freeToUse = onHand - reserved;

        if (freeToUse < requiredQty) {
          throw new Response(`${component.product.sku} does not have enough free stock to start this MO.`, { status: 409 });
        }

        await tx.product.update({
          where: { id: component.productId },
          data: {
            reservedQty: { increment: requiredQty },
          },
        });

        await tx.manufacturingComponent.update({
          where: { id: component.id },
          data: {
            reservedQty: requiredQty,
          },
        });
      }

      await tx.manufacturingOrder.update({
        where: { id: order.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      const firstWorkOrder = order.workOrders[0];
      if (firstWorkOrder) {
        await tx.workOrder.update({
          where: { id: firstWorkOrder.id },
          data: {
            status: "IN_PROGRESS",
            startedAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Manufacturing",
          action: "STARTED",
          entityType: "ManufacturingOrder",
          entityId: order.id,
          description: `Started ${order.moNumber} and reserved components.`,
        },
      });
    });

    const order = await prisma.manufacturingOrder.findUniqueOrThrow({
      where: { id: data.id },
      include: {
        product: true,
        sourceSo: true,
        components: { include: { product: true } },
        workOrders: { orderBy: { sequence: "asc" } },
      },
    });

    return { data: mapManufacturingOrder(order) };
  });

export const completeManufacturingOrder = createServerFn({ method: "POST" })
  .inputValidator(manufacturingOrderIdSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["manufacturing:write", "manufacturing:complete_wo"]);

    await prisma.$transaction(async (tx) => {
      const order = await tx.manufacturingOrder.findUnique({
        where: { id: data.id },
        include: {
          product: true,
          components: {
            include: { product: true },
          },
          workOrders: true,
        },
      });

      if (!order) {
        throw new Response("Manufacturing order not found.", { status: 404 });
      }

      if (order.status !== "IN_PROGRESS") {
        throw new Response("Only in-progress manufacturing orders can be completed.", { status: 409 });
      }

      for (const component of order.components) {
        const requiredQty = toNumber(component.requiredQty);
        const reservedQty = toNumber(component.reservedQty);
        const onHand = toNumber(component.product.onHandQty);

        if (onHand < requiredQty) {
          throw new Response(`${component.product.sku} does not have enough on-hand stock to consume.`, { status: 409 });
        }

        await tx.product.update({
          where: { id: component.productId },
          data: {
            onHandQty: { decrement: requiredQty },
            reservedQty: { decrement: reservedQty },
          },
        });

        await tx.manufacturingComponent.update({
          where: { id: component.id },
          data: {
            consumedQty: requiredQty,
            reservedQty: 0,
          },
        });

        await tx.stockLedgerEntry.create({
          data: {
            productId: component.productId,
            qtyBefore: onHand,
            qtyChange: -requiredQty,
            qtyAfter: onHand - requiredQty,
            sourceModule: "Manufacturing Consumption",
            sourceRefId: order.id,
            sourceRefType: "ManufacturingOrder",
            userId: user.id,
            notes: `Consumed components for ${order.moNumber}.`,
          },
        });
      }

      const finishedOnHand = toNumber(order.product.onHandQty);
      const producedQty = toNumber(order.qty);

      await tx.product.update({
        where: { id: order.productId },
        data: {
          onHandQty: { increment: producedQty },
        },
      });

      await tx.stockLedgerEntry.create({
        data: {
          productId: order.productId,
          qtyBefore: finishedOnHand,
          qtyChange: producedQty,
          qtyAfter: finishedOnHand + producedQty,
          sourceModule: "Manufacturing Completion",
          sourceRefId: order.id,
          sourceRefType: "ManufacturingOrder",
          userId: user.id,
          notes: `Produced finished goods from ${order.moNumber}.`,
        },
      });

      await tx.workOrder.updateMany({
        where: { moId: order.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      await tx.manufacturingOrder.update({
        where: { id: order.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Manufacturing",
          action: "COMPLETED",
          entityType: "ManufacturingOrder",
          entityId: order.id,
          description: `Completed ${order.moNumber}, consumed components, and produced finished goods.`,
        },
      });
    });

    const order = await prisma.manufacturingOrder.findUniqueOrThrow({
      where: { id: data.id },
      include: {
        product: true,
        sourceSo: true,
        components: { include: { product: true } },
        workOrders: { orderBy: { sequence: "asc" } },
      },
    });

    return { data: mapManufacturingOrder(order) };
  });

export const updateWorkOrderStatus = createServerFn({ method: "POST" })
  .inputValidator(workOrderStatusSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["manufacturing:write", "manufacturing:update_progress"]);

    await prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.findUnique({
        where: { id: data.workOrderId },
        include: {
          manufacturingOrder: {
            include: {
              workOrders: { orderBy: { sequence: "asc" } },
            },
          },
        },
      });

      if (!workOrder) {
        throw new Response("Work order not found.", { status: 404 });
      }

      if (workOrder.manufacturingOrder.status !== "IN_PROGRESS") {
        throw new Response("Manufacturing order must be in progress.", { status: 409 });
      }

      if (data.action === "start") {
        if (workOrder.status !== "PENDING") {
          throw new Response("Work order is not pending.", { status: 409 });
        }

        const hasInProgress = workOrder.manufacturingOrder.workOrders.some((wo) => wo.id !== workOrder.id && wo.status === "IN_PROGRESS");
        if (hasInProgress) {
          throw new Response("Another work order is already in progress. Complete it first.", { status: 409 });
        }

        await tx.workOrder.update({
          where: { id: workOrder.id },
          data: { status: "IN_PROGRESS", startedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            module: "Manufacturing",
            action: "STARTED",
            entityType: "WorkOrder",
            entityId: workOrder.id,
            description: `Started work order "${workOrder.operationName}" on ${workOrder.manufacturingOrder.moNumber}.`,
          },
        });
      }

      if (data.action === "complete") {
        if (workOrder.status !== "IN_PROGRESS") {
          throw new Response("Work order is not in progress.", { status: 409 });
        }

        await tx.workOrder.update({
          where: { id: workOrder.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            module: "Manufacturing",
            action: "COMPLETED",
            entityType: "WorkOrder",
            entityId: workOrder.id,
            description: `Completed work order "${workOrder.operationName}" on ${workOrder.manufacturingOrder.moNumber}.`,
          },
        });
      }
    });

    const workOrder = await prisma.workOrder.findUniqueOrThrow({
      where: { id: data.workOrderId },
      include: { manufacturingOrder: true },
    });

    const order = await prisma.manufacturingOrder.findUniqueOrThrow({
      where: { id: workOrder.moId },
      include: {
        product: true,
        sourceSo: true,
        components: { include: { product: true } },
        workOrders: { orderBy: { sequence: "asc" } },
      },
    });

    return { data: mapManufacturingOrder(order) };
  });

export const cancelManufacturingOrder = createServerFn({ method: "POST" })
  .inputValidator(manufacturingOrderIdSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["manufacturing:write", "manufacturing:delete"]);

    await prisma.$transaction(async (tx) => {
      const order = await tx.manufacturingOrder.findUnique({
        where: { id: data.id },
        include: {
          components: {
            include: { product: true },
          },
          workOrders: true,
        },
      });

      if (!order) {
        throw new Response("Manufacturing order not found.", { status: 404 });
      }

      if (!["DRAFT", "IN_PROGRESS"].includes(order.status)) {
        throw new Response("Only draft or in-progress manufacturing orders can be cancelled.", { status: 409 });
      }

      if (order.status === "IN_PROGRESS") {
        for (const component of order.components) {
          const reservedQty = toNumber(component.reservedQty);

          if (reservedQty > 0) {
            await tx.product.update({
              where: { id: component.productId },
              data: { reservedQty: { decrement: reservedQty } },
            });

            await tx.manufacturingComponent.update({
              where: { id: component.id },
              data: { reservedQty: 0 },
            });
          }
        }
      }

      await tx.workOrder.updateMany({
        where: { moId: order.id, status: { not: "COMPLETED" } },
        data: { status: "CANCELLED" },
      });

      await tx.manufacturingOrder.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Manufacturing",
          action: "CANCELLED",
          entityType: "ManufacturingOrder",
          entityId: order.id,
          description: `Cancelled ${order.moNumber} and released reserved components.`,
        },
      });
    });

    const order = await prisma.manufacturingOrder.findUniqueOrThrow({
      where: { id: data.id },
      include: {
        product: true,
        sourceSo: true,
        components: { include: { product: true } },
        workOrders: { orderBy: { sequence: "asc" } },
      },
    });

    return { data: mapManufacturingOrder(order) };
  });
