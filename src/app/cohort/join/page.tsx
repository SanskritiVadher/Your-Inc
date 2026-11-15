import React, { Suspense } from "react";
import { CohortJoinClient } from "@/components/cohort/CohortJoinClient";

export const dynamic = "force-dynamic";

export default function CohortJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center font-mono text-xs text-text-muted">
          Loading section invite portal...
        </div>
      }
    >
      <CohortJoinClient />
    </Suspense>
  );
}
