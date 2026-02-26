import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Car,
  UsersRound,
  Truck,
  BadgeDollarSign,
  LogOut,
} from "lucide-react";

function RolePill({ role }) {
  const label = role === "admin" ? "أدمن" : role === "sales" ? "مبيعات" : "غير معروف";
  const variant = role === "admin" ? "ok" : "info";
  return <span className={`pill ${variant}`}>{label}</span>;
}

export default function Sidebar({ profile, onSignOut }) {
  const role = profile?.role;

  return (
    <aside className="sidebar">
      <div className="brand">
        <img
          src="/brand-logo.png"
          alt="Logo"
          className="brandLogo"
        />
        <div style={{ minWidth: 0 }}>
          <div className="h1" style={{ lineHeight: 1.15 }}>
            نظام معرض السيارات
          </div>
          <div className="muted" style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 900 }}>{profile?.full_name || ""}</span>
            {role ? <RolePill role={role} /> : null}
          </div>
        </div>
      </div>

      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}
        >
          <LayoutDashboard size={18} /> <span>لوحة التحكم</span>
        </NavLink>

        <NavLink to="/cars" className={({ isActive }) => (isActive ? "active" : "")}
        >
          <Car size={18} /> <span>السيارات</span>
        </NavLink>

        <NavLink to="/customers" className={({ isActive }) => (isActive ? "active" : "")}
        >
          <UsersRound size={18} /> <span>الزباين</span>
        </NavLink>

        <NavLink to="/sales" className={({ isActive }) => (isActive ? "active" : "")}
        >
          <BadgeDollarSign size={18} /> <span>المبيعات</span>
        </NavLink>

        {role === "admin" ? (
          <NavLink to="/suppliers" className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Truck size={18} /> <span>الموردين</span>
          </NavLink>
        ) : null}
      </nav>

      <hr className="sep" />

      <button className="btn danger" onClick={onSignOut} style={{ width: "100%" }}>
        <LogOut size={18} /> تسجيل خروج
      </button>

      <div className="muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.4 }}>
        تصميم فاخر + صلاحيات كاملة (Admin / Sales)
      </div>
    </aside>
  );
}
