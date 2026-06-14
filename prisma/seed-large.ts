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

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) throw new Error("Run standard seed first to create admin user.");

  let vendor = await prisma.vendor.findFirst();
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: { name: "Mega Bulk Supplier", email: "mega@supplier.com" }
    });
  }

  console.log("Seeding 50+ products...");
  const products = [];
  for (let i = 1; i <= 60; i++) {
    const isManufactured = i % 2 === 0;
    const p = await prisma.product.upsert({
      where: { sku: `BULK-PROD-${i}` },
      create: {
        sku: `BULK-PROD-${i}`,
        name: `Bulk Product ${i}`,
        category: isManufactured ? "Finished Goods" : "Raw Material",
        salesPrice: Math.floor(Math.random() * 5000) + 100,
        costPrice: Math.floor(Math.random() * 2000) + 50,
        onHandQty: Math.floor(Math.random() * 100) + 10,
        reorderPoint: 20,
        procurementType: isManufactured ? "MANUFACTURE" : "BUY",
        vendorId: isManufactured ? null : vendor.id,
      },
      update: {},
    });
    products.push(p);
  }

  console.log("Seeding 50+ sales orders...");
  for (let i = 1; i <= 55; i++) {
    const statuses = ["DRAFT", "CONFIRMED", "PARTIALLY_DELIVERED", "FULLY_DELIVERED", "CANCELLED"] as const;
    const so = await prisma.salesOrder.upsert({
      where: { soNumber: `SO-BULK-${i}` },
      create: {
        soNumber: `SO-BULK-${i}`,
        customerName: `Bulk Customer ${i}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        totalAmount: Math.floor(Math.random() * 100000) + 1000,
        createdById: admin.id,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000), // Within last 14 days
      },
      update: {},
    });
    
    const existingLines = await prisma.salesOrderLine.findMany({ where: { salesOrderId: so.id } });
    if (existingLines.length === 0) {
        const lineCount = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < lineCount; j++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        await prisma.salesOrderLine.create({
            data: {
            salesOrderId: so.id,
            productId: prod.id,
            orderedQty: Math.floor(Math.random() * 10) + 1,
            unitPrice: prod.salesPrice,
            }
        });
        }
    }
  }

  console.log("Seeding 50+ purchase orders...");
  for (let i = 1; i <= 55; i++) {
    const statuses = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "CONFIRMED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED", "CANCELLED"] as const;
    const po = await prisma.purchaseOrder.upsert({
      where: { poNumber: `PO-BULK-${i}` },
      create: {
        poNumber: `PO-BULK-${i}`,
        vendorId: vendor.id,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        totalAmount: Math.floor(Math.random() * 80000) + 1000,
        createdById: admin.id,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000),
      },
      update: {},
    });

    const existingLines = await prisma.purchaseOrderLine.findMany({ where: { poId: po.id } });
    if (existingLines.length === 0) {
        const lineCount = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < lineCount; j++) {
        const prod = products.filter(p => p.procurementType === "BUY")[Math.floor(Math.random() * products.filter(p => p.procurementType === "BUY").length)];
        await prisma.purchaseOrderLine.create({
            data: {
            poId: po.id,
            productId: prod.id,
            orderedQty: Math.floor(Math.random() * 50) + 10,
            unitCost: prod.costPrice,
            }
        });
        }
    }
  }

  console.log("Seeding 50+ manufacturing orders...");
  const mfgProducts = products.filter(p => p.procurementType === "MANUFACTURE");
  const rawProducts = products.filter(p => p.procurementType === "BUY");
  
  for (const prod of mfgProducts.slice(0, 5)) {
    await prisma.billOfMaterials.upsert({
      where: { productId: prod.id },
      create: {
        productId: prod.id,
        name: `BoM for ${prod.name}`,
        createdById: admin.id,
        lines: {
          create: [
            { componentProductId: rawProducts[0].id, qty: 2 },
            { componentProductId: rawProducts[1].id, qty: 1 }
          ]
        }
      },
      update: {}
    });
  }

  const boms = await prisma.billOfMaterials.findMany();

  for (let i = 1; i <= 55; i++) {
    const statuses = ["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
    const bom = boms[Math.floor(Math.random() * boms.length)];
    
    await prisma.manufacturingOrder.upsert({
      where: { moNumber: `MO-BULK-${i}` },
      create: {
        moNumber: `MO-BULK-${i}`,
        productId: bom.productId,
        qty: Math.floor(Math.random() * 20) + 5,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        bomId: bom.id,
        assigneeId: admin.id,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000),
      },
      update: {}
    });
  }

  console.log("Seeding audit logs...");
  for (let i = 1; i <= 60; i++) {
    const modules = ["Sales", "Purchase", "Manufacturing", "Inventory"];
    const actions = ["CREATED", "UPDATED", "APPROVED", "CONFIRMED"];
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        module: modules[Math.floor(Math.random() * modules.length)],
        action: actions[Math.floor(Math.random() * actions.length)] as any,
        entityType: "BulkData",
        entityId: `BULK-${i}`,
        description: `Bulk operation ${i}`,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000),
      }
    });
  }

  console.log("Finished seeding 50+ items of each type.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
