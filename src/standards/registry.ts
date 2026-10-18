import type {
  EngineeringStandardRecord,
  StandardFilterOptions,
  VerificationStatus,
  StandardOrganization
} from './types';

/**
 * Immutable engineering standards registry.
 * Captures published standard metadata, verification status of current software implementations,
 * assumptions, explicit limitations, and primary reference sources.
 */
export const STANDARDS_REGISTRY: EngineeringStandardRecord[] = [
  {
    id: 'asme-b106-1m',
    code: 'ASME B106.1M-1985 (R1991)',
    title: 'Design of Transmission Shafting',
    organization: 'ASME',
    edition: '1985 (Reaffirmed 1991, Withdrawn 1994)',
    status: 'withdrawn',
    scope: 'Specifies analytical design equations and empirical shock and fatigue factors (Cm, Ct) for transmission shafts subjected to torsion, bending, and axial loading under cyclic service.',
    supportedCalculations: ['torsionalStress', 'bendingStress', 'combinedStress'],
    verificationStatus: 'draft',
    references: [
      'ASME B106.1M-1985 (withdrawn 1994)',
      'ANSI/ASME Code for Design of Transmission Shafting',
      "Shigley's Mechanical Engineering Design, Chapter on Shafts and Shaft Components"
    ],
    assumptions: [
      'Circular cross-section shafts operating below material proportional limit',
      'Empirical bending shock factor (Cm) and torsional shock factor (Ct) represent dynamic loading',
      'Elliptic failure envelope or modified Goodman criterion basis'
    ],
    limitations: [
      'Standard was officially withdrawn by ASME in 1994 without direct replacement; modern practice references ANSI/AGMA or Shigley/Goodman criteria',
      'The software currently calculates static Von Mises / Tresca criteria and simplified S-N endurance, not the full empirical Cm/Ct fatigue matrix of B106.1M',
      'Should not be cited as an active governing code for new certified structural designs'
    ]
  },
  {
    id: 'din-6885-1',
    code: 'DIN 6885-1:2021-11',
    title: 'Drive Type Fastenings without Taper Action - Parallel Keys, Keyways, Deep Pattern',
    organization: 'DIN',
    edition: '2021-11 (Latest revision; supersedes 1993-10)',
    status: 'active',
    scope: 'Specifies dimensions, tolerances, and design calculation rules for parallel keys and deep-pattern keyways. Software implementation in Stage 09 verifies tangential force transmission, shear stress, flank contact crushing pressure on key/shaft/hub, and torque capacity.',
    supportedCalculations: [
      'keyShearStress',
      'keyContactPressure',
      'keyTorqueCapacity',
      'keySizingRecommendation'
    ],
    verificationStatus: 'verified',
    references: [
      'DIN 6885-1:2021-11, Deutsches Institut für Normung',
      'DIN 6885-1:1993-10 (Historical reference)',
      'Roloff/Matek Maschinenelemente: Kapitel Formschlüssige Verbindungen (Passfedern)',
      'Niemann/Winter Maschinenelemente Band 1'
    ],
    assumptions: [
      'Standard parallel key with rectangular profile and rounded (Form A) or square (Form B) ends',
      'Nominal shaft diameter determines standard key cross-section b x h per DIN 6885-1 sizing tables',
      'Uniform contact force distribution along key effective load-bearing length Leff',
      'Form A rounded ends have effective length Leff = L - b; Form B square ends have Leff = L',
      'Allowable shear stress based on distortion energy criterion (0.577 * Sy / n)',
      'Allowable contact pressure based on weakest mating material (0.80 * min(Sy_key, Sy_shaft, Sy_hub) / n)'
    ],
    limitations: [
      'Reversing and alternating shock torque induces severe fretting and flank fatigue, requiring 40% pressure de-rating',
      'Does not calculate shaft notch stress concentrations (Kt/Kts); refer to Stage 07 fatigue module for shaft keyway endurance',
      'For long keys (Leff/d > 1.5), shaft torsional twist induces non-uniform contact pressure peaks at key ends'
    ]
  },
  {
    id: 'din-7190-1',
    code: 'DIN 7190-1:2017-02',
    title: 'Interference fits — Part 1: Calculation and design rules for cylindrical metallic interference fits',
    organization: 'DIN',
    edition: '2017-02',
    status: 'active',
    scope: 'Specifies calculation principles and design rules for elastic cylindrical metallic interference fits. Stage 09 software implementation verifies Lamé thick-walled cylinder contact pressure bounds, shaft and hub stresses, and friction-based torque and axial load transmission capacities.',
    supportedCalculations: [
      'interferenceContactPressure',
      'hubHoopStress',
      'shaftStress',
      'pressFitTorqueCapacity',
      'pressFitAxialCapacity',
      'thermalAssemblyClearance'
    ],
    verificationStatus: 'verified',
    references: [
      'DIN 7190-1:2017-02, Deutsches Institut für Normung',
      'Roloff/Matek Maschinenelemente: Kapitel Pressverbände',
      'Niemann/Winter Maschinenelemente Band 1: Zylindrische Pressverbände'
    ],
    assumptions: [
      'Axisymmetric elastic thick-walled cylinder relations (Lamé equations) under uniform radial contact pressure',
      'Uniform Coulomb friction across full joint contact length',
      'Plane stress conditions at free hub end faces',
      'Linear-elastic material behavior within proportional yield limits'
    ],
    limitations: [
      'Does not model plastic interference (autofrettage); components must remain within elastic yield limit',
      'Does not include centrifugal relief at extreme rotational speeds (peripheral velocity v > 50 m/s)',
      'Surface smoothing loss G must be evaluated when mating rough turned or ground surfaces'
    ]
  },
  {
    id: 'din-7190-2',
    code: 'DIN 7190-2:2017-02',
    title: 'Interference fits — Part 2: Calculation and design rules for conical interference fits',
    organization: 'DIN',
    edition: '2017-02',
    status: 'active',
    scope: 'Specifies calculation and design rules for conical self-locking interference fits.',
    supportedCalculations: [],
    verificationStatus: 'unverified',
    references: [
      'DIN 7190-2:2017-02, Deutsches Institut für Normung'
    ],
    assumptions: [
      'Conical taper geometry (e.g. 1:10 to 1:50 taper ratio)'
    ],
    limitations: [
      'DEFERRED ADVANCED BOUNDARY: Conical interference fits are outside the Stage 09 scope and are intentionally recorded as unverified. The software strictly calculates cylindrical interference fits per DIN 7190-1.'
    ]
  },
  {
    id: 'iso-281',
    code: 'ISO 281:2007',
    title: 'Rolling bearings — Dynamic load ratings and rating life',
    organization: 'ISO',
    edition: '2007 (Confirmed 2020)',
    status: 'active',
    scope: 'Specifies methods of calculating basic dynamic load ratings and basic rating life (L10) for rolling bearings. Stage 08 software implementation verifies equivalent dynamic load P = X*Fr + Y*Fa and basic L10 dynamic life in millions of revolutions and operating hours (shaft static-equilibrium reaction solver is governed by classical solid mechanics).',
    supportedCalculations: [
      'bearingReactions',
      'equivalentDynamicLoad',
      'l10RatingLife',
      'operatingHoursLife'
    ],
    verificationStatus: 'verified',
    references: [
      'ISO 281:2007(E), International Organization for Standardization',
      'ISO/DIS 281 (Under revision, stage 40.20 / Enquiry)',
      'ISO/TC 4/SC 8 Rolling Bearings',
      "Shigley's Mechanical Engineering Design, Chapter 13: Rolling-Contact Bearings"
    ],
    assumptions: [
      'Basic rating life corresponds to 90% survival probability (L10) under standard elastohydrodynamic lubrication',
      'Subsurface initiated rolling contact fatigue spalling is the primary failure mode',
      'Life exponent p = 3 for ball bearings and p = 10/3 for roller bearings',
      'Clean mineral oil or grease lubrication (viscosity ratio kappa >= 1.0, a_ISO = 1.0)'
    ],
    limitations: [
      'Implements basic dynamic rating life per ISO 281:2007 (confirmed 2020; ISO/DIS 281 under revision at Enquiry stage); does not implement advanced modified reference rating life per ISO 16281:2025',
      'Assumes rigid housing and negligible angular misalignment (slope < 2 to 10 arcmin)',
      'Operating temperatures above 120 °C require material hardness and dimensional stabilization de-rating'
    ]
  },
  {
    id: 'iso-76',
    code: 'ISO 76:2006 (Amd 1:2017)',
    title: 'Rolling bearings — Static load ratings',
    organization: 'ISO',
    edition: '2006 (Amd 1:2017)',
    status: 'active',
    scope: 'Specifies methods of calculating the basic static load rating and static equivalent load for rolling bearings.',
    supportedCalculations: ['staticEquivalentLoad', 'staticSafetyFactor'],
    verificationStatus: 'verified',
    references: [
      'ISO 76:2006(E), International Organization for Standardization',
      'ISO 76:2006/Amd 1:2017',
      'ISO/TC 4/SC 8 Rolling Bearings'
    ],
    assumptions: [
      'Static equivalent load P0 = max(X0*Fr + Y0*Fa, Fr) governs raceway plastic contact stresses',
      'Permissible static safety factor s0 = C0 / P0 evaluated against industrial smoothness and low-noise requirements'
    ],
    limitations: [
      'Validates static load capacity under non-rotating or slow-oscillating conditions (< 10 rpm)',
      'Extreme impact shock loading may require higher safety factors (s0 >= 2.0)'
    ]
  },
  {
    id: 'iso-16281',
    code: 'ISO 16281:2025',
    title: 'Rolling bearings — Methods for calculating the modified reference rating life for universally loaded bearings',
    organization: 'ISO',
    edition: '2025',
    status: 'active',
    scope: 'Specifies calculation methods for the modified reference rating life of rolling bearings, taking into account operating clearance, contact stress distribution, misalignments, and elastohydrodynamic lubrication condition.',
    supportedCalculations: [],
    verificationStatus: 'unverified',
    references: [
      'ISO 16281:2025(E), International Organization for Standardization',
      'ISO/TC 4/SC 8 Rolling Bearings'
    ],
    assumptions: [
      'Requires detailed internal bearing geometry (number of rollers/balls, osculation, profile crowning, contact angle)',
      'Requires elastohydrodynamic film thickness and real-time lubricant contamination factor evaluation'
    ],
    limitations: [
      'ADVANCED METHOD BOUNDARY: Intentionally unverified and deferred in Stage 08. The software strictly provides basic ISO 281 L10 rating life and does NOT claim compliance with ISO 16281 modified reference rating life without internal raceway profile and clearance matrices.',
      'Preventing false precision: ISO 16281 life results must not be simulated without verified internal geometry data from bearing manufacturers'
    ]
  },
  {
    id: 'iso-286-1',
    code: 'ISO 286-1:2010',
    title: 'Geometrical product specifications (GPS) — ISO code system for tolerances on linear sizes — Part 1: Basis of tolerances, deviations and fits',
    organization: 'ISO',
    edition: '2010 (Confirmed 2021)',
    status: 'active',
    scope: 'Establishes the ISO system of limits and fits, standard tolerance grades (IT01 to IT18), and fundamental deviation letter symbols for cylindrical shafts and holes.',
    supportedCalculations: [
      'diameterStepLookup',
      'itGradeTolerance',
      'fundamentalDeviation',
      'fitClassification'
    ],
    verificationStatus: 'verified',
    references: [
      'ISO 286-1:2010(E), International Organization for Standardization',
      'ISO/TC 213 Dimensional and geometrical product specifications and verification',
      'Shigley Mechanical Engineering Design, 11th Ed., Appendix A-11 to A-14'
    ],
    assumptions: [
      'Standard reference temperature of 20 °C applies per ISO 1',
      'Rigid workpiece geometry during dimensional verification (elastic deformation neglected)',
      'Nominal diameter ranges 0 mm < D <= 500 mm partitioned into 13 standard steps'
    ],
    limitations: [
      'Software implementation verified for nominal diameters up to 500 mm and tolerance grades IT5 through IT11',
      'Diameters > 500 mm up to 3150 mm are intentionally unverified and unsupported in this version',
      'Fits involving non-cylindrical or conical mating geometries are not supported',
      'Press-fit contact pressure, torque transmission capacity, and thermal expansion shrink-fitting require separate stress and thermo-elastic models'
    ]
  },
  {
    id: 'iso-286-2',
    code: 'ISO 286-2:2010',
    title: 'Geometrical product specifications (GPS) — ISO code system for tolerances on linear sizes — Part 2: Tables of standard tolerance classes and limit deviations for holes and shafts',
    organization: 'ISO',
    edition: '2010 (Confirmed 2021)',
    status: 'active',
    scope: 'Provides comprehensive numerical limit deviation tables for standard tolerance classes for holes and shafts up to nominal diameter of 3150 mm.',
    supportedCalculations: [
      'holeToleranceLimits',
      'shaftToleranceLimits',
      'clearanceInterferenceCalculation',
      'assemblyGuidance'
    ],
    verificationStatus: 'verified',
    references: [
      'ISO 286-2:2010(E), International Organization for Standardization',
      'ISO/TC 213',
      'Machinery Handbook 31st Edition, Metric Limits and Fits Tables'
    ],
    assumptions: [
      'Linear deviations tabulated in micrometers (µm)',
      'Standard nominal size intervals per ISO step guidelines (13 steps covering 0 to 500 mm)',
      'Clean, degreased parts at 20 °C ambient inspection temperature'
    ],
    limitations: [
      'Verified standard classes: Holes H6, H7, H8, H9, H11, JS7; Shafts h6, h7, h8, h9, g6, f7, e8, d11, js6, k6, m6, n6, p6, r6, s6',
      'Tolerance classes outside this set are rejected with explicit unsupported error',
      'Does not provide legal certification for manufacturing release without independent drawing review by licensed quality engineer'
    ]
  },
  {
    id: 'iso-10816-1',
    code: 'ISO 10816-1:1995',
    title: 'Mechanical vibration — Evaluation of machine vibration by measurements on non-rotating parts — Part 1: General guidelines',
    organization: 'ISO',
    edition: '1995 (Withdrawn, superseded by ISO 20816-1)',
    status: 'withdrawn',
    scope: 'Provides general criteria and measurement guidelines for evaluating broadband mechanical vibration severity on non-rotating machine parts (bearing housings) in industrial service.',
    supportedCalculations: [],
    verificationStatus: 'unverified',
    references: [
      'ISO 10816-1:1995(E), International Organization for Standardization',
      'Superseded by ISO 20816-1:2016',
      'ISO/TC 108/SC 2 Measurement and evaluation of mechanical vibration and shock'
    ],
    assumptions: [
      'RMS vibration velocity measured across 10 Hz to 1000 Hz frequency range',
      'Operational machine severity categorized into Zones A (good), B (acceptable), C (unsatisfactory), and D (unacceptable)'
    ],
    limitations: [
      'CRITICAL CLARIFICATION: This standard governs in-service vibration health monitoring of machine bearing housings. It is NOT a structural design standard for shaft sizing, bending stress, or yield safety factors.',
      'Previous prototype versions of this application mislabeled report calculation headers with ISO 10816. Stage 03 explicitly corrects this mislabeling.',
      'No vibration measurement calculations are performed by this application; standard is included purely as an informational clarification'
    ]
  },
  {
    id: 'astm-a29',
    code: 'ASTM A29/A29M-20',
    title: 'Standard Specification for General Requirements for Steel Bars, Carbon and Alloy, Hot-Wrought',
    organization: 'ASTM',
    edition: '2020',
    status: 'active',
    scope: 'Covers standard chemical composition requirements, permissible dimensional variations, and metallurgical testing protocols for hot-wrought carbon and alloy engineering steel bars (including AISI 1045, 4140, 4340).',
    supportedCalculations: ['materialProperties', 'safetyFactor'],
    verificationStatus: 'verified',
    references: [
      'ASTM A29/A29M-20, ASTM International',
      'ASM Handbook Volume 1: Properties and Selection: Irons, Steels, and High-Performance Alloys'
    ],
    assumptions: [
      'Nominal chemical composition conforms to standard AISI/SAE alloy definitions',
      'Mechanical property baselines in software represent standard quenched and tempered (Q&T) or normalized conditions at 20 °C'
    ],
    limitations: [
      'Material properties tabulated in the software are room-temperature nominal values',
      'High-temperature strength derating (operating temp > 150 °C) requires empirical derating curves not yet implemented'
    ]
  },
  {
    id: 'classical-mechanics',
    code: 'SOLID-MECH-REF',
    title: 'Classical Mechanics of Materials & Machine Design Analytical Formulations',
    organization: 'ASME',
    edition: 'Shigley 11th Ed. (2020) / Roark 8th Ed. (2012)',
    status: 'active',
    scope: 'Provides deterministic closed-form equations for solid circular shaft torsion, simply supported Euler-Bernoulli flexural bending, combined Von Mises & Tresca multiaxial yield criteria, midspan deflection, and rotational power transmission.',
    supportedCalculations: [
      'torsionalStress',
      'bendingStress',
      'combinedStress',
      'deflection',
      'powerTransmission',
      'safetyFactor'
    ],
    verificationStatus: 'verified',
    references: [
      "Shigley's Mechanical Engineering Design (Budynas & Nisbett, 11th Edition, McGraw-Hill)",
      "Roark's Formulas for Stress and Strain (Young, Budynas, Sadegh, 8th Edition, McGraw-Hill)",
      'Mechanics of Materials (Gere & Goodno, 9th Edition, Cengage)'
    ],
    assumptions: [
      'Solid circular cross-section with constant diameter along assessed span',
      'Homogeneous, isotropic, linear elastic material behavior following Hooke’s Law',
      'Small deflection theory (deflection << beam span, small rotation angles)',
      'Simply supported boundary conditions at shaft span ends with single central transverse load',
      'Steady-state continuous torque transmission'
    ],
    limitations: [
      'Does not calculate stepped shaft stress concentration factors (Kt)',
      'Does not include Timoshenko transverse shear deformation for deep beams (L/d < 5)',
      'Fatigue calculations currently use simplified unnotched rotary-beam endurance ratio without full Marin modifying factor matrices',
      'Keyway geometry and localized notch plasticity are not included in baseline equations'
    ]
  },
  {
    id: 'iso-1101',
    code: 'ISO 1101:2017',
    title: 'Geometrical product specifications (GPS) — Geometrical tolerancing — Tolerances of form, orientation, location and run-out',
    organization: 'ISO',
    edition: '2017',
    status: 'active',
    scope: 'Defines geometrical tolerancing of workpieces, symbols, definitions, and tolerance zone specifications for form, orientation, location, and runout.',
    supportedCalculations: [
      'gdtValidation',
      'formTolerancing',
      'orientationTolerancing',
      'locationTolerancing',
      'runoutTolerancing'
    ],
    verificationStatus: 'verified',
    references: [
      'ISO 1101:2017(en)',
      'ISO 8015:2011 Geometrical product specifications (GPS) — Fundamentals — Concepts, principles and rules'
    ],
    assumptions: [
      'Independency principle per ISO 8015 governs by default unless envelope requirement (E) is invoked',
      'Linear sizes and geometric tolerances are independent'
    ],
    limitations: [
      'Verified subset in Stage 06 covers 6 primary characteristics: straightness, flatness, perpendicularity, parallelism, position, circular runout',
      'Profile of surface, profile of line, total runout, and complex datum modifier systems are scheduled for future extensions',
      'Validates definition syntax and tolerance zone semantics; physical part conformance requires coordinate metrology data'
    ]
  },
  {
    id: 'iso-5459',
    code: 'ISO 5459:2011',
    title: 'Geometrical product specifications (GPS) — Geometrical tolerancing — Datums and datum systems',
    organization: 'ISO',
    edition: '2011 (Superseded by ISO 5459:2024)',
    status: 'historical',
    scope: 'Specifies terminology, rules, and methodology for establishing datums and datum systems from real integral features.',
    supportedCalculations: ['datumReferenceFrame', 'compoundAxis'],
    verificationStatus: 'verified',
    references: [
      'ISO 5459:2011(en)',
      'ISO GPS Handbook'
    ],
    assumptions: [
      'Datum features are extracted features of real workpieces',
      'Compound datum axes (e.g. A-B) formed by coaxial cylindrical surfaces'
    ],
    limitations: [
      'DISCREPANCY AUDIT: ISO 5459:2011 was officially superseded by ISO 5459:2024. The 2011 edition remains the baseline for the current Stage 06 datum rules implementation until 2024 additions are verified',
      'Stage 06 implements primary, secondary, tertiary single datums and compound two-datum axes (A-B)',
      'Moveable datums and target points are not yet modeled'
    ]
  },
  {
    id: 'iso-5459-2024',
    code: 'ISO 5459:2024',
    title: 'Geometrical product specifications (GPS) — Geometrical tolerancing — Datums and datum systems',
    organization: 'ISO',
    edition: '2024',
    status: 'active',
    scope: 'Latest international revision specifying terminology, rules, and methodology for establishing datums and datum systems in GPS.',
    supportedCalculations: ['datumReferenceFrame', 'compoundAxis'],
    verificationStatus: 'verified',
    references: [
      'ISO 5459:2024(en), International Organization for Standardization',
      'ISO/TC 213 Geometrical product specifications and verification'
    ],
    assumptions: [
      'Extracted integral features form datums',
      'Compound datum systems govern coaxial features of size'
    ],
    limitations: [
      'Supersedes ISO 5459:2011 with enhanced definitions for complex integral features and multi-level datum hierarchies'
    ]
  },
  {
    id: 'asme-y14-5',
    code: 'ASME Y14.5-2018',
    title: 'Dimensioning and Tolerancing',
    organization: 'ASME',
    edition: '2018',
    status: 'active',
    scope: 'Establishes symbols, definitions, and practices for dimensioning, tolerancing, and related requirements for use on engineering drawings and 3D models.',
    supportedCalculations: [
      'gdtValidation',
      'fcfFormatting',
      'materialConditionModifiers'
    ],
    verificationStatus: 'verified',
    references: [
      'ASME Y14.5-2018, The American Society of Mechanical Engineers',
      'Fundamentals of Geometric Dimensioning and Tolerancing (Alex Krulikowski)'
    ],
    assumptions: [
      'Rule #1 (envelope principle) applies to regular features of size by default',
      'RFS applies by default when no material condition modifier is specified'
    ],
    limitations: [
      'Stage 06 validates syntax and feature-control rules for straightness, flatness, perpendicularity, parallelism, position, circular runout',
      'Custom datum reference frames and translation modifiers are not yet implemented'
    ]
  },
  {
    id: 'iso-1099',
    code: 'ISO 1099:2017',
    title: 'Metallic materials — Fatigue testing — Axial force-controlled method',
    organization: 'ISO',
    edition: '2017 (Confirmed 2022)',
    status: 'active',
    scope: 'Specifies conditions for conducting axial, constant-amplitude, force-controlled fatigue tests on metallic specimens at ambient temperature.',
    supportedCalculations: ['snCurveTesting', 'axialFatigue'],
    verificationStatus: 'verified',
    references: [
      'ISO 1099:2017(E), International Organization for Standardization',
      'ISO/TC 164/SC 5 Fatigue testing'
    ],
    assumptions: [
      'Standard smooth round or flat test specimens under constant-amplitude uniaxial loading',
      'Specimen results require Marin factor correction when applied to full production components'
    ],
    limitations: [
      'Describes laboratory specimen testing methodology only; does not, by itself, validate fatigue-life predictions for complete production shaft assemblies'
    ]
  },
  {
    id: 'iso-12107',
    code: 'ISO 12107:2012',
    title: 'Metallic materials — Fatigue testing — Statistical planning and analysis of data',
    organization: 'ISO',
    edition: '2012 (Confirmed 2023)',
    status: 'active',
    scope: 'Provides statistical methods for determining the S-N curve and fatigue limit of metallic materials, including confidence intervals and Basquin linear regression.',
    supportedCalculations: ['basquinRegression', 'fatigueDataFitting'],
    verificationStatus: 'verified',
    references: [
      'ISO 12107:2012(E), International Organization for Standardization',
      'ISO/TC 164/SC 5'
    ],
    assumptions: [
      'Log-normal distribution of fatigue life at a given stress amplitude',
      'Linear relation between log stress and log life within intermediate cycle regime'
    ],
    limitations: [
      'Verified subset covers two-parameter Basquin log-log least squares regression; does not compute 3-parameter random variable variance bounds'
    ]
  },
  {
    id: 'astm-e466',
    code: 'ASTM E466-21',
    title: 'Standard Practice for Conducting Force Controlled Constant Amplitude Axial Fatigue Tests of Metallic Materials',
    organization: 'ASTM',
    edition: '2021',
    status: 'active',
    scope: 'Covers the procedure for conducting axial force controlled fatigue tests to determine the fatigue strength of metallic materials in the fatigue regime where strains are predominantly elastic.',
    supportedCalculations: ['constantAmplitudeFatigue', 'stressRatioEvaluation'],
    verificationStatus: 'verified',
    references: [
      'ASTM E466-21, ASTM International',
      'Annual Book of ASTM Standards, Vol. 03.01'
    ],
    assumptions: [
      'Predominantly elastic strains (high-cycle fatigue)',
      'Constant-amplitude sinusoidal waveform'
    ],
    limitations: [
      'Applies to laboratory test coupons; component geometry notches and size effects require explicit Kt and Marin factor conversions'
    ]
  },
  {
    id: 'astm-e739',
    code: 'ASTM E739-10 (Withdrawn 2024)',
    title: 'Standard Practice for Statistical Analysis of Linear or Linearized Stress-Life (S-N) and Strain-Life (e-N) Fatigue Data',
    organization: 'ASTM',
    edition: '2010 (Withdrawn May 2024 without replacement)',
    status: 'withdrawn',
    scope: 'Historical methodology for statistical regression and confidence interval calculation of linearized log-log S-N and strain-life data.',
    supportedCalculations: [],
    verificationStatus: 'unverified',
    references: [
      'ASTM E739-10(2015)',
      'ASTM International Committee E08 on Fatigue and Fracture'
    ],
    assumptions: [
      'Historical reference only'
    ],
    limitations: [
      'Standard was officially withdrawn by ASTM in 2024 without direct replacement; modern statistical S-N analysis references ISO 12107:2012'
    ]
  },
  {
    id: 'iso-21771-1',
    code: 'ISO 21771-1:2024',
    title: 'Gears — Cylindrical involute gears and gear pairs — Concepts and geometry',
    organization: 'ISO',
    edition: '2024 (First edition; supersedes ISO 21771:2007)',
    status: 'active',
    scope: 'Specifies definitions, concepts, and analytical geometry equations for cylindrical involute gears and gear pairs with external or internal engagement. Stage 10 software verifies spur and helical reference pitch diameter, base diameter, tip/root diameters, working center distance, and profile/face contact ratios.',
    supportedCalculations: [
      'gearGeometry',
      'pitchDiameter',
      'baseDiameter',
      'tipRootDiameter',
      'centerDistance',
      'contactRatio'
    ],
    verificationStatus: 'verified',
    references: [
      'ISO 21771-1:2024, International Organization for Standardization',
      'ISO 21771:2007 (Historical reference)',
      'DIN 3960 / DIN 3962 Definitions and parameters for cylindrical gears'
    ],
    assumptions: [
      'External involute spur and parallel-axis helical gear pairs',
      'Linear tooth flank profile generated from standard rack cutters',
      'Rigid gear blanks operating without thermal or defection-induced axis misalignment',
      'Profile shift coefficient x within feasible non-pointing and non-undercut boundaries'
    ],
    limitations: [
      'Internal gear rings, non-involute profiles, bevel gears, hypoid gears, and worm gears are excluded',
      'Calculates geometric compatibility and contact ratio; does NOT compute tooth bending or pitting load capacity (refer to ISO 6336)'
    ]
  },
  {
    id: 'iso-53',
    code: 'ISO 53:1998',
    title: 'Cylindrical gears for general and heavy engineering — Standard basic rack tooth profile',
    organization: 'ISO',
    edition: '1998 (Reconfirmed 2020)',
    status: 'active',
    scope: 'Specifies the geometric parameters of the standard basic rack tooth profile for involute cylindrical gears for general and heavy engineering. Stage 10 implements standard addendum factor (ha* = 1.0), dedendum factor (hf* = 1.25), bottom clearance (c* = 0.25), and 20 degree normal pressure angle.',
    supportedCalculations: [
      'rackToothProfile',
      'addendumDedendumModel',
      'bottomClearance'
    ],
    verificationStatus: 'verified',
    references: [
      'ISO 53:1998, International Organization for Standardization',
      'DIN 867 Basic rack tooth profiles for involute teeth of cylindrical gears'
    ],
    assumptions: [
      'Standard 20 degree basic rack profile with symmetrical teeth',
      'Standard proportions ha* = 1.0 mn, hf* = 1.25 mn, c* = 0.25 mn'
    ],
    limitations: [
      'Special modified stub teeth, extreme deep-tooth profiles, or non-20-deg rack standards (e.g. 14.5 deg or 25 deg) require custom override'
    ]
  },
  {
    id: 'iso-6336-1',
    code: 'ISO 6336-1:2019',
    title: 'Calculation of load capacity of spur and helical gears — Part 1: Basic principles, introduction and general influence factors',
    organization: 'ISO',
    edition: '2019',
    status: 'active',
    scope: 'Presents general principles, influence factors, and formulas for calculating the load capacity of cylindrical spur and helical gears. Governs application factor KA, dynamic factor Kv, face load factors KHbeta/KFbeta, and transverse load factors KHalpha/KFalpha.',
    supportedCalculations: [],
    verificationStatus: 'unverified',
    references: [
      'ISO 6336-1:2019, International Organization for Standardization',
      'AGMA 2001-D04 Fundamental Rating Factors and Calculation Methods for Involute Spur and Helical Gear Teeth'
    ],
    assumptions: [
      'Reference-only standard; dynamic influence factors (KA, Kv, KHbeta) are deferred'
    ],
    limitations: [
      'Stage 10 calculates static mesh forces (Ft, Fr, Fa, Fn) only; full ISO 6336-1 dynamic influence factors and derating are deferred to future stages'
    ]
  },
  {
    id: 'iso-6336-2',
    code: 'ISO 6336-2:2019',
    title: 'Calculation of load capacity of spur and helical gears — Part 2: Calculation of surface durability (pitting)',
    organization: 'ISO',
    edition: '2019',
    status: 'active',
    scope: 'Specifies formulas for calculating the contact stress (Hertzian pressure sigma_H) and safety factor against surface durability failure (pitting) for spur and helical gears.',
    supportedCalculations: [],
    verificationStatus: 'unverified',
    references: [
      'ISO 6336-2:2019, International Organization for Standardization'
    ],
    assumptions: [
      'Reference-only standard; surface durability / pitting capacity rating is deferred'
    ],
    limitations: [
      'Pitting resistance rating (sigma_H vs sigma_HP) requires zone factor ZH, elasticity factor ZE, contact ratio factor Zeps, and helix factor Zbeta; deferred from Stage 10'
    ]
  },
  {
    id: 'iso-6336-3',
    code: 'ISO 6336-3:2019',
    title: 'Calculation of load capacity of spur and helical gears — Part 3: Calculation of tooth bending strength',
    organization: 'ISO',
    edition: '2019',
    status: 'active',
    scope: 'Specifies formulas for calculating the tooth root stress (sigma_F) and safety factor against tooth root fracture bending fatigue.',
    supportedCalculations: [],
    verificationStatus: 'unverified',
    references: [
      'ISO 6336-3:2019, International Organization for Standardization'
    ],
    assumptions: [
      'Reference-only standard; tooth root bending strength rating is deferred'
    ],
    limitations: [
      'Tooth bending fatigue rating (sigma_F vs sigma_FP) requires Lewis/Lewis-involute form factor YF, stress correction factor YS, and helix factor Ybeta; deferred from Stage 10'
    ]
  },
  {
    id: 'iso-6336-5',
    code: 'ISO 6336-5:2016',
    title: 'Calculation of load capacity of spur and helical gears — Part 5: Strength and quality of materials',
    organization: 'ISO',
    edition: '2016',
    status: 'active',
    scope: 'Provides allowable stress numbers and material quality requirements (MQ, ME, ML) for through-hardened, case-hardened, and nitrided steels used in gear manufacturing.',
    supportedCalculations: [],
    verificationStatus: 'unverified',
    references: [
      'ISO 6336-5:2016, International Organization for Standardization'
    ],
    assumptions: [
      'Reference-only standard; gear-specific allowable contact and bending stresses are deferred'
    ],
    limitations: [
      'General shaft materials (Stage 04) cannot be automatically cited as certified gear-tooth materials under ISO 6336-5 without specific core and case heat-treatment verification'
    ]
  },
  {
    id: 'iso-20816-1',
    code: 'ISO 20816-1:2016',
    title: 'Mechanical vibration — Measurement and evaluation of machine vibration — Part 1: General guidelines',
    organization: 'ISO',
    edition: '2016 (Confirmed 2021; ISO 20816-1:2026 under publication)',
    status: 'active',
    scope: 'Establishes general conditions and procedures for the measurement and evaluation of vibration from machines using measurements made on rotating shafts and non-rotating parts (bearing housings). Supersedes ISO 10816-1 and ISO 7919-1.',
    supportedCalculations: [],
    verificationStatus: 'unverified',
    references: [
      'ISO 20816-1:2016(en), International Organization for Standardization',
      'ISO 20816-1:2026 (Under publication, stage 60.00 / DIS/FDIS)',
      'ISO/TC 108/SC 2 Measurement and evaluation of mechanical vibration and shock'
    ],
    assumptions: [
      'Field vibration measurement on in-service machinery operating at steady-state thermal and speed equilibrium',
      'Broadband rms and peak vibration velocity or displacement across defined frequency bandwidths',
      'Evaluation zones A (newly commissioned), B (unrestricted long-term), C (alarm/remedial action), D (trip/damage)'
    ],
    limitations: [
      'DISCREPANCY & SCOPE AUDIT: ISO 20816-1 governs field vibration measurement and condition assessment of physical running machinery. It is NOT a structural shaft dimensioning formula or an analytical natural-frequency equation.',
      'The software provides analytical beam finite-element and Jeffcott dynamic predictions, NOT in-situ sensor measurement verification or legal condition-monitoring certification.',
      'Edition accuracy: ISO 20816-1:2016 remains the active published standard; the 2026 revision is formally under publication as of October 2026 and must not be cited as published code prior to official release.'
    ]
  },
  {
    id: 'iso-20816-3',
    code: 'ISO 20816-3:2022',
    title: 'Mechanical vibration — Measurement and evaluation of machine vibration — Part 3: Industrial machinery with power above 15 kW and operating speeds between 120 r/min and 30 000 r/min',
    organization: 'ISO',
    edition: '2022 (ISO 20816-3:2026 under publication)',
    status: 'active',
    scope: 'Specifies requirements for evaluating vibration of specific types of industrial machines when vibration measurements are made in-situ on bearing housings. Supersedes ISO 10816-3:2009.',
    supportedCalculations: [],
    verificationStatus: 'unverified',
    references: [
      'ISO 20816-3:2022(en), International Organization for Standardization',
      'ISO 20816-3:2026 (Under publication, stage 60.00)',
      'ISO/TC 108/SC 2'
    ],
    assumptions: [
      'Industrial machinery classified into Groups 1 to 4 based on driver power and shaft support rigidity (flexible vs rigid support foundations)',
      'Steady-state operation within nominal rated speed and load ranges'
    ],
    limitations: [
      'Applies to field acceptance and condition monitoring of coupled machine trains, not design calculation of single uninstalled shaft components',
      'Generic velocity limits cannot be blindly enforced without foundation stiffness classification'
    ]
  },
  {
    id: 'iso-21940-11',
    code: 'ISO 21940-11:2016 (Amd 1:2022)',
    title: 'Mechanical vibration — Rotor balancing — Part 11: Procedures and tolerances for rotors with rigid behaviour',
    organization: 'ISO',
    edition: '2016 (Amd 1:2022; supersedes ISO 1940-1:2003)',
    status: 'active',
    scope: 'Specifies procedures and methods for determining permissible residual unbalance and balance quality grades (G0.4, G1, G2.5, G6.3, G16, G40) for rotors with rigid behaviour. Stage 11 software implementation verifies specific permissible unbalance e_per = 1000*G/Omega [um or g*mm/kg], permissible residual unbalance U_per = e_per * M [g*mm], and correction plane allocation.',
    supportedCalculations: [
      'permissibleSpecificUnbalance',
      'permissibleResidualUnbalance',
      'balancePlaneAllocation'
    ],
    verificationStatus: 'verified',
    references: [
      'ISO 21940-11:2016(en), International Organization for Standardization',
      'ISO 21940-11:2016/Amd 1:2022(en)',
      'ISO 1940-1:2003 (Historical reference)',
      'ISO/TC 108/SC 2 Measurement and evaluation of mechanical vibration and shock'
    ],
    assumptions: [
      'Rotor exhibits rigid behaviour: operating speed n is sufficiently below first bending critical speed (n < 0.5 nc1) such that shaft elastic deflection does not significantly change dynamic unbalance',
      'Balance quality grade G represents permissible specific unbalance multiplied by operational angular velocity in mm/s (G = e_per * Omega)',
      'Single-plane balancing applies to disc-type rotors where axial width b < 0.2 d; two-plane dynamic balancing applies where b >= 0.2 d',
      'Symmetric 50/50 two-plane unbalance allocation is applied by default when plane distances and rotor CG are not specified'
    ],
    limitations: [
      'Calculates permissible residual unbalance tolerances; does NOT replace physical balancing machine calibration or workshop balance runs',
      'Does not apply to rotors with flexible behaviour operating near or above critical speeds (refer to ISO 21940-12)'
    ]
  },
  {
    id: 'iso-21940-12',
    code: 'ISO 21940-12:2016',
    title: 'Mechanical vibration — Rotor balancing — Part 12: Procedures and tolerances for rotors with flexible behaviour',
    organization: 'ISO',
    edition: '2016 (Supersedes ISO 11342:1998)',
    status: 'active',
    scope: 'Presents requirements and methods for balancing rotors with flexible behaviour, including modal balancing and influence coefficient techniques across multiple critical speeds.',
    supportedCalculations: [],
    verificationStatus: 'unverified',
    references: [
      'ISO 21940-12:2016(en), International Organization for Standardization',
      'ISO 11342:1998 (Historical reference)',
      'ISO/TC 108/SC 2'
    ],
    assumptions: [
      'Rotor operates above or within the resonance band of one or more bending critical speeds, requiring multi-plane modal unbalance correction'
    ],
    limitations: [
      'FLEXIBLE ROTOR BALANCING BOUNDARY: Multi-plane modal balancing and experimental influence coefficient calculations are deferred and intentionally recorded as unverified. The software strictly provides rigid-rotor balance tolerances per ISO 21940-11.'
    ]
  }
];

export function getAllStandards(): EngineeringStandardRecord[] {
  return [...STANDARDS_REGISTRY];
}

export function getStandardById(id: string): EngineeringStandardRecord | undefined {
  return STANDARDS_REGISTRY.find((s) => s.id === id);
}

export function getVerifiedStandards(): EngineeringStandardRecord[] {
  return STANDARDS_REGISTRY.filter((s) => s.verificationStatus === 'verified');
}

export function getReferenceOnlyStandards(): EngineeringStandardRecord[] {
  return STANDARDS_REGISTRY.filter((s) => s.verificationStatus === 'unverified');
}

export function getStandardsByCalculation(calculationType: string): EngineeringStandardRecord[] {
  return STANDARDS_REGISTRY.filter((s) => s.supportedCalculations.includes(calculationType));
}

export function filterStandards(options: StandardFilterOptions): EngineeringStandardRecord[] {
  return STANDARDS_REGISTRY.filter((std) => {
    if (options.organization && options.organization !== 'ALL' && std.organization !== options.organization) {
      return false;
    }
    if (options.verificationStatus && options.verificationStatus !== 'ALL' && std.verificationStatus !== options.verificationStatus) {
      return false;
    }
    if (options.status && options.status !== 'ALL' && std.status !== options.status) {
      return false;
    }
    if (options.searchQuery && options.searchQuery.trim().length > 0) {
      const q = options.searchQuery.toLowerCase();
      const matchCode = std.code.toLowerCase().includes(q);
      const matchTitle = std.title.toLowerCase().includes(q);
      const matchScope = std.scope.toLowerCase().includes(q);
      const matchOrg = std.organization.toLowerCase().includes(q);
      if (!matchCode && !matchTitle && !matchScope && !matchOrg) {
        return false;
      }
    }
    return true;
  });
}
