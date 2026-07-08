"use client";

export type LocalQuestion = {
  command: string;
  support?: string;
  answerSpace?: string;
};

export type LocalContentJson = {
  studentSheet?: {
    title?: string;
    context?: string;
    instructions?: string[];
    baseText?: string;
    didacticBoxes?: string[];
    visualElements?: string[];
    tableRows?: string[];
    questions?: LocalQuestion[];
  };
  teacherGuide?: {
    skillCode?: string;
    knowledgeObject?: string;
    objectives?: string[];
    methodology?: string[];
    adaptations?: string[];
    duaPrinciples?: string[];
    assessmentCriteria?: string[];
    applicationSuggestions?: string[];
  };
  worksheetTitle?: string;
  skillCode?: string;
  baseText?: string;
  instructions?: string[];
  questions?: LocalQuestion[];
  visualElements?: string[];
  adaptationNotes?: string[];
  objectives?: string[];
  expectedOutputs?: string[];
  methodologicalConstraints?: string[];
  validationCriteria?: string[];
  reuseSuggestions?: string[];
  [key: string]: unknown;
};

export type LocalResourceVersion = {
  id: string;
  versionNumber: number;
  contentJson: LocalContentJson;
  contentText: string;
  validationStatus: string;
  createdAt: string;
};

export type LocalResource = {
  id: string;
  missionId?: string;
  title: string;
  type: string;
  status: string;
  metadata: {
    discipline?: string;
    gradeYear?: string;
    skill?: string;
    knowledgeObject?: string;
    theme?: string;
    activityType?: string;
    specificNeed?: string;
    learningLevel?: string;
    accessibilityTags?: string[];
    pedagogicalTags?: string[];
  };
  versions: LocalResourceVersion[];
  latestVersion?: LocalResourceVersion;
  createdAt: string;
};

export type LocalMission = {
  id: string;
  missionType: string;
  status: string;
  title: string;
  resourceId?: string;
  createdAt: string;
  input?: Record<string, unknown>;
  resources?: LocalResource[];
};

type LocalDatabase = {
  missions: LocalMission[];
};

const storageKey = "acessa-plus-demo-store-v2";

export function saveGeneratedMission(input: {
  missionId: string;
  resourceId: string;
  missionType: string;
  contentJson: LocalContentJson;
  prompt: string;
}): void {
  const now = new Date().toISOString();
  const title = resolveTitle(input.contentJson);
  const version: LocalResourceVersion = {
    id: `local_version_${input.missionId}`,
    versionNumber: 1,
    contentJson: input.contentJson,
    contentText: buildContentText(input.contentJson),
    validationStatus: "PENDING",
    createdAt: now
  };
  const resource: LocalResource = {
    id: input.resourceId,
    missionId: input.missionId,
    title,
    type: input.missionType === "ADAPT_ACTIVITY" ? "ADAPTED_ACTIVITY" : "LESSON_PLAN",
    status: "DRAFT",
    metadata: buildMetadata(input.contentJson, input.missionType),
    versions: [version],
    latestVersion: version,
    createdAt: now
  };
  const mission: LocalMission = {
    id: input.missionId,
    missionType: input.missionType,
    status: "COMPLETED",
    title,
    resourceId: input.resourceId,
    createdAt: now,
    input: {
      pedido: input.prompt
    },
    resources: [resource]
  };
  const db = readDatabase();

  db.missions = [mission, ...db.missions.filter((item) => item.id !== mission.id)];
  writeDatabase(db);
}

export function listLocalMissions(): LocalMission[] {
  return readDatabase().missions.map((mission) => ({
    id: mission.id,
    missionType: mission.missionType,
    status: mission.status,
    title: mission.title,
    resourceId: mission.resourceId,
    createdAt: mission.createdAt
  }));
}

export function getLocalMission(missionId: string): LocalMission | null {
  return readDatabase().missions.find((mission) => mission.id === missionId) ?? null;
}

export function listLocalResources(): LocalResource[] {
  return readDatabase().missions.flatMap((mission) =>
    (mission.resources ?? []).map((resource) => ({
      ...resource,
      latestVersion: [...resource.versions].sort(
        (left, right) => right.versionNumber - left.versionNumber
      )[0]
    }))
  );
}

export function saveLocalResourceVersion(input: {
  resourceId: string;
  contentJson: LocalContentJson;
}): LocalResourceVersion | null {
  const db = readDatabase();
  const mission = db.missions.find((item) =>
    item.resources?.some((resource) => resource.id === input.resourceId)
  );
  const resource = mission?.resources?.find((item) => item.id === input.resourceId);

  if (!mission || !resource) {
    return null;
  }

  const versionNumber =
    resource.versions.reduce(
      (latest, version) => Math.max(latest, version.versionNumber),
      0
    ) + 1;
  const version: LocalResourceVersion = {
    id: `local_version_${crypto.randomUUID()}`,
    versionNumber,
    contentJson: input.contentJson,
    contentText: buildContentText(input.contentJson),
    validationStatus: "PENDING",
    createdAt: new Date().toISOString()
  };

  resource.versions = [version, ...resource.versions];
  resource.latestVersion = version;
  writeDatabase(db);

  return version;
}

function readDatabase(): LocalDatabase {
  if (typeof window === "undefined") {
    return { missions: [] };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return { missions: [] };
    }

    const parsed = JSON.parse(raw) as LocalDatabase;

    return {
      missions: Array.isArray(parsed.missions) ? parsed.missions : []
    };
  } catch {
    return { missions: [] };
  }
}

function writeDatabase(db: LocalDatabase): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(db));
}

function resolveTitle(contentJson: LocalContentJson): string {
  return (
    contentJson.studentSheet?.title ??
    contentJson.worksheetTitle ??
    "Atividade pronta para impressão"
  );
}

function buildMetadata(contentJson: LocalContentJson, missionType: string): LocalResource["metadata"] {
  return {
    skill: contentJson.teacherGuide?.skillCode ?? contentJson.skillCode,
    knowledgeObject: contentJson.teacherGuide?.knowledgeObject,
    activityType:
      missionType === "ADAPT_ACTIVITY"
        ? "Atividade adaptada"
        : "Atividade pronta para impressão",
    accessibilityTags: contentJson.teacherGuide?.adaptations ?? [],
    pedagogicalTags: contentJson.teacherGuide?.duaPrinciples ?? []
  };
}

function buildContentText(contentJson: LocalContentJson): string {
  const studentSheet = contentJson.studentSheet;
  const teacherGuide = contentJson.teacherGuide;
  const questionText = (studentSheet?.questions ?? contentJson.questions ?? [])
    .map((question, index) => `${index + 1}. ${question.command}`)
    .join("\n");

  return [
    studentSheet?.title ?? contentJson.worksheetTitle,
    studentSheet?.context,
    ...(studentSheet?.instructions ?? contentJson.instructions ?? []),
    studentSheet?.baseText ?? contentJson.baseText,
    ...(studentSheet?.didacticBoxes ?? []),
    ...(studentSheet?.visualElements ?? contentJson.visualElements ?? []),
    questionText,
    teacherGuide?.skillCode,
    teacherGuide?.knowledgeObject,
    ...(teacherGuide?.objectives ?? contentJson.objectives ?? []),
    ...(teacherGuide?.adaptations ?? contentJson.adaptationNotes ?? [])
  ]
    .filter(Boolean)
    .join("\n");
}
