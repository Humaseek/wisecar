import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Phone, MessageCircle, ChevronRight } from "lucide-react";
import PublicHeader from "../components/PublicHeader";
import Gallery from "../components/Gallery";
import { loadPublicCars } from "../utils/publicCars";

function formatPriceAed(value) {
  try {
    return new Intl.NumberFormat("en-US").format(value);
  } catch {
    return String(value);
  }
}

function SpecRow({ label, value }) {
  return (
    <div className="public-specs__row">
      <div className="public-specs__label">{label}</div>
      <div className="public-specs__value">{value ?? "—"}</div>
    </div>
  );
}

export default function PublicCarDetails() {
  const { id } = useParams();
  const [cars, setCars] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => {
    loadPublicCars().then(setCars);
  }, []);

  const car = useMemo(
    () => cars.find((c) => String(c.id) === String(id)),
    [cars, id],
  );

  if (!car) {
    return (
      <div className="public-app" dir="rtl">
        <PublicHeader
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />
        <main className="public-main public-details">
          <div className="public-container">
            <div className="public-breadcrumbs">
              <Link to="/">الرئيسية</Link>
              <ChevronRight size={14} />
              <span>الإعلان</span>
            </div>
            <div className="public-card" style={{ padding: 18 }}>
              الإعلان غير موجود.
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="public-app" dir="rtl">
      <PublicHeader searchValue={searchValue} onSearchChange={setSearchValue} />

      <main className="public-main public-details">
        <div className="public-container">
          <div className="public-breadcrumbs">
            <Link to="/">الرئيسية</Link>
            <ChevronRight size={14} />
            <span>
              {car.make} {car.model}
            </span>
          </div>

          <div className="public-details__grid">
            <div className="public-card">
              <Gallery images={car.images} title={`${car.make} ${car.model}`} />
            </div>

            <aside className="public-details__side">
              <div className="public-price-card">
                <div className="public-price-card__price">
                  {formatPriceAed(car.priceAed)} <span>د.إ</span>
                </div>

                <a
                  className="public-btn public-btn--whatsapp"
                  href={car.whatsapp || "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={18} />
                  واتساب
                </a>

                <button
                  type="button"
                  className="public-btn public-btn--phone"
                  onClick={() => setShowPhone((v) => !v)}
                >
                  <Phone size={18} />
                  {showPhone
                    ? "05x xxx xxxx"
                    : car.phoneMasked || "إظهار الرقم"}
                </button>

                <div className="public-specs">
                  <SpecRow label="السنة" value={car.year} />
                  <SpecRow label="المصنع" value={car.make} />
                  <SpecRow label="الموديل" value={car.model} />
                  <SpecRow
                    label="الكيلومترات"
                    value={car.km ? `${formatPriceAed(car.km)}` : "—"}
                  />
                  <SpecRow label="الأسطوانات" value={car.cylinders} />
                  <SpecRow label="ناقل الحركة" value={car.transmissionAr} />
                  <SpecRow label="النوع" value={car.driveAr} />
                  <SpecRow label="الأبواب" value={car.doors} />
                  <SpecRow label="اللون" value={car.colorAr} />
                  <SpecRow label="الوقود" value={car.fuelAr} />
                </div>

                <div className="public-price-card__actions">
                  <button type="button" className="public-chip">
                    ترويج
                  </button>
                  <button
                    type="button"
                    className="public-chip public-chip--ghost"
                  >
                    كاملة المواصفات
                  </button>
                </div>
              </div>

              <div className="public-card" style={{ padding: 18 }}>
                <div className="public-seller">
                  <div className="public-seller__top">
                    <div className="public-seller__badge" aria-hidden="true" />
                    <div>
                      <div className="public-seller__name">
                        {car.ownerAr || "مالك"}
                      </div>
                      <div className="public-seller__loc">{car.locationAr}</div>
                    </div>
                  </div>

                  <div className="public-seller__title">
                    <div className="public-seller__title-ar">{car.titleAr}</div>
                    <div className="public-seller__title-en">
                      {car.make} {car.model}
                    </div>
                  </div>

                  <div className="public-seller__badges">
                    {(car.badges ?? []).map((b) => (
                      <span key={b} className="public-badge">
                        {b}
                      </span>
                    ))}
                  </div>

                  {car.descriptionAr ? (
                    <p className="public-seller__desc">{car.descriptionAr}</p>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
