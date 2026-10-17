import React, { useState } from 'react';
import {
  Download,
  Bell,
  Sparkles,
  UploadCloud,
  ShieldAlert,
  FileCheck,
  Search,
  History,
  GitCompare,
  HelpCircle,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import EngineeringStatusSymbol from './brand/EngineeringStatusSymbol';

export default function TopBar() {
  const {
    activeProject,
    designParams,
    selectedMaterial,
    analysisResults,
    engineeringWarnings,
    designVersions,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setIsProblemModalOpen,
    setIsFileUploadModalOpen,
    setIsWarningsDrawerOpen,
    setIsCommandPaletteOpen,
    setIsVersionHistoryOpen,
    setIsCompareModalOpen,
    setIsOnboardingModalOpen,
  } = useApp();

  const [exportNotice, setExportNotice] = useState(false);

  const getStatusSymbolType = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'info';
      case 'Review':
        return 'warning';
      case 'Completed':
        return 'pass';
      default:
        return 'nominal';
    }
  };

  const handleExport = () => {
    try {
      const exportBundle = {
        application: "QUANTUM // Mechanical Engineering Design Copilot",
        version: "2.4",
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
          densityKgM3: selectedMaterial.density
        },
        analysis: analysisResults ? {
          vonMisesStressMPa: analysisResults.vonMisesStress,
          yieldStrengthMPa: analysisResults.yieldStrength,
          factorOfSafety: analysisResults.factorOfSafety,
          maxDeflectionMm: analysisResults.maxDeflection,
          torqueCapacityNm: analysisResults.torqueCapacity,
          status: analysisResults.status
        } : null,
        activeWarnings: engineeringWarnings.map(w => ({ id: w.id, title: w.title, severity: w.severity }))
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
      console.error("Export failed", e);
    }
  };

  return (
    <header className="h-14 w-full bg-navy-900/90 backdrop-blur-md border-b border-navy-800 flex items-center justify-between px-3 sm:px-5 font-sans shrink-0 relative z-30 transition-colors">
      {/* Left: Workspace & Project Breadcrumbs */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        <nav className="flex items-center text-xs text-gray-400 font-mono tracking-tight" aria-label="Breadcrumb">
          <span className="hidden sm:inline text-gray-400 hover:text-gray-200 transition-colors font-medium">Apex Powertrain</span>
          <ChevronRight size={13} className="hidden sm:inline text-navy-600 mx-1" />
          <span className="hidden md:inline text-gray-400 hover:text-gray-200 transition-colors">Shaft Assemblies</span>
          <ChevronRight size={13} className="hidden md:inline text-navy-600 mx-1" />
          <span className="text-gray-100 font-semibold text-xs sm:text-sm tracking-normal truncate max-w-[140px] sm:max-w-[200px]">
            {activeProject.name}
          </span>
        </nav>

        {/* Project Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-navy-700 bg-navy-800/80 text-[11px] font-medium text-gray-300">
          <EngineeringStatusSymbol type={getStatusSymbolType(activeProject.status)} size={11} />
          <span>{activeProject.status}</span>
        </div>

        {/* Autosave Heartbeat */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-gray-400 font-mono pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Sync v{designVersions.length}</span>
        </div>
      </div>

      {/* Center: Global Search & Quick Actions */}
      <div className="hidden md:flex items-center gap-2">
        {/* Command Palette Trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-950/80 hover:bg-navy-950 border border-navy-800 hover:border-navy-700 text-xs text-gray-400 hover:text-gray-200 transition-all shadow-inner w-56 lg:w-64 group"
          title="Open Command Palette (Cmd/Ctrl + K)"
        >
          <Search size={13} className="text-gray-500 group-hover:text-accent transition-colors" />
          <span className="flex-1 text-left truncate text-gray-400">Search actions, CAD, parts...</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-navy-850 text-gray-400 border border-navy-700/80 shadow-sm">
            ⌘K
          </kbd>

        </button>

        {/* Version History Trigger */}
        <button
          onClick={() => setIsVersionHistoryOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-navy-800 hover:border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs text-gray-300 hover:text-white transition-colors"
          title="View checkpoint timeline"
        >
          <History size={13} className="text-accent" />
          <span className="hidden xl:inline">Timeline</span>
          <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-navy-900 text-accent font-bold">
            {designVersions.length}
          </span>
        </button>

        {/* Design Compare Trigger */}
        <button
          onClick={() => setIsCompareModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-navy-800 hover:border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs text-gray-300 hover:text-white transition-colors"
          title="Compare Active vs Candidate Config"
        >
          <GitCompare size={13} className="text-cyan-400" />
          <span className="hidden xl:inline">Compare</span>
        </button>
      </div>

      {/* Right: Warnings, Copilot, Upload, Export, Profile */}
      <div className="flex items-center gap-2">
        {/* Warnings Badge */}
        {engineeringWarnings.length > 0 ? (
          <button
            onClick={() => setIsWarningsDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-medium hover:bg-amber-500/20 transition-all animate-pulse"
            title={`${engineeringWarnings.length} Active Engineering Warnings`}
          >
            <ShieldAlert size={14} />
            <span className="font-mono">{engineeringWarnings.length}</span>
            <span className="hidden sm:inline">Alerts</span>
          </button>
        ) : (
          <div
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-mono"
            title="All parameters in safety envelope"
          >
            <EngineeringStatusSymbol type="pass" size={11} />
            <span>Pass</span>
          </div>
        )}

        {/* Ask Copilot Button */}
        <button
          onClick={() => setIsProblemModalOpen(true)}
          className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg shadow-sm shadow-accent/20"
          title="Describe a mechanical engineering problem"
        >
          <Sparkles size={13} />
          <span>Ask Copilot</span>
        </button>

        {/* Upload CAD/Spec */}
        <button
          onClick={() => setIsFileUploadModalOpen(true)}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg"
          title="Upload technical drawing (STEP, DXF, PDF)"
        >
          <UploadCloud size={13} />
          <span className="hidden lg:inline">Specs</span>
        </button>

        {/* Export Action */}
        <button
          onClick={handleExport}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg"
          title="Export STEP CAD model and calculations"
        >
          <Download size={13} />
          <span className="hidden lg:inline">Export</span>
        </button>

        {/* Onboarding Guide Trigger */}
        <button
          onClick={() => setIsOnboardingModalOpen(true)}
          className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-navy-800 transition-colors"
          title="Guided Workspace Tour"
        >
          <HelpCircle size={16} />
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setIsWarningsDrawerOpen(true)}
          className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-navy-800 transition-colors relative"
          title="Notifications & Alerts"
        >
          <Bell size={16} />
          {engineeringWarnings.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-navy-900"></span>
          )}
        </button>

        {/* User avatar */}
        <div
          className="w-7 h-7 rounded-full bg-linear-to-tr from-accent to-cyan-500 flex items-center justify-center text-white text-[11px] font-bold shadow-sm shadow-accent/20 ml-1 relative cursor-pointer"
          title="User: Senior Powertrain Engineer"
        >

          <span>ME</span>
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full ring-1 ring-navy-900"></span>
        </div>
      </div>

      {/* Export Toast Notification */}
      {exportNotice && (
        <div className="absolute top-16 right-6 bg-navy-900 border border-status-pass/40 text-status-pass px-4 py-2.5 rounded-xl text-xs flex items-center gap-2.5 shadow-2xl animate-fade-in z-50">
          <FileCheck size={16} className="text-emerald-400" />
          <span>Export bundle downloaded: {activeProject.name} parameters & calculation specification.</span>
        </div>
      )}
    </header>
  );
}
