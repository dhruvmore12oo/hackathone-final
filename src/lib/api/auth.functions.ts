import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { roleLabels, rolePermissions, USER_ROLES, type UserRole } from "../auth/roles";

export type CurrentUserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  roleLabel: string;
  permissions: string[];
};

export type UserAdminListItem = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  roleLabel: string;
  isActive: boolean;
};

const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(USER_ROLES),
});

function mapProfile(user: { id: string; email: string; name: string | null; role: UserRole }): CurrentUserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleLabel: roleLabels[user.role],
    permissions: rolePermissions[user.role],
  };
}

export const getCurrentUserProfile = createServerFn({ method: "GET" }).handler(async () => {
  const { getOrCreateCurrentUser } = await import("../auth/server");

  const user = await getOrCreateCurrentUser();
  return mapProfile(user);
});

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { prisma } = await import("../db.server");
  const { requirePermission } = await import("../auth/server");

  await requirePermission("users:read");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  return users.map<UserAdminListItem>((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleLabel: roleLabels[user.role],
    isActive: user.isActive,
  }));
});

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator(updateUserRoleSchema)
  .handler(async ({ data }) => {
    const { prisma } = await import("../db.server");
    const { requirePermission } = await import("../auth/server");

    const actor = await requirePermission("users:write");

    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });

    const target = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!target) {
      throw new Response("User not found.", { status: 404 });
    }

    if (target.id === actor.id && target.role === "ADMIN" && data.role !== "ADMIN" && adminCount <= 1) {
      throw new Response("You cannot remove the last active admin.", { status: 409 });
    }

    const user = await prisma.user.update({
      where: { id: data.userId },
      data: { role: data.role },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        module: "Users",
        action: "UPDATED",
        entityType: "User",
        entityId: user.id,
        fieldChanged: "role",
        oldValue: target.role,
        newValue: user.role,
        description: `Changed ${user.email} role to ${roleLabels[user.role]}.`,
      },
    });

    return mapProfile(user);
  });

const chooseRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export const chooseInitialRole = createServerFn({ method: "POST" })
  .inputValidator(chooseRoleSchema)
  .handler(async ({ data }) => {
    const { setInitialRole } = await import("../auth/server");
    const user = await setInitialRole(data.role);
    return mapProfile(user);
  });
