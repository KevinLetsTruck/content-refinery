"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  X,
  MessageSquare,
  Zap,
  BarChart3,
  Layout,
  Video,
  Mail,
  FileText,
} from "lucide-react";
import { LANDING_PAGE_TEMPLATES } from "@/lib/landing-pages/templates";

interface ExtractedData {
  title?: string;
  subtitle?: string;
  summary?: string;
  keyMessages?: string[];
  stats?: string[];
  hooks?: string[];
  chapters?: string[];
}

interface Props {
  leadMagnet: { id: string; title: string };
  extractedData: ExtractedData;
  template: string;
  onUpdate: (data: { name: string; keyMessages: string[]; hooks: string[] }) => void;
}

export default function Step3Review({
  leadMagnet,
  extractedData,
  template,
  onUpdate,
}: Props) {
  // Local state for editable fields
  const [campaignName, setCampaignName] = useState(
    `${leadMagnet.title} Campaign`
  );
  const [keyMessages, setKeyMessages] = useState<string[]>(
    extractedData.keyMessages || []
  );
  const [hooks, setHooks] = useState<string[]>(extractedData.hooks || []);
  const [newHook, setNewHook] = useState("");

  // Get template config
  const templateConfig = LANDING_PAGE_TEMPLATES[template];

  // Call onUpdate whenever state changes
  useEffect(() => {
    onUpdate({
      name: campaignName,
      keyMessages,
      hooks,
    });
  }, [campaignName, keyMessages, hooks, onUpdate]);

  // Key messages handlers
  const updateKeyMessage = (index: number, value: string) => {
    const updated = [...keyMessages];
    updated[index] = value;
    setKeyMessages(updated);
  };

  const addKeyMessage = () => {
    setKeyMessages([...keyMessages, ""]);
  };

  const removeKeyMessage = (index: number) => {
    setKeyMessages(keyMessages.filter((_, i) => i !== index));
  };

  // Hooks handlers
  const addHook = () => {
    if (newHook.trim()) {
      setHooks([...hooks, newHook.trim()]);
      setNewHook("");
    }
  };

  const removeHook = (index: number) => {
    setHooks(hooks.filter((_, i) => i !== index));
  };

  // Calculate AI generation stats
  const socialPostCount = keyMessages.filter((m) => m.trim()).length * 3;
  const shortsCount = Math.min(keyMessages.filter((m) => m.trim()).length, 5);

  // Get top 3 stats
  const topStats = (extractedData.stats || []).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Campaign Name
        </label>
        <input
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FF4500] transition-colors"
          placeholder="Enter campaign name..."
        />
      </div>

      {/* AI Summary */}
      {extractedData.summary && (
        <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[#FF4500]" />
            <h3 className="font-semibold text-white">AI Summary</h3>
          </div>
          <p className="text-gray-300 leading-relaxed">{extractedData.summary}</p>
        </div>
      )}

      {/* Editable Key Messages */}
      <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#FF4500]" />
            <h3 className="font-semibold text-white">Key Messages</h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-[#2A2A2A] text-gray-400">
              {keyMessages.filter((m) => m.trim()).length} messages
            </span>
          </div>
          <button
            onClick={addKeyMessage}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          These messages will be used to generate social media posts. Edit or add more.
        </p>

        <div className="space-y-3">
          {keyMessages.map((message, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => updateKeyMessage(index, e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#FF4500] text-sm transition-colors"
                placeholder="Enter a key message..."
              />
              <button
                onClick={() => removeKeyMessage(index)}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {keyMessages.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No key messages yet. Add some to generate content.</p>
          </div>
        )}
      </div>

      {/* Editable Hooks */}
      <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#FF4500]" />
          <h3 className="font-semibold text-white">Attention Hooks</h3>
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#2A2A2A] text-gray-400">
            {hooks.length} hooks
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Compelling headlines and phrases to grab attention.
        </p>

        {/* Hook Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {hooks.map((hook, index) => (
            <span
              key={index}
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#FF4500]/20 to-[#FF6B00]/20 border border-[#FF4500]/30 rounded-full text-sm text-white"
            >
              {hook}
              <button
                onClick={() => removeHook(index)}
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>

        {/* Add Hook Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newHook}
            onChange={(e) => setNewHook(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addHook();
              }
            }}
            className="flex-1 px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#FF4500] text-sm transition-colors"
            placeholder="Add a new hook..."
          />
          <button
            onClick={addHook}
            disabled={!newHook.trim()}
            className="px-4 py-2 bg-[#FF4500] hover:bg-[#FF4500]/90 disabled:bg-[#2A2A2A] disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Stats Preview (Read-only) */}
      {topStats.length > 0 && (
        <div className="p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#FF4500]" />
            <h3 className="font-semibold text-white">Key Statistics</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topStats.map((stat, index) => {
              // Try to extract number from stat
              const numberMatch = stat.match(/(\d+[\d,\.]*%?)/);
              const number = numberMatch ? numberMatch[1] : null;
              const description = number
                ? stat.replace(number, "").trim()
                : stat;

              const gradients = [
                "from-[#FF4500] to-[#FF6B00]",
                "from-[#3B82F6] to-[#60A5FA]",
                "from-[#10B981] to-[#34D399]",
              ];

              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl bg-gradient-to-br ${gradients[index % 3]} bg-opacity-10`}
                  style={{
                    background: `linear-gradient(135deg, ${
                      index === 0
                        ? "rgba(255,69,0,0.15)"
                        : index === 1
                        ? "rgba(59,130,246,0.15)"
                        : "rgba(16,185,129,0.15)"
                    } 0%, rgba(13,13,13,0.8) 100%)`,
                  }}
                >
                  {number && (
                    <p
                      className={`text-2xl font-bold mb-1 ${
                        index === 0
                          ? "text-[#FF4500]"
                          : index === 1
                          ? "text-blue-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {number}
                    </p>
                  )}
                  <p className="text-sm text-gray-300 leading-snug">
                    {description || stat}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* What AI Will Create Summary */}
      <div className="p-5 bg-gradient-to-br from-[#FF4500]/10 to-transparent border border-[#FF4500]/30 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#FF4500]" />
          <h3 className="font-semibold text-white">What AI Will Create</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Landing Page */}
          <div className="p-3 bg-[#0D0D0D]/50 rounded-lg text-center">
            <Layout className="w-6 h-6 text-[#FF4500] mx-auto mb-2" />
            <p className="text-lg font-bold text-white">1</p>
            <p className="text-xs text-gray-400">
              {templateConfig?.name || "Landing Page"}
            </p>
          </div>

          {/* Social Posts */}
          <div className="p-3 bg-[#0D0D0D]/50 rounded-lg text-center">
            <FileText className="w-6 h-6 text-[#FF4500] mx-auto mb-2" />
            <p className="text-lg font-bold text-white">{socialPostCount}</p>
            <p className="text-xs text-gray-400">Social Posts</p>
          </div>

          {/* YouTube Shorts */}
          <div className="p-3 bg-[#0D0D0D]/50 rounded-lg text-center">
            <Video className="w-6 h-6 text-[#FF4500] mx-auto mb-2" />
            <p className="text-lg font-bold text-white">{shortsCount}</p>
            <p className="text-xs text-gray-400">Video Scripts</p>
          </div>

          {/* Email Sequence */}
          <div className="p-3 bg-[#0D0D0D]/50 rounded-lg text-center">
            <Mail className="w-6 h-6 text-[#FF4500] mx-auto mb-2" />
            <p className="text-lg font-bold text-white">5</p>
            <p className="text-xs text-gray-400">Email Sequence</p>
          </div>
        </div>

        <p className="text-sm text-gray-400 mt-4 text-center">
          Content will be generated based on{" "}
          <span className="text-white font-medium">
            {keyMessages.filter((m) => m.trim()).length} key messages
          </span>{" "}
          and{" "}
          <span className="text-white font-medium">{hooks.length} hooks</span>
        </p>
      </div>
    </div>
  );
}
