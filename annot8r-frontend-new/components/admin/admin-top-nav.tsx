// components/admin/admin-top-nav.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clientLogout } from "@/lib/api/auth";
import { AuthUser } from "@/lib/types";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Menu, LogOut, User, Settings, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdminTopNavProps {
  user: AuthUser;
}

export function AdminTopNav({ user }: AdminTopNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await clientLogout();
      // No need for router.push here as clientLogout will handle the redirect
    } catch (error) {
      console.error("Logout failed:", error);
      // Show error message to the user
      toast.error("Logout failed. Please try again.");
    }
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and Brand - Left Side */}
        <div className="flex items-center">
          <Link href="/admin" className="flex items-center space-x-2">
            <div className="relative h-8 w-8">
              <Image 
                src="/image.png" 
                alt="Annot8R Logo" 
                fill 
                className="object-contain"
              />
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">
              Annot8R Admin
            </span>
          </Link>
        </div>

        {/* Desktop Navigation - Center */}
        <NavigationMenu className="hidden md:flex mx-6 flex-1 justify-center">
          <NavigationMenuList className="gap-1">
            <NavigationMenuItem>
              <Link href="/admin" legacyBehavior passHref>
                <NavigationMenuLink 
                  className={cn(
                    navigationMenuTriggerStyle(),
                    pathname === "/admin" && "bg-accent text-accent-foreground"
                  )}
                >
                  Dashboard
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/admin/projects" legacyBehavior passHref>
                <NavigationMenuLink 
                  className={cn(
                    navigationMenuTriggerStyle(),
                    pathname.startsWith("/admin/projects") && "bg-accent text-accent-foreground"
                  )}
                >
                  Projects
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/admin/users" legacyBehavior passHref>
                <NavigationMenuLink 
                  className={cn(
                    navigationMenuTriggerStyle(),
                    pathname === "/admin/users" && "bg-accent text-accent-foreground"
                  )}
                >
                  Users
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/admin/admins" legacyBehavior passHref>
                <NavigationMenuLink 
                  className={cn(
                    navigationMenuTriggerStyle(),
                    pathname === "/admin/admins" && "bg-accent text-accent-foreground"
                  )}
                >
                  Admins
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/admin/logs" legacyBehavior passHref>
                <NavigationMenuLink 
                  className={cn(
                    navigationMenuTriggerStyle(),
                    pathname === "/admin/logs" && "bg-accent text-accent-foreground"
                  )}
                >
                  Activity Logs
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile Navigation - Hamburger Menu */}
        <div className="flex items-center gap-2">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader className="mb-4">
                <SheetTitle>Annot8R Admin</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4">
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md transition-colors",
                    pathname === "/admin" 
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/admin/projects"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md transition-colors",
                    pathname.startsWith("/admin/projects") 
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Settings className="h-5 w-5" />
                  <span>Projects</span>
                </Link>
                <Link
                  href="/admin/users"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md transition-colors",
                    pathname === "/admin/users" 
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <User className="h-5 w-5" />
                  <span>Users</span>
                </Link>
                <Link
                  href="/admin/admins"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md transition-colors",
                    pathname === "/admin/admins" 
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <User className="h-5 w-5" />
                  <span>Admins</span>
                </Link>
                <Link
                  href="/admin/logs"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md transition-colors",
                    pathname === "/admin/logs" 
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Settings className="h-5 w-5" />
                  <span>Activity Logs</span>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          {/* User Menu - Right Side */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline-block max-w-[100px] truncate">
                  {user.firstName} {user.lastName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
