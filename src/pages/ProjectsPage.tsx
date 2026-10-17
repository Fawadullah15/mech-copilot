import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Plus,
  Search,
  Filter,
  Clock,
  Tag,
  ArrowUpRight,
  SlidersHorizontal,
  FolderPlus,
  GitCompare,
  Copy,
  Download,
  MoreVertical,
} from 'lucide-react';
import { Project } from '../types';
import EngineeringStatusSymbol from '../components/brand/EngineeringStatusSymbol';
import Badge from '../components/ui/Badge';

export default function ProjectsPage() {
  const {
    allProjects,
    setActiveProject,
    setActivePage,
    allMaterials,
    setIsProblemModalOpen,
    setIsCompareModalOpen,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Shafts' | 'Gears' | 'In Progress' | 'Review'>('All');

  const handleProjectClick = (project: Project) => {
    setActiveProject(project);
    setActivePage('workspace');
  };

  const filteredProjects = allProjects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'Shafts') return p.type.toLowerCase().includes('shaft');
    if (selectedFilter === 'Gears') return p.type.toLowerCase().includes('gear');
    if (selectedFilter === 'In Progress') return p.status === 'In Progress';
    if (selectedFilter === 'Review') return p.status === 'Review';
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in text-gray-100 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-navy-800">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-accent mb-1">
            Component Repositories
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
            Engineering Projects & CAD Assemblies
          </h1>
          <p className="text-xs lg:text-sm text-gray-400 mt-1">
            Browse and configure mechanical powertrain shafts, transmissions, and couplings.
          </p>
        </div>

        <button
          onClick={() => setIsProblemModalOpen(true)}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg shadow-md shadow-accent/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Project Specification</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search projects, alloys, tags, diameters..."
            className="input-field pl-9 w-full bg-navy-900 text-xs py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {(['All', 'Shafts', 'Gears', 'In Progress', 'Review'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedFilter === filter
                  ? 'bg-accent text-white font-semibold'
                  : 'bg-navy-900 hover:bg-navy-850 text-gray-400 hover:text-white border border-navy-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((project) => {
          const material = allMaterials.find((m) => m.id === project.parameters.materialId);

          return (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className="p-5 rounded-2xl bg-navy-900 border border-navy-800 hover:border-accent/40 cursor-pointer flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl group"
            >
              {/* CAD Mini Schematic Thumbnail */}
              <div className="h-28 w-full bg-navy-950 rounded-xl mb-4 border border-navy-850 relative overflow-hidden flex items-center justify-center group-hover:border-navy-700 transition-colors">
                <svg width="100%" height="100%" viewBox="0 0 240 80" className="opacity-80">
                  <defs>
                    <linearGradient id={`thumb-grad-${project.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#475569" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>
                  </defs>
                  {/* Center line */}
                  <line x1="20" y1="40" x2="220" y2="40" stroke="#334155" strokeWidth="1" strokeDasharray="6,4" />
                  {/* Bearings */}
                  <rect x="40" y="24" width="16" height="32" rx="2" fill="#0f172a" stroke="#60a5fa" strokeWidth="1" />
                  <rect x="184" y="24" width="16" height="32" rx="2" fill="#0f172a" stroke="#60a5fa" strokeWidth="1" />
                  {/* Shaft Cylinder */}
                  <rect x="56" y="28" width="128" height="24" rx="2" fill={`url(#thumb-grad-${project.id})`} stroke="#94a3b8" strokeWidth="1.2" />
                  {/* Gear Pinion */}
                  <rect x="110" y="16" width="20" height="48" rx="2" fill="#083344" stroke="#06b6d4" strokeWidth="1.2" />
                  {/* Dimension text */}
                  <text x="120" y="72" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                    ⌀{project.parameters.diameter} × {project.parameters.length}mm
                  </text>
                </svg>

                <div className="absolute top-2 right-2">
                  <Badge variant={project.status === 'Completed' ? 'pass' : project.status === 'Review' ? 'warning' : 'info'} size="sm">
                    {project.status}
                  </Badge>
                </div>
              </div>

              {/* Title & Type */}
              <div className="mb-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white group-hover:text-accent transition-colors truncate">
                    {project.name}
                  </h3>
                  <ArrowUpRight size={14} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs text-accent-light font-medium">{project.type}</span>
              </div>

              <p className="text-xs text-gray-400 mb-4 line-clamp-2 flex-1">
                {project.description}
              </p>

              {/* Key Parameters Grid */}
              <div className="bg-navy-950 p-2.5 rounded-xl grid grid-cols-2 gap-2 mb-4 border border-navy-850 font-mono text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase">Material</span>
                  <span className="text-gray-200 font-semibold truncate block">
                    {material?.name || project.parameters.materialId}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase">Torque Rating</span>
                  <span className="text-gray-200 font-semibold">{project.parameters.torque} N·m</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase">Speed</span>
                  <span className="text-gray-200 font-semibold">{project.parameters.rpm} RPM</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase">Target FoS</span>
                  <span className="text-emerald-400 font-semibold">{project.parameters.safetyFactor}x</span>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1 mb-3 mt-auto">
                <div className="flex justify-between text-[11px] font-mono text-gray-400">
                  <span>Design Progress</span>
                  <span className="text-white font-bold">{project.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-navy-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-accent to-cyan-400 rounded-full"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Footer Tags & Modified */}
              <div className="flex justify-between items-center text-[10px] text-gray-500 pt-3 border-t border-navy-800 font-mono">
                <div className="flex gap-1 overflow-hidden">
                  {project.tags.slice(0, 2).map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-navy-800 text-gray-400">
                      #{t}
                    </span>
                  ))}
                </div>
                <span className="flex items-center gap-1 shrink-0">
                  <Clock size={11} />
                  {new Date(project.lastModified).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-500 font-mono text-xs">
            No projects found matching current filter.
          </div>
        )}
      </div>
    </div>
  );
}

