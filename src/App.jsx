import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

import PublicLayout from "./components/PublicLayout";

import ConfigMissing from "./pages/ConfigMissing";
import Home from "./pages/Home";
import Cars from "./pages/Cars";
import CarDetails from "./pages/CarDetails";
import NotFound from "./pages/NotFound";

export default function App() {
  if (!isSupabaseConfigured || !supabase) {
    return <ConfigMissing />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="cars" element={<Cars />} />
          <Route path="cars/:id" element={<CarDetails />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
