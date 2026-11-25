import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Play,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Activity,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  generateStressDistribution,
  generateFatigueCurve,
} from '../data/analysisResults';

export default function AnalysisPage() {
  const { analysisResults, runAnalysis, designParams, setActivePage, isAnalysisRunning } =
    useApp();
  const [isAiExpanded, setIsAiExpanded] = useState(true);

  const stressData = useMemo(() => {
    if (!analysisResults) return [];
    return generateStressDistribution(designParams);
  }, [analysisResults, designParams]);

  const fatigueData = useMemo(() => {
    if (!analysisResults) return [];
    return generateFatigueCurve(designParams);
  }, [analysisResults, designParams]);

  if (!analysisResults) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F2F4FA] dark:bg-[#111827] font-sans">
        <div className="w-14 h-14 bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[10px] flex items-center justify-center mb-4 shadow-panel">
          <Activity className="w-7 h-7 text-[#315EDE]" />
        </div>
        <h2 className="text-base font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider mb-1">
          No Simulation Telemetry Generated
        </h2>
        <p className="text-xs text-[#64708A] max-w-sm mb-6 font-medium">
          Configure geometric dimensions and external loads, then run simulation.
        </p>
        <button
          onClick={() => setActivePage('workspace')}
          className="btn-primary text-xs font-semibold py-2 px-4 rounded-[8px] flex items-center gap-2 shadow-blueGlow"
        >
          <span>Open Design Workspace</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const isPass = analysisResults.status === 'pass';
  const isWarning = analysisResults.status === 'warning';
  const isFail = analysisResults.status === 'fail';

  const formatNumber = (num: number) => {
    if (num >= 1e6) return num.toExponential(2);
    return num.toLocaleString();
  };

  const generateAiSummary = () => {
    if (isPass) {
      return `The design meets all structural safety margins. Calculated peak von Mises stress of ${analysisResults.vonMisesStress} MPa is strictly below the allowable limit (${analysisResults.yieldStrength} MPa yield), providing an effective factor of safety of ${analysisResults.factorOfSafety}x. Central span deflection is verified at ${analysisResults.maxDeflection} mm. High-cycle fatigue model estimates endurance life exceeding ${formatNumber(analysisResults.fatigueLife)} cycles.`;
    }
    if (isWarning) {
      return `The design exhibits marginal structural headroom. Factor of safety is calculated at ${analysisResults.factorOfSafety}x, near your baseline target (${designParams.safetyFactor}x). While von Mises stress (${analysisResults.vonMisesStress} MPa) remains below nominal yield (${analysisResults.yieldStrength} MPa), radial shock loads or torque spikes could induce localized plastic deformation. Consider increasing shaft diameter or selecting higher-grade alloy steel.`;
    }
    return `Critical design criteria failure detected. Calculated factor of safety of ${analysisResults.factorOfSafety}x is strictly below target (${designParams.safetyFactor}x). Combined von Mises stress (${analysisResults.vonMisesStress} MPa) or radial deflection (${analysisResults.maxDeflection} mm) exceeds allowable service thresholds. Immediate geometric redesign or alloy substitution required.`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-[#F2F4FA] dark:bg-[#111827] font-sans text-[#172033] dark:text-[#FFFFFF] max-w-7xl mx-auto">
      {/* CAD Station Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9DFED] dark:border-[#28344E]">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#315EDE] mb-1 font-bold">
            Finite Analytical Telemetry
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033] dark:text-[#FFFFFF] font-display">
            Engineering Stress & Fatigue Analysis
          </h1>
          <p className="text-xs text-[#64708A] font-medium mt-1">
            Multiaxial stress tensor evaluation • S-N fatigue endurance • Beam deflection
          </p>
        </div>
        <button
          onClick={() => runAnalysis()}
          disabled={isAnalysisRunning}
          className="btn-primary text-xs font-semibold py-2 px-4 rounded-[8px] flex items-center gap-2 shadow-blueGlow self-start sm:self-auto shrink-0"
        >
          {isAnalysisRunning ? (
            <span className="animate-pulse">Computing Matrix...</span>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* Status Banner */}
      <div
        className={`px-4 py-3 rounded-[10px] flex items-center justify-between border text-xs font-mono ${
          isPass
            ? 'bg-[#39866B]/10 border-[#39866B]/30 text-[#39866B]'
            : isWarning
            ? 'bg-[#C78B3B]/10 border-[#C78B3B]/30 text-[#C78B3B]'
            : 'bg-[#C4515C]/10 border-[#C4515C]/30 text-[#C4515C]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isPass && <CheckCircle className="w-4 h-4 shrink-0" />}
          {isWarning && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {isFail && <XCircle className="w-4 h-4 shrink-0" />}
          <span className="font-semibold uppercase tracking-wider text-xs">
            {isPass ? 'Design Approved — All Parameters Within Allowable Design Limits' : analysisResults.statusMessage}
          </span>
        </div>
        <span className="text-[11px] opacity-80 uppercase tracking-widest hidden sm:inline">
          Model: {designParams.diameter}mm / {designParams.length}mm / {designParams.torque}N·m
        </span>
      </div>

      {/* Results Telemetry Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-3.5">
        <ResultCard
          label="Von Mises Stress"
          value={analysisResults.vonMisesStress}
          unit="MPa"
          status={
            analysisResults.vonMisesStress < analysisResults.yieldStrength / designParams.safetyFactor
              ? 'pass'
              : 'fail'
          }
          subtext={`Limit: ${(analysisResults.yieldStrength / designParams.safetyFactor).toFixed(1)} MPa`}
        />
        <ResultCard
          label="Yield Strength"
          value={analysisResults.yieldStrength}
          unit="MPa"
          status="info"
          subtext="AISI material constant"
        />
        <ResultCard
          label="Factor of Safety"
          value={analysisResults.factorOfSafety}
          unit="x"
          status={
            analysisResults.factorOfSafety >= designParams.safetyFactor
              ? 'pass'
              : analysisResults.factorOfSafety >= designParams.safetyFactor * 0.9
              ? 'warning'
              : 'fail'
          }
          subtext={`Target: ${designParams.safetyFactor.toFixed(1)}x`}
        />
        <ResultCard
          label="Max Deflection"
          value={analysisResults.maxDeflection}
          unit="mm"
          status={
            analysisResults.maxDeflection < 0.1
              ? 'pass'
              : analysisResults.maxDeflection < 0.5
              ? 'warning'
              : 'fail'
          }
          subtext="Midspan point load"
        />
        <ResultCard
          label="Torque Capacity"
          value={formatNumber(analysisResults.torqueCapacity)}
          unit="N·m"
          status={analysisResults.torqueCapacity > designParams.torque ? 'pass' : 'fail'}
          subtext={`Applied: ${designParams.torque} N·m`}
        />
        <ResultCard
          label="Fatigue Life"
          value={formatNumber(analysisResults.fatigueLife)}
          unit="cycles"
          status={
            analysisResults.fatigueLife >= 1e6
              ? 'pass'
              : analysisResults.fatigueLife >= 1e5
              ? 'warning'
              : 'fail'
          }
          subtext="Basquin model estimate"
        />
      </div>

      {/* Engineering Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stress Distribution */}
        <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[10px] shadow-panel overflow-hidden">
          <div className="bg-[#F8FAFC] dark:bg-[#1E2436] px-4 py-2.5 border-b border-[#D9DFED] dark:border-[#28344E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-[#315EDE]" />
              <h3 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">
                Stress Distribution Along Shaft Axis
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#64708A]">Span: 0 to {designParams.length} mm</span>
          </div>

          <div className="p-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stressData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="#E9EDF7" className="dark:stroke-[#28344E]" strokeDasharray="3 3" />
                <XAxis
                  dataKey="position"
                  stroke="#D9DFED"
                  tick={{ fill: '#64708A', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
                  tickFormatter={(val) => `${val}mm`}
                />
                <YAxis
                  stroke="#D9DFED"
                  tick={{ fill: '#64708A', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D9DFED',
                    borderRadius: 8,
                    fontSize: 11,
                    fontFamily: 'IBM Plex Mono, monospace',
                    color: '#172033',
                    boxShadow: '0 4px 12px rgba(23,32,51,0.08)',
                  }}
                  labelStyle={{ color: '#64708A' }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ color: '#64708A', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', paddingTop: 6 }} />
                <Area
                  type="monotone"
                  dataKey="vonMises"
                  name="Von Mises (MPa)"
                  stroke="#315EDE"
                  fill="#315EDE"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="shear"
                  name="Torsional Shear (MPa)"
                  stroke="#7653C9"
                  fill="#7653C9"
                  fillOpacity={0.12}
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="bending"
                  name="Bending Normal (MPa)"
                  stroke="#2446B8"
                  fill="#2446B8"
                  fillOpacity={0.08}
                  strokeWidth={1.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fatigue Life S-N Curve */}
        <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[10px] shadow-panel overflow-hidden">
          <div className="bg-[#F8FAFC] dark:bg-[#1E2436] px-4 py-2.5 border-b border-[#D9DFED] dark:border-[#28344E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[#7653C9]" />
              <h3 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">
                High-Cycle Fatigue (S-N Wöhler Curve)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#64708A]">Logarithmic Cycles</span>
          </div>

          <div className="p-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fatigueData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="#E9EDF7" className="dark:stroke-[#28344E]" strokeDasharray="3 3" />
                <XAxis
                  dataKey="cycles"
                  scale="log"
                  domain={['dataMin', 'dataMax']}
                  type="number"
                  stroke="#D9DFED"
                  tick={{ fill: '#64708A', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
                  tickFormatter={(val) => val.toExponential(0)}
                />
                <YAxis
                  stroke="#D9DFED"
                  tick={{ fill: '#64708A', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D9DFED',
                    borderRadius: 8,
                    fontSize: 11,
                    fontFamily: 'IBM Plex Mono, monospace',
                    color: '#172033',
                    boxShadow: '0 4px 12px rgba(23,32,51,0.08)',
                  }}
                  labelStyle={{ color: '#64708A' }}
                  itemStyle={{ fontSize: 11 }}
                  labelFormatter={(val) => `${val.toExponential(2)} cycles`}
                />
                <Legend wrapperStyle={{ color: '#64708A', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', paddingTop: 6 }} />
                <ReferenceLine
                  y={fatigueData[fatigueData.length - 1]?.stress || 0}
                  stroke="#C78B3B"
                  strokeDasharray="3 3"
                  label={{ value: 'Endurance Limit', fill: '#C78B3B', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', position: 'top' }}
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  name="Stress Amplitude (MPa)"
                  stroke="#315EDE"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#315EDE', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Synthesis Callout */}
      <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[10px] shadow-panel overflow-hidden">
        <button
          onClick={() => setIsAiExpanded(!isAiExpanded)}
          className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-[#1E2436] flex items-center justify-between hover:bg-[#E9EDF7] transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#315EDE]" />
            <span className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">
              Engineering Interpretation & Recommendations
            </span>
          </div>
          {isAiExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#64708A]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#64708A]" />
          )}
        </button>
        {isAiExpanded && (
          <div className="p-4 text-xs text-[#172033] dark:text-[#E9EDF7] leading-relaxed font-sans border-t border-[#D9DFED] dark:border-[#28344E] bg-[#FFFFFF] dark:bg-[#172033]">
            {generateAiSummary()}
          </div>
        )}
      </div>

      {/* Engineering Standards Disclaimer */}
      <div className="px-4 py-2.5 bg-[#FFFFFF] dark:bg-[#172033] rounded-[8px] border border-[#D9DFED] dark:border-[#28344E] flex items-center justify-between text-xs text-[#64708A] font-mono shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#315EDE] shrink-0" />
          <span>Analytical Formulation: Distortion Energy (Von Mises-Hencky) • AGMA / Shigley Shaft Standards</span>
        </div>
        <span>ASME B106.1M Benchmark</span>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  unit,
  status,
  subtext,
}: {
  label: string;
  value: string | number;
  unit: string;
  status: 'pass' | 'warning' | 'fail' | 'info';
  subtext?: string;
}) {
  const statusPills = {
    pass: 'bg-[#39866B]/15 text-[#39866B] border-[#39866B]/30',
    warning: 'bg-[#C78B3B]/15 text-[#C78B3B] border-[#C78B3B]/30',
    fail: 'bg-[#C4515C]/15 text-[#C4515C] border-[#C4515C]/30',
    info: 'bg-[#315EDE]/15 text-[#315EDE] border-[#315EDE]/20',
  };

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#172033] p-3.5 rounded-[10px] border border-[#D9DFED] dark:border-[#28344E] shadow-panel flex flex-col justify-between">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-mono text-[#64708A] uppercase tracking-wider truncate font-bold">
          {label}
        </span>
        <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded-[4px] border ${statusPills[status]}`}>
          {status}
        </span>
      </div>
      <div className="flex items-baseline gap-1 my-1">
        <span className="text-xl font-mono font-bold text-[#172033] dark:text-[#FFFFFF] tracking-tight">{value}</span>
        {unit && <span className="text-xs font-mono text-[#64708A]">{unit}</span>}
      </div>
      {subtext && <div className="text-[10px] font-mono text-[#64708A] truncate">{subtext}</div>}
    </div>
  );
}
