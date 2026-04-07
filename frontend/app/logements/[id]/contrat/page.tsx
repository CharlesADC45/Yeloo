import { ContractClient } from "./ContractClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContratLogementPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <ContractClient id={resolvedParams.id} />;
}
