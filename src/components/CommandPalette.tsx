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
  BookOpen,
  Compass,
  Activity,
  CircleDot,
  Link2,
  Cog,
  Waves,
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
    navigateToStandards,
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
      id: 'nav-tolerances',
      category: 'Navigation',
      title: 'Go to Tolerances & Fits',
      subtitle: 'ISO 286 cylindrical limits, fits, and 1D stack-up analysis',
      icon: <Sliders size={16} className="text-[#64D6C5]" />,
      shortcut: 'G T',
      perform: () => {
        close();
        setActivePage('tolerances');
      },
    },
    {
      id: 'nav-gdt',
      category: 'Navigation',
      title: 'Go to GD&T & CAD Controls',
      subtitle: 'Feature Control Frames, Datum Reference Frames, and ISO 1101 / ASME Y14.5',
      icon: <Compass size={16} className="text-[#64D6C5]" />,
      shortcut: 'G G',
      perform: () => {
        close();
        setActivePage('gdt');
      },
    },
    {
      id: 'nav-fatigue',
      category: 'Navigation',
      title: 'Go to Fatigue & S-N Curves',
      subtitle: 'Stress concentrations (Kt, Kf), notch sensitivity, Marin factors, and S-N life',
      icon: <Activity size={16} className="text-[#64D6C5]" />,
      shortcut: 'G F',
      perform: () => {
        close();
        setActivePage('fatigue');
      },
    },
    {
      id: 'nav-bearings',
      category: 'Navigation',
      title: 'Go to Bearings & L10 Life',
      subtitle: 'ISO 281 dynamic L10 rating life, ISO 76 static safety, and shaft reactions',
      icon: <CircleDot size={16} className="text-[#64D6C5]" />,
      shortcut: 'G B',
      perform: () => {
        close();
        setActivePage('bearings');
      },
    },
    {
      id: 'nav-connections',
      category: 'Navigation',
      title: 'Go to Shaft–Hub Connections',
      subtitle: 'DIN 6885-1 parallel keys, DIN 7190-1 interference fits, and thermal assembly',
      icon: <Link2 size={16} className="text-[#64D6C5]" />,
      shortcut: 'G H',
      perform: () => {
        close();
        setActivePage('connections');
      },
    },
    {
      id: 'nav-gears',
      category: 'Navigation',
      title: 'Go to Cylindrical Gears',
      subtitle: 'ISO 21771-1 spur/helical gear pairs, kinematics, and 3D mesh forces',
      icon: <Cog size={16} className="text-[#64D6C5]" />,
      shortcut: 'G E',
      perform: () => {
        close();
        setActivePage('gears');
      },
    },
    {
      id: 'nav-vibration',
      category: 'Navigation',
      title: 'Go to Vibration & Dynamic Rotor Analysis',
      subtitle: 'Lateral modal frequencies, critical speeds, unbalance response, and ISO 21940-11 balancing',
      icon: <Waves size={16} className="text-[#64D6C5]" />,
      shortcut: 'G V',
      perform: () => {
        close();
        setActivePage('vibration');
      },
    },
    {
      id: 'nav-standards',
      category: 'Navigation',
      title: 'Standards Registry & Verification',
      subtitle: 'Inspect ISO, ASME, DIN, ASTM standards and assumptions',
      icon: <BookOpen size={16} className="text-[#64D6C5]" />,
      shortcut: 'G S',
      perform: () => {
        close();
        navigateToStandards();
      },
    },
    {
      id: 'nav-reports',
      category: 'Navigation',
      title: 'Go to Reports',
      subtitle: 'Generate formal engineering calculation report',
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-xs animate-fade-in font-sans"
      onClick={close}
    >
      <div
        className="w-full max-w-2xl bg-[#191C1F] border border-[#34393F] rounded-[4px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-[#34393F] bg-[#22262A] gap-3">
          <Search className="w-4 h-4 text-[#64D6C5] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none text-xs text-[#F0F1F2] placeholder-[#6C737D] focus:outline-none focus:ring-0 font-mono"
            placeholder="Search actions, projects, calculations, or ask Copilot (e.g. 'run analysis', '45 mm')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#14171A] text-[#969DA5] border border-[#34393F]">Esc</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-1.5 divide-y divide-[#2A2E35]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[#969DA5] font-mono text-xs">
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
                  className={`flex items-center justify-between px-3 py-2 rounded-[3px] cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#22262A] text-white border border-[#34393F]'
                      : 'text-[#C2C8D0] hover:bg-[#22262A] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-[3px] bg-[#14171A] border border-[#34393F] shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate text-[#F0F1F2]">{item.title}</span>
                        <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded-[2px] bg-[#14171A] text-[#969DA5] border border-[#2A2E35] shrink-0">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-[#969DA5] truncate mt-0.5 font-mono">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3 font-mono">
                    {item.shortcut && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#14171A] text-[#969DA5] border border-[#34393F]">{item.shortcut}</span>
                    )}
                    {isSelected && <ArrowRight size={13} className="text-[#64D6C5]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#34393F] bg-[#22262A] text-[10px] font-mono text-[#969DA5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Use ↑ ↓ to navigate</span>
            <span>↵ to select</span>
            <span>Esc to close</span>
          </div>
          <span className="text-[#64D6C5]">QUANTUM Command Center</span>
        </div>
      </div>
    </div>
  );
}
