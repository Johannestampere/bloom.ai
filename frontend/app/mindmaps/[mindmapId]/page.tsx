import { MindmapPage } from "@/components/mindmap/MindmapPage";

type PageProps = {
  params: { mindmapId: string };
};

export default function Page({ params }: PageProps) {
  const id = Number(params.mindmapId);
  return <MindmapPage mindmapId={id} />;
}


