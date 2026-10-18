import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Plus,
  Search,
  Clock,
  ArrowUpRight,
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
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in text-[#F0F1F2] max-w-7xl mx-auto bg-[#111315] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-[#34393F]">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64D6C5] mb-0.5">
            Component Repositories
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#F0F1F2]">
            Engineering Projects & CAD Assemblies
          </h1>
          <p className="text-xs text-[#969DA5] font-mono mt-0.5">
            Parametric powertrain shafts, reduction gearboxes, and certified mechanical assemblies.
          </p>
        </div>

        <button
          onClick={() => setIsProblemModalOpen(true)}
          className="bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-mono font-semibold rounded-[3px] shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project Specification</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#969DA5]" />
          <input
            type="text"
            placeholder="Search projects, alloys, tags, diameters..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#14171A] border border-[#34393F] rounded-[3px] text-xs text-[#F0F1F2] placeholder-[#6C737D] font-mono focus:outline-none focus:border-[#64D6C5] transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {(['All', 'Shafts', 'Gears', 'In Progress', 'Review'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-2.5 py-1 rounded-[3px] text-xs font-mono transition-colors shrink-0 ${
                selectedFilter === filter
                  ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                  : 'bg-[#191C1F] hover:bg-[#22262A] text-[#969DA5] hover:text-[#F0F1F2] border border-[#2A2E35]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const material = allMaterials.find((m) => m.id === project.parameters.materialId);

          return (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project)}
              className="p-4 rounded-[4px] bg-[#191C1F] border border-[#34393F] hover:border-[#64D6C5] cursor-pointer flex flex-col justify-between transition-colors group"
            >
              <div>
                {/* CAD Schematic Thumbnail */}
                <div className="h-24 w-full bg-[#14171A] rounded-[3px] mb-3 border border-[#2A2E35] relative overflow-hidden flex items-center justify-center">
                  <svg width="100%" height="100%" viewBox="0 0 240 70" className="opacity-90">
                    <line x1="20" y1="35" x2="220" y2="35" stroke="#34393F" strokeWidth="1" strokeDasharray="4,3" />
                    {/* Bearings */}
                    <rect x="42" y="21" width="14" height="28" rx="1" fill="#191C1F" stroke="#4B535D" strokeWidth="1" />
                    <rect x="184" y="21" width="14" height="28" rx="1" fill="#191C1F" stroke="#4B535D" strokeWidth="1" />
                    {/* Shaft Cylinder */}
                    <rect x="56" y="25" width="128" height="20" rx="1" fill="#22262A" stroke="#6C737D" strokeWidth="1.2" />
                    {/* Gear Pinion */}
                    <rect x="110" y="14" width="20" height="42" rx="1" fill="#14171A" stroke="#64D6C5" strokeWidth="1.2" />
                    {/* Dimension text */}
                    <text x="120" y="64" fill="#969DA5" fontSize="8" fontFamily="monospace" textAnchor="middle">
                      ⌀{project.parameters.diameter} × {project.parameters.length}mm
                    </text>
                  </svg>

                  <div className="absolute top-1.5 right-1.5">
                    <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded-[2px] border ${
                      project.status === 'Completed'
                        ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30'
                        : project.status === 'Review'
                        ? 'bg-[#E7B65C]/15 text-[#E7B65C] border-[#E7B65C]/30'
                        : 'bg-[#64D6C5]/10 text-[#64D6C5] border-[#64D6C5]/20'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>

                {/* Title & Type */}
                <div className="mb-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#F0F1F2] group-hover:text-[#64D6C5] transition-colors truncate">
                      {project.name}
                    </h3>
                    <ArrowUpRight size={13} className="text-[#64D6C5] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] font-mono text-[#969DA5]">{project.type}</span>
                </div>

                <p className="text-xs text-[#969DA5] mb-3 line-clamp-2">
                  {project.description}
                </p>

                {/* Key Parameters Grid */}
                <div className="bg-[#14171A] p-2 rounded-[3px] grid grid-cols-2 gap-1.5 mb-3 border border-[#2A2E35] font-mono text-xs">
                  <div>
                    <span className="text-[#6C737D] block text-[9px] uppercase">Material</span>
                    <span className="text-[#C2C8D0] font-medium truncate block text-[11px]">
                      {material?.name || project.parameters.materialId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6C737D] block text-[9px] uppercase">Torque Rating</span>
                    <span className="text-[#C2C8D0] font-medium text-[11px]">{project.parameters.torque} N·m</span>
                  </div>
                  <div>
                    <span className="text-[#6C737D] block text-[9px] uppercase">Speed</span>
                    <span className="text-[#C2C8D0] font-medium text-[11px]">{project.parameters.rpm} RPM</span>
                  </div>
                  <div>
                    <span className="text-[#6C737D] block text-[9px] uppercase">Target FoS</span>
                    <span className="text-[#34D399] font-medium text-[11px]">{project.parameters.safetyFactor}x</span>
                  </div>
                </div>
              </div>

              <div>
                {/* Progress */}
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between text-[10px] font-mono text-[#969DA5]">
                    <span>Design Milestone</span>
                    <span className="text-[#F0F1F2] font-semibold">{project.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-[#14171A] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#64D6C5] rounded-full"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer Tags & Modified */}
                <div className="flex justify-between items-center text-[10px] text-[#6C737D] pt-2 border-t border-[#2A2E35] font-mono">
                  <div className="flex gap-1 overflow-hidden">
                    {project.tags.slice(0, 2).map((t) => (
                      <span key={t} className="px-1 py-0.2 rounded-[2px] bg-[#22262A] text-[#969DA5] text-[9px]">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock size={10} />
                    {new Date(project.lastModified).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="col-span-full py-12 text-center text-[#969DA5] font-mono text-xs">
            No engineering assemblies matching search criteria.
          </div>
        )}
      </div>
    </div>
  );
}
