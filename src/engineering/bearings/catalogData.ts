import type { BearingCatalogItem, BearingType } from './types';

/**
 * Standard ISO 15 / ISO 355 metric rolling bearings catalog dataset.
 * Data corresponds to standard manufacturer catalog baselines (SKF, Schaeffler/FAG, NSK)
 * conforming to ISO 281:2007 dynamic ratings and ISO 76:2006 static ratings.
 */
export const STANDARD_BEARING_CATALOG: BearingCatalogItem[] = [
  // ─── Deep Groove Ball Bearings (ISO 15 Series 62xx & 63xx) ───
  {
    id: 'dgbb-6204',
    designation: '6204',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 20,
    D: 47,
    B: 14,
    C: 13500, // N
    C0: 6550, // N
    limitingSpeedRpm: 19000,
    referenceSpeedRpm: 32000,
    massKg: 0.11,
    standard: 'ISO 15 / ISO 281'
  },
  {
    id: 'dgbb-6205',
    designation: '6205',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 25,
    D: 52,
    B: 15,
    C: 14800,
    C0: 7800,
    limitingSpeedRpm: 15000,
    referenceSpeedRpm: 28000,
    massKg: 0.13,
    standard: 'ISO 15 / ISO 281'
  },
  {
    id: 'dgbb-6206',
    designation: '6206',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 30,
    D: 62,
    B: 16,
    C: 20300,
    C0: 11200,
    limitingSpeedRpm: 13000,
    referenceSpeedRpm: 24000,
    massKg: 0.20,
    standard: 'ISO 15 / ISO 281'
  },
  {
    id: 'dgbb-6207',
    designation: '6207',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 35,
    D: 72,
    B: 17,
    C: 27000,
    C0: 15300,
    limitingSpeedRpm: 11000,
    referenceSpeedRpm: 20000,
    massKg: 0.29,
    standard: 'ISO 15 / ISO 281'
  },
  {
    id: 'dgbb-6208',
    designation: '6208',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 40,
    D: 80,
    B: 18,
    C: 32500,
    C0: 19800,
    limitingSpeedRpm: 9500,
    referenceSpeedRpm: 18000,
    massKg: 0.37,
    standard: 'ISO 15 / ISO 281'
  },
  {
    id: 'dgbb-6209',
    designation: '6209',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 45,
    D: 85,
    B: 19,
    C: 35100,
    C0: 21600,
    limitingSpeedRpm: 8500,
    referenceSpeedRpm: 17000,
    massKg: 0.41,
    standard: 'ISO 15 / ISO 281',
    notes: 'Standard match for 45 mm nominal shaft journal.'
  },
  {
    id: 'dgbb-6210',
    designation: '6210',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 50,
    D: 90,
    B: 20,
    C: 37100,
    C0: 23200,
    limitingSpeedRpm: 7500,
    referenceSpeedRpm: 15000,
    massKg: 0.46,
    standard: 'ISO 15 / ISO 281'
  },
  {
    id: 'dgbb-6211',
    designation: '6211',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 55,
    D: 100,
    B: 21,
    C: 46100,
    C0: 29000,
    limitingSpeedRpm: 7000,
    referenceSpeedRpm: 14000,
    massKg: 0.61,
    standard: 'ISO 15 / ISO 281'
  },
  {
    id: 'dgbb-6212',
    designation: '6212',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 60,
    D: 110,
    B: 22,
    C: 55300,
    C0: 36000,
    limitingSpeedRpm: 6300,
    referenceSpeedRpm: 13000,
    massKg: 0.78,
    standard: 'ISO 15 / ISO 281'
  },
  {
    id: 'dgbb-6308',
    designation: '6308',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing (Heavy)',
    d: 40,
    D: 90,
    B: 23,
    C: 42300,
    C0: 24000,
    limitingSpeedRpm: 8500,
    referenceSpeedRpm: 16000,
    massKg: 0.63,
    standard: 'ISO 15 / ISO 281'
  },
  {
    id: 'dgbb-6309',
    designation: '6309',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing (Heavy)',
    d: 45,
    D: 100,
    B: 25,
    C: 55300,
    C0: 31500,
    limitingSpeedRpm: 7500,
    referenceSpeedRpm: 14000,
    massKg: 0.83,
    standard: 'ISO 15 / ISO 281',
    notes: 'Heavy series match for 45 mm shaft journal.'
  },
  {
    id: 'dgbb-6310',
    designation: '6310',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing (Heavy)',
    d: 50,
    D: 110,
    B: 27,
    C: 65000,
    C0: 38000,
    limitingSpeedRpm: 6700,
    referenceSpeedRpm: 13000,
    massKg: 1.07,
    standard: 'ISO 15 / ISO 281'
  },

  // ─── Cylindrical Roller Bearings (ISO 15 Series NU 2xx & NU 3xx) ───
  {
    id: 'crb-nu208',
    designation: 'NU 208 ECP',
    type: 'cylindrical_roller',
    typeName: 'Cylindrical Roller Bearing',
    d: 40,
    D: 80,
    B: 18,
    C: 56100,
    C0: 45000,
    limitingSpeedRpm: 9500,
    referenceSpeedRpm: 10000,
    massKg: 0.39,
    standard: 'ISO 15 / ISO 281',
    notes: 'Pure radial floating bearing; separable outer ring.'
  },
  {
    id: 'crb-nu209',
    designation: 'NU 209 ECP',
    type: 'cylindrical_roller',
    typeName: 'Cylindrical Roller Bearing',
    d: 45,
    D: 85,
    B: 19,
    C: 64000,
    C0: 53000,
    limitingSpeedRpm: 8500,
    referenceSpeedRpm: 9000,
    massKg: 0.44,
    standard: 'ISO 15 / ISO 281',
    notes: 'High radial capacity floating bearing for 45 mm shaft.'
  },
  {
    id: 'crb-nu210',
    designation: 'NU 210 ECP',
    type: 'cylindrical_roller',
    typeName: 'Cylindrical Roller Bearing',
    d: 50,
    D: 90,
    B: 20,
    C: 69500,
    C0: 58500,
    limitingSpeedRpm: 7500,
    referenceSpeedRpm: 8000,
    massKg: 0.48,
    standard: 'ISO 15 / ISO 281'
  },
  {
    id: 'crb-nu309',
    designation: 'NU 309 ECP',
    type: 'cylindrical_roller',
    typeName: 'Cylindrical Roller Bearing (Heavy)',
    d: 45,
    D: 100,
    B: 25,
    C: 96800,
    C0: 83000,
    limitingSpeedRpm: 7500,
    referenceSpeedRpm: 7500,
    massKg: 0.90,
    standard: 'ISO 15 / ISO 281'
  },

  // ─── Angular Contact Ball Bearings (ISO 15 Series 72xx B, 40° Contact Angle) ───
  {
    id: 'acbb-7208b',
    designation: '7208 B',
    type: 'angular_contact_ball',
    typeName: 'Angular Contact Ball Bearing (40°)',
    d: 40,
    D: 80,
    B: 18,
    C: 36500,
    C0: 26000,
    limitingSpeedRpm: 10000,
    referenceSpeedRpm: 11000,
    e: 1.14,
    Y: 0.57,
    Y0: 0.26,
    massKg: 0.38,
    standard: 'ISO 15 / ISO 281',
    notes: 'Single row 40° contact angle for combined radial and high unidirectional thrust.'
  },
  {
    id: 'acbb-7209b',
    designation: '7209 B',
    type: 'angular_contact_ball',
    typeName: 'Angular Contact Ball Bearing (40°)',
    d: 45,
    D: 85,
    B: 19,
    C: 39000,
    C0: 29000,
    limitingSpeedRpm: 9000,
    referenceSpeedRpm: 10000,
    e: 1.14,
    Y: 0.57,
    Y0: 0.26,
    massKg: 0.43,
    standard: 'ISO 15 / ISO 281'
  },
  {
    id: 'acbb-7210b',
    designation: '7210 B',
    type: 'angular_contact_ball',
    typeName: 'Angular Contact Ball Bearing (40°)',
    d: 50,
    D: 90,
    B: 20,
    C: 41500,
    C0: 31500,
    limitingSpeedRpm: 8000,
    referenceSpeedRpm: 9000,
    e: 1.14,
    Y: 0.57,
    Y0: 0.26,
    massKg: 0.47,
    standard: 'ISO 15 / ISO 281'
  },

  // ─── Tapered Roller Bearings (ISO 355 Series 302xx) ───
  {
    id: 'trb-30208',
    designation: '30208',
    type: 'tapered_roller',
    typeName: 'Tapered Roller Bearing',
    d: 40,
    D: 80,
    B: 19.75,
    C: 63800,
    C0: 60000,
    limitingSpeedRpm: 7000,
    referenceSpeedRpm: 6700,
    e: 0.37,
    Y: 1.60,
    Y0: 0.88,
    massKg: 0.45,
    standard: 'ISO 355 / ISO 281',
    notes: 'Metric tapered roller bearing for heavy combined radial and unidirectional axial load.'
  },
  {
    id: 'trb-30209',
    designation: '30209',
    type: 'tapered_roller',
    typeName: 'Tapered Roller Bearing',
    d: 45,
    D: 85,
    B: 20.75,
    C: 70400,
    C0: 69500,
    limitingSpeedRpm: 6300,
    referenceSpeedRpm: 6000,
    e: 0.37,
    Y: 1.60,
    Y0: 0.88,
    massKg: 0.50,
    standard: 'ISO 355 / ISO 281'
  },
  {
    id: 'trb-30210',
    designation: '30210',
    type: 'tapered_roller',
    typeName: 'Tapered Roller Bearing',
    d: 50,
    D: 90,
    B: 21.75,
    C: 74800,
    C0: 76500,
    limitingSpeedRpm: 5600,
    referenceSpeedRpm: 5600,
    e: 0.40,
    Y: 1.50,
    Y0: 0.80,
    massKg: 0.55,
    standard: 'ISO 355 / ISO 281'
  }
];

export function getAllBearings(): BearingCatalogItem[] {
  return [...STANDARD_BEARING_CATALOG];
}

export function getBearingById(id: string): BearingCatalogItem | undefined {
  return STANDARD_BEARING_CATALOG.find((b) => b.id === id);
}

export function getBearingsByBore(boreMm: number): BearingCatalogItem[] {
  return STANDARD_BEARING_CATALOG.filter((b) => Math.abs(b.d - boreMm) < 0.1);
}

export function getBearingsByType(type: BearingType): BearingCatalogItem[] {
  return STANDARD_BEARING_CATALOG.filter((b) => b.type === type);
}

/**
 * Creates a custom user-defined bearing specification with validated properties.
 */
export function createCustomBearing(
  custom: Partial<BearingCatalogItem> & {
    designation: string;
    type: BearingType;
    d: number;
    C: number;
    C0: number;
  }
): BearingCatalogItem {
  if (custom.d <= 0) throw new Error('Bore diameter d must be positive');
  if (custom.C <= 0) throw new Error('Dynamic load rating C must be positive');
  if (custom.C0 <= 0) throw new Error('Static load rating C0 must be positive');

  return {
    id: `custom-${custom.designation.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
    designation: custom.designation,
    type: custom.type,
    typeName: `Custom ${custom.type.replace(/_/g, ' ')}`,
    d: custom.d,
    D: custom.D ?? custom.d * 2,
    B: custom.B ?? Math.round(custom.d * 0.4),
    C: custom.C,
    C0: custom.C0,
    limitingSpeedRpm: custom.limitingSpeedRpm ?? 10000,
    referenceSpeedRpm: custom.referenceSpeedRpm ?? 12000,
    e: custom.e,
    Y: custom.Y,
    Y0: custom.Y0,
    massKg: custom.massKg ?? 0.5,
    standard: custom.standard ?? 'User-Specified / ISO 281',
    notes: custom.notes ?? 'User-defined custom bearing entry'
  };
}
