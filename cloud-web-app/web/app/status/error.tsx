"use client";

import { RouteError } from "@/components/route-boundaries/RouteError";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} title="Status recovered safely" detail="Status data failed locally, but the route boundary kept the shell stable." />;
}
