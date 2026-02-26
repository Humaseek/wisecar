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

function buildCarTitle(row) {
  if (!row) return "";
  const parts = [row.make, row.model, row.year].filter(Boolean);
  return parts.join(" ");
}

async function uploadMainImage({ carId, file }) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ext.length > 6 ? "jpg" : ext;

  const uid =
    (typeof crypto !== "undefined" &&
      crypto.randomUUID &&
      crypto.randomUUID()) ||
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
      // لا نوقف العملية لو فشل الإدخال (بس نتأكد أن الرئيسية تتحدث)
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
        <div
          className="row space"
          style={{ gap: 10, alignItems: "flex-start" }}
        >
          <div>
            <div className="carTitle">{buildCarTitle(row) || "-"}</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {row?.type || "-"} •{" "}
              {row?.mileage ? `${row.mileage.toLocaleString()} كم` : "-"}
            </div>
          </div>

          <Badge variant={statusVariant(row?.status)}>
            {statusLabel(row?.status)}
          </Badge>
        </div>

        <div className="row space" style={{ alignItems: "center" }}>
          <div className="price ltrIso">
            {formatMoneyILS(row?.asking_price)}
          </div>
          <div className="muted" style={{ fontWeight: 900 }}>
            {row?.make || ""}
          </div>
        </div>
      </div>
    </button>
  );
}

function CarModal({ open, mode, isAdmin, initial, onClose, onSaved, toast }) {
  const isEdit = mode === "edit";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("available");
  const [mileage, setMileage] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [description, setDescription] = useState("");
  const [vin, setVin] = useState("");

  // Admin-only finance
  const [purchasePrice, setPurchasePrice] = useState("");
  const [adSpend, setAdSpend] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [otherCost, setOtherCost] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [financeLoaded, setFinanceLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setImageFile(null);

    setMake(initial?.make || "");
    setModel(initial?.model || "");
    setYear(initial?.year ? String(initial.year) : "");
    setType(initial?.type || "");
    setStatus(initial?.status || "available");
    setMileage(initial?.mileage ? String(initial.mileage) : "");
    setAskingPrice(initial?.asking_price ? String(initial.asking_price) : "");
    setDescription(initial?.description || "");
    setVin(initial?.vin || "");

    setPurchasePrice("");
    setAdSpend("");
    setFuelCost("");
    setOtherCost("");
    setFinanceLoaded(false);

    async function loadFinance() {
      if (!isAdmin || !initial?.id) return;
      const { data, error: finErr } = await supabase
        .from("car_finance")
        .select("purchase_price, ad_spend, fuel_cost, other_cost")
        .eq("car_id", initial.id)
        .maybeSingle();

      if (finErr) {
        console.warn(finErr);
        setFinanceLoaded(true);
        return;
      }

      setPurchasePrice(
        data?.purchase_price != null ? String(data.purchase_price) : "",
      );
      setAdSpend(data?.ad_spend != null ? String(data.ad_spend) : "");
      setFuelCost(data?.fuel_cost != null ? String(data.fuel_cost) : "");
      setOtherCost(data?.other_cost != null ? String(data.other_cost) : "");
      setFinanceLoaded(true);
    }

    loadFinance();
  }, [open, initial, isAdmin]);

  async function onSubmit(e) {
    e?.preventDefault?.();
    if (!isAdmin) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        make: safeText(make),
        model: safeText(model),
        year: toNumberOrNull(year),
        type: safeText(type) || null,
        status,
        mileage: toNumberOrNull(mileage),
        asking_price: toNumberOrNull(askingPrice) || 0,
        description: safeText(description) || null,
        vin: safeText(vin) || null,
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

      // Finance (admin)
      const finPayload = {
        car_id: carRow.id,
        purchase_price: toNumberOrNull(purchasePrice),
        ad_spend: toNumberOrNull(adSpend),
        fuel_cost: toNumberOrNull(fuelCost),
        other_cost: toNumberOrNull(otherCost),
      };

      const anyFin =
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

      // Image upload (optional)
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
    mode === "view" ? "تفاصيل السيارة" : isEdit ? "تعديل سيارة" : "إضافة سيارة";

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <ErrorBanner error={error} />

      {mode === "view" ? (
        <div className="stack">
          <div className="row space" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="h1">{buildCarTitle(initial) || "-"}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {initial?.type || "-"} •{" "}
                {initial?.mileage
                  ? `${initial.mileage.toLocaleString()} كم`
                  : "-"}
              </div>
            </div>
            <Badge variant={statusVariant(initial?.status)}>
              {statusLabel(initial?.status)}
            </Badge>
          </div>

          <div className="subtleBox">
            <div className="label">السعر المطلوب</div>
            <div className="price ltrIso">
              {formatMoneyILS(initial?.asking_price)}
            </div>
          </div>

          {initial?.description ? (
            <div className="subtleBox">
              <div className="label">وصف</div>
              <div style={{ fontWeight: 900, lineHeight: 1.8 }}>
                {initial.description}
              </div>
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
          <div className="grid">
            <div style={{ gridColumn: "span 4" }}>
              <div className="label">الشركة</div>
              <input
                className="input"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="Toyota"
                required
              />
            </div>
            <div style={{ gridColumn: "span 4" }}>
              <div className="label">الموديل</div>
              <input
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Corolla"
                required
              />
            </div>
            <div style={{ gridColumn: "span 4" }}>
              <div className="label">السنة</div>
              <input
                className="input"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2020"
                inputMode="numeric"
              />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">النوع</div>
              <select
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">—</option>
                {CAR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">الحالة</div>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="available">متاح</option>
                <option value="reserved">محجوز</option>
                <option value="sold">مباع</option>
              </select>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">الممشى (كم)</div>
              <input
                className="input"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="85000"
                inputMode="numeric"
              />
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="label">السعر المطلوب (₪)</div>
              <input
                className="input"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                placeholder="65000"
                inputMode="numeric"
                required
              />
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <div className="label">VIN (اختياري)</div>
              <input
                className="input"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="JTD..."
              />
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div className="label">وصف</div>
              <textarea
                className="input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="تفاصيل سريعة عن السيارة..."
              />
            </div>
          </div>

          <div className="subtleBox">
            <div className="row space" style={{ marginBottom: 8 }}>
              <div className="h2">صورة السيارة</div>
              <div className="muted">اختياري</div>
            </div>

            <div className="row" style={{ flexWrap: "wrap" }}>
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
              <div className="h2">المالية الداخلية (للأدمن فقط)</div>
              <div className="pill warn">مخفي عن المبيعات</div>
            </div>

            {!financeLoaded && initial?.id ? (
              <div className="muted">جاري تحميل…</div>
            ) : (
              <div className="grid">
                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">سعر الشراء</div>
                  <input
                    className="input"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder=""
                    inputMode="numeric"
                  />
                </div>
                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">إعلانات</div>
                  <input
                    className="input"
                    value={adSpend}
                    onChange={(e) => setAdSpend(e.target.value)}
                    placeholder=""
                    inputMode="numeric"
                  />
                </div>
                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">بنزين</div>
                  <input
                    className="input"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    placeholder=""
                    inputMode="numeric"
                  />
                </div>
                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">مصاريف أخرى</div>
                  <input
                    className="input"
                    value={otherCost}
                    onChange={(e) => setOtherCost(e.target.value)}
                    placeholder=""
                    inputMode="numeric"
                  />
                </div>
              </div>
            )}
          </div>

          <div
            className="row"
            style={{ justifyContent: "flex-end", flexWrap: "wrap" }}
          >
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [q, setQ] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [make, setMake] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [suppliers, setSuppliers] = useState([]);
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

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years = [];
    for (let y = current; y >= 1990; y--) years.push(y);
    return years;
  }, []);

  const sliderMax = useMemo(() => {
    const max = (rows || []).reduce((acc, r) => {
      const v = Number(r?.asking_price || 0);
      return Number.isFinite(v) && v > acc ? v : acc;
    }, 0);

    const base = Math.max(50000, max || 0);
    // round up to a nice number
    return Math.ceil(base / 5000) * 5000;
  }, [rows]);

  async function loadSuppliers() {
    try {
      // Admin only (RLS). Sales users won't be able to read suppliers table.
      const { data, error: err } = await supabase
        .from("suppliers")
        .select("id, company")
        .order("company", { ascending: true });

      if (err) throw err;
      setSuppliers((data || []).filter(Boolean));
    } catch (e) {
      // Don't block the page if suppliers fail to load
      console.warn(e);
      setSuppliers([]);
    }
  }

  async function loadCars(overrides = {}) {
    setLoading(true);
    setError(null);

    // Resolve filters (overrides first, then state)
    const qVal = overrides.q ?? q;
    const supplierIdVal = overrides.supplierId ?? supplierId;
    const makeVal = overrides.make ?? make;
    const typeVal = overrides.type ?? type;
    const statusVal = overrides.status ?? status;
    const yearVal = overrides.year ?? year;
    const sortByVal = overrides.sortBy ?? sortBy;
    const minPriceVal = overrides.minPrice ?? minPrice;
    const maxPriceVal = overrides.maxPrice ?? maxPrice;

    try {
      const selectFields =
        "id, make, model, year, type, status, asking_price, mileage, description, vin, plate_number, stock_no, main_image_url, created_at" +
        (isAdmin ? ", car_finance(supplier_id)" : "");

      let query = supabase
        .from("cars")
        .select(selectFields)
        .order("created_at", { ascending: sortByVal === "oldest" });

      const qq = safeText(qVal);
      if (qq) {
        query = query.or(
          `make.ilike.%${qq}%,model.ilike.%${qq}%,vin.ilike.%${qq}%,plate_number.ilike.%${qq}%,stock_no.ilike.%${qq}%`,
        );
      }

      if (makeVal) query = query.eq("make", makeVal);
      if (typeVal) query = query.eq("type", typeVal);
      if (statusVal) query = query.eq("status", statusVal);

      const yN = toNumberOrNull(yearVal);
      if (yN != null) query = query.eq("year", yN);

      if (isAdmin && supplierIdVal) {
        query = query.eq("car_finance.supplier_id", supplierIdVal);
      }

      const minN = toNumberOrNull(minPriceVal);
      const maxN = toNumberOrNull(maxPriceVal);
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

  function resetFilters() {
    const cleared = {
      q: "",
      supplierId: "",
      make: "",
      type: "",
      status: "",
      year: "",
      sortBy: "newest",
      minPrice: "",
      maxPrice: "",
    };

    setQ("");
    setSupplierId("");
    setMake("");
    setType("");
    setStatus("");
    setYear("");
    setSortBy("newest");
    setMinPrice("");
    setMaxPrice("");

    loadCars(cleared);
  }

  useEffect(() => {
    loadCars();
  }, []);

  useEffect(() => {
    if (isAdmin) loadSuppliers();
  }, [isAdmin]);


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
      const { error: delErr } = await supabase
        .from("cars")
        .delete()
        .eq("id", row.id);
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
        title="ניהול רכבים"
        subtitle="מערכת פנימית לניהול המלאי של Wisecar. לא קשור ישירות לאתר הציבורי."
        actions={
          isAdmin ? (
            <button className="btn primary" onClick={openCreate} style={{ borderRadius: 999 }}>
              <Plus size={18} /> + הוספת רכב חדש
            </button>
          ) : null
        }
      /> إضافة سيارة
            </button>
          ) : null
        }
      />

      <ErrorBanner error={error} />

      <div className="card" style={{ marginBottom: 14, direction: "rtl" }}>
        <div className="row space" style={{ marginBottom: 12, alignItems: "flex-end" }}>
          <div className="row" style={{ gap: 10 }}>
            <Filter size={18} />
            <div className="h2">מסננים</div>
          </div>
          <button className="btn" onClick={() => loadCars()}>
            רענון
          </button>
        </div>

        {/** Inspired by the provided screenshot: labeled fields + hints + price range */} 
        <div style={{ display: "grid", gap: 14 }}>
          {/* Row 1 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isAdmin
                ? "1.8fr 1fr 1fr 1fr 1fr"
                : "2.2fr 1fr 1fr 1fr",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="label">חיפוש חופשי</div>
              <Control icon={Search}>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="חיפוש לפי חברה / דגם / לוחית"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadCars();
                  }}
                />
              </Control>
              <div className="muted" style={{ fontSize: 12 }}>
                חיפוש לפי: חברה / דגם / VIN / לוחית
              </div>
            </div>

            {isAdmin ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="label">ספק</div>
                <select
                  className="input"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">כל הספקים</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.company}
                    </option>
                  ))}
                </select>
                <div className="muted" style={{ fontSize: 12 }}>
                  אפשר לבחור ספק אחד
                </div>
              </div>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="label">חברה</div>
              <select className="input" value={make} onChange={(e) => setMake(e.target.value)}>
                <option value="">כל החברות</option>
                {makeOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <div className="muted" style={{ fontSize: 12 }}>
                אפשר לבחור חברה אחת או יותר
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="label">סטטוס רכב</div>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">כל המצבים</option>
                <option value="available">זמין</option>
                <option value="reserved">שמורה</option>
                <option value="sold">נמכר</option>
              </select>
              <div className="muted" style={{ fontSize: 12 }}>
                אפשר לבחור סטטוס אחד או יותר
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="label">מיון לפי פרסום</div>
              <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">החדש ביותר</option>
                <option value="oldest">הישן ביותר</option>
              </select>
              <div className="muted" style={{ fontSize: 12 }}>
                מיון לפי תאריך יצירה
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 2fr auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="label">סוג רכב</div>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">כל הסוגים</option>
                {CAR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div className="muted" style={{ fontSize: 12 }}>
                אפשר לבחור סוג אחד או יותר
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="label">שנת ייצור</div>
              <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">כל השנים</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              <div className="muted" style={{ fontSize: 12 }}>
                אפשר לבחור כמה שנים
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="label">טווח מחיר (₪)</div>

              <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  className="input"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="מ-"
                  inputMode="numeric"
                  style={{ maxWidth: 140 }}
                />
                <div className="muted" style={{ fontWeight: 900 }}>
                  עד
                </div>
                <input
                  className="input"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="עד"
                  inputMode="numeric"
                  style={{ maxWidth: 140 }}
                />
              </div>

              {(() => {
                const minV = Math.max(0, toNumberOrNull(minPrice) ?? 0);
                const maxV = Math.max(0, toNumberOrNull(maxPrice) ?? sliderMax);
                const safeMin = Math.min(minV, sliderMax);
                const safeMax = Math.min(Math.max(maxV, safeMin), sliderMax);

                return (
                  <div style={{ position: "relative", height: 26 }}>
                    <input
                      type="range"
                      min={0}
                      max={sliderMax}
                      step={500}
                      value={safeMin}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const curMax = toNumberOrNull(maxPrice) ?? sliderMax;
                        setMinPrice(String(Math.min(v, curMax)));
                      }}
                      style={{ position: "absolute", inset: 0, width: "100%" }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={sliderMax}
                      step={500}
                      value={safeMax}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const curMin = toNumberOrNull(minPrice) ?? 0;
                        setMaxPrice(String(Math.max(v, curMin)));
                      }}
                      style={{ position: "absolute", inset: 0, width: "100%" }}
                    />
                  </div>
                );
              })()}

              <div className="muted" style={{ fontSize: 12 }}>
                גרור את הידיות כדי לעדכן את הערכים ידנית
              </div>
            </div>

            <button className="btn" onClick={resetFilters} style={{ whiteSpace: "nowrap" }}>
              איפוס מסננים
            </button>
          </div>

          {/* Actions */}
          <div className="row" style={{ justifyContent: "flex-start", gap: 10, flexWrap: "wrap" }}>
            <button className="btn gold" onClick={() => loadCars()}>
              <CarIcon size={18} /> הפעל מסננים
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">جاري التحميل…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CarIcon}
          title="لا يوجد سيارات"
          description={
            isAdmin
              ? "ابدأ بإضافة أول سيارة للمخزون."
              : "اطلب من الأدمن إضافة سيارات."
          }
          actionLabel={isAdmin ? "إضافة سيارة" : undefined}
          onAction={isAdmin ? openCreate : undefined}
        />
      ) : (
        <div className="carsGrid">
          {rows.filter(Boolean).map((row) => (
            <div key={row.id} style={{ position: "relative" }}>
              <CarCard row={row} onOpen={() => openRow(row)} />

              {isAdmin ? (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    display: "flex",
                    gap: 8,
                  }}
                >
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
        onClose={() => setModalOpen(false)}
        onSaved={loadCars}
        toast={toast}
      />

      <ConfirmDialog
        open={confirmDel.open}
        title="حذف سيارة"
        message="هل أنت متأكد؟ سيتم حذف السيارة وكل صورها/ماليتها المرتبطة بها."
        confirmText="حذف"
        cancelText="إلغاء"
        danger
        onCancel={() => setConfirmDel({ open: false, row: null })}
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}
