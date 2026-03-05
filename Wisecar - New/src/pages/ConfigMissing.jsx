import React from "react";

export default function ConfigMissing() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 60%)",
      }}
    >
      <div
        style={{
          maxWidth: 820,
          width: "100%",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 10px 30px rgba(2, 6, 23, 0.06)",
          direction: "rtl",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#ef4444",
              boxShadow: "0 0 0 6px rgba(239, 68, 68, 0.12)",
            }}
          />
          <div style={{ fontWeight: 950, fontSize: 18, color: "#0f172a" }}>
            إعداد Supabase غير مكتمل
          </div>
        </div>

        <p style={{ margin: "10px 0 16px", color: "#334155", lineHeight: 1.9 }}>
          المشروع يحتاج متغيرات بيئة Supabase.
          <br />
          إذا أنت على Vercel: أضف المتغيرات ثم اعمل Redeploy.
        </p>

        <div
          style={{
            background: "#0b1220",
            color: "#e2e8f0",
            borderRadius: 14,
            padding: 16,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            fontSize: 13,
            overflowX: "auto",
            direction: "ltr",
          }}
        >
          <div>VITE_SUPABASE_URL = https://&lt;project-ref&gt;.supabase.co</div>
          <div>VITE_SUPABASE_ANON_KEY = &lt;publishable anon key&gt;</div>
        </div>

        <ol style={{ margin: "16px 0 0", paddingRight: 18, color: "#334155", lineHeight: 2 }}>
          <li>Vercel → Project → Settings → Environment Variables</li>
          <li>أضف المتغيرين أعلاه (Production + Preview)</li>
          <li>Deployments → Redeploy</li>
        </ol>

        <div style={{ marginTop: 14, color: "#64748b", fontSize: 13 }}>
          ملاحظة: لا تستخدم Service Role Key داخل الواجهة.
        </div>
      </div>
    </div>
  );
}
