import type { ActivityItem, DesignWarning } from '../types';

export const recentActivity: ActivityItem[] = [];

export const designWarnings: DesignWarning[] = [];

export const aiRecommendations: {
  id: string;
  title: string;
  description: string;
  project: string;
  type: string;
}[] = [];
