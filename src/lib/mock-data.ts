// Mock data for FlowERP

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  procurement: "Manufacture" | "Buy";
  price: number;
  onHand: number;
  reserved: number;
  reorderPoint: number;
  unit: string;
};

export const products: Product[] = [
  { id: "P-001", sku: "FRN-TBL-OAK", name: "Wooden Dining Table", category: "Furniture", procurement: "Manufacture", price: 24500, onHand: 18, reserved: 6, reorderPoint: 10, unit: "pcs" },
  { id: "P-002", sku: "FRN-CHR-EXE", name: "Executive Office Chair", category: "Furniture", procurement: "Manufacture", price: 12800, onHand: 42, reserved: 14, reorderPoint: 25, unit: "pcs" },
  { id: "P-003", sku: "FRN-TBL-CFE", name: "Coffee Table — Walnut", category: "Furniture", procurement: "Manufacture", price: 9800, onHand: 7, reserved: 3, reorderPoint: 12, unit: "pcs" },
  { id: "P-004", sku: "RAW-TOP-OAK", name: "Wooden Top — Oak", category: "Raw Material", procurement: "Buy", price: 3200, onHand: 120, reserved: 40, reorderPoint: 60, unit: "pcs" },
  { id: "P-005", sku: "RAW-LEG-OAK", name: "Wooden Leg — Oak", category: "Raw Material", procurement: "Buy", price: 480, onHand: 86, reserved: 60, reorderPoint: 200, unit: "pcs" },
  { id: "P-006", sku: "RAW-SCR-M8", name: "Steel Screw M8", category: "Hardware", procurement: "Buy", price: 4, onHand: 4200, reserved: 1200, reorderPoint: 2000, unit: "pcs" },
  { id: "P-007", sku: "FRN-BCH-PRK", name: "Park Bench — Teak", category: "Furniture", procurement: "Manufacture", price: 18500, onHand: 3, reserved: 2, reorderPoint: 8, unit: "pcs" },
  { id: "P-008", sku: "RAW-FAB-LTH", name: "Leather Fabric Roll", category: "Raw Material", procurement: "Buy", price: 2800, onHand: 58, reserved: 12, reorderPoint: 30, unit: "rolls" },
];

export type SalesOrder = {
  id: string;
  customer: string;
  amount: number;
  status: "Draft" | "Confirmed" | "In Production" | "Ready" | "Delivered";
  date: string;
  items: { sku: string; name: string; qty: number; price: number }[];
};

export const salesOrders: SalesOrder[] = [
  { id: "SO-10421", customer: "Asgard Interiors Pvt Ltd", amount: 482000, status: "In Production", date: "2026-06-08", items: [
    { sku: "FRN-TBL-OAK", name: "Wooden Dining Table", qty: 12, price: 24500 },
    { sku: "FRN-CHR-EXE", name: "Executive Office Chair", qty: 14, price: 12800 },
  ]},
  { id: "SO-10422", customer: "Nakshatra Hotels", amount: 196000, status: "Confirmed", date: "2026-06-09", items: [
    { sku: "FRN-CHR-EXE", name: "Executive Office Chair", qty: 16, price: 12800 } ]},
  { id: "SO-10423", customer: "Greenfield Architects", amount: 74600, status: "Ready", date: "2026-06-10", items: [
    { sku: "FRN-TBL-CFE", name: "Coffee Table — Walnut", qty: 6, price: 9800 } ]},
  { id: "SO-10424", customer: "Aurora Workspaces", amount: 312500, status: "Delivered", date: "2026-06-11", items: [
    { sku: "FRN-TBL-OAK", name: "Wooden Dining Table", qty: 10, price: 24500 } ]},
  { id: "SO-10425", customer: "Brick & Beam Studio", amount: 58000, status: "Draft", date: "2026-06-12", items: [
    { sku: "FRN-BCH-PRK", name: "Park Bench — Teak", qty: 3, price: 18500 } ]},
  { id: "SO-10426", customer: "Vihaan Furnishings", amount: 144000, status: "Confirmed", date: "2026-06-12", items: [
    { sku: "FRN-TBL-CFE", name: "Coffee Table — Walnut", qty: 14, price: 9800 } ]},
];

export type ManufacturingOrder = {
  id: string;
  product: string;
  sku: string;
  qty: number;
  progress: number;
  status: "Draft" | "In Progress" | "Completed";
  due: string;
  linkedSO?: string;
};

export const manufacturingOrders: ManufacturingOrder[] = [
  { id: "MO-3001", product: "Wooden Dining Table", sku: "FRN-TBL-OAK", qty: 12, progress: 0, status: "Draft", due: "2026-06-22", linkedSO: "SO-10421" },
  { id: "MO-3002", product: "Executive Office Chair", sku: "FRN-CHR-EXE", qty: 30, progress: 45, status: "In Progress", due: "2026-06-18" },
  { id: "MO-3003", product: "Coffee Table — Walnut", sku: "FRN-TBL-CFE", qty: 8, progress: 70, status: "In Progress", due: "2026-06-16", linkedSO: "SO-10426" },
  { id: "MO-3004", product: "Park Bench — Teak", sku: "FRN-BCH-PRK", qty: 6, progress: 100, status: "Completed", due: "2026-06-10" },
  { id: "MO-3005", product: "Wooden Dining Table", sku: "FRN-TBL-OAK", qty: 5, progress: 20, status: "In Progress", due: "2026-06-20" },
  { id: "MO-3006", product: "Executive Office Chair", sku: "FRN-CHR-EXE", qty: 24, progress: 100, status: "Completed", due: "2026-06-08" },
  { id: "MO-3007", product: "Coffee Table — Walnut", sku: "FRN-TBL-CFE", qty: 10, progress: 0, status: "Draft", due: "2026-06-25" },
];

export const orderTrend = [
  { day: "Mon", orders: 12, revenue: 285000 },
  { day: "Tue", orders: 18, revenue: 412000 },
  { day: "Wed", orders: 14, revenue: 330000 },
  { day: "Thu", orders: 22, revenue: 498000 },
  { day: "Fri", orders: 19, revenue: 455000 },
  { day: "Sat", orders: 26, revenue: 612000 },
  { day: "Sun", orders: 16, revenue: 372000 },
];

export const inventoryHealth = [
  { name: "Dining Table", onHand: 18, reserved: 6 },
  { name: "Office Chair", onHand: 42, reserved: 14 },
  { name: "Coffee Table", onHand: 7, reserved: 3 },
  { name: "Wooden Top", onHand: 120, reserved: 40 },
  { name: "Wooden Leg", onHand: 86, reserved: 60 },
  { name: "Park Bench", onHand: 3, reserved: 2 },
];

export const manufacturingPipeline = [
  { name: "Draft", value: 2, color: "var(--muted-foreground)" },
  { name: "In Progress", value: 3, color: "var(--chart-1)" },
  { name: "Completed", value: 2, color: "var(--chart-2)" },
];

export type ActivityEvent = {
  id: string;
  type: "sales" | "manufacturing" | "inventory" | "delivery" | "procurement";
  title: string;
  detail: string;
  user: string;
  time: string;
};

export const recentActivity: ActivityEvent[] = [
  { id: "1", type: "sales", title: "Sales Order SO-10426 created", detail: "Vihaan Furnishings · ₹1,44,000", user: "Priya M.", time: "8m ago" },
  { id: "2", type: "manufacturing", title: "Manufacturing Order MO-3001 auto-generated", detail: "Triggered by SO-10421 inventory shortfall", user: "System", time: "23m ago" },
  { id: "3", type: "inventory", title: "Inventory updated — Wooden Leg (Oak)", detail: "−60 units reserved for MO-3002", user: "System", time: "1h ago" },
  { id: "4", type: "delivery", title: "Delivery completed for SO-10424", detail: "Aurora Workspaces · 10 units dispatched", user: "Rahul K.", time: "3h ago" },
  { id: "5", type: "procurement", title: "Purchase Order PO-882 sent", detail: "Steel Screw M8 · 5,000 units · TechBolt Industries", user: "Anjali T.", time: "5h ago" },
];

export const procurementAlerts = [
  { id: "P-007", name: "Park Bench — Teak", onHand: 3, reorder: 8, priority: "Critical" as const, suggested: 15 },
  { id: "P-005", name: "Wooden Leg — Oak", onHand: 86, reorder: 200, priority: "High" as const, suggested: 250 },
  { id: "P-003", name: "Coffee Table — Walnut", onHand: 7, reorder: 12, priority: "High" as const, suggested: 20 },
  { id: "P-008", name: "Leather Fabric Roll", onHand: 58, reorder: 30, priority: "Low" as const, suggested: 40 },
];

export type AuditLog = {
  id: string;
  user: string;
  action: "Created" | "Updated" | "Deleted" | "Confirmed" | "Logged in";
  module: string;
  target: string;
  time: string;
};

export const auditLogs: AuditLog[] = [
  { id: "L-9921", user: "Priya M.", action: "Created", module: "Sales Orders", target: "SO-10426", time: "2026-06-13 10:42" },
  { id: "L-9920", user: "System", action: "Created", module: "Manufacturing", target: "MO-3001 (auto)", time: "2026-06-13 10:19" },
  { id: "L-9919", user: "Anjali T.", action: "Confirmed", module: "Purchase Orders", target: "PO-882", time: "2026-06-13 09:55" },
  { id: "L-9918", user: "Rahul K.", action: "Updated", module: "Inventory", target: "FRN-TBL-OAK", time: "2026-06-13 09:21" },
  { id: "L-9917", user: "Admin", action: "Logged in", module: "Auth", target: "session#a91", time: "2026-06-13 08:58" },
  { id: "L-9916", user: "Priya M.", action: "Updated", module: "Products", target: "FRN-CHR-EXE", time: "2026-06-12 18:02" },
  { id: "L-9915", user: "System", action: "Updated", module: "Inventory", target: "Reserved +60 RAW-LEG-OAK", time: "2026-06-12 17:34" },
  { id: "L-9914", user: "Anjali T.", action: "Deleted", module: "Vendors", target: "V-014 Westwood Co.", time: "2026-06-12 16:11" },
];

export const inventoryMovements = [
  { id: "M-501", time: "10:42", sku: "FRN-TBL-OAK", change: -2, reason: "SO-10424 dispatch", balance: 18 },
  { id: "M-500", time: "09:21", sku: "RAW-LEG-OAK", change: -60, reason: "Reserved for MO-3002", balance: 86 },
  { id: "M-499", time: "08:55", sku: "RAW-SCR-M8", change: +5000, reason: "GRN against PO-880", balance: 4200 },
  { id: "M-498", time: "Yesterday", sku: "FRN-CHR-EXE", change: +24, reason: "MO-3006 completed", balance: 42 },
  { id: "M-497", time: "Yesterday", sku: "RAW-TOP-OAK", change: -40, reason: "Issued to MO-3001", balance: 120 },
];

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
