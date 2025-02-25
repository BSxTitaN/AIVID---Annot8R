"use client";

import { UserInfo } from "@/lib/types/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideShieldAlert, Users2, ScrollText, Folder } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";

interface AdminNavbarProps {
  user: UserInfo;
}

export function AdminNavbar({ user }: AdminNavbarProps) {
  const pathname = usePathname();
  const isSuperAdmin = user.isSuperAdmin;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    return "Good night";
  };

  const navItems = [
    {
      name: "Logs",
      href: "/admin",
      icon: ScrollText,
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: Users2,
    },
    {
      name: "Projects",
      href: "/admin/projects",
      icon: Folder,
    },
    ...(isSuperAdmin
      ? [
          {
            name: "Admins",
            href: "/admin/admins",
            icon: LucideShieldAlert,
          },
        ]
      : []),
  ];

  console.log(user);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/75 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Greeting */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium">
            {getGreeting()}, <span className="text-primary">{user.username}</span>
          </span>
        </div>

        {/* Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navItems.map((item) => (
              <NavigationMenuItem key={item.name}>
                <Link href={item.href} legacyBehavior passHref>
                  <NavigationMenuLink
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "h-9 px-4 py-2",
                      pathname === item.href
                        ? "bg-accent text-accent-foreground"
                        : ""
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Logout */}
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            suppressHydrationWarning={true}
            className="px-4 text-gray-500 hover:text-gray-900"
          >
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}