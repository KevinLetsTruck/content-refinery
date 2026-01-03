"use client";

import { useWizardStore, WizardStep } from "../store";
import { Check } from "lucide-react";

const STEPS: { step: WizardStep; label: string; shortLabel: string }[] = [
  { step: 1, label: "Source", shortLabel: "1" },
  { step: 2, label: "Interview", shortLabel: "2" },
  { step: 3, label: "Content", shortLabel: "3" },
  { step: 4, label: "Platforms", shortLabel: "4" },
  { step: 5, label: "Visuals", shortLabel: "5" },
  { step: 6, label: "Review", shortLabel: "6" },
  { step: 7, label: "Publish", shortLabel: "7" },
];

export function WizardProgress() {
  const { currentStep } = useWizardStore();

  return (
    <div className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {STEPS.map(({ step, label }, index) => {
          const isCompleted = currentStep > step;
          const isCurrent = currentStep === step;
          const isUpcoming = currentStep < step;

          return (
            <div key={step} className="flex items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    transition-all duration-200
                    ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                    ${isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                    ${isUpcoming ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step
                  )}
                </div>
                <span
                  className={`
                    mt-1 text-xs font-medium hidden sm:block
                    ${isCurrent ? 'text-primary' : 'text-muted-foreground'}
                  `}
                >
                  {label}
                </span>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    h-0.5 w-8 sm:w-16 mx-2
                    ${currentStep > step ? 'bg-primary' : 'bg-muted'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
