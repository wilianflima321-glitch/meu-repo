"use client";

import { RouteError } from "@/components/route-boundaries/RouteError";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} title="Evidence recovered safely" detail="Evidence failures stay contained so the rest of the app remains usable." />;
}
