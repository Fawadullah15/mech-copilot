import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractCadFeaturesFromDesign,
  getDefaultDatums,
  getDefaultFeatureControlFrames,
  importCadFile,
} from '../gdt/cadAdapter';
import {
  formatFeatureControlFrameString,
  validateFeatureControlFrame,
  validateAllFeatureControlFrames,
  CHARACTERISTIC_METADATA,
} from '../gdt/validator';
import {
  CadFeature,
  DatumDefinition,
  FeatureControlFrame,
} from '../gdt/types';
import { getStandardById } from '../../standards/registry';

describe('GD&T and CAD Geometry Integration Verification (Stage 06)', () => {
  const mockDesignParams = {
    materialId: 'steel-4140',
    diameter: 45, // mm
    length: 320,  // mm
    torque: 400,  // Nm
    force: 2500,  // N
    rpm: 1800,
    safetyFactor: 2.0,
    temperature: 45,
  };

  describe('CAD Geometry Normalization Engine', () => {
    test('extracts 5 standard stepped shaft functional features from design parameters', () => {
      const features = extractCadFeaturesFromDesign(mockDesignParams);
      assert.equal(features.length, 5);

      const journalLeft = features.find((f) => f.id === 'feat-journal-left')!;
      assert.ok(journalLeft, 'Journal left exists');
      assert.equal(journalLeft.type, 'cylinder');
      assert.equal(journalLeft.nominalDimensionMm, 40.5); // 45 * 0.9
      assert.equal(journalLeft.isFeatureOfSize, true);
      assert.deepEqual(journalLeft.sizeToleranceMm, { upper: 0.0, lower: -0.016 });

      const shaftBody = features.find((f) => f.id === 'feat-shaft-body')!;
      assert.ok(shaftBody, 'Shaft body exists');
      assert.equal(shaftBody.type, 'cylinder');
      assert.equal(shaftBody.nominalDimensionMm, 45);
      assert.equal(shaftBody.isFeatureOfSize, true);

      const shoulder = features.find((f) => f.id === 'feat-gear-shoulder')!;
      assert.ok(shoulder, 'Gear shoulder exists');
      assert.equal(shoulder.type, 'plane');
      assert.equal(shoulder.isFeatureOfSize, false);

      const keyway = features.find((f) => f.id === 'feat-keyway')!;
      assert.ok(keyway, 'Keyway slot exists');
      assert.equal(keyway.type, 'slot');
      assert.equal(keyway.nominalDimensionMm, 14); // DIN 6885-1 for 45mm shaft
      assert.equal(keyway.isFeatureOfSize, true);
    });

    test('establishes functional datum reference frames (A, B, C)', () => {
      const features = extractCadFeaturesFromDesign(mockDesignParams);
      const datums = getDefaultDatums(features);

      assert.equal(datums.length, 3);
      const datumA = datums.find((d) => d.label === 'A')!;
      assert.equal(datumA.featureType, 'cylinder');
      assert.ok(datumA.degreesOfFreedomConstrained.includes('Tx'));
      assert.ok(datumA.degreesOfFreedomConstrained.includes('Rx'));

      const datumC = datums.find((d) => d.label === 'C')!;
      assert.equal(datumC.featureType, 'plane');
      assert.ok(datumC.degreesOfFreedomConstrained.includes('Tz'));
    });

    test('generates baseline valid shaft Feature Control Frames', () => {
      const features = extractCadFeaturesFromDesign(mockDesignParams);
      const datums = getDefaultDatums(features);
      const fcfs = getDefaultFeatureControlFrames(features, datums, 'ISO_GPS');

      assert.ok(fcfs.length >= 4);
      const results = validateAllFeatureControlFrames(fcfs, features, datums);
      for (const res of results) {
        assert.equal(res.isValid, true, `Expected FCF ${res.fcfId} to be valid: ${res.errors.join(', ')}`);
      }
    });

    test('importCadFile rejects STEP and IGES files with clear technical boundary diagnostics', () => {
      const stepResult = importCadFile({ name: 'transmission_shaft.step', content: 'ISO-10303-21;' });
      assert.equal(stepResult.success, false);
      assert.equal(stepResult.code, 'UNSUPPORTED_CAD_BREP');
      assert.ok(stepResult.error?.includes('OpenCASCADE'));

      const igesResult = importCadFile({ name: 'shaft.iges', content: 'S      1' });
      assert.equal(igesResult.success, false);
      assert.equal(igesResult.code, 'UNSUPPORTED_CAD_BREP');
    });

    test('importCadFile parses valid JSON feature model arrays', () => {
      const sampleJson = JSON.stringify({
        features: [
          {
            id: 'custom-flange',
            name: 'Coupling Flange',
            type: 'cylinder',
            nominalDimensionMm: 80,
            isFeatureOfSize: true,
            description: 'Torque coupling flange',
          },
        ],
      });
      const jsonResult = importCadFile({ name: 'features.json', content: sampleJson });
      assert.equal(jsonResult.success, true);
      assert.equal(jsonResult.features?.length, 1);
      assert.equal(jsonResult.features?.[0].id, 'custom-flange');
    });
  });

  describe('Feature Control Frame Formatter & Metadata', () => {
    test('formats standardized ASCII/Unicode FCF callout strings', () => {
      // Perpendicularity with cylindrical zone
      const fcf1: FeatureControlFrame = {
        id: 'f1',
        featureId: 'feat-journal-left',
        characteristic: 'perpendicularity',
        toleranceValueMm: 0.02,
        zoneShape: 'cylindrical',
        materialModifier: 'RFS',
        datumReferences: {
          primary: { datumLabel: 'A' },
          secondary: { datumLabel: 'B' },
        },
        standardSystem: 'ISO_GPS',
      };
      assert.equal(formatFeatureControlFrameString(fcf1), '[ ⟂ | ⌀0.02 | A | B ]');

      // Circular runout with compound axis A-B
      const fcf2: FeatureControlFrame = {
        id: 'f2',
        featureId: 'feat-shaft-body',
        characteristic: 'circular_runout',
        toleranceValueMm: 0.03,
        zoneShape: 'circular',
        materialModifier: 'RFS',
        datumReferences: {
          compoundAxis: 'A-B',
        },
        standardSystem: 'ISO_GPS',
      };
      assert.equal(formatFeatureControlFrameString(fcf2), '[ ↗ | 0.03 | A-B ]');

      // Position with MMC modifier
      const fcf3: FeatureControlFrame = {
        id: 'f3',
        featureId: 'feat-keyway',
        characteristic: 'position',
        toleranceValueMm: 0.05,
        zoneShape: 'planar',
        materialModifier: 'MMC',
        datumReferences: {
          compoundAxis: 'A-B',
          tertiary: { datumLabel: 'C' },
        },
        standardSystem: 'ASME_Y14_5',
      };
      assert.equal(formatFeatureControlFrameString(fcf3), '[ ⌖ | 0.05 Ⓜ | A-B | C ]');

      // Form straightness with no datums
      const fcf4: FeatureControlFrame = {
        id: 'f4',
        featureId: 'feat-journal-left',
        characteristic: 'straightness',
        toleranceValueMm: 0.008,
        zoneShape: 'cylindrical',
        materialModifier: 'RFS',
        datumReferences: {},
        standardSystem: 'ISO_GPS',
      };
      assert.equal(formatFeatureControlFrameString(fcf4), '[ — | ⌀0.008 ]');
    });

    test('characteristic metadata defines rules for all 6 core shaft characteristics', () => {
      const chars = ['straightness', 'flatness', 'perpendicularity', 'parallelism', 'position', 'circular_runout'] as const;
      for (const c of chars) {
        const meta = CHARACTERISTIC_METADATA[c];
        assert.ok(meta, `Metadata exists for ${c}`);
        assert.ok(meta.symbol.length > 0);
        assert.ok(meta.isoStandard.includes('ISO 1101'));
        assert.ok(meta.asmeStandard.includes('ASME Y14.5'));
      }
    });
  });

  describe('GD&T Standards Validation Logic', () => {
    const features = extractCadFeaturesFromDesign(mockDesignParams);
    const datums = getDefaultDatums(features);

    test('validates conformant FCFs successfully', () => {
      const validFcf: FeatureControlFrame = {
        id: 'val-1',
        featureId: 'feat-shaft-body',
        characteristic: 'circular_runout',
        toleranceValueMm: 0.03,
        zoneShape: 'circular',
        materialModifier: 'RFS',
        datumReferences: { compoundAxis: 'A-B' },
        standardSystem: 'ISO_GPS',
      };

      const result = validateFeatureControlFrame(validFcf, features, datums);
      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
      assert.equal(result.physicalConformanceStatus, 'unevaluated');
      assert.ok(result.conformanceDisclaimer.includes('Physical CMM conformance cannot be verified'));
    });

    test('flags error when form tolerance (flatness, straightness) references datums', () => {
      const invalidFlatness: FeatureControlFrame = {
        id: 'err-1',
        featureId: 'feat-gear-shoulder',
        characteristic: 'flatness',
        toleranceValueMm: 0.015,
        zoneShape: 'planar',
        materialModifier: 'RFS',
        datumReferences: { primary: { datumLabel: 'A' } }, // ILLEGAL
        standardSystem: 'ISO_GPS',
      };

      const result = validateFeatureControlFrame(invalidFlatness, features, datums);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('form tolerance') && e.includes('must NOT reference any datums')));
    });

    test('flags error when orientation/location tolerance omits required datums', () => {
      const missingDatum: FeatureControlFrame = {
        id: 'err-2',
        featureId: 'feat-gear-shoulder',
        characteristic: 'perpendicularity',
        toleranceValueMm: 0.02,
        zoneShape: 'planar',
        materialModifier: 'RFS',
        datumReferences: {}, // ILLEGAL: Perpendicularity requires at least 1 datum
        standardSystem: 'ISO_GPS',
      };

      const result = validateFeatureControlFrame(missingDatum, features, datums);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('MUST reference at least one primary datum')));
    });

    test('flags error on self-referential datum loops', () => {
      const selfReferencing: FeatureControlFrame = {
        id: 'err-3',
        featureId: 'feat-journal-left', // Datum A is derived from this feature!
        characteristic: 'perpendicularity',
        toleranceValueMm: 0.02,
        zoneShape: 'cylindrical',
        materialModifier: 'RFS',
        datumReferences: { primary: { datumLabel: 'A' } }, // Self-reference loop
        standardSystem: 'ISO_GPS',
      };

      const result = validateFeatureControlFrame(selfReferencing, features, datums);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('Self-referential datum error')));
    });

    test('flags error when MMC is applied to runout tolerance', () => {
      const illegalRunoutMmc: FeatureControlFrame = {
        id: 'err-4',
        featureId: 'feat-shaft-body',
        characteristic: 'circular_runout',
        toleranceValueMm: 0.03,
        zoneShape: 'circular',
        materialModifier: 'MMC', // ILLEGAL per ISO 1101 and ASME Y14.5
        datumReferences: { compoundAxis: 'A-B' },
        standardSystem: 'ISO_GPS',
      };

      const result = validateFeatureControlFrame(illegalRunoutMmc, features, datums);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('does not permit material condition modifier MMC')));
    });

    test('flags error when cylindrical zone is applied to planar feature', () => {
      const illegalCylinderZone: FeatureControlFrame = {
        id: 'err-5',
        featureId: 'feat-gear-shoulder', // planar surface
        characteristic: 'perpendicularity',
        toleranceValueMm: 0.02,
        zoneShape: 'cylindrical', // ILLEGAL on a plane
        materialModifier: 'RFS',
        datumReferences: { compoundAxis: 'A-B' },
        standardSystem: 'ISO_GPS',
      };

      const result = validateFeatureControlFrame(illegalCylinderZone, features, datums);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('Cannot apply cylindrical (⌀) tolerance zone to planar feature')));
    });

    test('flags error when MMC is applied to non-feature of size', () => {
      const illegalMmcSurface: FeatureControlFrame = {
        id: 'err-6',
        featureId: 'feat-gear-shoulder', // planar shoulder without opposing surface
        characteristic: 'perpendicularity',
        toleranceValueMm: 0.02,
        zoneShape: 'planar',
        materialModifier: 'MMC', // ILLEGAL: shoulder is a surface without size
        datumReferences: { compoundAxis: 'A-B' },
        standardSystem: 'ISO_GPS',
      };

      const result = validateFeatureControlFrame(illegalMmcSurface, features, datums);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('can only be applied to a Feature of Size')));
    });

    test('flags error on zero or negative tolerance value', () => {
      const zeroTol: FeatureControlFrame = {
        id: 'err-7',
        featureId: 'feat-shaft-body',
        characteristic: 'circular_runout',
        toleranceValueMm: -0.01,
        zoneShape: 'circular',
        materialModifier: 'RFS',
        datumReferences: { compoundAxis: 'A-B' },
        standardSystem: 'ISO_GPS',
      };

      const result = validateFeatureControlFrame(zeroTol, features, datums);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.some((e) => e.includes('Tolerance value must be a positive number')));
    });
  });

  describe('Standards Registry GD&T Specifications', () => {
    test('registers ISO 1101:2017 with active and verified status', () => {
      const std = getStandardById('iso-1101');
      assert.ok(std, 'ISO 1101 registered');
      assert.equal(std.organization, 'ISO');
      assert.equal(std.status, 'active');
      assert.equal(std.verificationStatus, 'verified');
      assert.ok(std.supportedCalculations.includes('gdtValidation'));
      assert.ok(std.assumptions.some((a) => a.includes('Independency principle')));
      assert.ok(std.limitations.some((l) => l.includes('Verified subset in Stage 06')));
    });

    test('registers ISO 5459:2011 with historical status and notes 2024 supersession', () => {
      const std = getStandardById('iso-5459');
      assert.ok(std, 'ISO 5459 registered');
      assert.equal(std.organization, 'ISO');
      assert.equal(std.status, 'historical');
      assert.equal(std.verificationStatus, 'verified');
      assert.ok(std.edition.includes('2024'));
      assert.ok(std.supportedCalculations.includes('datumReferenceFrame'));

      const std2024 = getStandardById('iso-5459-2024');
      assert.ok(std2024, 'ISO 5459:2024 registered');
      assert.equal(std2024.status, 'active');
    });

    test('registers ASME Y14.5-2018 with active and verified status', () => {
      const std = getStandardById('asme-y14-5');
      assert.ok(std, 'ASME Y14.5 registered');
      assert.equal(std.organization, 'ASME');
      assert.equal(std.status, 'active');
      assert.equal(std.verificationStatus, 'verified');
      assert.ok(std.supportedCalculations.includes('gdtValidation'));
      assert.ok(std.assumptions.some((a) => a.includes('Rule #1')));
    });
  });
});
