import React from "react";

export default function ConfigMissing() {
  return (
    <div className="container" style={{ padding: "60px 0" }}>
      <div className="panel" style={{ maxWidth: 860, margin: "0 auto" }}>
        <h1 style={{ margin: 0 }}>חסר חיבור ל-Supabase</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          כדי שהאתר יציג רכבים מהמסד נתונים, צריך להגדיר משתני סביבה:
        </p>

        <div className="codeBox">
          <div>VITE_SUPABASE_URL</div>
          <div>VITE_SUPABASE_ANON_KEY</div>
        </div>

        <p className="muted" style={{ marginTop: 10 }}>
          אפשר להגדיר אותם ב-.env או דרך public/env.js.
        </p>
      </div>
    </div>
  );
}
