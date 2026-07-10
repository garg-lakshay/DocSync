import { DocumentPageClient } from "@/components/document-page-client";

type PageProps = { params: Promise<{ id: string }> };

export default async function DocumentPage({ params }: PageProps) {
  const { id } = await params;
  return <DocumentPageClient documentId={id} />;
}
