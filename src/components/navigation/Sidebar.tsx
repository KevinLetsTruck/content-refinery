"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  ListChecks,
  FolderOpen,
  ShoppingBag,
  Calendar,
  Settings,
  ChevronRight,
  Truck,
  BarChart3,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | "soon";
  isNew?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: "Workflow",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
      {
        label: "Create Content",
        href: "/create",
        icon: <Sparkles className="h-5 w-5" />,
        isNew: true,
      },
      {
        label: "Review Queue",
        href: "/queue",
        icon: <ListChecks className="h-5 w-5" />,
        // Badge will be dynamic
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: <BarChart3 className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        label: "Sources",
        href: "/sources",
        icon: <FolderOpen className="h-5 w-5" />,
      },
      {
        label: "Products",
        href: "/products",
        icon: <ShoppingBag className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Calendar",
        href: "/calendar",
        icon: <Calendar className="h-5 w-5" />,
        badge: "soon",
      },
      {
        label: "Settings",
        href: "/settings",
        icon: <Settings className="h-5 w-5" />,
      },
    ],
  },
];

interface SidebarProps {
  queueCount?: number;
}

export function Sidebar({ queueCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 h-screen bg-[#0A0A0A] border-r border-[#1F1F1F] flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-[#1F1F1F]">
        <Link href="/" className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#FF4500] to-[#CC3700]">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight">
              CONTENT REFINERY
            </h1>
            <p className="text-xs text-[#666666]">Let's Truck</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navigation.map((group) => (
          <div key={group.title} className="mb-6">
            {/* Group Title */}
            <div className="px-6 mb-2">
              <span className="text-[10px] font-semibold text-[#555555] uppercase tracking-wider">
                {group.title}
              </span>
            </div>

            {/* Group Items */}
            <ul className="space-y-1 px-3">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const badge = item.label === "Review Queue" ? queueCount : item.badge;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-150
                        ${active
                          ? "bg-[#FF4500] text-white shadow-lg shadow-[#FF4500]/20"
                          : "text-[#999999] hover:text-white hover:bg-[#1A1A1A]"
                        }
                      `}
                    >
                      <span className={active ? "text-white" : "text-[#666666]"}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>

                      {/* Badges */}
                      {badge === "soon" && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#1A1A1A] text-[#666666] border border-[#333333]">
                          Soon
                        </span>
                      )}
                      {typeof badge === "number" && badge > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-[#FF4500] text-white font-semibold">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                      {item.isNew && !active && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F4A300]/20 text-[#F4A300] font-semibold">
                          NEW
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1F1F1F]">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF4500] to-[#F4A300] flex items-center justify-center">
            <span className="text-white text-sm font-bold">K</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Kevin</p>
            <p className="text-xs text-[#666666]">Admin</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[#666666]" />
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

