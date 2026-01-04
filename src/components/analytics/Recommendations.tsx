"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  Clock,
  Target,
  Loader2,
} from "lucide-react";

interface RecommendationsData {
  topFormulas: string[];
  topHooks: string[];
  bestTimes: Array<{ day: string; hour: string; engagement: number }>;
  insights: string[];
}

interface Props {
  platform?: string;
  pillar?: string;
}

export function Recommendations({ platform = "twitter", pillar }: Props) {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchRecommendations();
  }, [platform, pillar]);
  
  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ platform });
      if (pillar) params.set("pillar", pillar);
      
      const response = await fetch(`/api/analytics/recommendations?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#FF4500]" />
      </div>
    );
  }
  
  if (!data) return null;
  
  return (
    <div className="space-y-4">
      {/* Top Formulas */}
      <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4">
        <div className="flex items-center gap-2 text-[#F4A300] mb-3">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">Top Formulas</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.topFormulas.map((formula, i) => (
            <span
              key={formula}
              className={`px-3 py-1 rounded-full text-sm ${
                i === 0
                  ? "bg-[#FF4500]/20 text-[#FF4500]"
                  : "bg-[#0D0D0D] text-[#888]"
              }`}
            >
              {formula}
            </span>
          ))}
        </div>
      </div>
      
      {/* Top Hooks */}
      <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4">
        <div className="flex items-center gap-2 text-[#F4A300] mb-3">
          <Target className="h-4 w-4" />
          <span className="text-sm font-medium">Top Hooks</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.topHooks.map((hook, i) => (
            <span
              key={hook}
              className={`px-3 py-1 rounded-full text-sm ${
                i === 0
                  ? "bg-[#FF4500]/20 text-[#FF4500]"
                  : "bg-[#0D0D0D] text-[#888]"
              }`}
            >
              {hook}
            </span>
          ))}
        </div>
      </div>
      
      {/* Best Times */}
      {data.bestTimes.length > 0 && (
        <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4">
          <div className="flex items-center gap-2 text-[#F4A300] mb-3">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Best Times to Post</span>
          </div>
          <div className="space-y-2">
            {data.bestTimes.map((time, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[#888]">
                  {time.day} at {time.hour}
                </span>
                <span className="text-[#FF4500]">
                  {time.engagement.toFixed(2)}% avg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Insights */}
      {data.insights.length > 0 && (
        <div className="bg-gradient-to-r from-[#FF4500]/10 to-[#F4A300]/10 border border-[#FF4500]/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-[#FF4500] mb-3">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">AI Insights</span>
          </div>
          <div className="space-y-1">
            {data.insights.slice(0, 3).map((insight, i) => (
              <p key={i} className="text-sm text-[#CCC]">{insight}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

