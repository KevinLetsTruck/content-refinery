"use client";

import { useWizardStore } from "./store";
import { WizardProgress } from "./components/WizardProgress";
import { WizardNavigation } from "./components/WizardNavigation";
import { AIAssistantPanel } from "./components/ai/AIAssistantPanel";
import { Step1Source } from "./components/steps/Step1Source";
import { Step2Interview } from "./components/steps/Step2Interview";
import { Step3Content } from "./components/steps/Step3Content";
import { Step4Platforms } from "./components/steps/Step4Platforms";
import { Step5Visuals } from "./components/steps/Step5Visuals";
import { Step6Review } from "./components/steps/Step6Review";
import { Step7Publish } from "./components/steps/Step7Publish";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

const STEP_TITLES = {
  1: "What's your starting point?",
  2: "Tell me more",
  3: "Choose your content",
  4: "Where should this go?",
  5: "Creating your visuals",
  6: "Final review",
  7: "Ready to publish",
};

export default function CreatePage() {
  const { currentStep, aiPanelOpen, toggleAIPanel } = useWizardStore();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Source />;
      case 2:
        return <Step2Interview />;
      case 3:
        return <Step3Content />;
      case 4:
        return <Step4Platforms />;
      case 5:
        return <Step5Visuals />;
      case 6:
        return <Step6Review />;
      case 7:
        return <Step7Publish />;
      default:
        return <Step1Source />;
    }
  };

  return (
    <div className="flex h-screen">
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${aiPanelOpen ? 'mr-72' : ''}`}>
        {/* Header */}
        <header className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-semibold">Create Content</h1>
                <p className="text-sm text-muted-foreground">{STEP_TITLES[currentStep]}</p>
              </div>
            </div>
            
            <button
              onClick={toggleAIPanel}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                aiPanelOpen 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI Assistant</span>
            </button>
          </div>
        </header>

        {/* Progress Bar */}
        <WizardProgress />

        {/* Step Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-8">
            {renderStep()}
          </div>
        </main>

        {/* Navigation */}
        <WizardNavigation />
      </div>

      {/* AI Assistant Panel */}
      <AIAssistantPanel />
    </div>
  );
}
