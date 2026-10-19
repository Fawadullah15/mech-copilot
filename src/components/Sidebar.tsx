import React, { useState, useRef, useEffect } from 'react';
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
  Pin,
  PinOff,
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

  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    try {
      return localStorage.getItem('quantum_sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  const togglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('quantum_sidebar_pinned', String(next));
      } catch {}
      return next;
    });
  };

  const isExpanded = isMobileMenuOpen || isPinned || isHovered;

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

      {/* Desktop Layout Spacer: reserves space so opening drawer does not push main content */}
      <div
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ease-out ${
          isPinned ? 'w-60' : 'w-[52px]'
        }`}
        aria-hidden="true"
      />

      {/* Desktop Floating Drawer / Mobile Slide-over Drawer */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`${
          isMobileMenuOpen
            ? 'fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-[#191C1F] border-r border-[#34393F] shadow-2xl overflow-hidden'
            : `hidden lg:flex fixed inset-y-0 left-0 z-40 h-full max-h-screen flex-col bg-[#111315] border-r border-[#34393F] transition-all duration-200 ease-out overflow-hidden select-none ${
                isExpanded
                  ? 'w-60 shadow-[8px_0_32px_rgba(0,0,0,0.7)]'
                  : 'w-[52px]'
              }`
        }`}
      >
        {/* Top Workstation Badge / Logo */}
        <div className="h-11 px-3 border-b border-[#34393F] flex items-center justify-between w-full shrink-0 bg-[#111315]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-[4px] bg-[#191C1F] border border-[#34393F] flex items-center justify-center text-[#64D6C5] shadow-xs shrink-0">
              <Compass size={15} />
            </div>
            <div
              className={`transition-all duration-200 overflow-hidden whitespace-nowrap ${
                isExpanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0'
              }`}
            >
              <span className="text-xs font-mono font-bold tracking-wider text-[#F0F1F2]">
                QUANTUM AI
              </span>
            </div>
          </div>

          {isMobileMenuOpen ? (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-[#969DA5] hover:text-[#F0F1F2] p-1 rounded-[4px] hover:bg-[#22262A]"
              title="Close Navigation"
            >
              <X size={16} />
            </button>
          ) : (
            <button
              onClick={togglePin}
              className={`text-[#969DA5] hover:text-[#F0F1F2] p-1 rounded-[4px] hover:bg-[#22262A] transition-all duration-200 ${
                isExpanded ? 'opacity-100 max-w-[32px]' : 'opacity-0 max-w-0 pointer-events-none'
              }`}
              title={isPinned ? 'Unpin Sidebar (Floating Drawer Mode)' : 'Pin Sidebar (Keep Open)'}
            >
              {isPinned ? (
                <PinOff size={14} className="text-[#64D6C5]" />
              ) : (
                <Pin size={14} className="text-[#969DA5] hover:text-[#64D6C5]" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav
          className="flex-1 py-2 px-1.5 space-y-0.5 w-full min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar"
          tabIndex={-1}
        >
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
                title={!isExpanded ? `${item.label} (Alt+${item.shortcut || ''})` : undefined}
                className={`group relative w-full h-9 rounded-[4px] flex items-center transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-[#191C1F] text-[#64D6C5] border border-[#34393F]'
                    : 'text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#191C1F] border border-transparent'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] bg-[#64D6C5] rounded-r-xs" />
                )}

                {/* Icon Container - consistently positioned */}
                <div className="w-[38px] h-full flex items-center justify-center shrink-0">
                  <Icon
                    size={16}
                    className={`transition-colors ${
                      isActive ? 'text-[#64D6C5]' : 'text-[#969DA5] group-hover:text-[#F0F1F2]'
                    }`}
                  />
                </div>

                {/* Item Label & Shortcut - revealed in drawer mode */}
                <div
                  className={`flex items-center justify-between flex-1 min-w-0 pr-2.5 transition-all duration-200 overflow-hidden whitespace-nowrap ${
                    isExpanded
                      ? 'opacity-100 max-w-[185px]'
                      : 'opacity-0 max-w-0 pointer-events-none'
                  }`}
                >
                  <span className="truncate text-xs font-medium tracking-tight">
                    {item.label}
                  </span>
                  {item.shortcut && (
                    <span className="text-[10px] font-mono text-[#636A73] group-hover:text-[#969DA5] shrink-0 ml-1.5 px-1 py-0.5 rounded bg-[#111315]/80 border border-[#34393F]/50">
                      Alt+{item.shortcut}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Utility Tools */}
        <div className="py-2 px-1.5 flex flex-col space-y-1 w-full border-t border-[#34393F] shrink-0 bg-[#111315]">
          {/* Version Checkpoint Timeline */}
          <button
            onClick={() => {
              setIsVersionHistoryOpen(true);
              if (isMobileMenuOpen) setIsMobileMenuOpen(false);
            }}
            title={!isExpanded ? 'Version Checkpoint Timeline' : undefined}
            className="group relative w-full h-9 rounded-[4px] flex items-center text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#191C1F] border border-transparent transition-all duration-150 text-left"
          >
            <div className="w-[38px] h-full flex items-center justify-center shrink-0">
              <History size={15} className="group-hover:text-[#F0F1F2]" />
            </div>
            <div
              className={`flex items-center justify-between flex-1 min-w-0 pr-2.5 transition-all duration-200 overflow-hidden whitespace-nowrap ${
                isExpanded
                  ? 'opacity-100 max-w-[185px]'
                  : 'opacity-0 max-w-0 pointer-events-none'
              }`}
            >
              <span className="truncate text-xs font-medium">Checkpoints</span>
            </div>
          </button>

          {/* Design Comparison */}
          <button
            onClick={() => {
              setIsCompareModalOpen(true);
              if (isMobileMenuOpen) setIsMobileMenuOpen(false);
            }}
            title={!isExpanded ? 'Compare Configurations' : undefined}
            className="group relative w-full h-9 rounded-[4px] flex items-center text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#191C1F] border border-transparent transition-all duration-150 text-left"
          >
            <div className="w-[38px] h-full flex items-center justify-center shrink-0">
              <Scale size={15} className="group-hover:text-[#F0F1F2]" />
            </div>
            <div
              className={`flex items-center justify-between flex-1 min-w-0 pr-2.5 transition-all duration-200 overflow-hidden whitespace-nowrap ${
                isExpanded
                  ? 'opacity-100 max-w-[185px]'
                  : 'opacity-0 max-w-0 pointer-events-none'
              }`}
            >
              <span className="truncate text-xs font-medium">Compare Configs</span>
            </div>
          </button>

          {/* Theme Switch */}
          <button
            onClick={toggleTheme}
            title={!isExpanded ? `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode` : undefined}
            className="group relative w-full h-9 rounded-[4px] flex items-center text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#191C1F] border border-transparent transition-all duration-150 text-left"
          >
            <div className="w-[38px] h-full flex items-center justify-center shrink-0">
              {theme === 'dark' ? (
                <Sun size={15} className="text-[#E7B65C]" />
              ) : (
                <Moon size={15} className="text-[#64D6C5]" />
              )}
            </div>
            <div
              className={`flex items-center justify-between flex-1 min-w-0 pr-2.5 transition-all duration-200 overflow-hidden whitespace-nowrap ${
                isExpanded
                  ? 'opacity-100 max-w-[185px]'
                  : 'opacity-0 max-w-0 pointer-events-none'
              }`}
            >
              <span className="truncate text-xs font-medium">Theme</span>
              <span className="text-[10px] font-mono text-[#636A73] px-1 py-0.5 rounded bg-[#111315]/80 border border-[#34393F]/50">
                {theme.toUpperCase()}
              </span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
