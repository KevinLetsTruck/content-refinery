"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Recycle,
  Play,
  Pause,
  Calendar,
  Twitter,
  Facebook,
  Instagram,
  Settings,
  Loader2,
  RefreshCw,
  Star,
  ArrowLeft,
} from "lucide-react";
import { Sidebar } from "@/components/navigation/Sidebar";

interface EvergreenContent {
  id: string;
  title: string | null;
  text: string;
  platform: string;
  evergreenScore: number | null;
  reshareCount: number;
  lastResharedAt: string | null;
  nextReshareDate: string | null;
  isPaused: boolean;
  totalReshares: number;
}

interface EvergreenSettingsData {
  platform: string;
  enabled: boolean;
  minDaysBetween: number;
  maxResharesPerDay: number;
  preferredTimes: string[];
}

const platformIcons: Record<string, React.ElementType> = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
};

export default function EvergreenPage() {
  const [content, setContent] = useState<EvergreenContent[]>([]);
  const [settings, setSettings] = useState<EvergreenSettingsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "paused">("active");

  useEffect(() => {
    fetchEvergreen();
    fetchSettings();
  }, [filter]);

  const fetchEvergreen = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/evergreen?status=${filter}`);
      const data = await res.json();
      setContent(data.evergreen || []);
    } catch (error) {
      console.error("Failed to fetch evergreen content:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/evergreen/settings");
      const data = await res.json();
      setSettings(data.settings || []);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const togglePause = async (id: string, isPaused: boolean) => {
    try {
      await fetch("/api/evergreen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: id,
          action: isPaused ? "resume" : "pause",
        }),
      });
      fetchEvergreen();
    } catch (error) {
      console.error("Failed to toggle pause:", error);
    }
  };

  const updateSettings = async (
    platform: string,
    updates: Partial<EvergreenSettingsData>
  ) => {
    try {
      await fetch("/api/evergreen/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, ...updates }),
      });
      fetchSettings();
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />

      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />

        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                    <Recycle className="w-8 h-8 text-green-400" />
                    Evergreen Content
                  </h1>
                  <p className="text-gray-400 mt-1">
                    Automatically reshare your best-performing content
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchEvergreen}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    showSettings
                      ? "bg-[#FF4500] text-white"
                      : "bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] text-white"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 mb-8">
                <h2 className="font-semibold mb-4 text-white">
                  Reshare Settings by Platform
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {settings.map((setting) => {
                    const Icon = platformIcons[setting.platform] || Recycle;
                    return (
                      <div
                        key={setting.platform}
                        className="bg-[#0D0D0D] rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-white">
                            <Icon className="w-5 h-5" />
                            <span className="font-medium capitalize">
                              {setting.platform}
                            </span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={setting.enabled}
                              onChange={(e) =>
                                updateSettings(setting.platform, {
                                  enabled: e.target.checked,
                                })
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                          </label>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div>
                            <label className="text-gray-400">
                              Days between reshares
                            </label>
                            <input
                              type="number"
                              value={setting.minDaysBetween}
                              onChange={(e) =>
                                updateSettings(setting.platform, {
                                  minDaysBetween: parseInt(e.target.value),
                                })
                              }
                              min={7}
                              max={90}
                              className="w-full mt-1 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400">
                              Max reshares per day
                            </label>
                            <input
                              type="number"
                              value={setting.maxResharesPerDay}
                              onChange={(e) =>
                                updateSettings(setting.platform, {
                                  maxResharesPerDay: parseInt(e.target.value),
                                })
                              }
                              min={1}
                              max={10}
                              className="w-full mt-1 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-white"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-6">
              {(["active", "paused", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg capitalize transition ${
                    filter === f
                      ? "bg-[#FF4500] text-white"
                      : "bg-[#1A1A1A] text-gray-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Content List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF4500]" />
              </div>
            ) : content.length === 0 ? (
              <div className="text-center py-20">
                <Recycle className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-white">
                  No evergreen content
                </h2>
                <p className="text-gray-400 mb-6">
                  Mark your best posts as evergreen to automatically reshare
                  them
                </p>
                <Link
                  href="/queue"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition text-white"
                >
                  Go to Review Queue
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {content.map((item) => {
                  const Icon = platformIcons[item.platform] || Recycle;
                  return (
                    <div
                      key={item.id}
                      className={`bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4 ${
                        item.isPaused ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Platform Icon */}
                        <div className="p-3 bg-[#2A2A2A] rounded-lg">
                          <Icon className="w-5 h-5 text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {item.title && (
                            <p className="font-medium text-white mb-1">
                              {item.title}
                            </p>
                          )}
                          <p className="line-clamp-2 text-gray-300">
                            {item.text}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              Score: {Math.round(item.evergreenScore || 0)}
                            </span>
                            <span className="flex items-center gap-1">
                              <RefreshCw className="w-4 h-4" />
                              {item.totalReshares} reshares
                            </span>
                            {item.nextReshareDate && !item.isPaused && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Next:{" "}
                                {new Date(
                                  item.nextReshareDate
                                ).toLocaleDateString()}
                              </span>
                            )}
                            {item.isPaused && (
                              <span className="text-yellow-500">Paused</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={() => togglePause(item.id, item.isPaused)}
                          className={`p-2 rounded-lg transition ${
                            item.isPaused
                              ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                              : "bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50"
                          }`}
                          title={item.isPaused ? "Resume" : "Pause"}
                        >
                          {item.isPaused ? (
                            <Play className="w-5 h-5" />
                          ) : (
                            <Pause className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}




