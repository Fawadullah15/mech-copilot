import React, { useState } from 'react';
import { ArrowRight, Check, Sparkles, PenTool, Layers, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { BrandLogo } from './brand/BrandLogo';

export default function OnboardingModal() {
  const { isOnboardingModalOpen, setIsOnboardingModalOpen, setActivePage } = useApp();
  const [step, setStep] = useState(0);

  if (!isOnboardingModalOpen) return null;

  const steps = [
    {
      title: 'Welcome to QUANTUM Mechanical Design Copilot',
      subtitle: 'Design with rigorous engineering intelligence and real-time mechanics calculation.',
      icon: <Sparkles size={24} className="text-accent-bright" />,
      content: (
        <div className="space-y-4 text-xs text-[#C2C8D0]">
          <p>
            QUANTUM is a professional mechanical design workspace combining rigorous analytical engineering calculations with an integrated AI Copilot and interactive CAD visualization.
          </p>
          <div className="p-3 rounded-[3px] bg-[#14171A] border border-[#2A2E35] text-[#969DA5] space-y-1 font-mono text-[11px]">
            <div className="text-[#F0F1F2] font-semibold">Core Product Foundations:</div>
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
      icon: <PenTool size={20} className="text-[#64D6C5]" />,
      content: (
        <div className="space-y-3 text-xs text-[#C2C8D0]">
          <p>
            Enter torque requirements in N·m, operating RPM, and load span. You can enter them manually, describe them in plain English to the Copilot, or upload technical drawings/CAD models.
          </p>
          <div className="p-3 rounded-[3px] bg-[#14171A] border border-[#2A2E35] flex items-center justify-between text-xs font-mono">
            <span className="text-[#969DA5]">Sample Baseline:</span>
            <span className="text-[#64D6C5] font-bold">500 N·m @ 1450 RPM • FoS 2.0x</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 2: Material Alloy Selection',
      subtitle: 'Choose from certified steels, aluminums, titanium, or nickel superalloys.',
      icon: <Layers size={20} className="text-purple-400" />,
      content: (
        <div className="space-y-3 text-xs text-[#C2C8D0]">
          <p>
            Select from our verified materials database with full mechanical properties (Yield Strength, Tensile Strength, Elastic Modulus, and Density). Compare alternatives with 1-click diff inspection.
          </p>
          <div className="p-3 rounded-[3px] bg-[#14171A] border border-[#2A2E35] flex items-center justify-between text-xs font-mono">
            <span className="text-[#969DA5]">Default Baseline:</span>
            <span className="text-[#F0F1F2] font-bold">AISI 4140 Alloy Steel (Sy = 655 MPa)</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 3: Interactive CAD & AI Copilot',
      subtitle: 'Inspect geometry, view section cuts, and verify calculation derivations.',
      icon: <ShieldCheck size={20} className="text-[#34D399]" />,
      content: (
        <div className="space-y-3 text-xs text-[#C2C8D0]">
          <p>
            Click any assembly component in the CAD canvas to inspect bearing loads, keyway shear, or ask the Copilot for optimization recommendations. Use <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-[#14171A] border border-[#34393F] text-[#969DA5]">⌘K</kbd> anytime to open the Command Center.
          </p>
          <div className="p-3 rounded-[3px] bg-[#14171A] border border-[#2A2E35] text-[#34D399] font-mono text-xs flex items-center gap-2">
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
                onClick={() => setStep(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === step ? 'w-6 bg-accent-bright' : 'bg-navy-750 hover:bg-navy-600'
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
