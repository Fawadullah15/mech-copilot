import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Maximize,
  Bell,
  Download,
  Menu,
  Share2,
  Play,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  History,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../design-system/ThemeContext';

export default function TopBar() {
  const {
    activeProject,
    designParams,
    selectedMaterial,
    activePage,
    setActivePage,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setIsVersionHistoryOpen,
    setIsWarningsDrawerOpen,
    engineeringWarnings,
    designVersions,
    canvasMode,
    setCanvasMode,
    runAnalysis,
    isAnalysisRunning,
    copilotOpen,
    setCopilotOpen,
    saveStatus,
    saveError,
    saveProjectNow,
    resetParamsToStandard,
    setIsProblemModalOpen,
  } = useApp();

  const { theme, toggleTheme } = useTheme();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleExportJSON = () => {
    const exportBundle = {
      application: 'Quantum MechAI // Engineering Copilot',
      version: designVersions[0]?.version || 'v1.0',
      exportedAt: new Date().toISOString(),
      project: activeProject,
      parameters: designParams,
      material: selectedMaterial,
    };
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mech_copilot_${activeProject?.id || 'shaft'}_spec.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setActiveMenu(null);
  };

  const handleShareSpec = async () => {
    const summary = [
      `Quantum MechAI Project: ${activeProject ? activeProject.name : 'Workspace Draft'}`,
      `Geometry: Ø${designParams.diameter} mm × ${designParams.length} mm`,
      `Material: ${selectedMaterial.name} (Sy = ${selectedMaterial.yieldStrength} MPa)`,
      `Loads: ${designParams.torque} N·m @ ${designParams.rpm} RPM, Radial ${designParams.force} N`,
      `Target FoS: ${designParams.safetyFactor}x (${designParams.criterion || 'Von Mises'})`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      // fallback ignore
    }
  };

  const renderSavePill = () => {
    if (!activeProject) {
      return (
        <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F1F5F9] dark:bg-[#1E2D45] border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-mono text-[#64748B] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
          <span>No Active Project</span>
        </span>
      );
    }
    if (saveStatus === 'saving') {
      return (
        <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-[#1E3A5F] border border-[#BFDBFE] dark:border-[#2563EB]/40 text-[11px] font-mono text-[#2563EB] shrink-0">
          <Loader2 size={10} className="animate-spin" />
          <span>Saving...</span>
        </span>
      );
    }
    if (saveStatus === 'unsaved') {
      return (
        <button
          type="button"
          onClick={() => saveProjectNow()}
          title="Click to save changes now"
          className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FFFBEB] dark:bg-[#451A03]/40 border border-[#FDE68A] dark:border-[#D97706]/40 text-[11px] font-mono text-[#D97706] hover:bg-[#FEF3C7] transition-colors shrink-0"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
          <span>Unsaved changes</span>
        </button>
      );
    }
    if (saveStatus === 'error') {
      return (
        <button
          type="button"
          onClick={() => saveProjectNow()}
          title={saveError || 'Failed to save changes. Click to retry.'}
          className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FEF2F2] dark:bg-[#450A0A]/40 border border-[#FECACA] dark:border-[#DC2626]/40 text-[11px] font-mono text-[#DC2626] shrink-0"
        >
          <AlertCircle size={10} />
          <span>Save failed · Retry</span>
        </button>
      );
    }
    return (
      <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F0FDF4] dark:bg-[#052E16]/40 border border-[#BBF7D0] dark:border-[#16A34A]/40 text-[11px] font-mono text-[#16A34A] shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
        <span>Saved</span>
      </span>
    );
  };

  const currentVersionLabel = designVersions[0]?.version || 'v1.0';
  const menuPopupClass =
    'absolute left-0 top-full mt-1 w-52 bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#1E2D45] rounded-[6px] shadow-[0_8px_24px_-4px_rgba(15,23,42,0.12)] py-1 z-50 text-[12px]';
  const menuItemClass =
    'w-full px-3 py-1.5 text-left hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942] flex items-center justify-between text-[#172033] dark:text-[#F0F4FA] transition-colors';

  return (
    <header className="h-[62px] w-full bg-white dark:bg-[#101A2B] border-b border-[#E2E8F0] dark:border-[#1E2D45] flex items-center justify-between px-3 sm:px-4 font-sans shrink-0 z-30 select-none gap-2">
      {/* Left: Mobile Drawer Trigger, Back, Breadcrumb, Version, Save State */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-1.5 rounded-[6px] text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu size={16} />
        </button>

        <button
          onClick={() => setActivePage('projects')}
          className="p-1.5 rounded-[6px] text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] transition-colors shrink-0"
          title="All Projects"
        >
          <ChevronRight size={15} className="rotate-180" />
        </button>

        <div className="flex items-center gap-1.5 text-[13px] min-w-0">
          <button
            type="button"
            onClick={() => setActivePage('projects')}
            className="hidden md:inline text-[#64748B] hover:text-[#172033] dark:hover:text-white font-medium transition-colors shrink-0"
          >
            Projects
          </button>
          <ChevronRight size={13} className="hidden md:inline text-[#CBD5E1] shrink-0" />
          <span className="hidden sm:inline text-[#172033] dark:text-white font-semibold truncate max-w-[140px] lg:max-w-[200px] xl:max-w-[240px]">
            {activeProject ? activeProject.name : 'Workspace Session'}
          </span>
        </div>

        <button
          onClick={() => setIsVersionHistoryOpen(true)}
          className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#F1F5F9] dark:bg-[#1B2942] border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-mono font-medium text-[#172033] dark:text-white hover:border-[#2563EB] transition-colors shrink-0"
          title="Design Revisions & Checkpoints"
        >
          <span>{currentVersionLabel}</span>
          <ChevronDown size={10} className="text-[#64748B]" />
        </button>

        {renderSavePill()}
      </div>

      {/* Center: Compact Workstation Menus */}
      <nav className="hidden xl:flex items-center gap-0.5 text-[12px] font-sans text-[#334155] dark:text-[#94A3B8] relative">
        {/* File */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
            className={`px-2 py-1 rounded-[5px] flex items-center gap-1 transition-colors ${
              activeMenu === 'file' ? 'bg-[#F1F5F9] text-[#2563EB] font-semibold' : 'hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
          >
            <span>File</span>
            <ChevronDown size={11} />
          </button>
          {activeMenu === 'file' && (
            <div className={menuPopupClass}>
              <button onClick={() => { setIsProblemModalOpen(true); setActiveMenu(null); }} className={menuItemClass}>
                <span>New Design Spec...</span><span className="text-[10px] text-[#94A3B8] font-mono">Ctrl+N</span>
              </button>
              <button onClick={() => { setActivePage('projects'); setActiveMenu(null); }} className={menuItemClass}>
                <span>Open Project...</span><span className="text-[10px] text-[#94A3B8] font-mono">Ctrl+O</span>
              </button>
              <button onClick={() => { saveProjectNow(); setActiveMenu(null); }} className={menuItemClass}>
                <span>Save Project Parameters</span><span className="text-[10px] text-[#94A3B8] font-mono">Ctrl+S</span>
              </button>
              <div className="my-1 border-t border-[#E2E8F0] dark:border-[#1E2D45]" />
              <button onClick={handleExportJSON} className={menuItemClass}>
                <span>Export JSON Spec</span><span className="text-[10px] text-[#94A3B8] font-mono">JSON</span>
              </button>
              <button onClick={() => { setActivePage('reports'); setActiveMenu(null); }} className={menuItemClass}>
                <span>Engineering Report</span><span className="text-[10px] text-[#94A3B8] font-mono">PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Edit */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
            className={`px-2 py-1 rounded-[5px] flex items-center gap-1 transition-colors ${
              activeMenu === 'edit' ? 'bg-[#F1F5F9] text-[#2563EB] font-semibold' : 'hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
          >
            <span>Edit</span>
            <ChevronDown size={11} />
          </button>
          {activeMenu === 'edit' && (
            <div className={menuPopupClass}>
              <button onClick={() => { setIsVersionHistoryOpen(true); setActiveMenu(null); }} className={menuItemClass}>
                <span className="flex items-center gap-1.5"><History size={12} /> Version Snapshots</span>
              </button>
              <button onClick={() => { resetParamsToStandard(); setActiveMenu(null); }} className={menuItemClass}>
                <span className="flex items-center gap-1.5"><RotateCcw size={12} /> Reset to Baseline</span>
              </button>
            </div>
          )}
        </div>

        {/* View */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
            className={`px-2 py-1 rounded-[5px] flex items-center gap-1 transition-colors ${
              activeMenu === 'view' ? 'bg-[#F1F5F9] text-[#2563EB] font-semibold' : 'hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
          >
            <span>View</span>
            <ChevronDown size={11} />
          </button>
          {activeMenu === 'view' && (
            <div className={menuPopupClass}>
              <button onClick={() => { setCanvasMode('3d'); setActivePage('workspace'); setActiveMenu(null); }} className={menuItemClass}>3D CAD Model</button>
              <button onClick={() => { setCanvasMode('2d'); setActivePage('workspace'); setActiveMenu(null); }} className={menuItemClass}>2D Orthographic Blueprint</button>
              <button onClick={() => { setCanvasMode('split'); setActivePage('workspace'); setActiveMenu(null); }} className={menuItemClass}>Split 3D + 2D View</button>
            </div>
          )}
        </div>

        {/* Analyze */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'analyze' ? null : 'analyze')}
            className={`px-2 py-1 rounded-[5px] flex items-center gap-1 transition-colors ${
              activeMenu === 'analyze' ? 'bg-[#F1F5F9] text-[#2563EB] font-semibold' : 'hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
          >
            <span>Analyze</span>
            <ChevronDown size={11} />
          </button>
          {activeMenu === 'analyze' && (
            <div className={menuPopupClass}>
              <button onClick={() => { runAnalysis(); setActiveMenu(null); }} className={`${menuItemClass} text-[#2563EB] font-semibold`}>
                Run Stress Analysis
              </button>
              <button onClick={() => { setActivePage('analysis'); setActiveMenu(null); }} className={menuItemClass}>
                Stress & Fatigue Charts
              </button>
              <button onClick={() => { setActivePage('calculations'); setActiveMenu(null); }} className={menuItemClass}>
                Governing Equations
              </button>
            </div>
          )}
        </div>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'export' ? null : 'export')}
            className={`px-2 py-1 rounded-[5px] flex items-center gap-1 transition-colors ${
              activeMenu === 'export' ? 'bg-[#F1F5F9] text-[#2563EB] font-semibold' : 'hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
            }`}
          >
            <span>Export</span>
            <ChevronDown size={11} />
          </button>
          {activeMenu === 'export' && (
            <div className={menuPopupClass}>
              <button onClick={handleExportJSON} className={menuItemClass}>
                <span className="flex items-center gap-1.5"><Download size={12} /> Download JSON Spec</span>
              </button>
              <button onClick={() => { setActivePage('reports'); setActiveMenu(null); }} className={menuItemClass}>
                <span className="flex items-center gap-1.5"><FileText size={12} /> Open PDF / Print Report</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Right Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* 3D / 2D Display Switch */}
        <div className="hidden md:flex items-center bg-[#F1F5F9] dark:bg-[#1B2942] rounded-[6px] p-0.5 border border-[#E2E8F0] dark:border-[#334155]">
          <button
            onClick={() => { setCanvasMode('3d'); if (activePage !== 'workspace') setActivePage('workspace'); }}
            className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold transition-all ${
              canvasMode === '3d' ? 'bg-white dark:bg-[#101A2B] text-[#2563EB] shadow-xs' : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white'
            }`}
          >
            3D
          </button>
          <button
            onClick={() => { setCanvasMode('2d'); if (activePage !== 'workspace') setActivePage('workspace'); }}
            className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold transition-all ${
              canvasMode === '2d' ? 'bg-white dark:bg-[#101A2B] text-[#2563EB] shadow-xs' : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white'
            }`}
          >
            2D
          </button>
        </div>

        {/* Share Spec */}
        <button
          onClick={handleShareSpec}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] dark:border-[#334155] text-[12px] font-medium text-[#334155] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942] transition-colors"
          title="Copy engineering summary to clipboard"
        >
          {copiedShare ? <Check size={13} className="text-[#16A34A]" /> : <Share2 size={13} />}
          <span className="hidden 2xl:inline">{copiedShare ? 'Copied' : 'Share'}</span>
        </button>

        {/* Export Quick Action on < xl screens */}
        <button
          onClick={handleExportJSON}
          className="flex xl:hidden items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] dark:border-[#334155] text-[12px] font-medium text-[#334155] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942] transition-colors"
          title="Export Engineering JSON Spec"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Run Analysis Primary CTA */}
        <button
          onClick={() => {
            if (activePage !== 'workspace' && activePage !== 'analysis') {
              setActivePage('workspace');
            }
            runAnalysis();
          }}
          disabled={isAnalysisRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold transition-colors disabled:opacity-60 shadow-xs shrink-0"
        >
          {isAnalysisRunning ? (
            <><Loader2 size={13} className="animate-spin" /><span>Running...</span></>
          ) : (
            <><Play size={12} fill="currentColor" /><span>Run Analysis</span></>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-[6px] border border-[#E2E8F0] dark:border-[#334155] text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex p-1.5 rounded-[6px] border border-[#E2E8F0] dark:border-[#334155] text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] transition-colors"
          title="Toggle Fullscreen"
        >
          <Maximize size={14} />
        </button>

        {/* Copilot Panel Toggle */}
        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          className={`p-1.5 rounded-[6px] border transition-colors relative ${
            copilotOpen
              ? 'bg-[#EFF6FF] dark:bg-[#1E3A5F] text-[#2563EB] border-[#BFDBFE] dark:border-[#2563EB]/40'
              : 'border-[#E2E8F0] dark:border-[#334155] text-[#64748B] hover:text-[#2563EB] hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
          }`}
          title="Toggle MechAI Copilot"
        >
          <Sparkles size={15} />
          {copilotOpen && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          )}
        </button>

        {/* Engineering Warnings Bell */}
        <div className="relative">
          <button
            onClick={() => setIsWarningsDrawerOpen(true)}
            className="p-1.5 rounded-[6px] border border-[#E2E8F0] dark:border-[#334155] text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] transition-colors"
            title={`Engineering Diagnostics (${engineeringWarnings.length} advisories)`}
          >
            <Bell size={15} />
          </button>
          {engineeringWarnings.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-[#DC2626] text-white text-[9px] font-bold flex items-center justify-center font-mono">
              {engineeringWarnings.length}
            </span>
          )}
        </div>

        {/* User Avatar */}
        <div className="hidden sm:flex items-center pl-1.5 border-l border-[#E2E8F0] dark:border-[#334155]">
          <button
            type="button"
            onClick={() => setActivePage('settings')}
            className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-[11px] font-semibold border border-[#E2E8F0] dark:border-[#334155] cursor-pointer"
            title="Fawadullah Imraj - CEO & Engineer"
          >
            FI
          </button>
        </div>
      </div>

      {/* Click-outside to close menus */}
      {activeMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
      )}
    </header>
  );
}
