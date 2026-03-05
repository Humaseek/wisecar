import React, { useState } from "react";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { supabase } from "../supabaseClient";
import ErrorBanner from "../components/ErrorBanner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    const cleanEmail = String(email || "").trim();
    const cleanPassword = String(password || "");

    if (!cleanEmail || !cleanPassword) return;

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    setLoading(false);
    if (signInError) setError(signInError);
  }

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="card" style={{ marginTop: 24 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="row" style={{ gap: 10 }}>
            <img
              src="/brand-logo.png"
              alt="Logo"
              style={{
                width: 46,
                height: 46,
                borderRadius: 18,
                border: "1px solid rgba(0,0,0,.10)",
                background: "#fff",
                objectFit: "cover",
              }}
            />
            <div>
              <div className="h1">تسجيل الدخول</div>
              <div className="muted" style={{ marginTop: 4 }}>
                نظام إدارة معرض السيارات
              </div>
            </div>
          </div>

          <div className="pill warn">فاخر</div>
        </div>

        <hr className="sep" />

        <ErrorBanner error={error} />

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <div>
            <div className="label">الإيميل</div>
            <div
              className="input"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <Mail size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
              <input
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontWeight: 900,
                }}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <div className="label">كلمة السر</div>
            <div
              className="input"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <Lock size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
              <input
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontWeight: 900,
                }}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="btn"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  padding: "8px 10px",
                  minWidth: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
                title={showPassword ? "إخفاء" : "إظهار"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            className="btn primary"
            disabled={loading || !email.trim() || !password}
          >
            <LogIn size={18} /> {loading ? "..." : "دخول"}
          </button>

          <div className="muted" style={{ fontSize: 13, lineHeight: 1.8 }}>
            إذا دخلت وما شفت صفحات / أزرار، احتمال دورك غير مضبوط.
            <br />
            الأدمن يشوف كل شيء، والمبيعات يشوف الأسعار المطلوبة فقط.
          </div>
        </form>
      </div>
    </div>
  );
}
