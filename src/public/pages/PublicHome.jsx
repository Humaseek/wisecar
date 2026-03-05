import React, { useEffect, useMemo, useState } from "react";
import PublicHeader from "../components/PublicHeader";
import Categories from "../components/Categories";
import LatestCars from "../components/LatestCars";
import { loadPublicCars } from "../utils/publicCars";
import {
  Car,
  Truck,
  Bus,
  BatteryCharging,
  Bike,
  Package,
  Search,
} from "lucide-react";

const bodyTypes = [
  { label: "كوبيه", icon: Car },
  { label: "سيدان", icon: Car },
  { label: "دفع رباعي", icon: Truck },
  { label: "هاتش باك", icon: Car },
  { label: "واجِن", icon: Car },
  { label: "بيك أب", icon: Truck },
  { label: "فان", icon: Bus },
  { label: "تجارية", icon: Package },
  { label: "أخرى", icon: Bike },
  { label: "كهرباء", icon: BatteryCharging },
];

const makes = [
  "NISSAN",
  "MERCEDES-BENZ",
  "TOYOTA",
  "LEXUS",
  "FORD",
  "HYUNDAI",
  "CHEVROLET",
  "DODGE",
  "RANGE ROVER",
  "BMW",
];

export default function PublicHome() {
  const [cars, setCars] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    loadPublicCars().then(setCars);
  }, []);

  const filtered = useMemo(() => {
    const s = searchValue.trim().toLowerCase();
    const max = Number(String(maxPrice).replace(/[^0-9.]/g, "")) || null;

    return (cars ?? []).filter((c) => {
      const hay = `${c.titleAr} ${c.make} ${c.model} ${c.year}`.toLowerCase();
      const matchesText = !s || hay.includes(s);
      const matchesMax = !max || (Number(c.priceAed) || 0) <= max;
      return matchesText && matchesMax;
    });
  }, [cars, searchValue, maxPrice]);

  return (
    <div className="public-app" dir="rtl">
      <PublicHeader searchValue={searchValue} onSearchChange={setSearchValue} />

      <main className="public-main">
        <section className="public-hero">
          <div className="public-hero__bg" />
          <div className="public-hero__content">
            <div className="public-hero__search">
              <input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="public-hero__input"
                placeholder="Maximum price in AED"
                inputMode="numeric"
              />
              <button
                type="button"
                className="public-hero__btn"
                onClick={() => {
                  // filtering is reactive; button is for UX parity
                }}
              >
                <span>Search</span>
                <Search size={16} />
              </button>
            </div>
          </div>
        </section>

        <section className="public-section">
          <div className="public-section__title-row">
            <h2 className="public-section__title">BODY TYPE</h2>
          </div>
          <div className="public-bodytypes">
            {bodyTypes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.label}
                  type="button"
                  className="public-bodytypes__item"
                >
                  <Icon size={18} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="public-section">
          <div className="public-section__title-row">
            <h2 className="public-section__title">MAKE</h2>
            <button
              type="button"
              className="public-link"
              onClick={() => {}}
            >
              Expand
            </button>
          </div>
          <div className="public-makes">
            {makes.map((m) => (
              <div key={m} className="public-makes__item">
                <div className="public-makes__logo" aria-hidden="true">
                  {m[0]}
                </div>
                <div className="public-makes__name">{m}</div>
              </div>
            ))}
          </div>
        </section>

        <Categories />
        <LatestCars cars={filtered.slice(0, 12)} />
      </main>

      <footer className="public-footer">
        <div>© {new Date().getFullYear()} Wisecar</div>
      </footer>
    </div>
  );
}
