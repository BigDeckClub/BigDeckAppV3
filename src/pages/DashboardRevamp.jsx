import React from "react";
import Layout from "../components/ui/Layout";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

/**
 * Dashboard skeleton showing metrics and featured decks.
 * Replace placeholders with real data integration in next phases.
 */
export default function DashboardRevamp() {
  const header = (
    <div className="header-banner" />
  );

  return (
    <Layout header={header}>
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <h4>Total Cards</h4>
          <div className="text-2xl">271</div>
        </Card>
        <Card>
          <h4>Unique</h4>
          <div className="text-2xl">162</div>
        </Card>
        <Card>
          <h4>Available</h4>
          <div className="text-2xl">271</div>
        </Card>
      </div>

      <div className="mt-8">
        <h3>Your Decks</h3>
        <div className="grid grid-cols-3 gap-4 mt-4">
          {/* Example deck cards (replace with mapping) */}
          <Card>
            <div className="mb-2">Commander • UR Dragon</div>
            <Button variant="outline">View</Button>
          </Card>
          <Card>
            <div className="mb-2">Standard • Sephiroth Avatar</div>
            <Button variant="outline">View</Button>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
