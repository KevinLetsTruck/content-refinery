"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useWizardStore, AIMessage } from "../../store";
import { Send, Sparkles, Check, Search, ShoppingBag, Star, ExternalLink } from "lucide-react";

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

// Popular products for quick selection
const QUICK_PRODUCTS = [
  { id: "cardio-miracle", name: "Cardio Miracle", price: "89.95", url: "https://store.letstruck.com/products/cardio-miracle" },
  { id: "lyte-balance", name: "Lyte Balance", price: "24.95", url: "https://store.letstruck.com/products/lyte-balance" },
  { id: "mind-fuel-mct", name: "Mind Fuel MCT Oil", price: "24.95", url: "https://store.letstruck.com/products/mind-fuel-mct-oil" },
  { id: "bio-d-mulsion-forte", name: "Bio-D-Mulsion Forte", price: "23.90", url: "https://store.letstruck.com/products/bio-d-mulsion-forte" },
  { id: "bee-ome-gold", name: "Bee-Ome Gold", price: "49.95", url: "https://store.letstruck.com/products/bee-ome-gold" },
  { id: "terraflora-deep-zen", name: "Terraflora Deep Zen", price: "59.95", url: "https://store.letstruck.com/products/terraflora-deep-zen" },
  { id: "biodoph-7-plus", name: "BioDoph-7 Plus", price: "42.90", url: "https://store.letstruck.com/products/biodoph-7-plus" },
  { id: "algae-dha", name: "Algae Oil DHA", price: "54.99", url: "https://store.letstruck.com/products/algae-oil-dha-omega-3s" },
  { id: "calocurb", name: "Calocurb GLP-1", price: "89.99", url: "https://store.letstruck.com/products/calocurb-glp-1-activator" },
  { id: "mihigh", name: "MiHIGH Sauna Blanket", price: "499.00", url: "https://store.letstruck.com/products/mihigh-infrared-sauna-blanket" },
];

// Product categories for filtering
const PRODUCT_CATEGORIES = [
  { value: "all", label: "All Products" },
  { value: "kevins_daily", label: "Kevin's Daily Stack" },
  { value: "gut_health", label: "Gut Health" },
  { value: "energy", label: "Energy & Focus" },
  { value: "stress", label: "Stress & Sleep" },
  { value: "heart", label: "Heart Health" },
];

interface ProductSelectorProps {
  onSelect: (product: { id: string; name: string; price: string; url: string }) => void;
  selectedProductId?: string;
}

function ProductSelector({ onSelect, selectedProductId }: ProductSelectorProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filteredProducts = useMemo(() => {
    let products = QUICK_PRODUCTS;

    if (category === "kevins_daily") {
      products = products.filter(p =>
        ["cardio-miracle", "lyte-balance", "mind-fuel-mct", "bio-d-mulsion-forte", "bee-ome-gold", "terraflora-deep-zen", "biodoph-7-plus", "algae-dha"].includes(p.id)
      );
    } else if (category === "gut_health") {
      products = products.filter(p =>
        ["bee-ome-gold", "terraflora-deep-zen", "biodoph-7-plus"].includes(p.id)
      );
    } else if (category === "energy") {
      products = products.filter(p =>
        ["mind-fuel-mct", "algae-dha"].includes(p.id)
      );
    } else if (category === "stress") {
      products = products.filter(p =>
        ["terraflora-deep-zen"].includes(p.id)
      );
    } else if (category === "heart") {
      products = products.filter(p =>
        ["cardio-miracle", "algae-dha"].includes(p.id)
      );
    }

    if (search) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return products;
  }, [search, category]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Select a product for the CTA:</p>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {PRODUCT_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Product Grid */}
      <div className="grid gap-2 max-h-48 overflow-y-auto">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelect(product)}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
              selectedProductId === product.id
                ? "border-primary bg-primary/10"
                : "hover:bg-accent hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className={`h-4 w-4 ${selectedProductId === product.id ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <span className="font-medium text-sm">{product.name}</span>
                {["cardio-miracle", "lyte-balance", "mind-fuel-mct", "bio-d-mulsion-forte", "bee-ome-gold", "terraflora-deep-zen", "biodoph-7-plus", "algae-dha"].includes(product.id) && (
                  <Star className="inline h-3 w-3 ml-1 text-yellow-500" />
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-primary">${product.price}</span>
          </button>
        ))}

        {filteredProducts.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">No products found</p>
        )}
      </div>

      {/* Browse all link */}
      <a
        href="https://store.letstruck.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
      >
        Browse full store <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

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
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [pendingCtaResponse, setPendingCtaResponse] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Base interview questions flow
  const baseQuestions = [
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
  ];

  // Dynamic questions based on CTA selection
  const questions = useMemo(() => {
    const q = [...baseQuestions];

    // Add product selection if visit_store was selected
    if (interviewData.callToAction === "Visit Store") {
      q.push({
        id: "product",
        question: "Which product should we promote? This helps create a targeted CTA.",
        type: "product_select",
        options: [],
        field: "selectedProductId",
      });
    }

    // Always end with audience question
    q.push({
      id: "audience",
      question: "Who's the ideal person to see this?",
      type: "choice",
      options: AUDIENCE_OPTIONS,
      field: "targetAudience",
    });

    return q;
  }, [interviewData.callToAction, sourceContent]);

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

    // Special handling for Visit Store CTA - show product selector
    if (field === "callToAction" && response === "Visit Store") {
      setPendingCtaResponse(response);
      setShowProductSelector(true);
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, 800));

      addInterviewMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "Great choice! Select a specific product to create a strong, targeted CTA:",
        timestamp: new Date(),
      });
      setIsTyping(false);
      return; // Don't advance to next question yet
    }

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

  const handleProductSelect = async (product: { id: string; name: string; price: string; url: string }) => {
    // Update interview data with product info
    setInterviewData({
      selectedProductId: product.id,
      selectedProductName: product.name,
      selectedProductUrl: product.url,
      selectedProductPrice: product.price,
    });

    // Add user response showing product selection
    addInterviewMessage({
      id: `user-product-${Date.now()}`,
      role: "user",
      content: `${product.name} ($${product.price})`,
      timestamp: new Date(),
    });

    setShowProductSelector(false);
    setPendingCtaResponse(null);

    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 800));

    // Move to next question (audience)
    const nextQuestionIndex = currentQuestion + 1;
    if (nextQuestionIndex < questions.length) {
      const nextQuestion = questions[nextQuestionIndex];
      addInterviewMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: `Perfect! I'll create a compelling CTA for ${product.name}.\n\n${nextQuestion.question}`,
        timestamp: new Date(),
      });
      setCurrentQuestion(nextQuestionIndex);
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
            {/* Product Selector */}
            {showProductSelector ? (
              <ProductSelector
                onSelect={handleProductSelect}
                selectedProductId={interviewData.selectedProductId}
              />
            ) : currentQ?.type === "choice" ? (
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
            ) : currentQ?.type === "product_select" ? (
              <ProductSelector
                onSelect={handleProductSelect}
                selectedProductId={interviewData.selectedProductId}
              />
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
            {interviewData.selectedProductName && (
              <div>
                <span className="text-muted-foreground">Product:</span>{" "}
                <span className="font-medium">{interviewData.selectedProductName}</span>
                {interviewData.selectedProductPrice && (
                  <span className="text-primary ml-1">(${interviewData.selectedProductPrice})</span>
                )}
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
