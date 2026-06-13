import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
});

const createProductSchema = z.object({
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  salesPrice: z.number().positive(),
  costPrice: z.number().positive(),
  onHandQty: z.number().nonnegative(),
  reorderPoint: z.number().nonnegative(),
  uom: z.string().trim().min(1),
  procureOnDemand: z.boolean(),
  procurementType: z.enum(["BUY", "MANUFACTURE"]),
  vendorId: z.string().optional().nullable(),
});

export type ProductListItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  procurement: "Buy" | "Manufacture";
  salesPrice: number;
  costPrice: number;
  onHand: number;
  reserved: number;
  freeToUse: number;
  reorderPoint: number;
  unit: string;
  vendorId: string | null;
  vendorName: string | null;
};

function toNumber(value: { toString: () => string }) {
  return Number(value.toString());
}

function mapProduct(product: any): ProductListItem {
  const onHand = toNumber(product.onHandQty);
  const reserved = toNumber(product.reservedQty);

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    procurement: product.procurementType === "BUY" ? "Buy" : "Manufacture",
    salesPrice: toNumber(product.salesPrice),
    costPrice: toNumber(product.costPrice),
    onHand,
    reserved,
    freeToUse: onHand - reserved,
    reorderPoint: toNumber(product.reorderPoint),
    unit: product.uom,
    vendorId: product.vendorId ?? null,
    vendorName: product.vendor?.name ?? null,
  };
}

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator(productQuerySchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    await requirePermission("products:read");

    const search = data.search?.trim();
    const category = data.category && data.category !== "All" ? data.category : undefined;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { sku: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        vendor: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return products.map<ProductListItem>(mapProduct);
  });

export const listProductCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");

  await requirePermission("products:read");

  const categories = await prisma.product.findMany({
    where: { isActive: true },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });

  return ["All", ...categories.map((item) => item.category)];
});

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator(createProductSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission("products:write");
    const sku = data.sku.trim().toUpperCase();

    if (data.procurementType === "BUY" && !data.vendorId) {
      throw new Response("Vendor is required for purchased products.", { status: 400 });
    }

    if (data.vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor || !vendor.isActive) {
        throw new Response("Selected vendor is not active.", { status: 400 });
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku,
          name: data.name.trim(),
          category: data.category.trim(),
          salesPrice: data.salesPrice,
          costPrice: data.costPrice,
          onHandQty: data.onHandQty,
          reorderPoint: data.reorderPoint,
          uom: data.uom.trim(),
          procureOnDemand: data.procureOnDemand,
          procurementType: data.procurementType,
          vendorId: data.procurementType === "BUY" ? data.vendorId : null,
        },
        include: { vendor: true },
      });

      if (data.onHandQty > 0) {
        await tx.stockLedgerEntry.create({
          data: {
            productId: created.id,
            qtyBefore: 0,
            qtyChange: data.onHandQty,
            qtyAfter: data.onHandQty,
            sourceModule: "Product Opening Stock",
            sourceRefId: created.id,
            sourceRefType: "Product",
            userId: user.id,
            notes: "Opening stock entered during product creation.",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Products",
          action: "CREATED",
          entityType: "Product",
          entityId: created.id,
          description: `Created product ${created.sku}.`,
        },
      });

      return created;
    });

    return { data: mapProduct(product) };
  });

const updateProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  salesPrice: z.number().positive(),
  costPrice: z.number().positive(),
  reorderPoint: z.number().nonnegative(),
  uom: z.string().trim().min(1),
  procureOnDemand: z.boolean(),
  procurementType: z.enum(["BUY", "MANUFACTURE"]),
  vendorId: z.string().optional().nullable(),
});

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator(updateProductSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission("products:write");

    const existing = await prisma.product.findUnique({ where: { id: data.id } });
    if (!existing || !existing.isActive) {
      throw new Response("Product not found.", { status: 404 });
    }

    if (data.procurementType === "BUY" && !data.vendorId) {
      throw new Response("Vendor is required for purchased products.", { status: 400 });
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: data.id },
        data: {
          name: data.name.trim(),
          category: data.category.trim(),
          salesPrice: data.salesPrice,
          costPrice: data.costPrice,
          reorderPoint: data.reorderPoint,
          uom: data.uom.trim(),
          procureOnDemand: data.procureOnDemand,
          procurementType: data.procurementType,
          vendorId: data.procurementType === "BUY" ? data.vendorId : null,
        },
        include: { vendor: true },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Products",
          action: "UPDATED",
          entityType: "Product",
          entityId: updated.id,
          description: `Updated product ${updated.sku}.`,
        },
      });

      return updated;
    });

    return { data: mapProduct(product) };
  });

const productIdSchema = z.object({
  id: z.string().min(1),
});

export const deactivateProduct = createServerFn({ method: "POST" })
  .inputValidator(productIdSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission("products:write");

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: data.id } });
      if (!product) {
        throw new Response("Product not found.", { status: 404 });
      }

      await tx.product.update({
        where: { id: data.id },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Products",
          action: "DELETED",
          entityType: "Product",
          entityId: product.id,
          description: `Deactivated product ${product.sku}.`,
        },
      });
    });

    return { ok: true };
  });
