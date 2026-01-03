import Link from "next/link";
import { 
  Upload, 
  ListTodo, 
  Calendar, 
  BarChart3, 
  Settings,
  Mic,
  FileText,
  ShoppingBag,
  Sparkles,
  Truck,
  Zap
} from "lucide-react";
import prisma from "@/lib/db/prisma";

// Fetch real data from the database
async function getDashboardData() {
  const [
    pendingReviewCount,
    totalSources,
    totalContent,
    recentSources
  ] = await Promise.all([
    prisma.generatedContent.count({ where: { status: "pending" } }),
    prisma.source.count(),
    prisma.generatedContent.count(),
    prisma.source.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: {
          select: { extractions: true }
        }
      }
    })
  ]);

  return {
    pendingReviewCount,
    totalSources,
    totalContent,
    recentSources
  };
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export default async function HomePage() {
  const { pendingReviewCount, totalSources, totalContent, recentSources } = await getDashboardData();

  return (
    <div className="flex h-screen bg-[#0D0D0D]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#333333] bg-[#0D0D0D]">
        <div className="p-6 border-b border-[#333333]">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-[#FF4500]" />
            <h1 className="text-xl font-display text-gradient-orange">CONTENT REFINERY</h1>
          </div>
          <p className="text-sm text-[#888888] mt-1">Let&apos;s Truck</p>
        </div>
        
        <nav className="px-4 py-4 space-y-1">
          <NavItem href="/create" icon={<Sparkles className="h-4 w-4" />} label="Create Content" primary />
          <div className="h-px bg-[#333333] my-3" />
          <NavItem href="/ingest" icon={<Upload className="h-4 w-4" />} label="Ingest Content" />
          <NavItem href="/extract" icon={<Mic className="h-4 w-4" />} label="Extract" />
          <NavItem href="/generate" icon={<FileText className="h-4 w-4" />} label="Generate" />
          <NavItem href="/queue" icon={<ListTodo className="h-4 w-4" />} label="Review Queue" badge={pendingReviewCount > 0 ? String(pendingReviewCount) : undefined} />
          <NavItem href="/calendar" icon={<Calendar className="h-4 w-4" />} label="Calendar" />
          <NavItem href="/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Analytics" />
          <NavItem href="/products" icon={<ShoppingBag className="h-4 w-4" />} label="Products" />
          <NavItem href="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#0D0D0D]">
        {/* Orange accent line */}
        <div className="h-1 bg-gradient-to-r from-[#FF4500] to-[#F4A300]" />
        
        <div className="p-8">
          <h2 className="text-3xl font-display text-white mb-2">DASHBOARD</h2>
          <p className="text-[#888888] mb-8">
            Transform your content into gold for The Tribe
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Pending Review" 
              value={String(pendingReviewCount)} 
              subtitle="Content pieces"
              trend={pendingReviewCount > 0 ? "Ready for review" : "All caught up!"}
              highlight={pendingReviewCount > 0}
            />
            <StatCard 
              title="Sources" 
              value={String(totalSources)} 
              subtitle="Episodes uploaded"
              trend={totalSources > 0 ? "Processing" : "Upload your first!"}
            />
            <StatCard 
              title="Content Generated" 
              value={String(totalContent)} 
              subtitle="Total pieces"
              trend={totalContent > 0 ? "AI-generated" : "Start generating"}
            />
            <StatCard 
              title="Ready to Publish" 
              value="0" 
              subtitle="Approved posts"
              trend="Coming soon"
            />
          </div>

          {/* Hero Action - Create Content */}
          <Link 
            href="/create"
            className="block bg-gradient-to-r from-[#FF4500]/20 to-[#FF4500]/5 border-2 border-[#FF4500]/40 rounded-lg p-6 mb-8 hover:border-[#FF4500] hover:border-glow-orange transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#FF4500]/20 group-hover:bg-[#FF4500]/30 transition-colors">
                <Zap className="h-8 w-8 text-[#FF4500]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">Create Content</h3>
                <p className="text-[#888888]">AI-guided wizard to create social media posts from ideas, guides, or products</p>
              </div>
              <div className="text-[#FF4500] font-semibold group-hover:translate-x-1 transition-transform">
                Start Creating →
              </div>
            </div>
          </Link>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <QuickAction 
              href="/ingest"
              icon={<Upload className="h-8 w-8" />}
              title="Upload Episode"
              description="Upload audio for transcription and extraction"
            />
            <QuickAction 
              href="/queue"
              icon={<ListTodo className="h-8 w-8" />}
              title="Review Queue"
              description={pendingReviewCount > 0 ? `${pendingReviewCount} items waiting for review` : "No items to review"}
              badge={pendingReviewCount > 0 ? String(pendingReviewCount) : undefined}
            />
            <QuickAction 
              href="/generate"
              icon={<FileText className="h-8 w-8" />}
              title="Generate Content"
              description="Create content from guides and products"
            />
          </div>

          {/* Recent Activity */}
          <div className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentSources.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center">
                    <Mic className="w-8 h-8 text-[#888888]" />
                  </div>
                  <p className="text-[#888888] mb-4">No activity yet. Upload your first episode to get started!</p>
                  <Link 
                    href="/ingest"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF4500] to-[#CC3700] hover:from-[#FF6633] hover:to-[#FF4500] text-white px-4 py-2 rounded font-semibold transition-all"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Episode
                  </Link>
                </div>
              ) : (
                recentSources.map((source) => (
                  <ActivityItem 
                    key={source.id}
                    title={source.title}
                    subtitle={`${source._count.extractions} extractions • ${source.status}`}
                    time={formatTimeAgo(source.createdAt)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ 
  href, 
  icon, 
  label, 
  badge,
  primary = false
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string;
  badge?: string;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <Link 
        href={href}
        className="flex items-center gap-3 px-3 py-2 rounded bg-gradient-to-r from-[#FF4500] to-[#CC3700] text-white font-semibold hover:from-[#FF6633] hover:to-[#FF4500] transition-all"
      >
        {icon}
        <span className="flex-1">{label}</span>
      </Link>
    );
  }
  
  return (
    <Link 
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded text-[#888888] hover:text-white hover:bg-[#1A1A1A] transition-colors"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="bg-[#FF4500] text-white text-xs px-2 py-0.5 rounded-full font-medium">
          {badge}
        </span>
      )}
    </Link>
  );
}

function StatCard({ 
  title, 
  value, 
  subtitle,
  trend,
  highlight = false
}: { 
  title: string; 
  value: string; 
  subtitle: string;
  trend: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-[#1A1A1A] rounded-lg border p-6 ${highlight ? 'border-[#FF4500]/50' : 'border-[#333333]'} hover:border-[#444444] transition-colors`}>
      <p className="text-sm text-[#888888]">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${highlight ? 'text-[#FF4500]' : 'text-white'}`}>{value}</p>
      <p className="text-sm text-[#888888]">{subtitle}</p>
      <p className="text-xs text-[#F4A300] mt-2">{trend}</p>
    </div>
  );
}

function QuickAction({ 
  href, 
  icon, 
  title, 
  description,
  badge
}: { 
  href: string; 
  icon: React.ReactNode; 
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link 
      href={href}
      className="bg-[#1A1A1A] rounded-lg border border-[#333333] p-6 hover:border-[#FF4500] transition-colors group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-[#888888] group-hover:text-[#FF4500] transition-colors">
          {icon}
        </div>
        {badge && (
          <span className="bg-[#FF4500] text-white text-xs px-2 py-0.5 rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-[#888888]">{description}</p>
    </Link>
  );
}

function ActivityItem({ 
  title, 
  subtitle, 
  time 
}: { 
  title: string; 
  subtitle: string;
  time: string;
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-[#333333] last:border-0">
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-[#888888]">{subtitle}</p>
      </div>
      <p className="text-xs text-[#888888]">{time}</p>
    </div>
  );
}
