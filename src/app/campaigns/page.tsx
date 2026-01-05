"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, 
  Calendar, 
  Play, 
  Pause, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Trash2,
  Megaphone
} from "lucide-react";
import { Sidebar } from "@/components/navigation/Sidebar";

interface Campaign {
  id: string;
  name: string;
  campaignType: string;
  goal: string;
  status: string;
  startDate: string;
  endDate: string;
  totalPosts: number;
  publishedPosts: number;
  totalVideos: number;
  _count: {
    posts: number;
    videos: number;
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ElementType; label: string }> = {
      draft: { color: "bg-gray-600", icon: Clock, label: "Draft" },
      generating: { color: "bg-yellow-600", icon: Clock, label: "Generating..." },
      review: { color: "bg-blue-600", icon: AlertCircle, label: "Review" },
      approved: { color: "bg-purple-600", icon: CheckCircle, label: "Approved" },
      active: { color: "bg-green-600", icon: Play, label: "Active" },
      paused: { color: "bg-orange-600", icon: Pause, label: "Paused" },
      completed: { color: "bg-gray-500", icon: CheckCircle, label: "Completed" },
    };
    
    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    
    try {
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      setCampaigns(campaigns.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Failed to delete campaign:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0D0D0D]">
        <Sidebar />
        <main className="flex-1 ml-64">
          <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />
          <div className="p-8 text-white">
            <div className="max-w-6xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-700 rounded w-48 mb-8"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-800 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />
        
        <div className="p-8 text-white">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Campaigns</h1>
            <p className="text-gray-400 mt-1">Create and manage marketing campaigns</p>
          </div>
          <Link
            href="/campaigns/create"
            className="flex items-center gap-2 px-4 py-2 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            New Campaign
          </Link>
        </div>

        {/* Campaign List */}
        {campaigns.length === 0 ? (
          <div className="text-center py-16 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
            <Megaphone className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No campaigns yet</h2>
            <p className="text-gray-400 mb-6">
              Create your first campaign to start automating your content
            </p>
            <Link
              href="/campaigns/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF4500] hover:bg-[#FF5722] rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-6 hover:border-[#3A3A3A] transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="text-xl font-semibold hover:text-[#FF4500] transition"
                      >
                        {campaign.name}
                      </Link>
                      {getStatusBadge(campaign.status)}
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      <span className="capitalize">
                        {campaign.campaignType.replace("_", " ")}
                      </span>
                      <span>Goal: {campaign.goal.replace("_", " ")}</span>
                      <span>
                        {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {campaign.status === "active" && campaign.totalPosts > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-[#F4A300]">
                            {campaign.publishedPosts} / {campaign.totalPosts} posts
                          </span>
                        </div>
                        <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#FF4500] transition-all"
                            style={{
                              width: `${(campaign.publishedPosts / campaign.totalPosts) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/campaigns/${campaign.id}/calendar`}
                      className="p-2 hover:bg-[#2A2A2A] rounded transition"
                      title="View Calendar"
                    >
                      <Calendar className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="p-2 hover:bg-red-900/50 rounded transition text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}

