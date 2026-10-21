export interface PlaybookStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: "action" | "decision" | "documentation" | "verification";
  required: boolean;
  estimatedMinutes: number;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  applicableTo: string[];
  steps: PlaybookStep[];
}

export function playbookProgressPercent(
  steps: PlaybookStep[],
  progress: { stepId: string; completed: boolean }[]
): number {
  if (steps.length === 0) return 0;
  const done = steps.filter((s) =>
    progress.some((p) => p.stepId === s.id && p.completed)
  ).length;
  return Math.round((done / steps.length) * 100);
}
