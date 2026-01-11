"use client";

import { useRouter } from "next/navigation";
import { useWizardStore, AIMessage } from "../store";
import { ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

interface InterviewQuestion {
  id: string;
  question: string;
  type: "text" | "select" | "multiselect";
  placeholder?: string;
  options?: string[];
}

export default function InterviewPage() {
  const router = useRouter();
  const {
    sourceType,
    sourceContent,
    mode,
    interviewAnswers,
    interviewComplete,
    setInterviewAnswer,
    setInterviewComplete,
    addInterviewMessage,
    interviewMessages,
    nextStep,
    prevStep,
    currentStep,
    goToStep,
  } = useWizardStore();

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [readyMessage, setReadyMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const expectedStep = mode === "quick_post" ? 3 : 4;

  useEffect(() => {
    if (!sourceType || !mode) {
      router.push("/create");
      return;
    }
  }, [sourceType, mode, router]);

  useEffect(() => {
    if (currentStep !== expectedStep) {
      goToStep(expectedStep);
    }
  }, [currentStep, expectedStep, goToStep]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/wizard/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceData: { content: sourceContent },
          mode,
          previousAnswers: interviewAnswers,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch questions");

      const data = await response.json();

      if (data.isComplete) {
        setInterviewComplete(true);
        setReadyMessage(data.readyMessage || "Great! I have everything I need.");
      } else {
        setQuestions(data.questions || []);
        setCurrentQuestion(0);
      }
    } catch (error) {
      console.error("Interview error:", error);
      // Fallback questions
      setQuestions([
        {
          id: "fallback",
          question: "Tell me more about what you want to create.",
          type: "text",
          placeholder: "Share your thoughts...",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [sourceType, sourceContent, mode, interviewAnswers, setInterviewComplete]);

  useEffect(() => {
    if (!interviewComplete && sourceType) {
      fetchQuestions();
    }
  }, [interviewComplete, sourceType, fetchQuestions]);

  const handleAnswer = async () => {
    const question = questions[currentQuestion];
    if (!question) return;

    const answer =
      question.type === "multiselect"
        ? selectedOptions
        : question.type === "select"
        ? selectedOptions[0]
        : inputValue;

    // Add to interview answers
    setInterviewAnswer(question.id, answer);

    // Add to messages
    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: Array.isArray(answer) ? answer.join(", ") : answer,
      timestamp: new Date(),
    };
    addInterviewMessage(userMessage);

    // Reset inputs
    setInputValue("");
    setSelectedOptions([]);

    // Move to next question or fetch more
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Fetch next batch of questions
      await fetchQuestions();
    }
  };

  const handleContinue = () => {
    nextStep();
    if (mode === "quick_post") {
      router.push("/create/content");
    } else {
      router.push("/create/strategy");
    }
  };

  const handleBack = () => {
    prevStep();
    if (mode === "quick_post") {
      router.push("/create/mode");
    } else {
      router.push("/create/configure");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [interviewMessages, questions]);

  if (loading && questions.length === 0 && !interviewComplete) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#FF4500] animate-spin mb-4" />
        <p className="text-[#888888]">Preparing questions...</p>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-[#888888] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-3xl font-bold mb-2 text-white">Tell me more</h1>
      <p className="text-[#888888] mb-8">
        A few quick questions to help me create the best content for you.
      </p>

      {/* Chat-style interview */}
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-6 mb-6 min-h-[300px] max-h-[500px] overflow-y-auto">
        {/* Previous messages */}
        {interviewMessages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 ${msg.role === "user" ? "text-right" : ""}`}
          >
            <div
              className={`inline-block max-w-[80%] p-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-[#FF4500] text-white"
                  : "bg-[#333333] text-[#CCCCCC]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Current question or completion message */}
        {interviewComplete ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#22C55E]/20 rounded-full mb-4">
              <ArrowRight className="w-8 h-8 text-[#22C55E]" />
            </div>
            <p className="text-white text-lg font-medium mb-2">
              {readyMessage}
            </p>
            <p className="text-[#888888]">
              Click continue to{" "}
              {mode === "quick_post"
                ? "generate your content"
                : "see your campaign strategy"}
              .
            </p>
          </div>
        ) : currentQ ? (
          <div className="mb-4">
            <div className="inline-block max-w-[80%] p-3 rounded-lg bg-[#333333] text-[#CCCCCC]">
              {currentQ.question}
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {!interviewComplete && currentQ && (
        <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl p-4">
          {currentQ.type === "text" && (
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={currentQ.placeholder || "Type your answer..."}
                className="flex-1 bg-[#0D0D0D] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-[#666666] focus:border-[#FF4500] focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputValue.trim()) {
                    handleAnswer();
                  }
                }}
              />
              <button
                onClick={handleAnswer}
                disabled={!inputValue.trim()}
                className="px-4 py-3 bg-[#FF4500] hover:bg-[#CC3700] disabled:bg-[#333333] disabled:cursor-not-allowed rounded-lg text-white transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}

          {(currentQ.type === "select" || currentQ.type === "multiselect") &&
            currentQ.options && (
              <div className="space-y-2">
                {currentQ.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      if (currentQ.type === "multiselect") {
                        setSelectedOptions((prev) =>
                          prev.includes(option)
                            ? prev.filter((o) => o !== option)
                            : [...prev, option]
                        );
                      } else {
                        setSelectedOptions([option]);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedOptions.includes(option)
                        ? "border-[#FF4500] bg-[#FF4500]/10 text-white"
                        : "border-[#333333] bg-[#0D0D0D] text-[#CCCCCC] hover:border-[#444444]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
                {selectedOptions.length > 0 && (
                  <button
                    onClick={handleAnswer}
                    className="w-full mt-3 px-4 py-3 bg-[#FF4500] hover:bg-[#CC3700] rounded-lg text-white font-medium transition-colors"
                  >
                    Continue
                  </button>
                )}
              </div>
            )}
        </div>
      )}

      {/* Continue button when interview is complete */}
      {interviewComplete && (
        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 bg-[#FF4500] hover:bg-[#CC3700] px-6 py-3 rounded-lg font-medium text-white transition-colors"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
