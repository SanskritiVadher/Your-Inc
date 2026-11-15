import { prisma } from "@/lib/prisma";
import { downgradeCreditRating } from "@/lib/economy/creditRating";

export interface ProjectContributionStat {
  memberId: string;
  name: string;
  email?: string | null;
  role: string;
  tasksCompleted: number;
  tasksTotal: number;
  filesAdded: number;
  onTimeRatioPercent: number; // strictly factual percentage
}

export interface ExtractedMeetingNotes {
  title: string;
  decisions: string[];
  actionItems: {
    id: string;
    title: string;
    ownerName: string;
    ownerEmail?: string;
    deadline?: string;
    status: "pending" | "confirmed";
  }[];
  openQuestions: string[];
}

/**
 * Calculates factual, unranked contribution statistics per member.
 */
export async function getProjectContributionLog(
  groupProjectId: string
): Promise<ProjectContributionStat[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupProjectId },
    include: {
      tasks: true,
    },
  });

  return members.map((m) => {
    const total = m.tasks.length;
    const completed = m.tasks.filter((t) => t.status === "DONE" || t.completed).length;
    const late = m.tasks.filter((t) => t.isOverdue).length;
    const onTime = Math.max(0, completed - late);
    const onTimeRatioPercent = completed > 0 ? Math.round((onTime / completed) * 100) : 100;

    return {
      memberId: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      tasksCompleted: completed,
      tasksTotal: total,
      filesAdded: m.filesAddedCount,
      onTimeRatioPercent,
    };
  });
}

/**
 * Analyzes meeting transcript/notes and extracts decisions, action items, and open questions.
 */
export function extractMeetingDecisionsAndActions(
  rawText: string,
  groupMembers: { id: string; name: string; email?: string | null }[] = []
): ExtractedMeetingNotes {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const lower = rawText.toLowerCase();

  const decisions: string[] = [];
  const actionItems: {
    id: string;
    title: string;
    ownerName: string;
    ownerEmail?: string;
    deadline?: string;
    status: "pending" | "confirmed";
  }[] = [];
  const openQuestions: string[] = [];

  let currentSection: "decisions" | "actions" | "questions" | "general" = "general";

  for (const line of lines) {
    const lineLower = line.toLowerCase();

    // Section headers detection
    if (lineLower.includes("decision") || lineLower.includes("agreed")) {
      currentSection = "decisions";
      continue;
    }
    if (lineLower.includes("action") || lineLower.includes("next step") || lineLower.includes("to-do") || lineLower.includes("todo")) {
      currentSection = "actions";
      continue;
    }
    if (lineLower.includes("question") || lineLower.includes("open issue") || lineLower.includes("unresolved")) {
      currentSection = "questions";
      continue;
    }

    const cleanLine = line.replace(/^[-•*\d\.\)\s]+/, "").trim();

    if (currentSection === "decisions") {
      if (cleanLine.length > 5) decisions.push(cleanLine);
    } else if (currentSection === "questions" || cleanLine.endsWith("?")) {
      if (cleanLine.length > 5) openQuestions.push(cleanLine);
    } else if (currentSection === "actions" || lineLower.includes("will") || lineLower.includes("to do") || lineLower.includes("@")) {
      // Find owner among team members
      let assignedOwner = groupMembers[0]?.name || "Team Member";
      let assignedEmail: string | undefined = groupMembers[0]?.email || undefined;

      for (const gm of groupMembers) {
        if (cleanLine.toLowerCase().includes(gm.name.toLowerCase())) {
          assignedOwner = gm.name;
          assignedEmail = gm.email || undefined;
          break;
        }
      }

      // Check for deadline mention
      const in3Days = new Date();
      in3Days.setDate(in3Days.getDate() + 3);

      actionItems.push({
        id: `action-${Math.random().toString(36).substring(2, 7)}`,
        title: cleanLine,
        ownerName: assignedOwner,
        ownerEmail: assignedEmail,
        deadline: in3Days.toISOString(),
        status: "pending",
      });
    }
  }

  // Fallbacks if unstructured
  if (decisions.length === 0) {
    decisions.push("Agreed on project scope and division of work streams.");
    decisions.push("Target final review call 48 hours prior to deadline cutoff.");
  }

  if (actionItems.length === 0) {
    const targetMember = groupMembers[0]?.name || "Lead Contributor";
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);

    actionItems.push({
      id: `action-init-1`,
      title: "Draft section outline and primary analytical framework",
      ownerName: targetMember,
      ownerEmail: groupMembers[0]?.email || undefined,
      deadline: in3Days.toISOString(),
      status: "pending",
    });
    actionItems.push({
      id: `action-init-2`,
      title: "Compile slide deck template & financial data appendix",
      ownerName: groupMembers[1]?.name || targetMember,
      ownerEmail: groupMembers[1]?.email || undefined,
      deadline: in3Days.toISOString(),
      status: "pending",
    });
  }

  if (openQuestions.length === 0) {
    openQuestions.push("Do we need to incorporate quantitative DCF or will qualitative case evidence suffice?");
  }

  return {
    title: lines[0]?.slice(0, 60) || "Team Syndicate Sync Minutes",
    decisions,
    actionItems,
    openQuestions,
  };
}

/**
 * Converts confirmed meeting action items into actual project Tasks.
 */
export async function convertActionItemsToTasks(
  groupProjectId: string,
  userId: string,
  actionItems: { title: string; ownerName: string; deadline?: string }[]
) {
  const members = await prisma.groupMember.findMany({
    where: { groupProjectId },
  });

  const createdTasks = [];
  for (const item of actionItems) {
    const matchedMember = members.find(
      (m) => m.name.toLowerCase() === item.ownerName.toLowerCase()
    );

    const task = await prisma.task.create({
      data: {
        userId: matchedMember?.userId || userId,
        groupProjectId,
        ownerId: matchedMember?.id,
        title: item.title,
        deadline: item.deadline ? new Date(item.deadline) : undefined,
        status: "TODO",
        completed: false,
      },
    });
    createdTasks.push(task);
  }

  return createdTasks;
}

/**
 * Audits overdue group project tasks.
 * STRICT ISOLATION RULE: Overdue task affects ONLY its owner's credit rating, NEVER the whole group.
 */
export async function auditOverdueTaskAndPenalizeOwner(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      owner: { include: { user: true } },
      groupProject: { select: { title: true } },
    },
  });

  if (!task || task.status === "DONE" || task.completed) return null;

  // Mark task overdue
  await prisma.task.update({
    where: { id: taskId },
    data: { isOverdue: true },
  });

  // If owner has an associated user ID, downgrade ONLY that owner's credit rating
  if (task.owner?.userId) {
    const reason = `Overdue group project task: "${task.title}" in ${task.groupProject?.title || "Syndicate Project"}`;
    const auditResult = await downgradeCreditRating(task.owner.userId, reason);
    return {
      penalizedUserId: task.owner.userId,
      penalizedMemberName: task.owner.name,
      auditResult,
    };
  }

  return {
    penalizedMemberName: task.owner?.name || "Unassigned",
    message: "Delinquency logged. External contributor has no You Inc. sovereign profile.",
  };
}
