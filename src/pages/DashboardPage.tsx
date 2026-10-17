import React from 'react';
import { useApp } from '../context/AppContext';
import { recentActivity, designWarnings, aiRecommendations } from '../data/dashboard';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  AlertOctagon,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Layers,
  Gauge,
  FileText,
  Sliders,
  Play,
  FolderPlus,
  GitCompare,
} from 'lucide-react';
import EngineeringStatusSymbol from '../components/brand/EngineeringStatusSymbol';
import Badge from '../components/ui/Badge';

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
    <div className="p-6 md:p-8 space-y-7 animate-fade-in text-gray-100 max-w-7xl mx-auto">
      {/* 1. Hero Greeting & Quick Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-accent mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            QUANTUM // Powertrain Intelligence Hub
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
            Mechanical Engineering Command Center
          </h1>
          <p className="text-xs lg:text-sm text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            • 4 verified calculation models active • {engineeringWarnings.length} pending design advisories
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsProblemModalOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 rounded-lg shadow-md shadow-accent/20"
          >
            <Sparkles size={14} />
            <span>Ask Copilot</span>
          </button>
          <button
            onClick={() => setIsOptimizationModalOpen(true)}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg"
          >
            <Gauge size={14} />
            <span>Optimize</span>
          </button>
          <button
            onClick={() => setIsCompareModalOpen(true)}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg"
          >
            <GitCompare size={14} />
            <span>Compare Configs</span>
          </button>
        </div>
      </div>

      {/* 2. Active Project Spotlight Card */}
      <div className="p-5 lg:p-6 rounded-2xl bg-linear-to-r from-navy-900 via-navy-900/90 to-navy-850 border border-navy-750 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-accent/15 text-accent-light border border-accent/30">
                Active Project Spotlight
              </span>
              <Badge variant="info" size="sm">
                {activeProject.type}
              </Badge>
              <Badge variant="pass" size="sm">
                {activeProject.status}
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{activeProject.name}</h2>
            <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
              {activeProject.description}
            </p>

            {/* Live Parameter Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-navy-950 border border-navy-800 text-gray-300">
                ⌀ <strong className="text-white">{designParams.diameter} mm</strong>
              </span>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-navy-950 border border-navy-800 text-gray-300">
                Span: <strong className="text-white">{designParams.length} mm</strong>
              </span>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-navy-950 border border-navy-800 text-gray-300">
                Torque: <strong className="text-white">{designParams.torque} N·m</strong>
              </span>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-navy-950 border border-navy-800 text-gray-300">
                Alloy: <strong className="text-accent">{selectedMaterial.name}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
            <button
              onClick={() => setActivePage('workspace')}
              className="btn-primary text-xs flex items-center gap-2 py-2 px-5 rounded-xl shadow-lg shadow-accent/20 group"
            >
              <span>Launch Design Workspace</span>
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
            <div className="text-[11px] text-gray-400 font-mono">
              Target FoS: <strong className="text-emerald-400">{designParams.safetyFactor.toFixed(1)}x</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Design Health Score Matrix */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <ShieldCheck size={16} className="text-accent" />
            Design Health Matrix
          </h3>
          <span className="text-xs text-gray-400 font-mono">Real-time verification</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {healthScores.map((h, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 flex flex-col justify-between hover:border-navy-700 transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-400 text-[11px] truncate">{h.name}</span>
                <EngineeringStatusSymbol status={h.status} size={13} />
              </div>
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span className="text-xl font-bold font-mono text-white">{h.score}%</span>
                <span className="text-[10px] text-emerald-400 font-mono">pass</span>
              </div>
              <div className="w-full bg-navy-950 h-1.5 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full ${h.score >= 90 ? 'bg-emerald-400' : h.score >= 80 ? 'bg-accent' : 'bg-amber-400'}`}
                  style={{ width: `${h.score}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 truncate">{h.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Active Projects Showcase */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Cpu size={16} className="text-accent" />
            Active Engineering Projects
          </h3>
          <button
            onClick={() => setActivePage('projects')}
            className="text-xs text-accent hover:text-accent-light font-mono flex items-center gap-1"
          >
            <span>All Projects ({allProjects.length})</span>
            <ChevronRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allProjects.slice(0, 3).map((project) => (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className="p-4 rounded-xl bg-navy-900 border border-navy-800 hover:border-accent/40 cursor-pointer flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-lg group"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-bold text-white group-hover:text-accent transition-colors truncate pr-2">
                  {project.name}
                </h4>
                <Badge variant={project.status === 'Completed' ? 'pass' : project.status === 'Review' ? 'warning' : 'info'} size="sm">
                  {project.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2 mb-3 flex-1">
                {project.description}
              </p>

              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-[11px] font-mono text-gray-400">
                  <span>Milestone Completion</span>
                  <span className="text-white font-bold">{project.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-navy-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-accent to-cyan-400 rounded-full"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-navy-800 font-mono">
                <span>{project.type}</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {new Date(project.lastModified).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Activity Feed & AI Recommendations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Analysis Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity size={16} className="text-accent" />
              Recent Finite Analyses & Commits
            </h3>
            <span className="text-xs text-gray-400 font-mono">Real-time stream</span>
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-xl overflow-hidden divide-y divide-navy-800">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="p-3.5 flex items-start gap-3 hover:bg-navy-850/60 transition-colors"
              >
                <div className="mt-0.5">
                  <EngineeringStatusSymbol status={activity.status as any} size={15} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-xs font-semibold text-gray-200">{activity.title}</h4>
                    <span className="text-[10px] text-gray-400 font-mono">{activity.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations (1 col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              AI Recommendations
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
              Active
            </span>
          </div>

          <div className="space-y-2.5">
            {aiRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 hover:border-amber-500/30 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-xs font-bold text-gray-200">{rec.title}</h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-950 text-gray-400 border border-navy-800">
                    {rec.project}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{rec.description}</p>
                <button
                  onClick={() => {
                    setActivePage('workspace');
                    sendCopilotMessage(rec.title);
                  }}
                  className="w-full text-left text-xs text-accent hover:text-accent-light font-medium flex items-center justify-between pt-1"
                >
                  <span>Apply with Copilot</span>
                  <ArrowUpRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Active Design Warnings Feed */}
      {engineeringWarnings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              Active Design Warnings & Envelope Breaches
            </h3>
            <button
              onClick={() => setIsWarningsDrawerOpen(true)}
              className="text-xs text-amber-400 hover:underline font-mono"
            >
              Open Diagnostics Drawer ({engineeringWarnings.length}) →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {engineeringWarnings.map((warning) => (
              <div
                key={warning.id}
                className="p-3.5 rounded-xl bg-navy-900 border border-amber-500/30 flex items-start gap-3"
              >
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-xs font-bold text-gray-100">{warning.title}</h4>
                    <span className="text-[10px] font-mono text-amber-300 uppercase">
                      {warning.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{warning.reason}</p>

                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

