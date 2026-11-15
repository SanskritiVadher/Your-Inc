import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProjectArtifacts } from "@/lib/career/projectVault";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (err: unknown) {
    console.error("Projects GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // 1. AI Draft Artifacts Preview (Resume Bullet, STAR story, LinkedIn)
    if (action === "draft") {
      const { title, problem, role, method, tools, outcome, metric, teamSize } = body;
      if (!title || !problem || !method || !outcome) {
        return NextResponse.json({ error: "Required project details missing" }, { status: 400 });
      }

      const artifacts = generateProjectArtifacts({
        title,
        problem,
        role: role || "Contributor",
        method,
        tools: tools || "",
        outcome,
        metric: metric || undefined,
        teamSize: teamSize ? Number(teamSize) : undefined,
      });

      return NextResponse.json({ artifacts });
    }

    // 2. Save Project to Vault
    if (action === "save") {
      const {
        title,
        problem,
        role,
        method,
        tools,
        outcome,
        metric,
        teamSize,
        resumeBullet,
        starStory,
        linkedInDesc,
        isPublic = true,
      } = body;

      if (!title || !problem || !outcome) {
        return NextResponse.json({ error: "Title, problem, and outcome are required" }, { status: 400 });
      }

      // If artifacts weren't pre-generated, generate them now
      const finalArtifacts =
        resumeBullet && starStory && linkedInDesc
          ? { resumeBullet, starStory, linkedInDesc }
          : generateProjectArtifacts({
              title,
              problem,
              role: role || "Contributor",
              method: method || "Systematic Analysis",
              tools: tools || "",
              outcome,
              metric: metric || undefined,
              teamSize: teamSize ? Number(teamSize) : undefined,
            });

      const project = await prisma.project.create({
        data: {
          userId: user.id,
          title: title.trim(),
          description: problem.trim(),
          problem: problem.trim(),
          role: role?.trim() || null,
          method: method?.trim() || null,
          tools: tools?.trim() || null,
          outcome: outcome.trim(),
          metric: metric?.trim() || null,
          teamSize: teamSize ? Number(teamSize) : null,
          resumeBullet: finalArtifacts.resumeBullet,
          starStory: finalArtifacts.starStory as unknown as object,
          linkedInDesc: finalArtifacts.linkedInDesc,
          approved: false, // Must be explicitly approved
          isPublic: Boolean(isPublic),
        },
      });

      return NextResponse.json({ project });
    }

    // 3. Student Review & Approve Artifacts
    if (action === "approve") {
      const { projectId, editedResumeBullet, editedStarStory, editedLinkedInDesc } = body;
      if (!projectId) {
        return NextResponse.json({ error: "Project ID required" }, { status: 400 });
      }

      const updated = await prisma.project.update({
        where: { id: projectId },
        data: {
          approved: true,
          resumeBullet: editedResumeBullet !== undefined ? editedResumeBullet : undefined,
          starStory: editedStarStory !== undefined ? (editedStarStory as unknown as object) : undefined,
          linkedInDesc: editedLinkedInDesc !== undefined ? editedLinkedInDesc : undefined,
        },
      });

      return NextResponse.json({ project: updated });
    }

    // 4. Toggle Signature Project (Pin final/major project)
    if (action === "toggle_signature") {
      const { projectId } = body;
      if (!projectId) {
        return NextResponse.json({ error: "Project ID required" }, { status: 400 });
      }

      const existing = await prisma.project.findUnique({ where: { id: projectId } });
      if (!existing) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const updated = await prisma.project.update({
        where: { id: projectId },
        data: {
          isSignature: !existing.isSignature,
        },
      });

      return NextResponse.json({ project: updated });
    }

    // 5. Delete Project
    if (action === "delete") {
      const { projectId } = body;
      if (!projectId) {
        return NextResponse.json({ error: "Project ID required" }, { status: 400 });
      }

      await prisma.project.delete({ where: { id: projectId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Projects POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process project" },
      { status: 500 }
    );
  }
}
