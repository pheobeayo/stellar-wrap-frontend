"use client";

import { useEffect } from "react";
import { ErrorCard } from "@/components/ErrorCard";

export default function LoadingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Loading page error:", error);
  }, [error]);

  return <ErrorCard error={error} reset={reset} title="Loading Failed" />;
}