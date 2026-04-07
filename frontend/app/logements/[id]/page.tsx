import { LogementClient } from "./LogementClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LogementPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <LogementClient id={resolvedParams.id} />;
}
