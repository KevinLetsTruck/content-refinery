"use client";

import { useWizardStore } from "../store";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

export function WizardNavigation() {
  const { currentStep, canProceed, isLoading, nextStep, prevStep, getSteps } = useWizardStore();
  const steps = getSteps();
  const totalSteps = steps.length || 7;
  const lastStepNumber = steps.length > 0 ? steps[steps.length - 1].number : 7;

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === lastStepNumber;

  return (
    <footer className="border-t border-[#333333] bg-[#0D0D0D] px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Back Button */}
        <button
          onClick={prevStep}
          disabled={isFirstStep || isLoading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors
            ${isFirstStep || isLoading
              ? 'text-[#888888] cursor-not-allowed'
              : 'text-white hover:bg-[#1A1A1A]'
            }
          `}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Step Indicator */}
        <span className="text-sm text-[#888888]">
          Step {currentStep} of {totalSteps}
        </span>

        {/* Next Button */}
        <button
          onClick={nextStep}
          disabled={!canProceed || isLoading}
          className={`
            flex items-center gap-2 px-6 py-2 rounded font-medium transition-all
            ${!canProceed || isLoading
              ? 'bg-[#1A1A1A] text-[#888888] cursor-not-allowed border border-[#333333]'
              : 'bg-gradient-to-r from-[#FF4500] to-[#CC3700] text-white hover:from-[#FF6633] hover:to-[#FF4500]'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isLastStep ? (
            'Publish'
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </footer>
  );
}
