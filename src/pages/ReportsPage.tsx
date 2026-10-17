import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Check, Download, Printer } from 'lucide-react';
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
  const { activeProject, designParams, selectedMaterial, analysisResults } = useApp();
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

  const [exportNotification, setExportNotification] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleGenerate = () => {
    setGenerating(true);
    setReportReady(false);
    setTimeout(() => {
      setGenerating(false);
      setReportReady(true);
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto animate-fade-in max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2 border-b border-navy-800">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-accent mb-1">
            Documentation & Certification
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">Engineering Design Reports</h1>
          <p className="text-xs lg:text-sm text-gray-400 mt-1">Generate certified calculation sheets and technical specifications.</p>
        </div>
        
        {!generating && !reportReady && (
          <button 
            onClick={handleGenerate}
            className="btn-primary text-xs flex items-center gap-2 py-2 px-4 rounded-lg shadow-md shadow-accent/20 font-bold"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Engineering Report</span>
          </button>
        )}
      </div>

      {exportNotification && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{exportNotification}</span>
        </div>
      )}


      {!generating && !reportReady && (
        <div className="card bg-navy-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Included Sections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REPORT_SECTIONS.map((section) => (
              <label 
                key={section} 
                className="flex items-center gap-3 p-3 rounded bg-navy-900 border border-navy-700 cursor-pointer hover:bg-navy-700 transition-colors"
              >
                <div className={`w-5 h-5 flex items-center justify-center rounded border ${sections[section] ? 'bg-accent border-accent text-white' : 'border-gray-600'}`}>
                  {sections[section] && <Check className="w-3.5 h-3.5" />}
                </div>
                <span className="text-gray-200">{section}</span>
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

      {generating && (
        <div className="card bg-navy-800 p-12 flex flex-col items-center justify-center text-center">
          <FileText className="w-12 h-12 text-accent animate-pulse-slow mb-6" />
          <h3 className="text-xl font-medium text-gray-100 mb-4">Generating report...</h3>
          <div className="w-full max-w-md h-2 bg-navy-950 rounded-full overflow-hidden">
            <div className="h-full bg-accent animate-slide-in" style={{ animationDuration: '2s', animationTimingFunction: 'linear' }}></div>
          </div>
        </div>
      )}

      {reportReady && (
        <div className="animate-slide-in">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
            <span className="text-xs text-slate-400">
              Tip: Select <strong className="text-slate-200">"Save as PDF"</strong> in your browser's print dialog to archive this calculation report.
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrint}
                className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg shadow-sm font-semibold"
                title="Open browser print dialog to print or save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save as PDF</span>
              </button>
              <button 
                onClick={() => setReportReady(false)}
                className="btn-secondary text-xs"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="print-document bg-gray-100 rounded-lg shadow-2xl overflow-hidden text-gray-900 mx-auto border border-gray-300">

            {/* Document Header */}
            <div className="border-b-2 border-gray-300 p-12 pb-8 bg-white">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">Engineering Design Report</h1>
                  <h2 className="text-xl text-gray-600">{activeProject.name}</h2>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>Date: {new Date().toLocaleDateString()}</p>
                  <p>Revision: 1.0</p>
                  <p>Status: {activeProject.status}</p>
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-12 pt-8 bg-white space-y-8">
              {sections['Project Overview'] && (
                <section>
                  <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-accent-dark">1. Project Overview</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Project Name:</span> {activeProject.name}</div>
                    <div><span className="font-semibold">Project ID:</span> {activeProject.id}</div>
                    <div><span className="font-semibold">Type:</span> {activeProject.type}</div>
                    <div className="col-span-2"><span className="font-semibold">Description:</span> {activeProject.description}</div>
                  </div>
                </section>
              )}

              {sections['Design Requirements'] && (
                <section>
                  <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-accent-dark">2. Design Requirements</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Target Shaft Diameter: {designParams.diameter} mm</li>
                    <li>Shaft Length: {designParams.length} mm</li>
                    <li>Applied Torque: {designParams.torque} Nm</li>
                    <li>Applied Force: {designParams.force} N</li>
                    <li>Operating Speed: {designParams.rpm} RPM</li>
                    <li>Required Safety Factor: {designParams.safetyFactor}</li>
                    <li>Operating Temperature: {designParams.temperature}°C</li>
                  </ul>
                </section>
              )}

              {sections['Material Selection'] && (
                <section>
                  <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-accent-dark">3. Material Selection</h3>
                  <div className="text-sm space-y-2">
                    <p><span className="font-semibold">Selected Material:</span> {selectedMaterial.name} ({selectedMaterial.category})</p>
                    <p><span className="font-semibold">Properties:</span></p>
                    <ul className="list-disc pl-5">
                      <li>Yield Strength: {selectedMaterial.yieldStrength} MPa</li>
                      <li>Tensile Strength: {selectedMaterial.tensileStrength} MPa</li>
                      <li>Elastic Modulus: {selectedMaterial.elasticModulus} GPa</li>
                      <li>Density: {selectedMaterial.density} kg/m³</li>
                    </ul>
                    <p><span className="font-semibold">Rationale:</span> {selectedMaterial.description}</p>
                  </div>
                </section>
              )}

              {sections['Engineering Calculations'] && (
                <section>
                  <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-accent-dark">4. Engineering Calculations</h3>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm font-mono space-y-3">
                    <p className="font-bold text-gray-700">// 1. Shaft Torsional Shear Stress</p>
                    <p>τ = 16T / (πd³) = 16({designParams.torque} N·m) / (π({designParams.diameter} mm)³) = {reportCalc.torsion.result.shearStressMPa.toFixed(2)} MPa (Limit: {reportCalc.torsion.result.allowableShearStressMPa?.toFixed(1)} MPa)</p>
                    
                    <p className="mt-4 font-bold text-gray-700">// 2. Maximum Bending Moment & Stress</p>
                    <p>M = F·L / 4 = ({designParams.force} N × {designParams.length} mm) / 4 = {reportCalc.bending.result.bendingMomentNm.toFixed(1)} N·m</p>
                    <p>σ_b = 32M / (πd³) = {reportCalc.bending.result.bendingStressMPa.toFixed(2)} MPa</p>

                    <p className="mt-4 font-bold text-gray-700">// 3. Combined Equivalent Stress (Von Mises)</p>
                    <p>σ_vm = √(σ_b² + 3τ²) = {reportCalc.combinedStress.result.equivalentStressMPa.toFixed(2)} MPa | FoS = {reportCalc.combinedStress.result.factorOfSafety.toFixed(2)}</p>
                    
                    <p className="mt-4 font-bold text-gray-700">// 4. Maximum Centerline Deflection</p>
                    <p>δ_max = F·L³ / (48EI) = {reportCalc.deflection.result.maxDeflectionMm.toFixed(4)} mm (Model: {reportCalc.deflection.model})</p>

                    <p className="mt-4 font-bold text-gray-700">// 5. Power Transmission</p>
                    <p>P = T·ω = {reportCalc.power.result.powerKW.toFixed(2)} kW ({reportCalc.power.result.powerHp.toFixed(1)} hp) @ {designParams.rpm} RPM</p>

                    <div className="pt-2 text-xs text-gray-500 font-sans border-t border-gray-200 mt-3">
                      * {reportCalc.torsion.disclaimer}
                    </div>
                  </div>
                </section>
              )}

              {sections['Analysis Results'] && (
                <section>
                  <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-accent-dark">5. Analysis Results</h3>
                  {analysisResults ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="font-semibold text-gray-500 mb-1">Von Mises Stress</div>
                        <div className="text-lg font-bold">{analysisResults.vonMisesStress.toFixed(1)} MPa</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="font-semibold text-gray-500 mb-1">Factor of Safety</div>
                        <div className={`text-lg font-bold ${analysisResults.factorOfSafety >= designParams.safetyFactor ? 'text-green-600' : 'text-red-600'}`}>
                          {analysisResults.factorOfSafety.toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="font-semibold">Overall Status: </span>
                        <span className={analysisResults.status === 'pass' ? 'text-green-600 font-bold' : analysisResults.status === 'warning' ? 'text-yellow-600 font-bold' : 'text-red-600 font-bold'}>
                          {analysisResults.status.toUpperCase()} - {analysisResults.statusMessage}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm italic text-gray-500">Analysis has not been run for current parameters.</p>
                  )}
                </section>
              )}

              {sections['AI Recommendations'] && (
                <section>
                  <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-accent-dark">6. AI Recommendations</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm">
                    <li>Consider increasing shaft diameter if dynamic loads or fatigue limits are critical concerns over the product lifetime.</li>
                    <li>Adding a fillet radius at section changes can significantly reduce stress concentrations.</li>
                    <li>Current selected material provides adequate strength but may be over-engineered for the application. A low-carbon steel could offer cost savings.</li>
                  </ul>
                </section>
              )}
              
              {sections['Design Assumptions'] && (
                <section>
                  <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-accent-dark">7. Design Assumptions</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Static and steady-state loading conditions</li>
                    <li>Linear elastic isotropic material behavior</li>
                    <li>No stress concentration factors applied in basic calculations</li>
                    <li>Room temperature operation (thermal effects negligible)</li>
                  </ul>
                </section>
              )}

              {sections['Safety Notes'] && (
                <section>
                  <h3 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 text-accent-dark">8. Safety Notes</h3>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-800">
                    <p className="font-bold mb-1">WARNING:</p>
                    <p>This report is computer-generated. All results must be reviewed and verified by a licensed Professional Engineer before implementation in physical prototypes or production components.</p>
                  </div>
                </section>
              )}
            </div>
            
            {/* Footer */}
            <div className="bg-gray-100 p-6 border-t border-gray-300 text-center text-xs text-gray-500">
              Generated by Mechanical Engineering Design Copilot v0.1.0 • {new Date().getFullYear()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
