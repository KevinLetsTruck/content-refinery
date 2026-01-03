"use client";

import { useState, useEffect, useRef } from "react";
import { useWizardStore, AIMessage } from "../../store";
import { Send, Sparkles, Check } from "lucide-react";

const EMOTION_OPTIONS = [
  { value: "wake_up_call", label: "😱 Wake-up Call", description: "Shock them into action" },
  { value: "empowerment", label: "💪 Empowerment", description: "They can do this" },
  { value: "curiosity", label: "🤔 Curiosity", description: "Make them want to know more" },
  { value: "frustration", label: "😤 Frustration", description: "Channel their pain" },
  { value: "hope", label: "🌟 Hope", description: "There's a better way" },
];

const CTA_OPTIONS = [
  { value: "visit_store", label: "Visit Store" },
  { value: "book_coaching", label: "Book Coaching" },
  { value: "download_guide", label: "Download Guide" },
  { value: "join_community", label: "Join Community" },
  { value: "awareness", label: "Just Awareness" },
];

const AUDIENCE_OPTIONS = [
  { value: "new_drivers", label: "New Drivers" },
  { value: "experienced_oo", label: "Experienced O/Os" },
  { value: "health_curious", label: "Health-Curious" },
  { value: "skeptics", label: "Skeptics" },
  { value: "all", label: "Everyone" },
];

export function Step2Interview() {
  const {
    sourceContent,
    sourceType,
    interviewMessages,
    addInterviewMessage,
    setInterviewData,
    interviewData,
    completeInterview,
    interviewComplete,
  } = useWizardStore();

  const [input, setInput] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Interview questions flow
  const questions = [
    {
      id: "emotion",
      question: `Great starting point! "${sourceContent.slice(0, 50)}${sourceContent.length > 50 ? '...' : ''}"\n\nWhat emotion should this evoke in your audience?`,
      type: "choice",
      options: EMOTION_OPTIONS,
      field: "targetEmotion",
    },
    {
      id: "evidence",
      question: "Any specific stat, fact, or story to back this up? This makes content more shareable.",
      type: "text",
      placeholder: "e.g., 70% of drivers test positive, or a client story...",
      field: "supportingEvidence",
    },
    {
      id: "cta",
      question: "What should they DO after seeing this?",
      type: "choice",
      options: CTA_OPTIONS,
      field: "callToAction",
    },
    {
      id: "audience",
      question: "Who's the ideal person to see this?",
      type: "choice",
      options: AUDIENCE_OPTIONS,
      field: "targetAudience",
    },
  ];

  // Initialize interview
  useEffect(() => {
    if (interviewMessages.length === 0) {
      const firstQuestion = questions[0];
      addInterviewMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: firstQuestion.question,
        timestamp: new Date(),
      });
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interviewMessages]);

  const handleResponse = async (response: string, field: string) => {
    // Add user response
    addInterviewMessage({
      id: `user-${Date.now()}`,
      role: "user",
      content: response,
      timestamp: new Date(),
    });

    // Update interview data
    setInterviewData({ [field]: response });

    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 800)); // Simulate typing

    const nextQuestionIndex = currentQuestion + 1;

    if (nextQuestionIndex < questions.length) {
      // Ask next question
      const nextQuestion = questions[nextQuestionIndex];
      addInterviewMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: nextQuestion.question,
        timestamp: new Date(),
      });
      setCurrentQuestion(nextQuestionIndex);
    } else {
      // Interview complete
      addInterviewMessage({
        id: `ai-complete-${Date.now()}`,
        role: "assistant",
        content: "Perfect! I've got everything I need. Let me generate some content options for you... 🎯",
        timestamp: new Date(),
      });
      completeInterview();
    }

    setIsTyping(false);
  };

  const handleTextSubmit = () => {
    if (!input.trim()) return;
    const currentQ = questions[currentQuestion];
    handleResponse(input, currentQ.field);
    setInput("");
  };

  const currentQ = questions[currentQuestion];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Chat Container */}
      <div className="bg-card rounded-xl border overflow-hidden">
        {/* Messages */}
        <div className="h-[400px] overflow-auto p-6 space-y-4">
          {interviewMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`
                  max-w-[80%] rounded-2xl px-4 py-3
                  ${message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                  }
                `}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Response Input Area */}
        {!interviewComplete && (
          <div className="border-t p-4 bg-muted/30">
            {currentQ?.type === "choice" ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">Choose one:</p>
                <div className="flex flex-wrap gap-2">
                  {currentQ.options?.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleResponse(option.label, currentQ.field)}
                      className="px-4 py-2 rounded-full bg-background border hover:bg-accent hover:border-primary transition-colors text-sm"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                  placeholder={currentQ?.placeholder || "Type your response..."}
                  className="flex-1 px-4 py-2 rounded-full border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!input.trim()}
                  className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Interview Complete */}
        {interviewComplete && (
          <div className="border-t p-4 bg-green-50 dark:bg-green-950/20">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Check className="h-5 w-5" />
              <span className="font-medium">Interview complete!</span>
              <span className="text-sm text-green-600 dark:text-green-400">
                Click Continue to see your content options.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Card */}
      {Object.values(interviewData).some(Boolean) && (
        <div className="mt-6 bg-card rounded-xl border p-4">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Content Brief
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {interviewData.targetEmotion && (
              <div>
                <span className="text-muted-foreground">Emotion:</span>{" "}
                <span className="font-medium">{interviewData.targetEmotion}</span>
              </div>
            )}
            {interviewData.supportingEvidence && (
              <div>
                <span className="text-muted-foreground">Evidence:</span>{" "}
                <span className="font-medium">{interviewData.supportingEvidence.slice(0, 30)}...</span>
              </div>
            )}
            {interviewData.callToAction && (
              <div>
                <span className="text-muted-foreground">CTA:</span>{" "}
                <span className="font-medium">{interviewData.callToAction}</span>
              </div>
            )}
            {interviewData.targetAudience && (
              <div>
                <span className="text-muted-foreground">Audience:</span>{" "}
                <span className="font-medium">{interviewData.targetAudience}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
