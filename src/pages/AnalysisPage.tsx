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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#111315] font-sans">
        <div className="w-12 h-12 bg-[#191C1F] border border-[#34393F] rounded-[4px] flex items-center justify-center mb-4">
          <Activity className="w-6 h-6 text-[#64D6C5]" />
        </div>
        <h2 className="text-base font-mono font-bold text-[#F0F1F2] uppercase tracking-wider mb-1">
          No Simulation Telemetry Generated
        </h2>
        <p className="text-xs text-[#969DA5] max-w-sm mb-6 font-mono">
          Configure geometric dimensions and external loads, then run simulation.
        </p>
        <button
          onClick={() => setActivePage('workspace')}
          className="bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-mono text-xs font-semibold py-1.5 px-4 rounded-[3px] flex items-center gap-2 transition-colors"
        >
          <span>Open Design Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
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
    <div className="flex-1 overflow-y-auto p-5 lg:p-6 space-y-5 bg-[#111315] font-sans">
      {/* CAD Station Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#34393F]">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64D6C5] mb-0.5">
            Finite Analytical Telemetry
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#F0F1F2]">
            Engineering Stress & Fatigue Analysis
          </h1>
          <p className="text-xs text-[#969DA5] font-mono mt-0.5">
            Multiaxial stress tensor evaluation • S-N fatigue endurance • Beam deflection
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={isAnalysisRunning}
          className="bg-[#64D6C5] hover:bg-[#52c4b3] disabled:opacity-50 text-[#111315] font-mono text-xs font-semibold py-1.5 px-3.5 rounded-[3px] flex items-center gap-2 transition-colors self-start sm:self-auto shrink-0 shadow-sm"
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
        className={`px-3.5 py-2.5 rounded-[4px] flex items-center justify-between border text-xs font-mono ${
          isPass
            ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399]'
            : isWarning
            ? 'bg-[#E7B65C]/10 border-[#E7B65C]/30 text-[#E7B65C]'
            : 'bg-[#E16D72]/10 border-[#E16D72]/30 text-[#E16D72]'
        }`}
      >
        <div className="flex items-center gap-2">
          {isPass && <CheckCircle className="w-4 h-4 shrink-0" />}
          {isWarning && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {isFail && <XCircle className="w-4 h-4 shrink-0" />}
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            {isPass ? 'Design Approved — All Parameters Within Allowable Design Limits' : analysisResults.statusMessage}
          </span>
        </div>
        <span className="text-[10px] opacity-80 uppercase tracking-widest hidden sm:inline">
          Model: {designParams.diameter}mm / {designParams.length}mm / {designParams.torque}N·m
        </span>
      </div>

      {/* Results Telemetry Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stress Distribution */}
        <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] overflow-hidden">
          <div className="bg-[#22262A] px-3.5 py-2 border-b border-[#34393F] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={13} className="text-[#64D6C5]" />
              <h3 className="text-xs font-mono font-semibold text-[#F0F1F2] uppercase tracking-wider">
                Stress Distribution Along Shaft Axis
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#969DA5]">Span: 0 to {designParams.length} mm</span>
          </div>

          <div className="p-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stressData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="#262A30" strokeDasharray="3 3" />
                <XAxis
                  dataKey="position"
                  stroke="#4B535D"
                  tick={{ fill: '#969DA5', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `${val}mm`}
                />
                <YAxis
                  stroke="#4B535D"
                  tick={{ fill: '#969DA5', fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#22262A',
                    border: '1px solid #34393F',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}
                  labelStyle={{ color: '#969DA5' }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ color: '#969DA5', fontSize: 11, fontFamily: 'monospace', paddingTop: 6 }} />
                <Area
                  type="monotone"
                  dataKey="vonMises"
                  name="Von Mises (MPa)"
                  stroke="#64D6C5"
                  fill="#64D6C5"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="shear"
                  name="Torsional Shear (MPa)"
                  stroke="#38BDF8"
                  fill="#38BDF8"
                  fillOpacity={0.08}
                  strokeWidth={1.2}
                />
                <Area
                  type="monotone"
                  dataKey="bending"
                  name="Bending Normal (MPa)"
                  stroke="#A78BFA"
                  fill="#A78BFA"
                  fillOpacity={0.08}
                  strokeWidth={1.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fatigue Life S-N Curve */}
        <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] overflow-hidden">
          <div className="bg-[#22262A] px-3.5 py-2 border-b border-[#34393F] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-[#64D6C5]" />
              <h3 className="text-xs font-mono font-semibold text-[#F0F1F2] uppercase tracking-wider">
                High-Cycle Fatigue (S-N Wöhler Curve)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#969DA5]">Logarithmic Cycles</span>
          </div>

          <div className="p-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fatigueData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="#262A30" strokeDasharray="3 3" />
                <XAxis
                  dataKey="cycles"
                  scale="log"
                  domain={['dataMin', 'dataMax']}
                  type="number"
                  stroke="#4B535D"
                  tick={{ fill: '#969DA5', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => val.toExponential(0)}
                />
                <YAxis
                  stroke="#4B535D"
                  tick={{ fill: '#969DA5', fontSize: 10, fontFamily: 'monospace' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#22262A',
                    border: '1px solid #34393F',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}
                  labelStyle={{ color: '#969DA5' }}
                  itemStyle={{ fontSize: 11 }}
                  labelFormatter={(val) => `${val.toExponential(2)} cycles`}
                />
                <Legend wrapperStyle={{ color: '#969DA5', fontSize: 11, fontFamily: 'monospace', paddingTop: 6 }} />
                <ReferenceLine
                  y={fatigueData[fatigueData.length - 1]?.stress || 0}
                  stroke="#E7B65C"
                  strokeDasharray="3 3"
                  label={{ value: 'Endurance Limit', fill: '#E7B65C', fontSize: 10, fontFamily: 'monospace', position: 'top' }}
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  name="Stress Amplitude (MPa)"
                  stroke="#64D6C5"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#64D6C5', stroke: '#191C1F' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Synthesis Callout */}
      <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] overflow-hidden">
        <button
          onClick={() => setIsAiExpanded(!isAiExpanded)}
          className="w-full px-3.5 py-2.5 bg-[#22262A] flex items-center justify-between hover:bg-[#2A2E35] transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64D6C5]" />
            <span className="text-xs font-mono font-semibold text-[#F0F1F2] uppercase tracking-wider">
              Engineering Interpretation & Recommendations
            </span>
          </div>
          {isAiExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#969DA5]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#969DA5]" />
          )}
        </button>
        {isAiExpanded && (
          <div className="p-3.5 text-xs text-[#C2C8D0] leading-relaxed font-sans border-t border-[#34393F] bg-[#14171A]">
            {generateAiSummary()}
          </div>
        )}
      </div>

      {/* Engineering Standards Disclaimer */}
      <div className="px-3 py-2 bg-[#14171A] rounded-[3px] border border-[#2A2E35] flex items-center justify-between text-[10px] text-[#969DA5] font-mono">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-[#64D6C5] shrink-0" />
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
    pass: 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30',
    warning: 'bg-[#E7B65C]/15 text-[#E7B65C] border-[#E7B65C]/30',
    fail: 'bg-[#E16D72]/15 text-[#E16D72] border-[#E16D72]/30',
    info: 'bg-[#64D6C5]/10 text-[#64D6C5] border-[#64D6C5]/20',
  };

  return (
    <div className="bg-[#191C1F] p-3 rounded-[4px] border border-[#34393F] flex flex-col justify-between">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-mono text-[#969DA5] uppercase tracking-wider truncate">
          {label}
        </span>
        <span className={`text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded-[2px] border ${statusPills[status]}`}>
          {status}
        </span>
      </div>
      <div className="flex items-baseline gap-1 my-1">
        <span className="text-xl font-mono font-bold text-[#F0F1F2] tracking-tight">{value}</span>
        {unit && <span className="text-xs font-mono text-[#969DA5]">{unit}</span>}
      </div>
      {subtext && <div className="text-[10px] font-mono text-[#6C737D] truncate">{subtext}</div>}
    </div>
  );
}
