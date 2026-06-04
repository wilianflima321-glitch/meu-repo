"use client";

import { RouteError } from "@/components/route-boundaries/RouteError";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} title="Help recovered safely" detail="Help center failures stay isolated; retry the compact support page." />;
}
