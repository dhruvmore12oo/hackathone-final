import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import process from "node:process";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DIRECT_URL or DATABASE_URL before running the seed script.");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const adminEmail = process.env.APP_ADMIN_EMAIL ?? "dhruvmoreutk@gmail.com";

async function getOrCreateVendor(name: string, data: { email?: string; phone?: string; address?: string; rating?: number; leadTime?: number }) {
  const existing = await prisma.vendor.findFirst({ where: { name } });

  if (existing) {
    return prisma.vendor.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.vendor.create({
    data: {
      name,
      ...data,
    },
  });
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      clerkUserId: `seed:${adminEmail}`,
      email: adminEmail,
      name: "Dhruv More",
      role: "ADMIN",
    },
    update: {
      name: "Dhruv More",
      role: "ADMIN",
      isActive: true,
    },
  });

  const oakwood = await getOrCreateVendor("Prime Wood Suppliers", {
    email: "orders@primewood.example",
    phone: "+91 98765 10001",
    address: "Industrial Estate, Pune",
    rating: 4.8,
    leadTime: 5,
  });

  const techbolt = await getOrCreateVendor("TechBolt Industries", {
    email: "sales@techbolt.example",
    phone: "+91 98765 10002",
    address: "Hardware Market, Hyderabad",
    rating: 4.6,
    leadTime: 2,
  });

  const leather = await getOrCreateVendor("Hyderabad Leather Mills", {
    email: "supply@hydleather.example",
    phone: "+91 98765 10003",
    address: "Balanagar, Hyderabad",
    rating: 4.3,
    leadTime: 7,
  });

  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: "FRN-TBL-OAK" },
      create: {
        sku: "FRN-TBL-OAK",
        name: "Wooden Dining Table",
        category: "Furniture",
        salesPrice: 24500,
        costPrice: 9200,
        onHandQty: 5,
        reservedQty: 0,
        reorderPoint: 10,
        uom: "pcs",
        procureOnDemand: true,
        procurementType: "MANUFACTURE",
      },
      update: {
        name: "Wooden Dining Table",
        category: "Furniture",
        salesPrice: 24500,
        costPrice: 9200,
        onHandQty: 5,
        reservedQty: 0,
        reorderPoint: 10,
        procureOnDemand: true,
        procurementType: "MANUFACTURE",
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: "FRN-CHR-WOD" },
      create: {
        sku: "FRN-CHR-WOD",
        name: "Wooden Chair",
        category: "Furniture",
        salesPrice: 6800,
        costPrice: 2400,
        onHandQty: 50,
        reservedQty: 0,
        reorderPoint: 20,
        uom: "pcs",
        procureOnDemand: false,
        procurementType: "MANUFACTURE",
      },
      update: {
        name: "Wooden Chair",
        category: "Furniture",
        salesPrice: 6800,
        costPrice: 2400,
        onHandQty: 50,
        reservedQty: 0,
        reorderPoint: 20,
        procureOnDemand: false,
        procurementType: "MANUFACTURE",
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: "FRN-CHR-OFC" },
      create: {
        sku: "FRN-CHR-OFC",
        name: "Office Chair",
        category: "Furniture",
        salesPrice: 12800,
        costPrice: 7200,
        onHandQty: 2,
        reservedQty: 0,
        reorderPoint: 8,
        uom: "pcs",
        procureOnDemand: true,
        procurementType: "BUY",
        vendorId: leather.id,
      },
      update: {
        name: "Office Chair",
        category: "Furniture",
        salesPrice: 12800,
        costPrice: 7200,
        onHandQty: 2,
        reservedQty: 0,
        reorderPoint: 8,
        procureOnDemand: true,
        procurementType: "BUY",
        vendorId: leather.id,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: "RAW-TOP-OAK" },
      create: {
        sku: "RAW-TOP-OAK",
        name: "Wooden Top - Oak",
        category: "Raw Material",
        salesPrice: 3200,
        costPrice: 2200,
        onHandQty: 25,
        reservedQty: 0,
        reorderPoint: 30,
        uom: "pcs",
        procureOnDemand: false,
        procurementType: "BUY",
        vendorId: oakwood.id,
      },
      update: {
        name: "Wooden Top - Oak",
        category: "Raw Material",
        salesPrice: 3200,
        costPrice: 2200,
        onHandQty: 25,
        reservedQty: 0,
        reorderPoint: 30,
        procurementType: "BUY",
        vendorId: oakwood.id,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: "RAW-LEG-OAK" },
      create: {
        sku: "RAW-LEG-OAK",
        name: "Wooden Leg - Oak",
        category: "Raw Material",
        salesPrice: 480,
        costPrice: 330,
        onHandQty: 120,
        reservedQty: 0,
        reorderPoint: 80,
        uom: "pcs",
        procureOnDemand: false,
        procurementType: "BUY",
        vendorId: oakwood.id,
      },
      update: {
        name: "Wooden Leg - Oak",
        category: "Raw Material",
        salesPrice: 480,
        costPrice: 330,
        onHandQty: 120,
        reservedQty: 0,
        reorderPoint: 80,
        procurementType: "BUY",
        vendorId: oakwood.id,
        isActive: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: "RAW-SCR-M8" },
      create: {
        sku: "RAW-SCR-M8",
        name: "Steel Screw M8",
        category: "Hardware",
        salesPrice: 4,
        costPrice: 2,
        onHandQty: 500,
        reservedQty: 0,
        reorderPoint: 1000,
        uom: "pcs",
        procureOnDemand: false,
        procurementType: "BUY",
        vendorId: techbolt.id,
      },
      update: {
        name: "Steel Screw M8",
        category: "Hardware",
        salesPrice: 4,
        costPrice: 2,
        onHandQty: 500,
        reservedQty: 0,
        reorderPoint: 1000,
        procurementType: "BUY",
        vendorId: techbolt.id,
        isActive: true,
      },
    }),
  ]);

  const bySku = Object.fromEntries(products.map((product) => [product.sku, product]));

  await prisma.stockLedgerEntry.deleteMany({
    where: { sourceModule: "Seed" },
  });

  await prisma.stockLedgerEntry.createMany({
    data: products.map((product) => ({
      productId: product.id,
      qtyBefore: 0,
      qtyChange: product.onHandQty,
      qtyAfter: product.onHandQty,
      sourceModule: "Seed",
      sourceRefId: product.sku,
      sourceRefType: "Product",
      userId: admin.id,
      notes: "Opening demo stock balance",
    })),
  });

  const assembly = await prisma.workCenter.upsert({
    where: { code: "ASM" },
    create: { code: "ASM", name: "Assembly Line", capacity: 2 },
    update: { name: "Assembly Line", capacity: 2, isActive: true },
  });

  const painting = await prisma.workCenter.upsert({
    where: { code: "PNT" },
    create: { code: "PNT", name: "Painting Booth", capacity: 1 },
    update: { name: "Painting Booth", capacity: 1, isActive: true },
  });

  const packing = await prisma.workCenter.upsert({
    where: { code: "PKG" },
    create: { code: "PKG", name: "Packing Station", capacity: 2 },
    update: { name: "Packing Station", capacity: 2, isActive: true },
  });

  const tableBom = await prisma.billOfMaterials.upsert({
    where: { productId: bySku["FRN-TBL-OAK"].id },
    create: {
      productId: bySku["FRN-TBL-OAK"].id,
      name: "Dining Table Standard BoM",
      createdById: admin.id,
      lines: {
        create: [
          { componentProductId: bySku["RAW-TOP-OAK"].id, qty: 1 },
          { componentProductId: bySku["RAW-LEG-OAK"].id, qty: 4 },
          { componentProductId: bySku["RAW-SCR-M8"].id, qty: 12 },
        ],
      },
      operations: {
        create: [
          { name: "Assembly", workCenterId: assembly.id, durationMins: 60, sequence: 1 },
          { name: "Painting", workCenterId: painting.id, durationMins: 30, sequence: 2 },
          { name: "Packing", workCenterId: packing.id, durationMins: 20, sequence: 3 },
        ],
      },
    },
    update: {
      name: "Dining Table Standard BoM",
      isActive: true,
      createdById: admin.id,
    },
  });

  await prisma.bomLine.deleteMany({ where: { bomId: tableBom.id } });
  await prisma.bomOperation.deleteMany({ where: { bomId: tableBom.id } });

  await prisma.bomLine.createMany({
    data: [
      { bomId: tableBom.id, componentProductId: bySku["RAW-TOP-OAK"].id, qty: 1 },
      { bomId: tableBom.id, componentProductId: bySku["RAW-LEG-OAK"].id, qty: 4 },
      { bomId: tableBom.id, componentProductId: bySku["RAW-SCR-M8"].id, qty: 12 },
    ],
  });

  await prisma.bomOperation.createMany({
    data: [
      { bomId: tableBom.id, name: "Assembly", workCenterId: assembly.id, durationMins: 60, sequence: 1 },
      { bomId: tableBom.id, name: "Painting", workCenterId: painting.id, durationMins: 30, sequence: 2 },
      { bomId: tableBom.id, name: "Packing", workCenterId: packing.id, durationMins: 20, sequence: 3 },
    ],
  });

  const demoSo = await prisma.salesOrder.upsert({
    where: { soNumber: "SO-DEMO-001" },
    create: {
      soNumber: "SO-DEMO-001",
      customerName: "Shiv Furniture Works Demo Customer",
      status: "DRAFT",
      totalAmount: 490000,
      createdById: admin.id,
    },
    update: {
      customerName: "Shiv Furniture Works Demo Customer",
      status: "DRAFT",
      totalAmount: 490000,
      createdById: admin.id,
    },
  });

  await prisma.salesOrderLine.deleteMany({ where: { salesOrderId: demoSo.id } });
  await prisma.salesOrderLine.create({
    data: {
      salesOrderId: demoSo.id,
      productId: bySku["FRN-TBL-OAK"].id,
      orderedQty: 20,
      unitPrice: 24500,
    },
  });

  await prisma.auditLog.deleteMany({
    where: {
      entityType: "DemoData",
      entityId: "shiv-furniture",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      module: "Seed",
      action: "CREATED",
      entityType: "DemoData",
      entityId: "shiv-furniture",
      description: "Seeded Shiv Furniture Works demo data.",
    },
  });

  console.log("Seeded FlowERP demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
