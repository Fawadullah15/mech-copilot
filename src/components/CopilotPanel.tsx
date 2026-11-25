import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Minimize2,
  Plus,
  History,
  Copy,
  Check,
  Bookmark,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Calculator,
  Lightbulb,
  Info,
  Target,
  RefreshCw,
  Bot,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { CopilotMessage, MessageType, ProviderStatusInfo } from '../types';
import { fetchChatProviderStatus } from '../services/chatApi';
import EngineeringResultCard from './EngineeringResultCard';
import ProposedChangeCard from './ProposedChangeCard';
import AgentTelemetryCard from './AgentTelemetryCard';

const SUGGESTED_PROMPTS = [
  'Check this shaft design',
  'Size diameter for FoS 2.5',
  'Recommend a stronger alloy',
  'Run full stress analysis',
  'Generate engineering report',
  'Explain safety factor calculation',
];

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key++} className="font-semibold text-[#172033] dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key++}
          className="px-1 py-0.5 rounded-[4px] bg-[#E2E8F0]/70 dark:bg-[#101A2B] text-[#2563EB] font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key++} className="italic text-[#475569] dark:text-[#94A3B8]">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function FormattedCopilotMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-1 text-[12px] text-[#172033] dark:text-[#F0F4FA] leading-relaxed font-sans select-text break-words">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={i} className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] pt-1">
              {renderInlineMarkdown(trimmed.slice(5))}
            </h4>
          );
        }
        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          const text = trimmed.replace(/^#{2,3}\s+/, '');
          return (
            <h3 key={i} className="text-[12.5px] font-bold text-[#172033] dark:text-white pt-0.5">
              {renderInlineMarkdown(text)}
            </h3>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={i} className="flex items-start gap-1.5 pl-1">
              <span className="text-[#2563EB] font-bold mt-0.5 shrink-0">•</span>
              <span className="min-w-0 flex-1">{renderInlineMarkdown(trimmed.slice(2))}</span>
            </div>
          );
        }
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={i}
              className="pl-2.5 border-l-2 border-[#2563EB] text-[#475569] dark:text-[#94A3B8] italic"
            >
              {renderInlineMarkdown(trimmed.slice(2))}
            </blockquote>
          );
        }
        return <p key={i}>{renderInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

export default function CopilotPanel() {
  const {
    copilotMessages,
    sendCopilotMessage,
    applyRecommendation,
    runAnalysis,
    explainCalculation,
    copilotOpen,
    setCopilotOpen,
    activeProject,
    designParams,
    selectedMaterial,
    selectedComponent,
    isStreaming,
    conversationThreads,
    activeThreadId,
    createNewConversation,
    switchConversation,
    savedMessageIds,
    toggleSaveMessage,
    setIsOptimizationModalOpen,
    setIsProblemModalOpen,
    setIsCompareModalOpen,
  } = useApp();

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    'msg-3-RECOMMENDATION': true,
  });
  const [providerStatus, setProviderStatus] = useState<ProviderStatusInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const refreshStatus = useCallback(async (force = false) => {
    setIsRefreshing(true);
    try {
      const status = await fetchChatProviderStatus(force);
      setProviderStatus(status);
    } catch {
      // ignore unreachable backend status
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [copilotMessages, isStreaming, copilotOpen]);

  // Auto-grow composer up to 96px
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  const submitPrompt = () => {
    if (!input.trim() || isStreaming) return;
    sendCopilotMessage(input.trim());
    setInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPrompt();
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitPrompt();
    }
  };

  const handleCopy = (msg: CopilotMessage) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReasoningStage = (stageKey: string) => {
    setExpandedStages((prev) => ({ ...prev, [stageKey]: !prev[stageKey] }));
  };

  const getBadgeForType = (type?: MessageType) => {
    switch (type) {
      case 'recommendation':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#EFF6FF] dark:bg-[#1B2942] text-[#2563EB] border border-[#BFDBFE] dark:border-[#2563EB]/40 font-semibold">
            <Lightbulb size={10} /> Recommendation
          </span>
        );
      case 'calculation':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#EFF6FF] dark:bg-[#1B2942] text-[#2563EB] border border-[#BFDBFE] dark:border-[#2563EB]/40 font-semibold">
            <Calculator size={10} /> Analytical Verification
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] font-semibold">
            <ShieldAlert size={10} /> Design Warning
          </span>
        );
      case 'explanation':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-[#F1F5F9] dark:bg-[#1B2942] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] font-semibold">
            <Info size={10} /> Theory & Derivation
          </span>
        );
      default:
        return null;
    }
  };

  const renderHeaderStatusBadge = () => {
    if (isStreaming) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-[#1B2942] border border-[#BFDBFE] dark:border-[#2563EB]/40 text-[10px] font-medium text-[#2563EB]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-ping" />
          <span>Running</span>
        </span>
      );
    }
    if (providerStatus?.status === 'connected') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0FDF4] dark:bg-[#052E16]/40 border border-[#BBF7D0] dark:border-[#16A34A]/40 text-[10px] font-medium text-[#16A34A]"
          title={providerStatus.displayStatus}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          <span>Online</span>
        </span>
      );
    }
    if (providerStatus?.status === 'failed') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFFBEB] dark:bg-[#451A03]/40 border border-[#FDE68A] dark:border-[#D97706]/40 text-[10px] font-medium text-[#D97706]"
          title={providerStatus.error || 'Using deterministic fallback solver'}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
          <span>Local Solver</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1F5F9] dark:bg-[#1B2942] border border-[#E2E8F0] dark:border-[#334155] text-[10px] font-medium text-[#64748B]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
        <span>Solver Ready</span>
      </span>
    );
  };

  if (!copilotOpen) {
    return (
      <>
        {/* Desktop/Laptop Collapsed Rail Button (never overlaps bottom dock cards) */}
        <div className="hidden lg:flex h-full bg-white dark:bg-[#101A2B] border-l border-[#E2E8F0] dark:border-[#1E2D45] flex-col items-center py-3 w-10 shrink-0 select-none">
          <button
            onClick={() => setCopilotOpen(true)}
            className="p-2 text-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-[#1B2942] rounded-[6px] transition-colors"
            title="Expand MechAI Copilot"
          >
            <Sparkles size={16} />
          </button>
        </div>

        {/* Mobile/Tablet Floating Pill (< lg) */}
        <button
          onClick={() => setCopilotOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 z-30 px-3 py-2 rounded-[8px] bg-[#2563EB] text-white shadow-lg hover:bg-[#1D4ED8] transition-transform active:scale-95 text-[11px] font-semibold flex items-center gap-1.5"
          title="Open MechAI Copilot"
        >
          <Sparkles size={14} />
          <span>MechAI Copilot</span>
        </button>
      </>
    );
  }

  return (
    <>
      {/* Backdrop when rendered as drawer below 1360px */}
      <div
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs z-30 min-[1360px]:hidden animate-fade-in"
        onClick={() => setCopilotOpen(false)}
      />

      <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[360px] min-[1360px]:static min-[1360px]:z-auto min-[1360px]:w-[324px] 2xl:w-[370px] h-full bg-white dark:bg-[#101A2B] border-l border-[#E2E8F0] dark:border-[#1E2D45] flex flex-col font-sans shrink-0 shadow-2xl min-[1360px]:shadow-none transition-all duration-200 select-none">
        {/* Header */}
        <div className="h-11 px-3 border-b border-[#E2E8F0] dark:border-[#1E2D45] flex items-center justify-between gap-1.5 shrink-0 bg-white dark:bg-[#101A2B]">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-[6px] bg-[#EFF6FF] dark:bg-[#1B2942] text-[#2563EB] flex items-center justify-center shrink-0">
              <Sparkles size={13} />
            </div>
            <span className="text-[#172033] dark:text-white font-semibold text-[12.5px] tracking-tight truncate">
              MechAI Copilot
            </span>
            <span className="shrink-0">{renderHeaderStatusBadge()}</span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={createNewConversation}
              className="p-1.5 text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] rounded-[5px] transition-colors"
              title="New Engineering Thread"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 rounded-[5px] transition-colors ${
                showHistory
                  ? 'bg-[#EFF6FF] dark:bg-[#1B2942] text-[#2563EB]'
                  : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942]'
              }`}
              title="Conversation History"
            >
              <History size={14} />
            </button>
            <button
              onClick={() => refreshStatus(true)}
              className="p-1.5 text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] rounded-[5px] transition-colors"
              title={providerStatus?.displayStatus || 'Refresh Agent Connection'}
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setCopilotOpen(false)}
              className="p-1.5 text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] rounded-[5px] transition-colors"
              title="Collapse Copilot"
            >
              <Minimize2 size={14} />
            </button>
          </div>
        </div>

        {/* Live Context Ribbon */}
        <div className="px-3.5 py-2 bg-[#F8FAFC] dark:bg-[#0D1526] border-b border-[#E2E8F0] dark:border-[#1E2D45] flex flex-col gap-0.5 shrink-0 text-[11px]">
          <div className="flex justify-between items-center gap-2 text-[#64748B]">
            <span className="truncate">
              Project:{' '}
              <strong className="text-[#172033] dark:text-white font-semibold">
                {activeProject ? activeProject.name : 'Workspace Session'}
              </strong>
            </span>
            <span className="text-[#2563EB] font-mono font-semibold shrink-0">{selectedMaterial.name}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-[#64748B]">
            <span>
              ⌀{designParams.diameter}mm · {designParams.torque}N·m · {designParams.rpm}RPM
            </span>
            <span className="text-[#16A34A] font-semibold">FoS Target: {designParams.safetyFactor}×</span>
          </div>

          {selectedComponent && (
            <div className="mt-1 px-2 py-1 bg-white dark:bg-[#101A2B] border border-[#BFDBFE] dark:border-[#2563EB]/40 rounded-[6px] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <Target size={11} className="text-[#2563EB] shrink-0" />
                <span className="truncate text-[#172033] dark:text-white">
                  Selected: <strong className="text-[#2563EB]">{selectedComponent.name}</strong>
                </span>
              </div>
              <button
                onClick={() => sendCopilotMessage(selectedComponent.suggestedPrompt)}
                className="text-[10px] text-[#2563EB] hover:underline font-mono font-bold shrink-0 ml-2"
              >
                Analyze →
              </button>
            </div>
          )}
        </div>

        {/* History Drawer */}
        {showHistory && (
          <div className="bg-[#F8FAFC] dark:bg-[#0D1526] border-b border-[#E2E8F0] dark:border-[#1E2D45] p-3 animate-fade-in z-20 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-[#64748B] font-mono uppercase tracking-wider font-bold">
              <span>Engineering Sessions</span>
              <button
                onClick={() => {
                  createNewConversation();
                  setShowHistory(false);
                }}
                className="text-[#2563EB] hover:underline font-semibold"
              >
                + New Thread
              </button>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {conversationThreads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    switchConversation(t.id);
                    setShowHistory(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-[11px] flex justify-between items-center transition-colors font-mono ${
                    t.id === activeThreadId
                      ? 'bg-white dark:bg-[#1B2942] text-[#2563EB] font-semibold border border-[#BFDBFE] dark:border-[#2563EB]/40'
                      : 'text-[#64748B] hover:bg-white dark:hover:bg-[#1B2942] hover:text-[#172033] dark:hover:text-white'
                  }`}
                >
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] text-[#94A3B8] shrink-0 ml-2">
                    {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages Feed */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0">
          {copilotMessages.length === 0 ? (
            <div className="space-y-3 py-2">
              <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F]">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-[6px] bg-[#111B2C] text-white flex items-center justify-center">
                    <Bot size={13} />
                  </div>
                  <span className="text-[12px] font-semibold text-[#172033] dark:text-white">
                    Engineering Copilot Ready
                  </span>
                </div>
                <p className="text-[12px] text-[#64748B] leading-relaxed">
                  Project loaded for <strong className="text-[#172033] dark:text-white">{designParams.torque} N·m</strong> at{' '}
                  <strong className="text-[#172033] dark:text-white">{designParams.rpm} RPM</strong> using{' '}
                  <strong className="text-[#2563EB]">{selectedMaterial.name}</strong>. Ask me to run analysis, resize geometry, or generate reports.
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B]">
                  Suggested Actions
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendCopilotMessage(prompt)}
                      className="text-[11px] px-2.5 py-1.5 rounded-[6px] bg-[#EFF6FF] dark:bg-[#1B2942] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE] dark:border-[#2563EB]/40 font-medium transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            copilotMessages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              const isSaved = savedMessageIds.has(msg.id);
              const isCopied = copiedId === msg.id;

              return (
                <div key={msg.id} className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
                  <div
                    className={`max-w-[95%] rounded-[8px] p-3 text-[12px] leading-relaxed ${
                      isAssistant
                        ? 'bg-[#F8FAFC] dark:bg-[#162236] text-[#172033] dark:text-[#F0F4FA] border border-[#E2E8F0] dark:border-[#24344F]'
                        : 'bg-[#EFF6FF] dark:bg-[#1B2942] text-[#172033] dark:text-white border border-[#BFDBFE] dark:border-[#2563EB]/40'
                    }`}
                  >
                    {isAssistant && (
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#E2E8F0] dark:border-[#24344F]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-[4px] bg-[#111B2C] text-white flex items-center justify-center shrink-0">
                            <Bot size={11} />
                          </div>
                          {getBadgeForType(msg.type)}
                        </div>
                        <div className="flex items-center gap-1 text-[#64748B]">
                          <button
                            onClick={() => handleCopy(msg)}
                            className="hover:text-[#172033] dark:hover:text-white p-0.5 rounded transition-colors"
                            title="Copy response"
                          >
                            {isCopied ? <Check size={12} className="text-[#16A34A]" /> : <Copy size={12} />}
                          </button>
                          <button
                            onClick={() => toggleSaveMessage(msg.id)}
                            className={`p-0.5 rounded transition-colors ${
                              isSaved ? 'text-[#D97706]' : 'hover:text-[#172033] dark:hover:text-white'
                            }`}
                            title={isSaved ? 'Bookmarked' : 'Bookmark response'}
                          >
                            <Bookmark size={12} fill={isSaved ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Message Text */}
                    <FormattedCopilotMessage content={msg.content} />

                    {/* Structured Data Grid */}
                    {msg.structuredData && msg.structuredData.length > 0 && (
                      <div className="mt-2.5 grid grid-cols-2 gap-1.5 bg-white dark:bg-[#101A2B] p-2 rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F]">
                        {msg.structuredData.map((data, idx) => (
                          <div key={idx} className="flex flex-col">
                            <span className="text-[#64748B] text-[10px] uppercase font-mono font-semibold">
                              {data.label}
                            </span>
                            <span className="text-[#172033] dark:text-white text-[12px] font-mono font-semibold tabular-nums truncate">
                              {data.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Analytical Reasoning Chain */}
                    {msg.reasoningChain && msg.reasoningChain.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] dark:border-[#24344F] space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider">
                          <Sparkles size={10} className="text-[#2563EB]" />
                          Reasoning Chain
                        </div>

                        <div className="space-y-1">
                          {msg.reasoningChain.map((step, sIdx) => {
                            const stageKey = `${msg.id}-${step.stage}`;
                            const isExpanded = expandedStages[stageKey] ?? step.expanded;

                            return (
                              <div
                                key={sIdx}
                                className="bg-white dark:bg-[#101A2B] rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F] overflow-hidden text-xs"
                              >
                                <button
                                  onClick={() => toggleReasoningStage(stageKey)}
                                  className="w-full px-2 py-1.5 flex items-center justify-between hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942] transition-colors text-left font-mono"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="px-1.5 py-0.5 rounded-[4px] bg-[#EFF6FF] dark:bg-[#1B2942] text-[9px] font-bold text-[#2563EB] shrink-0">
                                      {step.stage}
                                    </span>
                                    <span className="text-[#172033] dark:text-white truncate text-[11px] font-medium">
                                      {step.summary}
                                    </span>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronDown size={12} className="text-[#64748B] shrink-0" />
                                  ) : (
                                    <ChevronRight size={12} className="text-[#64748B] shrink-0" />
                                  )}
                                </button>

                                {isExpanded && (
                                  <div className="p-2 text-[#64748B] dark:text-[#94A3B8] font-mono text-[10px] leading-relaxed border-t border-[#E2E8F0] dark:border-[#24344F]">
                                    {step.details}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Agent Telemetry & Tool Execution Steps */}
                    <AgentTelemetryCard
                      operationState={msg.operationState}
                      toolLogs={msg.toolExecutionLogs}
                      requirements={msg.requirements}
                    />

                    {/* Human-In-The-Loop Proposed Engineering Change */}
                    {msg.proposedChange && (
                      <ProposedChangeCard
                        proposedChange={msg.proposedChange}
                        onApprove={(payload) => applyRecommendation(payload)}
                      />
                    )}

                    {/* Verified Engineering Result Block */}
                    {msg.engineeringResult && (
                      <EngineeringResultCard
                        result={msg.engineeringResult}
                        onApply={(payload) => applyRecommendation(payload)}
                      />
                    )}

                    {/* Contextual Action Buttons */}
                    {(() => {
                      const rawActions = msg.actions || [];
                      const visibleActions = rawActions
                        .map((a: any) => {
                          if (!a || typeof a !== 'object') return null;
                          if (typeof a.label === 'string' && a.label.trim().length > 0) {
                            return a;
                          }
                          // Internal backend sync events are already handled by AppContext / ResultCard
                          if (
                            a.type === 'proposed_dimension_change' &&
                            !msg.engineeringResult &&
                            !msg.proposedChange &&
                            a.proposedValue !== undefined
                          ) {
                            return {
                              label: `Apply ⌀${a.proposedValue} ${a.unit || 'mm'}`,
                              type: 'apply',
                              payload: { [a.parameter || 'diameter']: a.proposedValue },
                            };
                          }
                          if ((a.type === 'pdf_exported' || a.type === 'report_generated') && a.pdfDownloadUrl) {
                            return {
                              label: 'Download PDF Report',
                              type: 'pdf_exported',
                              payload: { pdfDownloadUrl: a.pdfDownloadUrl, projectId: a.projectId },
                            };
                          }
                          return null;
                        })
                        .filter(Boolean) as any[];

                      if (visibleActions.length === 0 && msg.type !== 'recommendation') {
                        return null;
                      }

                      return (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-[#E2E8F0] dark:border-[#24344F]">
                          {visibleActions.map((action, idx) => {
                            const onClick = () => {
                              if (action.type === 'apply') applyRecommendation(action.payload);
                              else if (action.type === 'analyze') runAnalysis();
                              else if (action.type === 'explain') explainCalculation();
                              else if (action.type === 'optimize') setIsOptimizationModalOpen(true);
                              else if ((action.type as string) === 'compare') setIsCompareModalOpen(true);
                              else if (action.type === 'pdf_exported' && action.payload?.pdfDownloadUrl) {
                                window.open(action.payload.pdfDownloadUrl, '_blank', 'noopener');
                              }
                            };

                            const isPrimary = action.type === 'apply';
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={onClick}
                                className={`text-[11px] font-medium py-1 px-2.5 rounded-[6px] transition-colors ${
                                  isPrimary
                                    ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                                    : 'bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] text-[#172033] dark:text-white hover:border-[#2563EB] hover:text-[#2563EB]'
                                }`}
                              >
                                {action.label}
                              </button>
                            );
                          })}

                          {msg.type === 'recommendation' && (
                            <button
                              type="button"
                              onClick={() => setIsCompareModalOpen(true)}
                              className="bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] text-[#172033] dark:text-white hover:border-[#2563EB] text-[11px] font-medium py-1 px-2.5 rounded-[6px] transition-colors"
                            >
                              Compare Diff
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <span className="text-[#94A3B8] text-[10px] font-mono tabular-nums mt-0.5 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}

          {isStreaming && (
            <div className="flex flex-col items-start animate-pulse">
              <div className="bg-[#F8FAFC] dark:bg-[#162236] text-[#64748B] rounded-[8px] p-2.5 text-[11px] border border-[#E2E8F0] dark:border-[#24344F] flex items-center gap-2 font-mono">
                <Sparkles size={13} className="text-[#2563EB] animate-spin" />
                <span>Executing engineering tools...</span>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Quick-Prompt & Composer Area */}
        <div className="p-3 bg-[#F8FAFC] dark:bg-[#0D1526] border-t border-[#E2E8F0] dark:border-[#1E2D45] shrink-0 space-y-2">
          {/* Compact Quick-Action Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {SUGGESTED_PROMPTS.slice(0, 4).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendCopilotMessage(prompt)}
                disabled={isStreaming}
                className="text-[10px] font-mono px-2 py-1 rounded-[5px] bg-white dark:bg-[#162236] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] hover:text-[#2563EB] text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#24344F] transition-colors shrink-0 whitespace-nowrap disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask Copilot about your engineering design..."
              className="flex-1 min-h-[36px] max-h-[96px] resize-none bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] rounded-[6px] px-3 py-2 text-[12px] text-[#172033] dark:text-white placeholder-[#94A3B8] font-sans focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="h-[36px] w-[36px] shrink-0 rounded-[6px] bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#CBD5E1] dark:disabled:bg-[#334155] text-white flex items-center justify-center transition-colors"
              title="Send message"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </form>

          <div className="flex justify-between items-center text-[10px] text-[#64748B] font-mono">
            <span>Enter to send · Shift+Enter newline</span>
            <button
              type="button"
              onClick={() => setIsProblemModalOpen(true)}
              className="text-[#2563EB] hover:underline flex items-center gap-1 font-semibold"
            >
              <Sparkles size={10} />
              <span>Spec Templates</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
