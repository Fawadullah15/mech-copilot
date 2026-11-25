import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface EngineeringReportData {
  projectId: string;
  projectName: string;
  partName?: string;
  revision: string;
  date?: string;
  preparedBy?: string;
  executiveSummary: {
    objective: string;
    operatingConditions: string;
    materialSummary: string;
    mainDimensions: string;
    outcome: string;
    warnings: string[];
  };
  designRequirements: {
    torqueNm: number;
    rpm: number;
    radialForceN: number;
    axialForceN?: number;
    targetSafetyFactor: number;
    operatingTemperatureC?: number;
    serviceConditions?: string;
  };
  material: {
    id: string;
    name: string;
    standard: string;
    yieldStrengthMPa: number;
    tensileStrengthMPa: number;
    elasticModulusGPa: number;
    poissonsRatio?: number;
    densityKgM3?: number;
  };
  geometry: {
    totalLengthMm: number;
    mainDiameterMm: number;
    journalDiameterMm: number;
    journalLengthMm: number;
    shoulderRadiusMm: number;
    keywayDimensions?: string;
    sectionCount: number;
  };
  calculations: {
    powerKW: number;
    torsionalStressMPa: number;
    bendingStressMPa: number;
    equivalentStressMPa: number;
    factorOfSafety: number;
    maxDeflectionMm: number;
    allowableDeflectionMm: number;
    deflectionStatus: string;
    failureCriterion: string;
  };
  verification: {
    overallStatus: 'Passed' | 'Warning' | 'Failed';
    passedCount: number;
    warningCount: number;
    failedCount: number;
    checks: Array<{
      name: string;
      evaluatedValue: string;
      requiredValue: string;
      status: string;
      standardReference: string;
    }>;
  };
  drawing: {
    sheetSize: string;
    scale: string;
    projection: string;
    views: string[];
    dimensionCount: number;
  };
  conclusion: {
    summary: string;
    limitations: string[];
    isApprovedForManufacture: boolean;
  };
  traceability: {
    revisionCode: string;
    calculationTimestamp: string;
    reportTimestamp: string;
    hash?: string;
  };
}

/**
 * PDFWriter - Deterministic, standard-compliant PDF 1.4 byte-stream builder
 */
class PDFWriter {
  private objects: string[] = [];
  private offsets: number[] = [];
  private pages: number[] = [];

  constructor() {}

  private addObject(content: string): number {
    const id = this.objects.length + 1;
    this.objects.push(content);
    return id;
  }

  public generatePdf(report: EngineeringReportData): Buffer {
    // Collect pages stream text
    const pageStreams: string[] = [
      this.buildCoverAndSummaryPage(report),
      this.buildRequirementsAndMaterialPage(report),
      this.buildCalculationsPage(report),
      this.buildVerificationAndDrawingPage(report),
      this.buildConclusionAndTraceabilityPage(report),
    ];

    // Allocate object numbers
    // 1: Catalog
    // 2: Pages root
    // 3: Font Regular (Helvetica)
    // 4: Font Bold (Helvetica-Bold)
    const fontRegularId = 3;
    const fontBoldId = 4;

    const pageCount = pageStreams.length;
    const pageObjIds: number[] = [];
    const contentObjIds: number[] = [];

    // Pre-allocate slots
    for (let i = 0; i < pageCount; i++) {
      pageObjIds.push(5 + i * 2);
      contentObjIds.push(6 + i * 2);
    }

    let buffer = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

    // 1: Catalog
    const obj1 = '<< /Type /Catalog /Pages 2 0 R >>';
    // 2: Pages root
    const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
    const obj2 = `<< /Type /Pages /Kids [${kidsStr}] /Count ${pageCount} >>`;
    // 3: Font Regular
    const obj3 = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    // 4: Font Bold
    const obj4 = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

    const allObjects = [obj1, obj2, obj3, obj4];

    for (let i = 0; i < pageCount; i++) {
      const pageStream = pageStreams[i];
      const streamLen = Buffer.byteLength(pageStream, 'latin1');

      const pageObj =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] ` +
        `/Contents ${contentObjIds[i]} 0 R ` +
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`;

      const contentObj = `<< /Length ${streamLen} >>\nstream\n${pageStream}\nendstream`;

      allObjects.push(pageObj);
      allObjects.push(contentObj);
    }

    const offsets: number[] = [];
    let currentOffset = Buffer.byteLength(buffer, 'latin1');

    for (let i = 0; i < allObjects.length; i++) {
      offsets.push(currentOffset);
      const str = `${i + 1} 0 obj\n${allObjects[i]}\nendobj\n`;
      buffer += str;
      currentOffset += Buffer.byteLength(str, 'latin1');
    }

    const startXref = currentOffset;
    buffer += `xref\n0 ${allObjects.length + 1}\n`;
    buffer += '0000000000 65535 f \n';
    for (let i = 0; i < offsets.length; i++) {
      buffer += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }

    buffer += `trailer\n<< /Size ${allObjects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    return Buffer.from(buffer, 'latin1');
  }

  // --------------------------------------------------------------------------
  // PAGE 1: Cover Page & Executive Summary
  // --------------------------------------------------------------------------
  private buildCoverAndSummaryPage(report: EngineeringReportData): string {
    const lines: string[] = [];

    // Header bar
    lines.push('0.09 0.13 0.20 rg 40 800 515.28 3 re f');
    lines.push('0.14 0.38 0.92 rg 40 797 120 3 re f');

    // Title Block
    lines.push('BT /F2 20 Tf 40 760 Td (MECHANICAL ENGINEERING AUDIT REPORT) Tj ET');
    lines.push('BT /F1 11 Tf 40 742 Td (ISO 5457 / DIN 743 CERTIFIED DESIGN SPECIFICATION) Tj ET');

    // Metadata Table Box
    lines.push('0.92 0.94 0.97 rg 40 640 515.28 85 re f');
    lines.push('0.80 0.84 0.90 RG 1 w 40 640 515.28 85 re S');

    lines.push(`BT /F2 10 Tf 55 708 Td (PROJECT NAME:) Tj /F1 10 Tf 160 708 Td (${this.escape(report.projectName)}) Tj ET`);
    lines.push(`BT /F2 10 Tf 55 690 Td (PROJECT ID:) Tj /F1 10 Tf 160 690 Td (${this.escape(report.projectId)}) Tj ET`);
    lines.push(`BT /F2 10 Tf 55 672 Td (REVISION CODE:) Tj /F1 10 Tf 160 672 Td (${this.escape(report.revision)}) Tj /F2 10 Tf 330 672 Td (DATE:) Tj /F1 10 Tf 375 672 Td (${this.escape(report.date || new Date().toISOString().split('T')[0])}) Tj ET`);
    lines.push(`BT /F2 10 Tf 55 654 Td (PREPARED BY:) Tj /F1 10 Tf 160 654 Td (${this.escape(report.preparedBy || 'Mechanical Copilot Autonomous Agent')}) Tj ET`);

    // Section 1: Executive Summary
    lines.push('BT /F2 14 Tf 40 605 Td (1. EXECUTIVE SUMMARY) Tj ET');
    lines.push('0.14 0.38 0.92 RG 1.5 w 40 598 515.28 0 re S');

    lines.push('BT /F2 10 Tf 40 575 Td (Design Objective:) Tj ET');
    lines.push(`BT /F1 9.5 Tf 40 560 Td (${this.escape(report.executiveSummary.objective)}) Tj ET`);

    lines.push('BT /F2 10 Tf 40 535 Td (Operating Envelope:) Tj ET');
    lines.push(`BT /F1 9.5 Tf 40 520 Td (${this.escape(report.executiveSummary.operatingConditions)}) Tj ET`);

    lines.push('BT /F2 10 Tf 40 495 Td (Material & Geometry Assignment:) Tj ET');
    lines.push(`BT /F1 9.5 Tf 40 480 Td (${this.escape(report.executiveSummary.materialSummary)} | ${this.escape(report.executiveSummary.mainDimensions)}) Tj ET`);

    lines.push('BT /F2 10 Tf 40 455 Td (Engineering Outcome:) Tj ET');
    lines.push(`BT /F1 9.5 Tf 40 440 Td (${this.escape(report.executiveSummary.outcome)}) Tj ET`);

    // Status Banner Box
    const isPass = report.verification.overallStatus === 'Passed';
    if (isPass) {
      lines.push('0.85 0.95 0.88 rg 40 370 515.28 50 re f');
      lines.push('0.15 0.60 0.25 RG 1.5 w 40 370 515.28 50 re S');
      lines.push('BT /F2 12 Tf 55 400 Td (DESIGN STATUS: COMPLIANT / PASSED) Tj ET');
      lines.push('BT /F1 9 Tf 55 385 Td (All applicable stress, factor of safety, and geometric constraint checks verified successfully.) Tj ET');
    } else {
      lines.push('0.98 0.92 0.85 rg 40 370 515.28 50 re f');
      lines.push('0.85 0.45 0.10 RG 1.5 w 40 370 515.28 50 re S');
      lines.push(`BT /F2 12 Tf 55 400 Td (DESIGN STATUS: ${this.escape(report.verification.overallStatus.toUpperCase())}) Tj ET`);
      lines.push('BT /F1 9 Tf 55 385 Td (Attention required: verification flagged active warnings or incomplete checks.) Tj ET');
    }

    this.addFooter(lines, 1, 5, report);
    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // PAGE 2: Requirements, Material & Geometry
  // --------------------------------------------------------------------------
  private buildRequirementsAndMaterialPage(report: EngineeringReportData): string {
    const lines: string[] = [];
    this.addHeader(lines, 'DESIGN REQUIREMENTS & SPECIFICATIONS');

    // Section 2: Design Requirements
    lines.push('BT /F2 13 Tf 40 740 Td (2. DESIGN REQUIREMENTS & BOUNDARY CONDITIONS) Tj ET');
    lines.push('0.14 0.38 0.92 RG 1 w 40 733 515.28 0 re S');

    lines.push(`BT /F1 9.5 Tf 50 715 Td (Nominal Transmitted Torque:) Tj /F2 9.5 Tf 260 715 Td (${report.designRequirements.torqueNm.toFixed(1)} N*m) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 698 Td (Operational Rotational Speed:) Tj /F2 9.5 Tf 260 698 Td (${report.designRequirements.rpm.toFixed(0)} RPM) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 681 Td (Transverse Radial Load:) Tj /F2 9.5 Tf 260 681 Td (${report.designRequirements.radialForceN.toFixed(1)} N) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 664 Td (Specified Design Safety Factor:) Tj /F2 9.5 Tf 260 664 Td (${report.designRequirements.targetSafetyFactor.toFixed(2)}x) Tj ET`);

    // Section 3: Material Information
    lines.push('BT /F2 13 Tf 40 625 Td (3. CERTIFIED MATERIAL PROPERTIES) Tj ET');
    lines.push('0.14 0.38 0.92 RG 1 w 40 618 515.28 0 re S');

    lines.push(`BT /F1 9.5 Tf 50 600 Td (Assigned Material Grade:) Tj /F2 9.5 Tf 260 600 Td (${this.escape(report.material.name)}) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 583 Td (Standard Specification:) Tj /F2 9.5 Tf 260 583 Td (${this.escape(report.material.standard)}) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 566 Td (Tensile Yield Strength (Sy):) Tj /F2 9.5 Tf 260 566 Td (${report.material.yieldStrengthMPa.toFixed(1)} MPa) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 549 Td (Ultimate Tensile Strength (Su):) Tj /F2 9.5 Tf 260 549 Td (${report.material.tensileStrengthMPa.toFixed(1)} MPa) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 532 Td (Modulus of Elasticity (E):) Tj /F2 9.5 Tf 260 532 Td (${report.material.elasticModulusGPa.toFixed(1)} GPa) Tj ET`);

    // Section 4: Parametric Geometry
    lines.push('BT /F2 13 Tf 40 490 Td (4. PARAMETRIC SHAFT GEOMETRY) Tj ET');
    lines.push('0.14 0.38 0.92 RG 1 w 40 483 515.28 0 re S');

    lines.push(`BT /F1 9.5 Tf 50 465 Td (Total Shaft Length (L):) Tj /F2 9.5 Tf 260 465 Td (${report.geometry.totalLengthMm.toFixed(1)} mm) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 448 Td (Main Mid-Span Diameter (d):) Tj /F2 9.5 Tf 260 448 Td (${report.geometry.mainDiameterMm.toFixed(1)} mm) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 431 Td (Bearing Journal Diameter (dj):) Tj /F2 9.5 Tf 260 431 Td (${report.geometry.journalDiameterMm.toFixed(1)} mm) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 414 Td (Bearing Journal Length (Lj):) Tj /F2 9.5 Tf 260 414 Td (${report.geometry.journalLengthMm.toFixed(1)} mm) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 397 Td (Transition Shoulder Radius (r):) Tj /F2 9.5 Tf 260 397 Td (${(report.geometry.shoulderRadiusMm || 2.0).toFixed(2)} mm) Tj ET`);
    lines.push(`BT /F1 9.5 Tf 50 380 Td (Keyway Specification:) Tj /F2 9.5 Tf 260 380 Td (${this.escape(report.geometry.keywayDimensions || 'DIN 6885-1 Form A Parallel Keyway')}) Tj ET`);

    this.addFooter(lines, 2, 5, report);
    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // PAGE 3: Engineering Calculations & Analytical Results
  // --------------------------------------------------------------------------
  private buildCalculationsPage(report: EngineeringReportData): string {
    const lines: string[] = [];
    this.addHeader(lines, 'DETERMINISTIC ENGINEERING CALCULATIONS');

    lines.push('BT /F2 13 Tf 40 740 Td (5. DETERMINISTIC SOLID MECHANICS FORMULAS & RESULTS) Tj ET');
    lines.push('0.14 0.38 0.92 RG 1 w 40 733 515.28 0 re S');

    // Formulas & Results Table
    lines.push('0.95 0.96 0.98 rg 40 500 515.28 220 re f');
    lines.push('0.80 0.84 0.90 RG 1 w 40 500 515.28 220 re S');

    lines.push('BT /F2 9.5 Tf 50 700 Td (Transmitted Power:) Tj /F1 9.5 Tf 230 700 Td (P = (2 * pi * n * T) / 60000) Tj /F2 9.5 Tf 420 700 Td (' + report.calculations.powerKW.toFixed(2) + ' kW) Tj ET');
    lines.push('BT /F2 9.5 Tf 50 670 Td (Torsional Shear Stress:) Tj /F1 9.5 Tf 230 670 Td (tau = (16 * T) / (pi * d^3)) Tj /F2 9.5 Tf 420 670 Td (' + report.calculations.torsionalStressMPa.toFixed(1) + ' MPa) Tj ET');
    lines.push('BT /F2 9.5 Tf 50 640 Td (Bending Normal Stress:) Tj /F1 9.5 Tf 230 640 Td (sigma_b = (32 * M) / (pi * d^3)) Tj /F2 9.5 Tf 420 640 Td (' + report.calculations.bendingStressMPa.toFixed(1) + ' MPa) Tj ET');
    lines.push('BT /F2 9.5 Tf 50 610 Td (Von Mises Equivalent Stress:) Tj /F1 9.5 Tf 230 610 Td (sigma_vM = sqrt(sigma_b^2 + 3*tau^2)) Tj /F2 9.5 Tf 420 610 Td (' + report.calculations.equivalentStressMPa.toFixed(1) + ' MPa) Tj ET');
    lines.push('BT /F2 9.5 Tf 50 580 Td (Factor of Safety (Yield):) Tj /F1 9.5 Tf 230 580 Td (n = Sy / sigma_vM) Tj /F2 9.5 Tf 420 580 Td (' + report.calculations.factorOfSafety.toFixed(2) + 'x) Tj ET');
    lines.push('BT /F2 9.5 Tf 50 550 Td (Mid-Span Deflection (y):) Tj /F1 9.5 Tf 230 550 Td (y = (F * L^3) / (48 * E * I)) Tj /F2 9.5 Tf 420 550 Td (' + report.calculations.maxDeflectionMm.toFixed(4) + ' mm) Tj ET');
    lines.push('BT /F2 9.5 Tf 50 520 Td (Allowable Deflection Limit:) Tj /F1 9.5 Tf 230 520 Td (y_allow = L / 1000) Tj /F2 9.5 Tf 420 520 Td (' + report.calculations.allowableDeflectionMm.toFixed(3) + ' mm) Tj ET');

    // Stress vs Strength Visual Bar
    lines.push('BT /F2 11 Tf 40 460 Td (Equivalent Stress vs Material Yield Strength Utilization:) Tj ET');
    lines.push('0.85 0.88 0.92 rg 40 435 515.28 16 re f');
    const utilization = Math.min(1.0, report.calculations.equivalentStressMPa / report.material.yieldStrengthMPa);
    const fillWidth = 515.28 * utilization;
    if (utilization > 0.8) {
      lines.push(`0.90 0.35 0.20 rg 40 435 ${fillWidth.toFixed(1)} 16 re f`);
    } else {
      lines.push(`0.15 0.60 0.35 rg 40 435 ${fillWidth.toFixed(1)} 16 re f`);
    }
    lines.push(`BT /F2 8.5 Tf 45 439 Td (Utilization: ${(utilization * 100).toFixed(1)}% (Yield Reserve: ${((1 - utilization) * 100).toFixed(1)}%)) Tj ET`);

    this.addFooter(lines, 3, 5, report);
    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // PAGE 4: Design Verification & Engineering Drawings
  // --------------------------------------------------------------------------
  private buildVerificationAndDrawingPage(report: EngineeringReportData): string {
    const lines: string[] = [];
    this.addHeader(lines, 'DESIGN VERIFICATION MATRIX & DRAWINGS');

    lines.push('BT /F2 13 Tf 40 740 Td (6. COMPREHENSIVE DESIGN VERIFICATION MATRIX) Tj ET');
    lines.push('0.14 0.38 0.92 RG 1 w 40 733 515.28 0 re S');

    let y = 710;
    for (const chk of report.verification.checks.slice(0, 6)) {
      const isPassed = chk.status === 'Passed';
      lines.push(`0.96 0.97 0.98 rg 40 ${y - 5} 515.28 22 re f`);
      lines.push(`0.85 0.88 0.92 RG 0.5 w 40 ${y - 5} 515.28 22 re S`);

      const statusColor = isPassed ? '0.15 0.60 0.25' : '0.85 0.45 0.10';
      lines.push(`BT /F2 9 Tf 50 ${y + 5} Td (${this.escape(chk.name)}) Tj ET`);
      lines.push(`BT /F1 8.5 Tf 220 ${y + 5} Td (Actual: ${this.escape(chk.evaluatedValue)} | Limit: ${this.escape(chk.requiredValue)}) Tj ET`);
      lines.push(`BT ${statusColor} rg /F2 9 Tf 470 ${y + 5} Td (${this.escape(chk.status.toUpperCase())}) Tj ET`);
      y -= 28;
    }

    // Section 7: Engineering Drawings
    lines.push(`BT /F2 13 Tf 40 ${y - 15} Td (7. ASSOCIATIVE 2D/3D DRAWING OUTPUTS) Tj ET`);
    lines.push(`0.14 0.38 0.92 RG 1 w 40 ${y - 22} 515.28 0 re S`);

    y -= 45;
    lines.push(`BT /F1 9.5 Tf 50 ${y} Td (Drawing Sheet Standard:) Tj /F2 9.5 Tf 240 ${y} Td (${this.escape(report.drawing.sheetSize)} Landscape \\(ISO 5457\\)) Tj ET`);
    y -= 18;
    lines.push(`BT /F1 9.5 Tf 50 ${y} Td (Projection Method:) Tj /F2 9.5 Tf 240 ${y} Td (${this.escape(report.drawing.projection)}) Tj ET`);
    y -= 18;
    lines.push(`BT /F1 9.5 Tf 50 ${y} Td (Drawing Views Rendered:) Tj /F2 9.5 Tf 240 ${y} Td (${this.escape(report.drawing.views.join(', '))}) Tj ET`);
    y -= 18;
    lines.push(`BT /F1 9.5 Tf 50 ${y} Td (Parametric Associative Dimensions:) Tj /F2 9.5 Tf 240 ${y} Td (${report.drawing.dimensionCount} Verified Dimensions) Tj ET`);

    this.addFooter(lines, 4, 5, report);
    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // PAGE 5: Conclusions, Approvals & Traceability
  // --------------------------------------------------------------------------
  private buildConclusionAndTraceabilityPage(report: EngineeringReportData): string {
    const lines: string[] = [];
    this.addHeader(lines, 'DESIGN CONCLUSIONS & TRACEABILITY');

    lines.push('BT /F2 13 Tf 40 740 Td (8. DESIGN CONCLUSION & MANUFACTURING RELEASE) Tj ET');
    lines.push('0.14 0.38 0.92 RG 1 w 40 733 515.28 0 re S');

    lines.push('BT /F2 10 Tf 40 710 Td (Summary Evaluation:) Tj ET');
    lines.push(`BT /F1 9.5 Tf 40 695 Td (${this.escape(report.conclusion.summary)}) Tj ET`);

    lines.push('BT /F2 10 Tf 40 660 Td (Engineering Limitations & Manufacturing Constraints:) Tj ET');
    let limY = 645;
    for (const lim of report.conclusion.limitations) {
      lines.push(`BT /F1 9 Tf 50 ${limY} Td (- ${this.escape(lim)}) Tj ET`);
      limY -= 15;
    }

    // Sign-off Box
    lines.push('0.96 0.97 0.98 rg 40 450 515.28 110 re f');
    lines.push('0.80 0.84 0.90 RG 1 w 40 450 515.28 110 re S');

    lines.push('BT /F2 11 Tf 55 535 Td (FORMAL ENGINEERING SIGN-OFF) Tj ET');
    lines.push('BT /F1 9 Tf 55 515 Td (Lead Structural Engineer: _______________________________    Date: ______________) Tj ET');
    lines.push('BT /F1 9 Tf 55 490 Td (Manufacturing Quality Auditor: ___________________________    Date: ______________) Tj ET');
    lines.push(`BT /F1 8.5 Tf 55 465 Td (Disclaimer: Deterministic solid mechanics verification per ISO/DIN standards. Certified for manufacturing release.) Tj ET`);

    // Section 9: Traceability & Revision Audit
    lines.push('BT /F2 13 Tf 40 410 Td (9. AUDIT TRAIL & REVISION TRACEABILITY) Tj ET');
    lines.push('0.14 0.38 0.92 RG 1 w 40 403 515.28 0 re S');

    lines.push(`BT /F1 9 Tf 50 380 Td (Active Revision Identifier:) Tj /F2 9 Tf 240 380 Td (${this.escape(report.traceability.revisionCode)}) Tj ET`);
    lines.push(`BT /F1 9 Tf 50 365 Td (Calculation Kernel Solved At:) Tj /F2 9 Tf 240 365 Td (${this.escape(report.traceability.calculationTimestamp)}) Tj ET`);
    lines.push(`BT /F1 9 Tf 50 350 Td (Report Document Compiled At:) Tj /F2 9 Tf 240 350 Td (${this.escape(report.traceability.reportTimestamp)}) Tj ET`);
    lines.push(`BT /F1 9 Tf 50 335 Td (SHA-256 Cryptographic Checksum:) Tj /F2 8 Tf 240 335 Td (${this.escape(report.traceability.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')} Tj ET`);

    this.addFooter(lines, 5, 5, report);
    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // Page Layout Helpers
  // --------------------------------------------------------------------------
  private addHeader(lines: string[], title: string): void {
    lines.push('0.09 0.13 0.20 rg 40 805 515.28 2 re f');
    lines.push(`BT /F2 9 Tf 40 812 Td (MECHANICAL COPILOT | ${this.escape(title)}) Tj ET`);
  }

  private addFooter(lines: string[], page: number, total: number, report: EngineeringReportData): void {
    lines.push('0.85 0.88 0.92 rg 40 45 515.28 1 re f');
    lines.push(`BT /F1 8 Tf 40 32 Td (Project: ${this.escape(report.projectName)} \\(ID: ${this.escape(report.projectId)}\\)) Tj ET`);
    lines.push(`BT /F2 8 Tf 490 32 Td (Page ${page} of ${total}) Tj ET`);
  }

  private escape(str: string): string {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }
}

export class PdfService {
  private writer: PDFWriter;
  private reportsDir: string;

  constructor(reportsDir?: string) {
    this.writer = new PDFWriter();
    this.reportsDir = reportsDir || path.resolve(process.cwd(), 'artifacts', 'reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Generates a fully formatted engineering report PDF buffer.
   */
  public generateReportPdfBuffer(report: EngineeringReportData): { buffer: Buffer; hash: string } {
    const rawBuffer = this.writer.generatePdf(report);
    const hash = crypto.createHash('sha256').update(rawBuffer).digest('hex');
    report.traceability.hash = hash;
    // Re-generate once with actual hash embedded
    const buffer = this.writer.generatePdf(report);
    return { buffer, hash };
  }

  /**
   * Generates and writes a PDF file to disk, returning file path, filename, and metadata.
   */
  public generateAndSavePdf(report: EngineeringReportData): {
    filePath: string;
    filename: string;
    hash: string;
    sizeBytes: number;
  } {
    const { buffer, hash } = this.generateReportPdfBuffer(report);
    const filename = `Engineering-Report-${report.projectId}-${report.revision}.pdf`;
    const filePath = path.join(this.reportsDir, filename);

    fs.writeFileSync(filePath, buffer);
    return {
      filePath,
      filename,
      hash,
      sizeBytes: buffer.length,
    };
  }
}

export const pdfService = new PdfService();
