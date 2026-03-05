import React, { useMemo, useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { Menu, Search, SlidersHorizontal, X } from "lucide-react";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = params.get("q") || "";
  const [q, setQ] = useState(initial);

  const activeClass = ({ isActive }) =>
    isActive ? "navLink navLinkActive" : "navLink";

  const onSearch = (e) => {
    e.preventDefault();
    const next = String(q || "").trim();
    const sp = new URLSearchParams();
    if (next) sp.set("q", next);
    navigate(`/cars?${sp.toString()}`);
    setOpen(false);
  };

  const logo = useMemo(() => "/brand-logo.png", []);

  return (
    <header className="siteHeader">
      <div className="container headerInner">
        <Link className="brandLink" to="/" aria-label="Wisecar">
          <img className="brandLogo" src={logo} alt="Wisecar" />
          <div className="brandText">
            <div className="brandName">Wisecar</div>
            <div className="brandTag">לוח רכבים • קנייה ומכירה</div>
          </div>
        </Link>

        <nav className="navDesktop">
          <NavLink to="/" className={activeClass} end>
            דף הבית
          </NavLink>
          <NavLink to="/cars" className={activeClass}>
            רכבים
          </NavLink>
          <a className="navLink" href="#latest">
            אחרונים
          </a>
        </nav>

        <div className="headerActions">
          <form className="headerSearch" onSubmit={onSearch}>
            <Search size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='חפש "טויוטה קורולה", מספר רישוי...'
              aria-label="חיפוש"
            />
            <button type="submit" className="btn btnPrimary" title="חיפוש">
              חפש
            </button>
          </form>

          <button
            className="btnIcon headerMenuBtn"
            onClick={() => setOpen(true)}
            aria-label="פתח תפריט"
          >
            <Menu />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={open ? "drawerOverlay show" : "drawerOverlay"} onClick={() => setOpen(false)} />
      <aside className={open ? "drawer show" : "drawer"}>
        <div className="drawerTop">
          <div className="drawerTitle">תפריט</div>
          <button className="btnIcon" onClick={() => setOpen(false)} aria-label="סגור">
            <X />
          </button>
        </div>

        <form className="drawerSearch" onSubmit={onSearch}>
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש מהיר..."
          />
          <button type="submit" className="btn btnPrimary">חפש</button>
        </form>

        <div className="drawerLinks">
          <Link className="drawerLink" to="/" onClick={() => setOpen(false)}>
            דף הבית
          </Link>
          <Link className="drawerLink" to="/cars" onClick={() => setOpen(false)}>
            רכבים
          </Link>
        </div>

        <div className="drawerCta">
          <button
            className="btn btnGhost"
            onClick={() => {
              navigate("/cars");
              setOpen(false);
            }}
          >
            <SlidersHorizontal size={18} />
            חיפוש מתקדם
          </button>
        </div>
      </aside>
    </header>
  );
}
