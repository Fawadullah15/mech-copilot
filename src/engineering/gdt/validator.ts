/**
 * GD&T Feature Control Frame Validation Engine
 * Implements syntactic, datum reference, tolerance zone, and material modifier checks
 * conforming to ISO 1101:2017, ISO 5459:2011, and ASME Y14.5-2018.
 */

import {
  CadFeature,
  CharacteristicMetadata,
  DatumDefinition,
  FeatureControlFrame,
  GdtValidationResult,
  GeometricCharacteristic,
} from './types';

/**
 * Metadata catalog for the 6 core shaft geometric characteristics.
 */
export const CHARACTERISTIC_METADATA: Record<GeometricCharacteristic, CharacteristicMetadata> = {
  straightness: {
    id: 'straightness',
    name: 'Straightness',
    category: 'form',
    symbol: '—',
    unicodeChar: '\u23E4',
    allowsDatums: false,
    requiresDatums: false,
    allowsMmc: true, // Only when applied to derived median line of a feature of size
    allowsCylindricalZone: true,
    isoStandard: 'ISO 1101:2017 Clause 6.4.1',
    asmeStandard: 'ASME Y14.5-2018 Section 8.2',
    description: 'Condition where an element of a surface or derived median line is a straight line.',
  },
  flatness: {
    id: 'flatness',
    name: 'Flatness',
    category: 'form',
    symbol: '⏢',
    unicodeChar: '\u23E5',
    allowsDatums: false,
    requiresDatums: false,
    allowsMmc: false, // Standard planar flatness does not apply MMC
    allowsCylindricalZone: false,
    isoStandard: 'ISO 1101:2017 Clause 6.4.2',
    asmeStandard: 'ASME Y14.5-2018 Section 8.4',
    description: 'Condition of a surface having all elements in one plane within two parallel planes.',
  },
  perpendicularity: {
    id: 'perpendicularity',
    name: 'Perpendicularity',
    category: 'orientation',
    symbol: '⟂',
    unicodeChar: '\u27C2',
    allowsDatums: true,
    requiresDatums: true,
    allowsMmc: true,
    allowsCylindricalZone: true,
    isoStandard: 'ISO 1101:2017 Clause 6.4.8',
    asmeStandard: 'ASME Y14.5-2018 Section 9.4',
    description: 'Condition of a surface, feature center plane, or axis at a right angle to a datum.',
  },
  parallelism: {
    id: 'parallelism',
    name: 'Parallelism',
    category: 'orientation',
    symbol: '∥',
    unicodeChar: '\u2225',
    allowsDatums: true,
    requiresDatums: true,
    allowsMmc: true,
    allowsCylindricalZone: true,
    isoStandard: 'ISO 1101:2017 Clause 6.4.7',
    asmeStandard: 'ASME Y14.5-2018 Section 9.3',
    description: 'Condition of a surface or center plane equidistant at all points from a datum plane or axis.',
  },
  position: {
    id: 'position',
    name: 'Position',
    category: 'location',
    symbol: '⌖',
    unicodeChar: '\u2316',
    allowsDatums: true,
    requiresDatums: true,
    allowsMmc: true,
    allowsCylindricalZone: true,
    isoStandard: 'ISO 1101:2017 Clause 6.4.11',
    asmeStandard: 'ASME Y14.5-2018 Section 10.2',
    description: 'Zone within which the center, axis, or center plane of a feature of size is permitted to vary from true position.',
  },
  circular_runout: {
    id: 'circular_runout',
    name: 'Circular Runout',
    category: 'runout',
    symbol: '↗',
    unicodeChar: '\u2197',
    allowsDatums: true,
    requiresDatums: true,
    allowsMmc: false, // Strict: Runout is an indicator reading tolerance, MMC/LMC strictly illegal
    allowsCylindricalZone: false, // Runout zones are circular/annular in the cross-section
    isoStandard: 'ISO 1101:2017 Clause 6.4.14',
    asmeStandard: 'ASME Y14.5-2018 Section 12.2',
    description: 'Controls composite form, orientation, and coaxiality during full 360° part rotation about a datum axis.',
  },
};

/**
 * Generates an engineering-grade ASCII/Unicode Feature Control Frame callout string.
 * Example: "[ ⟂ | ⌀0.02 | A | B ]" or "[ ↗ | 0.03 | A-B ]" or "[ ⌖ | ⌀0.05 Ⓜ | A-B | C ]"
 */
export function formatFeatureControlFrameString(fcf: FeatureControlFrame): string {
  const meta = CHARACTERISTIC_METADATA[fcf.characteristic];
  const symbol = meta ? meta.symbol : fcf.characteristic;

  const diaPrefix = fcf.zoneShape === 'cylindrical' ? '⌀' : '';
  const modSuffix =
    fcf.materialModifier === 'MMC'
      ? ' Ⓜ'
      : fcf.materialModifier === 'LMC'
      ? ' Ⓛ'
      : '';

  const tolCompartment = `${diaPrefix}${fcf.toleranceValueMm}${modSuffix}`;

  const datums: string[] = [];
  if (fcf.datumReferences.compoundAxis) {
    datums.push(fcf.datumReferences.compoundAxis);
    if (fcf.datumReferences.secondary?.datumLabel) {
      const sMod =
        fcf.datumReferences.secondary.modifier === 'MMC'
          ? ' Ⓜ'
          : fcf.datumReferences.secondary.modifier === 'LMC'
          ? ' Ⓛ'
          : '';
      datums.push(`${fcf.datumReferences.secondary.datumLabel}${sMod}`);
    }
    if (fcf.datumReferences.tertiary?.datumLabel) {
      const tMod =
        fcf.datumReferences.tertiary.modifier === 'MMC'
          ? ' Ⓜ'
          : fcf.datumReferences.tertiary.modifier === 'LMC'
          ? ' Ⓛ'
          : '';
      datums.push(`${fcf.datumReferences.tertiary.datumLabel}${tMod}`);
    }
  } else {
    if (fcf.datumReferences.primary?.datumLabel) {
      const pMod =
        fcf.datumReferences.primary.modifier === 'MMC'
          ? ' Ⓜ'
          : fcf.datumReferences.primary.modifier === 'LMC'
          ? ' Ⓛ'
          : '';
      datums.push(`${fcf.datumReferences.primary.datumLabel}${pMod}`);
    }
    if (fcf.datumReferences.secondary?.datumLabel) {
      const sMod =
        fcf.datumReferences.secondary.modifier === 'MMC'
          ? ' Ⓜ'
          : fcf.datumReferences.secondary.modifier === 'LMC'
          ? ' Ⓛ'
          : '';
      datums.push(`${fcf.datumReferences.secondary.datumLabel}${sMod}`);
    }
    if (fcf.datumReferences.tertiary?.datumLabel) {
      const tMod =
        fcf.datumReferences.tertiary.modifier === 'MMC'
          ? ' Ⓜ'
          : fcf.datumReferences.tertiary.modifier === 'LMC'
          ? ' Ⓛ'
          : '';
      datums.push(`${fcf.datumReferences.tertiary.datumLabel}${tMod}`);
    }
  }

  if (datums.length > 0) {
    return `[ ${symbol} | ${tolCompartment} | ${datums.join(' | ')} ]`;
  }
  return `[ ${symbol} | ${tolCompartment} ]`;
}

/**
 * Validates a single Feature Control Frame against CAD features and Datum definitions.
 */
export function validateFeatureControlFrame(
  fcf: FeatureControlFrame,
  features: CadFeature[],
  datums: DatumDefinition[]
): GdtValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const unsupportedRules: string[] = [];

  const meta = CHARACTERISTIC_METADATA[fcf.characteristic];
  if (!meta) {
    return {
      fcfId: fcf.id,
      isValid: false,
      errors: [`Unknown geometric characteristic: ${fcf.characteristic}`],
      warnings: [],
      unsupportedRules: [],
      formattedFcfString: `[ ? | ${fcf.toleranceValueMm} ]`,
      physicalConformanceStatus: 'unevaluated',
      conformanceDisclaimer: 'Invalid definition; cannot evaluate.',
    };
  }

  // 1. Tolerance Value Check
  if (typeof fcf.toleranceValueMm !== 'number' || isNaN(fcf.toleranceValueMm) || fcf.toleranceValueMm <= 0) {
    errors.push(`Tolerance value must be a positive number greater than zero (received ${fcf.toleranceValueMm} mm).`);
  } else if (fcf.toleranceValueMm > 1.0) {
    warnings.push(`Tolerance value ${fcf.toleranceValueMm} mm is exceptionally large for precision mechanical shafting.`);
  } else if (fcf.toleranceValueMm < 0.001) {
    warnings.push(`Tolerance value ${fcf.toleranceValueMm} mm is below typical industrial grinding capability (< 1 µm).`);
  }

  // 2. Feature Existence Check
  const feature = features.find((f) => f.id === fcf.featureId);
  if (!feature) {
    errors.push(`Target CAD feature ID "${fcf.featureId}" was not found in the CAD feature model.`);
  }

  // 3. Tolerance Zone Shape Check
  if (fcf.zoneShape === 'cylindrical') {
    if (!meta.allowsCylindricalZone) {
      errors.push(`${meta.name} does not permit a cylindrical (⌀) tolerance zone.`);
    }
    if (feature && feature.type === 'plane') {
      errors.push(`Cannot apply cylindrical (⌀) tolerance zone to planar feature "${feature.name}". Planar features require parallel planes tolerance zone.`);
    }
  }

  // 4. Datum Association Checks
  const hasCompound = !!fcf.datumReferences.compoundAxis;
  const hasPrimary = !!fcf.datumReferences.primary?.datumLabel;
  const hasAnyDatum = hasCompound || hasPrimary;

  if (!meta.allowsDatums && hasAnyDatum) {
    errors.push(`${meta.name} is a form tolerance (ISO 1101 / ASME Y14.5) and must NOT reference any datums.`);
  }

  if (meta.requiresDatums && !hasAnyDatum) {
    errors.push(`${meta.name} is an orientation/location/runout tolerance and MUST reference at least one primary datum or compound axis.`);
  }

  // 5. Self-Referential / Loop Check
  if (feature && hasAnyDatum) {
    const referencedLabels: string[] = [];
    if (hasCompound) {
      const parts = fcf.datumReferences.compoundAxis!.split('-');
      referencedLabels.push(...parts.map((p) => p.trim()));
    }
    if (hasPrimary) referencedLabels.push(fcf.datumReferences.primary!.datumLabel);
    if (fcf.datumReferences.secondary?.datumLabel) referencedLabels.push(fcf.datumReferences.secondary.datumLabel);
    if (fcf.datumReferences.tertiary?.datumLabel) referencedLabels.push(fcf.datumReferences.tertiary.datumLabel);

    for (const label of referencedLabels) {
      const datumDef = datums.find((d) => d.label === label);
      if (datumDef && datumDef.featureId === feature.id) {
        errors.push(`Self-referential datum error: Feature "${feature.name}" cannot use Datum "${label}" because Datum "${label}" is derived from this exact feature.`);
      }
    }
  }

  // 6. Material Modifier Checks
  if (fcf.materialModifier === 'MMC' || fcf.materialModifier === 'LMC') {
    if (!meta.allowsMmc) {
      errors.push(`${meta.name} does not permit material condition modifier ${fcf.materialModifier} under ${meta.isoStandard} and ${meta.asmeStandard}. RFS is mandatory.`);
    }

    if (feature && !feature.isFeatureOfSize) {
      errors.push(`Material condition modifier ${fcf.materialModifier} can only be applied to a Feature of Size (e.g. cylinder diameter, keyway width). "${feature.name}" is a surface without size.`);
    }
  }

  // 7. Circular Runout Specific Checks
  if (fcf.characteristic === 'circular_runout') {
    if (fcf.zoneShape !== 'circular' && fcf.zoneShape !== 'planar') {
      errors.push(`Circular runout tolerance zone must be circular or planar radial, not ${fcf.zoneShape}.`);
    }
    // Check that referenced datum represents an axis of rotation
    if (hasCompound) {
      const parts = fcf.datumReferences.compoundAxis!.split('-').map((s) => s.trim());
      for (const p of parts) {
        const d = datums.find((x) => x.label === p);
        if (d && d.featureType !== 'cylinder') {
          warnings.push(`Datum ${p} in compound axis ${fcf.datumReferences.compoundAxis} is of type "${d.featureType}". Runout requires an axis of rotation.`);
        }
      }
    }
  }

  // 8. Standard System Specific Nuances
  if (fcf.standardSystem === 'ASME_Y14_5') {
    if (feature && feature.isFeatureOfSize && fcf.characteristic === 'straightness' && fcf.materialModifier === 'RFS') {
      warnings.push('Under ASME Y14.5 Rule #1, surface straightness is bounded by size limits at MMC unless an overriding note or modifier is specified.');
    }
  } else {
    // ISO GPS
    if (fcf.characteristic === 'straightness' && fcf.materialModifier === 'RFS') {
      warnings.push('Under ISO 8015 Independency Principle, size and form are independent unless the Envelope Requirement (E) is explicitly specified.');
    }
  }

  const formatted = formatFeatureControlFrameString(fcf);

  return {
    fcfId: fcf.id,
    isValid: errors.length === 0,
    errors,
    warnings,
    unsupportedRules,
    formattedFcfString: formatted,
    physicalConformanceStatus: 'unevaluated',
    conformanceDisclaimer:
      'Geometric definition syntax, datum reference frames, and modifier rules verified against standard specifications. Physical CMM conformance cannot be verified without physical inspection point cloud or dial indicator metrology data.',
  };
}

/**
 * Validates a complete set of Feature Control Frames against CAD features and Datums.
 */
export function validateAllFeatureControlFrames(
  fcfs: FeatureControlFrame[],
  features: CadFeature[],
  datums: DatumDefinition[]
): GdtValidationResult[] {
  return fcfs.map((fcf) => validateFeatureControlFrame(fcf, features, datums));
}
