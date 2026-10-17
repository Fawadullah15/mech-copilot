import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Play,
  Sparkles,
  Sliders,
  UploadCloud,
  FileText,
  History,
  Scale,
  Sun,
  Moon,
  FolderOpen,
  LayoutDashboard,
  PenTool,
  BarChart3,
  Layers,
  Calculator,
  Settings,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../design-system/ThemeContext';
import { PageId } from '../types';

interface CommandItem {
  id: string;
  category: 'Actions' | 'Navigation' | 'Engineering' | 'Projects' | 'Copilot';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  perform: () => void;
}

export default function CommandPalette() {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setActivePage,
    allProjects,
    setActiveProject,
    runAnalysis,
    setIsProblemModalOpen,
    setIsOptimizationModalOpen,
    setIsFileUploadModalOpen,
    setIsVersionHistoryOpen,
    setIsCompareModalOpen,
    updateDesignParam,
    selectMaterial,
    allMaterials,
    sendCopilotMessage,
  } = useApp();

  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const close = () => setIsCommandPaletteOpen(false);

  // Command Palette Items
  const commands: CommandItem[] = [
    // Actions
    {
      id: 'act-analysis',
      category: 'Actions',
      title: 'Run Simulation & Stress Analysis',
      subtitle: 'Execute full analytical FEA verification',
      icon: <Play size={16} className="text-emerald-400" />,
      shortcut: '⌘Enter',
      perform: () => {
        close();
        runAnalysis();
        setActivePage('analysis');
      },
    },
    {
      id: 'act-copilot',
      category: 'Actions',
      title: 'Ask Engineering Copilot',
      subtitle: 'Natural language specification prompt',
      icon: <Sparkles size={16} className="text-accent-bright" />,
      shortcut: '⌘J',
      perform: () => {
        close();
        setIsProblemModalOpen(true);
      },
    },
    {
      id: 'act-optimize',
      category: 'Actions',
      title: 'Launch Multi-Objective Optimizer',
      subtitle: 'Explore Pareto trade-offs for mass & cost',
      icon: <Sliders size={16} className="text-purple-400" />,
      shortcut: '⌘O',
      perform: () => {
        close();
        setIsOptimizationModalOpen(true);
      },
    },
    {
      id: 'act-upload',
      category: 'Actions',
      title: 'Upload Technical Drawing or CAD',
      subtitle: 'Extract dimensions from PDF or STEP files',
      icon: <UploadCloud size={16} className="text-cyan-400" />,
      shortcut: '⌘U',
      perform: () => {
        close();
        setIsFileUploadModalOpen(true);
      },
    },
    {
      id: 'act-version',
      category: 'Actions',
      title: 'Design Version History',
      subtitle: 'Review revisions and restore checkpoints',
      icon: <History size={16} className="text-amber-400" />,
      shortcut: '⌘H',
      perform: () => {
        close();
        setIsVersionHistoryOpen(true);
      },
    },
    {
      id: 'act-compare',
      category: 'Actions',
      title: 'Design Compare Mode',
      subtitle: 'Compare two shaft configurations side-by-side',
      icon: <Scale size={16} className="text-cyan-300" />,
      shortcut: '⌘D',
      perform: () => {
        close();
        setIsCompareModalOpen(true);
      },
    },
    {
      id: 'act-theme',
      category: 'Actions',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`,
      subtitle: 'Toggle interface display mode',
      icon: theme === 'dark' ? <Sun size={16} className="text-amber-300" /> : <Moon size={16} className="text-blue-400" />,
      shortcut: '⌘T',
      perform: () => {
        toggleTheme();
        close();
      },
    },

    // Navigation
    {
      id: 'nav-workspace',
      category: 'Navigation',
      title: 'Go to Design Workspace',
      subtitle: '3D assembly view and live dimensions',
      icon: <PenTool size={16} className="text-slate-300" />,
      shortcut: 'G W',
      perform: () => {
        close();
        setActivePage('workspace');
      },
    },
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Go to Dashboard',
      subtitle: 'Project command center and health scores',
      icon: <LayoutDashboard size={16} className="text-slate-300" />,
      shortcut: 'G D',
      perform: () => {
        close();
        setActivePage('dashboard');
      },
    },
    {
      id: 'nav-analysis',
      category: 'Navigation',
      title: 'Go to Engineering Analysis',
      subtitle: 'Stress distributions, S-N curve, and margins',
      icon: <BarChart3 size={16} className="text-slate-300" />,
      shortcut: 'G A',
      perform: () => {
        close();
        setActivePage('analysis');
      },
    },
    {
      id: 'nav-materials',
      category: 'Navigation',
      title: 'Go to Materials Database',
      subtitle: 'Explore alloys, titanium, and steel catalog',
      icon: <Layers size={16} className="text-slate-300" />,
      shortcut: 'G M',
      perform: () => {
        close();
        setActivePage('materials');
      },
    },
    {
      id: 'nav-calc',
      category: 'Navigation',
      title: 'Go to Calculations',
      subtitle: 'Interactive formulas and derivations',
      icon: <Calculator size={16} className="text-slate-300" />,
      shortcut: 'G C',
      perform: () => {
        close();
        setActivePage('calculations');
      },
    },
    {
      id: 'nav-reports',
      category: 'Navigation',
      title: 'Go to Reports',
      subtitle: 'Generate engineering certification document',
      icon: <FileText size={16} className="text-slate-300" />,
      shortcut: 'G R',
      perform: () => {
        close();
        setActivePage('reports');
      },
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      title: 'Go to Settings',
      subtitle: 'Units, preferences, and workspace options',
      icon: <Settings size={16} className="text-slate-300" />,
      shortcut: 'G S',
      perform: () => {
        close();
        setActivePage('settings');
      },
    },

    // Projects
    ...allProjects.map((p) => ({
      id: `proj-${p.id}`,
      category: 'Projects' as const,
      title: `Open Project: ${p.name}`,
      subtitle: `${p.type} • Status: ${p.status}`,
      icon: <FolderOpen size={16} className="text-accent-light" />,
      perform: () => {
        close();
        setActiveProject(p);
        setActivePage('workspace');
      },
    })),

    // Engineering Quick Tweaks
    {
      id: 'eng-dia-45',
      category: 'Engineering',
      title: 'Set Shaft Diameter to 45 mm (Standard ISO Fit)',
      subtitle: 'Recommended journal size for ISO 6209 bearings',
      icon: <Zap size={16} className="text-accent-bright" />,
      perform: () => {
        updateDesignParam('diameter', 45);
        close();
      },
    },
    {
      id: 'eng-mat-4140',
      category: 'Engineering',
      title: 'Switch Material to AISI 4140 Alloy Steel',
      subtitle: 'Quenched & Tempered (Sy = 655 MPa)',
      icon: <Layers size={16} className="text-blue-400" />,
      perform: () => {
        selectMaterial('aisi-4140');
        close();
      },
    },
    {
      id: 'eng-mat-4340',
      category: 'Engineering',
      title: 'Switch Material to AISI 4340 High-Strength Steel',
      subtitle: 'Extreme Duty (Sy = 710 MPa, Su = 1110 MPa)',
      icon: <Layers size={16} className="text-indigo-400" />,
      perform: () => {
        selectMaterial('aisi-4340');
        close();
      },
    },

    // Copilot Queries
    {
      id: 'copilot-check',
      category: 'Copilot',
      title: 'Ask: "Check this shaft design"',
      subtitle: 'Calculate stress margins and factor of safety',
      icon: <Sparkles size={16} className="text-accent-bright" />,
      perform: () => {
        close();
        sendCopilotMessage('Check this shaft design');
      },
    },
    {
      id: 'copilot-fos',
      category: 'Copilot',
      title: 'Ask: "Why is the safety factor low?"',
      subtitle: 'Root cause analysis of torsional & bending stress',
      icon: <Sparkles size={16} className="text-amber-400" />,
      perform: () => {
        close();
        sendCopilotMessage('Why is the safety factor low?');
      },
    },
    {
      id: 'copilot-material',
      category: 'Copilot',
      title: 'Ask: "Recommend a better material"',
      subtitle: 'Find alloys with higher endurance limits',
      icon: <Sparkles size={16} className="text-cyan-400" />,
      perform: () => {
        close();
        sendCopilotMessage('Recommend a better material');
      },
    },
  ];

  // Filtered by query
  const filtered = commands.filter((c) => {
    const q = query.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
      c.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].perform();
      }
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/75 backdrop-blur-sm animate-fade-in font-sans"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl bg-navy-900 border border-navy-700/90 rounded-2xl shadow-elevation-3 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-navy-800 bg-navy-950/70 gap-3">
          <Search className="w-5 h-5 text-accent-bright shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0 font-sans"
            placeholder="Search actions, projects, calculations, or ask Copilot (e.g. 'run analysis', '45 mm')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="kbd">Esc</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-navy-800/40">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching commands or actions found for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={item.id}
                  onClick={() => item.perform()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-navy-800 text-white border border-navy-700/80'
                      : 'text-slate-300 hover:bg-navy-850/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-navy-950/70 border border-navy-800 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate text-slate-100">{item.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-navy-950 text-slate-400 border border-navy-800 shrink-0">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.shortcut && (
                      <span className="kbd">{item.shortcut}</span>
                    )}
                    {isSelected && <ArrowRight size={14} className="text-accent-bright" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-navy-800 bg-navy-950/90 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="kbd text-[9px]">↑</kbd> <kbd className="kbd text-[9px]">↓</kbd> to navigate</span>
            <span><kbd className="kbd text-[9px]">↵</kbd> to select</span>
            <span><kbd className="kbd text-[9px]">Esc</kbd> to close</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">QUANTUM Command Center</span>
        </div>
      </div>
    </div>
  );
}
