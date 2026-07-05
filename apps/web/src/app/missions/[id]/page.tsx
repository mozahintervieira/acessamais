import { MissionDetailView } from "./mission-detail-view";

export default async function MissionDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  return <MissionDetailView missionId={id} />;
}
