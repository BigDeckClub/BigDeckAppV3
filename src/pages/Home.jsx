import React from "react";
import Layout from "../components/ui/Layout";

/**
 * Landing/home page for logged-in users. Uses header banner variable --community-banner.
 */
export default function Home() {
  const header = (
    <div className="header-banner" style={{ backgroundImage: "var(--community-banner)" }}>
      <div className="container mx-auto px-6 py-6">
        <h1 style={{ fontSize: "var(--type-2xl)" }}>BigDeck Club</h1>
        <p className="text-muted">MTG Card Manager for our community.</p>
      </div>
    </div>
  );

  return (
    <Layout header={header}>
      <div className="container mx-auto px-6">
        <section className="mt-6">
          <h2 className="text-xl">Welcome</h2>
          <p>Quick links and featured decks.</p>
        </section>
      </div>
    </Layout>
  );
}
