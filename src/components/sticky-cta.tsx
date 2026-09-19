'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function StickyCta() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 500px down (past the hero)
      if (window.scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 sm:bottom-8 sm:right-8 transition-all duration-500 transform ${
        isVisible ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
      }`}
    >
      <Link
        href="/pricing"
        className="flex items-center gap-2 rounded-full bg-brand px-6 py-4 font-display font-semibold text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-brand-deep hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <span className="text-[15px] sm:text-[16px] tracking-wide">আনলক সেকেন্ড ব্রেইন 🧠</span>
      </Link>
    </div>
  );
}
