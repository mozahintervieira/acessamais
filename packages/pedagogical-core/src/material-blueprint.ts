export type ActivityActionType =
  | "OBSERVE"
  | "IDENTIFY"
  | "MATCH"
  | "CONNECT"
  | "CLASSIFY"
  | "ORDER"
  | "COMPLETE"
  | "CHOOSE"
  | "MARK"
  | "COMPARE"
  | "SOLVE"
  | "APPLY"
  | "EXPLAIN"
  | "PRODUCE"
  | "CREATE_GUIDED_EXAMPLE";

export type FunctionalLearningLevel = {
  schoolStage: string;
  grade: string;
  readingLevel: string;
  writingLevel: string;
  comprehensionLevel: string;
  abstractionLevel: string;
  workingMemory: string;
  autonomy: string;
  attention: string;
  communication: string;
  responseMode: string;
  uncertaintyNotes: string[];
};

export type PlannedTask = {
  order: number;
  actionType: ActivityActionType;
  pedagogicalPurpose: string;
  cognitiveDemand: string;
  instructionStyle: string;
  responseMode: string;
  supportRequired: string[];
  visualFunction: string;
  successCriterion: string;
};

export type MaterialBlueprint = {
  resourceType: string;
  discipline: string;
  schoolStage: string;
  grade: string;
  skillCode: string;
  learningObjective: string;
  knowledgeObject: string;
  content: string;
  studentProfile: string;
  functionalLearningLevel: FunctionalLearningLevel;
  identifiedBarriers: string[];
  recommendedSupports: string[];
  supportLevel: string;
  requestedTaskCount: number;
  plannedTasks: PlannedTask[];
  responseModes: string[];
  visualRequirements: string[];
  successCriteria: string[];
  antiInfantilizationGuidance: string[];
  teacherMediationGuidance: string[];
};
