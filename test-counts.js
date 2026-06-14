import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.product.count();
  const so = await prisma.salesOrder.count();
  const po = await prisma.purchaseOrder.count();
  const mo = await prisma.manufacturingOrder.count();
  const logs = await prisma.auditLog.count();
  console.log(`Counts -> Products: ${products}, Sales: ${so}, Purchase: ${po}, Manufacturing: ${mo}, Audit: ${logs}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
