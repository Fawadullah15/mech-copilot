/**
 * GD&T (Geometric Dimensioning & Tolerancing) Data Models
 * Conforming to ISO 1101:2017, ISO 5459:2011, and ASME Y14.5-2018
 */

export type StandardSystem = 'ISO_GPS' | 'ASME_Y14_5';

export type GeometricCategory = 'form' | 'orientation' | 'location' | 'runout';

export type GeometricCharacteristic =
  | 'straightness'
  | 'flatness'
  | 'perpendicularity'
  | 'parallelism'
  | 'position'
  | 'circular_runout';

export type ToleranceZoneShape = 'cylindrical' | 'planar' | 'circular';

export type MaterialModifier = 'RFS' | 'MMC' | 'LMC';

export type FeatureType =
  | 'cylinder'
  | 'plane'
  | 'slot'
  | 'cone'
  | 'complex';

export interface CadFeature {
  id: string;
  name: string;
  type: FeatureType;
  nominalDimensionMm: number; // e.g. diameter for cylinder, width for slot
  lengthMm?: number;
  isFeatureOfSize: boolean;
  sizeToleranceMm?: {
    upper: number;
    lower: number;
  };
  description: string;
}

export interface DatumDefinition {
  id: string;
  label: string; // e.g. 'A', 'B', 'C'
  featureId: string;
  featureType: FeatureType;
  description: string;
  degreesOfFreedomConstrained: string[]; // e.g. ['Tx', 'Ty', 'Rx', 'Ry']
}

export interface DatumReference {
  datumLabel: string;
  modifier?: MaterialModifier;
}

export interface DatumReferenceFrame {
  primary?: DatumReference;
  secondary?: DatumReference;
  tertiary?: DatumReference;
  compoundAxis?: string; // e.g. 'A-B' common datum axis
}

export interface FeatureControlFrame {
  id: string;
  featureId: string;
  characteristic: GeometricCharacteristic;
  toleranceValueMm: number;
  zoneShape: ToleranceZoneShape;
  materialModifier: MaterialModifier;
  datumReferences: DatumReferenceFrame;
  standardSystem: StandardSystem;
  description?: string;
}

export interface GdtValidationResult {
  fcfId: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  unsupportedRules: string[];
  formattedFcfString: string;
  physicalConformanceStatus: 'unevaluated';
  conformanceDisclaimer: string;
}

export interface CharacteristicMetadata {
  id: GeometricCharacteristic;
  name: string;
  category: GeometricCategory;
  symbol: string; // Unicode geometric tolerance symbol
  unicodeChar: string;
  allowsDatums: boolean;
  requiresDatums: boolean;
  allowsMmc: boolean;
  allowsCylindricalZone: boolean;
  isoStandard: string;
  asmeStandard: string;
  description: string;
}
