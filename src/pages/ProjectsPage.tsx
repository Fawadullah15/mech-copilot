import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Plus,
  Search,
  Clock,
  ArrowUpRight,
  FolderOpen,
  Box,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Project } from '../types';

export default function ProjectsPage() {
  const {
    allProjects,
    setActiveProject,
    setActivePage,
    allMaterials,
    setIsProblemModalOpen,
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in text-[#172033] dark:text-[#FFFFFF] max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#D9DFED] dark:border-[#28344E]">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#315EDE] mb-1 font-bold">
            Project Repositories
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033] dark:text-[#FFFFFF] font-display">
            Engineering Projects & CAD Assemblies
          </h1>
          <p className="text-xs text-[#64708A] font-medium mt-1">
            Parametric powertrain shafts, reduction gearboxes, and certified mechanical assemblies.
          </p>
        </div>

        <button
          onClick={() => setIsProblemModalOpen(true)}
          className="btn-primary text-xs font-semibold py-2 px-4 rounded-[8px] shadow-blueGlow flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Project Specification</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#64708A]" />
          <input
            type="text"
            placeholder="Search projects, alloys, tags, diameters..."
            className="w-full pl-9 pr-4 py-2 bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[8px] text-xs text-[#172033] dark:text-[#FFFFFF] placeholder-[#64708A] font-medium focus:outline-none focus:border-[#315EDE] transition-colors shadow-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {(['All', 'Shafts', 'Gears', 'In Progress', 'Review'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors shrink-0 ${
                selectedFilter === filter
                  ? 'bg-[#315EDE] text-[#FFFFFF] shadow-blueGlow'
                  : 'bg-[#FFFFFF] dark:bg-[#172033] text-[#64708A] hover:text-[#172033] dark:hover:text-[#FFFFFF] border border-[#D9DFED] dark:border-[#28344E]'
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
              className="p-4 rounded-[12px] bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] hover:border-[#315EDE] shadow-panel hover:shadow-blueGlow cursor-pointer flex flex-col justify-between transition-all group"
            >
              <div>
                {/* CAD Schematic Thumbnail */}
                <div className="h-28 w-full bg-[#F2F4FA] dark:bg-[#111827] rounded-[8px] mb-3 border border-[#D9DFED] dark:border-[#28344E] relative overflow-hidden flex items-center justify-center">
                  <svg width="100%" height="100%" viewBox="0 0 240 70" className="opacity-90">
                    <line x1="20" y1="35" x2="220" y2="35" stroke="#D9DFED" strokeWidth="1" strokeDasharray="4,3" />
                    {/* Bearings */}
                    <rect x="42" y="21" width="14" height="28" rx="2" fill="#FFFFFF" stroke="#64708A" strokeWidth="1" />
                    <rect x="184" y="21" width="14" height="28" rx="2" fill="#FFFFFF" stroke="#64708A" strokeWidth="1" />
                    {/* Shaft Cylinder */}
                    <rect x="56" y="25" width="128" height="20" rx="2" fill="#E9EDF7" stroke="#315EDE" strokeWidth="1.2" />
                    {/* Gear Pinion */}
                    <rect x="110" y="14" width="20" height="42" rx="2" fill="#FFFFFF" stroke="#7653C9" strokeWidth="1.4" />
                    {/* Dimension text */}
                    <text x="120" y="64" fill="#64708A" fontSize="8" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fontWeight="bold">
                      ⌀{project.parameters.diameter} × {project.parameters.length}mm
                    </text>
                  </svg>

                  <div className="absolute top-2 right-2">
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-[4px] border ${
                      project.status === 'Completed'
                        ? 'bg-[#39866B]/15 text-[#39866B] border-[#39866B]/30'
                        : project.status === 'Review'
                        ? 'bg-[#C78B3B]/15 text-[#C78B3B] border-[#C78B3B]/30'
                        : 'bg-[#315EDE]/10 text-[#315EDE] border-[#315EDE]/20'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>

                {/* Title & Type */}
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#172033] dark:text-[#FFFFFF] group-hover:text-[#315EDE] transition-colors truncate">
                      {project.name}
                    </h3>
                    <ArrowUpRight size={14} className="text-[#315EDE] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[11px] text-[#64708A]">{project.type}</span>
                </div>

                <p className="text-xs text-[#64708A] mb-4 line-clamp-2">
                  {project.description}
                </p>

                {/* Key Parameters Grid */}
                <div className="bg-[#F8FAFC] dark:bg-[#1A2234] p-2.5 rounded-[8px] grid grid-cols-2 gap-2 mb-4 border border-[#D9DFED] dark:border-[#28344E] font-mono text-xs">
                  <div>
                    <span className="text-[#64708A] block text-[9px] uppercase font-bold">Material</span>
                    <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold truncate block text-[11px]">
                      {material?.name || project.parameters.materialId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64708A] block text-[9px] uppercase font-bold">Torque</span>
                    <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold text-[11px]">{project.parameters.torque} N·m</span>
                  </div>
                  <div>
                    <span className="text-[#64708A] block text-[9px] uppercase font-bold">Speed</span>
                    <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold text-[11px]">{project.parameters.rpm} RPM</span>
                  </div>
                  <div>
                    <span className="text-[#64708A] block text-[9px] uppercase font-bold">Target FoS</span>
                    <span className="text-[#39866B] font-bold text-[11px]">{project.parameters.safetyFactor}x</span>
                  </div>
                </div>
              </div>

              <div>
                {/* Progress */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-[11px] font-mono text-[#64708A]">
                    <span>Design Milestone</span>
                    <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{project.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#E9EDF7] dark:bg-[#1A2234] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#315EDE] to-[#7653C9] rounded-full"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer Tags & Modified */}
                <div className="flex justify-between items-center text-[10px] text-[#64708A] pt-2.5 border-t border-[#D9DFED] dark:border-[#28344E] font-mono">
                  <div className="flex gap-1 overflow-hidden">
                    {project.tags.slice(0, 2).map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded-[4px] bg-[#E9EDF7] dark:bg-[#1A2234] text-[#172033] dark:text-[#FFFFFF] text-[10px]">
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
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="col-span-full py-16 text-center text-[#64708A] font-mono text-xs">
            No engineering assemblies matching search criteria.
          </div>
        )}
      </div>
    </div>
  );
}
