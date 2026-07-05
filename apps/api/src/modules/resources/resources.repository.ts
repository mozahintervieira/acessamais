export type EditablePedagogicalPlan = {
  objectives?: string[];
  expectedOutputs?: string[];
  methodologicalConstraints?: string[];
  validationCriteria?: string[];
  [key: string]: unknown;
};

export type CreateResourceVersionInput = {
  organizationId: string;
  resourceId: string;
  contentJson: EditablePedagogicalPlan;
  contentText?: string;
};

export type ResourceVersionResult = {
  id: string;
  resourceId: string;
  versionNumber: number;
  contentJson: unknown;
  contentText: string;
  validationStatus: string;
  createdAt: string;
};

export type ResourceListItem = {
  id: string;
  missionId?: string;
  type: string;
  title: string;
  status: string;
  metadata: unknown;
  latestVersion?: ResourceVersionResult;
  createdAt: string;
};

export type ResourceSearchInput = {
  organizationId: string;
  discipline?: string;
  gradeYear?: string;
  skill?: string;
  specificNeed?: string;
  q?: string;
};

export interface ResourcesRepository {
  createVersion(
    input: CreateResourceVersionInput
  ): Promise<ResourceVersionResult | null>;
  listVersions(
    organizationId: string,
    resourceId: string
  ): Promise<ResourceVersionResult[]>;
  listResources(input: ResourceSearchInput): Promise<ResourceListItem[]>;
}

export const RESOURCES_REPOSITORY = Symbol("RESOURCES_REPOSITORY");
