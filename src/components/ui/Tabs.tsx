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
  const sizeClasses = size === 'sm' ? 'text-xs py-1 px-2.5' : 'text-xs py-1.5 px-3.5';

  return (
    <div
      className={`inline-flex items-center p-0.5 bg-[#F1F5F9] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F] rounded-[6px] select-none ${className}`}
    >
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 rounded-[5px] font-sans font-medium transition-all duration-150 ${sizeClasses} ${
              isActive
                ? 'bg-white dark:bg-[#101A2B] text-[#2563EB] shadow-xs border border-[#E2E8F0] dark:border-[#334155] font-semibold'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-white border border-transparent'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-bold'
                    : 'bg-[#E2E8F0] dark:bg-[#24344F] text-[#64748B] dark:text-[#94A3B8]'
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
