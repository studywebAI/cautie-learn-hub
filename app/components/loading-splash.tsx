'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LoadingSplash({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Try to load cached data immediately
    const cached = localStorage.getItem('studyweb-cached-dashboard');
    
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Slower progression for visual effect
        return p + (100 - p) * 0.15;
      });
    }, 100);

    // Start background data loading
    Promise.all([
      fetch('/api/dashboard').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/classes').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/assignments').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([dashboard, classes, assignments]) => {
      // Cache fresh data
      if (dashboard) {
        localStorage.setItem('studyweb-cached-dashboard', JSON.stringify(dashboard));
      }
      // Small delay for splash effect
      setTimeout(() => setIsLoading(false), 800);
    }).catch(() => {
      setIsLoading(false);
    });

    return () => clearInterval(interval);
  }, []);

  if (!isLoading) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center">
      {/* Got-style logo animation */}
      <div className="relative">
        {/* Outer ring */}
        <div className="w-32 h-32 rounded-full border-4 border-primary/20 animate-pulse" />
        
        {/* Middle ring */}
        <div className="absolute inset-2 w-28 h-28 rounded-full border-4 border-primary/40 animate-pulse" style={{ animationDelay: '0.2s' }} />
        
        {/* Inner glow */}
        <div className="absolute inset-4 w-24 h-24 rounded-full bg-primary/10 animate-pulse" style={{ animationDelay: '0.4s' }} />
        
        {/* Logo text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-primary tracking-widest">C</span>
        </div>
      </div>
      
      {/* Loading text */}
      <p className="mt-8 text-muted-foreground text-sm tracking-widest animate-pulse">
        LOADING
      </p>
      
      {/* Progress bar */}
      <div className="mt-4 w-48 h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
