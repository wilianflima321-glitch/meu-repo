"use client";

import { RouteError } from "@/components/route-boundaries/RouteError";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} title="Billing recovered safely" detail="Billing errors are isolated so account navigation remains available." />;
}
