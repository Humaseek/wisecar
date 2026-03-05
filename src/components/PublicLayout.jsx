import React from "react";
import { Outlet } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export default function PublicLayout() {
  return (
    <div className="siteRoot">
      <SiteHeader />
      <main className="siteMain">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
