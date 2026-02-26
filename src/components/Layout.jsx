import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import ToastHost from "./ToastHost";
import { useToast } from "../hooks/useToast";
import { supabase } from "../supabaseClient";

export default function Layout({ session }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, push, remove } = useToast();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileErr, setProfileErr] = useState(null);

  const isAdmin = useMemo(() => profile?.role === "admin", [profile?.role]);
  const isSales = useMemo(() => profile?.role === "sales", [profile?.role]);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoadingProfile(true);
      setProfileErr(null);

      const userId = session?.user?.id;
      if (!userId) {
        setLoadingProfile(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", userId)
        .single();

      if (!mounted) return;

      if (error) {
        setProfileErr(error);
        setProfile(null);
        setLoadingProfile(false);

        // إذا جدول profiles مش موجود أو RLS غلط
        if (String(error?.code || "").includes("42P01")) {
          push(
            "قاعدة البيانات غير جاهزة (profiles). شغّل ملف الـ SQL الخاص بالمشروع داخل Supabase.",
            "danger",
          );
        } else {
          push("فشل تحميل صلاحيات المستخدم.", "danger");
        }

        return;
      }

      setProfile(data);
      setLoadingProfile(false);

      // إذا الدور غير معروف: ممنوع
      if (!data?.role) {
        if (location.pathname !== "/not-allowed") {
          navigate("/not-allowed", { replace: true });
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id, navigate, location.pathname, push]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="layout">
      <Sidebar profile={profile} onSignOut={signOut} />

      <main className="main">
        {loadingProfile ? (
          <div className="container">
            <div className="card">جاري تحميل الصلاحيات…</div>
          </div>
        ) : profileErr ? (
          <div className="container">
            <div className="card">
              <div className="h1">مشكلة في الصلاحيات</div>
              <div className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
                لم نتمكن من قراءة ملف الصلاحيات من Supabase.
                <br />
                تأكد أنك شغّلت ملف SQL للمشروع وأن سياسات RLS صحيحة.
              </div>
              <hr className="sep" />
              <div style={{ fontWeight: 900 }} className="ltrIso">
                {String(profileErr?.message || profileErr)}
              </div>
            </div>
          </div>
        ) : (
          <div className="page">
            <Outlet context={{ toast: push, profile, isAdmin, isSales }} />
          </div>
        )}
      </main>

      <ToastHost toasts={toasts} onRemove={remove} />
    </div>
  );
}
