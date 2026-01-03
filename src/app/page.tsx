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
  Sparkles
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
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="p-6">
          <h1 className="text-xl font-bold text-primary">Content Refinery</h1>
          <p className="text-sm text-muted-foreground">Let&apos;s Truck</p>
        </div>
        
        <nav className="px-4 space-y-2">
          <NavItem href="/create" icon={<Sparkles className="h-4 w-4" />} label="✨ Create Content" />
          <div className="h-px bg-border my-2" />
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
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground mb-8">
            Transform your podcasts into social media content
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Pending Review" 
              value={String(pendingReviewCount)} 
              subtitle="Content pieces"
              trend={pendingReviewCount > 0 ? "Ready for review" : "All caught up!"}
            />
            <StatCard 
              title="Sources" 
              value={String(totalSources)} 
              subtitle="Podcasts uploaded"
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
            className="block bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 rounded-xl p-6 mb-8 hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">Create Content</h3>
                <p className="text-muted-foreground">AI-guided wizard to create social media posts from ideas, guides, or products</p>
              </div>
              <div className="text-primary font-medium">
                Start Creating →
              </div>
            </div>
          </Link>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <QuickAction 
              href="/ingest"
              icon={<Upload className="h-8 w-8" />}
              title="Upload Podcast"
              description="Upload audio for transcription and extraction"
            />
            <QuickAction 
              href="/queue"
              icon={<ListTodo className="h-8 w-8" />}
              title="Review Queue"
              description={pendingReviewCount > 0 ? `${pendingReviewCount} items waiting for review` : "No items to review"}
            />
            <QuickAction 
              href="/generate"
              icon={<FileText className="h-8 w-8" />}
              title="Generate Content"
              description="Create content from guides and products"
            />
          </div>

          {/* Recent Activity */}
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentSources.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">
                  No activity yet. Upload your first podcast to get started!
                </p>
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
  badge 
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string;
  badge?: string;
}) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
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
  trend 
}: { 
  title: string; 
  value: string; 
  subtitle: string;
  trend: string;
}) {
  return (
    <div className="bg-card rounded-lg border p-6">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <p className="text-xs text-green-600 mt-2">{trend}</p>
    </div>
  );
}

function QuickAction({ 
  href, 
  icon, 
  title, 
  description 
}: { 
  href: string; 
  icon: React.ReactNode; 
  title: string;
  description: string;
}) {
  return (
    <Link 
      href={href}
      className="bg-card rounded-lg border p-6 hover:border-primary transition-colors group"
    >
      <div className="text-muted-foreground group-hover:text-primary transition-colors mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
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
    <div className="flex items-start justify-between py-2 border-b last:border-0">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <p className="text-xs text-muted-foreground">{time}</p>
    </div>
  );
}
