import React from "react";
import AppShell from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";
import { CareerContainerClient } from "@/components/career/CareerContainerClient";
import { PageHeaderBand } from "@/components/motifs/PageHeaderBand";

export const dynamic = "force-dynamic";

export default async function CareerPage() {
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
            Placement &amp; Professional Readiness
          </span>
          <h1 className="font-heading text-3xl text-text font-normal mt-1">
            Career Readiness
          </h1>
          <PageHeaderBand />
          <p className="text-xs text-text-muted font-body mt-0.5">
            Map competencies, track interview readiness, and align syllabus topics with target roles.
          </p>
        </div>
        <CareerContainerClient />
      </div>
    </AppShell>
  );
}
