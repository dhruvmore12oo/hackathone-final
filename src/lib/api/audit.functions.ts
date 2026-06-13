import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type AuditAction } from "@prisma/client";

export type AuditLogItem = {
  id: string;
  user: string;
  action: string;
  module: string;
  target: string;
  time: string;
  description: string | null;
};

const actionLabels: Record<string, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  DELETED: "Deleted",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  STARTED: "Started",
  COMPLETED: "Completed",
  RECEIVED: "Received",
  DELIVERED: "Delivered",
  LOGGED_IN: "Logged in",
};

const auditFilterSchema = z.object({
  search: z.string().optional(),
  module: z.string().optional(),
  action: z.string().optional(),
}).optional();

export const listAuditLogs = createServerFn({ method: "GET" })
  .inputValidator(auditFilterSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    await requirePermission("audit_logs:read");

    const search = data?.search?.trim();
    const moduleFilter = data?.module && data.module !== "All" ? data.module : undefined;
    const actionFilter = data?.action && data.action !== "All" ? data.action : undefined;

    const actionKey = (actionFilter
      ? Object.entries(actionLabels).find(([, v]) => v === actionFilter)?.[0]
      : undefined) as AuditAction | undefined;

    const logs = await prisma.auditLog.findMany({
      take: 100,
      include: { user: true },
      orderBy: { timestamp: "desc" },
      where: {
        ...(moduleFilter ? { module: moduleFilter } : {}),
        ...(actionKey ? { action: actionKey } : {}),
        ...(search
          ? {
              OR: [
                { description: { contains: search, mode: "insensitive" } },
                { entityId: { contains: search, mode: "insensitive" } },
                { entityType: { contains: search, mode: "insensitive" } },
                { module: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    });

    const [modules, actions] = await Promise.all([
      prisma.auditLog.findMany({
        distinct: ["module"],
        select: { module: true },
        orderBy: { module: "asc" },
      }),
      prisma.auditLog.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" },
      }),
    ]);

    return {
      logs: logs.map<AuditLogItem>((log) => ({
        id: log.id.slice(0, 8).toUpperCase(),
        user: log.user?.name ?? log.user?.email ?? "System",
        action: actionLabels[log.action] ?? log.action,
        module: log.module,
        target: `${log.entityType}:${log.entityId.slice(0, 8)}`,
        time: log.timestamp.toISOString(),
        description: log.description,
      })),
      modules: ["All", ...modules.map((m) => m.module)],
      actions: ["All", ...actions.map((a) => actionLabels[a.action] ?? a.action)],
    };
  });
