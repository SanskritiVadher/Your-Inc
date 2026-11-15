import React from "react";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/layout/AppShell";
import { DepartmentsClient } from "./DepartmentsClient";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const user = await prisma.user.findFirst({
    include: {
      terms: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
      subjects: {
        include: { professor: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const subjects = user?.subjects || [];
  const terms = (user?.terms || []).map((t) => ({
    id: t.id,
    name: t.name,
    isCurrent: t.isCurrent,
    isArchived: t.isArchived,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    endDate: t.endDate ? t.endDate.toISOString() : null,
    order: t.order,
  }));

  const tickerItems = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    sharePrice: s.sharePrice,
    changePercent: 0.0,
  }));

  return (
    <AppShell tickerItems={tickerItems} userCompanyName={user?.companyName || "You Inc."}>
      <DepartmentsClient terms={terms} initialSubjects={subjects} />
    </AppShell>
  );
}
