import React from 'react';

export type EngineeringStatusType = 'pass' | 'warning' | 'critical' | 'info' | 'nominal';

interface EngineeringStatusSymbolProps {
  status?: EngineeringStatusType;
  type?: EngineeringStatusType;
  size?: number;
  className?: string;
  withPulse?: boolean;
}

export const EngineeringStatusSymbol: React.FC<EngineeringStatusSymbolProps> = ({
  status,
  type,
  size = 16,
  className = '',
  withPulse = false,
}) => {
  const effectiveStatus = status || type || 'nominal';
  switch (effectiveStatus) {
    case 'pass':
      return (
        <span className={`inline-flex items-center justify-center relative shrink-0 ${className}`}>
          {withPulse && (
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
          )}
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="4" fill="#065f46" fillOpacity="0.25" stroke="#10b981" strokeWidth="1.2" />
            <path d="M4.5 8.2L6.8 10.5L11.5 5.5" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );

    case 'warning':
      return (
        <span className={`inline-flex items-center justify-center relative shrink-0 ${className}`}>
          {withPulse && (
            <span className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping opacity-75" />
          )}
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" fill="#78350f" fillOpacity="0.3" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
            <line x1="8" y1="6" x2="8" y2="9.5" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="8" cy="11.5" r="0.85" fill="#fbbf24" />
          </svg>
        </span>
      );

    case 'critical':
      return (
        <span className={`inline-flex items-center justify-center relative shrink-0 ${className}`}>
          {withPulse && (
            <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping opacity-75" />
          )}
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <path
              d="M5 1.5H11L14.5 5V11L11 14.5H5L1.5 11V5L5 1.5Z"
              fill="#7f1d1d"
              fillOpacity="0.35"
              stroke="#ef4444"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <line x1="5.5" y1="5.5" x2="10.5" y2="10.5" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="10.5" y1="5.5" x2="5.5" y2="10.5" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      );

    case 'info':
      return (
        <span className={`inline-flex items-center justify-center relative shrink-0 ${className}`}>
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" fill="#1e3a8a" fillOpacity="0.25" stroke="#3b82f6" strokeWidth="1.2" />
            <circle cx="8" cy="5" r="0.9" fill="#60a5fa" />
            <line x1="8" y1="7.2" x2="8" y2="11.2" stroke="#60a5fa" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
      );

    case 'nominal':
    default:
      return (
        <span className={`inline-flex items-center justify-center relative shrink-0 ${className}`}>
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.25" fill="#1e293b" fillOpacity="0.5" stroke="#64748b" strokeWidth="1.1" strokeDasharray="2 2" />
            <circle cx="8" cy="8" r="1.5" fill="#94a3b8" />
          </svg>
        </span>
      );
  }
};

export default EngineeringStatusSymbol;
