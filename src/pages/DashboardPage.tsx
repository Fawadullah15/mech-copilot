import React from 'react';
import { useApp } from '../context/AppContext';
import { recentActivity, designWarnings, aiRecommendations } from '../data/dashboard';
import {
  Activity,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Gauge,
  GitCompare,
  Layers,
} from 'lucide-react';
import EngineeringStatusSymbol from '../components/brand/EngineeringStatusSymbol';

export default function DashboardPage() {
  const {
    allProjects,
    activeProject,
    setActiveProject,
    setActivePage,
    designParams,
    selectedMaterial,
    engineeringWarnings,
    setIsProblemModalOpen,
    setIsOptimizationModalOpen,
    setIsCompareModalOpen,
    setIsWarningsDrawerOpen,
    sendCopilotMessage,
  } = useApp();

  const handleProjectClick = (project: any) => {
    setActiveProject(project);
    setActivePage('workspace');
  };

  const healthScores = [
    { name: 'Structural Stress', score: 88, status: 'pass' as const, label: 'Von Mises < Yield' },
    { name: 'Factor of Safety', score: 94, status: 'pass' as const, label: `${designParams.safetyFactor.toFixed(1)}x Target Met` },
    { name: 'Shaft Deflection', score: 92, status: 'pass' as const, label: '< 0.05 mm Span Limit' },
    { name: 'Fatigue Endurance', score: 86, status: 'pass' as const, label: 'Infinite Life Target' },
    { name: 'Mass Efficiency', score: 76, status: 'warning' as const, label: 'Hollow Bore Opp.' },
    { name: 'Thermal Envelope', score: 95, status: 'pass' as const, label: 'Room Ambient' },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in text-[#F0F1F2] max-w-7xl mx-auto bg-[#111315] font-sans">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#34393F]">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#64D6C5] mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]"></span>
            QUANTUM // Powertrain Intelligence Hub
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#F0F1F2]">
            Mechanical Engineering Command Center
          </h1>
          <p className="text-xs text-[#969DA5] font-mono mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}{' '}
            • 4 verified calculation models active • {engineeringWarnings.length} pending design advisories
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setIsProblemModalOpen(true)}
            className="bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-mono text-xs font-semibold py-1.5 px-3 rounded-[3px] flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Sparkles size={13} />
            <span>Ask Copilot</span>
          </button>
          <button
            onClick={() => setIsOptimizationModalOpen(true)}
            className="bg-[#191C1F] hover:bg-[#22262A] text-[#F0F1F2] border border-[#34393F] font-mono text-xs py-1.5 px-3 rounded-[3px] flex items-center gap-1.5 transition-colors"
          >
            <Gauge size={13} className="text-[#64D6C5]" />
            <span>Optimize</span>
          </button>
          <button
            onClick={() => setIsCompareModalOpen(true)}
            className="bg-[#191C1F] hover:bg-[#22262A] text-[#F0F1F2] border border-[#34393F] font-mono text-xs py-1.5 px-3 rounded-[3px] flex items-center gap-1.5 transition-colors"
          >
            <GitCompare size={13} className="text-[#64D6C5]" />
            <span>Compare</span>
          </button>
        </div>
      </div>

      {/* 2. Active Project Spotlight */}
      <div className="p-4 lg:p-5 rounded-[4px] bg-[#191C1F] border border-[#34393F] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-[#64D6C5]/10 text-[#64D6C5] border border-[#64D6C5]/30">
              Active Project Spotlight
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#22262A] text-[#969DA5] border border-[#34393F]">
              {activeProject.type}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30">
              {activeProject.status}
            </span>
          </div>
          <h2 className="text-base font-bold text-[#F0F1F2] tracking-tight">{activeProject.name}</h2>
          <p className="text-xs text-[#969DA5] max-w-2xl leading-relaxed">
            {activeProject.description}
          </p>

          {/* Live Parameter Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
            <span className="font-mono text-xs px-2 py-0.5 rounded-[2px] bg-[#14171A] border border-[#2A2E35] text-[#969DA5]">
              ⌀ <strong className="text-[#F0F1F2]">{designParams.diameter} mm</strong>
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-[2px] bg-[#14171A] border border-[#2A2E35] text-[#969DA5]">
              Span: <strong className="text-[#F0F1F2]">{designParams.length} mm</strong>
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-[2px] bg-[#14171A] border border-[#2A2E35] text-[#969DA5]">
              Torque: <strong className="text-[#F0F1F2]">{designParams.torque} N·m</strong>
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-[2px] bg-[#14171A] border border-[#2A2E35] text-[#969DA5]">
              Alloy: <strong className="text-[#64D6C5]">{selectedMaterial.name}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#2A2E35]">
          <button
            onClick={() => setActivePage('workspace')}
            className="bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-mono text-xs font-semibold py-1.5 px-4 rounded-[3px] flex items-center gap-2 transition-colors shadow-sm"
          >
            <span>Launch CAD Workspace</span>
            <ArrowUpRight size={13} />
          </button>
          <div className="text-[11px] text-[#969DA5] font-mono">
            Target FoS: <strong className="text-[#34D399]">{designParams.safetyFactor.toFixed(1)}x</strong>
          </div>
        </div>
      </div>

      {/* 3. Design Health Score Matrix */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-[#F0F1F2] uppercase tracking-wider font-mono flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#64D6C5]" />
            Design Health Matrix
          </h3>
          <span className="text-[10px] text-[#969DA5] font-mono">Real-time analytical verification</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {healthScores.map((h, i) => (
            <div
              key={i}
              className="p-3 rounded-[4px] bg-[#191C1F] border border-[#34393F] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#969DA5] text-[10px] font-mono uppercase tracking-wider truncate">{h.name}</span>
                <EngineeringStatusSymbol status={h.status} size={12} />
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-lg font-bold font-mono text-[#F0F1F2]">{h.score}%</span>
                <span className="text-[10px] text-[#34D399] font-mono">pass</span>
              </div>
              <div className="w-full bg-[#14171A] h-1 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full ${h.score >= 90 ? 'bg-[#34D399]' : h.score >= 80 ? 'bg-[#64D6C5]' : 'bg-[#E7B65C]'}`}
                  style={{ width: `${h.score}%` }}
                />
              </div>
              <span className="text-[10px] text-[#6C737D] font-mono truncate">{h.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Active Projects Showcase */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-[#F0F1F2] uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Cpu size={14} className="text-[#64D6C5]" />
            Active Engineering Projects
          </h3>
          <button
            onClick={() => setActivePage('projects')}
            className="text-[11px] text-[#64D6C5] hover:underline font-mono"
          >
            All Projects ({allProjects.length}) →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {allProjects.slice(0, 3).map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className="p-3.5 rounded-[4px] bg-[#191C1F] border border-[#34393F] hover:border-[#64D6C5] cursor-pointer flex flex-col justify-between transition-colors group"
            >
              <div>
                <div className="flex justify-between items-start mb-1.5">
                  <h4 className="text-xs font-bold text-[#F0F1F2] group-hover:text-[#64D6C5] transition-colors truncate pr-2">
                    {project.name}
                  </h4>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] border ${
                    project.status === 'Completed'
                      ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30'
                      : project.status === 'Review'
                      ? 'bg-[#E7B65C]/15 text-[#E7B65C] border-[#E7B65C]/30'
                      : 'bg-[#64D6C5]/10 text-[#64D6C5] border-[#64D6C5]/20'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-xs text-[#969DA5] line-clamp-2 mb-3">
                  {project.description}
                </p>
              </div>

              <div>
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between text-[10px] font-mono text-[#969DA5]">
                    <span>Completion</span>
                    <span className="text-[#F0F1F2] font-semibold">{project.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-[#14171A] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#64D6C5] rounded-full"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-[#6C737D] pt-1.5 border-t border-[#2A2E35] font-mono">
                  <span>{project.type}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(project.lastModified).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Activity Feed & AI Recommendations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Analysis Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#F0F1F2] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Activity size={14} className="text-[#64D6C5]" />
              Recent Finite Analyses & Model Revisions
            </h3>
            <span className="text-[10px] text-[#969DA5] font-mono">Audit log</span>
          </div>

          <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] overflow-hidden divide-y divide-[#2A2E35]">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="p-3 flex items-start gap-2.5 hover:bg-[#22262A] transition-colors"
              >
                <div className="mt-0.5">
                  <EngineeringStatusSymbol status={activity.status as any} size={13} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-xs font-semibold text-[#F0F1F2]">{activity.title}</h4>
                    <span className="text-[10px] text-[#6C737D] font-mono">{activity.timestamp}</span>
                  </div>
                  <p className="text-xs text-[#969DA5] mt-0.5">{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations (1 col) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#F0F1F2] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#64D6C5]" />
              AI Recommendations
            </h3>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded-[2px] bg-[#64D6C5]/10 text-[#64D6C5] border border-[#64D6C5]/30">
              Active
            </span>
          </div>

          <div className="space-y-2">
            {aiRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-[4px] bg-[#191C1F] border border-[#34393F] hover:border-[#64D6C5]/40 transition-colors space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-xs font-bold text-[#F0F1F2]">{rec.title}</h4>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded-[2px] bg-[#14171A] text-[#969DA5] border border-[#2A2E35]">
                    {rec.project}
                  </span>
                </div>
                <p className="text-xs text-[#969DA5]">{rec.description}</p>
                <button
                  onClick={() => {
                    setActivePage('workspace');
                    sendCopilotMessage(rec.title);
                  }}
                  className="w-full text-left text-xs text-[#64D6C5] hover:underline font-mono flex items-center justify-between pt-1"
                >
                  <span>Evaluate with Copilot</span>
                  <ArrowUpRight size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Active Design Warnings */}
      {engineeringWarnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#E7B65C] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Active Design Advisories ({engineeringWarnings.length})
            </h3>
            <button
              onClick={() => setIsWarningsDrawerOpen(true)}
              className="text-xs text-[#E7B65C] hover:underline font-mono"
            >
              Open Diagnostics Drawer →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {engineeringWarnings.map((warning) => (
              <div
                key={warning.id}
                className="p-3 rounded-[4px] bg-[#191C1F] border border-[#E7B65C]/30 flex items-start gap-2.5"
              >
                <AlertTriangle size={14} className="text-[#E7B65C] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-xs font-bold text-[#F0F1F2]">{warning.title}</h4>
                    <span className="text-[9px] font-mono text-[#E7B65C] uppercase">
                      {warning.severity}
                    </span>
                  </div>
                  <p className="text-xs text-[#969DA5] mt-0.5">{warning.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
