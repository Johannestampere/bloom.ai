import { notFound } from "next/navigation";
import { MindmapPage } from "@/components/mindmap/MindmapPage";

type PageProps = {
  params: Promise<{ mindmapId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { mindmapId } = await params;
  const id = Number(mindmapId);

  if (Number.isNaN(id)) {
    notFound();
  }

  return <MindmapPage mindmapId={id} />;
}


