import React, { createContext, useEffect, useState } from "react";
import PropTypes from "prop-types";

/**
 * CommunityThemeContext
 * - Fetches theme for a community on mount: GET /api/community-themes/:communityId
 * - Applies CSS variables to document root
 * - Exposes setPreviewTheme for live preview and saveThemeToServer to persist (admin-only).
 */

export const CommunityThemeContext = createContext();

export const defaultCommunityTheme = {
  name: "bigdeck-default",
  vars: {
    "--color-bg": "#071229",
    "--color-surface": "#0f1722",
    "--color-muted": "#94a3b8",
    "--color-accent": "#00d1b2",
    "--color-accent-2": "#6ee7b7",
    "--card-bg": "#0e1620",
    "--card-border": "rgba(255,255,255,0.04)"
  },
  bannerUrl: ""
};

export function CommunityThemeProvider({ communityId, children }) {
  const [theme, setTheme] = useState(defaultCommunityTheme);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    async function load() {
      if (!communityId) return;
      try {
        const res = await fetch(`/api/community-themes/${communityId}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.theme?.vars) setTheme(json.theme);
        }
      } catch (err) {
        console.warn("Failed to load community theme", err);
      }
    }
    load();
  }, [communityId]);

  useEffect(() => {
    const applied = preview || theme;
    if (!applied?.vars) return;
    Object.entries(applied.vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
    if (applied?.bannerUrl) {
      document.documentElement.style.setProperty("--community-banner", `url(${applied.bannerUrl})`);
    } else {
      document.documentElement.style.removeProperty("--community-banner");
    }
  }, [theme, preview]);

  async function saveThemeToServer(payload) {
    const res = await fetch(`/api/community-themes/${communityId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    setTheme(json.theme);
    return json;
  }

  return (
    <CommunityThemeContext.Provider value={{ theme, setPreviewTheme: setPreview, saveThemeToServer, defaultCommunityTheme }}>
      {children}
    </CommunityThemeContext.Provider>
  );
}

CommunityThemeProvider.propTypes = {
  communityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  children: PropTypes.node.isRequired
};
