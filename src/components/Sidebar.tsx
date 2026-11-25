import React, { useState } from 'react';
import {
  LayoutGrid,
  FolderOpen,
  Box,
  Layers,
  BookOpen,
  BarChart3,
  FileText,
  Settings,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Sliders,
  Compass,
  Activity,
  CircleDot,
  Link2,
  Cog,
  Waves,
  GitFork,
  X,
  Plus,
  Cpu,
  MessageSquare,
  MessageSquarePlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageId } from '../types';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

export default function Sidebar() {
  const {
    activePage,
    setActivePage,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setCopilotOpen,
    copilotOpen,
    createNewConversation,
    setIsProblemModalOpen,
  } = useApp();

  const [showModules, setShowModules] = useState(false);

  const workspaceNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'workspace', label: 'CAD Workspace', icon: Box },
    { id: 'products', label: 'Components', icon: Cpu },
  ];

  const engineeringNav: NavItem[] = [
    { id: 'materials', label: 'Materials', icon: Layers },
    { id: 'calculations', label: 'Standards', icon: BookOpen },
    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const moduleNavItems: NavItem[] = [
    { id: 'boms', label: 'Bill of Materials', icon: GitFork },
    { id: 'tolerances', label: 'Tolerances & Fits', icon: Sliders },
    { id: 'gdt', label: 'GD&T Controls', icon: Compass },
    { id: 'fatigue', label: 'Fatigue & S-N Curves', icon: Activity },
    { id: 'bearings', label: 'Bearings & Life', icon: CircleDot },
    { id: 'connections', label: 'Shaft-Hub Keyways', icon: Link2 },
    { id: 'gears', label: 'Cylindrical Gears', icon: Cog },
    { id: 'vibration', label: 'Vibration & Critical', icon: Waves },
  ];

  const handleNavigate = (id: PageId) => {
    setActivePage(id);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const handleNewChat = () => {
    createNewConversation();
    setCopilotOpen(true);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = activePage === item.id;
    const Icon = item.icon;
    return (
      <button
        onClick={() => handleNavigate(item.id)}
        className={`w-full h-8 px-3 rounded-[6px] flex items-center gap-2.5 transition-all duration-150 text-[12px] font-sans text-left relative ${
          isActive
            ? 'bg-[#2563EB] text-white font-medium shadow-xs'
            : 'text-[#94A3B8] hover:text-white hover:bg-[#1B2942] font-normal'
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-white rounded-r-full" />
        )}
        <Icon size={15} className={isActive ? 'text-white shrink-0' : 'text-[#64748B] shrink-0'} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Global Navigation Sidebar (216px) */}
      <aside
        className={`${
          isMobileMenuOpen
            ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl'
            : 'hidden lg:flex'
        } w-[216px] flex-col bg-[#111B2C] text-white border-r border-[#1E2D45] select-none shrink-0 h-full overflow-hidden`}
      >
        {/* Brand Header */}
        <div className="h-[62px] px-3.5 flex items-center gap-2.5 border-b border-[#1E2D45] shrink-0">
          <button
            type="button"
            onClick={() => handleNavigate('workspace')}
            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 text-left"
          >
            <div className="w-8 h-8 rounded-[6px] bg-[#2563EB] flex items-center justify-center shrink-0">
              <Cpu size={16} className="text-white" />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[13px] font-semibold tracking-tight text-white truncate">
                Quantum MechAI
              </span>
              <span className="text-[10px] text-[#94A3B8] font-normal truncate">
                Engineering Copilot
              </span>
            </div>
          </button>
          {isMobileMenuOpen && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#1B2942] transition-colors shrink-0"
              aria-label="Close navigation menu"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 min-h-0">
          {/* WORKSPACE */}
          <div>
            <div className="px-2 mb-1">
              <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.08em] font-mono">
                Workspace
              </span>
            </div>
            <div className="space-y-0.5">
              {workspaceNav.map((item) => (
                <NavButton key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* ENGINEERING TOOLS */}
          <div>
            <div className="px-2 mb-1">
              <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.08em] font-mono">
                Engineering Tools
              </span>
            </div>
            <div className="space-y-0.5">
              {engineeringNav.map((item) => (
                <NavButton key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* SPECIALIZED CALCULATORS (Expandable) */}
          <div>
            <button
              onClick={() => setShowModules(!showModules)}
              className="w-full px-2 h-6 flex items-center justify-between text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.08em] font-mono hover:text-[#CBD5E1] transition-colors"
            >
              <span>Calculators & Fits</span>
              {showModules ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showModules && (
              <div className="mt-1 pl-2 space-y-0.5 border-l border-[#1E2D45] ml-2">
                {moduleNavItems.map((item) => {
                  const isActive = activePage === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full h-7 px-2 rounded-[5px] flex items-center gap-2 text-[11px] transition-colors ${
                        isActive
                          ? 'bg-[#2563EB] text-white font-medium'
                          : 'text-[#94A3B8] hover:text-white hover:bg-[#1B2942]'
                      }`}
                    >
                      <Icon size={13} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* SYSTEM & COPILOT */}
          <div className="space-y-1">
            <div className="px-2 mb-1">
              <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.08em] font-mono">
                System
              </span>
            </div>
            <NavButton item={{ id: 'settings', label: 'Settings', icon: Settings }} />

            <button
              onClick={() => {
                setCopilotOpen(!copilotOpen);
                if (isMobileMenuOpen) setIsMobileMenuOpen(false);
              }}
              className={`w-full h-8 px-3 rounded-[6px] flex items-center gap-2.5 transition-all duration-150 text-[12px] font-sans text-left ${
                copilotOpen
                  ? 'bg-[#1B2942] text-[#60A5FA] font-medium border border-[#2563EB]/30'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1B2942]'
              }`}
            >
              <MessageSquare size={15} className={copilotOpen ? 'text-[#60A5FA] shrink-0' : 'text-[#64748B] shrink-0'} />
              <span className="truncate">MechAI Copilot</span>
              {copilotOpen && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#16A34A] shrink-0" />
              )}
            </button>

            <button
              onClick={handleNewChat}
              className="w-full h-7 px-3 rounded-[6px] flex items-center gap-2 text-[11px] text-[#94A3B8] hover:text-white hover:bg-[#1B2942] border border-[#1E2D45] transition-colors"
            >
              <MessageSquarePlus size={13} className="text-[#3B82F6] shrink-0" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Bottom Design Card & User Profile */}
        <div className="p-3 border-t border-[#1E2D45] shrink-0 space-y-3">
          <div className="bg-[#162236] border border-[#24344F] rounded-[8px] p-2.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-[6px] bg-[#2563EB] flex items-center justify-center shrink-0">
                <Sparkles size={13} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white leading-tight truncate">Design Smarter.</p>
                <p className="text-[10px] text-[#94A3B8] truncate">Engineer Better.</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsProblemModalOpen(true);
                if (isMobileMenuOpen) setIsMobileMenuOpen(false);
              }}
              className="w-full py-1.5 px-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-medium rounded-[6px] flex items-center justify-center gap-1 transition-colors"
            >
              <Plus size={12} />
              <span>New Design Spec</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('settings')}
            className="w-full flex items-center gap-2.5 text-left rounded-[6px] p-1 -m-1 hover:bg-[#1B2942] transition-colors"
            title="Account & Preferences"
          >
            <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-semibold text-[11px] border border-white/15 shrink-0">
              FI
            </div>
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span className="text-[12px] font-medium text-white truncate">
                Fawadullah Imraj
              </span>
              <span className="text-[10px] text-[#94A3B8] truncate">CEO & Engineer</span>
            </div>
            <ChevronDown size={13} className="text-[#64748B] shrink-0" />
          </button>
        </div>
      </aside>
    </>
  );
}
