import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  PenTool,
  BarChart3,
  Layers,
  Calculator,
  FileText,
  Settings,
  History,
  Scale,
  Sun,
  Moon,
  X,
  Compass,
  Sliders,
  Activity,
  CircleDot,
  Link2,
  Cog,
  Waves,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../design-system/ThemeContext';
import { PageId } from '../types';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  shortcut?: string;
}

export default function Sidebar() {
  const {
    activePage,
    setActivePage,
    allProjects,
    setIsVersionHistoryOpen,
    setIsCompareModalOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useApp();

  const { theme, toggleTheme } = useTheme();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, shortcut: '0' },
    { id: 'workspace', label: 'Design Workspace', icon: PenTool, shortcut: '1' },
    { id: 'analysis', label: 'Engineering Analysis', icon: BarChart3, shortcut: '2' },
    { id: 'calculations', label: 'Calculations', icon: Calculator, shortcut: '3' },
    { id: 'materials', label: 'Materials Database', icon: Layers, shortcut: '4' },
    { id: 'tolerances', label: 'Tolerances & Fits', icon: Sliders, shortcut: '5' },
    { id: 'gdt', label: 'GD&T & CAD Controls', icon: Compass, shortcut: '6' },
    { id: 'fatigue', label: 'Fatigue & S-N Curves', icon: Activity, shortcut: '7' },
    { id: 'bearings', label: 'Bearings & L10 Life', icon: CircleDot, shortcut: '8' },
    { id: 'connections', label: 'Shaft–Hub Connections', icon: Link2, shortcut: '9' },
    { id: 'gears', label: 'Cylindrical Gears', icon: Cog, shortcut: 'G' },
    { id: 'vibration', label: 'Vibration & Dynamics', icon: Waves, shortcut: 'V' },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Slim Desktop Rail / Mobile Drawer */}
      <aside
        className={`${
          isMobileMenuOpen
            ? 'fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-[#191C1F] border-r border-[#34393F] shadow-2xl'
            : 'hidden lg:flex w-[52px] h-full flex-col items-center bg-[#111315] border-r border-[#34393F]'
        } shrink-0 select-none z-30 transition-all duration-150`}
      >
        {/* Top Workstation Badge / Logo */}
        <div
          className={`${
            isMobileMenuOpen
              ? 'h-11 px-3 border-b border-[#34393F] flex items-center justify-between w-full'
              : 'h-11 flex items-center justify-center w-full border-b border-[#34393F]'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[4px] bg-[#191C1F] border border-[#34393F] flex items-center justify-center text-[#64D6C5] shadow-xs">
              <Compass size={15} />
            </div>
            {isMobileMenuOpen && (
              <span className="text-xs font-mono font-bold tracking-wider text-[#F0F1F2]">
                QUANTUM AI
              </span>
            )}
          </div>
          {isMobileMenuOpen && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-[#969DA5] hover:text-[#F0F1F2] p-1 rounded-[4px] hover:bg-[#22262A]"
              title="Close Navigation"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav
          className={`${
            isMobileMenuOpen ? 'flex-1 py-2 px-2 space-y-0.5 w-full' : 'flex-1 py-2 flex flex-col items-center space-y-1 w-full'
          }`}
        >
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.icon;

            if (isMobileMenuOpen) {
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#22262A] text-[#64D6C5] border-l-2 border-[#64D6C5]'
                      : 'text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#22262A]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? 'text-[#64D6C5]' : 'text-[#969DA5]'} />
                    <span>{item.label}</span>
                  </div>
                  {item.shortcut && (
                    <span className="text-[10px] font-mono text-[#636A73]">Alt+{item.shortcut}</span>
                  )}
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                title={`${item.label} (Alt+${item.shortcut})`}
                className={`relative w-9 h-9 rounded-[4px] flex items-center justify-center transition-colors group ${
                  isActive
                    ? 'bg-[#191C1F] text-[#64D6C5] border border-[#34393F]'
                    : 'text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#191C1F]'
                }`}
              >
                {isActive && (
                  <span className="absolute -left-[7px] top-1.5 bottom-1.5 w-[2px] bg-[#64D6C5] rounded-r-xs" />
                )}
                <Icon size={16} />
              </button>
            );
          })}
        </nav>

        {/* Bottom Utility Tools */}
        <div
          className={`${
            isMobileMenuOpen
              ? 'p-3 border-t border-[#34393F] w-full space-y-1.5 bg-[#111315]'
              : 'py-2 flex flex-col items-center space-y-1 w-full border-t border-[#34393F]'
          }`}
        >
          {/* Version History Checkpoints */}
          <button
            onClick={() => {
              setIsVersionHistoryOpen(true);
              setIsMobileMenuOpen(false);
            }}
            title="Version Checkpoint Timeline"
            className={`${
              isMobileMenuOpen
                ? 'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-xs text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#22262A]'
                : 'w-9 h-9 rounded-[4px] flex items-center justify-center text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#191C1F]'
            }`}
          >
            <History size={15} />
            {isMobileMenuOpen && <span>Checkpoints</span>}
          </button>

          {/* Design Comparison */}
          <button
            onClick={() => {
              setIsCompareModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            title="Compare Configurations"
            className={`${
              isMobileMenuOpen
                ? 'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-xs text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#22262A]'
                : 'w-9 h-9 rounded-[4px] flex items-center justify-center text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#191C1F]'
            }`}
          >
            <Scale size={15} />
            {isMobileMenuOpen && <span>Compare Configs</span>}
          </button>

          {/* Theme Switch */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className={`${
              isMobileMenuOpen
                ? 'w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-xs text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#22262A]'
                : 'w-9 h-9 rounded-[4px] flex items-center justify-center text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#191C1F]'
            }`}
          >
            {theme === 'dark' ? <Sun size={15} className="text-[#E7B65C]" /> : <Moon size={15} className="text-[#64D6C5]" />}
            {isMobileMenuOpen && <span className="text-[11px] font-mono">{theme.toUpperCase()}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
