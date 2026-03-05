import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Search } from "lucide-react";

export default function PublicHeader({ searchValue, onSearchChange }) {
  const navigate = useNavigate();

  return (
    <header className="public-header">
      <div className="public-header__inner">
        <button
          type="button"
          className="public-icon-btn"
          aria-label="Menu"
          onClick={() => navigate("/admin")}
          title="لوحة التحكم (Admin)"
        >
          <Menu size={18} />
          <span className="public-icon-btn__label">تقدم</span>
        </button>

        <div className="public-brand">
          <Link to="/" className="public-brand__link" aria-label="Home">
            <span className="public-brand__name">sayarTii.com</span>
            <span className="public-brand__country">الإمارات</span>
          </Link>
        </div>

        <div className="public-search">
          <Search size={18} />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="بحث ..."
            className="public-search__input"
          />
          <div className="public-flag" aria-label="UAE">
            <span className="public-flag__r" />
            <span className="public-flag__g" />
            <span className="public-flag__w" />
            <span className="public-flag__b" />
          </div>
        </div>
      </div>
    </header>
  );
}
