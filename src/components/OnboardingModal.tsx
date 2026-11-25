import React, { useState } from 'react';
import { ArrowRight, Check, Sparkles, PenTool, Layers, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

export default function OnboardingModal() {
  const { isOnboardingModalOpen, setIsOnboardingModalOpen, setActivePage } = useApp();
  const [step, setStep] = useState(0);

  if (!isOnboardingModalOpen) return null;

  const steps = [
    {
      title: 'Welcome to QUANTUM Mechanical Design Copilot',
      subtitle: 'Design with rigorous engineering intelligence and real-time mechanics calculation.',
      icon: <Sparkles size={20} className="text-[#2563EB]" />,
      content: (
        <div className="space-y-4 text-xs text-[#475569] dark:text-[#CBD5E1]">
          <p>
            QUANTUM is a professional mechanical design workspace combining rigorous analytical engineering calculations with an integrated AI Copilot and interactive CAD visualization.
          </p>
          <div className="p-3 rounded-[6px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F] text-[#64748B] dark:text-[#94A3B8] space-y-1 font-mono text-[11px]">
            <div className="text-[#172033] dark:text-white font-semibold">Core Product Foundations:</div>
            <div>• Real-time Multiaxial Stress Formulation (Von Mises & Tresca)</div>
            <div>• Precision Rotating Shaft Deflection & Power Transmission</div>
            <div>• Context-Aware AI Design Suggestions & Sizing Calculations</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 1: Define Design Constraints',
      subtitle: 'Specify torque, radial force, speed, and project safety factor.',
      icon: <PenTool size={18} className="text-[#2563EB]" />,
      content: (
        <div className="space-y-3 text-xs text-[#475569] dark:text-[#CBD5E1]">
          <p>
            Enter torque requirements in N·m, operating RPM, and load span. You can enter them manually, describe them in plain English to the Copilot, or inspect reference specifications.
          </p>
          <div className="p-3 rounded-[6px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F] flex items-center justify-between text-xs font-mono">
            <span className="text-[#64748B] dark:text-[#94A3B8]">Sample Baseline:</span>
            <span className="text-[#2563EB] font-bold">500 N·m @ 1450 RPM • FoS 2.0x</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 2: Material Alloy Selection',
      subtitle: 'Choose from certified steels, aluminums, titanium, or nickel superalloys.',
      icon: <Layers size={18} className="text-[#2563EB]" />,
      content: (
        <div className="space-y-3 text-xs text-[#475569] dark:text-[#CBD5E1]">
          <p>
            Select from our verified materials database with full mechanical properties (Yield Strength, Tensile Strength, Elastic Modulus, and Density). Compare alternatives with 1-click diff inspection.
          </p>
          <div className="p-3 rounded-[6px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F] flex items-center justify-between text-xs font-mono">
            <span className="text-[#64748B] dark:text-[#94A3B8]">Default Baseline:</span>
            <span className="text-[#172033] dark:text-white font-bold">AISI 4140 Alloy Steel (Sy = 655 MPa)</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 3: Interactive CAD & AI Copilot',
      subtitle: 'Inspect geometry, view section cuts, and verify calculation derivations.',
      icon: <ShieldCheck size={18} className="text-[#16A34A]" />,
      content: (
        <div className="space-y-3 text-xs text-[#475569] dark:text-[#CBD5E1]">
          <p>
            Click any assembly component in the CAD canvas to inspect bearing loads, keyway shear, or ask the Copilot for optimization recommendations. Use <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-[#94A3B8]">Ctrl+K</kbd> anytime to open the Command Center.
          </p>
          <div className="p-3 rounded-[6px] bg-[#F0FDF4] dark:bg-[#052E16]/30 border border-[#BBF7D0] dark:border-[#16A34A]/40 text-[#16A34A] font-mono text-xs flex items-center gap-2">
            <Check size={14} />
            <span>Workstation is calibrated and ready for engineering analysis.</span>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      setIsOnboardingModalOpen(false);
      setActivePage('workspace');
    }
  };

  return (
    <Modal
      isOpen={isOnboardingModalOpen}
      onClose={() => setIsOnboardingModalOpen(false)}
      title={current.title}
      subtitle={current.subtitle}
      icon={current.icon}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === step ? 'w-6 bg-[#2563EB]' : 'w-2 bg-[#CBD5E1] dark:bg-[#334155] hover:bg-[#94A3B8]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOnboardingModalOpen(false);
                setActivePage('workspace');
              }}
            >
              Skip Intro
            </Button>
            <Button
              variant="primary"
              size="sm"
              rightIcon={step === steps.length - 1 ? <Check size={13} /> : <ArrowRight size={13} />}
              onClick={handleNext}
            >
              {step === steps.length - 1 ? 'Open Workspace' : 'Next Step'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="py-2">{current.content}</div>
    </Modal>
  );
}
