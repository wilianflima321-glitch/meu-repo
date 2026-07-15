import { RouteLoading } from "@/components/route-boundaries/RouteLoading";

export default function Loading() {
  return <RouteLoading title="Loading Billing" detail="Fetching plans, subscription state, usage, and invoices." />;
}
