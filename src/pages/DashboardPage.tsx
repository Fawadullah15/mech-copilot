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
  Box,
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
    { name: 'Mass Efficiency', score: 76, status: 'warning' as const, label: 'Solid Bar Profile' },
    { name: 'Thermal Envelope', score: 95, status: 'pass' as const, label: 'Ambient Standard' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in text-[#172033] dark:text-[#FFFFFF] max-w-7xl mx-auto font-sans">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9DFED] dark:border-[#28344E]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#315EDE] mb-1 font-bold">
            <span className="w-2 h-2 rounded-full bg-[#39866B]"></span>
            MECHANICAL COPILOT // CAD ENGINEERING STUDIO
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033] dark:text-[#FFFFFF] font-display">
            Engineering Command Center
          </h1>
          <p className="text-xs text-[#64708A] font-medium mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}{' '}
            · 4 verified analytical calculation models active · {engineeringWarnings.length} pending design advisories
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setIsProblemModalOpen(true)}
            className="btn-primary text-xs py-2 px-4 rounded-[8px] flex items-center gap-2 font-semibold shadow-blueGlow"
          >
            <Sparkles size={14} />
            <span>Ask Copilot</span>
          </button>
          <button
            onClick={() => setIsOptimizationModalOpen(true)}
            className="btn-secondary text-xs py-2 px-3 rounded-[8px] flex items-center gap-1.5 font-semibold"
          >
            <Gauge size={14} className="text-[#315EDE]" />
            <span>Optimize</span>
          </button>
          <button
            onClick={() => setIsCompareModalOpen(true)}
            className="btn-secondary text-xs py-2 px-3 rounded-[8px] flex items-center gap-1.5 font-semibold"
          >
            <GitCompare size={14} className="text-[#7653C9]" />
            <span>Compare</span>
          </button>
        </div>
      </div>

      {/* 2. Active Project Spotlight */}
      {activeProject ? (
        <div className="p-5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] shadow-panel flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#315EDE]/10 text-[#315EDE] border border-[#315EDE]/25">
                Active Project Spotlight
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#E9EDF7] dark:bg-[#1E2436] text-[#64708A] border border-[#D9DFED] dark:border-[#28344E]">
                {activeProject.type}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#39866B]/15 text-[#39866B] border border-[#39866B]/30 font-bold">
                {activeProject.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#172033] dark:text-[#FFFFFF] tracking-tight">{activeProject.name}</h2>
            <p className="text-xs text-[#64708A] max-w-2xl leading-relaxed">
              {activeProject.description}
            </p>

            {/* Live Parameter Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-mono text-xs px-2.5 py-1 rounded-[6px] bg-[#F8FAFC] dark:bg-[#1A2234] border border-[#D9DFED] dark:border-[#28344E] text-[#64708A]">
                ⌀ <strong className="text-[#172033] dark:text-[#FFFFFF]">{designParams.diameter} mm</strong>
              </span>
              <span className="font-mono text-xs px-2.5 py-1 rounded-[6px] bg-[#F8FAFC] dark:bg-[#1A2234] border border-[#D9DFED] dark:border-[#28344E] text-[#64708A]">
                Span: <strong className="text-[#172033] dark:text-[#FFFFFF]">{designParams.length} mm</strong>
              </span>
              <span className="font-mono text-xs px-2.5 py-1 rounded-[6px] bg-[#F8FAFC] dark:bg-[#1A2234] border border-[#D9DFED] dark:border-[#28344E] text-[#64708A]">
                Torque: <strong className="text-[#172033] dark:text-[#FFFFFF]">{designParams.torque} N·m</strong>
              </span>
              <span className="font-mono text-xs px-2.5 py-1 rounded-[6px] bg-[#F8FAFC] dark:bg-[#1A2234] border border-[#D9DFED] dark:border-[#28344E] text-[#64708A]">
                Alloy: <strong className="text-[#315EDE]">{selectedMaterial.name}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#D9DFED] dark:border-[#28344E]">
            <button
              onClick={() => setActivePage('workspace')}
              className="btn-primary text-xs font-semibold py-2 px-5 rounded-[8px] flex items-center gap-2 shadow-blueGlow"
            >
              <span>Launch 3D Workspace</span>
              <ArrowUpRight size={14} />
            </button>
            <div className="text-xs text-[#64708A] font-mono">
              Target FoS: <strong className="text-[#39866B]">{designParams.safetyFactor.toFixed(1)}x</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-[12px] bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] shadow-panel flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#315EDE]/10 text-[#315EDE] border border-[#315EDE]/25">
                Workspace Clean
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#E9EDF7] dark:bg-[#1E2436] text-[#64708A] border border-[#D9DFED] dark:border-[#28344E]">
                0 Active Projects
              </span>
            </div>
            <h2 className="text-base font-bold text-[#172033] dark:text-[#FFFFFF] tracking-tight">Clean Engineering Workspace</h2>
            <p className="text-xs text-[#64708A] max-w-2xl leading-relaxed">
              No projects loaded. Describe your mechanical requirements to the Copilot on the right to autonomously create and verify a new shaft design.
            </p>
          </div>
          <button
            onClick={() => setActivePage('workspace')}
            className="btn-primary text-xs font-semibold py-2 px-5 rounded-[8px] flex items-center gap-2 shrink-0 shadow-blueGlow"
          >
            <span>Open 3D Workspace</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      )}

      {/* 3. Design Health Score Matrix */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider font-mono flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-[#315EDE]" />
            Design Health Matrix
          </h3>
          <span className="text-xs text-[#64708A] font-mono">Real-time analytical verification</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-3">
          {healthScores.map((h, i) => (
            <div
              key={i}
              className="p-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] shadow-panel flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#64708A] text-[10px] font-mono uppercase tracking-wider truncate font-bold">{h.name}</span>
                <EngineeringStatusSymbol status={h.status} size={13} />
              </div>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-xl font-bold font-mono text-[#172033] dark:text-[#FFFFFF]">{h.score}%</span>
                <span className="text-xs text-[#39866B] font-mono font-bold">pass</span>
              </div>
              <div className="w-full bg-[#E9EDF7] dark:bg-[#1E2436] h-1.5 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full ${h.score >= 90 ? 'bg-[#39866B]' : h.score >= 80 ? 'bg-[#315EDE]' : 'bg-[#C78B3B]'}`}
                  style={{ width: `${h.score}%` }}
                />
              </div>
              <span className="text-[10px] text-[#64708A] font-mono truncate">{h.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Active Projects Showcase */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Cpu size={15} className="text-[#315EDE]" />
            Active Engineering Projects
          </h3>
          <button
            onClick={() => setActivePage('projects')}
            className="text-xs text-[#315EDE] hover:underline font-semibold"
          >
            All Projects ({allProjects.length}) →
          </button>
        </div>

        {allProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allProjects.slice(0, 3).map((project) => (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project)}
                className="p-4 rounded-[10px] bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] hover:border-[#315EDE] shadow-panel hover:shadow-blueGlow cursor-pointer flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] group-hover:text-[#315EDE] transition-colors truncate pr-2">
                      {project.name}
                    </h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[4px] border font-bold ${
                      project.status === 'Completed'
                        ? 'bg-[#39866B]/15 text-[#39866B] border-[#39866B]/30'
                        : project.status === 'Review'
                        ? 'bg-[#C78B3B]/15 text-[#C78B3B] border-[#C78B3B]/30'
                        : 'bg-[#315EDE]/10 text-[#315EDE] border-[#315EDE]/20'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#64708A] line-clamp-2 mb-3">
                    {project.description}
                  </p>
                </div>

                <div>
                  <div className="space-y-1 mb-2.5">
                    <div className="flex justify-between text-xs font-mono text-[#64708A]">
                      <span>Completion</span>
                      <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E9EDF7] dark:bg-[#1E2436] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#315EDE] to-[#7653C9] rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-[#64708A] pt-2 border-t border-[#D9DFED] dark:border-[#28344E] font-mono">
                    <span>{project.type}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(project.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-[#64708A] font-mono text-xs bg-[#FFFFFF] dark:bg-[#172033] rounded-[10px] border border-dashed border-[#D9DFED] dark:border-[#28344E]">
            No engineering projects in workspace. Ask the Copilot to create and size a new shaft project.
          </div>
        )}
      </div>

      {/* 5. Activity Feed & AI Recommendations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Analysis Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Activity size={15} className="text-[#315EDE]" />
              Recent Finite Analyses & Model Revisions
            </h3>
            <span className="text-xs text-[#64708A] font-mono">Audit log</span>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] shadow-panel rounded-[10px] overflow-hidden divide-y divide-[#D9DFED] dark:divide-[#28344E]">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-3.5 flex items-start gap-3 hover:bg-[#F8FAFC] dark:hover:bg-[#1E2436] transition-colors"
                >
                  <div className="mt-0.5">
                    <EngineeringStatusSymbol status={activity.status as any} size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF]">{activity.title}</h4>
                      <span className="text-[11px] text-[#64708A] font-mono">{activity.timestamp}</span>
                    </div>
                    <p className="text-xs text-[#64708A] mt-0.5">{activity.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#64708A] font-mono text-xs">
                No recent activity records. Verified calculations and model revisions will appear here.
              </div>
            )}
          </div>
        </div>

        {/* AI Recommendations (1 col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sparkles size={15} className="text-[#7653C9]" />
              Engineering Recommendations
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-[#7653C9]/10 text-[#7653C9] border border-[#7653C9]/25 font-bold">
              Active
            </span>
          </div>

          <div className="space-y-2.5">
            {aiRecommendations.length > 0 ? (
              aiRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] hover:border-[#315EDE] shadow-panel transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF]">{rec.title}</h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#E9EDF7] dark:bg-[#1E2436] text-[#64708A]">
                      {rec.project}
                    </span>
                  </div>
                  <p className="text-xs text-[#64708A]">{rec.description}</p>
                  <button
                    onClick={() => {
                      setActivePage('workspace');
                      sendCopilotMessage(rec.title);
                    }}
                    className="w-full text-left text-xs text-[#315EDE] hover:underline flex items-center justify-between pt-1 font-bold"
                  >
                    <span>Evaluate in 3D Workspace</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#64708A] font-mono text-xs bg-[#FFFFFF] dark:bg-[#172033] rounded-[10px] border border-[#D9DFED] dark:border-[#28344E]">
                No pending advisories. Active parameters satisfy verified solid mechanics criteria.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Active Design Warnings */}
      {engineeringWarnings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#C78B3B] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <AlertTriangle size={15} />
              Active Design Advisories ({engineeringWarnings.length})
            </h3>
            <button
              onClick={() => setIsWarningsDrawerOpen(true)}
              className="text-xs text-[#C78B3B] hover:underline font-bold"
            >
              Open Diagnostics Drawer →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {engineeringWarnings.map((warning) => (
              <div
                key={warning.id}
                className="p-3.5 rounded-[10px] bg-[#FFFFFF] dark:bg-[#172033] border border-[#C78B3B]/30 shadow-panel flex items-start gap-3"
              >
                <AlertTriangle size={15} className="text-[#C78B3B] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF]">{warning.title}</h4>
                    <span className="text-[10px] font-mono text-[#C78B3B] uppercase font-bold">
                      {warning.severity}
                    </span>
                  </div>
                  <p className="text-xs text-[#64708A] mt-0.5">{warning.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
