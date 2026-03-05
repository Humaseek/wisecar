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
      <div className="public-specs__value">{value ?? "â€”"}</div>
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

  const car = useMemo(() => cars.find((c) => String(c.id) === String(id)), [cars, id]);

  if (!car) {
    return (
      <div className="public-app" dir="rtl">
        <PublicHeader searchValue={searchValue} onSearchChange={setSearchValue} />
        <main className="public-main public-details">
          <div className="public-container">
            <div className="public-breadcrumbs">
              <Link to="/">Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©</Link>
              <ChevronRight size={14} />
              <span>Ø§Ù„Ø¥Ø¹Ù„Ø§Ù†</span>
            </div>
            <div className="public-card" style={{ padding: 18 }}>
              Ø§Ù„Ø¥Ø¹Ù„Ø§Ù† ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯.
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
            <Link to="/">Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©</Link>
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
                  {formatPriceAed(car.priceAed)} <span>Ø¯.Ø¥</span>
                </div>

                <a
                  className="public-btn public-btn--whatsapp"
                  href={car.whatsapp || "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={18} />
                  ÙˆØ§ØªØ³Ø§Ø¨
                </a>

                <button
                  type="button"
                  className="public-btn public-btn--phone"
                  onClick={() => setShowPhone((v) => !v)}
                >
                  <Phone size={18} />
                  {showPhone ? "05x xxx xxxx" : car.phoneMasked || "Ø¥Ø¸Ù‡Ø§Ø± Ø§Ù„Ø±Ù‚Ù…"}
                </button>

                <div className="public-specs">
                  <SpecRow label="Ø§Ù„Ø³Ù†Ø©" value={car.year} />
                  <SpecRow label="Ø§Ù„Ù…ØµÙ†Ø¹" value={car.make} />
                  <SpecRow label="Ø§Ù„Ù…ÙˆØ¯ÙŠÙ„" value={car.model} />
                  <SpecRow
                    label="Ø§Ù„ÙƒÙŠÙ„ÙˆÙ…ØªØ±Ø§Øª"
                    value={car.km ? `${formatPriceAed(car.km)}` : "â€”"}
                  />
                  <SpecRow label="Ø§Ù„Ø£Ø³Ø·ÙˆØ§Ù†Ø§Øª" value={car.cylinders} />
                  <SpecRow label="Ù†Ø§Ù‚Ù„ Ø§Ù„Ø­Ø±ÙƒØ©" value={car.transmissionAr} />
                  <SpecRow label="Ø§Ù„Ù†ÙˆØ¹" value={car.driveAr} />
                  <SpecRow label="Ø§Ù„Ø£Ø¨ÙˆØ§Ø¨" value={car.doors} />
                  <SpecRow label="Ø§Ù„Ù„ÙˆÙ†" value={car.colorAr} />
                  <SpecRow label="Ø§Ù„ÙˆÙ‚ÙˆØ¯" value={car.fuelAr} />
                </div>

                <div className="public-price-card__actions">
                  <button type="button" className="public-chip">
                    ØªØ±ÙˆÙŠØ¬
                  </button>
                  <button type="button" className="public-chip public-chip--ghost">
                    ÙƒØ§Ù…Ù„Ø© Ø§Ù„Ù…ÙˆØ§ØµÙØ§Øª
                  </button>
                </div>
              </div>

              <div className="public-card" style={{ padding: 18 }}>
                <div className="public-seller">
                  <div className="public-seller__top">
                    <div className="public-seller__badge" aria-hidden="true" />
                    <div>
                      <div className="public-seller__name">{car.ownerAr || "Ù…Ø§Ù„Ùƒ"}</div>
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
