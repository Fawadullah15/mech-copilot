import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs<T extends string = string>({
  items,
  activeTab,
  onChange,
  className = '',
  size = 'sm',
}: TabsProps<T>) {
  const sizeClasses = size === 'sm' ? 'text-xs py-1.5 px-3' : 'text-sm py-2 px-4';

  return (
    <div
      className={`inline-flex items-center p-1 bg-navy-950 border border-navy-800 rounded-lg select-none ${className}`}
    >
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 rounded-md font-medium transition-all duration-150 ${sizeClasses} ${
              isActive
                ? 'bg-navy-800 text-white shadow-sm border border-navy-700 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-900/60'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-300 font-bold'
                    : 'bg-navy-800 text-slate-400'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
