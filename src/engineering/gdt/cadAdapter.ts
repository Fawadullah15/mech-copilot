/**
 * CAD Geometry Adapter for Shaft Assembly
 * Normalizes parametric shaft geometry into standard GD&T CAD features,
 * manages datum definitions, and provides CAD import boundaries.
 */

import { DesignParameters } from '../../types';
import {
  CadFeature,
  DatumDefinition,
  FeatureControlFrame,
  StandardSystem,
} from './types';

/**
 * Normalizes active shaft design parameters into discrete CAD geometric features.
 * Features correspond to functional surfaces of the stepped transmission shaft:
 * - Left Bearing Seat (Journal Left)
 * - Main Transmission Span (Shaft Body)
 * - Right Bearing Seat (Journal Right)
 * - Gear Locating Shoulder
 * - Drive Keyway Slot
 */
export function extractCadFeaturesFromDesign(params: DesignParameters): CadFeature[] {
  const d = Math.max(10, params.diameter);
  const L = Math.max(50, params.length);

  // Journal diameters typically stepped down or equal to main shaft
  const journalDiameter = Math.round(d * 0.9 * 10) / 10;
  const journalLength = Math.min(50, Math.round(L * 0.15 * 10) / 10);
  const spanLength = Math.max(20, Math.round((L - 2 * journalLength) * 10) / 10);
  
  // Standard DIN 6885-1 keyway width based on shaft diameter
  let keyWidth = 12;
  if (d <= 22) keyWidth = 6;
  else if (d <= 30) keyWidth = 8;
  else if (d <= 38) keyWidth = 10;
  else if (d <= 44) keyWidth = 12;
  else if (d <= 50) keyWidth = 14;
  else if (d <= 58) keyWidth = 16;
  else if (d <= 65) keyWidth = 18;
  else keyWidth = 20;

  const keyLength = Math.min(70, Math.max(20, Math.round(spanLength * 0.4)));

  return [
    {
      id: 'feat-journal-left',
      name: 'Left Journal (Bearing Seat A)',
      type: 'cylinder',
      nominalDimensionMm: journalDiameter,
      lengthMm: journalLength,
      isFeatureOfSize: true,
      sizeToleranceMm: {
        upper: 0.0,
        lower: -0.016, // ISO 286 h6 for precision bearing fit
      },
      description: 'Cylindrical bearing journal supporting radial loads; primary datum axis candidate.',
    },
    {
      id: 'feat-shaft-body',
      name: 'Central Shaft Body (Transmission Span)',
      type: 'cylinder',
      nominalDimensionMm: d,
      lengthMm: spanLength,
      isFeatureOfSize: true,
      sizeToleranceMm: {
        upper: 0.0,
        lower: -0.025, // ISO 286 h7
      },
      description: 'Main torque-transmitting cylindrical body subject to torsion and bending.',
    },
    {
      id: 'feat-journal-right',
      name: 'Right Journal (Bearing Seat B)',
      type: 'cylinder',
      nominalDimensionMm: journalDiameter,
      lengthMm: journalLength,
      isFeatureOfSize: true,
      sizeToleranceMm: {
        upper: 0.0,
        lower: -0.016, // ISO 286 h6
      },
      description: 'Opposite cylindrical bearing journal; secondary datum axis candidate.',
    },
    {
      id: 'feat-gear-shoulder',
      name: 'Gear Locating Shoulder',
      type: 'plane',
      nominalDimensionMm: d, // shoulder diameter reference
      isFeatureOfSize: false,
      description: 'Planar abutment face providing axial registration for the mounted gear/pinion.',
    },
    {
      id: 'feat-keyway',
      name: 'Drive Keyway Slot (DIN 6885-1)',
      type: 'slot',
      nominalDimensionMm: keyWidth,
      lengthMm: keyLength,
      isFeatureOfSize: true,
      sizeToleranceMm: {
        upper: 0.0,
        lower: -0.036, // ISO 286 h9 for parallel keyway width
      },
      description: 'Milled parallel keyway slot with opposed planar flanks for torque transmission.',
    },
  ];
}

/**
 * Returns the default datum reference frame definitions derived from standard bearing centers.
 */
export function getDefaultDatums(features: CadFeature[]): DatumDefinition[] {
  const left = features.find((f) => f.id === 'feat-journal-left');
  const right = features.find((f) => f.id === 'feat-journal-right');
  const shoulder = features.find((f) => f.id === 'feat-gear-shoulder');

  return [
    {
      id: 'datum-A',
      label: 'A',
      featureId: left ? left.id : 'feat-journal-left',
      featureType: 'cylinder',
      description: 'Primary bearing axis establishing rotational center at drive end.',
      degreesOfFreedomConstrained: ['Tx', 'Ty', 'Rx', 'Ry'],
    },
    {
      id: 'datum-B',
      label: 'B',
      featureId: right ? right.id : 'feat-journal-right',
      featureType: 'cylinder',
      description: 'Secondary bearing axis establishing rotational center at tail end.',
      degreesOfFreedomConstrained: ['Tx', 'Ty', 'Rx', 'Ry'],
    },
    {
      id: 'datum-C',
      label: 'C',
      featureId: shoulder ? shoulder.id : 'feat-gear-shoulder',
      featureType: 'plane',
      description: 'Axial locating shoulder constraining longitudinal translation.',
      degreesOfFreedomConstrained: ['Tz'],
    },
  ];
}

/**
 * Returns default industry-standard Feature Control Frames for the stepped shaft assembly.
 */
export function getDefaultFeatureControlFrames(
  _features: CadFeature[],
  _datums: DatumDefinition[],
  standardSystem: StandardSystem = 'ISO_GPS'
): FeatureControlFrame[] {
  return [
    {
      id: 'fcf-1',
      featureId: 'feat-journal-left',
      characteristic: 'straightness',
      toleranceValueMm: 0.008,
      zoneShape: 'cylindrical',
      materialModifier: 'RFS',
      datumReferences: {},
      standardSystem,
      description: 'Derived median line straightness to limit journal bowing before bearing installation.',
    },
    {
      id: 'fcf-2',
      featureId: 'feat-shaft-body',
      characteristic: 'circular_runout',
      toleranceValueMm: 0.03,
      zoneShape: 'circular',
      materialModifier: 'RFS',
      datumReferences: {
        compoundAxis: 'A-B',
      },
      standardSystem,
      description: 'Radial runout relative to common bearing axis A-B to prevent high-speed vibration.',
    },
    {
      id: 'fcf-3',
      featureId: 'feat-gear-shoulder',
      characteristic: 'perpendicularity',
      toleranceValueMm: 0.02,
      zoneShape: 'planar',
      materialModifier: 'RFS',
      datumReferences: {
        compoundAxis: 'A-B',
      },
      standardSystem,
      description: 'Perpendicularity of gear locating face to avoid angular gear pitch-line wobble.',
    },
    {
      id: 'fcf-4',
      featureId: 'feat-keyway',
      characteristic: 'position',
      toleranceValueMm: 0.05,
      zoneShape: 'planar',
      materialModifier: 'MMC',
      datumReferences: {
        compoundAxis: 'A-B',
        tertiary: { datumLabel: 'C', modifier: 'RFS' },
      },
      standardSystem,
      description: 'Symmetric position of keyway center plane at MMC relative to functional axis and shoulder.',
    },
  ];
}

export interface CadImportResult {
  success: boolean;
  features?: CadFeature[];
  error?: string;
  code?: 'UNSUPPORTED_CAD_BREP' | 'INVALID_JSON' | 'EMPTY_FILE';
}

/**
 * Imports CAD geometric data.
 * Supports native JSON shaft feature exports.
 * Explicitly and cleanly rejects binary B-rep formats (STEP, IGES) with accurate technical diagnostics.
 */
export function importCadFile(file: { name: string; content?: string }): CadImportResult {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'step' || ext === 'stp' || ext === 'iges' || ext === 'igs' || ext === 'brep') {
    return {
      success: false,
      code: 'UNSUPPORTED_CAD_BREP',
      error: `Direct B-rep STEP (ISO 10303-21) and IGES (${ext.toUpperCase()}) parsing requires a native geometric solid modeling kernel (e.g., OpenCASCADE / ACIS C++ bindings) which is not executed in the client browser runtime. Please use normalized JSON feature models or active parametric shaft configurations.`,
    };
  }

  if (!file.content || file.content.trim().length === 0) {
    return {
      success: false,
      code: 'EMPTY_FILE',
      error: 'Uploaded file is empty.',
    };
  }

  try {
    const parsed = JSON.parse(file.content);
    if (Array.isArray(parsed.features)) {
      return {
        success: true,
        features: parsed.features as CadFeature[],
      };
    } else if (Array.isArray(parsed)) {
      return {
        success: true,
        features: parsed as CadFeature[],
      };
    } else {
      return {
        success: false,
        code: 'INVALID_JSON',
        error: 'JSON structure does not contain a recognizable CAD features array.',
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      code: 'INVALID_JSON',
      error: `Failed to parse JSON CAD file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
