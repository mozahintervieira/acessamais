export type MissionType = "CREATE_LESSON_PLAN" | "ADAPT_ACTIVITY";

export type MissionStatus =
  | "DRAFT"
  | "READY_FOR_ORCHESTRATION"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type MissionInput = {
  rawPrompt?: string;
  discipline?: string;
  gradeYear?: string;
  skill?: string;
  knowledgeObject?: string;
  subject?: string;
  stage?: string;
  yearGrade?: string;
  theme?: string;
  lessonObjective?: string;
  objective?: string;
  specificNeed?: string;
  learningPreference?: string;
  readingWritingLevel?: string;
  availableResources?: string[];
  expectedProductType?: string;
  activityType?: string;
  questionCount?: string;
  difficultyLevel?: string;
  outputFormat?: string;
  learningLevel?: string;
  originalContent?: string;
  accessibilityNeeds?: string[];
  contextNotes?: string;
};

export type CreateMissionRequest = {
  userId: string;
  organizationId: string;
  missionType: MissionType;
  input: MissionInput;
  profileId?: string;
};

export type MissionSnapshot = {
  id: string;
  organizationId: string;
  createdByUserId: string;
  type: MissionType;
  status: MissionStatus;
  input: MissionInput;
};

export type CreateMissionResult = {
  missionId: string;
  missionType: MissionType;
  status: "COMPLETED" | "NEEDS_REVIEW";
  context: unknown;
  decision: unknown;
  pedagogicalPlan: unknown;
};
