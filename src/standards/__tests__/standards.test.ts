import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  STANDARDS_REGISTRY,
  getAllStandards,
  getStandardById,
  getVerifiedStandards,
  getReferenceOnlyStandards,
  getStandardsByCalculation,
  filterStandards
} from '../registry';

describe('Standards Registry Integrity & Traceability Tests', () => {
  test('every standard record has valid schema fields and substantiated references', () => {
    const all = getAllStandards();
    assert.ok(all.length >= 8, 'Expected at least 8 standards in registry');

    const validOrgs = ['ISO', 'ASME', 'DIN', 'AGMA', 'ASTM'];
    const validStatuses = ['active', 'withdrawn', 'historical', 'unknown'];
    const validVerifStatuses = ['verified', 'draft', 'unverified'];

    for (const std of all) {
      assert.ok(std.id && typeof std.id === 'string', `Invalid id: ${std.id}`);
      assert.ok(std.code && typeof std.code === 'string', `Invalid code for ${std.id}`);
      assert.ok(std.title && typeof std.title === 'string', `Invalid title for ${std.id}`);
      assert.ok(validOrgs.includes(std.organization), `Invalid org for ${std.id}: ${std.organization}`);
      assert.ok(std.edition && typeof std.edition === 'string', `Invalid edition for ${std.id}`);
      assert.ok(validStatuses.includes(std.status), `Invalid status for ${std.id}: ${std.status}`);
      assert.ok(validVerifStatuses.includes(std.verificationStatus), `Invalid verif status for ${std.id}`);
      assert.ok(std.scope && std.scope.length > 20, `Scope too brief for ${std.id}`);
      assert.ok(Array.isArray(std.assumptions) && std.assumptions.length > 0, `Missing assumptions for ${std.id}`);
      assert.ok(Array.isArray(std.limitations) && std.limitations.length > 0, `Missing limitations for ${std.id}`);
      assert.ok(Array.isArray(std.references) && std.references.length > 0, `Missing references for ${std.id}`);
    }
  });

  test('ASME B106.1M publication status is accurately recorded as withdrawn', () => {
    const asme = getStandardById('asme-b106-1m');
    assert.ok(asme, 'ASME B106.1M must be present in registry');
    assert.strictEqual(asme.status, 'withdrawn');
    assert.strictEqual(asme.organization, 'ASME');
    assert.strictEqual(asme.verificationStatus, 'draft');
    assert.ok(asme.limitations.some(l => l.includes('withdrawn by ASME in 1994')));
  });

  test('ISO 10816 explicitly documents vibration evaluation scope and not shaft sizing', () => {
    const iso10816 = getStandardById('iso-10816-1');
    assert.ok(iso10816, 'ISO 10816-1 must be present in registry');
    assert.strictEqual(iso10816.status, 'withdrawn');
    assert.strictEqual(iso10816.verificationStatus, 'unverified');
    assert.strictEqual(iso10816.supportedCalculations.length, 0, 'ISO 10816 must not claim supported calculations');
    assert.ok(iso10816.limitations.some(l => l.includes('vibration') && l.includes('NOT a structural design standard')));
  });

  test('reference-only standards (DIN 7190-2, ISO 16281) remain unverified with 0 supported calculations', () => {
    const din7190_2 = getStandardById('din-7190-2');
    const iso16281 = getStandardById('iso-16281');

    assert.ok(din7190_2 && din7190_2.verificationStatus === 'unverified');
    assert.ok(iso16281 && iso16281.verificationStatus === 'unverified');

    assert.strictEqual(din7190_2?.supportedCalculations.length, 0);
    assert.strictEqual(iso16281?.supportedCalculations.length, 0);
  });

  test('DIN 6885-1 and DIN 7190-1 are verified software implementations supporting shaft-hub connections', () => {
    const din6885 = getStandardById('din-6885-1');
    const din7190_1 = getStandardById('din-7190-1');

    assert.ok(din6885 && din6885.verificationStatus === 'verified');
    assert.ok(din7190_1 && din7190_1.verificationStatus === 'verified');

    assert.ok(din6885.supportedCalculations.includes('keyShearStress'));
    assert.ok(din6885.supportedCalculations.includes('keyContactPressure'));
    assert.ok(din6885.supportedCalculations.includes('keyTorqueCapacity'));

    assert.ok(din7190_1.supportedCalculations.includes('interferenceContactPressure'));
    assert.ok(din7190_1.supportedCalculations.includes('hubHoopStress'));
    assert.ok(din7190_1.supportedCalculations.includes('pressFitTorqueCapacity'));
  });

  test('ISO 281 and ISO 76 are verified software implementations supporting bearing engineering', () => {
    const iso281 = getStandardById('iso-281');
    const iso76 = getStandardById('iso-76');

    assert.ok(iso281 && iso281.verificationStatus === 'verified');
    assert.ok(iso76 && iso76.verificationStatus === 'verified');

    assert.ok(iso281.supportedCalculations.includes('bearingReactions'));
    assert.ok(iso281.supportedCalculations.includes('equivalentDynamicLoad'));
    assert.ok(iso281.supportedCalculations.includes('l10RatingLife'));
    assert.ok(iso281.supportedCalculations.includes('operatingHoursLife'));

    assert.ok(iso76.supportedCalculations.includes('staticEquivalentLoad'));
    assert.ok(iso76.supportedCalculations.includes('staticSafetyFactor'));
  });

  test('ISO 286-1 and ISO 286-2 are verified software implementations supporting limits and fits', () => {
    const iso286_1 = getStandardById('iso-286-1');
    const iso286_2 = getStandardById('iso-286-2');

    assert.ok(iso286_1 && iso286_1.verificationStatus === 'verified');
    assert.ok(iso286_2 && iso286_2.verificationStatus === 'verified');

    assert.ok(iso286_1.supportedCalculations.includes('fitClassification'));
    assert.ok(iso286_2.supportedCalculations.includes('holeToleranceLimits'));
    assert.ok(iso286_2.supportedCalculations.includes('shaftToleranceLimits'));
  });

  test('classical solid mechanics core is verified and backs key analytical calculations', () => {
    const mech = getStandardById('classical-mechanics');
    assert.ok(mech, 'Classical mechanics record must exist');
    assert.strictEqual(mech.verificationStatus, 'verified');
    assert.ok(mech.supportedCalculations.includes('torsionalStress'));
    assert.ok(mech.supportedCalculations.includes('bendingStress'));
    assert.ok(mech.supportedCalculations.includes('combinedStress'));
    assert.ok(mech.supportedCalculations.includes('deflection'));
    assert.ok(mech.supportedCalculations.includes('powerTransmission'));
  });

  test('filtering functions accurately partition registry records', () => {
    const verified = getVerifiedStandards();
    assert.ok(verified.length >= 3, 'Expected at least 3 verified standards (classical, iso-286-1, iso-286-2)');
    assert.ok(verified.every(s => s.verificationStatus === 'verified'));

    const refOnly = getReferenceOnlyStandards();
    assert.ok(refOnly.length >= 3, 'Expected at least 3 reference-only standards');
    assert.ok(refOnly.every(s => s.verificationStatus === 'unverified'));

    const isoStandards = filterStandards({ organization: 'ISO' });
    assert.ok(isoStandards.length >= 4);
    assert.ok(isoStandards.every(s => s.organization === 'ISO'));

    const searchResult = filterStandards({ searchQuery: 'vibration' });
    assert.ok(searchResult.length >= 4, 'Expected multiple vibration standards (ISO 10816, 20816-1, 20816-3, 21940-11, 21940-12)');
    assert.ok(searchResult.some(s => s.id === 'iso-10816-1'));
    assert.ok(searchResult.some(s => s.id === 'iso-20816-1'));
    assert.ok(searchResult.some(s => s.id === 'iso-21940-11'));
  });

  test('no standards record makes false certification or manufacturing approval claims', () => {
    const all = getAllStandards();
    for (const std of all) {
      const serialized = JSON.stringify(std).toLowerCase();
      assert.ok(!serialized.includes('certified report generator'), `Standard ${std.id} must not claim certified report generator`);
      assert.ok(!serialized.includes('manufacturing release approval'), `Standard ${std.id} must not claim manufacturing release`);
    }
  });

  test('ISO 21771-1 and ISO 53 are verified for gear geometry while ISO 6336 is explicitly unverified/deferred', () => {
    const iso21771 = getStandardById('iso-21771-1');
    const iso53 = getStandardById('iso-53');
    const iso6336_1 = getStandardById('iso-6336-1');
    const iso6336_2 = getStandardById('iso-6336-2');
    const iso6336_3 = getStandardById('iso-6336-3');
    const iso6336_5 = getStandardById('iso-6336-5');

    assert.ok(iso21771 && iso21771.verificationStatus === 'verified');
    assert.ok(iso53 && iso53.verificationStatus === 'verified');
    assert.ok(iso21771.supportedCalculations.includes('gearGeometry'));
    assert.ok(iso21771.supportedCalculations.includes('pitchDiameter'));
    assert.ok(iso21771.supportedCalculations.includes('centerDistance'));
    assert.ok(iso21771.supportedCalculations.includes('contactRatio'));
    assert.ok(iso53.supportedCalculations.includes('rackToothProfile'));

    // ISO 6336 parts must have 0 supported calculations in this stage
    assert.ok(iso6336_1 && iso6336_1.verificationStatus === 'unverified');
    assert.ok(iso6336_2 && iso6336_2.verificationStatus === 'unverified');
    assert.ok(iso6336_3 && iso6336_3.verificationStatus === 'unverified');
    assert.ok(iso6336_5 && iso6336_5.verificationStatus === 'unverified');
    assert.strictEqual(iso6336_1?.supportedCalculations.length, 0);
    assert.strictEqual(iso6336_2?.supportedCalculations.length, 0);
    assert.strictEqual(iso6336_3?.supportedCalculations.length, 0);
    assert.strictEqual(iso6336_5?.supportedCalculations.length, 0);
  });

  test('ISO 21940-11 is verified for rigid rotor balancing while ISO 20816 and ISO 21940-12 are unverified boundaries', () => {
    const iso21940_11 = getStandardById('iso-21940-11');
    const iso21940_12 = getStandardById('iso-21940-12');
    const iso20816_1 = getStandardById('iso-20816-1');
    const iso20816_3 = getStandardById('iso-20816-3');

    assert.ok(iso21940_11 && iso21940_11.verificationStatus === 'verified');
    assert.ok(iso21940_11.code.includes('Amd 1:2022'), 'ISO 21940-11 code specifies Amd 1:2022 per official ISO catalog');
    assert.ok(iso21940_11.edition.includes('Amd 1:2022'), 'ISO 21940-11 edition specifies Amd 1:2022');
    assert.ok(iso21940_11.supportedCalculations.includes('permissibleSpecificUnbalance'));
    assert.ok(iso21940_11.supportedCalculations.includes('permissibleResidualUnbalance'));
    assert.ok(iso21940_11.supportedCalculations.includes('balancePlaneAllocation'));

    // ISO 20816 and ISO 21940-12 are unverified boundaries
    assert.ok(iso21940_12 && iso21940_12.verificationStatus === 'unverified');
    assert.strictEqual(iso21940_12?.supportedCalculations.length, 0);
    assert.ok(iso20816_1 && iso20816_1.verificationStatus === 'unverified');
    assert.strictEqual(iso20816_1?.supportedCalculations.length, 0);
    assert.ok(iso20816_3 && iso20816_3.verificationStatus === 'unverified');
    assert.strictEqual(iso20816_3?.supportedCalculations.length, 0);
  });

  test('ISO 281 notes ISO/DIS 281 enquiry revision status in official catalog', () => {
    const iso281 = getStandardById('iso-281');
    assert.ok(iso281, 'ISO 281 exists in registry');
    assert.ok(iso281.references.some(r => r.includes('ISO/DIS 281')), 'References include ISO/DIS 281 development status');
  });
});

