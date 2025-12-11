import React from "react";

/**
 * Simple layout: header, main, footer slots
 */
export default function Layout({ header, children, footer }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full">{header}</header>
      <main className="flex-1 container mx-auto px-6 py-8">{children}</main>
      <footer className="w-full">{footer}</footer>
    </div>
  );
}
