"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Grid3X3, Home, Image, LayoutDashboard, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useState } from "react";

interface DashboardNavProps {
  projectId?: string;
}

export function DashboardNav({ projectId }: DashboardNavProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
  ];

  if (projectId) {
    routes.push(
      {
        href: `/dashboard/projects/${projectId}?tab=images`,
        label: "Images",
        icon: Image,
        active:
          pathname === `/dashboard/projects/${projectId}` &&
          (!pathname.includes("tab=") || pathname.includes("tab=images")),
      },
      {
        href: `/dashboard/projects/${projectId}?tab=submissions`,
        label: "Submissions",
        icon: Grid3X3,
        active:
          pathname === `/dashboard/projects/${projectId}` &&
          pathname.includes("tab=submissions"),
      }
    );
  }

  return (
    <nav className="sticky top-0 z-10 bg-background border-b">
      <div className="container mx-auto px-4 py-2">
        {/* Desktop navigation */}
        <div className="hidden md:flex items-center justify-between w-full">
          <div className="flex gap-2 items-center">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-8 gap-1"
              )}
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  buttonVariants({
                    variant: route.active ? "default" : "ghost",
                    size: "sm",
                  }),
                  "h-8 gap-1"
                )}
              >
                <route.icon className="h-4 w-4" />
                <span>{route.label}</span>
              </Link>
            ))}
          </div>
          <button
            onClick={logout}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 gap-1"
            )}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
        
        {/* Mobile navigation */}
        <div className="md:hidden flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            <span className="font-semibold">Annot8r</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 py-2 space-y-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md",
                  route.active 
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <route.icon className="h-4 w-4" />
                <span>{route.label}</span>
              </Link>
            ))}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 w-full text-left rounded-md hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}