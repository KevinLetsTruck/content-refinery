"use client";

import { 
  BusinessObjective, 
  ContentPillar, 
  ContentFormula,
  PILLAR_CONFIG,
  FORMULA_TEMPLATES,
} from "@/lib/content/strategy";
import { Mail, Target, ShoppingCart, Users, Mic } from "lucide-react";

export interface CampaignConfig {
  objective: BusinessObjective;
  pillar: ContentPillar;
  formula: ContentFormula;
  ctaKeyword?: string;
}

interface CampaignSelectorProps {
  value: CampaignConfig;
  onChange: (config: CampaignConfig) => void;
  compact?: boolean;
}

const OBJECTIVE_OPTIONS: { value: BusinessObjective; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: "email_list", 
    label: "Email List Building", 
    icon: <Mail className="h-4 w-4" />,
    description: "Grow your subscriber list with lead magnets"
  },
  { 
    value: "coaching", 
    label: "Coaching Clients", 
    icon: <Target className="h-4 w-4" />,
    description: "Attract discovery calls and sign clients"
  },
  { 
    value: "product_sales", 
    label: "Product Sales", 
    icon: <ShoppingCart className="h-4 w-4" />,
    description: "Drive store.letstruck.com revenue"
  },
  { 
    value: "audience_growth", 
    label: "Audience Growth", 
    icon: <Users className="h-4 w-4" />,
    description: "Build followers and reach"
  },
  { 
    value: "podcast", 
    label: "Podcast Listeners", 
    icon: <Mic className="h-4 w-4" />,
    description: "Promote Let's Truck Radio"
  },
];

const PILLAR_OPTIONS: { value: ContentPillar; label: string; percentage: number; emoji: string }[] = [
  { value: "proper_human_diet", label: "Proper Human Diet", percentage: 30, emoji: "🥩" },
  { value: "gut_health", label: "Gut Health & Candida", percentage: 25, emoji: "🦠" },
  { value: "sleep_recovery", label: "Sleep & Recovery", percentage: 20, emoji: "😴" },
  { value: "detox_environment", label: "Detox & Environment", percentage: 15, emoji: "🧪" },
  { value: "mental_performance", label: "Mental Performance", percentage: 10, emoji: "🧠" },
];

const FORMULA_OPTIONS: { value: ContentFormula; label: string; emoji: string; bestFor: string }[] = [
  { value: "data_bomb", label: "Data Bomb", emoji: "💣", bestFor: "stats, shocking truths" },
  { value: "tough_love", label: "Tough Love", emoji: "💪", bestFor: "accountability, wake-up calls" },
  { value: "transformation", label: "Transformation Story", emoji: "🔄", bestFor: "client results, proof" },
  { value: "contrarian", label: "Contrarian Hot Take", emoji: "🔥", bestFor: "engagement, shares" },
  { value: "protocol", label: "Practical Protocol", emoji: "📋", bestFor: "how-to, tips" },
  { value: "myth_buster", label: "Myth Buster", emoji: "🎯", bestFor: "education, authority" },
  { value: "insider_secret", label: "Insider Secret", emoji: "🤫", bestFor: "trust, exclusivity" },
];

export function CampaignSelector({ value, onChange, compact = false }: CampaignSelectorProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-3">
        <select 
          value={value.objective}
          onChange={(e) => onChange({ ...value, objective: e.target.value as BusinessObjective })}
          className="bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-white text-sm"
        >
          {OBJECTIVE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        
        <select 
          value={value.pillar}
          onChange={(e) => onChange({ ...value, pillar: e.target.value as ContentPillar })}
          className="bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-white text-sm"
        >
          {PILLAR_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>
          ))}
        </select>
        
        <select 
          value={value.formula}
          onChange={(e) => onChange({ ...value, formula: e.target.value as ContentFormula })}
          className="bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-white text-sm"
        >
          {FORMULA_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Objective Selection */}
      <div>
        <label className="text-sm font-medium text-white mb-3 block">
          Campaign Objective
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {OBJECTIVE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...value, objective: opt.value })}
              className={`
                flex items-start gap-3 p-4 rounded-lg border text-left transition-all
                ${value.objective === opt.value 
                  ? "bg-[#FF4500]/10 border-[#FF4500] text-white" 
                  : "bg-[#1A1A1A] border-[#333] text-[#888] hover:border-[#555]"
                }
              `}
            >
              <div className={`p-2 rounded ${value.objective === opt.value ? "bg-[#FF4500]/20 text-[#FF4500]" : "bg-[#0D0D0D] text-[#666]"}`}>
                {opt.icon}
              </div>
              <div>
                <p className="font-medium text-white">{opt.label}</p>
                <p className="text-xs mt-0.5 text-[#888]">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Pillar Selection */}
      <div>
        <label className="text-sm font-medium text-white mb-3 block">
          Content Pillar
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PILLAR_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...value, pillar: opt.value })}
              className={`
                flex items-center gap-3 p-4 rounded-lg border text-left transition-all
                ${value.pillar === opt.value 
                  ? "bg-[#FF4500]/10 border-[#FF4500]" 
                  : "bg-[#1A1A1A] border-[#333] hover:border-[#555]"
                }
              `}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <div>
                <p className="font-medium text-white">{opt.label}</p>
                <p className="text-xs text-[#888]">{opt.percentage}% of content mix</p>
              </div>
            </button>
          ))}
        </div>
        
        {/* Pillar key message */}
        <div className="mt-3 p-3 rounded bg-[#1A1A1A] border border-[#333]">
          <p className="text-sm text-[#F4A300] italic">
            "{PILLAR_CONFIG[value.pillar].keyMessage}"
          </p>
        </div>
      </div>
      
      {/* Formula Selection */}
      <div>
        <label className="text-sm font-medium text-white mb-3 block">
          Content Formula
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FORMULA_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...value, formula: opt.value })}
              className={`
                flex items-center gap-3 p-4 rounded-lg border text-left transition-all
                ${value.formula === opt.value 
                  ? "bg-[#FF4500]/10 border-[#FF4500]" 
                  : "bg-[#1A1A1A] border-[#333] hover:border-[#555]"
                }
              `}
            >
              <span className="text-xl">{opt.emoji}</span>
              <div>
                <p className="font-medium text-white">{opt.label}</p>
                <p className="text-xs text-[#888]">Best for: {opt.bestFor}</p>
              </div>
            </button>
          ))}
        </div>
        
        {/* Formula structure */}
        <div className="mt-3 p-3 rounded bg-[#1A1A1A] border border-[#333]">
          <p className="text-xs text-[#888] mb-2">Structure:</p>
          <div className="flex flex-wrap gap-2">
            {FORMULA_TEMPLATES[value.formula].structure.map((step, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-[#0D0D0D] text-[#888]">
                {i + 1}. {step}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* CTA Keyword (for email list objective) */}
      {value.objective === "email_list" && (
        <div>
          <label className="text-sm font-medium text-white mb-2 block">
            Lead Magnet Keyword
          </label>
          <input 
            type="text"
            value={value.ctaKeyword || ""}
            onChange={(e) => onChange({ ...value, ctaKeyword: e.target.value })}
            placeholder="e.g., GUIDE, PROTOCOL, FREE, CANDIDA"
            className="w-full bg-[#1A1A1A] border border-[#333] rounded px-4 py-2 text-white placeholder-[#666] focus:border-[#FF4500] focus:outline-none"
          />
          <p className="text-xs text-[#888] mt-1">
            This keyword will be used in CTAs like "DM me 'GUIDE' for the free download"
          </p>
        </div>
      )}
    </div>
  );
}

export default CampaignSelector;



