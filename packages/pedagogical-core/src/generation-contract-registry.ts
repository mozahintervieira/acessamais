import {
  ADAPTED_ACTIVITY_OUTPUT_CONTRACT,
  PEI_OUTPUT_CONTRACT,
  type ResourceGenerationType
} from "./generation-contract.js";

export type PedagogicalGenerationContract =
  | typeof ADAPTED_ACTIVITY_OUTPUT_CONTRACT
  | typeof PEI_OUTPUT_CONTRACT;

export type GenerationContractRegistryEntry = {
  generationType: ResourceGenerationType;
  contract: PedagogicalGenerationContract;
  status: "IMPLEMENTED" | "FALLBACK";
  version: string;
  fallbackFrom?: ResourceGenerationType;
};

const DEFAULT_GENERATION_TYPE: ResourceGenerationType = "ADAPTED_ACTIVITY";

const IMPLEMENTED_CONTRACTS: Partial<
  Record<ResourceGenerationType, GenerationContractRegistryEntry>
> = {
  ADAPTED_ACTIVITY: {
    generationType: "ADAPTED_ACTIVITY",
    contract: ADAPTED_ACTIVITY_OUTPUT_CONTRACT,
    status: "IMPLEMENTED",
    version: "2026-07-08.adapted-activity.v1"
  },
  PEI: {
    generationType: "PEI",
    contract: PEI_OUTPUT_CONTRACT,
    status: "IMPLEMENTED",
    version: "2026-07-08.pei.v1"
  }
};

export function resolveGenerationContract(
  generationType: ResourceGenerationType = DEFAULT_GENERATION_TYPE
): GenerationContractRegistryEntry {
  const entry = IMPLEMENTED_CONTRACTS[generationType];

  if (entry) {
    return entry;
  }

  return {
    generationType: DEFAULT_GENERATION_TYPE,
    contract: ADAPTED_ACTIVITY_OUTPUT_CONTRACT,
    status: "FALLBACK",
    version: "2026-07-08.adapted-activity.v1",
    fallbackFrom: generationType
  };
}

export function getDefaultResourceGenerationType(): ResourceGenerationType {
  return DEFAULT_GENERATION_TYPE;
}
