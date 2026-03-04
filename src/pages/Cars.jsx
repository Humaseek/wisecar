import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Car as CarIcon,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  ImagePlus,
  BadgeCheck,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import Control from "../components/Control";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import ErrorBanner from "../components/ErrorBanner";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";

import { supabase } from "../supabaseClient";
import {
  formatMoneyILS,
  safeText,
  toNumberOrNull,
  statusLabel,
  statusVariant,
} from "../utils/format";

const CAR_TYPES = [
  { value: "Sedan", label: "סדאן" },
  { value: "SUV", label: "SUV" },
  { value: "Hatchback", label: "האצ'בק" },
  { value: "Coupe", label: "קופה" },
  { value: "Pickup", label: "טנדר" },
  { value: "Van", label: "ואן" },
  { value: "Crossover", label: "קרוסאובר" },
  { value: "Other", label: "אחר" },
];

const CAR_TYPE_LABELS = Object.fromEntries(
  CAR_TYPES.map((t) => [t.value, t.label]),
);

function typeLabel(v) {
  const s = safeText(v);
  return s ? CAR_TYPE_LABELS[s] || s : "";
}

const MAKE_MODEL_CATALOG = {
  "קיה": ["פיקנטו", "ריו", "סראטו", "ספורטאז׳", "נירו", "סטוניק", "סורנטו", "קרניבל"],
  "יונדאי": ["i10", "i20", "אקסנט", "אלנטרה", "טוסון", "קונה", "סנטה פה", "איוניק"],
  "טויוטה": ["קורולה", "יאריס", "קאמרי", "ראב4", "C-HR", "היילקס", "לנד קרוזר"],
  "סקודה": ["אוקטביה", "סופרב", "קודיאק", "קאמיק", "קארוק", "פאביה"],
  "פולקסווגן": ["גולף", "פולו", "טיגואן", "פאסאט", "T-Roc"],
  "מאזדה": ["3", "6", "CX-3", "CX-5", "CX-30"],
  "ניסאן": ["מיקרה", "סנטרה", "קשקאי", "אקס-טרייל", "ג'וק"],
  "מיצובישי": ["אטראז׳", "לנסר", "ASX", "אאוטלנדר", "טרייטון"],
  "סוזוקי": ["סוויפט", "באלנו", "ויטארה", "סיאז", "ארטיגה"],
  "פיג׳ו": ["208", "2008", "3008", "508"],
  "רנו": ["קליאו", "קפצ'ור", "מגאן", "קולאוס"],
  "מרצדס": ["A-Class", "C-Class", "E-Class", "GLA", "GLC"],
  "ב.מ.וו": ["1 Series", "3 Series", "5 Series", "X1", "X3"],
  "אאודי": ["A3", "A4", "A6", "Q3", "Q5"],
};



function toDateOrNull(v) {
  const s = safeText(v);
  return s ? s : null; // YYYY-MM-DD
}

function toBoolOrNull(v) {
  if (v === "" || v == null) return null;
  if (v === true || v === false) return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function buildCarTitle(row) {
  if (!row) return "";
  return [row.make, row.model, row.year].filter(Boolean).join(" ");
}

async function uploadMainImage({ carId, file }) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ext.length > 6 ? "jpg" : ext;

  const uid =
    (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const path = `${carId}/${uid}.${safeExt}`;

  const { error: upErr } = await supabase.storage
    .from("car-images")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("car-images").getPublicUrl(path);
  const publicUrl = pub?.publicUrl;

  if (publicUrl) {
    // سجل بالصورة + حدّث الصورة الرئيسية
    const { error: insErr } = await supabase
      .from("car_images")
      .insert({ car_id: carId, path, public_url: publicUrl });
    if (insErr) {
      console.warn(insErr);
    }

    const { error: updErr } = await supabase
      .from("cars")
      .update({ main_image_url: publicUrl })
      .eq("id", carId);
    if (updErr) throw updErr;
  }

  return publicUrl;
}

function CarCard({ row, onOpen }) {
  return (
    <button
      className="carCard"
      type="button"
      onClick={onOpen}
    >
      <div className="car-card-image-wrapper">
        <img
          className="carCardImg"
          src={row?.main_image_url || "/brand-owl.png"}
          alt={buildCarTitle(row)}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/brand-owl.png";
          }}
        />
      </div>

      <div className="carCardBody">
        <div className="row space" style={{ gap: 10, alignItems: "flex-start" }}>
          <div>
            <div className="carTitle">{buildCarTitle(row) || "-"}</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {typeLabel(row?.type) || "-"} • {row?.mileage ? `${row.mileage.toLocaleString()} ק\"מ` : "-"}
            </div>
          </div>

          <Badge variant={statusVariant(row?.status)}>{statusLabel(row?.status)}</Badge>
        </div>

        <div className="row space" style={{ alignItems: "center" }}>
          <div className="price ltrIso">{formatMoneyILS(row?.asking_price)}</div>
          <div className="muted ltrIso" style={{ fontWeight: 900 }}>{row?.plate_number || ""}</div>
        </div>
      </div>
    </button>
  );
}

function KeyValue({ k, v }) {
  return (
    <div className="row space" style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="muted" style={{ fontWeight: 900 }}>{k}</div>
      <div style={{ fontWeight: 900 }}>{v || "—"}</div>
    </div>
  );
}

function CarModal({ open, mode, isAdmin, initial, suppliers, makeModelMap, onClose, onSaved, toast }) {
  const isEdit = mode === "edit";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Base (cars)
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [makeIsCustom, setMakeIsCustom] = useState(false);
  const [modelIsCustom, setModelIsCustom] = useState(false);
  const [year, setYear] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("available");
  const [mileage, setMileage] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [color, setColor] = useState("");
  const [askingPrice, setAskingPrice] = useState("");

  // Minimal details (car_details)
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [onRoadDate, setOnRoadDate] = useState("");
  const [lastTestDate, setLastTestDate] = useState("");
  const [testValidUntil, setTestValidUntil] = useState("");
  const [ownershipType, setOwnershipType] = useState("");
  const [ownersCount, setOwnersCount] = useState("");
  const [trimLevel, setTrimLevel] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [gearbox, setGearbox] = useState("");
  const [engineCc, setEngineCc] = useState("");
  const [sunroof, setSunroof] = useState("");

  // Admin-only finance (car_finance)
  const [purchasePrice, setPurchasePrice] = useState("");
  const [adSpend, setAdSpend] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [otherCost, setOtherCost] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [financeLoaded, setFinanceLoaded] = useState(false);

  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setImageFile(null);

    setMake(initial?.make || "");
    setModel(initial?.model || "");

    // تحديد إذا الشركة/الموديل خارج القوائم
    const mk = safeText(initial?.make || "");
    const md = safeText(initial?.model || "");

    const listMakes = Array.from(
      new Set([
        ...Object.keys(MAKE_MODEL_CATALOG || {}),
        ...Object.keys(makeModelMap || {}),
      ]),
    );

    setMakeIsCustom(mk ? !listMakes.includes(mk) : false);

    const listModels = mk
      ? Array.from(
          new Set([
            ...((MAKE_MODEL_CATALOG && MAKE_MODEL_CATALOG[mk]) || []),
            ...(((makeModelMap || {})[mk]) || []),
          ]),
        )
      : [];

    setModelIsCustom(md ? !listModels.includes(md) : false);
    setYear(initial?.year ? String(initial.year) : "");
    setType(initial?.type || "");
    setStatus(initial?.status || "available");
    setMileage(initial?.mileage ? String(initial.mileage) : "");
    setPlateNumber(initial?.plate_number || "");
    setColor(initial?.color || "");
    setAskingPrice(initial?.asking_price != null ? String(initial.asking_price) : "");

    setOnRoadDate("");
    setLastTestDate("");
    setTestValidUntil("");
    setOwnershipType("");
    setOwnersCount("");
    setTrimLevel("");
    setFuelType("");
    setGearbox("");
    setEngineCc("");
    setSunroof("");
    setDetailsLoaded(false);

    setPurchasePrice("");
    setAdSpend("");
    setFuelCost("");
    setOtherCost("");
    setSupplierId("");
    setPurchaseDate("");
    setInternalNotes("");
    setFinanceLoaded(false);

    async function loadDetails() {
      if (!initial?.id) {
        setDetailsLoaded(true);
        return;
      }
      const { data: d, error: dErr } = await supabase
        .from("car_details")
        .select(
          "on_road_date,last_test_date,test_valid_until,ownership_type,owners_count,trim_level,fuel_type,gearbox,engine_cc,sunroof",
        )
        .eq("car_id", initial.id)
        .maybeSingle();

      if (dErr) {
        console.warn(dErr);
        setDetailsLoaded(true);
        return;
      }

      setOnRoadDate(d?.on_road_date ? String(d.on_road_date) : "");
      setLastTestDate(d?.last_test_date ? String(d.last_test_date) : "");
      setTestValidUntil(d?.test_valid_until ? String(d.test_valid_until) : "");
      setOwnershipType(d?.ownership_type || "");
      setOwnersCount(d?.owners_count != null ? String(d.owners_count) : "");
      setTrimLevel(d?.trim_level || "");
      setFuelType(d?.fuel_type || "");
      setGearbox(d?.gearbox || "");
      setEngineCc(d?.engine_cc != null ? String(d.engine_cc) : "");
      setSunroof(d?.sunroof == null ? "" : String(d.sunroof));
      setDetailsLoaded(true);
    }

    async function loadFinance() {
      if (!initial?.id) {
        setFinanceLoaded(true);
        return;
      }

      const selectFields = isAdmin
        ? "purchase_price,ad_spend,fuel_cost,other_cost,supplier_id,purchase_date,internal_notes"
        : "supplier_id";

      const { data, error: finErr } = await supabase
        .from("car_finance")
        .select(selectFields)
        .eq("car_id", initial.id)
        .maybeSingle();

      if (finErr) {
        console.warn(finErr);
        setFinanceLoaded(true);
        return;
      }

      setSupplierId(data?.supplier_id || "");

      if (isAdmin) {
        setPurchasePrice(data?.purchase_price != null ? String(data.purchase_price) : "");
        setAdSpend(data?.ad_spend != null ? String(data.ad_spend) : "");
        setFuelCost(data?.fuel_cost != null ? String(data.fuel_cost) : "");
        setOtherCost(data?.other_cost != null ? String(data.other_cost) : "");
        setPurchaseDate(data?.purchase_date ? String(data.purchase_date) : "");
        setInternalNotes(data?.internal_notes || "");
      }

      setFinanceLoaded(true);
    }

    loadDetails();
    loadFinance();
  }, [open, initial, isAdmin]);

  const supplierName =
    (suppliers || []).find((s) => s.id === supplierId)?.company || "";

  async function onSubmit(e) {
    e?.preventDefault?.();
    if (!isAdmin) return;

    setSaving(true);
    setError(null);

    try {
      // 1) cars
      const payload = {
        make: safeText(make),
        model: safeText(model),
        year: toNumberOrNull(year),
        type: safeText(type) || null,
        status,
        mileage: toNumberOrNull(mileage),
        plate_number: safeText(plateNumber) || null,
        color: safeText(color) || null,
        asking_price: toNumberOrNull(askingPrice) || 0,
      };

      if (!payload.make || !payload.model) {
        throw new Error("נא למלא יצרן ודגם.");
      }

      let carRow;

      if (isEdit && initial?.id) {
        const { data, error: updErr } = await supabase
          .from("cars")
          .update(payload)
          .eq("id", initial.id)
          .select()
          .single();
        if (updErr) throw updErr;
        carRow = data;
      } else {
        const { data, error: insErr } = await supabase
          .from("cars")
          .insert(payload)
          .select()
          .single();
        if (insErr) throw insErr;
        carRow = data;
      }

      // 2) car_details (minimal)
      const detailsPayload = {
        car_id: carRow.id,
        on_road_date: toDateOrNull(onRoadDate),
        last_test_date: toDateOrNull(lastTestDate),
        test_valid_until: toDateOrNull(testValidUntil),
        ownership_type: safeText(ownershipType) || null,
        owners_count: toNumberOrNull(ownersCount),
        trim_level: safeText(trimLevel) || null,
        fuel_type: safeText(fuelType) || null,
        gearbox: safeText(gearbox) || null,
        engine_cc: toNumberOrNull(engineCc),
        sunroof: toBoolOrNull(sunroof),
      };

      const anyDetails = Object.entries(detailsPayload).some(
        ([k, v]) => k !== "car_id" && v != null && v !== "",
      );

      if (anyDetails) {
        const { error: detErr } = await supabase
          .from("car_details")
          .upsert(detailsPayload, { onConflict: "car_id" });
        if (detErr) throw detErr;
      }

      // 3) car_finance (admin only)
      const finPayload = {
        car_id: carRow.id,
        supplier_id: safeText(supplierId) || null,
        purchase_date: toDateOrNull(purchaseDate),
        internal_notes: safeText(internalNotes) || null,
        purchase_price: toNumberOrNull(purchasePrice),
        ad_spend: toNumberOrNull(adSpend),
        fuel_cost: toNumberOrNull(fuelCost),
        other_cost: toNumberOrNull(otherCost),
      };

      const anyFin =
        finPayload.supplier_id != null ||
        finPayload.purchase_date != null ||
        (finPayload.internal_notes && finPayload.internal_notes.length > 0) ||
        finPayload.purchase_price != null ||
        finPayload.ad_spend != null ||
        finPayload.fuel_cost != null ||
        finPayload.other_cost != null;

      if (anyFin) {
        const { error: finUpErr } = await supabase
          .from("car_finance")
          .upsert(finPayload, { onConflict: "car_id" });
        if (finUpErr) throw finUpErr;
      }

      // 3.5) حفظ الشركة + الموديل في القوائم (للأدمن)
      try {
        const mk = safeText(make);
        const md = safeText(model);

        if (mk && md) {
          // upsert make
          const { data: mkRow, error: mkErr } = await supabase
            .from("car_makes")
            .upsert({ name: mk }, { onConflict: "name" })
            .select("id")
            .single();
          if (mkErr) throw mkErr;

          const makeId = mkRow?.id;

          if (makeId) {
            const { error: mdErr } = await supabase
              .from("car_models")
              .upsert({ make_id: makeId, name: md }, { onConflict: "make_id,name" });
            if (mdErr) throw mdErr;
          }
        }
      } catch (e) {
        // لا نوقف حفظ السيارة إذا فشل حفظ القائمة
        console.warn(e);
        toast?.("הרכב נשמר, אבל לא הצלחנו לשמור את היצרן/דגם ברשימת הבחירה.", "warn");
      }

      // 4) image upload
      if (imageFile) {
        try {
          await uploadMainImage({ carId: carRow.id, file: imageFile });
        } catch (imgErr) {
          toast?.("הרכב נשמר, אבל העלאת התמונה נכשלה.", "warn");
          console.warn(imgErr);
        }
      }

      toast?.(isEdit ? "הרכב עודכן." : "הרכב נוסף.", "ok");
      onSaved?.();
      onClose?.();

      setSaving(false);
    } catch (e2) {
      setError(e2);
      setSaving(false);
    }
  }

  const title =
    mode === "view" ? "פרטי רכב" : isEdit ? "עריכת רכב" : "הוספת רכב";

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <ErrorBanner error={error} />

      {mode === "view" ? (
        <div className="stack">
          <div className="row space" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="h1">{buildCarTitle(initial) || "-"}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {typeLabel(initial?.type) || "-"} • {initial?.mileage ? `${initial.mileage.toLocaleString()} ק\"מ` : "-"}
              </div>
            </div>
            <Badge variant={statusVariant(initial?.status)}>
              {statusLabel(initial?.status)}
            </Badge>
          </div>

          <div className="subtleBox">
            <div className="label">מחיר מבוקש</div>
            <div className="price ltrIso">{formatMoneyILS(initial?.asking_price)}</div>
          </div>

          <div className="subtleBox">
            <KeyValue k="מספר רישוי" v={initial?.plate_number} />
            <KeyValue k="צבע" v={initial?.color} />
            <KeyValue k="סוג רכב" v={typeLabel(initial?.type)} />
            <KeyValue k="תאריך עלייה לכביש" v={onRoadDate} />
            <KeyValue k="טסט אחרון" v={lastTestDate} />
            <KeyValue k="בתוקף עד" v={testValidUntil} />
            <KeyValue k="סוג בעלות" v={ownershipType} />
            <KeyValue k="מס׳ בעלים" v={ownersCount} />
            <KeyValue k="רמת גימור" v={trimLevel} />
            <KeyValue k="סוג דלק" v={fuelType} />
            <KeyValue k="תיבת הילוכים" v={gearbox} />
            <KeyValue k="נפח מנוע (cc)" v={engineCc} />
            <KeyValue k="גג נפתח" v={sunroof === "" ? "" : (sunroof === "true" ? "כן" : "לא")} />
          </div>

          <div className="subtleBox">
            <div className="label">ספק</div>
            <div style={{ fontWeight: 900 }}>{supplierName || "—"}</div>
          </div>

          {isAdmin ? (
            <div className="subtleBox">
              <div className="label">מחיר קנייה (פנימי)</div>
              <div className="price ltrIso">{formatMoneyILS(toNumberOrNull(purchasePrice))}</div>
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn" onClick={onClose}>
              סגירה
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="stack">
          <div className="subtleBox">
            <div className="h2" style={{ marginBottom: 10 }}>נתוני רכב</div>
            <div className="grid">
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">יצרן</div>

                {!makeIsCustom ? (
                  <select
                    className="input"
                    value={make || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__other__") {
                        setMake("");
                        setMakeIsCustom(true);
                        setModel("");
                        setModelIsCustom(true);
                        return;
                      }
                      setMake(v);
                      setMakeIsCustom(false);
                      setModel("");
                      setModelIsCustom(false);
                    }}
                    required
                  >
                    <option value="">—</option>
                    {Array.from(
                      new Set([
                        ...Object.keys(MAKE_MODEL_CATALOG || {}),
                        ...Object.keys(makeModelMap || {}),
                      ]),
                    )
                      .sort((a, b) => a.localeCompare(b))
                      .map((mk) => (
                        <option key={mk} value={mk}>
                          {mk}
                        </option>
                      ))}
                    <option value="__other__">אחר...</option>
                  </select>
                ) : (
                  <div className="row" style={{ gap: 8 }}>
                    <input
                      className="input"
                      value={make}
                      onChange={(e) => {
                        setMake(e.target.value);
                        setModel("");
                      }}
                      placeholder="הקלד יצרן"
                      required
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setMakeIsCustom(false);
                        setMake("");
                        setModel("");
                        setModelIsCustom(false);
                      }}
                    >
                      רשימה
                    </button>
                  </div>
                )}
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">דגם</div>

                {!modelIsCustom ? (
                  <select
                    className="input"
                    value={model || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__other__") {
                        setModel("");
                        setModelIsCustom(true);
                        return;
                      }
                      setModel(v);
                      setModelIsCustom(false);
                    }}
                    required
                    disabled={!make}
                  >
                    <option value="">—</option>
                    {Array.from(
                      new Set([
                        ...((MAKE_MODEL_CATALOG && MAKE_MODEL_CATALOG[make]) || []),
                        ...(((makeModelMap || {})[make]) || []),
                      ]),
                    )
                      .filter(Boolean)
                      .sort((a, b) => a.localeCompare(b))
                      .map((md) => (
                        <option key={md} value={md}>
                          {md}
                        </option>
                      ))}
                    <option value="__other__">אחר...</option>
                  </select>
                ) : (
                  <div className="row" style={{ gap: 8 }}>
                    <input
                      className="input"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="הקלד דגם"
                      required
                      disabled={!make && !makeIsCustom}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setModelIsCustom(false);
                        setModel("");
                      }}
                      disabled={!make}
                    >
                      רשימה
                    </button>
                  </div>
                )}
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">שנה</div>
                <input className="input ltrIso" value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">קילומטראז׳ (ק\"מ)</div>
                <input className="input ltrIso" value={mileage} onChange={(e) => setMileage(e.target.value)} inputMode="numeric" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">מספר רישוי</div>
                <input className="input ltrIso" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">צבע</div>
                <input className="input" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">סוג רכב</div>
                <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">—</option>
                  {CAR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">סטטוס</div>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="available">זמין</option>
                  <option value="reserved">שמור</option>
                  <option value="sold">נמכר</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">מחיר מבוקש (₪)</div>
                <input className="input ltrIso" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} inputMode="numeric" required />
              </div>
            </div>
          </div>

          <div className="subtleBox">
            <div className="h2" style={{ marginBottom: 10 }}>רישוי וטסט</div>

            {!detailsLoaded && initial?.id ? (
              <div className="muted">טוען…</div>
            ) : (
              <div className="grid">
                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">תאריך עלייה לכביש</div>
                  <input className="input ltrIso" value={onRoadDate} onChange={(e) => setOnRoadDate(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">טסט אחרון</div>
                  <input className="input ltrIso" value={lastTestDate} onChange={(e) => setLastTestDate(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">בתוקף עד</div>
                  <input className="input ltrIso" value={testValidUntil} onChange={(e) => setTestValidUntil(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="label">סוג בעלות</div>
                  <input className="input" value={ownershipType} onChange={(e) => setOwnershipType(e.target.value)} />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">מס׳ בעלים</div>
                  <input className="input ltrIso" value={ownersCount} onChange={(e) => setOwnersCount(e.target.value)} inputMode="numeric" />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">רמת גימור</div>
                  <input className="input" value={trimLevel} onChange={(e) => setTrimLevel(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="subtleBox">
            <div className="h2" style={{ marginBottom: 10 }}>מפרט</div>

            <div className="grid">
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">סוג דלק</div>
                <input className="input" value={fuelType} onChange={(e) => setFuelType(e.target.value)} />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">תיבת הילוכים</div>
                <input className="input" value={gearbox} onChange={(e) => setGearbox(e.target.value)} />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">נפח מנוע (cc)</div>
                <input className="input ltrIso" value={engineCc} onChange={(e) => setEngineCc(e.target.value)} inputMode="numeric" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">גג נפתח</div>
                <select className="input" value={sunroof} onChange={(e) => setSunroof(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">כן</option>
                  <option value="false">לא</option>
                </select>
              </div>
            </div>
          </div>

          <div className="subtleBox">
            <div className="row space" style={{ marginBottom: 8 }}>
              <div className="h2">תמונת רכב</div>
              <div className="muted">אופציונלי</div>
            </div>

            <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
              <label className="btn" style={{ cursor: "pointer" }}>
                <ImagePlus size={18} /> בחירת תמונה
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>
              <div className="muted" style={{ fontWeight: 900 }}>
                {imageFile ? imageFile.name : "לא נבחר קובץ"}
              </div>
            </div>
          </div>

          <div className="subtleBox">
            <div className="row space" style={{ marginBottom: 8 }}>
              <div className="h2">עלויות פנימיות (מנהלים בלבד)</div>
              <div className="pill warn">מוסתר מהמכירות</div>
            </div>

            {!financeLoaded && initial?.id ? (
              <div className="muted">טוען…</div>
            ) : (
              <div className="grid">
                <div style={{ gridColumn: "span 6" }}>
                  <div className="label">ספק</div>
                  <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">—</option>
                    {(suppliers || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.company}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="label">תאריך רכישה</div>
                  <input className="input ltrIso" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">מחיר קנייה (מחיר הרכב המקורי)</div>
                  <input className="input ltrIso" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} inputMode="numeric" />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">פרסום</div>
                  <input className="input ltrIso" value={adSpend} onChange={(e) => setAdSpend(e.target.value)} inputMode="numeric" />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">דלק</div>
                  <input className="input ltrIso" value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} inputMode="numeric" />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">הוצאות נוספות</div>
                  <input className="input ltrIso" value={otherCost} onChange={(e) => setOtherCost(e.target.value)} inputMode="numeric" />
                </div>

                <div style={{ gridColumn: "span 12" }}>
                  <div className="label">הערות פנימיות</div>
                  <textarea className="input" rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="btn" onClick={onClose}>
              ביטול
            </button>
            <button className="btn primary" disabled={saving}>
              <BadgeCheck size={18} /> {saving ? "..." : "שמירה"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function Cars() {
  const { toast, isAdmin } = useOutletContext();

  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [makeModelsDb, setMakeModelsDb] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [q, setQ] = useState("");
  const [make, setMake] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view"); // view | create | edit
  const [activeRow, setActiveRow] = useState(null);

  const [confirmDel, setConfirmDel] = useState({ open: false, row: null });

  const makeOptions = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => {
      if (!r) return;
      const m = safeText(r.make);
      if (m) s.add(m);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const makeModelMap = useMemo(() => {
    const tmp = {};

    function add(mk, md) {
      const a = safeText(mk);
      const b = safeText(md);
      if (!a || !b) return;
      if (!tmp[a]) tmp[a] = new Set();
      tmp[a].add(b);
    }

    // 1) من قاعدة البيانات (الشركات والموديلات التي أضفتها)
    Object.entries(makeModelsDb || {}).forEach(([mk, list]) => {
      (list || []).forEach((md) => add(mk, md));
    });

    // 2) من السيارات الموجودة
    (rows || []).filter(Boolean).forEach((r) => add(r.make, r.model));

    const out = {};
    Object.keys(tmp).forEach((mk) => {
      out[mk] = Array.from(tmp[mk]).sort((a, b) => a.localeCompare(b));
    });

    return out;
  }, [rows, makeModelsDb]);


  async function loadMakeModels() {
    try {
      const { data: makes, error: e1 } = await supabase
        .from("car_makes")
        .select("id, name")
        .order("name", { ascending: true });
      if (e1) throw e1;

      const { data: models, error: e2 } = await supabase
        .from("car_models")
        .select("make_id, name");
      if (e2) throw e2;

      const makeNameById = {};
      (makes || []).filter(Boolean).forEach((m) => {
        if (m?.id && m?.name) makeNameById[m.id] = m.name;
      });

      const map = {};
      (models || []).filter(Boolean).forEach((md) => {
        const mk = makeNameById[md.make_id];
        const name = safeText(md.name);
        if (!mk || !name) return;
        if (!map[mk]) map[mk] = new Set();
        map[mk].add(name);
      });

      const out = {};
      Object.keys(map).forEach((mk) => {
        out[mk] = Array.from(map[mk]).sort((a, b) => a.localeCompare(b));
      });

      setMakeModelsDb(out);
    } catch (e) {
      // إذا فشلت القراءة لأي سبب، ما منوقف الصفحة
      console.warn(e);
      setMakeModelsDb({});
    }
  }




  async function loadSuppliers() {
    try {
      const { data, error: e } = await supabase
        .from("suppliers")
        .select("id, company")
        .order("company", { ascending: true });
      if (e) throw e;
      setSuppliers((data || []).filter(Boolean));
    } catch (e) {
      console.warn(e);
    }
  }

  async function loadCars() {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("cars")
        .select(
          "id, plate_number, color, make, model, year, type, status, asking_price, mileage, main_image_url, created_at",
        )
        .order("created_at", { ascending: false });

      const qq = safeText(q);
      if (qq) {
        query = query.or(
          `make.ilike.%${qq}%,model.ilike.%${qq}%,plate_number.ilike.%${qq}%`,
        );
      }

      if (make) query = query.eq("make", make);
      if (type) query = query.eq("type", type);
      if (status) query = query.eq("status", status);

      const minN = toNumberOrNull(minPrice);
      const maxN = toNumberOrNull(maxPrice);
      if (minN != null) query = query.gte("asking_price", minN);
      if (maxN != null) query = query.lte("asking_price", maxN);

      const { data, error: err } = await query;
      if (err) throw err;

      setRows((data || []).filter(Boolean));
      setLoading(false);
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
    loadMakeModels();
    loadCars();
  }, []);

  function openCreate() {
    setActiveRow(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function openRow(row) {
    setActiveRow(row);
    setModalMode(isAdmin ? "edit" : "view");
    setModalOpen(true);
  }

  async function onDeleteConfirmed() {
    const row = confirmDel.row;
    if (!row?.id) return;

    try {
      const { error: delErr } = await supabase.from("cars").delete().eq("id", row.id);
      if (delErr) throw delErr;

      toast?.("הרכב נמחק.", "ok");
      setConfirmDel({ open: false, row: null });
      await loadCars();
    } catch (e) {
      toast?.("מחיקת הרכב נכשלה.", "danger");
      console.warn(e);
    }
  }

  return (
    <div className="container">
      <PageHeader
        title="מכוניות"
        subtitle={isAdmin ? "ניהול מכוניות" : "תצוגת מכוניות"}
        actions={
          isAdmin ? (
            <button className="btn primary" onClick={openCreate}>
              <Plus size={18} /> הוספת רכב
            </button>
          ) : null
        }
      />

      <ErrorBanner error={error} />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row space" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <Filter size={18} />
            <div className="h2">מסננים</div>
          </div>
          <button className="btn" onClick={loadCars}>
            רענון
          </button>
        </div>

        <div className="filtersBar">
          <Control icon={Search}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="חיפוש"
            />
          </Control>

          <select className="input" value={make} onChange={(e) => setMake(e.target.value)}>
            <option value="">כל היצרנים</option>
            {makeOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">כל הסוגים</option>
            {CAR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">כל הסטטוסים</option>
            <option value="available">זמין</option>
            <option value="reserved">שמור</option>
            <option value="sold">נמכר</option>
          </select>

          <input
            className="input ltrIso"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="מחיר מ-"
            inputMode="numeric"
            style={{ maxWidth: 150 }}
          />
          <input
            className="input ltrIso"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="עד"
            inputMode="numeric"
            style={{ maxWidth: 150 }}
          />

          <button className="btn gold" onClick={loadCars}>
            <CarIcon size={18} /> החל
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">טוען…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CarIcon}
          title="אין רכבים"
          description={isAdmin ? "הוסף את הרכב הראשון." : "אין רכבים להצגה."}
          actionLabel={isAdmin ? "הוספת רכב" : undefined}
          onAction={isAdmin ? openCreate : undefined}
        />
      ) : (
        <div className="carsGrid">
          {rows.filter(Boolean).map((row) => (
            <div key={row.id} style={{ position: "relative" }}>
              <CarCard row={row} onOpen={() => openRow(row)} />

              {isAdmin ? (
                <div className="carCardActions">
                  <button
                    className="btn"
                    title="עריכה"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveRow(row);
                      setModalMode("edit");
                      setModalOpen(true);
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="btn danger"
                    title="מחיקה"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmDel({ open: true, row });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <CarModal
        open={modalOpen}
        mode={modalMode}
        isAdmin={isAdmin}
        initial={activeRow}
        suppliers={suppliers}
        makeModelMap={makeModelMap}
        onClose={() => setModalOpen(false)}
        onSaved={async () => {
          await loadMakeModels();
          await loadCars();
        }}
        toast={toast}
      />

      <ConfirmDialog
        open={confirmDel.open}
        title="מחיקת רכב"
        message="בטוח למחוק?"
        confirmText="מחיקה"
        cancelText="ביטול"
        danger
        onCancel={() => setConfirmDel({ open: false, row: null })}
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}
