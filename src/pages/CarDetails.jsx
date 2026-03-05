import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Phone, MessageCircle, ShieldCheck, Calendar, Gauge, Palette, CarFront } from "lucide-react";
import { fetchCarById, getContactPhone, getWhatsappPhone } from "../lib/carsApi";
import { formatKm, formatMoneyILS, makeTitle, pickPrimaryImage, statusLabel } from "../utils/format";

function Spec({ icon, label, value }) {
  return (
    <div className="spec">
      <div className="specIcon">{icon}</div>
      <div>
        <div className="specLbl">{label}</div>
        <div className="specVal">{value || "—"}</div>
      </div>
    </div>
  );
}

export default function CarDetails() {
  const { id } = useParams();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    fetchCarById(id)
      .then((row) => {
        if (!alive) return;
        setCar(row);
      })
      .catch((e) => {
        console.error(e);
        if (!alive) return;
        setErr("לא הצלחנו לטעון את פרטי הרכב.");
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [id]);

  const images = useMemo(() => {
    const list = Array.isArray(car?.car_images) ? car.car_images : [];
    const sorted = list
      .filter((x) => x?.public_url)
      .slice()
      .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0));

    const main = pickPrimaryImage(car);
    if (!sorted.length) return [main];
    const urls = sorted.map((x) => x.public_url);
    if (!urls.includes(main)) urls.unshift(main);
    return urls;
  }, [car]);

  const phone = getContactPhone();
  const wa = getWhatsappPhone();
  const waLink = `https://wa.me/${wa}`;

  if (loading) {
    return (
      <div className="container section" style={{ paddingTop: 22 }}>
        <div className="panel" style={{ padding: 18 }}>
          <div className="muted">טוען...</div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container section" style={{ paddingTop: 22 }}>
        <div className="alert">{err}</div>
        <div style={{ marginTop: 12 }}>
          <Link className="btn btnGhost" to="/cars">חזרה לרכבים</Link>
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="container section" style={{ paddingTop: 22 }}>
        <div className="empty">
          <div className="emptyTitle">הרכב לא נמצא</div>
          <Link className="btn btnGhost" to="/cars">חזרה לרכבים</Link>
        </div>
      </div>
    );
  }

  const title = makeTitle(car);
  const dRaw = car?.car_details || null;
  const d = Array.isArray(dRaw) ? (dRaw[0] || null) : dRaw;

  return (
    <div className="container section" style={{ paddingTop: 18 }}>
      <div className="crumbs">
        <Link to="/cars" className="crumbLink">רכבים</Link>
        <ChevronRight size={18} />
        <span className="crumbCurrent">{title}</span>
      </div>

      <div className="detailsGrid">
        <div>
          <div className="gallery">
            {images.slice(0, 9).map((src, idx) => (
              <img
                key={src + idx}
                src={src}
                alt={`${title} ${idx + 1}`}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-car.svg";
                }}
              />
            ))}
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <div className="detailsTitle">תיאור</div>
            <div className="detailsText">
              {car?.description || car?.notes_public || "אין תיאור."}
            </div>
          </div>
        </div>

        <aside className="detailsSide">
          <div className="priceCard">
            <div className="priceTop">
              <div className="priceNum">{formatMoneyILS(car?.asking_price)}</div>
              <div className="statusPill ok">{statusLabel(car?.status)}</div>
            </div>

            <a className="btn btnPrimary btnFull" href={waLink} target="_blank" rel="noreferrer">
              <MessageCircle size={18} />
              וואטסאפ
            </a>

            <button className="btn btnGhost btnFull" onClick={() => setShowPhone((v) => !v)}>
              <Phone size={18} />
              {showPhone ? phone : "הצג מספר"}
            </button>

            <div className="trustRow">
              <ShieldCheck size={18} />
              מידע בסיסי + תמונות
            </div>
          </div>

          <div className="panel" style={{ marginTop: 14 }}>
            <div className="detailsTitle">פרטים עיקריים</div>

            <div className="specsGrid">
              <Spec icon={<Calendar size={18} />} label="שנה" value={car?.year ? String(car.year) : "—"} />
              <Spec icon={<Gauge size={18} />} label='ק"מ' value={formatKm(car?.mileage)} />
              <Spec icon={<Palette size={18} />} label="צבע" value={car?.color} />
              <Spec icon={<CarFront size={18} />} label="סוג" value={car?.car_type || car?.type} />
            </div>

            <div className="kv">
              <div className="kvRow"><div className="kvK">יצרן</div><div className="kvV">{car?.make}</div></div>
              <div className="kvRow"><div className="kvK">דגם</div><div className="kvV">{car?.model}</div></div>
              <div className="kvRow"><div className="kvK">גיר</div><div className="kvV">{d?.gearbox || "—"}</div></div>
              <div className="kvRow"><div className="kvK">דלק</div><div className="kvV">{d?.fuel_type || "—"}</div></div>
              <div className="kvRow"><div className="kvK">נפח מנוע</div><div className="kvV">{d?.engine_cc ? `${d.engine_cc} סמ"ק` : "—"}</div></div>
              <div className="kvRow"><div className="kvK">כוח סוס</div><div className="kvV">{d?.horsepower || "—"}</div></div>
              <div className="kvRow"><div className="kvK">דלתות</div><div className="kvV">{d?.doors_count || "—"}</div></div>
              <div className="kvRow"><div className="kvK">בעלות</div><div className="kvV">{d?.owners_count || "—"}</div></div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 14 }}>
            <div className="detailsTitle">צור קשר</div>
            <div className="detailsText">
              צריכים עוד פרטים? שלחו הודעה בוואטסאפ או בקשו שיחה.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
