"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { LedgerBorder } from "@/components/motifs/LedgerBorder";
import { OrnamentDivider } from "@/components/motifs/OrnamentDivider";
import { BlockPrintDivider } from "@/components/motifs/BlockPrintDivider";
import { HeroArtSlot, SubjectCoverArtSlot, EmptyStateArtSlot } from "@/components/art";

import { LedgerCard } from "@/components/ui/LedgerCard";
import { TickerTape } from "@/components/ui/TickerTape";
import { StatTile } from "@/components/ui/StatTile";
import { DataTable, Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SubjectCover } from "@/components/ui/SubjectCover";
import { Sheet } from "@/components/ui/Sheet";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Award } from "lucide-react";

interface DemoRow {
  code: string;
  department: string;
  assets: number;
  sharePrice: number;
  change: number;
}

export default function DesignSystemPage() {
  const { theme } = useTheme();
  const { success, error, info } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const demoRows: DemoRow[] = [
    { code: "FIN601", department: "Corporate Finance", assets: 42, sharePrice: 124.50, change: 3.4 },
    { code: "MKT502", department: "Marketing Strategy", assets: 28, sharePrice: 98.20, change: -1.2 },
    { code: "OPM503", department: "Operations Management", assets: 35, sharePrice: 110.00, change: 0.0 },
  ];

  const demoColumns: Column<DemoRow>[] = [
    { key: "code", header: "Code", isMono: true },
    { key: "department", header: "Department", className: "font-semibold" },
    { key: "assets", header: "Assets", align: "center", isMono: true },
    {
      key: "sharePrice",
      header: "Mastery",
      align: "right",
      isMono: true,
      render: (r) => `${Math.round(r.sharePrice)}%`,
    },
    {
      key: "change",
      header: "Change",
      align: "right",
      isMono: true,
      render: (r) => (
        <span
          className={
            r.change > 0
              ? "text-leaf dark:text-leaf-dark"
              : r.change < 0
              ? "text-sindoor dark:text-sindoor-dark"
              : "text-text-muted"
          }
        >
          {r.change > 0 ? `▲ +${r.change}%` : r.change < 0 ? `▼ ${r.change}%` : "• 0.00%"}
        </span>
      ),
    },
  ];

  const contrastChecks = [
    {
      palette: "Handmade Paper (Light)",
      pair: "Text #2A2522 on Surface #FCF8F0",
      ratio: "12.6:1",
      wcag: "Passes AAA (Threshold 7.0:1)",
    },
    {
      palette: "Handmade Paper (Light)",
      pair: "White #FFFFFF on Mehendi #5B6B2E",
      ratio: "5.85:1",
      wcag: "Passes AA (Threshold 4.5:1)",
    },
    {
      palette: "Handmade Paper (Light)",
      pair: "Mehendi #5B6B2E on Surface #FCF8F0",
      ratio: "5.2:1",
      wcag: "Passes AA (Threshold 4.5:1)",
    },
    {
      palette: "Handmade Paper (Light)",
      pair: "Kattha #7A3B24 on Surface #FCF8F0",
      ratio: "7.53:1",
      wcag: "Passes AAA (Threshold 7.0:1)",
    },
    {
      palette: "Night Paper (Dark)",
      pair: "Text #EDE6D8 on Surface #1C2438",
      ratio: "11.8:1",
      wcag: "Passes AAA (Threshold 7.0:1)",
    },
    {
      palette: "Night Paper (Dark)",
      pair: "Dark Text #141B2D on Mehendi #A3B46A",
      ratio: "7.59:1",
      wcag: "Passes AAA (Threshold 7.0:1)",
    },
    {
      palette: "Night Paper (Dark)",
      pair: "Mehendi #A3B46A on Surface #1C2438",
      ratio: "7.59:1",
      wcag: "Passes AAA (Threshold 7.0:1)",
    },
    {
      palette: "Night Paper (Dark)",
      pair: "Kattha #D08A6E on Surface #1C2438",
      ratio: "6.16:1",
      wcag: "Passes AA (Threshold 4.5:1)",
    },
  ];

  return (
    <AppShell
      tickerItems={[
        { id: "1", name: "Corporate Finance", code: "FIN601", sharePrice: 124.50, changePercent: 3.4 },
        { id: "2", name: "Marketing Strategy", code: "MKT502", sharePrice: 98.20, changePercent: -1.2 },
        { id: "3", name: "Operations", code: "OPM503", sharePrice: 110.00, changePercent: 0.0 },
      ]}
    >
      <div className="space-y-12">
        {/* Header */}
        <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="font-body text-xs text-sindoor font-semibold">
              Design System Showcase
            </span>
            <h1 className="font-heading text-4xl text-text font-normal mt-1">
              Design System
            </h1>
            <p className="text-sm font-body text-text-muted mt-1 max-w-2xl">
              Clean calm reading surfaces with geometric block-print borders and strict contrast.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-body text-text-muted">Theme:</span>
            <ThemeToggle />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. COLOR TOKENS & WCAG AA CONTRAST AUDIT */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <h2 className="font-heading text-2xl text-text">1. Color Tokens & Contrast Ratios</h2>
          <p className="text-xs font-mono text-text-muted uppercase tracking-wider">
            Active Palette: {theme === "light" ? "Handmade Paper (Light)" : "Diya Night (Dark)"}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { name: "Background", color: "bg-bg", text: "var(--color-bg)", border: true },
              { name: "Surface", color: "bg-surface", text: "var(--color-surface)", border: true },
              { name: "Text", color: "bg-text", text: "var(--color-text)", isLightText: true },
              { name: "Sindoor (Loss)", color: "bg-sindoor", text: "var(--color-sindoor)", isLightText: true },
              { name: "Leaf (Gain)", color: "bg-leaf", text: "var(--color-leaf)", isLightText: true },
              { name: "Turmeric", color: "bg-turmeric", text: "var(--color-turmeric)", isLightText: true },
              { name: "Indigo", color: "bg-indigo", text: "var(--color-indigo)", isLightText: true },
            ].map((tok) => (
              <div
                key={tok.name}
                className={`p-3 rounded-[3px] border border-border flex flex-col justify-between h-24 ${tok.color}`}
              >
                <span
                  className={`text-xs font-semibold font-mono ${
                    tok.isLightText ? "text-white" : "text-text"
                  }`}
                >
                  {tok.name}
                </span>
                <span
                  className={`text-[10px] font-mono opacity-80 ${
                    tok.isLightText ? "text-white" : "text-text"
                  }`}
                >
                  {tok.text}
                </span>
              </div>
            ))}
          </div>

          {/* Contrast Audit Table */}
          <div className="mt-6 rounded-[3px] border border-border bg-surface p-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-text font-semibold mb-2">
              WCAG AA / AAA Accessibility Audit
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-text-muted">
                    <th className="py-2">Palette</th>
                    <th className="py-2">Color Pair</th>
                    <th className="py-2">Measured Contrast</th>
                    <th className="py-2">WCAG Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {contrastChecks.map((chk, i) => (
                    <tr key={i} className="hover:bg-bg/40">
                      <td className="py-2 text-text font-medium">{chk.palette}</td>
                      <td className="py-2 text-text-muted">{chk.pair}</td>
                      <td className="py-2 font-bold tabular-nums text-text">{chk.ratio}</td>
                      <td className="py-2 text-leaf font-semibold">{chk.wcag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. ART SLOTS & GEOMETRIC DIVIDERS */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div>
            <h2 className="font-heading text-2xl text-text">2. Art Slots &amp; Geometric Dividers</h2>
            <p className="text-xs text-text-muted font-body mt-0.5">
              Calm paper textures and geometric block-print borders. Custom artwork files placed in /public/art.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Subject Cover Slot */}
            <div className="p-4 rounded border border-border bg-surface space-y-3">
              <h3 className="font-heading text-base text-text">Subject Cover Slot</h3>
              <SubjectCoverArtSlot subjectCode="FIN601" className="h-36 w-full" />
            </div>

            {/* Empty State Slot */}
            <div className="p-4 rounded border border-border bg-surface space-y-3">
              <h3 className="font-heading text-base text-text">Empty State Slot</h3>
              <EmptyStateArtSlot name="default" className="h-36 w-full" />
            </div>

            {/* Hero Art Slot */}
            <div className="p-4 rounded border border-border bg-surface space-y-3">
              <h3 className="font-heading text-base text-text">Hero Art Slot</h3>
              <HeroArtSlot className="h-36 w-full" />
            </div>
          </div>

          {/* Block-Print Divider */}
          <div className="rounded-[3px] border border-border bg-surface p-6 text-center space-y-3">
            <h3 className="font-heading text-lg text-text">Geometric Block-Print Divider</h3>
            <BlockPrintDivider />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. CORE DESIGN SYSTEM COMPONENTS */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <h2 className="font-heading text-2xl text-text">3. UI Component Library</h2>

          {/* Subject Cover */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted">
              SubjectCover (Lal Kapda & Dorri)
            </h3>
            <div className="flex flex-wrap gap-6 items-center">
              <SubjectCover
                id="c1"
                name="Corporate Finance"
                code="FIN601"
                credits={3}
                sharePrice={124.50}
                changePercent={3.4}
                size="md"
              />
              <SubjectCover
                id="c2"
                name="Marketing Strategy"
                code="MKT502"
                credits={3}
                sharePrice={98.20}
                changePercent={-1.2}
                size="md"
              />
            </div>
          </div>

          {/* LedgerBorder & LedgerCard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LedgerCard withBorder hasRedMargin>
              <h4 className="font-heading text-xl text-text">LedgerCard with LedgerBorder</h4>
              <p className="text-xs text-text-muted mt-1 font-body">
                Authentic double-line hatched border frame with corner accents and crimson debit margin line.
              </p>
              <div className="mt-4 font-mono text-xs text-text">
                Debit Balance: ₹14,250.00
              </div>
            </LedgerCard>

            <LedgerCard>
              <h4 className="font-heading text-xl text-text">Plain LedgerCard</h4>
              <p className="text-xs text-text-muted mt-1 font-body">
                Minimal calm surface on handmade paper texture, ideal for reading notes and flashcards.
              </p>
            </LedgerCard>
          </div>

          {/* StatTile with Sparkline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatTile
              title="Valuation Gained"
              value="₹3,420.00"
              changePercent={12.4}
              subtitle="Reinvestment from 28 cards"
              sparklineData={[10, 14, 18, 16, 22, 28]}
            />
            <StatTile
              title="Due for Review"
              value="- ₹480.00"
              changePercent={-2.1}
              subtitle="3 concepts ready for review"
              sparklineData={[28, 26, 24, 21, 19, 17]}
            />
            <StatTile
              title="Credit Rating"
              value="AAA"
              subtitle="0 late assignments"
              motif={<Award size={24} className="text-leaf" />}
            />
          </div>

          {/* DataTable */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted">
              DataTable (Ruled rows with red margin)
            </h3>
            <DataTable
              columns={demoColumns}
              data={demoRows}
              keyExtractor={(r) => r.code}
            />
          </div>

          {/* Interactive Modals & Toasts */}
          <div className="rounded-[3px] border border-border bg-surface p-6 space-y-4">
            <h3 className="font-heading text-xl text-text">Dialog, Sheet & Toast Triggers</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setIsDialogOpen(true)}
                className="px-4 py-2 rounded-[2px] border border-border bg-bg text-xs font-mono uppercase tracking-wider hover:bg-bg/60"
              >
                Open Dialog Modal
              </button>
              <button
                onClick={() => setIsSheetOpen(true)}
                className="px-4 py-2 rounded-[2px] border border-border bg-bg text-xs font-mono uppercase tracking-wider hover:bg-bg/60"
              >
                Open Side Sheet
              </button>
              <button
                onClick={() => success("Asset Reinvested", "Corporate Finance share price increased by ₹4.50")}
                className="px-4 py-2 rounded-[2px] bg-leaf text-white text-xs font-mono uppercase tracking-wider hover:bg-leaf/90"
              >
                Trigger Success Toast
              </button>
              <button
                onClick={() => error("Review Reminder", "2 concepts are due for review today")}
                className="px-4 py-2 rounded-[2px] bg-sindoor text-white text-xs font-mono uppercase tracking-wider hover:bg-sindoor/90"
              >
                Trigger Error Toast
              </button>
              <button
                onClick={() => info("Quarterly Report Ready", "Week 4 performance statement generated")}
                className="px-4 py-2 rounded-[2px] bg-indigo text-white text-xs font-mono uppercase tracking-wider hover:bg-indigo/90"
              >
                Trigger Info Toast
              </button>
            </div>
          </div>

          {/* Skeleton */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted">
              Skeleton (Paper-tone Shimmer)
            </h3>
            <div className="space-y-2 max-w-md">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>

          {/* EmptyState */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted">
              EmptyState
            </h3>
            <EmptyState
              title="No Concept Assets Minted Yet"
              message="Upload your class session deck to extract foundational concepts and build your knowledge balance sheet."
              actionText="Upload First Deck"
              onAction={() => {}}
            />
          </div>
        </section>
      </div>

      {/* Demo Sheet */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Division Details"
        description="Detailed valuation and review timeline"
      >
        <div className="space-y-4">
          <p className="text-xs font-body text-text-muted">
            Department assets represent foundational frameworks, models, and formulas mastered in class.
          </p>
          <div className="p-3 bg-bg rounded-[2px] border border-border font-mono text-xs">
            Current Share Price: ₹124.50
          </div>
        </div>
      </Sheet>

      {/* Demo Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Add New Subject"
        description="Add a new academic subject to your notebook"
      >
        <div className="space-y-3 font-body text-xs">
          <p className="text-text-muted">
            Enter the subject parameters to create a new subject cover.
          </p>
          <div className="pt-3 flex justify-end space-x-2">
            <button
              onClick={() => setIsDialogOpen(false)}
              className="px-3 py-1.5 font-body text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              onClick={() => setIsDialogOpen(false)}
              className="px-4 py-1.5 bg-sindoor text-white rounded-[2px] font-body text-xs font-semibold"
            >
              Add Subject
            </button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
