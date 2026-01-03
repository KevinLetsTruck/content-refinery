"use client";

import { useState, useRef, useEffect } from "react";
import { useWizardStore, AIMessage } from "../../store";
import { Sparkles, Send, X, Lightbulb } from "lucide-react";

export function AIAssistantPanel() {
  const {
    currentStep,
    aiPanelOpen,
    toggleAIPanel,
    aiMessages,
    addAIMessage,
    aiSuggestions,
    sourceContent,
    selectedContentId,
    contentOptions,
  } = useWizardStore();

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Generate contextual greeting based on step
  useEffect(() => {
    if (aiMessages.length === 0 && aiPanelOpen) {
      const greeting = getStepGreeting(currentStep);
      addAIMessage({
        id: `greeting-${Date.now()}`,
        role: "assistant",
        content: greeting.content,
        timestamp: new Date(),
        suggestions: greeting.suggestions,
      });
    }
  }, [currentStep, aiPanelOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    addAIMessage({
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    });

    setInput("");
    setIsTyping(true);

    try {
      // Call AI endpoint
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          context: {
            currentStep,
            sourceContent,
            selectedContentId,
            contentOptions,
          },
        }),
      });

      const data = await response.json();

      addAIMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.message || "I'm here to help! What would you like to know?",
        timestamp: new Date(),
        suggestions: data.suggestions,
        actions: data.actions,
      });
    } catch (error) {
      addAIMessage({
        id: `ai-error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I had trouble processing that. Try again?",
        timestamp: new Date(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  if (!aiPanelOpen) return null;

  return (
    <aside className="fixed right-0 top-0 h-full w-72 bg-[#1A1A1A] border-l border-[#333333] flex flex-col z-50 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333] bg-[#0D0D0D]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#FF4500]/20">
            <Sparkles className="h-4 w-4 text-[#FF4500]" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-white">AI Assistant</h2>
            <p className="text-xs text-[#888888]">Here to help</p>
          </div>
        </div>
        <button
          onClick={toggleAIPanel}
          className="p-1 rounded hover:bg-[#333333] transition-colors"
        >
          <X className="h-4 w-4 text-[#888888] hover:text-white" />
        </button>
      </div>

      {/* Suggestions Bar */}
      {aiSuggestions.length > 0 && (
        <div className="px-4 py-2 border-b border-[#333333] bg-[#F4A300]/10">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-[#F4A300] mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-[#F4A300]">
                Suggestion
              </p>
              <p className="text-[#F4A300]/80">
                {aiSuggestions[0]?.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {aiMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-2 text-[#888888]">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-[#FF4500]/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-[#FF4500]/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-[#FF4500]/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs">AI is thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {aiMessages.length > 0 && aiMessages[aiMessages.length - 1].suggestions && (
        <div className="px-3 py-2 border-t border-[#333333] flex flex-wrap gap-1.5">
          {aiMessages[aiMessages.length - 1].suggestions?.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#F4A300]/20 text-[#F4A300] hover:bg-[#F4A300]/30 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-[#333333]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-1.5 rounded border border-[#333333] bg-[#0D0D0D] text-white text-sm focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20 placeholder-[#888888]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-1.5 rounded bg-[#FF4500] text-white hover:bg-[#FF4500]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`
          max-w-[85%] rounded-lg px-3 py-2 text-sm
          ${isUser
            ? "bg-[#FF4500] text-white"
            : "bg-[#0D0D0D] text-white border border-[#333333]"
          }
        `}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        
        {/* Action Buttons */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.actions.map((action, i) => (
              <button
                key={i}
                className="text-xs px-2 py-1 rounded bg-[#FF4500]/20 text-[#FF4500] hover:bg-[#FF4500]/30 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getStepGreeting(step: number): { content: string; suggestions?: string[] } {
  switch (step) {
    case 1:
      return {
        content: "Hey! 👋 I'm here to help you create killer content.\n\nWhat do you want to share with The Tribe today? Pick a starting point, or just tell me your idea and I'll help shape it.",
        suggestions: ["What should I post about?", "Show me content gaps", "What's trending?"],
      };
    case 2:
      return {
        content: "Great choice! Let me ask a few questions to make sure we nail this.\n\nI'll help you refine the message so it really lands with your audience.",
        suggestions: ["What makes a good hook?", "Help me with the emotion", "I'm stuck"],
      };
    case 3:
      return {
        content: "Here are your content options! I've generated a few variations based on our conversation.\n\nI can explain why each one works, or help you tweak them.",
        suggestions: ["Why this format?", "Make it edgier", "Combine options"],
      };
    case 4:
      return {
        content: "Time to pick your platforms! I'll help you figure out where this content will perform best.\n\nDifferent platforms = different audiences.",
        suggestions: ["Where does this work best?", "Should I skip any?", "Explain the formats"],
      };
    case 5:
      return {
        content: "Generating your visuals with Gamma! 🎨\n\nI'm using your Let's Truck brand theme. Let me know if you want any adjustments.",
        suggestions: ["Different style", "Larger text", "More dramatic"],
      };
    case 6:
      return {
        content: "Almost there! Let's do a final check.\n\nI've scanned for any issues. Take a look and let me know if you want changes.",
        suggestions: ["Check my hashtags", "Is this compliant?", "Any red flags?"],
      };
    case 7:
      return {
        content: "Ready to go live! 🚀\n\nI can suggest the best time to post based on when your audience is most active.",
        suggestions: ["Best time to post?", "Am I posting too much?", "Schedule for peak engagement"],
      };
    default:
      return {
        content: "I'm here to help! What do you need?",
      };
  }
}
