// app/(dashboard)/components/navbar.tsx
'use client';

import { usePathname } from 'next/navigation';
import { motion, useScroll } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/actions/auth';
import { UserInfo } from '@/lib/types/auth';

interface NavbarProps {
  user: UserInfo;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setHasScrolled(latest > 0);
    });
  }, [scrollY]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Good night';
  };

  // Show navbar only on the main dashboard page
  if (pathname !== '/dashboard') return null;

  return (
    <motion.nav
      className="sticky top-0 left-0 right-0 z-50 px-6 h-16 flex items-center justify-between"
      animate={{
        backgroundColor: hasScrolled ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0)',
        borderBottom: hasScrolled ? '1px solid #e5e7eb' : '1px solid rgba(229, 231, 235, 0)',
      }}
      initial={{
        backgroundColor: 'rgba(255, 255, 255, 0)',
        borderBottom: '1px solid rgba(229, 231, 235, 0)',
      }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1], // custom ease-out curve
      }}
    >
      <motion.div 
        className="text-lg font-medium"
        animate={{
          color: hasScrolled ? '#1a1a1a' : '#000000',
        }}
        transition={{ duration: 0.3 }}
      >
        {getGreeting()}, <span className="text-primary">{user.username}</span>
      </motion.div>

      <form action={logout}>
        <button
          type="submit"
          className="px-6 py-2 rounded-2xl bg-[#F4F4F4] text-gray-500 
                   hover:bg-red-500 hover:text-white hover:border-red-500 
                   transition-colors duration-200 flex items-center gap-2 font-medium"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </form>
    </motion.nav>
  );
}