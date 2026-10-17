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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-navy-800 rounded-full flex items-center justify-center mb-6">
          <ActivityIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-100 mb-2">
          No Analysis Results Yet
        </h2>
        <p className="text-gray-400 max-w-md mb-8">
          Configure your design parameters and run an analysis to see the engineering results.
        </p>
        <button
          onClick={() => setActivePage('workspace')}
          className="btn-primary flex items-center gap-2"
        >
          Go to Workspace <ArrowRight className="w-4 h-4" />
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
      return `The design meets all safety requirements. The von Mises stress of ${analysisResults.vonMisesStress} MPa is well below the yield strength of ${analysisResults.yieldStrength} MPa, providing a factor of safety of ${analysisResults.factorOfSafety}. Maximum deflection is within acceptable limits at ${analysisResults.maxDeflection} mm. Fatigue life is estimated at ${formatNumber(analysisResults.fatigueLife)} cycles, indicating excellent long-term durability under the specified load conditions.`;
    }
    if (isWarning) {
      return `The design is marginal in some areas. The factor of safety is ${analysisResults.factorOfSafety}, which is close to your minimum target. While the von Mises stress (${analysisResults.vonMisesStress} MPa) does not exceed the yield strength (${analysisResults.yieldStrength} MPa), you should consider increasing the shaft diameter or selecting a stronger material if operational loads might exceed the design parameters.`;
    }
    return `The design does not meet requirements. The calculated factor of safety of ${analysisResults.factorOfSafety} is below the target. Critical values such as von Mises stress (${analysisResults.vonMisesStress} MPa) or deflection (${analysisResults.maxDeflection} mm) exceed allowable limits. Immediate design changes, such as increasing the diameter or choosing a higher-strength material, are necessary.`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 animate-fade-in space-y-6 bg-navy-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Engineering Analysis</h1>
          <p className="text-gray-400 mt-1">Review simulation results and safety margins</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={isAnalysisRunning}
          className="btn-primary flex items-center gap-2"
        >
          {isAnalysisRunning ? (
            <span className="animate-pulse-slow">Running...</span>
          ) : (
            <>
              <Play className="w-4 h-4" /> Run New Analysis
            </>
          )}
        </button>
      </div>

      {/* Overall Status Banner */}
      <div
        className={`p-4 rounded-lg flex items-center gap-3 border ${
          isPass
            ? 'bg-emerald-900/20 border-emerald-900/50 text-emerald-400'
            : isWarning
            ? 'bg-amber-900/20 border-amber-900/50 text-amber-400'
            : 'bg-red-900/20 border-red-900/50 text-red-400'
        }`}
      >
        {isPass && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
        {isWarning && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
        {isFail && <XCircle className="w-5 h-5 flex-shrink-0" />}
        <span className="font-medium">
          {isPass
            ? 'Design Approved — All parameters within limits'
            : analysisResults.statusMessage}
        </span>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Von Mises Stress */}
        <ResultCard
          label="Von Mises Stress"
          value={analysisResults.vonMisesStress}
          unit="MPa"
          status={
            analysisResults.vonMisesStress <
            analysisResults.yieldStrength / designParams.safetyFactor
              ? 'pass'
              : 'fail'
          }
        />
        {/* Yield Strength */}
        <ResultCard
          label="Yield Strength"
          value={analysisResults.yieldStrength}
          unit="MPa"
          status="info"
        />
        {/* Factor of Safety */}
        <ResultCard
          label="Factor of Safety"
          value={analysisResults.factorOfSafety}
          unit=""
          status={
            analysisResults.factorOfSafety >= designParams.safetyFactor
              ? 'pass'
              : analysisResults.factorOfSafety >= designParams.safetyFactor * 0.9
              ? 'warning'
              : 'fail'
          }
        />
        {/* Max Deflection */}
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
        />
        {/* Torque Capacity */}
        <ResultCard
          label="Torque Capacity"
          value={formatNumber(analysisResults.torqueCapacity)}
          unit="Nm"
          status={
            analysisResults.torqueCapacity > designParams.torque ? 'pass' : 'fail'
          }
        />
        {/* Fatigue Life */}
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
        />
      </div>

      {/* AI Explanation Section */}
      <div className="card border border-navy-700 bg-navy-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsAiExpanded(!isAiExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-navy-700/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-gray-100 font-medium">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-slow" />
            AI Analysis Summary
          </div>
          {isAiExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {isAiExpanded && (
          <div className="p-4 pt-0 text-gray-300 leading-relaxed border-t border-navy-700/50 mt-2">
            {generateAiSummary()}
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* Stress Distribution */}
        <div className="card bg-navy-800 border border-navy-700 rounded-lg p-5">
          <h3 className="text-gray-100 font-medium mb-4">Stress Distribution</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stressData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#243049" strokeDasharray="3 3" />
                <XAxis
                  dataKey="position"
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickFormatter={(val) => `${val}mm`}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a2236',
                    border: '1px solid #243049',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                  itemStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12, paddingTop: 10 }} />
                <Area
                  type="monotone"
                  dataKey="vonMises"
                  name="Von Mises"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="shear"
                  name="Shear"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="bending"
                  name="Bending"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fatigue Life S-N Curve */}
        <div className="card bg-navy-800 border border-navy-700 rounded-lg p-5">
          <h3 className="text-gray-100 font-medium mb-4">Fatigue Life (S-N Curve)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fatigueData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#243049" strokeDasharray="3 3" />
                <XAxis
                  dataKey="cycles"
                  scale="log"
                  domain={['dataMin', 'dataMax']}
                  type="number"
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickFormatter={(val) => val.toExponential(0)}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a2236',
                    border: '1px solid #243049',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                  itemStyle={{ fontSize: 12 }}
                  labelFormatter={(val) => `${val.toExponential(2)} cycles`}
                />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12, paddingTop: 10 }} />
                <ReferenceLine
                  y={fatigueData[fatigueData.length - 1]?.stress || 0}
                  stroke="#6b7280"
                  strokeDasharray="3 3"
                  label={{ value: 'Endurance Limit', fill: '#9ca3af', fontSize: 10, position: 'top' }}
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  name="Stress Amplitude"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#1a2236' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Engineering Safety Disclaimer */}
      <div className="p-3 bg-navy-900 rounded-lg border border-navy-700/80 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-accent shrink-0" />
          <span>Engineering calculation — Simplified model — Engineer review required.</span>
        </div>
        <span className="font-mono text-gray-500">Von Mises Multiaxial Model</span>
      </div>
    </div>
  );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function ResultCard({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: string | number;
  unit: string;
  status: 'pass' | 'warning' | 'fail' | 'info';
}) {
  const statusColors = {
    pass: 'bg-emerald-500',
    warning: 'bg-amber-500',
    fail: 'bg-red-500',
    info: 'bg-gray-500',
  };

  return (
    <div className="card glass-panel bg-navy-800 p-5 rounded-lg border border-navy-700 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-mono font-bold text-gray-100">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
    </div>
  );
}
