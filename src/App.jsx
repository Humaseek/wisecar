import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import ConfigMissing from "./pages/ConfigMissing";
import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import Cars from "./pages/Cars";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Sales from "./pages/Sales";
import NotAllowed from "./pages/NotAllowed";

export default function App() {
  if (!isSupabaseConfigured || !supabase) {
    return <ConfigMissing />;
  }

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error(error);
      setSession(data?.session ?? null);
      setAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession ?? null);
      },
    );

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ color: "#64748b", fontWeight: 900 }}>...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={session ? <Navigate to="/" replace /> : <Login />}
          />

          <Route element={<ProtectedRoute session={session} />}>
            <Route element={<Layout session={session} />}>
              <Route index element={<Dashboard />} />
              <Route path="cars" element={<Cars />} />
              <Route path="customers" element={<Customers />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="sales" element={<Sales />} />
              <Route path="not-allowed" element={<NotAllowed />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
