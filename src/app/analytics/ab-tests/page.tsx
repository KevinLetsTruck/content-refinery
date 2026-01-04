"use client";

import { useState, useEffect } from "react";
import {
  Beaker,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface ABTest {
  id: string;
  name: string;
  status: string;
  testVariable: string;
  platform: string;
  pillar?: string;
  variantAConfig: Record<string, string>;
  variantBConfig: Record<string, string>;
  variantCConfig?: Record<string, string>;
  winningVariant?: string;
  confidenceLevel?: number;
  liftPercentage?: number;
  variantAMetrics?: { avgEngagement: number; postCount: number };
  variantBMetrics?: { avgEngagement: number; postCount: number };
  variantCMetrics?: { avgEngagement: number; postCount: number };
  startedAt: string;
  completedAt?: string;
}

export default function ABTestsPage() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  
  useEffect(() => {
    fetchTests();
  }, [filter]);
  
  const fetchTests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      
      const response = await fetch(`/api/ab-tests?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTests(data.tests);
      }
    } catch (error) {
      console.error("Failed to fetch tests:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const analyzeTest = async (testId: string) => {
    try {
      const response = await fetch(`/api/ab-tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze" }),
      });
      
      if (response.ok) {
        fetchTests();
      }
    } catch (error) {
      console.error("Failed to analyze test:", error);
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "running":
        return <Play className="h-4 w-4 text-[#F4A300]" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-[#888]" />;
    }
  };
  
  return (
    <div className="min-h-screen bg-[#0D0D0D] p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">A/B Tests</h1>
          <p className="text-[#888] mt-1">Experiment with content strategies</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-2 text-white"
          >
            <option value="">All Tests</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
          </select>
          
          <button
            onClick={fetchTests}
            className="p-2 rounded-lg border border-[#333] text-[#888] hover:text-white hover:border-[#FF4500] transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Tests List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF4500]" />
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-12 bg-[#1A1A1A] border border-[#333] rounded-xl">
          <Beaker className="h-12 w-12 text-[#666] mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No A/B tests yet</h3>
          <p className="text-[#888]">
            Create tests from the Create Content wizard to experiment with different formulas and hooks
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-[#1A1A1A] border border-[#333] rounded-xl p-6"
            >
              {/* Test Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <h3 className="text-white font-semibold">{test.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs bg-[#0D0D0D] text-[#888]">
                    {test.platform}
                  </span>
                  {test.pillar && (
                    <span className="px-3 py-1 rounded-full text-xs bg-[#0D0D0D] text-[#888]">
                      {test.pillar.replace(/_/g, " ")}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs bg-[#FF4500]/20 text-[#FF4500]">
                    Testing: {test.testVariable}
                  </span>
                </div>
              </div>
              
              {/* Variants */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                {(["A", "B", "C"] as const).map((variant) => {
                  const configKey = `variant${variant}Config` as keyof ABTest;
                  const metricsKey = `variant${variant}Metrics` as keyof ABTest;
                  const config = test[configKey] as Record<string, string> | undefined;
                  const metrics = test[metricsKey] as { avgEngagement: number; postCount: number } | undefined;
                  
                  if (!config) return null;
                  
                  const isWinner = test.winningVariant === variant;
                  
                  return (
                    <div
                      key={variant}
                      className={`p-4 rounded-lg border ${
                        isWinner
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-[#0D0D0D] border-[#333]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold ${isWinner ? "text-green-400" : "text-white"}`}>
                          Variant {variant}
                        </span>
                        {isWinner && (
                          <span className="text-xs text-green-400">🏆 Winner</span>
                        )}
                      </div>
                      <div className="text-sm text-[#888] mb-2">
                        {Object.entries(config).map(([key, value]) => (
                          <div key={key}>
                            {key}: <span className="text-white">{value}</span>
                          </div>
                        ))}
                      </div>
                      {metrics && (
                        <div className="text-sm">
                          <span className="text-[#888]">Posts: </span>
                          <span className="text-white">{metrics.postCount}</span>
                          <span className="text-[#888] ml-3">Eng: </span>
                          <span className={isWinner ? "text-green-400" : "text-[#FF4500]"}>
                            {(metrics.avgEngagement * 100).toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Results */}
              {test.status === "completed" && test.winningVariant && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-green-400 font-medium">
                      Variant {test.winningVariant} wins with {test.liftPercentage?.toFixed(1)}% lift
                    </p>
                    <p className="text-sm text-green-300/70">
                      Confidence: {((test.confidenceLevel || 0) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              {test.status === "running" && (
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => analyzeTest(test.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF4500] text-white hover:bg-[#CC3700] transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Analyze Results
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

