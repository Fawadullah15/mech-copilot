import React, { useState } from 'react';
import {
  Download,
  Sparkles,
  Search,
  Menu,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageId } from '../types';

export default function TopBar() {
  const {
    activeProject,
    designParams,
    selectedMaterial,
    analysisResults,
    engineeringWarnings,
    activePage,
    setActivePage,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setIsCommandPaletteOpen,
    copilotOpen,
    setCopilotOpen,
  } = useApp();

  const [exportNotice, setExportNotice] = useState(false);

  const handleExport = () => {
    try {
      const exportBundle = {
        application: 'QUANTUM // Mechanical Engineering Design Copilot',
        version: '2.4',
        exportedAt: new Date().toISOString(),
        project: activeProject,
        parameters: designParams,
        material: {
          id: selectedMaterial.id,
          name: selectedMaterial.name,
          category: selectedMaterial.category,
          yieldStrengthMPa: selectedMaterial.yieldStrength,
          tensileStrengthMPa: selectedMaterial.tensileStrength,
          elasticModulusGPa: selectedMaterial.elasticModulus,
          densityKgM3: selectedMaterial.density,
        },
        analysis: analysisResults
          ? {
              vonMisesStressMPa: analysisResults.vonMisesStress,
              yieldStrengthMPa: analysisResults.yieldStrength,
              factorOfSafety: analysisResults.factorOfSafety,
              maxDeflectionMm: analysisResults.maxDeflection,
              torqueCapacityNm: analysisResults.torqueCapacity,
              status: analysisResults.status,
            }
          : null,
        activeWarnings: engineeringWarnings.map((w) => ({
          id: w.id,
          title: w.title,
          severity: w.severity,
        })),
      };
      const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quantum_spec_${activeProject.id}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportNotice(true);
      setTimeout(() => setExportNotice(false), 2500);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const navModes: { id: PageId; label: string }[] = [
    { id: 'workspace', label: 'Workspace' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'calculations', label: 'Calculations' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <header className="h-11 w-full bg-[#191C1F] border-b border-[#34393F] flex items-center justify-between px-3 sm:px-4 font-sans shrink-0 relative z-30 select-none">
      {/* Left: Brand Identity & Active Project */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-1 rounded-[4px] text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#22262A] transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu size={16} />
        </button>

        {/* Quantum AI Technical Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-xs font-bold tracking-wider text-[#F0F1F2]">QUANTUM AI</span>
            <span className="text-[10px] font-medium text-[#64D6C5] tracking-tight">// ME COPILOT</span>
          </div>

          <span className="text-[#34393F] hidden sm:inline">|</span>

          {/* Project Name & Specs */}
          <div className="hidden sm:flex items-center gap-2 font-mono text-xs">
            <span className="text-[#F0F1F2] font-semibold">{activeProject.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-[3px] bg-[#22262A] text-[#969DA5] border border-[#34393F]">
              {selectedMaterial.name} · ⌀{designParams.diameter}mm
            </span>
          </div>
        </div>

        {/* SQLite Persistence Pulse */}
        <div className="hidden xl:flex items-center gap-1.5 text-[10px] font-mono text-[#969DA5] pl-2 border-l border-[#34393F]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
          <span>SQLite Synced</span>
        </div>
      </div>

      {/* Center: Mode Switcher */}
      <div className="hidden md:flex items-center bg-[#111315] border border-[#34393F] rounded-[4px] p-0.5">
        {navModes.map((mode) => {
          const isActive = activePage === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setActivePage(mode.id)}
              className={`px-3 py-1 text-xs font-medium rounded-[3px] transition-colors ${
                isActive
                  ? 'bg-[#22262A] text-[#64D6C5] shadow-xs'
                  : 'text-[#969DA5] hover:text-[#F0F1F2]'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* Right Actions: Command Palette, Export, Copilot Toggle */}
      <div className="flex items-center gap-2">
        {/* Command Palette Trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#111315] border border-[#34393F] hover:border-[#464C54] text-xs text-[#969DA5] hover:text-[#F0F1F2] transition-colors font-mono"
          title="Open Command Palette (Cmd/Ctrl + K)"
        >
          <Search size={12} className="text-[#64D6C5]" />
          <span className="text-[11px]">Command Palette</span>
          <kbd className="px-1 py-0.2 rounded text-[9px] bg-[#22262A] border border-[#34393F] text-[#969DA5]">
            ⌘K
          </kbd>
        </button>

        {/* Export JSON Spec */}
        <button
          onClick={handleExport}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5 rounded-[4px]"
          title="Export JSON technical specification"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Copilot Toggle Button */}
        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          className={`px-2.5 py-1 text-xs font-medium rounded-[4px] border transition-colors flex items-center gap-1.5 ${
            copilotOpen
              ? 'bg-[#64D6C5] text-[#111315] border-[#64D6C5] font-semibold'
              : 'bg-[#22262A] text-[#64D6C5] border-[#34393F] hover:border-[#64D6C5]'
          }`}
          title="Toggle Copilot Assistant"
        >
          <Sparkles size={12} />
          <span>Copilot</span>
        </button>
      </div>

      {/* Export Toast Notification */}
      {exportNotice && (
        <div className="absolute top-12 right-4 bg-[#191C1F] border border-[#34D399]/40 text-[#34D399] px-3.5 py-2 rounded-[4px] text-xs flex items-center gap-2 shadow-xl animate-fade-in z-50 font-mono">
          <FileCheck size={14} className="text-[#34D399]" />
          <span>Exported: {activeProject.name} calculation specification.</span>
        </div>
      )}
    </header>
  );
}
