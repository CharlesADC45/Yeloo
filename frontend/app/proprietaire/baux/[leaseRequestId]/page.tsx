import { LeaseRequestOwnerClient } from "./LeaseRequestOwnerClient";

type PageProps = {
  params: Promise<{ leaseRequestId: string }>;
};

export default async function ProprietaireBailDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <LeaseRequestOwnerClient leaseRequestId={resolvedParams.leaseRequestId} />;
}
