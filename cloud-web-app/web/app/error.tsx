"use client";

import { RouteError } from "@/components/route-boundaries/RouteError";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} title="Aethel recovered the app shell" detail="The global boundary caught the failure before it could take down the entire workspace." />;
}
