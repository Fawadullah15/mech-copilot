import type { ActivityItem, DesignWarning } from '../types';

export const recentActivity: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'analysis',
    title: 'Stress analysis completed',
    description: 'Gearbox input shaft — Von Mises stress: 287 MPa, FoS: 2.28',
    timestamp: '2 hours ago',
    status: 'pass',
  },
  {
    id: 'act-2',
    type: 'recommendation',
    title: 'AI recommended diameter increase',
    description:
      'Drive shaft fatigue safety factor below target. Recommended increasing diameter from 52 mm to 55 mm.',
    timestamp: '5 hours ago',
    status: 'warning',
  },
  {
    id: 'act-3',
    type: 'material',
    title: 'Material changed to AISI 4340',
    description:
      'Drive shaft material updated from AISI 4140 to AISI 4340 for improved fatigue performance.',
    timestamp: 'Yesterday',
    status: 'info',
  },
  {
    id: 'act-4',
    type: 'design',
    title: 'Hydraulic pump housing created',
    description:
      'New project initialized with Al 6061-T6, operating pressure 250 bar.',
    timestamp: 'Sep 15',
    status: 'info',
  },
  {
    id: 'act-5',
    type: 'warning',
    title: 'Thermal expansion alert',
    description:
      'Hydraulic pump housing — thermal expansion at 80°C may affect seal clearances.',
    timestamp: 'Sep 15',
    status: 'warning',
  },
];

export const designWarnings: DesignWarning[] = [
  {
    id: 'warn-1',
    severity: 'warning',
    title: 'Fatigue safety factor below target',
    description:
      'Drive Shaft Design: Goodman fatigue safety factor is 1.48 (target: 1.50). Consider surface treatment or diameter increase.',
    project: 'Drive Shaft Design',
  },
  {
    id: 'warn-2',
    severity: 'critical',
    title: 'High operating temperature',
    description:
      'Hydraulic Pump Housing: Operating temperature of 80°C may reduce aluminum yield strength by 5-8%. Verify material properties at temperature.',
    project: 'Hydraulic Pump Housing',
  },
];

export const aiRecommendations = [
  {
    id: 'rec-1',
    title: 'Optimize gearbox input shaft',
    description:
      'Current diameter (45 mm) provides FoS = 2.28 against yield. A 42 mm shaft would still meet the FoS = 2.0 target and reduce material cost by 12%.',
    project: 'Gearbox Assembly',
    type: 'optimization',
  },
  {
    id: 'rec-2',
    title: 'Add stress relief groove',
    description:
      'Recommend adding a stress relief groove (r = 2 mm) at the bearing shoulder transition to reduce stress concentration factor from K_t = 2.4 to K_t = 1.6.',
    project: 'Drive Shaft Design',
    type: 'design',
  },
  {
    id: 'rec-3',
    title: 'Consider FEA validation',
    description:
      'The hydraulic pump housing has complex geometry. Analytical calculations may not capture all stress concentrations. Full FEA validation recommended.',
    project: 'Hydraulic Pump Housing',
    type: 'analysis',
  },
];
