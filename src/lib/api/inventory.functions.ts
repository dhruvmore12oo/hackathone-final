import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type InventoryProductItem = {
  id: string;
  sku: string;
  name: string;
  onHand: number;
  reserved: number;
  freeToUse: number;
  reorderPoint: number;
  unitCost: number;
  inventoryValue: number;
};

export type InventoryMovementItem = {
  id: string;
  time: string;
  sku: string;
  productName: string;
  change: number;
  reason: string;
  balance: number;
  sourceModule: string;
};

export type InventoryOverview = {
  products: InventoryProductItem[];
  movements: InventoryMovementItem[];
  totalValue: number;
  lowStockCount: number;
  movementsToday: number;
};

const adjustInventorySchema = z.object({
  productId: z.string().min(1),
  qtyChange: z.number().refine((value) => value !== 0, "Quantity change cannot be zero."),
  reason: z.string().trim().min(10, "Reason must be at least 10 characters."),
});

function toNumber(value: { toString: () => string }) {
  return Number(value.toString());
}

export const adjustInventory = createServerFn({ method: "POST" })
  .inputValidator(adjustInventorySchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission(["inventory:write", "inventory:adjust_stock"]);

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: data.productId } });

      if (!product || !product.isActive) {
        throw new Response("Product not found.", { status: 404 });
      }

      const qtyBefore = toNumber(product.onHandQty);
      const qtyAfter = qtyBefore + data.qtyChange;

      if (qtyAfter < 0) {
        throw new Response("Adjustment cannot make on-hand stock negative.", { status: 409 });
      }

      await tx.product.update({
        where: { id: product.id },
        data: {
          onHandQty: qtyAfter,
        },
      });

      await tx.stockLedgerEntry.create({
        data: {
          productId: product.id,
          qtyBefore,
          qtyChange: data.qtyChange,
          qtyAfter,
          sourceModule: "Manual Adjustment",
          sourceRefId: product.id,
          sourceRefType: "Product",
          userId: user.id,
          notes: data.reason.trim(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Inventory",
          action: "UPDATED",
          entityType: "Product",
          entityId: product.id,
          fieldChanged: "onHandQty",
          oldValue: String(qtyBefore),
          newValue: String(qtyAfter),
          description: `Adjusted ${product.sku} stock by ${data.qtyChange}.`,
        },
      });
    });

    return { ok: true };
  });

export const getInventoryOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");

  await requirePermission("inventory:read");

  const [products, movements, todayMovements] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.stockLedgerEntry.findMany({
      take: 12,
      orderBy: { occurredAt: "desc" },
      include: { product: true },
    }),
    prisma.stockLedgerEntry.count({
      where: {
        occurredAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  const inventoryProducts = products.map<InventoryProductItem>((product) => {
    const onHand = toNumber(product.onHandQty);
    const reserved = toNumber(product.reservedQty);
    const unitCost = toNumber(product.costPrice);

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      onHand,
      reserved,
      freeToUse: onHand - reserved,
      reorderPoint: toNumber(product.reorderPoint),
      unitCost,
      inventoryValue: onHand * unitCost,
    };
  });

  return {
    products: inventoryProducts,
    movements: movements.map<InventoryMovementItem>((movement) => ({
      id: movement.id,
      time: movement.occurredAt.toISOString(),
      sku: movement.product.sku,
      productName: movement.product.name,
      change: toNumber(movement.qtyChange),
      reason: movement.notes ?? movement.sourceModule,
      balance: toNumber(movement.qtyAfter),
      sourceModule: movement.sourceModule,
    })),
    totalValue: inventoryProducts.reduce((sum, product) => sum + product.inventoryValue, 0),
    lowStockCount: inventoryProducts.filter((product) => product.freeToUse <= product.reorderPoint).length,
    movementsToday: todayMovements,
  } satisfies InventoryOverview;
});
