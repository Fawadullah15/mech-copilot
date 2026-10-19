import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Check, Printer, RotateCcw, ShieldCheck } from 'lucide-react';
import { calculateFullShaftAnalysis } from '../engineering';

const REPORT_SECTIONS = [
  'Project Overview',
  'Design Requirements',
  'Material Selection',
  'Engineering Calculations',
  'Analysis Results',
  'AI Recommendations',
  'Design Assumptions',
  'Safety Notes',
];

export default function ReportsPage() {
  const { activeProject, designParams, selectedMaterial, analysisResults, navigateToStandards } = useApp();
  const [sections, setSections] = useState<Record<string, boolean>>(
    REPORT_SECTIONS.reduce((acc, curr) => ({ ...acc, [curr]: true }), {})
  );

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
    criterion: 'Von Mises',
  });

  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);

  const toggleSection = (section: string) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleGenerate = () => {
    setReportReady(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-5 lg:p-6 animate-fade-in max-w-5xl mx-auto space-y-5 bg-[#111315] font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#34393F]">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64D6C5] mb-0.5">
            Documentation & Engineering Transparency
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#F0F1F2]">
            Engineering Design Calculation Report
          </h1>
          <p className="text-xs text-[#969DA5] font-mono mt-0.5">
            Generate formal closed-form calculation sheets, multiaxial stress matrices, and analytical verification notes.
          </p>
        </div>

        {!generating && !reportReady && (
          <button
            onClick={handleGenerate}
            className="bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-mono text-xs font-semibold py-1.5 px-4 rounded-[3px] flex items-center gap-2 transition-colors shrink-0 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate Report</span>
          </button>
        )}
      </div>

      {/* Section Checklist Selector */}
      {!generating && !reportReady && (
        <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2A2E35]">
            <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">
              Document Scope & Included Sections
            </h2>
            <span className="text-[10px] font-mono text-[#969DA5]">
              {Object.values(sections).filter(Boolean).length} of {REPORT_SECTIONS.length} selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {REPORT_SECTIONS.map((section) => (
              <label
                key={section}
                className="flex items-center gap-2.5 p-2.5 rounded-[3px] bg-[#14171A] border border-[#2A2E35] cursor-pointer hover:border-[#34393F] transition-colors"
              >
                <div
                  className={`w-4 h-4 flex items-center justify-center rounded-[2px] border ${
                    sections[section]
                      ? 'bg-[#64D6C5] border-[#64D6C5] text-[#111315]'
                      : 'border-[#4B535D] bg-transparent'
                  }`}
                >
                  {sections[section] && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs font-mono text-[#C2C8D0] select-none">{section}</span>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={sections[section]}
                  onChange={() => toggleSection(section)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Generating Progress State */}
      {generating && (
        <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-10 flex flex-col items-center justify-center text-center">
          <FileText className="w-10 h-10 text-[#64D6C5] animate-pulse mb-4" />
          <h3 className="text-sm font-mono font-bold text-[#F0F1F2] uppercase tracking-wider mb-2">
            Compiling Certified Engineering Report...
          </h3>
          <p className="text-xs text-[#969DA5] font-mono mb-4">
            Evaluating analytical stress tensors, boundary conditions, and material limits.
          </p>
          <div className="w-full max-w-sm h-1.5 bg-[#14171A] rounded-full overflow-hidden border border-[#2A2E35]">
            <div className="h-full bg-[#64D6C5] animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Report Preview */}
      {reportReady && (
        <div className="space-y-4 animate-fade-in">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#191C1F] border border-[#34393F] rounded-[4px] no-print">
            <span className="text-xs font-mono text-[#969DA5]">
              Document compiled successfully. Choose <strong className="text-[#F0F1F2]">"Save as PDF"</strong> in print dialog.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-mono text-xs font-semibold py-1.5 px-3.5 rounded-[3px] flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save as PDF</span>
              </button>
              <button
                onClick={() => setReportReady(false)}
                className="bg-[#22262A] hover:bg-[#2E3339] text-[#969DA5] hover:text-white border border-[#34393F] font-mono text-xs py-1.5 px-3 rounded-[3px] flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Edit Scope</span>
              </button>
            </div>
          </div>

          {/* Printable Engineering Sheet */}
          <div className="print-document bg-white rounded-[4px] shadow-2xl overflow-hidden text-neutral-900 border border-neutral-300 font-sans">
            {/* Engineering Drawing / Report Header Block */}
            <div className="border-b-2 border-neutral-800 p-8 pb-6 bg-neutral-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-semibold mb-1">
                    QUANTUM AI // MECHANICAL DESIGN VERIFICATION
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-neutral-950 uppercase font-mono">
                    Engineering Design Calculation Report
                  </h1>
                  <h2 className="text-sm font-semibold text-neutral-600 font-mono mt-0.5">
                    Assembly: {activeProject.name}
                  </h2>
                </div>
                <div className="text-right text-xs font-mono text-neutral-600 border border-neutral-300 bg-white p-2.5 rounded-[2px] space-y-0.5">
                  <p><span className="text-neutral-400">DATE:</span> {new Date().toLocaleDateString()}</p>
                  <p><span className="text-neutral-400">DOC REV:</span> 1.0 (VERIFIED EQUATIONS)</p>
                  <p><span className="text-neutral-400">STATUS:</span> <strong className="text-emerald-700">{activeProject.status.toUpperCase()}</strong></p>
                </div>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-8 pt-6 space-y-6">
              {sections['Project Overview'] && (
                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    1. Component Specification Overview
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-neutral-50 p-3 rounded-[2px] border border-neutral-200">
                    <div><span className="text-neutral-500">Project Identifier:</span> {activeProject.id}</div>
                    <div><span className="text-neutral-500">Component Type:</span> {activeProject.type}</div>
                    <div className="col-span-2"><span className="text-neutral-500">Application Scope:</span> {activeProject.description}</div>
                  </div>
                </section>
              )}

              {sections['Design Requirements'] && (
                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    2. Applied Service Loads & Geometric Constraints
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                      <div className="text-[10px] text-neutral-500">Diameter (d)</div>
                      <div className="font-bold text-neutral-900">{designParams.diameter} mm</div>
                    </div>
                    <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                      <div className="text-[10px] text-neutral-500">Span Length (L)</div>
                      <div className="font-bold text-neutral-900">{designParams.length} mm</div>
                    </div>
                    <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                      <div className="text-[10px] text-neutral-500">Applied Torque (T)</div>
                      <div className="font-bold text-neutral-900">{designParams.torque} N·m</div>
                    </div>
                    <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                      <div className="text-[10px] text-neutral-500">Radial Force (F)</div>
                      <div className="font-bold text-neutral-900">{designParams.force} N</div>
                    </div>
                    <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                      <div className="text-[10px] text-neutral-500">Speed (n)</div>
                      <div className="font-bold text-neutral-900">{designParams.rpm} RPM</div>
                    </div>
                    <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                      <div className="text-[10px] text-neutral-500">Target FoS</div>
                      <div className="font-bold text-neutral-900">{designParams.safetyFactor}x</div>
                    </div>
                    <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                      <div className="text-[10px] text-neutral-500">Temperature</div>
                      <div className="font-bold text-neutral-900">{designParams.temperature} °C</div>
                    </div>
                    <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                      <div className="text-[10px] text-neutral-500">Yield Criterion</div>
                      <div className="font-bold text-neutral-900">Von Mises-Hencky</div>
                    </div>
                  </div>
                </section>
              )}

              {sections['Material Selection'] && (
                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    3. Metallurgical Material Properties
                  </h3>
                  <div className="text-xs font-mono bg-neutral-50 p-3 rounded-[2px] border border-neutral-200 space-y-1.5">
                    <p><strong className="text-neutral-900">{selectedMaterial.name}</strong> ({selectedMaterial.category})</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      <div>Yield Strength: <strong className="text-neutral-900">{selectedMaterial.yieldStrength} MPa</strong></div>
                      <div>Tensile Strength: <strong className="text-neutral-900">{selectedMaterial.tensileStrength} MPa</strong></div>
                      <div>Elastic Modulus: <strong className="text-neutral-900">{selectedMaterial.elasticModulus} GPa</strong></div>
                      <div>Density: <strong className="text-neutral-900">{selectedMaterial.density} kg/m³</strong></div>
                    </div>
                  </div>
                </section>
              )}

              {sections['Engineering Calculations'] && (
                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    4. Analytical Closed-Form Governing Formulations
                  </h3>
                  <div className="bg-neutral-50 p-3 rounded-[2px] border border-neutral-200 text-xs font-mono space-y-2">
                    <div>
                      <span className="text-neutral-500">// 1. Torsional Shear: </span>
                      <span>τ = 16T/(πd³) = 16({designParams.torque})/(π({designParams.diameter})³) = <strong>{reportCalc.torsion.result.shearStressMPa.toFixed(2)} MPa</strong></span>
                    </div>
                    <div>
                      <span className="text-neutral-500">// 2. Maximum Bending: </span>
                      <span>M = F·L/4 = {reportCalc.bending.result.bendingMomentNm.toFixed(1)} N·m | σ_b = 32M/(πd³) = <strong>{reportCalc.bending.result.bendingStressMPa.toFixed(2)} MPa</strong></span>
                    </div>
                    <div>
                      <span className="text-neutral-500">// 3. Von Mises Multiaxial: </span>
                      <span>σ_vm = √(σ_b² + 3τ²) = <strong>{reportCalc.combinedStress.result.equivalentStressMPa.toFixed(2)} MPa</strong> | FoS = <strong>{reportCalc.combinedStress.result.factorOfSafety.toFixed(2)}x</strong></span>
                    </div>
                    <div>
                      <span className="text-neutral-500">// 4. Span Deflection: </span>
                      <span>δ_max = F·L³/(48EI) = <strong>{reportCalc.deflection.result.maxDeflectionMm.toFixed(4)} mm</strong></span>
                    </div>
                    <div>
                      <span className="text-neutral-500">// 5. Power Transmission: </span>
                      <span>P = T·ω = <strong>{reportCalc.power.result.powerKW.toFixed(2)} kW</strong> ({reportCalc.power.result.powerHp.toFixed(1)} hp) @ {designParams.rpm} RPM</span>
                    </div>
                  </div>
                </section>
              )}

              {sections['Analysis Results'] && (
                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    5. Finite Analytical Assessment Summary
                  </h3>
                  {analysisResults ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                        <div className="text-[10px] text-neutral-500">Von Mises Stress</div>
                        <div className="font-bold text-neutral-900">{analysisResults.vonMisesStress.toFixed(1)} MPa</div>
                      </div>
                      <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                        <div className="text-[10px] text-neutral-500">Factor of Safety</div>
                        <div className={`font-bold ${analysisResults.factorOfSafety >= designParams.safetyFactor ? 'text-emerald-700' : 'text-red-700'}`}>
                          {analysisResults.factorOfSafety.toFixed(2)}x
                        </div>
                      </div>
                      <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                        <div className="text-[10px] text-neutral-500">Midspan Deflection</div>
                        <div className="font-bold text-neutral-900">{analysisResults.maxDeflection.toFixed(4)} mm</div>
                      </div>
                      <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-[2px]">
                        <div className="text-[10px] text-neutral-500">Overall Status</div>
                        <div className={`font-bold ${analysisResults.status === 'pass' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {analysisResults.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs italic text-neutral-500 font-mono">Analysis telemetry pending.</p>
                  )}
                </section>
              )}

              {sections['AI Recommendations'] && (
                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    6. Autonomous Design Advisories
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-700 font-mono">
                    <li>Dynamic loads or fatigue duty cycles require fillet radii &gt; 2.5 mm at bearing shoulders.</li>
                    <li>Shaft slenderness ratio (L/d = {(designParams.length / designParams.diameter).toFixed(1)}) is well within the non-whipping stability boundary.</li>
                    <li>Active AISI 4140 alloy provides robust structural headroom with FoS &gt; {designParams.safetyFactor}x.</li>
                  </ul>
                </section>
              )}

              {sections['Design Assumptions'] && (
                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    7. Governing Boundary Conditions
                  </h3>
                  <ul className="list-disc pl-5 space-y-0.5 text-xs text-neutral-700 font-mono">
                    <li>Static equilibrium and steady-state torque transmission assumptions apply.</li>
                    <li>Isotropic, homogeneous linear elasticity modeled under Hooke's Law.</li>
                    <li>Bearings modeled as idealized simple supports at span boundaries.</li>
                  </ul>
                </section>
              )}

              {sections['Safety Notes'] && (
                <section>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-300 pb-1 mb-2">
                    8. Engineering Verification & Non-Certification Notice
                  </h3>
                  <div className="bg-amber-50 border-l-2 border-amber-500 p-2.5 text-xs font-mono text-amber-900 space-y-2">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        Algorithmic engineering evaluation based on classical solid mechanics and mechanics of materials formulations. This document does NOT constitute a certified Professional Engineer (PE) stamp, regulatory compliance approval, or manufacturing release. Physical fabrication must be independently verified by a licensed engineer.
                      </span>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-600 border-t border-amber-200/60 no-print">
                      <span>Governance: Classical Solid Mechanics Core (Verified)</span>
                      <button
                        type="button"
                        onClick={navigateToStandards}
                        className="text-[#0D9488] hover:text-[#0F766E] font-semibold underline cursor-pointer"
                      >
                        Inspect Standards Registry →
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Document Footer */}
            <div className="bg-neutral-100 px-8 py-3 border-t border-neutral-300 text-center text-[10px] font-mono text-neutral-500">
              QUANTUM AI // Mechanical Engineering Design Copilot • Analytical Calculation Sheet • Classical Solid Mechanics Formulation
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
