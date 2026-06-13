import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type VendorListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  rating: number | null;
  leadTime: number | null;
  productCount: number;
  spend: number;
};

const createVendorSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  leadTime: z.number().int().nonnegative().optional(),
});

function toNumber(value: { toString: () => string } | null) {
  return value == null ? null : Number(value.toString());
}

function mapVendor(vendor: any): VendorListItem {
  const spend = vendor.purchaseOrders?.reduce((sum: number, order: any) => sum + Number(order.totalAmount.toString()), 0) ?? 0;

  return {
    id: vendor.id,
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    rating: toNumber(vendor.rating),
    leadTime: vendor.leadTime,
    productCount: vendor._count?.products ?? vendor.products?.length ?? 0,
    spend,
  };
}

export const listVendors = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");

  await requirePermission("vendors:read");

  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { products: true } },
      purchaseOrders: { select: { totalAmount: true } },
    },
    orderBy: { name: "asc" },
  });

  return vendors.map(mapVendor);
});

export const createVendor = createServerFn({ method: "POST" })
  .inputValidator(createVendorSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const user = await requirePermission("vendors:write");
    const vendor = await prisma.vendor.create({
      data: {
        name: data.name.trim(),
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        leadTime: data.leadTime,
      },
      include: {
        _count: { select: { products: true } },
        purchaseOrders: { select: { totalAmount: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        module: "Vendors",
        action: "CREATED",
        entityType: "Vendor",
        entityId: vendor.id,
        description: `Created vendor ${vendor.name}.`,
      },
    });

    return { data: mapVendor(vendor) };
  });
