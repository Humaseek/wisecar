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

const PRICE_MIN = 0;
const PRICE_MAX = 500000;

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
  const [make, setMake] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [year, setYear] = useState("");
  const [supplierId, setSupplierId] = useState(""); // admin only
  const [suppliers, setSuppliers] = useState([]); // admin only

  const [minRange, setMinRange] = useState(PRICE_MIN);
  const [maxRange, setMaxRange] = useState(PRICE_MAX);

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
    const s = new Set();
    rows.forEach((r) => {
      if (!r) return;
      if (r.year != null) s.add(String(r.year));
    });
    return Array.from(s).sort((a, b) => Number(b) - Number(a));
  }, [rows]);


  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const { data, error: e } = await supabase
          .from("suppliers")
          .select("id, company")
          .order("company", { ascending: true });
        if (e) throw e;
        setSuppliers((data || []).filter(Boolean));
      } catch (err) {
        // If RLS blocks or table missing, ignore
        console.warn(err);
      }
    })();
  }, [isAdmin]);

  async function loadCars() {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("cars")
        .select(
          "id, make, model, year, type, status, asking_price, mileage, description, vin, main_image_url, created_at",
        )
        .order("created_at", { ascending: false });

      const qq = safeText(q);
      if (qq) {
        query = query.or(
          `make.ilike.%${qq}%,model.ilike.%${qq}%,vin.ilike.%${qq}%`,
        );
      }

      if (make) query = query.eq("make", make);
      if (type) query = query.eq("type", type);
      if (status) query = query.eq("status", status);

      const y = toNumberOrNull(year);
      if (y != null) query = query.eq("year", y);

      if (isAdmin && supplierId) {
        const { data: finRows, error: finErr } = await supabase
          .from("car_finance")
          .select("car_id")
          .eq("supplier_id", supplierId);
        if (finErr) throw finErr;
        const ids = (finRows || []).map((r) => r.car_id).filter(Boolean);
        if (ids.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }
        query = query.in("id", ids);
      }

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

  function resetFilters() {
    setQ("");
    setMake("");
    setType("");
    setStatus("");
    setYear("");
    setSupplierId("");
    setMinPrice("");
    setMaxPrice("");
    setMinRange(PRICE_MIN);
    setMaxRange(PRICE_MAX);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function onMinPriceInput(val) {
    setMinPrice(val);
    const n = toNumberOrNull(val);
    if (n == null) {
      setMinRange(PRICE_MIN);
      return;
    }
    const next = clamp(n, PRICE_MIN, maxRange);
    setMinRange(next);
    if (next > maxRange) {
      setMaxRange(next);
      setMaxPrice(String(next));
    }
  }

  function onMaxPriceInput(val) {
    setMaxPrice(val);
    const n = toNumberOrNull(val);
    if (n == null) {
      setMaxRange(PRICE_MAX);
      return;
    }
    const next = clamp(n, minRange, PRICE_MAX);
    setMaxRange(next);
    if (next < minRange) {
      setMinRange(next);
      setMinPrice(String(next));
    }
  }

  function onMinRangeChange(val) {
    const n = clamp(val, PRICE_MIN, maxRange);
    setMinRange(n);
    setMinPrice(String(n));
  }

  function onMaxRangeChange(val) {
    const n = clamp(val, minRange, PRICE_MAX);
    setMaxRange(n);
    setMaxPrice(String(n));
  }

  return (
    <div className="container">
      <PageHeader
        title="السيارات"
        subtitle={
          isAdmin
            ? "أدمن: إضافة/تعديل/حذف + مالية داخلية مخفية عن المبيعات"
            : "مبيعات: مشاهدة السيارات مع السعر المطلوب فقط"
        }
        actions={
          isAdmin ? (
            <button className="btn primary" onClick={openCreate}>
              <Plus size={18} /> إضافة سيارة
            </button>
          ) : null
        }
      />

      <ErrorBanner error={error} />

      <div className="card" style={{ marginBottom: 14, direction: "rtl" }}>
        <div className="row space" style={{ alignItems: "flex-start", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="h2">بحث وفلاتر</div>
            <div className="muted">فلتر حسب الشركة/النوع/الحالة/السعر/السنة مثل شكل الصورة.</div>
          </div>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={resetFilters}>إعادة ضبط</button>
            <button className="btn gold" onClick={loadCars}>
              <CarIcon size={18} /> تطبيق
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isAdmin ? "repeat(6, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div style={{ gridColumn: isAdmin ? "span 2" : "span 2" }}>
            <div className="label">بحث حر</div>
            <Control icon={Search}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="بحث حسب: شركة / موديل / VIN"
              />
            </Control>
            <div className="muted" style={{ fontSize: 12 }}>اكتب كلمات، ثم اضغط تطبيق.</div>
          </div>

          <div>
            <div className="label">סטטוס רכב</div>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">كل الحالات</option>
              <option value="available">متاح</option>
              <option value="reserved">محجوز</option>
              <option value="sold">مباع</option>
            </select>
            <div className="muted" style={{ fontSize: 12 }}>اختر حالة السيارة.</div>
          </div>

          <div>
            <div className="label">חברה</div>
            <select className="input" value={make} onChange={(e) => setMake(e.target.value)}>
              <option value="">كل الشركات</option>
              {makeOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="muted" style={{ fontSize: 12 }}>ممكن تختار شركة معيّنة.</div>
          </div>

          <div>
            <div className="label">סטטוס / סוג רכב</div>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">كل الأنواع</option>
              {CAR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className="muted" style={{ fontSize: 12 }}>اختر نوع/تصنيف السيارة.</div>
          </div>

          <div>
            <div className="label">שנת ייצור</div>
            <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">كل السنوات</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="muted" style={{ fontSize: 12 }}>اختيار سنة محددة.</div>
          </div>

          {isAdmin ? (
            <div>
              <div className="label">ספק</div>
              <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">كل الموردين</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company}
                  </option>
                ))}
              </select>
              <div className="muted" style={{ fontSize: 12 }}>فلترة حسب المورد (للأدمن).</div>
            </div>
          ) : null}

          <div style={{ gridColumn: isAdmin ? "span 3" : "span 2" }}>
            <div className="label">טווח מחיר (₪)</div>
            <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="input ltrIso"
                value={minPrice}
                onChange={(e) => onMinPriceInput(e.target.value)}
                placeholder="من"
                inputMode="numeric"
                style={{ maxWidth: 140 }}
              />
              <div className="muted" style={{ fontWeight: 900 }}>إلى</div>
              <input
                className="input ltrIso"
                value={maxPrice}
                onChange={(e) => onMaxPriceInput(e.target.value)}
                placeholder="إلى"
                inputMode="numeric"
                style={{ maxWidth: 140 }}
              />
            </div>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              <input
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                value={minRange}
                onChange={(e) => onMinRangeChange(Number(e.target.value))}
              />
              <input
                type="range"
                min={PRICE_MIN}
                max={PRICE_MAX}
                value={maxRange}
                onChange={(e) => onMaxRangeChange(Number(e.target.value))}
              />
            </div>
            <div className="muted" style={{ fontSize: 12 }}>حرّك السلايدر أو اكتب رقم، ثم اضغط تطبيق.</div>
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