"use client";

import { RouteError } from "@/components/route-boundaries/RouteError";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} title="IDE surface recovered safely" detail="The editor boundary caught the failure; project data and the app shell remain available." />;
}
