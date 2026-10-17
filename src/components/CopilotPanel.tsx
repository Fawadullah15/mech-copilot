import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
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
  Sliders,
  Target,
  FileSearch,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { CopilotMessage, ReasoningStep, MessageType } from '../types';
import EngineeringResultCard from './EngineeringResultCard';

const SUGGESTED_PROMPTS = [
  'Check this shaft design',
  'Why is the safety factor low?',
  'Recommend a better material',
  'Reduce the shaft weight',
  'Calculate the required diameter',
  'Explain this calculation',
  'Find possible failure points',
];

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [copilotMessages, isStreaming, copilotOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendCopilotMessage(input);
    setInput('');
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
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-accent/20 text-accent-light border border-accent/30">
            <Lightbulb size={11} /> AI Recommendation
          </span>
        );
      case 'calculation':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Calculator size={11} /> Analytical Calculation
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <ShieldAlert size={11} /> Design Warning
          </span>
        );
      case 'explanation':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-cyan/20 text-cyan border border-cyan/30">
            <Info size={11} /> AI Explanation
          </span>
        );
      default:
        return null;
    }
  };

  if (!copilotOpen) {
    return (
      <>
        <div className="hidden sm:flex h-full bg-navy-950 border-l border-navy-700/50 flex-col items-center py-4 w-12 font-sans shrink-0">
          <button
            onClick={() => setCopilotOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-navy-700/50 rounded-lg transition-colors"
            title="Expand Engineering Copilot"
          >
            <Bot size={20} className="text-accent" />
          </button>
        </div>
        <button
          onClick={() => setCopilotOpen(true)}
          className="sm:hidden fixed bottom-4 right-4 z-30 p-3 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-500 transition-transform active:scale-95"
          title="Open Engineering Copilot"
        >
          <Bot size={20} />
        </button>
      </>
    );
  }

  return (
    <>
      {/* Mobile / Tablet Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden animate-fade-in"
        onClick={() => setCopilotOpen(false)}
      />
      <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[380px] lg:static lg:z-auto lg:w-[320px] xl:w-[360px] 2xl:w-[400px] h-full bg-navy-950 border-l border-navy-700/60 flex flex-col font-sans shrink-0 shadow-2xl relative transition-all duration-200">
        {/* Top Header */}
      <div className="h-14 px-4 border-b border-navy-700/60 flex items-center justify-between shrink-0 bg-navy-900">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="text-accent" size={20} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-status-pass rounded-full animate-pulse-slow"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-semibold text-sm">Engineering Copilot</span>
              <span className="text-[10px] bg-accent/15 text-accent-light px-1.5 py-0.2 rounded font-mono">
                v2.4
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* New Chat Button */}
          <button
            onClick={createNewConversation}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
            title="New Conversation"
          >
            <Plus size={16} />
          </button>

          {/* Conversation History Popover Trigger */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded-lg transition-colors ${
              showHistory ? 'bg-navy-800 text-accent' : 'text-gray-400 hover:text-white hover:bg-navy-800'
            }`}
            title="Conversation History"
          >
            <History size={16} />
          </button>

          {/* Collapse */}
          <button
            onClick={() => setCopilotOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
            title="Minimize"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </div>

      {/* History Drawer / Dropdown */}
      {showHistory && (
        <div className="bg-navy-900 border-b border-navy-700 p-3 animate-fade-in shadow-xl z-20 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
            <span>Past Engineering Sessions</span>
            <button
              onClick={() => {
                createNewConversation();
                setShowHistory(false);
              }}
              className="text-accent hover:underline flex items-center gap-1 text-[11px]"
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
                className={`w-full text-left p-2 rounded-lg text-xs flex justify-between items-center transition-colors ${
                  t.id === activeThreadId
                    ? 'bg-accent/20 text-white font-medium border border-accent/40'
                    : 'text-gray-300 hover:bg-navy-800'
                }`}
              >
                <span className="truncate">{t.title}</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Context Awareness Ribbon */}
      <div className="px-4 py-2 bg-navy-900/60 border-b border-navy-800 flex flex-col gap-1 shrink-0 text-[11px] font-mono">
        <div className="flex justify-between items-center text-gray-400">
          <span className="truncate text-gray-300">
            Project: <strong className="text-white font-sans">{activeProject.name}</strong>
          </span>
          <span className="text-accent-light">{selectedMaterial.name}</span>
        </div>
        <div className="flex items-center justify-between text-gray-500 text-[10px]">
          <span>
            ⌀{designParams.diameter}mm • {designParams.torque}Nm • {designParams.rpm}RPM
          </span>
          <span className="text-status-pass font-bold">FoS Target: {designParams.safetyFactor}</span>
        </div>

        {/* Selected Component Banner if active */}
        {selectedComponent && (
          <div className="mt-1 p-1.5 bg-accent/10 border border-accent/30 rounded-lg flex items-center justify-between text-xs text-gray-200">
            <div className="flex items-center gap-1.5 truncate">
              <Target size={13} className="text-cyan shrink-0" />
              <span className="truncate">
                Selected: <strong className="text-white">{selectedComponent.name}</strong>
              </span>
            </div>
            <button
              onClick={() => sendCopilotMessage(selectedComponent.suggestedPrompt)}
              className="text-[10px] text-accent-light hover:underline font-sans shrink-0"
            >
              Analyze →
            </button>
          </div>
        )}
      </div>

      {/* Suggested Prompts Strip */}
      <div className="p-2 border-b border-navy-800 bg-navy-950/70 overflow-x-auto whitespace-nowrap shrink-0 flex gap-1.5 no-scrollbar">
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => sendCopilotMessage(prompt)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-navy-850 hover:bg-navy-750 text-gray-300 hover:text-white border border-navy-700/60 transition-colors shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {copilotMessages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          const isSaved = savedMessageIds.has(msg.id);
          const isCopied = copiedId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`max-w-[92%] rounded-xl p-3.5 text-sm shadow-md ${
                  isAssistant
                    ? 'bg-navy-800 text-gray-100 rounded-bl-sm border border-navy-700/80'
                    : 'bg-accent/20 text-white rounded-br-sm border border-accent/40'
                }`}
              >
                {/* Header row for assistant messages */}
                {isAssistant && (
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-navy-700/50">
                    <div>{getBadgeForType(msg.type)}</div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <button
                        onClick={() => handleCopy(msg)}
                        className="hover:text-white p-1 rounded transition-colors"
                        title="Copy response"
                      >
                        {isCopied ? <Check size={13} className="text-status-pass" /> : <Copy size={13} />}
                      </button>
                      <button
                        onClick={() => toggleSaveMessage(msg.id)}
                        className={`p-1 rounded transition-colors ${
                          isSaved ? 'text-amber-400' : 'hover:text-white'
                        }`}
                        title={isSaved ? 'Bookmarked' : 'Save response'}
                      >
                        <Bookmark size={13} fill={isSaved ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="whitespace-pre-wrap leading-relaxed text-[13px]">{msg.content}</div>

                {/* Structured Data Grid */}
                {msg.structuredData && msg.structuredData.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 bg-navy-900/80 p-2.5 rounded-lg border border-navy-700/50">
                    {msg.structuredData.map((data, idx) => (
                      <div key={idx} className="flex flex-col">
                        <span className="text-gray-400 text-[10px] uppercase font-mono">{data.label}</span>
                        <span className="text-gray-100 text-xs font-mono font-bold truncate" title={data.value}>
                          {data.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Design Reasoning Chain */}
                {msg.reasoningChain && msg.reasoningChain.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-navy-700/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      <Sparkles size={13} className="text-accent" />
                      AI Engineering Reasoning Chain
                    </div>

                    <div className="space-y-1.5">
                      {msg.reasoningChain.map((step, sIdx) => {
                        const stageKey = `${msg.id}-${step.stage}`;
                        const isExpanded = expandedStages[stageKey] ?? step.expanded;

                        return (
                          <div
                            key={sIdx}
                            className="bg-navy-900/90 rounded-lg border border-navy-700/60 overflow-hidden text-xs"
                          >
                            <button
                              onClick={() => toggleReasoningStage(stageKey)}
                              className="w-full p-2 flex items-center justify-between hover:bg-navy-800/60 transition-colors text-left font-mono"
                            >
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded bg-navy-800 text-[10px] font-bold text-cyan border border-navy-700">
                                  {step.stage}
                                </span>
                                <span className="text-gray-200 truncate">{step.summary}</span>
                              </div>
                              {isExpanded ? (
                                <ChevronDown size={14} className="text-gray-400 shrink-0" />
                              ) : (
                                <ChevronRight size={14} className="text-gray-400 shrink-0" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="p-2.5 pt-0 text-gray-300 font-mono text-[11px] leading-relaxed border-t border-navy-800 bg-navy-950/40">
                                {step.details}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Engineering Result Card */}
                {msg.engineeringResult && (
                  <EngineeringResultCard 
                    result={msg.engineeringResult} 
                    onApply={(param, value) => {
                      if (param === 'diameter') {
                        // Pass payload mapped to applyRecommendation correctly
                        applyRecommendation({ diameter: value });
                      }
                    }} 
                  />
                )}

                {/* Action Buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-2 pt-2 border-t border-navy-700/50">
                    {msg.actions.map((action, idx) => {
                      const onClick = () => {
                        if (action.type === 'apply') applyRecommendation(action.payload);
                        else if (action.type === 'analyze') runAnalysis();
                        else if (action.type === 'explain') explainCalculation();
                        else if (action.type === 'optimize') setIsOptimizationModalOpen(true);
                        else if ((action.type as string) === 'compare') setIsCompareModalOpen(true);
                      };

                      const btnClass =
                        action.type === 'apply'
                          ? 'btn-primary'
                          : action.type === 'optimize'
                          ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-medium'
                          : action.type === 'analyze'
                          ? 'btn-secondary'
                          : 'btn-ghost text-gray-300 hover:text-white';

                      return (
                        <button
                          key={idx}
                          onClick={onClick}
                          className={`${btnClass} text-xs py-1.5 px-3 rounded-lg font-medium transition-colors`}
                        >
                          {action.label}
                        </button>
                      );
                    })}

                    {msg.type === 'recommendation' && (
                      <button
                        onClick={() => setIsCompareModalOpen(true)}
                        className="btn-secondary text-xs py-1.5 px-3 rounded-lg font-medium transition-colors"
                      >
                        Compare Diff
                      </button>
                    )}
                  </div>
                )}

              </div>

              <span className="text-gray-500 text-[10px] font-mono mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {/* Streaming / Typing indicator */}
        {isStreaming && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="bg-navy-800 text-gray-300 rounded-xl p-3 text-xs border border-navy-700 flex items-center gap-2">
              <Bot size={14} className="text-accent animate-spin" />
              <span>Analyzing engineering equations & synthesizing recommendations...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-navy-900 border-t border-navy-700/60 shrink-0 space-y-2">
        {/* Quick Problem Launcher shortcut button */}
        <div className="flex justify-between items-center text-[11px] text-gray-400">
          <span>Natural Language Assistant</span>
          <button
            onClick={() => setIsProblemModalOpen(true)}
            className="text-accent hover:underline flex items-center gap-1"
          >
            <Sparkles size={11} />
            Specify Problem Template
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Copilot (e.g. Check shaft, Reduce weight)..."
            className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-accent disabled:opacity-40 disabled:hover:text-gray-400 transition-colors rounded-md"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  </>
  );
}
