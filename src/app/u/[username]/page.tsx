import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicProofClient } from "./PublicProofClient";
import { calculateSkillScore } from "@/lib/career/skillScore";

interface PageProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: { name: true, companyName: true, program: true, publicProofEnabled: true },
  });

  if (!user || !user.publicProofEnabled) {
    return {
      title: "Private Portfolio | You Inc.",
      description: "This learning record is private.",
    };
  }

  const title = `${user.name} (${user.companyName}) | Verified MBA Competency Portfolio`;
  const description = `Self-tracked learning record powered by You Inc. Review verified MBA skills, project portfolio, and course achievements for ${user.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      siteName: "You Inc. MBA Portfolio",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function PublicProofPage({ params }: PageProps) {
  const { username } = params;

  // Query user by username with public-safe projections ONLY
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      companyName: true,
      program: true,
      specialization: true,
      currentTerm: true,
      creditRating: true,
      publicProofEnabled: true,
      proofSettings: true,
      // Skills with confirmed concepts
      skills: {
        include: {
          skillConcepts: {
            where: { confirmed: true },
            include: { concept: { select: { value: true } } },
          },
        },
      },
      // Mock interview scores for live calculated skills
      interviews: {
        where: { completed: true },
        select: { mode: true, performanceScore: true },
      },
      // Approved and public projects ONLY
      projects: {
        where: { approved: true, isPublic: true },
        select: {
          id: true,
          title: true,
          problem: true,
          role: true,
          method: true,
          tools: true,
          outcome: true,
          metric: true,
          teamSize: true,
          resumeBullet: true,
          starStory: true,
          linkedInDesc: true,
        },
        orderBy: { createdAt: "desc" },
      },
      // IPO'd subjects (sharePrice >= 100.0)
      subjects: {
        where: { sharePrice: { gte: 100.0 } },
        select: {
          id: true,
          code: true,
          name: true,
          sharePrice: true,
        },
        orderBy: { sharePrice: "desc" },
      },
      // Quarterly reports count
      quarterlyReports: {
        select: { id: true, weekNumber: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    notFound();
  }

  // If user disabled public proof, render sovereign private state
  if (!user.publicProofEnabled) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-text">
        <div className="max-w-md w-full border border-border p-8 bg-paper-sunken text-center space-y-4">
          <div className="h-10 w-10 mx-auto border border-border bg-paper flex items-center justify-center font-mono text-sm text-text-muted">
            🔒
          </div>
          <h2 className="font-heading text-2xl font-normal text-text">Private Portfolio</h2>
          <p className="font-body text-xs text-text-muted leading-relaxed">
            This student has set their You Inc. competency proof page to private.
            Student data is kept strictly confidential unless explicitly authorized.
          </p>
          <div className="pt-2 text-[11px] font-mono text-text-muted border-t border-border">
            You Inc. &bull; The Portfolio of Your Degree
          </div>
        </div>
      </div>
    );
  }

  // Compute live skill proficiencies
  const verifiedSkills = user.skills.map((s) => {
    const conceptValues = s.skillConcepts.map((sc) => ({ value: sc.concept.value, weight: 1.0 }));
    const relevantMocks = user.interviews.filter((m) => {
      if (s.name === "Product Sense" || s.name === "Data & AI") return m.mode === "PM";
      if (s.name === "Strategy" || s.name === "Market Sizing") return m.mode === "CONSULTING";
      return true;
    });
    const proficiency = calculateSkillScore(conceptValues, relevantMocks.map((m) => m.performanceScore));
    return {
      name: s.name,
      category: s.category || "Competency",
      proficiency,
    };
  });

  const defaultSettings = {
    showSkills: true,
    showTrends: true,
    showProjects: true,
    showIpoSubjects: true,
    showQuarterlyConsistency: true,
  };

  const finalSettings = user.proofSettings
    ? { ...defaultSettings, ...(user.proofSettings as object) }
    : defaultSettings;

  return (
    <PublicProofClient
      candidate={{
        name: user.name,
        companyName: user.companyName,
        program: user.program || "MBA Candidate",
        specialization: user.specialization || "General Management",
        currentTerm: user.currentTerm || "Term 2",
        creditRating: user.creditRating,
        quarterlyCount: user.quarterlyReports.length,
      }}
      skills={verifiedSkills}
      projects={user.projects}
      ipoSubjects={user.subjects}
      settings={finalSettings}
      username={username}
    />
  );
}
