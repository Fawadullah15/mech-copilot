import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  PenTool,
  BarChart3,
  Layers,
  Calculator,
  FileText,
  Settings,
  Search,
  History,
  Scale,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../design-system/ThemeContext';
import { PageId } from '../types';
import { BrandLogo } from './brand/BrandLogo';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  badge?: string | number;
  badgeVariant?: 'accent' | 'warning' | 'neutral';
}


export default function Sidebar() {
  const {
    activePage,
    setActivePage,
    allProjects,
    engineeringWarnings,
    setIsCommandPaletteOpen,
    setIsVersionHistoryOpen,
    setIsCompareModalOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useApp();

  const { theme, toggleTheme } = useTheme();
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState('Apex Powertrain Division');

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderOpen, badge: allProjects.length },
    { id: 'workspace', label: 'Design Workspace', icon: PenTool, badge: 'Live', badgeVariant: 'accent' },
    {
      id: 'analysis',
      label: 'Engineering Analysis',
      icon: BarChart3,
      badge: engineeringWarnings.length > 0 ? `${engineeringWarnings.length}` : undefined,
      badgeVariant: engineeringWarnings.length > 0 ? 'warning' : undefined,
    },
    { id: 'materials', label: 'Materials Database', icon: Layers },
    { id: 'calculations', label: 'Calculations', icon: Calculator },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`${isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 flex shadow-2xl' : 'hidden lg:flex'} w-64 h-full bg-navy-950 border-r border-navy-800 flex-col font-sans shrink-0 select-none relative z-20 transition-all duration-200`}>
        {/* Top Brand Header */}
        <div className="h-16 px-5 border-b border-navy-800 flex items-center justify-between">
          <BrandLogo size="md" />
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md hover:bg-navy-800 transition-colors"
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

      {/* Workspace Switcher */}
      <div className="px-3 pt-3 pb-2 border-b border-navy-850">
        <div className="relative">
          <button
            onClick={() => setIsWorkspaceMenuOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-navy-900 hover:bg-navy-850 border border-navy-800 text-left transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                AP
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-200 truncate">{activeWorkspace}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">Workspace • Active</div>
              </div>
            </div>
            <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
          </button>

          {isWorkspaceMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 p-1 bg-navy-900 border border-navy-750 rounded-xl shadow-elevation-3 z-30 animate-fade-in text-xs">
              {['Apex Powertrain Division', 'Robotics R&D Lab', 'Gearbox Prototyping Unit'].map((ws) => (
                <button
                  key={ws}
                  onClick={() => {
                    setActiveWorkspace(ws);
                    setIsWorkspaceMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeWorkspace === ws ? 'bg-navy-800 text-white font-semibold' : 'text-slate-300 hover:bg-navy-850'
                  }`}
                >
                  {ws}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Search / Command Center Trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full mt-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-navy-900/60 hover:bg-navy-900 border border-navy-800 text-slate-400 hover:text-slate-200 transition-colors text-xs"
        >
          <div className="flex items-center gap-2">
            <Search size={13} className="text-accent-bright" />
            <span className="text-[11px]">Command Center...</span>
          </div>
          <span className="kbd text-[9px]">⌘K</span>
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-1">
        <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          Platform
        </div>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-white font-semibold border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-900/70 border border-transparent'

              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  size={16}
                  className={isActive ? 'text-accent-bright' : 'text-slate-400'}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    item.badgeVariant === 'accent'
                      ? 'bg-accent/20 text-accent-light'
                      : item.badgeVariant === 'warning'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-navy-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Quick Engineering Tools */}
        <div className="pt-4 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          Engineering Tools
        </div>

        <button
          onClick={() => {
            setIsVersionHistoryOpen(true);
            setIsMobileMenuOpen(false);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-navy-900/70 transition-colors"
        >
          <History size={15} className="text-amber-400/80" />
          <span>Version History</span>
        </button>

        <button
          onClick={() => {
            setIsCompareModalOpen(true);
            setIsMobileMenuOpen(false);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-navy-900/70 transition-colors"
        >
          <Scale size={15} className="text-cyan-400/80" />
          <span>Design Compare</span>
        </button>
      </nav>

      {/* Bottom Profile & Theme Utilities */}
      <div className="p-3 border-t border-navy-850 bg-navy-950/80 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-navy-900 border border-navy-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              ME
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">Lead Engineer</div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Calculation Core v2.4
              </div>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-md hover:bg-navy-800 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={14} className="text-amber-300" /> : <Moon size={14} className="text-blue-400" />}
          </button>
        </div>
      </div>
    </aside>
  </>
  );
}
