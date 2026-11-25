import type { DesignParameters, Material } from '../../types';
import type { ManufacturingSpec } from './types';
import { computeShaftGeometryModel } from './drawingGeometry';

export function generateManufacturingSpec(
  params: DesignParameters,
  material: Material
): ManufacturingSpec {
  const geom = computeShaftGeometryModel(params);
  const densityKgM3 = material.density || 7850;

  // Mass calculations
  // Rough stock: Bar stock Ø(D + 6mm) x (L + 10mm)
  const roughDiaM = (geom.mainDia + 6) / 1000;
  const roughLenM = (geom.totalLength + 10) / 1000;
  const roughVolM3 = Math.PI * Math.pow(roughDiaM / 2, 2) * roughLenM;
  const roughWeightKg = Math.round(roughVolM3 * densityKgM3 * 100) / 100;

  // Finished shaft volume (stepped cylinders minus keyway)
  const journalDiaM = geom.journalDia / 1000;
  const journalLenM = geom.journalLength / 1000;
  const mainDiaM = geom.mainDia / 1000;
  const mainLenM = geom.mainLength / 1000;

  const vJournals = 2 * (Math.PI * Math.pow(journalDiaM / 2, 2) * journalLenM);
  const vMain = Math.PI * Math.pow(mainDiaM / 2, 2) * mainLenM;
  const vKeyway = (geom.keywayWidth / 1000) * (geom.keywayDepth / 1000) * (geom.keywayLength / 1000);
  const finishVolM3 = Math.max(0.0001, vJournals + vMain - vKeyway);
  const finishWeightKg = Math.round(finishVolM3 * densityKgM3 * 100) / 100;

  // Material condition & hardness heuristic
  let condition = material.condition || 'Quenched & Tempered (Q&T)';
  let hardness = '28 - 34 HRC (260 - 320 HB)';
  if (material.name.toLowerCase().includes('aluminum')) {
    condition = 'T6 Solution Treated & Artificially Aged';
    hardness = '95 - 105 HRB (120 - 140 HB)';
  } else if (material.name.toLowerCase().includes('stainless')) {
    condition = 'Annealed & Cold Finished';
    hardness = '20 - 25 HRC (215 - 240 HB)';
  } else if (material.name.toLowerCase().includes('1045') || material.name.toLowerCase().includes('carbon')) {
    condition = 'Normalized & Induction Hardened Seats';
    hardness = '22 - 26 HRC (Seats: 50 - 55 HRC)';
  }

  return {
    materialSpec: {
      name: material.name,
      standard: material.designation ? `UNS ${material.designation} / ISO 683-1` : 'ASTM A29 / ISO 683-1',
      condition,
      hardness,
      yieldStrengthMPa: material.yieldStrength,
      tensileStrengthMPa: material.tensileStrength,
    },
    overallDimensions: {
      diameterMm: geom.mainDia,
      lengthMm: geom.totalLength,
      roughWeightKg,
      finishWeightKg,
    },
    bearingSeats: [
      {
        journal: 'Left (Locating Support)',
        nominalDiaMm: geom.journalDia,
        fitClass: 'ISO k5',
        upperDevUm: 11,
        lowerDevUm: 2,
        surfaceFinishRa: 0.8,
        widthMm: geom.journalLength,
      },
      {
        journal: 'Right (Floating Support)',
        nominalDiaMm: geom.journalDia,
        fitClass: 'ISO k5',
        upperDevUm: 11,
        lowerDevUm: 2,
        surfaceFinishRa: 0.8,
        widthMm: geom.journalLength,
      },
    ],
    gearSeat: {
      nominalDiaMm: geom.mainDia,
      fitClass: 'ISO m5 (Light Press Fit)',
      upperDevUm: 15,
      lowerDevUm: 4,
      surfaceFinishRa: 1.6,
      widthMm: geom.gearWidth,
    },
    keyway: {
      standard: 'DIN 6885-1 (Parallel Key Form A)',
      form: 'Form A (Round Ends)',
      widthMm: geom.keywayWidth,
      fitClass: 'P9 (Tight Fit)',
      depthMm: geom.keywayDepth,
      lengthMm: geom.keywayLength,
      filletRadiusMm: 0.4,
    },
    gdtRequirements: [
      {
        feature: 'Bearing Seat Journals',
        characteristic: 'Total Radial Runout',
        symbol: '⌾',
        toleranceMm: 0.012,
        datumRef: 'A-B',
        note: 'Continuous rotation check against primary datum axis',
      },
      {
        feature: 'Main Shaft Body',
        characteristic: 'Cylindricity',
        symbol: '⌭',
        toleranceMm: 0.008,
        datumRef: '-',
        note: 'Full length envelope compliance',
      },
      {
        feature: 'Gear Shoulder Face',
        characteristic: 'Perpendicularity',
        symbol: '⊥',
        toleranceMm: 0.015,
        datumRef: 'A-B',
        note: 'Mounting face perpendicular to shaft rotation axis',
      },
    ],
    processRouting: [
      {
        step: 10,
        operation: 'Raw Material Blank Cut',
        machine: 'Band Saw CNC',
        description: `Cut cylindrical bar stock Ø${(geom.mainDia + 6).toFixed(0)} mm x ${(geom.totalLength + 10).toFixed(0)} mm with +3mm machining allowance.`,
      },
      {
        step: 20,
        operation: 'Rough Turning & Facing',
        machine: 'CNC Turning Center',
        description: 'Face ends, center drill both sides, rough turn stepped journals leaving 0.5 mm grinding allowance.',
      },
      {
        step: 30,
        operation: 'Thermal Heat Treatment',
        machine: 'Quench & Temper Furnace',
        description: `Heat treat to specified hardness ${hardness}. Relieve internal stresses.`,
      },
      {
        step: 40,
        operation: 'Finish Turning & Grooving',
        machine: 'CNC Lathe (Twin Spindle)',
        description: `Turn gear seating shoulder (Ra 1.6 µm), finish chamfers (1.5 x 45°), and machine transition fillets (R ${geom.filletRadius} mm).`,
      },
      {
        step: 50,
        operation: 'Keyway Slot Milling',
        machine: 'Vertical CNC Machining Center (4-Axis)',
        description: `Mill DIN 6885-1 Form A slot (width ${geom.keywayWidth.toFixed(1)} P9 mm, depth ${geom.keywayDepth.toFixed(1)} mm, length ${geom.keywayLength.toFixed(1)} mm).`,
      },
      {
        step: 60,
        operation: 'Precision Cylindrical Grinding',
        machine: 'CNC Cylindrical Grinder',
        description: `Grind left and right bearing journals to Ø${geom.journalDia.toFixed(2)} k5 (+0.011/+0.002 mm), achieving mirror finish Ra 0.8 µm.`,
      },
    ],
    generalNotes: [
      '1. General tolerances according to ISO 2768-mK unless otherwise specified.',
      '2. Remove all sharp edges and burrs; break sharp corners 0.2 - 0.4 mm.',
      '3. 100% magnetic particle or dye penetrant inspection required on transition fillets.',
      '4. Mark drawing number and heat lot number on right shaft face with laser etching.',
      '5. Protective coating: apply rust preventative oil before packaging.',
    ],
  };
}
