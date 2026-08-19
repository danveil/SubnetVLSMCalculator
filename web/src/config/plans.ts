export const planLimits = {
  free: {
    savedProjects: 3,
    csvExport: true,
    overlapDetection: true,
  },
  pro: {
    savedProjects: Number.POSITIVE_INFINITY,
    csvExport: true,
    overlapDetection: true,
  },
} as const;

export type PlanName = keyof typeof planLimits;
