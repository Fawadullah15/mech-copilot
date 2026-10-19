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
  Target,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { CopilotMessage, MessageType } from '../types';
import EngineeringResultCard from './EngineeringResultCard';

const SUGGESTED_PROMPTS = [
  'Check this shaft design',
  'What diameter for FoS 2.5?',
  'Why is the safety factor low?',
  'Recommend a better material',
  'Reduce the shaft weight',
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

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
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
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-[#64D6C5]/10 text-[#64D6C5] border border-[#64D6C5]/30">
            <Lightbulb size={10} /> Recommendation
          </span>
        );
      case 'calculation':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Calculator size={10} /> Analytical Verification
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-[#E7B65C]/15 text-[#E7B65C] border border-[#E7B65C]/30">
            <ShieldAlert size={10} /> Design Warning
          </span>
        );
      case 'explanation':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Info size={10} /> Theory & Derivation
          </span>
        );
      default:
        return null;
    }
  };

  if (!copilotOpen) {
    return (
      <>
        {/* Desktop Collapsed Rail Button */}
        <div className="hidden lg:flex h-full bg-[#191C1F] border-l border-[#34393F] flex-col items-center py-3 w-10 shrink-0">
          <button
            onClick={() => setCopilotOpen(true)}
            className="p-2 text-[#969DA5] hover:text-[#64D6C5] hover:bg-[#22262A] rounded-[3px] transition-colors"
            title="Expand Engineering Copilot"
          >
            <Bot size={18} />
          </button>
        </div>
        {/* Mobile / Small Screen Floating Pill */}
        <button
          onClick={() => setCopilotOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 z-40 p-2.5 rounded-[4px] bg-[#64D6C5] text-[#111315] shadow-lg hover:bg-[#52c4b3] transition-transform active:scale-95 font-mono text-xs font-bold flex items-center gap-1.5"
          title="Open Engineering Copilot"
        >
          <Bot size={16} />
          <span>COPILOT</span>
        </button>
      </>
    );
  }

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs z-30 lg:hidden animate-fade-in"
        onClick={() => setCopilotOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[380px] lg:static lg:z-auto lg:w-[320px] xl:w-[350px] 2xl:w-[390px] h-full bg-[#191C1F] border-l border-[#34393F] flex flex-col font-sans shrink-0 shadow-2xl relative transition-all duration-200">
        {/* Panel Header */}
        <div className="h-11 px-3.5 border-b border-[#34393F] flex items-center justify-between shrink-0 bg-[#22262A]">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-5 h-5">
              <Bot className="text-[#64D6C5]" size={16} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#34D399] rounded-full"></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#F0F1F2] font-semibold text-xs tracking-tight">Engineering Copilot</span>
              <span className="text-[10px] font-mono px-1 py-0.2 bg-[#14171A] text-[#64D6C5] rounded-[2px] border border-[#34393F]">
                v2.4
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* New Thread */}
            <button
              onClick={createNewConversation}
              className="p-1 text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#2E3339] rounded-[3px] transition-colors"
              title="New Thread"
            >
              <Plus size={14} />
            </button>

            {/* History */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1 rounded-[3px] transition-colors ${
                showHistory ? 'bg-[#2E3339] text-[#64D6C5]' : 'text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#2E3339]'
              }`}
              title="Thread History"
            >
              <History size={14} />
            </button>

            {/* Collapse Panel */}
            <button
              onClick={() => setCopilotOpen(false)}
              className="p-1 text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#2E3339] rounded-[3px] transition-colors"
              title="Minimize Copilot"
            >
              <Minimize2 size={14} />
            </button>
          </div>
        </div>

        {/* History Drawer */}
        {showHistory && (
          <div className="bg-[#22262A] border-b border-[#34393F] p-3 animate-fade-in shadow-xl z-20 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-[#969DA5] font-mono uppercase tracking-wider">
              <span>Past Engineering Sessions</span>
              <button
                onClick={() => {
                  createNewConversation();
                  setShowHistory(false);
                }}
                className="text-[#64D6C5] hover:underline flex items-center gap-1 text-[10px]"
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
                  className={`w-full text-left p-1.5 rounded-[3px] text-xs flex justify-between items-center transition-colors font-mono ${
                    t.id === activeThreadId
                      ? 'bg-[#64D6C5]/15 text-[#64D6C5] font-medium border border-[#64D6C5]/30'
                      : 'text-[#C2C8D0] hover:bg-[#2E3339]'
                  }`}
                >
                  <span className="truncate">{t.title}</span>
                  <span className="text-[10px] text-[#6C737D]">
                    {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Telemetry Context Ribbon */}
        <div className="px-3 py-1.5 bg-[#14171A] border-b border-[#2A2E35] flex flex-col gap-0.5 shrink-0 text-[10px] font-mono">
          <div className="flex justify-between items-center text-[#969DA5]">
            <span className="truncate">
              Model: <strong className="text-[#F0F1F2] font-sans">{activeProject.name}</strong>
            </span>
            <span className="text-[#64D6C5]">{selectedMaterial.name}</span>
          </div>
          <div className="flex items-center justify-between text-[#6C737D]">
            <span>
              ⌀{designParams.diameter}mm • {designParams.torque}N·m • {designParams.rpm}RPM
            </span>
            <span className="text-[#34D399]">FoS Target: {designParams.safetyFactor}x</span>
          </div>

          {/* Selected Component Banner if active */}
          {selectedComponent && (
            <div className="mt-1 p-1 bg-[#22262A] border border-[#34393F] rounded-[3px] flex items-center justify-between text-[11px] text-[#C2C8D0]">
              <div className="flex items-center gap-1.5 truncate">
                <Target size={11} className="text-[#64D6C5] shrink-0" />
                <span className="truncate">
                  Selected: <strong className="text-white">{selectedComponent.name}</strong>
                </span>
              </div>
              <button
                onClick={() => sendCopilotMessage(selectedComponent.suggestedPrompt)}
                className="text-[10px] text-[#64D6C5] hover:underline font-mono shrink-0"
              >
                Inspect →
              </button>
            </div>
          )}
        </div>

        {/* Suggested Prompts Strip */}
        <div className="p-2 border-b border-[#2A2E35] bg-[#191C1F] overflow-x-auto whitespace-nowrap shrink-0 flex gap-1.5 no-scrollbar">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => sendCopilotMessage(prompt)}
              className="text-[10px] font-mono px-2 py-0.5 rounded-[3px] bg-[#22262A] hover:bg-[#2E3339] text-[#C2C8D0] hover:text-[#F0F1F2] border border-[#34393F] transition-colors shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Messages Scroll Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3.5">
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
                  className={`max-w-[94%] rounded-[4px] p-3 text-xs leading-relaxed ${
                    isAssistant
                      ? 'bg-[#22262A] text-[#F0F1F2] border border-[#34393F]'
                      : 'bg-[#14171A] text-[#F0F1F2] border border-[#64D6C5]/40'
                  }`}
                >
                  {/* Header row for assistant messages */}
                  {isAssistant && (
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#2E3339]">
                      <div>{getBadgeForType(msg.type)}</div>
                      <div className="flex items-center gap-1.5 text-[#969DA5]">
                        <button
                          onClick={() => handleCopy(msg)}
                          className="hover:text-white p-0.5 rounded transition-colors"
                          title="Copy response"
                        >
                          {isCopied ? <Check size={12} className="text-[#34D399]" /> : <Copy size={12} />}
                        </button>
                        <button
                          onClick={() => toggleSaveMessage(msg.id)}
                          className={`p-0.5 rounded transition-colors ${
                            isSaved ? 'text-[#E7B65C]' : 'hover:text-white'
                          }`}
                          title={isSaved ? 'Bookmarked' : 'Save response'}
                        >
                          <Bookmark size={12} fill={isSaved ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="whitespace-pre-wrap text-[12px] text-[#E4E7EC] leading-relaxed font-sans">{msg.content}</div>

                  {/* Structured Data Grid */}
                  {msg.structuredData && msg.structuredData.length > 0 && (
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5 bg-[#14171A] p-2 rounded-[3px] border border-[#2A2E35]">
                      {msg.structuredData.map((data, idx) => (
                        <div key={idx} className="flex flex-col">
                          <span className="text-[#969DA5] text-[10px] uppercase font-mono">{data.label}</span>
                          <span className="text-[#F0F1F2] text-xs font-mono font-medium truncate" title={data.value}>
                            {data.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Design Reasoning Chain */}
                  {msg.reasoningChain && msg.reasoningChain.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#2E3339] space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-[#969DA5] uppercase tracking-wider">
                        <Sparkles size={11} className="text-[#64D6C5]" />
                        Analytical Reasoning Chain
                      </div>

                      <div className="space-y-1">
                        {msg.reasoningChain.map((step, sIdx) => {
                          const stageKey = `${msg.id}-${step.stage}`;
                          const isExpanded = expandedStages[stageKey] ?? step.expanded;

                          return (
                            <div
                              key={sIdx}
                              className="bg-[#14171A] rounded-[3px] border border-[#2A2E35] overflow-hidden text-xs"
                            >
                              <button
                                onClick={() => toggleReasoningStage(stageKey)}
                                className="w-full px-2 py-1.5 flex items-center justify-between hover:bg-[#22262A] transition-colors text-left font-mono"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1 py-0.2 rounded-[2px] bg-[#22262A] text-[9px] font-bold text-[#64D6C5] border border-[#34393F]">
                                    {step.stage}
                                  </span>
                                  <span className="text-[#C2C8D0] truncate text-[11px]">{step.summary}</span>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown size={12} className="text-[#969DA5] shrink-0" />
                                ) : (
                                  <ChevronRight size={12} className="text-[#969DA5] shrink-0" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="p-2 pt-1 text-[#969DA5] font-mono text-[10px] leading-relaxed border-t border-[#2A2E35] bg-[#111315]">
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
                          applyRecommendation({ diameter: value });
                        }
                      }}
                    />
                  )}

                  {/* Action Buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-[#2E3339]">
                      {msg.actions.map((action, idx) => {
                        const onClick = () => {
                          if (action.type === 'apply') applyRecommendation(action.payload);
                          else if (action.type === 'analyze') runAnalysis();
                          else if (action.type === 'explain') explainCalculation();
                          else if (action.type === 'optimize') setIsOptimizationModalOpen(true);
                          else if ((action.type as string) === 'compare') setIsCompareModalOpen(true);
                        };

                        const isPrimary = action.type === 'apply';

                        return (
                          <button
                            key={idx}
                            onClick={onClick}
                            className={`text-xs font-mono py-1 px-2.5 rounded-[3px] transition-colors ${
                              isPrimary
                                ? 'bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-semibold'
                                : 'bg-[#14171A] hover:bg-[#2A2E35] text-[#F0F1F2] border border-[#34393F]'
                            }`}
                          >
                            {action.label}
                          </button>
                        );
                      })}

                      {msg.type === 'recommendation' && (
                        <button
                          onClick={() => setIsCompareModalOpen(true)}
                          className="bg-[#14171A] hover:bg-[#2A2E35] text-[#969DA5] hover:text-[#F0F1F2] border border-[#34393F] text-xs font-mono py-1 px-2.5 rounded-[3px] transition-colors"
                        >
                          Compare Diff
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-[#6C737D] text-[10px] font-mono mt-0.5 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}

          {/* Streaming / Typing indicator */}
          {isStreaming && (
            <div className="flex flex-col items-start animate-pulse">
              <div className="bg-[#22262A] text-[#969DA5] rounded-[4px] p-2.5 text-xs border border-[#34393F] flex items-center gap-2 font-mono">
                <Bot size={13} className="text-[#64D6C5] animate-spin" />
                <span>Evaluating engineering equations...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-2.5 bg-[#22262A] border-t border-[#34393F] shrink-0 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-[#969DA5] font-mono">
            <span>Natural Language Kernel</span>
            <button
              onClick={() => setIsProblemModalOpen(true)}
              className="text-[#64D6C5] hover:underline flex items-center gap-1"
            >
              <Sparkles size={10} />
              Problem Templates
            </button>
          </div>

          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot (e.g. Check shaft, Reduce weight)..."
              className="w-full bg-[#14171A] border border-[#34393F] rounded-[4px] pl-2.5 pr-8 py-2 text-xs text-[#F0F1F2] placeholder-[#6C737D] font-sans focus:outline-none focus:border-[#64D6C5] transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[#969DA5] hover:text-[#64D6C5] disabled:opacity-30 disabled:hover:text-[#969DA5] transition-colors"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
