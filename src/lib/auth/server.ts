import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import process from "node:process";

import { ADMIN_BOOTSTRAP_EMAIL, hasPermission, type UserRole } from "./roles";
import { prisma } from "../db.server";

export async function requireClerkUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return userId;
}

export async function getOrCreateCurrentUser() {
  const clerkUserId = await requireClerkUserId();
  const clerkUser = await clerkClient().users.getUser(clerkUserId);
  const email = clerkUser.primaryEmailAddress?.emailAddress;

  if (!email) {
    throw new Response("Signed-in user does not have a primary email address.", { status: 400 });
  }

  const adminEmail = process.env.APP_ADMIN_EMAIL ?? ADMIN_BOOTSTRAP_EMAIL;
  const isConfiguredAdmin = email.toLowerCase() === adminEmail.toLowerCase();
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || email;

  const existingByClerkId = await prisma.user.findUnique({ where: { clerkUserId } });

  if (existingByClerkId) {
    return prisma.user.update({
      where: { id: existingByClerkId.id },
      data: {
        email,
        name,
        role: isConfiguredAdmin ? "ADMIN" : existingByClerkId.role,
        isActive: true,
      },
    });
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email } });

  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        clerkUserId,
        name,
        role: isConfiguredAdmin ? "ADMIN" : existingByEmail.role,
        isActive: true,
      },
    });
  }

  // New users: admin email gets ADMIN, everyone else gets BUSINESS_OWNER as default
  // Role can be changed after creation via the role selection page or admin panel
  const defaultRole: UserRole = isConfiguredAdmin ? "ADMIN" : "BUSINESS_OWNER";

  return prisma.user.create({
    data: {
      clerkUserId,
      email,
      name,
      role: defaultRole,
      // Mark as needing role selection for non-admin users
    },
  });
}

/**
 * Allow a newly signed-up user to choose their initial role.
 * Only works if the user currently has BUSINESS_OWNER (the default).
 * Admin role cannot be self-assigned.
 */
export async function setInitialRole(requestedRole: UserRole) {
  const user = await getOrCreateCurrentUser();

  // Only allow role change if user still has the default role (not yet onboarded)
  if (user.role !== "BUSINESS_OWNER") {
    return user;
  }

  // Never allow self-assigning ADMIN
  if (requestedRole === "ADMIN") {
    throw new Response("Admin role cannot be self-assigned.", { status: 403 });
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { role: requestedRole },
  });
}

export async function requirePermission(permission: string | string[]) {
  const user = await getOrCreateCurrentUser();
  const perms = Array.isArray(permission) ? permission : [permission];
  const hasAny = perms.some(p => hasPermission(user.role, p));

  if (!hasAny) {
    throw new Response("Forbidden", { status: 403 });
  }

  return user;
}
