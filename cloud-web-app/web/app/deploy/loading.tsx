import { RouteLoading } from "@/components/route-boundaries/RouteLoading";

export default function Loading() {
  return <RouteLoading title="Loading Deployment" detail="Fetching deployment status, artifacts, and provider links." />;
}
