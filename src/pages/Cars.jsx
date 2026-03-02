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
  "Sedan",
  "SUV",
  "Hatchback",
  "Coupe",
  "Pickup",
  "Van",
  "Crossover",
  "Other",
];

const MAKE_MODEL_CATALOG = {
  "كيا": ["بيكانتو", "ريو", "سيراتو", "سبورتاج", "نيرو", "ستونيك", "سورينتو", "كارنفال"],
  "هيونداي": ["i10", "i20", "أكسنت", "إلنترا", "توسان", "كونا", "سانتافي", "أيونيك"],
  "تويوتا": ["كورولا", "ياريس", "كامري", "راف 4", "CH-R", "هايلكس", "لاند كروزر"],
  "سكودا": ["أوكتافيا", "سوبرب", "كودياك", "كاميك", "كاروك", "فابيا"],
  "فولكس فاجن": ["جولف", "بولو", "تيغوان", "باسات", "ت-روك"],
  "مازدا": ["3", "6", "CX-3", "CX-5", "CX-30"],
  "نيسان": ["ميكرا", "سنترا", "قشقاي", "إكس-تريل", "جوك"],
  "ميتسوبيشي": ["أتراج", "لانسر", "ASX", "أوتلاندر", "تريتون"],
  "سوزوكي": ["سويفت", "بالينو", "فيتارا", "سياز", "إرتيجا"],
  "بيجو": ["208", "2008", "3008", "508"],
  "رينو": ["كليو", "كابتور", "ميغان", "كوليوس"],
  "مرسيدس": ["A-Class", "C-Class", "E-Class", "GLA", "GLC"],
  "بي إم دبليو": ["1 Series", "3 Series", "5 Series", "X1", "X3"],
  "أودي": ["A3", "A4", "A6", "Q3", "Q5"],
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
      onClick={onOpen}
      style={{ cursor: "pointer", textAlign: "inherit", padding: 0 }}
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
              {row?.type || "-"} • {row?.mileage ? `${row.mileage.toLocaleString()} كم` : "-"}
            </div>
          </div>

          <Badge variant={statusVariant(row?.status)}>{statusLabel(row?.status)}</Badge>
        </div>

        <div className="row space" style={{ alignItems: "center" }}>
          <div className="price ltrIso">{formatMoneyILS(row?.asking_price)}</div>
          <div className="muted" style={{ fontWeight: 900 }}>{row?.plate_number || ""}</div>
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
        throw new Error("الرجاء إدخال الشركة والموديل.");
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
        toast?.("تم حفظ السيارة، لكن لم يتم حفظ الشركة/الموديل في قائمة الاختيار.", "warn");
      }

      // 4) image upload
      if (imageFile) {
        try {
          await uploadMainImage({ carId: carRow.id, file: imageFile });
        } catch (imgErr) {
          toast?.("تم حفظ السيارة، لكن فشل رفع الصورة.", "warn");
          console.warn(imgErr);
        }
      }

      toast?.(isEdit ? "تم تحديث السيارة." : "تمت إضافة السيارة.", "ok");
      onSaved?.();
      onClose?.();

      setSaving(false);
    } catch (e2) {
      setError(e2);
      setSaving(false);
    }
  }

  const title =
    mode === "view"
      ? "تفاصيل السيارة"
      : isEdit
        ? "تعديل سيارة"
        : "إضافة سيارة";

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <ErrorBanner error={error} />

      {mode === "view" ? (
        <div className="stack">
          <div className="row space" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="h1">{buildCarTitle(initial) || "-"}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {initial?.type || "-"} • {initial?.mileage ? `${initial.mileage.toLocaleString()} كم` : "-"}
              </div>
            </div>
            <Badge variant={statusVariant(initial?.status)}>
              {statusLabel(initial?.status)}
            </Badge>
          </div>

          <div className="subtleBox">
            <div className="label">السعر المطلوب</div>
            <div className="price ltrIso">{formatMoneyILS(initial?.asking_price)}</div>
          </div>

          <div className="subtleBox">
            <KeyValue k="رقم اللوحة" v={initial?.plate_number} />
            <KeyValue k="اللون" v={initial?.color} />
            <KeyValue k="نوع السيارة" v={initial?.type} />
            <KeyValue k="تاريخ نزول للشارع" v={onRoadDate} />
            <KeyValue k="آخر فحص/ترخيص" v={lastTestDate} />
            <KeyValue k="ساري حتى" v={testValidUntil} />
            <KeyValue k="نوع الملكية" v={ownershipType} />
            <KeyValue k="عدد المالكين" v={ownersCount} />
            <KeyValue k="فئة التجهيز" v={trimLevel} />
            <KeyValue k="نوع الوقود" v={fuelType} />
            <KeyValue k="ناقل الحركة" v={gearbox} />
            <KeyValue k="سعة المحرك (cc)" v={engineCc} />
            <KeyValue k="فتحة سقف" v={sunroof === "" ? "" : (sunroof === "true" ? "نعم" : "لا")} />
          </div>

          <div className="subtleBox">
            <div className="label">المورد</div>
            <div style={{ fontWeight: 900 }}>{supplierName || "—"}</div>
          </div>

          {isAdmin ? (
            <div className="subtleBox">
              <div className="label">سعر الشراء (داخلي)</div>
              <div className="price ltrIso">{formatMoneyILS(toNumberOrNull(purchasePrice))}</div>
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn" onClick={onClose}>
              إغلاق
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="stack">
          <div className="subtleBox">
            <div className="h2" style={{ marginBottom: 10 }}>بيانات السيارة</div>
            <div className="grid">
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">الشركة</div>

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
                    <option value="__other__">أخرى...</option>
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
                      placeholder="اكتب الشركة"
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
                      قائمة
                    </button>
                  </div>
                )}
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">الموديل</div>

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
                    <option value="__other__">أخرى...</option>
                  </select>
                ) : (
                  <div className="row" style={{ gap: 8 }}>
                    <input
                      className="input"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="اكتب الموديل"
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
                      قائمة
                    </button>
                  </div>
                )}
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">السنة</div>
                <input className="input ltrIso" value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">الممشى (كم)</div>
                <input className="input ltrIso" value={mileage} onChange={(e) => setMileage(e.target.value)} inputMode="numeric" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">رقم اللوحة</div>
                <input className="input ltrIso" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">اللون</div>
                <input className="input" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">نوع السيارة</div>
                <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">—</option>
                  {CAR_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">الحالة</div>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="available">متاح</option>
                  <option value="reserved">محجوز</option>
                  <option value="sold">مباع</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">السعر المطلوب (₪)</div>
                <input className="input ltrIso" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} inputMode="numeric" required />
              </div>
            </div>
          </div>

          <div className="subtleBox">
            <div className="h2" style={{ marginBottom: 10 }}>الرخصة والفحص</div>

            {!detailsLoaded && initial?.id ? (
              <div className="muted">جاري التحميل…</div>
            ) : (
              <div className="grid">
                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">تاريخ نزول للشارع</div>
                  <input className="input ltrIso" value={onRoadDate} onChange={(e) => setOnRoadDate(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">آخر فحص/ترخيص</div>
                  <input className="input ltrIso" value={lastTestDate} onChange={(e) => setLastTestDate(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">ساري حتى</div>
                  <input className="input ltrIso" value={testValidUntil} onChange={(e) => setTestValidUntil(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="label">نوع الملكية</div>
                  <input className="input" value={ownershipType} onChange={(e) => setOwnershipType(e.target.value)} />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">عدد المالكين</div>
                  <input className="input ltrIso" value={ownersCount} onChange={(e) => setOwnersCount(e.target.value)} inputMode="numeric" />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">فئة التجهيز</div>
                  <input className="input" value={trimLevel} onChange={(e) => setTrimLevel(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="subtleBox">
            <div className="h2" style={{ marginBottom: 10 }}>مواصفات</div>

            <div className="grid">
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">نوع الوقود</div>
                <input className="input" value={fuelType} onChange={(e) => setFuelType(e.target.value)} />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">ناقل الحركة</div>
                <input className="input" value={gearbox} onChange={(e) => setGearbox(e.target.value)} />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">سعة المحرك (cc)</div>
                <input className="input ltrIso" value={engineCc} onChange={(e) => setEngineCc(e.target.value)} inputMode="numeric" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">فتحة سقف</div>
                <select className="input" value={sunroof} onChange={(e) => setSunroof(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>
            </div>
          </div>

          <div className="subtleBox">
            <div className="row space" style={{ marginBottom: 8 }}>
              <div className="h2">صورة السيارة</div>
              <div className="muted">اختياري</div>
            </div>

            <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
              <label className="btn" style={{ cursor: "pointer" }}>
                <ImagePlus size={18} /> اختيار صورة
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>
              <div className="muted" style={{ fontWeight: 900 }}>
                {imageFile ? imageFile.name : "لم يتم اختيار ملف"}
              </div>
            </div>
          </div>

          <div className="subtleBox">
            <div className="row space" style={{ marginBottom: 8 }}>
              <div className="h2">تكاليف داخلية (للأدمن فقط)</div>
              <div className="pill warn">مخفي عن المبيعات</div>
            </div>

            {!financeLoaded && initial?.id ? (
              <div className="muted">جاري التحميل…</div>
            ) : (
              <div className="grid">
                <div style={{ gridColumn: "span 6" }}>
                  <div className="label">المورد</div>
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
                  <div className="label">تاريخ الشراء</div>
                  <input className="input ltrIso" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">سعر الشراء (سعر السيارة الأصلي)</div>
                  <input className="input ltrIso" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} inputMode="numeric" />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">إعلانات</div>
                  <input className="input ltrIso" value={adSpend} onChange={(e) => setAdSpend(e.target.value)} inputMode="numeric" />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">بنزين</div>
                  <input className="input ltrIso" value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} inputMode="numeric" />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">مصاريف أخرى</div>
                  <input className="input ltrIso" value={otherCost} onChange={(e) => setOtherCost(e.target.value)} inputMode="numeric" />
                </div>

                <div style={{ gridColumn: "span 12" }}>
                  <div className="label">ملاحظات داخلية</div>
                  <textarea className="input" rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="btn" onClick={onClose}>
              إلغاء
            </button>
            <button className="btn primary" disabled={saving}>
              <BadgeCheck size={18} /> {saving ? "..." : "حفظ"}
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

      toast?.("تم حذف السيارة.", "ok");
      setConfirmDel({ open: false, row: null });
      await loadCars();
    } catch (e) {
      toast?.("فشل حذف السيارة.", "danger");
      console.warn(e);
    }
  }

  return (
    <div className="container">
      <PageHeader
        title="السيارات"
        subtitle={isAdmin ? "إدارة السيارات" : "عرض السيارات"}
        actions={
          isAdmin ? (
            <button className="btn primary" onClick={openCreate}>
              <Plus size={18} /> إضافة سيارة
            </button>
          ) : null
        }
      />

      <ErrorBanner error={error} />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row space" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <Filter size={18} />
            <div className="h2">فلاتر</div>
          </div>
          <button className="btn" onClick={loadCars}>
            تحديث
          </button>
        </div>

        <div className="filtersBar">
          <Control icon={Search}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث"
            />
          </Control>

          <select className="input" value={make} onChange={(e) => setMake(e.target.value)}>
            <option value="">كل الشركات</option>
            {makeOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">كل الأنواع</option>
            {CAR_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">كل الحالات</option>
            <option value="available">متاح</option>
            <option value="reserved">محجوز</option>
            <option value="sold">مباع</option>
          </select>

          <input
            className="input ltrIso"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="سعر من"
            inputMode="numeric"
            style={{ maxWidth: 150 }}
          />
          <input
            className="input ltrIso"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="سعر إلى"
            inputMode="numeric"
            style={{ maxWidth: 150 }}
          />

          <button className="btn gold" onClick={loadCars}>
            <CarIcon size={18} /> تطبيق
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">جاري التحميل…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CarIcon}
          title="لا يوجد سيارات"
          description={isAdmin ? "أضف أول سيارة." : "لا يوجد سيارات للعرض."}
          actionLabel={isAdmin ? "إضافة سيارة" : undefined}
          onAction={isAdmin ? openCreate : undefined}
        />
      ) : (
        <div className="carsGrid">
          {rows.filter(Boolean).map((row) => (
            <div key={row.id} style={{ position: "relative" }}>
              <CarCard row={row} onOpen={() => openRow(row)} />

              {isAdmin ? (
                <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    title="تعديل"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveRow(row);
                      setModalMode("edit");
                      setModalOpen(true);
                    }}
                    style={{ padding: "8px 10px" }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="btn danger"
                    title="حذف"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmDel({ open: true, row });
                    }}
                    style={{ padding: "8px 10px" }}
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
        title="حذف سيارة"
        message="هل أنت متأكد؟"
        confirmText="حذف"
        cancelText="إلغاء"
        danger
        onCancel={() => setConfirmDel({ open: false, row: null })}
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}
