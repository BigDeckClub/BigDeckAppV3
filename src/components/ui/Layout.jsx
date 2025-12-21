import React from "react";

/**
 * Simple layout: header, main, footer slots
 */
export default function Layout({ header, children, footer }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[var(--bda-bg)] selection:bg-[var(--bda-primary)] selection:text-white">
      {/* Global Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bda-bg)] via-[var(--bda-surface)] to-[var(--bda-bg)] opacity-80" />
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-[var(--bda-primary)] rounded-full blur-[150px] opacity-10 animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-blue-600 rounded-full blur-[150px] opacity-10 animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />
      </div>

      <header className="w-full relative z-50 animate-enter" style={{ animationDelay: '0ms' }}>
        {header}
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8 relative z-10 animate-enter" style={{ animationDelay: '100ms' }}>
        {children}
      </main>

      <footer className="w-full relative z-10 animate-enter" style={{ animationDelay: '200ms' }}>
        {footer}
      </footer>
    </div>
  );
}
