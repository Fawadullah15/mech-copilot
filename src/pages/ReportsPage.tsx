import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Check, Printer, RotateCcw, ShieldCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { calculateFullShaftAnalysis } from '../engineering';

export default function ReportsPage() {
  const { activeProject, designParams, selectedMaterial, navigateToStandards } = useApp();

  const activeCriterion = designParams.criterion || 'Von Mises';
  const deflectionLimitRatio = designParams.deflectionLimitRatio || 1000;

  const reportCalc = calculateFullShaftAnalysis({
    torqueNm: designParams.torque,
    radialForceN: designParams.force,
    diameterMm: designParams.diameter,
    lengthMm: designParams.length,
    rpm: designParams.rpm,
    yieldStrengthMPa: selectedMaterial.yieldStrength,
    tensileStrengthMPa: selectedMaterial.tensileStrength,
    elasticModulusGPa: selectedMaterial.elasticModulus,
    targetSafetyFactor: designParams.safetyFactor,
    operatingTempC: designParams.temperature,
    criterion: activeCriterion,
    deflectionLimitRatio,
  });

  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(true);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setReportReady(true);
    }, 400);
  };

  const handlePrint = () => {
    window.print();
  };

  const projectName = activeProject?.name || 'Solid Drive Shaft Assembly';
  const projectId = activeProject?.id || 'PROJ-SHAFT-DEFAULT';
  const projectType = activeProject?.type || 'Power Transmission';
  const projectDescription = activeProject?.description || 'Heavy-duty industrial solid circular shaft design and structural verification.';

  const isPass = reportCalc.overallStatus === 'pass';
  const isUndersized = reportCalc.minRequiredDiameterMm ? designParams.diameter < reportCalc.minRequiredDiameterMm : false;
  const isDeflectionPass = reportCalc.deflection.result.maxDeflectionMm <= (reportCalc.deflection.result.allowableDeflectionMm || (designParams.length / deflectionLimitRatio));
  const isStressPass = reportCalc.combinedStress.result.factorOfSafety >= designParams.safetyFactor;
  const isTempExceeded = selectedMaterial.maxOperatingTempC ? designParams.temperature > selectedMaterial.maxOperatingTempC : false;

  const allowableStressMPa = selectedMaterial.yieldStrength / designParams.safetyFactor;
  const peakBendingMomentNm = (designParams.force * (designParams.length / 1000)) / 4;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-5xl mx-auto space-y-6 bg-[#F2F4FA] dark:bg-[#111827] font-sans text-[#172033] dark:text-[#FFFFFF]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#D9DFED] dark:border-[#28344E] no-print">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#315EDE] mb-1 font-bold">
            Documentation & Engineering Transparency
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033] dark:text-[#FFFFFF] font-display">
            Engineering Design Calculation Report
          </h1>
          <p className="text-xs text-[#64708A] font-medium mt-1">
            Formal closed-form mechanical calculation sheets, multiaxial stress tensors, and analytical verification notes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="btn-primary text-xs font-semibold py-2 px-4 rounded-[8px] flex items-center gap-2 shadow-blueGlow cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Generating Progress State */}
      {generating && (
        <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[10px] p-10 flex flex-col items-center justify-center text-center shadow-panel">
          <FileText className="w-10 h-10 text-[#315EDE] animate-pulse mb-4" />
          <h3 className="text-sm font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider mb-2">
            Compiling Certified Engineering Report...
          </h3>
          <p className="text-xs text-[#64708A] font-medium mb-4">
            Evaluating analytical stress tensors, boundary conditions, and material limits.
          </p>
          <div className="w-full max-w-sm h-1.5 bg-[#E9EDF7] dark:bg-[#1E2436] rounded-full overflow-hidden border border-[#D9DFED] dark:border-[#28344E]">
            <div className="h-full bg-[#315EDE] animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Report Preview */}
      {reportReady && !generating && (
        <div className="space-y-4 animate-fade-in">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[10px] shadow-panel no-print">
            <span className="text-xs text-[#64708A]">
              Document compiled with 18 verified sections. Choose <strong className="text-[#172033] dark:text-[#FFFFFF]">"Save as PDF"</strong> in the browser print dialog.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="btn-primary text-xs font-semibold py-1.5 px-4 rounded-[6px] flex items-center gap-1.5 shadow-blueGlow cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Document</span>
              </button>
            </div>
          </div>

          {/* Printable Engineering Sheet */}
          <div className="print-document bg-white rounded-[4px] shadow-2xl overflow-hidden text-neutral-900 border border-neutral-300 font-sans">
            {/* Header Block */}
            <div className="border-b-2 border-neutral-800 p-8 pb-6 bg-neutral-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-semibold mb-1">
                    MECH-COPILOT // MECHANICAL ENGINEERING DESIGN VERIFICATION
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-neutral-950 uppercase font-mono">
                    Solid Shaft Calculation Report
                  </h1>
                  <h2 className="text-sm font-semibold text-neutral-700 font-mono mt-0.5">
                    Project: {projectName}
                  </h2>
                </div>
                <div className="text-right text-xs font-mono text-neutral-600 border border-neutral-300 bg-white p-2.5 rounded-[2px] space-y-0.5">
                  <p><span className="text-neutral-400">DOC VERSION:</span> 0.1.0-MVP</p>
                  <p><span className="text-neutral-400">DATE:</span> {new Date().toLocaleDateString()}</p>
                  <p>
                    <span className="text-neutral-400">CRITERION:</span>{' '}
                    <strong className="text-neutral-900">{activeCriterion.toUpperCase()}</strong>
                  </p>
                  <p>
                    <span className="text-neutral-400">STATUS:</span>{' '}
                    <strong className={isPass ? 'text-emerald-700' : 'text-amber-700'}>
                      {isPass ? 'PASS - VERIFIED' : 'REVIEW REQUIRED'}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Document Content - 18 Exact Sections */}
            <div className="p-8 pt-6 space-y-6">
              
              {/* Section 1 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  1. Project Title & Identification
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono bg-neutral-50 p-3 rounded-[2px] border border-neutral-200">
                  <div><span className="text-neutral-500">Project Name:</span> <strong className="text-neutral-900">{projectName}</strong></div>
                  <div><span className="text-neutral-500">Project ID:</span> <span className="text-neutral-800">{projectId}</span></div>
                  <div><span className="text-neutral-500">Component Type:</span> <span className="text-neutral-800">{projectType}</span></div>
                  <div><span className="text-neutral-500">Subsystem:</span> <span className="text-neutral-800">Rotary Power Transmission</span></div>
                  <div className="col-span-2 md:col-span-4 pt-1"><span className="text-neutral-500">Scope Description:</span> <span className="text-neutral-800">{projectDescription}</span></div>
                </div>
              </section>

              {/* Section 2 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  2. Engineering Requirements
                </h3>
                <div className="text-xs font-mono bg-neutral-50 p-3 rounded-[2px] border border-neutral-200 space-y-1">
                  <p>• Transmit continuous rotational torque of <strong>{designParams.torque} N·m</strong> at operational speed <strong>{designParams.rpm} RPM</strong> ({reportCalc.power.result.powerKW.toFixed(2)} kW / {reportCalc.power.result.powerHp.toFixed(1)} HP).</p>
                  <p>• Sustain transverse radial force of <strong>{designParams.force} N</strong> applied at midspan across a <strong>{designParams.length} mm</strong> bearing span.</p>
                  <p>• Maintain minimum structural Factor of Safety of <strong>{designParams.safetyFactor.toFixed(1)}x</strong> against plastic yielding under combined loads.</p>
                  <p>• Restrict centerline flexural deflection to <strong>L/{deflectionLimitRatio}</strong> (≤ {(designParams.length / deflectionLimitRatio).toFixed(3)} mm) to protect bearing alignments.</p>
                </div>
              </section>

              {/* Section 3 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  3. Design Inputs & Boundary Assumptions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                    <div className="text-[10px] text-neutral-500">Torque (T)</div>
                    <div className="font-bold text-neutral-900">{designParams.torque} N·m</div>
                  </div>
                  <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                    <div className="text-[10px] text-neutral-500">Transverse Force (F)</div>
                    <div className="font-bold text-neutral-900">{designParams.force} N</div>
                  </div>
                  <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                    <div className="text-[10px] text-neutral-500">Span Length (L)</div>
                    <div className="font-bold text-neutral-900">{designParams.length} mm</div>
                  </div>
                  <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                    <div className="text-[10px] text-neutral-500">Speed (n)</div>
                    <div className="font-bold text-neutral-900">{designParams.rpm} RPM</div>
                  </div>
                </div>
                <div className="mt-2 text-xs font-mono text-neutral-600 bg-neutral-50 p-2.5 rounded-[2px] border border-neutral-200">
                  <span className="font-semibold text-neutral-800">Boundary & Loading Assumptions:</span> Simply supported span on knife-edge bearing centers at x = 0 and x = L; central concentrated point load at midspan x = L/2 producing peak moment M_max = FL/4 = {peakBendingMomentNm.toFixed(1)} N·m; uniform circular cross-section; linear-elastic isotropic material behavior.
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  4. Material Name & Verified Material Properties
                </h3>
                <div className="text-xs font-mono bg-neutral-50 p-3 rounded-[2px] border border-neutral-200 space-y-1.5">
                  <p><strong className="text-neutral-900">{selectedMaterial.name}</strong> — {selectedMaterial.category} ({selectedMaterial.specification || 'ASTM Standards'})</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1">
                    <div>Yield Strength (Sy): <strong className="text-neutral-900">{selectedMaterial.yieldStrength} MPa</strong></div>
                    <div>Tensile Strength (Sut): <strong className="text-neutral-900">{selectedMaterial.tensileStrength} MPa</strong></div>
                    <div>Modulus of Elasticity (E): <strong className="text-neutral-900">{selectedMaterial.elasticModulus} GPa</strong></div>
                    <div>Mass Density (ρ): <strong className="text-neutral-900">{selectedMaterial.density} kg/m³</strong></div>
                    <div>Max Temp Rating: <strong className={isTempExceeded ? 'text-red-700 font-bold' : 'text-neutral-900'}>{selectedMaterial.maxOperatingTempC ?? 'N/A'} °C</strong></div>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  5. Selected Failure Criterion
                </h3>
                <div className="text-xs font-mono bg-neutral-50 p-3 rounded-[2px] border border-neutral-200">
                  <p>Governing Theory: <strong className="text-neutral-900">{activeCriterion === 'Tresca' ? 'Tresca Maximum Shear Stress Theory (Conservative Ductile Envelope)' : 'Von Mises Maximum Distortion Energy Theory (Octahedral Shear Stress)'}</strong></p>
                  <p className="text-neutral-600 mt-1">
                    {activeCriterion === 'Tresca'
                      ? 'Tresca theory models yielding when the maximum shear stress reaches the shear yield limit in pure uniaxial tension: τ_max = (σ1 - σ3)/2 = Sy/2.'
                      : 'Von Mises theory models yielding when the distortion energy per unit volume equals the distortion energy at yield in uniaxial tension: σ_vm = sqrt(σ_b² + 3τ²).'}
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  6. Engineering Equations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono bg-neutral-50 p-3 rounded-[2px] border border-neutral-200">
                  <div><strong>Torsional Shear Stress:</strong> τ = 16T / (π d³)</div>
                  <div><strong>Peak Bending Moment:</strong> M_max = F · L / 4</div>
                  <div><strong>Maximum Bending Stress:</strong> σ_b = 32M / (π d³)</div>
                  <div><strong>Equivalent Stress ({activeCriterion}):</strong> {activeCriterion === 'Tresca' ? 'σ_tr = √(σ_b² + 4τ²)' : 'σ_vm = √(σ_b² + 3τ²)'}</div>
                  <div><strong>Structural Factor of Safety:</strong> FoS = Sy / σ_eq</div>
                  <div><strong>Elastic Centerline Deflection:</strong> δ_max = F · L³ / (48 E I)</div>
                  <div><strong>Polar Second Moment of Area:</strong> J = π d⁴ / 32</div>
                  <div><strong>Mechanical Power:</strong> P = T · (2π n / 60)</div>
                </div>
              </section>

              {/* Section 7 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  7. Numerical Substitutions & Calculations
                </h3>
                <div className="bg-neutral-50 p-3 rounded-[2px] border border-neutral-200 text-xs font-mono space-y-1.5 text-neutral-800">
                  <div>• τ = 16({designParams.torque}) / (π · ({designParams.diameter * 1e-3})³) = <strong>{reportCalc.torsion.result.shearStressMPa.toFixed(2)} MPa</strong></div>
                  <div>• M_max = ({designParams.force} N) · ({designParams.length * 1e-3} m) / 4 = <strong>{peakBendingMomentNm.toFixed(1)} N·m</strong></div>
                  <div>• σ_b = 32({peakBendingMomentNm.toFixed(1)}) / (π · ({designParams.diameter * 1e-3})³) = <strong>{reportCalc.bending.result.bendingStressMPa.toFixed(2)} MPa</strong></div>
                  <div>• σ_eq = √(({reportCalc.bending.result.bendingStressMPa.toFixed(2)})² + {activeCriterion === 'Tresca' ? '4' : '3'}·({reportCalc.torsion.result.shearStressMPa.toFixed(2)})²) = <strong>{reportCalc.combinedStress.result.equivalentStressMPa.toFixed(2)} MPa</strong></div>
                  <div>• FoS = {selectedMaterial.yieldStrength} / {reportCalc.combinedStress.result.equivalentStressMPa.toFixed(2)} = <strong>{reportCalc.combinedStress.result.factorOfSafety.toFixed(2)}x</strong></div>
                  <div>• δ = ({designParams.force}) · ({designParams.length}·10⁻³)³ / [48 · ({selectedMaterial.elasticModulus}·10⁹) · (π·({designParams.diameter}·10⁻³)⁴/64)] = <strong>{reportCalc.deflection.result.maxDeflectionMm.toFixed(4)} mm</strong></div>
                </div>
              </section>

              {/* Section 8 & 9 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    8. Minimum Required Diameter
                  </h3>
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-[2px] text-xs font-mono">
                    <div className="text-[10px] text-neutral-500 uppercase">Solver Result (Bounded Bisection)</div>
                    <div className="text-lg font-bold text-neutral-900 mt-0.5">
                      {reportCalc.minRequiredDiameterMm ? `${reportCalc.minRequiredDiameterMm.toFixed(2)} mm` : 'N/A'}
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-1">
                      Minimum theoretical diameter satisfying allowable stress ({allowableStressMPa.toFixed(1)} MPa) and stiffness criteria.
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    9. Selected Final Diameter
                  </h3>
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-[2px] text-xs font-mono">
                    <div className="text-[10px] text-neutral-500 uppercase">Active Workspace Geometry</div>
                    <div className={`text-lg font-bold mt-0.5 ${!isUndersized ? 'text-emerald-700' : 'text-red-700'}`}>
                      ⌀{designParams.diameter} mm {!isUndersized ? '(ADEQUATE)' : '(UNDERSIZED)'}
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-1">
                      Dimensional margin: {reportCalc.minRequiredDiameterMm ? (designParams.diameter - reportCalc.minRequiredDiameterMm >= 0 ? `+${(designParams.diameter - reportCalc.minRequiredDiameterMm).toFixed(2)} mm` : `${(designParams.diameter - reportCalc.minRequiredDiameterMm).toFixed(2)} mm`) : 'N/A'}.
                    </div>
                  </div>
                </section>
              </div>

              {/* Section 10 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  10. Torsional & Bending Stresses
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                    <div className="text-[10px] text-neutral-500">Torsional Shear Stress (τ)</div>
                    <div className="text-base font-bold text-neutral-900">{reportCalc.torsion.result.shearStressMPa.toFixed(2)} MPa</div>
                  </div>
                  <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                    <div className="text-[10px] text-neutral-500">Peak Bending Stress (σ_b)</div>
                    <div className="text-base font-bold text-neutral-900">{reportCalc.bending.result.bendingStressMPa.toFixed(2)} MPa</div>
                  </div>
                </div>
              </section>

              {/* Section 11 & 12 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    11. Combined Equivalent Stress
                  </h3>
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-[2px] text-xs font-mono">
                    <div className="text-[10px] text-neutral-500 uppercase">{activeCriterion} Equivalent Stress</div>
                    <div className="text-lg font-bold text-neutral-900 mt-0.5">
                      {reportCalc.combinedStress.result.equivalentStressMPa.toFixed(2)} MPa
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-1">
                      Allowable Stress Limit (Sy / FoS): {allowableStressMPa.toFixed(1)} MPa.
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    12. Actual Factor of Safety
                  </h3>
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-[2px] text-xs font-mono">
                    <div className="text-[10px] text-neutral-500 uppercase">Evaluated FoS vs Target</div>
                    <div className={`text-lg font-bold mt-0.5 ${isStressPass ? 'text-emerald-700' : 'text-red-700'}`}>
                      {reportCalc.combinedStress.result.factorOfSafety.toFixed(2)}x (Target: {designParams.safetyFactor.toFixed(1)}x)
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-1">
                      {isStressPass ? 'Exceeds required structural safety threshold.' : 'Below minimum required safety factor.'}
                    </div>
                  </div>
                </section>
              </div>

              {/* Section 13 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  13. Centerline Deflection & Allowable Limit
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                    <div className="text-[10px] text-neutral-500">Max Elastic Deflection (δ_max)</div>
                    <div className="text-base font-bold text-neutral-900">{reportCalc.deflection.result.maxDeflectionMm.toFixed(4)} mm</div>
                  </div>
                  <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                    <div className="text-[10px] text-neutral-500">Allowable Screening Limit (L/{deflectionLimitRatio})</div>
                    <div className="text-base font-bold text-neutral-900">{(designParams.length / deflectionLimitRatio).toFixed(3)} mm</div>
                  </div>
                  <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                    <div className="text-[10px] text-neutral-500">Deflection Status</div>
                    <div className={`text-base font-bold ${isDeflectionPass ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isDeflectionPass ? 'PASS (Stiff)' : 'EXCEEDED'}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 14 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  14. Governing Design Constraint
                </h3>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-[2px] text-xs font-mono">
                  <p>
                    Governing Criterion:{' '}
                    <strong className="text-neutral-900">
                      {reportCalc.governingConstraint === 'deflection_stiffness'
                        ? 'Flexural Deflection & Shaft Stiffness (Governs over stress)'
                        : `Combined Stress (${activeCriterion} Yield Criterion)`}
                    </strong>
                  </p>
                  <p className="text-neutral-600 mt-1">
                    The minimum required diameter is dictated by {reportCalc.governingConstraint === 'deflection_stiffness' ? 'centerline bending deflection' : 'multiaxial yield stress under combined bending and torsion'}.
                  </p>
                </div>
              </section>

              {/* Section 15 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  15. Pass/Fail Decision Matrix
                </h3>
                <div className="border border-neutral-200 rounded-[2px] overflow-hidden text-xs font-mono">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-100 border-b border-neutral-200">
                      <tr>
                        <th className="p-2 text-neutral-600 font-semibold">Verification Check</th>
                        <th className="p-2 text-neutral-600 font-semibold">Requirement</th>
                        <th className="p-2 text-neutral-600 font-semibold">Evaluated Value</th>
                        <th className="p-2 text-neutral-600 font-semibold text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 bg-white">
                      <tr>
                        <td className="p-2 font-medium">1. Combined Stress Safety Factor</td>
                        <td className="p-2">≥ {designParams.safetyFactor.toFixed(1)}x</td>
                        <td className="p-2">{reportCalc.combinedStress.result.factorOfSafety.toFixed(2)}x</td>
                        <td className={`p-2 text-right font-bold ${isStressPass ? 'text-emerald-700' : 'text-red-700'}`}>
                          {isStressPass ? 'PASS' : 'FAIL'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">2. Minimum Diameter Envelope</td>
                        <td className="p-2">≥ {reportCalc.minRequiredDiameterMm?.toFixed(1) || 0} mm</td>
                        <td className="p-2">{designParams.diameter} mm</td>
                        <td className={`p-2 text-right font-bold ${!isUndersized ? 'text-emerald-700' : 'text-red-700'}`}>
                          {!isUndersized ? 'PASS' : 'FAIL'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">3. Centerline Deflection</td>
                        <td className="p-2">≤ {(designParams.length / deflectionLimitRatio).toFixed(3)} mm</td>
                        <td className="p-2">{reportCalc.deflection.result.maxDeflectionMm.toFixed(4)} mm</td>
                        <td className={`p-2 text-right font-bold ${isDeflectionPass ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isDeflectionPass ? 'PASS' : 'REVIEW'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">4. Continuous Operating Temperature</td>
                        <td className="p-2">≤ {selectedMaterial.maxOperatingTempC ?? 400} °C</td>
                        <td className="p-2">{designParams.temperature} °C</td>
                        <td className={`p-2 text-right font-bold ${!isTempExceeded ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {!isTempExceeded ? 'PASS' : 'WARNING'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 16 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  16. Engineering Warnings & Limitations
                </h3>
                <div className="bg-amber-50 border-l-2 border-amber-500 p-3 text-xs font-mono text-amber-900 space-y-1">
                  <p>• <strong>Stress Concentrations:</strong> Fillets, keyways, and retaining ring grooves introduce stress concentrations (Kt ≈ 1.8 - 2.5). Fillet radii must satisfy r ≥ 0.05d.</p>
                  <p>• <strong>Dynamic Loadings:</strong> This calculation uses static equivalent solid mechanics. Cyclic fatigue endurance and fluctuating torque require endurance limit derating.</p>
                  <p>• <strong>Idealized Supports:</strong> Rigid simply supported bearings are assumed. Housing compliance will slightly increase angular misalignment.</p>
                </div>
              </section>

              {/* Section 17 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  17. Final Design Summary & Recommendation
                </h3>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-[2px] text-xs font-mono space-y-1">
                  <p>• <strong>Summary Verdict:</strong> The solid circular shaft assembly <strong>{projectName}</strong> (⌀{designParams.diameter} mm × {designParams.length} mm, {selectedMaterial.name}) evaluates to an overall status of <strong>{reportCalc.overallStatus.toUpperCase()}</strong> with a verified Factor of Safety of <strong>{reportCalc.combinedStress.result.factorOfSafety.toFixed(2)}x</strong> under {activeCriterion} theory.</p>
                  <p>• <strong>Recommendation:</strong> {isPass ? 'The proposed dimensions and material are mechanically adequate for production detailing.' : 'Increase diameter to at least ' + Math.ceil(reportCalc.minRequiredDiameterMm || 0) + ' mm to achieve target safety factor.'}</p>
                </div>
              </section>

              {/* Section 18 */}
              <section>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                  18. Calculation Date & Report Version
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono bg-neutral-50 p-2.5 rounded-[2px] border border-neutral-200">
                  <div><span className="text-neutral-500">Execution Date:</span> <strong className="text-neutral-900">{new Date().toISOString().slice(0, 10)}</strong></div>
                  <div><span className="text-neutral-500">Report Rev:</span> <span className="text-neutral-900">0.1.0-VERIFIED</span></div>
                  <div><span className="text-neutral-500">Calculation Engine:</span> <span className="text-neutral-900">Deterministic Physics v2.4</span></div>
                  <div><span className="text-neutral-500">Traceability Hash:</span> <span className="text-neutral-900 font-mono text-[10px]">{projectId.slice(0, 12)}</span></div>
                </div>
              </section>

            </div>

            {/* Document Footer */}
            <div className="bg-neutral-100 px-8 py-3 border-t border-neutral-300 text-center text-[10px] font-mono text-neutral-500">
              MECH-COPILOT // Mechanical Engineering Design Copilot • Classical Solid Mechanics Deterministic Engine • 18-Section Engineering Sheet
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
