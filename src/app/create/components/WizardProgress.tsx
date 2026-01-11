"use client";

import { useWizardStore } from "../store";
import { Check } from "lucide-react";

export function WizardProgress() {
  const { currentStep, getSteps, mode } = useWizardStore();
  const steps = getSteps();

  // If no mode selected yet, show minimal progress
  if (!mode) {
    const initialSteps = [
      { number: 1, name: "Source" },
      { number: 2, name: "Mode" },
    ];

    return (
      <div className="border-b border-[#333333] bg-[#0D0D0D] px-6 py-4">
        <div className="flex items-center justify-center max-w-3xl mx-auto">
          {initialSteps.map((step, index) => {
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            const isUpcoming = currentStep < step.number;

            return (
              <div key={step.number} className="flex items-center">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      transition-all duration-200
                      ${isCompleted ? "bg-[#FF4500] text-white" : ""}
                      ${isCurrent ? "bg-[#FF4500] text-white ring-4 ring-[#FF4500]/20" : ""}
                      ${isUpcoming ? "bg-[#1A1A1A] text-[#888888] border border-[#333333]" : ""}
                    `}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : step.number}
                  </div>
                  <span
                    className={`
                      mt-1 text-xs font-medium hidden sm:block
                      ${isCurrent ? "text-[#FF4500]" : "text-[#888888]"}
                    `}
                  >
                    {step.name}
                  </span>
                </div>

                {/* Connector Line */}
                {index < initialSteps.length - 1 && (
                  <div
                    className={`
                      h-0.5 w-8 sm:w-16 mx-2
                      ${currentStep > step.number ? "bg-[#FF4500]" : "bg-[#333333]"}
                    `}
                  />
                )}

                {/* Ellipsis for more steps */}
                {index === initialSteps.length - 1 && (
                  <>
                    <div className="h-0.5 w-8 sm:w-16 mx-2 bg-[#333333]" />
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-[#1A1A1A] text-[#888888] border border-[#333333]">
                        ...
                      </div>
                      <span className="mt-1 text-xs font-medium text-[#888888] hidden sm:block">
                        More
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-[#333333] bg-[#0D0D0D] px-6 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto overflow-x-auto">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isUpcoming = currentStep < step.number;

          return (
            <div key={step.number} className="flex items-center flex-shrink-0">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    transition-all duration-200
                    ${isCompleted ? "bg-[#FF4500] text-white" : ""}
                    ${isCurrent ? "bg-[#FF4500] text-white ring-4 ring-[#FF4500]/20" : ""}
                    ${isUpcoming ? "bg-[#1A1A1A] text-[#888888] border border-[#333333]" : ""}
                  `}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.number}
                </div>
                <span
                  className={`
                    mt-1 text-xs font-medium hidden sm:block whitespace-nowrap
                    ${isCurrent ? "text-[#FF4500]" : "text-[#888888]"}
                  `}
                >
                  {step.name}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    h-0.5 w-4 sm:w-8 lg:w-12 mx-1 sm:mx-2 flex-shrink-0
                    ${currentStep > step.number ? "bg-[#FF4500]" : "bg-[#333333]"}
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
