import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Car,
  Search,
  SlidersHorizontal,
  Zap,
  Users,
  Crown,
  Trophy,
  Mountain,
  Truck,
  CarTaxiFront,
  CarFront,
  Caravan,
} from "lucide-react";
import { fetchLatestCars, fetchMakesAndModels } from "../lib/carsApi";
import CarCard from "../components/CarCard";

function CategoryCard({ icon, title, subtitle, to }) {
  return (
    <Link to={to} className="categoryCard">
      <div className="categoryIcon">{icon}</div>
      <div>
        <div className="categoryTitle">{title}</div>
        <div className="categorySub">{subtitle}</div>
      </div>
    </Link>
  );
}

function Pill({ icon, label, to }) {
  return (
    <Link to={to} className="pill">
      <span className="pillIcon">{icon}</span>
      <span className="pillLbl">{label}</span>
    </Link>
  );
}

function MakeChip({ name, to }) {
  return (
    <Link to={to} className="makeChip" title={name}>
      <span className="makeDot" aria-hidden="true" />
      <span className="makeName">{name}</span>
    </Link>
  );
}

export default function Home() {
  const navigate = useNavigate();

  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [q, setQ] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [popularMakes, setPopularMakes] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchLatestCars(8)
      .then((rows) => {
        if (!alive) return;
        setLatest(rows);
        setErr(null);
      })
      .catch((e) => {
        if (!alive) return;
        console.error(e);
        setErr("לא הצלחנו לטעון רכבים.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchMakesAndModels()
      .then(({ makes }) => {
        if (!alive) return;
        setPopularMakes((makes || []).slice(0, 10));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const heroBg = useMemo(
    () => ({
      background:
        "radial-gradient(900px 500px at 20% 10%, rgba(0,172,71,.16), transparent 60%), radial-gradient(900px 520px at 80% 0%, rgba(255,213,2,.15), transparent 60%), linear-gradient(180deg, #ffffff, #fbfbfb)",
    }),
    [],
  );

  const onHeroSearch = (e) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (String(q || "").trim()) sp.set("q", String(q).trim());
    if (String(maxPrice || "").trim()) sp.set("p2", String(maxPrice).trim());
    navigate(`/cars?${sp.toString()}`);
  };

  return (
    <>
      <section className="hero" style={heroBg}>
        <div className="container heroGrid">
          <div className="heroText">
            <div className="heroBadge">לוח רכבים חדש • עיצוב נקי ומהיר</div>
            <h1 className="heroTitle">מצא את הרכב הבא שלך</h1>
            <p className="heroDesc">
              חיפוש מתקדם, קארדים ברורים, תמונות גדולות ומידע בסיסי — הכול בעברית ובשקל.
            </p>

            <form className="heroSearchBar" onSubmit={onHeroSearch}>
              <div className="heroSearchField">
                <Search size={18} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder='חיפוש: "טויוטה קורולה", "קיה", מספר רישוי...'
                />
              </div>
              <div className="heroSearchField" style={{ maxWidth: 180 }}>
                <span className="heroCurrency">₪</span>
                <input
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="מחיר עד"
                  inputMode="numeric"
                />
              </div>
              <button type="submit" className="btn btnPrimary btnLg" style={{ borderRadius: 18 }}>
                חפש
              </button>
            </form>

            <div className="heroActions">
              <Link to="/cars" className="btn btnGhost btnLg">
                <SlidersHorizontal size={18} />
                חיפוש מתקדם
              </Link>
            </div>

            <div className="heroStats">
              <div className="stat">
                <div className="statNum">מהיר</div>
                <div className="statLbl">חוויית משתמש</div>
              </div>
              <div className="stat">
                <div className="statNum">ברור</div>
                <div className="statLbl">קארדים ותמונות</div>
              </div>
              <div className="stat">
                <div className="statNum">RTL</div>
                <div className="statLbl">עברית מלאה</div>
              </div>
            </div>
          </div>

          <div className="heroVisual">
            <div className="heroCard">
              <div className="heroCardTop">
                <div className="heroCardIcon"><Car /></div>
                <div>
                  <div className="heroCardTitle">מתחילים בחיפוש</div>
                  <div className="heroCardSub">בחרו קטגוריה/יצרן או עברו לחיפוש מתקדם</div>
                </div>
              </div>

              <div className="pills">
                <Pill icon={<CarTaxiFront size={18} />} label="סדאן" to="/cars?type=Sedan" />
                <Pill icon={<CarFront size={18} />} label="SUV" to="/cars?type=SUV" />
                <Pill icon={<CarTaxiFront size={18} />} label="האצ'בק" to="/cars?type=Hatchback" />
                <Pill icon={<CarTaxiFront size={18} />} label="קופה" to="/cars?type=Coupe" />
                <Pill icon={<Truck size={18} />} label="טנדר" to="/cars?type=Pickup" />
                <Pill icon={<Caravan size={18} />} label="ואן" to="/cars?type=Van" />
              </div>

              {popularMakes?.length ? (
                <div className="makesRow">
                  <div className="makesTitle">יצרנים פופולריים</div>
                  <div className="makesChips">
                    {popularMakes.map((m) => (
                      <MakeChip key={m} name={m} to={`/cars?make=${encodeURIComponent(m)}`} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sectionHead">
            <h2 className="sectionTitle">קטגוריות</h2>
            <Link className="link" to="/cars">צפה בכולם</Link>
          </div>

          <div className="categoriesGrid">
            <CategoryCard icon={<Users />} title="משפחתי" subtitle="רכבים יומיומיים" to="/cars" />
            <CategoryCard icon={<Zap />} title="חשמלי" subtitle="עתיד ירוק" to="/cars" />
            <CategoryCard icon={<Crown />} title="יוקרה" subtitle="פרימיום" to="/cars" />
            <CategoryCard icon={<Trophy />} title="ספורט" subtitle="ביצועים" to="/cars" />
            <CategoryCard icon={<Mountain />} title="שטח" subtitle="הרפתקה" to="/cars" />
            <CategoryCard icon={<Truck />} title="מסחרי" subtitle="עבודה" to="/cars" />
          </div>
        </div>
      </section>

      <section className="section" id="latest">
        <div className="container">
          <div className="sectionHead">
            <div>
              <h2 className="sectionTitle">רכבים אחרונים</h2>
              <div className="sectionSub">הכי חדשים שהועלו</div>
            </div>
            <Link className="btn btnGhost" to="/cars">צפה בכל הרכבים</Link>
          </div>

          {err ? <div className="alert">{err}</div> : null}

          {loading ? (
            <div className="gridCars" style={{ marginTop: 14 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeletonCard" />
              ))}
            </div>
          ) : (
            <div className="gridCars" style={{ marginTop: 14 }}>
              {latest.map((c) => (
                <CarCard key={c.id} car={c} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
