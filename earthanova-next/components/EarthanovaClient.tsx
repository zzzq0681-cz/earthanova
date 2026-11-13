"use client";

import { useEffect } from "react";

/**
 * Boots the Earthanova app logic in the browser once the markup has hydrated.
 * The module (and globe.gl / three.js with it) only ever loads client-side;
 * module caching means it runs once even under React Strict Mode.
 */
export default function EarthanovaClient() {
  useEffect(() => {
    import("@/lib/earthanova").catch((err) => {
      console.error("Earthanova failed to start", err);
    });
  }, []);

  return null;
}
