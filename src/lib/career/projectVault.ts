export interface ProjectInput {
  title: string;
  problem: string;
  role: string;
  method: string;
  tools: string;
  outcome: string;
  metric?: string; // Optional real metric provided by student
  teamSize?: number;
}

export interface GeneratedProjectArtifacts {
  resumeBullet: string;
  starStory: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  linkedInDesc: string;
  hasMetric: boolean;
  metricNotice?: string;
}

/**
 * Drafts career vault artifacts from authentic student input.
 * CRITICAL RULE: NEVER invent facts, percentages, dollar figures, or metrics.
 * If no metric is provided, either draft without invented numbers or prompt the student.
 */
export function generateProjectArtifacts(input: ProjectInput): GeneratedProjectArtifacts {
  const { title, problem, role, method, tools, outcome, metric, teamSize } = input;

  const roleText = role ? role.trim() : "Lead Contributor";
  const toolsText = tools ? ` using ${tools.trim()}` : "";
  const teamText = teamSize && teamSize > 1 ? ` cross-functional team of ${teamSize}` : "project initiative";

  // 1. Resume Bullet (Action + Method + Measurable result)
  let resumeBullet = "";
  let metricNotice: string | undefined = undefined;

  if (metric && metric.trim().length > 0) {
    // Student supplied real metric
    resumeBullet = `Spearheaded ${title.trim()} as ${roleText}, executing ${method.trim()}${toolsText} to ${outcome.trim()}, achieving ${metric.trim()}.`;
  } else {
    // No metric provided: DO NOT invent a percentage or number!
    resumeBullet = `Led ${title.trim()} as ${roleText}, applying ${method.trim()}${toolsText} to resolve ${problem.trim()} and deliver ${outcome.trim()}.`;
    metricNotice = "No quantitative metric was supplied. Bullet drafted without fabricated figures; consider adding verified outcome data if available.";
  }

  // 2. STAR Story (Situation, Task, Action, Result)
  const starStory = {
    situation: `At ${title.trim()}, the team faced: ${problem.trim()}.`,
    task: `As ${roleText} within a ${teamText}, was tasked with designing and executing a structured resolution framework.`,
    action: `Applied ${method.trim()}${toolsText}, establishing clear milestones and driving alignment across key stakeholders.`,
    result: metric && metric.trim().length > 0
      ? `Successfully delivered ${outcome.trim()}, documented in final outcomes with verified impact of ${metric.trim()}.`
      : `Successfully delivered ${outcome.trim()}, establishing an operational benchmark without secondary friction.`,
  };

  // 3. 2-Line LinkedIn Description
  const linkedInDesc = metric && metric.trim().length > 0
    ? `Led ${title.trim()} utilizing ${method.trim()}${toolsText} to tackle ${problem.trim()}.\nDelivered ${outcome.trim()} resulting in verified impact of ${metric.trim()}.`
    : `Led ${title.trim()} utilizing ${method.trim()}${toolsText} to address critical challenges in ${problem.trim()}.\nDelivered ${outcome.trim()} to drive sustainable strategic alignment.`;

  return {
    resumeBullet,
    starStory,
    linkedInDesc,
    hasMetric: Boolean(metric && metric.trim().length > 0),
    metricNotice,
  };
}
