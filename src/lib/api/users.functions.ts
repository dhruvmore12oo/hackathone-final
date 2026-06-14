import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");
  
  await requirePermission("admin:manage"); // Assuming admin:manage or similar

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return users;
});

export const getUserById = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");
    
    await requirePermission("admin:manage");

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) throw new Error("User not found");
    return user;
  });

export const createUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: z.enum(["ADMIN", "BUSINESS_OWNER", "SALES_USER", "PURCHASE_USER", "MANUFACTURING_USER", "INVENTORY_MANAGER"]),
    department: z.string().optional(),
    jobTitle: z.string().optional(),
    phone: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");
    
    const admin = await requirePermission("admin:manage");

    // In a real app we would create a Clerk invitation here.
    // For now, we just create a pending user in the DB.
    const user = await prisma.user.create({
      data: {
        clerkUserId: `pending:${data.email}`,
        email: data.email,
        name: data.name,
        role: data.role,
        department: data.department,
        jobTitle: data.jobTitle,
        phone: data.phone,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        module: "System Admin",
        action: "CREATED",
        entityType: "User",
        entityId: user.id,
        description: `Invited user ${user.email}`,
      }
    });

    return user;
  });

export const updateUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    id: z.string(),
    name: z.string().min(1),
    department: z.string().optional(),
    jobTitle: z.string().optional(),
    phone: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");
    
    const admin = await requirePermission("admin:manage");

    const user = await prisma.user.update({
      where: { id: data.id },
      data: {
        name: data.name,
        department: data.department,
        jobTitle: data.jobTitle,
        phone: data.phone,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        module: "System Admin",
        action: "UPDATED",
        entityType: "User",
        entityId: user.id,
        description: `Updated profile for ${user.email}`,
      }
    });

    return user;
  });

export const updateUserStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    id: z.string(),
    isActive: z.boolean(),
  }))
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");
    
    const admin = await requirePermission("admin:manage");

    const user = await prisma.user.update({
      where: { id: data.id },
      data: { isActive: data.isActive },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        module: "System Admin",
        action: "UPDATED",
        entityType: "User",
        entityId: user.id,
        description: `${data.isActive ? 'Activated' : 'Deactivated'} user ${user.email}`,
      }
    });

    return user;
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    id: z.string(),
    role: z.enum(["ADMIN", "BUSINESS_OWNER", "SALES_USER", "PURCHASE_USER", "MANUFACTURING_USER", "INVENTORY_MANAGER"]),
  }))
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");
    
    const admin = await requirePermission("admin:manage");

    const user = await prisma.user.update({
      where: { id: data.id },
      data: { role: data.role },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        module: "System Admin",
        action: "UPDATED",
        entityType: "User",
        entityId: user.id,
        description: `Changed role for ${user.email} to ${data.role}`,
      }
    });

    return user;
  });

export const getUserActivity = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");
    
    await requirePermission("admin:manage");

    // "Activity" - let's fetch recently created orders, etc.
    const recentSales = await prisma.salesOrder.findMany({ where: { createdById: id }, take: 5, orderBy: { createdAt: "desc" } });
    const recentPurchase = await prisma.purchaseOrder.findMany({ where: { createdById: id }, take: 5, orderBy: { createdAt: "desc" } });
    
    const combined = [
      ...recentSales.map(s => ({ type: 'Sale', id: s.soNumber, date: s.createdAt, amount: Number(s.totalAmount) })),
      ...recentPurchase.map(p => ({ type: 'Purchase', id: p.poNumber, date: p.createdAt, amount: Number(p.totalAmount) })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

    return combined;
  });

export const getUserAuditLogs = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");
    
    await requirePermission("admin:manage");

    const logs = await prisma.auditLog.findMany({
      where: { userId: id },
      orderBy: { timestamp: "desc" },
      take: 20,
    });

    return logs;
  });

export const getAdminDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");
  
  await requirePermission("admin:manage");

  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    pendingInvitations,
    todayLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true, NOT: { clerkUserId: { startsWith: 'pending:' } } } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { clerkUserId: { startsWith: 'pending:' } } }),
    prisma.auditLog.count({
      where: {
        timestamp: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        }
      }
    }),
  ]);

  const roles = await prisma.user.groupBy({
    by: ['role'],
    _count: { role: true },
  });

  const recentLogins = await prisma.user.findMany({
    where: { lastLoginAt: { not: null } },
    orderBy: { lastLoginAt: 'desc' },
    take: 5,
    select: { id: true, name: true, email: true, lastLoginAt: true, role: true }
  });

  return {
    totalUsers,
    activeUsers,
    inactiveUsers,
    pendingInvitations,
    todayLogs,
    roleDistribution: roles.map(r => ({ role: r.role, count: r._count.role })),
    recentLogins,
  };
});
