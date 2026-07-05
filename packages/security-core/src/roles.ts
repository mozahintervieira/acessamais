import type { UserRole } from "@acessa-plus/types";

export type Permission =
  | "users:manage"
  | "missions:create"
  | "resources:read"
  | "resources:write"
  | "resources:review";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "users:manage",
    "missions:create",
    "resources:read",
    "resources:write",
    "resources:review"
  ],
  TEACHER: ["missions:create", "resources:read", "resources:write"],
  REVIEWER: ["resources:read", "resources:review"]
};

export function roleCan(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
