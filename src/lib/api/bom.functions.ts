import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type BomListItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  lines: { id: string; productId: string; sku: string; name: string; qty: number; uom: string }[];
  operations: { id: string; name: string; workCenter: string; workCenterId: string; durationMins: number; sequence: number }[];
};

export type WorkCenterListItem = {
  id: string;
  name: string;
  code: string;
};

const createBomSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().positive(),
  lines: z.array(z.object({
    componentProductId: z.string().min(1),
    qty: z.number().positive(),
  })).min(1),
  operations: z.array(z.object({
    name: z.string().trim().min(1),
    workCenterId: z.string().min(1),
    durationMins: z.number().int().positive(),
    sequence: z.number().int().positive(),
  })).min(1),
});

function toNumber(value: { toString: () => string }) {
  return Number(value.toString());
}

function mapBom(bom: any): BomListItem {
  return {
    id: bom.id,
    productId: bom.productId,
    productName: bom.product.name,
    sku: bom.product.sku,
    qty: toNumber(bom.qty),
    lines: bom.lines.map((line: any) => ({
      id: line.id,
      productId: line.componentProductId,
      sku: line.componentProduct.sku,
      name: line.componentProduct.name,
      qty: toNumber(line.qty),
      uom: line.uom,
    })),
    operations: bom.operations.map((operation: any) => ({
      id: operation.id,
      name: operation.name,
      workCenter: operation.workCenter.name,
      workCenterId: operation.workCenterId,
      durationMins: operation.durationMins,
      sequence: operation.sequence,
    })),
  };
}

export const listBoms = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");

  await requirePermission("bom:read");

  const boms = await prisma.billOfMaterials.findMany({
    where: { isActive: true },
    include: {
      product: true,
      lines: {
        include: { componentProduct: true },
        orderBy: { id: "asc" },
      },
      operations: {
        include: { workCenter: true },
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return boms.map(mapBom);
});

const getBomSchema = z.object({ productId: z.string().min(1) });

export const getBomByProduct = createServerFn({ method: "GET" })
  .inputValidator(getBomSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");
    
    await requirePermission("bom:read");
    
    const bom = await prisma.billOfMaterials.findUnique({
      where: { productId: data.productId },
      include: {
        product: true,
        lines: {
          include: { componentProduct: true },
          orderBy: { id: "asc" },
        },
        operations: {
          include: { workCenter: true },
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!bom || !bom.isActive) return null;
    return mapBom(bom);
  });

export const listWorkCenters = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");

  await requirePermission("bom:read");

  const workCenters = await prisma.workCenter.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });

  return workCenters.map<WorkCenterListItem>((workCenter) => ({
    id: workCenter.id,
    name: workCenter.name,
    code: workCenter.code,
  }));
});

export const createBom = createServerFn({ method: "POST" })
  .inputValidator(createBomSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission("bom:write");

    if (data.lines.some((line) => line.componentProductId === data.productId)) {
      throw new Response("A product cannot be a component of its own BoM.", { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product || !product.isActive) {
      throw new Response("Finished product not found.", { status: 404 });
    }

    const componentIds = [...new Set(data.lines.map((line) => line.componentProductId))];
    const components = await prisma.product.count({
      where: { id: { in: componentIds }, isActive: true },
    });
    if (components !== componentIds.length) {
      throw new Response("One or more components are invalid.", { status: 400 });
    }

    const workCenterIds = [...new Set(data.operations.map((operation) => operation.workCenterId))];
    const workCenters = await prisma.workCenter.count({
      where: { id: { in: workCenterIds }, isActive: true },
    });
    if (workCenters !== workCenterIds.length) {
      throw new Response("One or more work centers are invalid.", { status: 400 });
    }

    const bom = await prisma.$transaction(async (tx) => {
      const existing = await tx.billOfMaterials.findUnique({ where: { productId: data.productId } });
      const saved = existing
        ? await tx.billOfMaterials.update({
            where: { id: existing.id },
            data: {
              name: `${product.name} BoM`,
              qty: data.qty,
              isActive: true,
              createdById: user.id,
            },
          })
        : await tx.billOfMaterials.create({
            data: {
              productId: product.id,
              name: `${product.name} BoM`,
              qty: data.qty,
              createdById: user.id,
            },
          });

      await tx.bomLine.deleteMany({ where: { bomId: saved.id } });
      await tx.bomOperation.deleteMany({ where: { bomId: saved.id } });

      await tx.bomLine.createMany({
        data: data.lines.map((line) => ({
          bomId: saved.id,
          componentProductId: line.componentProductId,
          qty: line.qty,
        })),
      });

      await tx.bomOperation.createMany({
        data: data.operations.map((operation) => ({
          bomId: saved.id,
          name: operation.name.trim(),
          workCenterId: operation.workCenterId,
          durationMins: operation.durationMins,
          sequence: operation.sequence,
        })),
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Bill of Materials",
          action: existing ? "UPDATED" : "CREATED",
          entityType: "BillOfMaterials",
          entityId: saved.id,
          description: `${existing ? "Updated" : "Created"} BoM for ${product.sku}.`,
        },
      });

      return tx.billOfMaterials.findUniqueOrThrow({
        where: { id: saved.id },
        include: {
          product: true,
          lines: { include: { componentProduct: true }, orderBy: { id: "asc" } },
          operations: { include: { workCenter: true }, orderBy: { sequence: "asc" } },
        },
      });
    });

    return { data: mapBom(bom) };
  });

const bomIdSchema = z.object({
  id: z.string().min(1),
});

export const deactivateBom = createServerFn({ method: "POST" })
  .inputValidator(bomIdSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission("bom:write");

    await prisma.$transaction(async (tx) => {
      const bom = await tx.billOfMaterials.findUnique({
        where: { id: data.id },
        include: { product: true },
      });

      if (!bom) {
        throw new Response("BoM not found.", { status: 404 });
      }

      await tx.billOfMaterials.update({
        where: { id: data.id },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "Bill of Materials",
          action: "DELETED",
          entityType: "BillOfMaterials",
          entityId: bom.id,
          description: `Deactivated BoM for ${bom.product.sku}.`,
        },
      });
    });

    return { ok: true };
  });
