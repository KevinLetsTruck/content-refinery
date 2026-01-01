import Link from "next/link";
import { 
  Upload, 
  ListTodo, 
  Calendar, 
  BarChart3, 
  Settings,
  Mic,
  FileText,
  ShoppingBag
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="p-6">
          <h1 className="text-xl font-bold text-primary">Content Refinery</h1>
          <p className="text-sm text-muted-foreground">Let's Truck</p>
        </div>
        
        <nav className="px-4 space-y-2">
          <NavItem href="/ingest" icon={<Upload className="h-4 w-4" />} label="Ingest Content" />
          <NavItem href="/extract" icon={<Mic className="h-4 w-4" />} label="Extract" />
          <NavItem href="/generate" icon={<FileText className="h-4 w-4" />} label="Generate" />
          <NavItem href="/queue" icon={<ListTodo className="h-4 w-4" />} label="Review Queue" badge="12" />
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
              value="12" 
              subtitle="Content pieces"
              trend="+3 today"
            />
            <StatCard 
              title="Scheduled" 
              value="47" 
              subtitle="Posts this week"
              trend="89% coverage"
            />
            <StatCard 
              title="Published" 
              value="234" 
              subtitle="This month"
              trend="+156% vs last month"
            />
            <StatCard 
              title="Engagement" 
              value="89K" 
              subtitle="Total interactions"
              trend="+198% vs last month"
            />
          </div>

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
              description="12 items waiting for review"
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
              <ActivityItem 
                title="TBB Episode 2847 processed"
                subtitle="42 content pieces extracted"
                time="2 hours ago"
              />
              <ActivityItem 
                title="15 posts published to Twitter"
                subtitle="Average 2.3K impressions"
                time="4 hours ago"
              />
              <ActivityItem 
                title="Destination Health uploaded"
                subtitle="Transcription in progress"
                time="6 hours ago"
              />
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
