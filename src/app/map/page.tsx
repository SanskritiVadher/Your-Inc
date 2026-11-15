import React from "react";
import AppShell from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { MapContainerClient } from "@/components/location/MapContainerClient";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const user = await prisma.user.findFirst({ include: { subjects: true } });
  const tickerItems = (user?.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <div className="space-y-6">
        <div className="pb-4 border-b border-border">
          <span className="font-body text-xs text-leaf font-semibold">
            Campus Context
          </span>
          <h1 className="font-heading text-3xl text-text font-normal mt-1">
            Campus &amp; Study Map
          </h1>
          <PageHeaderBand />
          <p className="text-xs text-text-muted font-body mt-0.5">
            Study focus zones, campus study spaces, and localized field case studies.
          </p>
        </div>
        <MapContainerClient />
      </div>
    </AppShell>
  );
}
