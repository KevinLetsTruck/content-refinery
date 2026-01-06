"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, ChevronRight, Twitter, Facebook, Instagram } from "lucide-react";

interface CalendarStats {
  today: number;
  thisWeek: number;
  pending: number;
  publishedThisWeek: number;
  byPlatform: Record<string, number>;
}

export default function CalendarWidget() {
  const [stats, setStats] = useState<CalendarStats | null>(null);

  useEffect(() => {
    fetch("/api/calendar/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2 text-white">
          <Calendar className="w-5 h-5 text-[#FF4500]" />
          Content Calendar
        </h3>
        <Link
          href="/calendar"
          className="text-sm text-[#FF4500] hover:underline flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#0D0D0D] rounded-lg p-3">
          <div className="text-2xl font-bold text-white">{stats.today}</div>
          <div className="text-sm text-gray-400">Today</div>
        </div>
        <div className="bg-[#0D0D0D] rounded-lg p-3">
          <div className="text-2xl font-bold text-white">{stats.thisWeek}</div>
          <div className="text-sm text-gray-400">This Week</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">{stats.pending} pending</span>
        <span className="text-green-400">{stats.publishedThisWeek} published</span>
      </div>

      {Object.keys(stats.byPlatform).length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <div className="flex items-center gap-4 text-sm">
            {stats.byPlatform.twitter && (
              <div className="flex items-center gap-1 text-white">
                <Twitter className="w-4 h-4 text-blue-400" />
                <span>{stats.byPlatform.twitter}</span>
              </div>
            )}
            {stats.byPlatform.facebook && (
              <div className="flex items-center gap-1 text-white">
                <Facebook className="w-4 h-4 text-blue-600" />
                <span>{stats.byPlatform.facebook}</span>
              </div>
            )}
            {stats.byPlatform.instagram && (
              <div className="flex items-center gap-1 text-white">
                <Instagram className="w-4 h-4 text-pink-500" />
                <span>{stats.byPlatform.instagram}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



