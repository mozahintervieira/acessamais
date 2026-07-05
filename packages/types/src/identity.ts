export type OrganizationType =
  | "SCHOOL"
  | "UNIVERSITY"
  | "MUSEUM"
  | "GOVERNMENT"
  | "INDEPENDENT";

export type UserRole = "ADMIN" | "TEACHER" | "REVIEWER";

export type OrganizationRef = {
  id: string;
  name: string;
  type: OrganizationType;
};

export type AuthenticatedUser = {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
};
