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

export type ObserveTaskData = {
  representation: string;
  question: string;
  options: string[];
  correctOption: string;
  visualDescription: string;
};

export type MatchTaskData = {
  leftItems: string[];
  rightItems: string[];
  correctPairs: Array<{ left: string; right: string }>;
  connectionInstruction: string;
};

export type CompleteTaskData = {
  statements: string[];
  blanks: string[];
  expectedAnswers: string[];
  supportSteps: string[];
};

export type SolveTaskData = {
  problemContext: string;
  equation: string;
  guidedSteps: string[];
  answer: string;
  calculationSpace: string;
};

export type ClassifyTaskData = {
  items: string[];
  categories: string[];
  expectedClassification: Array<{ item: string; category: string }>;
};

export type OrderTaskData = {
  items: string[];
  correctOrder: string[];
};

export type ConnectTaskData = {
  sourceItems: string[];
  targetItems: string[];
  correctConnections: Array<{ source: string; target: string }>;
};

export type GuidedExampleTaskData = {
  contextPrompt: string;
  availableValues: string[];
  constructionSteps: string[];
  fieldsToComplete: string[];
  exampleAnswer: string;
};

export type ConcreteTaskData =
  | ({ actionType: "OBSERVE" } & ObserveTaskData)
  | ({ actionType: "MATCH" } & MatchTaskData)
  | ({ actionType: "COMPLETE" } & CompleteTaskData)
  | ({ actionType: "SOLVE" } & SolveTaskData)
  | ({ actionType: "CLASSIFY" } & ClassifyTaskData)
  | ({ actionType: "ORDER" } & OrderTaskData)
  | ({ actionType: "CONNECT" } & ConnectTaskData)
  | ({ actionType: "CREATE_GUIDED_EXAMPLE" } & GuidedExampleTaskData);

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
