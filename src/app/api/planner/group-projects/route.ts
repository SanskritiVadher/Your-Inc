import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getProjectContributionLog,
  auditOverdueTaskAndPenalizeOwner,
} from "@/lib/planner/groupProjects";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true, name: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (projectId) {
      const project = await prisma.groupProject.findUnique({
        where: { id: projectId },
        include: {
          subject: { select: { id: true, code: true, name: true } },
          members: true,
          tasks: {
            include: {
              owner: { select: { id: true, name: true, role: true } },
            },
            orderBy: { deadline: "asc" },
          },
          meetingNotes: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      const contributionLog = await getProjectContributionLog(projectId);

      return NextResponse.json({
        project,
        contributionLog,
      });
    }

    // List all projects where user is a member or creator
    let projects = await prisma.groupProject.findMany({
      include: {
        subject: { select: { id: true, code: true, name: true } },
        members: true,
        tasks: { select: { id: true, status: true, isOverdue: true } },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { deadline: "asc" },
    });

    // If no projects exist yet, seed initial sample project for student
    if (projects.length === 0) {
      const sampleSubj = await prisma.subject.findFirst({ where: { userId: user.id } });
      if (sampleSubj) {
        const in10Days = new Date();
        in10Days.setDate(in10Days.getDate() + 10);

        const newP = await prisma.groupProject.create({
          data: {
            subjectId: sampleSubj.id,
            title: `${sampleSubj.code} Comprehensive M&A Case Analysis`,
            description: "Valuation of cross-border acquisition and synergies pitch deck.",
            deadline: in10Days,
            status: "active",
            fileLinks: [
              {
                name: "Valuation Model & DCF Workbook.xlsx",
                url: "https://onedrive.live.com/view.aspx?cid=sample_workbook",
                addedBy: user.name,
                date: new Date().toISOString(),
              },
            ],
            members: {
              create: [
                {
                  userId: user.id,
                  name: user.name,
                  role: "Project Lead",
                },
                {
                  name: "Aarav Sharma",
                  email: "aarav.s@youinc.mba",
                  role: "Financial Modeler",
                },
                {
                  name: "Pooja Mehta",
                  email: "pooja.m@youinc.mba",
                  role: "Industry Strategist",
                },
              ],
            },
          },
        });

        // Add initial tasks
        const members = await prisma.groupMember.findMany({ where: { groupProjectId: newP.id } });
        const lead = members.find((m) => m.userId === user.id) || members[0];
        const modeler = members.find((m) => m.name.includes("Aarav")) || members[0];

        const in3Days = new Date();
        in3Days.setDate(in3Days.getDate() + 3);

        await prisma.task.createMany({
          data: [
            {
              userId: user.id,
              groupProjectId: newP.id,
              ownerId: lead.id,
              title: "Draft Executive Strategic Thesis & Deal Rationale",
              deadline: in3Days,
              status: "IN_PROGRESS",
              completed: false,
            },
            {
              userId: user.id,
              groupProjectId: newP.id,
              ownerId: modeler.id,
              title: "Perform Sensitivity Analysis on WACC and Terminal Growth",
              deadline: in3Days,
              status: "TODO",
              completed: false,
            },
          ],
        });

        projects = await prisma.groupProject.findMany({
          include: {
            subject: { select: { id: true, code: true, name: true } },
            members: true,
            tasks: { select: { id: true, status: true, isOverdue: true } },
            _count: { select: { tasks: true, members: true } },
          },
          orderBy: { deadline: "asc" },
        });
      }
    }

    return NextResponse.json({ projects });
  } catch (err: unknown) {
    console.error("Group Projects API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await prisma.user.findFirst({ select: { id: true, name: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // 1. Create Group Project
    if (action === "create_project") {
      const { title, subjectId, description, deadline, memberNames = [] } = body;

      const project = await prisma.groupProject.create({
        data: {
          title: title || "New Group Project",
          subjectId,
          description,
          deadline: new Date(deadline || Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: "active",
          members: {
            create: [
              {
                userId: user.id,
                name: user.name,
                role: "Team Lead",
              },
              ...memberNames.map((name: string) => ({
                name: name.trim(),
                role: "Contributor",
              })),
            ],
          },
        },
        include: { members: true },
      });

      return NextResponse.json({ project });
    }

    // 2. Add Member to Project
    if (action === "add_member") {
      const { groupProjectId, name, email, role } = body;
      const member = await prisma.groupMember.create({
        data: {
          groupProjectId,
          name: name.trim(),
          email: email?.trim() || null,
          role: role || "Contributor",
        },
      });
      return NextResponse.json({ member });
    }

    // 3. Add Task
    if (action === "add_task") {
      const { groupProjectId, ownerId, title, deadline } = body;
      const task = await prisma.task.create({
        data: {
          userId: user.id,
          groupProjectId,
          ownerId: ownerId || null,
          title,
          deadline: deadline ? new Date(deadline) : undefined,
          status: "TODO",
          completed: false,
        },
        include: {
          owner: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json({ task });
    }

    // 4. Update Task Status (TODO -> IN_PROGRESS -> DONE)
    if (action === "update_task") {
      const { taskId, status } = body;
      const isDone = status === "DONE";

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          status,
          completed: isDone,
          completedAt: isDone ? new Date() : null,
        },
      });

      return NextResponse.json({ task: updated });
    }

    // 5. Add Cloud File Link (OneDrive / Google Drive)
    if (action === "add_file_link") {
      const { groupProjectId, name, url } = body;
      const project = await prisma.groupProject.findUnique({
        where: { id: groupProjectId },
        select: { fileLinks: true },
      });

      const currentLinks = Array.isArray(project?.fileLinks) ? project.fileLinks : [];
      const newLinks = [
        ...currentLinks,
        {
          name,
          url,
          addedBy: user.name,
          date: new Date().toISOString(),
        },
      ];

      await prisma.groupProject.update({
        where: { id: groupProjectId },
        data: { fileLinks: newLinks },
      });

      return NextResponse.json({ success: true, fileLinks: newLinks });
    }

    // 6. Audit Overdue Task (PENALIZES ONLY THAT OWNER)
    if (action === "audit_overdue_task") {
      const { taskId } = body;
      const result = await auditOverdueTaskAndPenalizeOwner(taskId);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Group Projects POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process project action" },
      { status: 500 }
    );
  }
}
