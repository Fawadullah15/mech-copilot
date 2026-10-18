import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSteppedShaftStressConcentration,
  calculateKeywayStressConcentration,
} from '../fatigue/stressConcentration';
import {
  calculatePetersonMaterialConstant,
  calculateNotchSensitivity,
} from '../fatigue/notchSensitivity';
import {
  FATIGUE_MATERIALS_DATABASE,
  getMaterialFatigueData,
  fitBasquinModel,
  evaluateStressLife,
} from '../fatigue/fatigueData';
import {
  calculateSurfaceFactor,
  calculateSizeFactor,
  calculateLoadingFactor,
  calculateTemperatureFactor,
  calculateReliabilityFactor,
  calculateMarinFactors,
} from '../fatigue/marinFactors';
import { evaluateFatigueLife } from '../fatigue/fatigueEvaluation';
import { getStandardById } from '../../standards/registry';

describe('Stage 07: Stress Concentrations, Notch Sensitivity & Dynamic Fatigue S-N Verification', () => {
  describe('1. Elastic Stress Concentration Engine (Peterson & Shigley)', () => {
    test('Independent Benchmark 1: Stepped shaft in bending (D/d = 1.20, r/d = 0.10)', () => {
      // Peterson / Shigley Table A-15-9 benchmark:
      // For D/d = 1.20: A = 0.97098, b = -0.21796
      // Kt = 0.97098 * (0.10)^(-0.21796) = 0.97098 * 1.6518 ~ 1.604
      const result = calculateSteppedShaftStressConcentration(
        {
          smallDiameterMm: 50,
          largeDiameterMm: 60, // D/d = 1.20
          filletRadiusMm: 5,   // r/d = 0.10
          dProvenance: 'imported',
          DProvenance: 'user-entered',
          rProvenance: 'user-entered',
        },
        'bending'
      );

      assert.equal(result.isSupported, true);
      assert.ok(Math.abs(result.kt - 1.604) < 0.05, `Expected Kt ~ 1.604, got ${result.kt}`);
      assert.equal(result.DOverD, 1.2);
      assert.equal(result.rOverD, 0.1);
    });

    test('Independent Benchmark 2: Stepped shaft in torsion (D/d = 1.20, r/d = 0.10)', () => {
      // Peterson / Shigley Table A-15-8 benchmark:
      // For D/d = 1.20: A = 0.84634, b = -0.23974
      // Kts = 0.84634 * (0.10)^(-0.23974) = 0.84634 * 1.7368 ~ 1.470
      const result = calculateSteppedShaftStressConcentration(
        {
          smallDiameterMm: 50,
          largeDiameterMm: 60,
          filletRadiusMm: 5,
          dProvenance: 'imported',
          DProvenance: 'user-entered',
          rProvenance: 'user-entered',
        },
        'torsion'
      );

      assert.equal(result.isSupported, true);
      assert.ok(Math.abs(result.kts - 1.470) < 0.05, `Expected Kts ~ 1.470, got ${result.kts}`);
    });

    test('Benchmark 3: Keyway stress concentrations (profile vs sled-runner)', () => {
      const profileResult = calculateKeywayStressConcentration({
        shaftDiameterMm: 45,
        keywayWidthMm: 12,
        keywayDepthMm: 5,
        filletRadiusMm: 0.9, // r_k/d = 0.02
        keywayType: 'profile_keyway',
        provenance: 'calculated',
      });
      assert.equal(profileResult.isSupported, true);
      assert.equal(profileResult.kt, 2.14);
      assert.equal(profileResult.kts, 3.00);

      const sledResult = calculateKeywayStressConcentration({
        shaftDiameterMm: 45,
        keywayWidthMm: 12,
        keywayDepthMm: 5,
        filletRadiusMm: 0.9,
        keywayType: 'sled_runner_keyway',
        provenance: 'calculated',
      });
      assert.equal(sledResult.isSupported, true);
      assert.equal(sledResult.kt, 1.70);
      assert.equal(sledResult.kts, 2.40);
    });

    test('rejects out-of-range geometry without silent extrapolation', () => {
      // D/d = 4.0 (exceeds validated domain max 3.0)
      const outOfRangeD = calculateSteppedShaftStressConcentration({
        smallDiameterMm: 20,
        largeDiameterMm: 80, // D/d = 4.0
        filletRadiusMm: 2.0,
        dProvenance: 'user-entered',
        DProvenance: 'user-entered',
        rProvenance: 'user-entered',
      });
      assert.equal(outOfRangeD.isSupported, false);
      assert.ok(outOfRangeD.outOfRangeReason?.includes('outside validated domain'));

      // r/d = 0.005 (too sharp, below 0.02)
      const sharpFillet = calculateSteppedShaftStressConcentration({
        smallDiameterMm: 50,
        largeDiameterMm: 60,
        filletRadiusMm: 0.25, // r/d = 0.005
        dProvenance: 'user-entered',
        DProvenance: 'user-entered',
        rProvenance: 'user-entered',
      });
      assert.equal(sharpFillet.isSupported, false);
      assert.ok(sharpFillet.outOfRangeReason?.includes('outside validated domain'));

      // Inverted diameters D < d
      const inverted = calculateSteppedShaftStressConcentration({
        smallDiameterMm: 60,
        largeDiameterMm: 40,
        filletRadiusMm: 2.0,
        dProvenance: 'user-entered',
        DProvenance: 'user-entered',
        rProvenance: 'user-entered',
      });
      assert.equal(inverted.isSupported, false);
      assert.ok(inverted.outOfRangeReason?.includes('must be greater than or equal'));
    });
  });

  describe('2. Notch Sensitivity & Fatigue Concentration Factors (Peterson Model)', () => {
    test('calculates Peterson constant "a" and notch sensitivity "q" for alloy steel (AISI 4140, Sut = 1020 MPa)', () => {
      // a = 0.0254 * (2070 / 1020)^1.8 mm
      // 2070 / 1020 = 2.0294 => 2.0294^1.8 ~ 3.585 => a ~ 0.091 mm
      const { a } = calculatePetersonMaterialConstant(1020, 'Alloy Steel');
      assert.ok(Math.abs(a - 0.091) < 0.015, `Expected a ~ 0.091 mm, got ${a}`);

      // With notch radius r = 2.5 mm:
      // q = 1 / (1 + 0.091 / 2.5) = 1 / (1 + 0.0364) ~ 0.965
      // With Kt = 1.60:
      // Kf = 1 + 0.965 * (1.60 - 1.0) = 1 + 0.579 = 1.579 ~ 1.58
      const sens = calculateNotchSensitivity(1.60, 1.47, 2.5, 1020, 'Alloy Steel');
      assert.ok(Math.abs(sens.q - 0.965) < 0.02, `Expected q ~ 0.965, got ${sens.q}`);
      assert.ok(Math.abs(sens.kf - 1.58) < 0.03, `Expected Kf ~ 1.58, got ${sens.kf}`);
      assert.ok(sens.kf < 1.60, 'Kf must be less than or equal to Kt');
    });

    test('correctly evaluates aluminum alloy notch sensitivity model', () => {
      // Aluminum 6061-T6 (Sut = 310 MPa):
      // a = 0.0254 * (345 / 310)^2 ~ 0.0314 mm
      const { a } = calculatePetersonMaterialConstant(310, 'Aluminum Alloy');
      assert.ok(Math.abs(a - 0.0315) < 0.01, `Expected a ~ 0.0315 mm, got ${a}`);
    });

    test('validates limiting cases of notch sensitivity', () => {
      // Case A: Large unnotched radius (r -> infinity => q -> 1 => Kf -> Kt)
      const largeRadius = calculateNotchSensitivity(2.0, 1.8, 1000.0, 800, 'steel');
      assert.ok(Math.abs(largeRadius.q - 1.0) < 0.01);
      assert.ok(Math.abs(largeRadius.kf - 2.0) < 0.02);

      // Case B: Kt = 1.0 (smooth unnotched bar) => Kf must be exactly 1.0
      const smooth = calculateNotchSensitivity(1.0, 1.0, 2.0, 800, 'steel');
      assert.equal(smooth.kf, 1.0);
      assert.equal(smooth.kfs, 1.0);
    });

    test('rejects non-positive notch radius or Sut gracefully', () => {
      const invalidRadius = calculateNotchSensitivity(2.0, 1.8, 0.0, 800, 'steel');
      assert.equal(invalidRadius.kf, 1.0);
      assert.equal(invalidRadius.q, 0.0);
    });
  });

  describe('3. Material Fatigue Intelligence & S-N Fitting', () => {
    test('all 10 catalog materials have condition-specific fatigue definitions', () => {
      const materialIds = [
        'aisi-4140',
        'aisi-1045',
        'al-6061-t6',
        'ti-grade-5',
        'aisi-4340',
        'ss-304',
        'inconel-718',
        'bronze-c932',
        'ss-316',
        'al-7075-t6',
      ];

      for (const id of materialIds) {
        const mat = getMaterialFatigueData(id);
        assert.ok(mat, `Material fatigue data exists for ${id}`);
        assert.ok(mat.unmodifiedEnduranceLimitMpa > 0);
        assert.ok(mat.basquinA > 0);
        assert.ok(mat.basquinB < 0);
        assert.ok(mat.snPoints.length >= 3);
      }
    });

    test('strictly preserves metallurgical reality: Aluminum alloys have NO endurance plateau', () => {
      const al6061 = getMaterialFatigueData('al-6061-t6')!;
      assert.equal(al6061.hasEndurancePlateau, false, 'Al 6061-T6 must not have an endurance plateau');
      assert.equal(al6061.enduranceCycles, 5e8);

      const al7075 = getMaterialFatigueData('al-7075-t6')!;
      assert.equal(al7075.hasEndurancePlateau, false, 'Al 7075-T6 must not have an endurance plateau');

      const steel4140 = getMaterialFatigueData('aisi-4140')!;
      assert.equal(steel4140.hasEndurancePlateau, true, 'AISI 4140 must exhibit a steel endurance plateau');
      assert.equal(steel4140.enduranceCycles, 1e6);
    });

    test('fits Basquin power-law model Sa = A * N^b from experimental data', () => {
      // Synthetic data following Sa = 1200 * N^(-0.09)
      const samplePoints = [
        { cycles: 1e3, stressMpa: 1200 * Math.pow(1e3, -0.09) },
        { cycles: 1e4, stressMpa: 1200 * Math.pow(1e4, -0.09) },
        { cycles: 1e5, stressMpa: 1200 * Math.pow(1e5, -0.09) },
        { cycles: 1e6, stressMpa: 1200 * Math.pow(1e6, -0.09) },
      ];

      const fit = fitBasquinModel(samplePoints);
      assert.equal(fit.success, true);
      assert.ok(Math.abs(fit.basquinA - 1200) < 5.0, `Expected A ~ 1200, got ${fit.basquinA}`);
      assert.ok(Math.abs(fit.basquinB - -0.09) < 0.005, `Expected b ~ -0.09, got ${fit.basquinB}`);
      assert.ok(fit.rSquared >= 0.99);
    });

    test('rejects degenerate or invalid S-N datasets for fitting', () => {
      const singlePoint = [{ cycles: 1e5, stressMpa: 400 }];
      const fitSingle = fitBasquinModel(singlePoint);
      assert.equal(fitSingle.success, false);

      const zeroCycles = [
        { cycles: 0, stressMpa: 400 },
        { cycles: 1e5, stressMpa: 300 },
      ];
      const fitZero = fitBasquinModel(zeroCycles);
      assert.equal(fitZero.success, false);
    });
  });

  describe('4. Marin Endurance Limit Modifiers', () => {
    test('calculates individual Marin correction factors accurately', () => {
      // Surface finish: Machined bar, Sut = 1020 MPa
      // ka = 4.51 * (1020)^(-0.265) = 4.51 * 0.1601 ~ 0.722
      const ka = calculateSurfaceFactor('machined', 1020);
      assert.ok(Math.abs(ka - 0.722) < 0.02, `Expected ka ~ 0.722, got ${ka}`);

      // Size factor: d = 50 mm in rotating bending
      // kb = 1.24 * (50)^(-0.107) = 1.24 * 0.6582 ~ 0.816
      const kb = calculateSizeFactor(50, 'bending');
      assert.ok(Math.abs(kb - 0.816) < 0.02, `Expected kb ~ 0.816, got ${kb}`);

      // Loading factor: Torsion
      const kcTorsion = calculateLoadingFactor('torsion');
      assert.equal(kcTorsion, 0.59);

      // Temperature factor: Room temperature 20°C
      const { kd } = calculateTemperatureFactor(20);
      assert.equal(kd, 1.0);

      // Reliability factor: 90%
      const ke90 = calculateReliabilityFactor(90);
      assert.equal(ke90, 0.897);
    });

    test('computes composite modified endurance limit Se for shaft', () => {
      // S'e = 510 MPa, Sut = 1020 MPa, d = 45 mm, machined, bending, 90% rel, 20°C
      const result = calculateMarinFactors({
        unmodifiedEnduranceLimitMpa: 510,
        sutMpa: 1020,
        diameterMm: 45,
        surfaceFinish: 'machined',
        loadingMode: 'bending',
        operatingTempC: 20,
        reliabilityPercent: 90,
      });

      assert.ok(result.ka > 0.65 && result.ka < 0.80);
      assert.ok(result.kb > 0.80 && result.kb < 0.86);
      assert.equal(result.kc, 1.0);
      assert.equal(result.kd, 1.0);
      assert.equal(result.ke, 0.897);

      // Se = ka * kb * kc * kd * ke * S'e ~ 0.722 * 0.825 * 1.0 * 1.0 * 0.897 * 510 ~ 272 MPa
      assert.ok(
        result.modifiedEnduranceLimitMpa > 250 && result.modifiedEnduranceLimitMpa < 300,
        `Expected Se ~ 272 MPa, got ${result.modifiedEnduranceLimitMpa}`
      );
    });
  });

  describe('5. Cyclic Loading & Mean-Stress Criteria', () => {
    const mat4140 = getMaterialFatigueData('aisi-4140')!;
    const Se = 270; // MPa

    test('evaluates Modified Goodman criterion under tensile mean stress', () => {
      // Case A: Below endurance limit (sigma_rev = 186.6 <= Se = 270 MPa) => Infinite life
      const resultInfinite = evaluateFatigueLife({
        nominalAlternatingStressMpa: 100,
        nominalMeanStressMpa: 200,
        kf: 1.5,
        modifiedEnduranceLimitMpa: Se,
        material: mat4140,
        criterion: 'goodman',
      });

      assert.ok(Math.abs(resultInfinite.fatigueSafetyFactor - 1.33) < 0.05, `Expected nf ~ 1.33, got ${resultInfinite.fatigueSafetyFactor}`);
      assert.equal(resultInfinite.isInfiniteLife, true);
      assert.equal(resultInfinite.estimatedCycles, 'infinite');

      // Case B: Above endurance limit (peakAlt = 330 MPa > Se = 270 MPa) => Finite life
      const resultFinite = evaluateFatigueLife({
        nominalAlternatingStressMpa: 220,
        nominalMeanStressMpa: 200,
        kf: 1.5, // peakAlt = 330 MPa
        modifiedEnduranceLimitMpa: Se,
        material: mat4140,
        criterion: 'goodman',
      });

      assert.ok(resultFinite.fatigueSafetyFactor < 1.0);
      assert.equal(resultFinite.isInfiniteLife, false);
      assert.equal(typeof resultFinite.estimatedCycles, 'number');
    });

    test('Gerber criterion produces less conservative safety factor than Goodman', () => {
      const goodman = evaluateFatigueLife({
        nominalAlternatingStressMpa: 100,
        nominalMeanStressMpa: 200,
        kf: 1.5,
        modifiedEnduranceLimitMpa: Se,
        material: mat4140,
        criterion: 'goodman',
      });

      const gerber = evaluateFatigueLife({
        nominalAlternatingStressMpa: 100,
        nominalMeanStressMpa: 200,
        kf: 1.5,
        modifiedEnduranceLimitMpa: Se,
        material: mat4140,
        criterion: 'gerber',
      });

      assert.ok(
        gerber.fatigueSafetyFactor > goodman.fatigueSafetyFactor,
        `Gerber (${gerber.fatigueSafetyFactor}) must be greater than Goodman (${goodman.fatigueSafetyFactor})`
      );
    });

    test('compressive mean stress does not reduce fatigue safety factor', () => {
      // sigma_m = -150 MPa (compressive). Effective fatigue limit governed strictly by Se / sigma_a
      const result = evaluateFatigueLife({
        nominalAlternatingStressMpa: 100,
        nominalMeanStressMpa: -150,
        kf: 1.0,
        modifiedEnduranceLimitMpa: Se,
        material: mat4140,
        criterion: 'goodman',
      });

      // nf = Se / sigma_a = 270 / 100 = 2.70
      assert.equal(result.fatigueSafetyFactor, 2.7);
    });

    test('detects first-cycle static yield failure when max stress exceeds Sy', () => {
      // Sy = 655 MPa. Max stress = 500 + 300 = 800 MPa > Sy
      const result = evaluateFatigueLife({
        nominalAlternatingStressMpa: 300,
        nominalMeanStressMpa: 500,
        kf: 1.0,
        modifiedEnduranceLimitMpa: Se,
        material: mat4140,
        criterion: 'goodman',
      });

      assert.ok(result.staticYieldSafetyFactor < 1.0);
      assert.equal(result.governingFailureMode, 'static_yield');
      assert.ok(result.warnings.some((w) => w.includes('First-cycle static yield failure')));
    });

    test('flags low-cycle fatigue (LCF) when life N < 1000 cycles', () => {
      // Very high alternating stress: peak = 1050 MPa > 0.9*Sut (918 MPa) => N < 1000 cycles
      const result = evaluateFatigueLife({
        nominalAlternatingStressMpa: 700,
        nominalMeanStressMpa: 0,
        kf: 1.5, // peak = 1050 MPa
        modifiedEnduranceLimitMpa: Se,
        material: mat4140,
        criterion: 'goodman',
      });

      assert.equal(result.estimatedCycles, 'lcf_out_of_domain');
      assert.ok(result.warnings.some((w) => w.includes('Low-Cycle Fatigue')));
    });
  });

  describe('6. Standards Registry Fatigue Traceability & Updates', () => {
    test('records ISO 5459:2011 as historical and notes supersession by ISO 5459:2024', () => {
      const std2011 = getStandardById('iso-5459');
      assert.ok(std2011, 'ISO 5459:2011 exists');
      assert.equal(std2011.status, 'historical');
      assert.ok(std2011.edition.includes('2024'));

      const std2024 = getStandardById('iso-5459-2024');
      assert.ok(std2024, 'ISO 5459:2024 exists');
      assert.equal(std2024.status, 'active');
    });

    test('registers ISO 1099, ISO 12107, and ASTM E466 with verified laboratory test status', () => {
      const iso1099 = getStandardById('iso-1099');
      assert.ok(iso1099);
      assert.equal(iso1099.status, 'active');
      assert.equal(iso1099.verificationStatus, 'verified');
      assert.ok(iso1099.limitations.some((l) => l.includes('specimen testing methodology only')));

      const iso12107 = getStandardById('iso-12107');
      assert.ok(iso12107);
      assert.equal(iso12107.status, 'active');
      assert.ok(iso12107.supportedCalculations.includes('basquinRegression'));

      const astmE466 = getStandardById('astm-e466');
      assert.ok(astmE466);
      assert.equal(astmE466.status, 'active');
    });

    test('records ASTM E739 publication status as withdrawn (2024)', () => {
      const astmE739 = getStandardById('astm-e739');
      assert.ok(astmE739);
      assert.equal(astmE739.status, 'withdrawn');
      assert.equal(astmE739.verificationStatus, 'unverified');
    });
  });
});
