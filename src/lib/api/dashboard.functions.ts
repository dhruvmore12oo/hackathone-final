import { createServerFn } from "@tanstack/react-start";

export type DashboardSummary = {
  kpis: {
    totalSalesOrders: number;
    pendingDeliveries: number;
    totalPurchaseOrders: number;
    pendingReceipts: number;
    activeManufacturingOrders: number;
    lowStockAlerts: number;
    procurementAutoTriggers: number;
    inventoryValue: number;
  };
  inventoryHealth: { name: string; onHand: number; reserved: number }[];
  manufacturingPipeline: { name: string; value: number; color: string }[];
  orderTrend: { day: string; salesOrders: number; purchaseOrders: number }[];
  procurementAlerts: { id: string; name: string; onHand: number; reorder: number; priority: "Critical" | "High" | "Low"; suggested: number }[];
  recentActivity: { id: string; title: string; detail: string; user: string; time: string; type: "sales" | "manufacturing" | "inventory" | "delivery" | "procurement" }[];
};

function toNumber(value: { toString: () => string }) {
  return Number(value.toString());
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function activityType(module: string): DashboardSummary["recentActivity"][number]["type"] {
  if (module.includes("Sales")) return "sales";
  if (module.includes("Manufacturing")) return "manufacturing";
  if (module.includes("Purchase")) return "procurement";
  if (module.includes("Inventory") || module.includes("Stock")) return "inventory";
  return "delivery";
}

export const getDashboardSummary = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");

  await requirePermission("dashboard:read");

  const sevenDaysAgo = startOfDay(addDays(new Date(), -6));

  const [
    products,
    salesOrders,
    purchaseOrders,
    manufacturingOrders,
    recentLogs,
  ] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.salesOrder.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, orderBy: { createdAt: "asc" } }),
    prisma.purchaseOrder.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, orderBy: { createdAt: "asc" } }),
    prisma.manufacturingOrder.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.auditLog.findMany({ take: 10, include: { user: true }, orderBy: { timestamp: "desc" } }),
  ]);

  const allSalesCount = await prisma.salesOrder.count();
  const allPurchaseCount = await prisma.purchaseOrder.count();
  const pendingDeliveries = await prisma.salesOrder.count({
    where: { status: { in: ["CONFIRMED", "PARTIALLY_DELIVERED"] } },
  });
  const pendingReceipts = await prisma.purchaseOrder.count({
    where: { status: { in: ["DRAFT", "CONFIRMED", "PARTIALLY_RECEIVED"] } },
  });
  const activeManufacturingOrders = manufacturingOrders.filter((order) => order.status === "DRAFT" || order.status === "IN_PROGRESS").length;

  const productSnapshots = products.map((product) => {
    const onHand = toNumber(product.onHandQty);
    const reserved = toNumber(product.reservedQty);
    const reorder = toNumber(product.reorderPoint);

    return {
      id: product.id,
      name: product.name,
      onHand,
      reserved,
      freeToUse: onHand - reserved,
      reorder,
      cost: toNumber(product.costPrice),
    };
  });

  const lowStockProducts = productSnapshots.filter((product) => product.freeToUse <= product.reorder);
  const inventoryValue = productSnapshots.reduce((sum, product) => sum + product.onHand * product.cost, 0);
  const autoTriggers = manufacturingOrders.filter((order) => order.sourceType === "AUTO").length + purchaseOrders.filter((order) => order.sourceType === "AUTO").length;

  const dayKeys = Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(sevenDaysAgo, index);
    return {
      key: date.toISOString().slice(0, 10),
      day: date.toLocaleDateString("en-IN", { weekday: "short" }),
    };
  });

  const orderTrend = dayKeys.map((day) => ({
    day: day.day,
    salesOrders: salesOrders.filter((order) => order.createdAt.toISOString().slice(0, 10) === day.key).length,
    purchaseOrders: purchaseOrders.filter((order) => order.createdAt.toISOString().slice(0, 10) === day.key).length,
  }));

  return {
    kpis: {
      totalSalesOrders: allSalesCount,
      pendingDeliveries,
      totalPurchaseOrders: allPurchaseCount,
      pendingReceipts,
      activeManufacturingOrders,
      lowStockAlerts: lowStockProducts.length,
      procurementAutoTriggers: autoTriggers,
      inventoryValue,
    },
    inventoryHealth: productSnapshots
      .sort((a, b) => b.reserved - a.reserved)
      .slice(0, 6)
      .map((product) => ({ name: product.name, onHand: product.onHand, reserved: product.reserved })),
    manufacturingPipeline: [
      { name: "Draft", value: manufacturingOrders.filter((order) => order.status === "DRAFT").length, color: "var(--muted-foreground)" },
      { name: "In Progress", value: manufacturingOrders.filter((order) => order.status === "IN_PROGRESS").length, color: "var(--chart-1)" },
      { name: "Completed", value: manufacturingOrders.filter((order) => order.status === "COMPLETED").length, color: "var(--chart-2)" },
    ],
    orderTrend,
    procurementAlerts: lowStockProducts
      .sort((a, b) => a.freeToUse - b.freeToUse)
      .slice(0, 5)
      .map((product) => ({
        id: product.id,
        name: product.name,
        onHand: product.onHand,
        reorder: product.reorder,
        priority: product.freeToUse <= 0 ? "Critical" : product.freeToUse <= product.reorder / 2 ? "High" : "Low",
        suggested: Math.max(Math.ceil(product.reorder * 1.5 - product.freeToUse), 1),
      })),
    recentActivity: recentLogs.map((log) => ({
      id: log.id,
      title: `${log.module}: ${log.action.toLowerCase().replaceAll("_", " ")}`,
      detail: log.description ?? `${log.entityType}:${log.entityId.slice(0, 8)}`,
      user: log.user?.name ?? log.user?.email ?? "System",
      time: log.timestamp.toISOString(),
      type: activityType(log.module),
    })),
  } satisfies DashboardSummary;
});
