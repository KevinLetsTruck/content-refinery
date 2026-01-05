"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Link as LinkIcon,
  MousePointer,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Twitter,
  Facebook,
  Instagram,
  ArrowUpRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Sidebar } from "@/components/navigation/Sidebar";

interface AttributionData {
  id: string;
  title: string | null;
  text: string;
  platform: string;
  publishedAt: string | null;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: string;
  revenuePerClick: string;
}

const platformIcons: Record<string, React.ElementType> = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
};

export default function AttributionPage() {
  const [data, setData] = useState<AttributionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30"); // days

  useEffect(() => {
    fetchAttribution();
  }, [dateRange]);

  const fetchAttribution = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics/attribution?days=${dateRange}`);
      const result = await res.json();
      setData(result.data || []);
    } catch (error) {
      console.error("Failed to fetch attribution:", error);
    } finally {
      setLoading(false);
    }
  };

  const totals = data.reduce(
    (acc, item) => ({
      clicks: acc.clicks + item.totalClicks,
      conversions: acc.conversions + item.totalConversions,
      revenue: acc.revenue + item.totalRevenue,
    }),
    { clicks: 0, conversions: 0, revenue: 0 }
  );

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      <Sidebar />

      <main className="flex-1 ml-64">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Link
                  href="/analytics"
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                    <TrendingUp className="w-8 h-8 text-green-400" />
                    Content Attribution
                  </h1>
                  <p className="text-gray-400 mt-1">
                    Track which content drives clicks and sales
                  </p>
                </div>
              </div>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <MousePointer className="w-4 h-4" />
                  Total Clicks
                </div>
                <div className="text-3xl font-bold text-white">
                  {totals.clicks.toLocaleString()}
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <ShoppingCart className="w-4 h-4" />
                  Conversions
                </div>
                <div className="text-3xl font-bold text-white">
                  {totals.conversions}
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <DollarSign className="w-4 h-4" />
                  Revenue
                </div>
                <div className="text-3xl font-bold text-green-400">
                  ${totals.revenue.toFixed(2)}
                </div>
              </div>

              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <ArrowUpRight className="w-4 h-4" />
                  Conversion Rate
                </div>
                <div className="text-3xl font-bold text-white">
                  {totals.clicks > 0
                    ? ((totals.conversions / totals.clicks) * 100).toFixed(1)
                    : 0}
                  %
                </div>
              </div>
            </div>

            {/* Content Table */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FF4500]" />
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2A2A2A]">
                      <th className="text-left p-4 text-gray-400 font-medium">
                        Content
                      </th>
                      <th className="text-left p-4 text-gray-400 font-medium">
                        Platform
                      </th>
                      <th className="text-right p-4 text-gray-400 font-medium">
                        Clicks
                      </th>
                      <th className="text-right p-4 text-gray-400 font-medium">
                        Conversions
                      </th>
                      <th className="text-right p-4 text-gray-400 font-medium">
                        Revenue
                      </th>
                      <th className="text-right p-4 text-gray-400 font-medium">
                        Conv. Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item) => {
                      const Icon = platformIcons[item.platform] || LinkIcon;
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-[#2A2A2A] hover:bg-[#2A2A2A]/50"
                        >
                          <td className="p-4">
                            <div className="max-w-md">
                              <p className="font-medium truncate text-white">
                                {item.title || item.text.substring(0, 50)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {item.publishedAt
                                  ? new Date(item.publishedAt).toLocaleDateString()
                                  : "Not published"}
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-white">
                              <Icon className="w-4 h-4" />
                              <span className="capitalize">{item.platform}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right text-white">
                            {item.totalClicks.toLocaleString()}
                          </td>
                          <td className="p-4 text-right text-white">
                            {item.totalConversions}
                          </td>
                          <td className="p-4 text-right text-green-400">
                            ${item.totalRevenue.toFixed(2)}
                          </td>
                          <td className="p-4 text-right text-white">
                            {item.conversionRate}%
                          </td>
                        </tr>
                      );
                    })}

                    {data.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-gray-400"
                        >
                          No attribution data yet. Create tracked links to start
                          measuring.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

