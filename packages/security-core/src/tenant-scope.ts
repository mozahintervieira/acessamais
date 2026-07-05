export type TenantScoped = {
  organizationId: string;
};

export function assertSameOrganization(
  actor: TenantScoped,
  entity: TenantScoped
): void {
  if (actor.organizationId !== entity.organizationId) {
    throw new Error("Cross-organization access denied.");
  }
}
