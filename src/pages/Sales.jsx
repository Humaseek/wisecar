import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BadgeDollarSign,
  Plus,
  Search,
  BadgeCheck,
  Calendar,
  Car,
  UsersRound,
  CreditCard,
  Trash2,
  UserPlus,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import Control from "../components/Control";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import ErrorBanner from "../components/ErrorBanner";
import EmptyState from "../components/EmptyState";

import { supabase } from "../supabaseClient";
import { formatMoneyILS, safeText, toNumberOrNull } from "../utils/format";

const PAYMENT_METHODS = [
  { value: "cash", label: "كاش" },
  { value: "bank", label: "تحويل بنكي" },
  { value: "credit", label: "بطاقة" },
  { value: "check", label: "شيك" },
  { value: "other", label: "أخرى" },
];

function buildCarTitle(row) {
  const parts = [row.make, row.model, row.year].filter(Boolean);
  return parts.join(" ");
}

function isoFromLocalDatetime(value) {
  // value from <input type="datetime-local"> is local time without timezone.
  // Convert to ISO with timezone by creating Date.
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function QuickCustomerModal({ open, onClose, onCreated, toast }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setFullName("");
    setPhone("");
    setEmail("");
  }, [open]);

  async function onSubmit(e) {
    e?.preventDefault?.();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        full_name: safeText(fullName),
        phone: safeText(phone) || null,
        email: safeText(email) || null,
      };
      if (!payload.full_name) throw new Error("الرجاء إدخال اسم الزبون.");

      const { data, error: insErr } = await supabase
        .from("customers")
        .insert(payload)
        .select("id, full_name")
        .single();
      if (insErr) throw insErr;

      toast?.("تمت إضافة الزبون.", "ok");
      onCreated?.(data);
      onClose?.();
      setSaving(false);
    } catch (e2) {
      setError(e2);
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="إضافة زبون سريع" onClose={onClose}>
      <ErrorBanner error={error} />
      <form onSubmit={onSubmit} className="stack">
        <div className="grid">
          <div style={{ gridColumn: "span 12" }}>
            <div className="label">اسم الزبون</div>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="محمد أحمد" required />
          </div>
          <div style={{ gridColumn: "span 6" }}>
            <div className="label">الهاتف</div>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-0000000" />
          </div>
          <div style={{ gridColumn: "span 6" }}>
            <div className="label">الإيميل</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" type="email" inputMode="email" />
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn primary" disabled={saving}>
            <BadgeCheck size={18} /> {saving ? "..." : "حفظ"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SaleModal({ open, cars, customers, defaultCarId, onClose, onSaved, toast, canCreateCustomer }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [carId, setCarId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [soldAt, setSoldAt] = useState("");
  const [notes, setNotes] = useState("");

  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localVal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    setCarId(defaultCarId || "");
    setCustomerId("");
    setSoldPrice("");
    setPaymentMethod("cash");
    setSoldAt(localVal);
    setNotes("");
  }, [open, defaultCarId]);

  const chosenCar = useMemo(() => cars.find((c) => c.id === carId) || null, [cars, carId]);

  useEffect(() => {
    if (!open) return;
    // auto-fill price from asking price when user selects car (only if empty)
    if (chosenCar && soldPrice === "") {
      const p = Number(chosenCar.asking_price);
      if (Number.isFinite(p) && p > 0) setSoldPrice(String(p));
    }
  }, [open, chosenCar, soldPrice]);

  async function onSubmit(e) {
    e?.preventDefault?.();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        car_id: carId || null,
        customer_id: customerId || null,
        sold_price: toNumberOrNull(soldPrice) || 0,
        payment_method: paymentMethod || null,
        sold_at: isoFromLocalDatetime(soldAt) || null,
        notes: safeText(notes) || null,
        // salesperson_id will be forced by RLS/trigger (sales) or can be set by admin if needed.
      };

      if (!payload.car_id) throw new Error("اختر سيارة.");
      if (!payload.customer_id) throw new Error("اختر زبون.");
      if (!payload.sold_price || payload.sold_price <= 0) throw new Error("ادخل سعر البيع.");

      const { error: insErr } = await supabase.from("sales").insert(payload);
      if (insErr) throw insErr;

      toast?.("تم تسجيل البيع.", "ok");
      onSaved?.();
      onClose?.();
      setSaving(false);
    } catch (e2) {
      setError(e2);
      setSaving(false);
    }
  }

  return (
    <>
      <Modal open={open} title="تسجيل بيع" onClose={onClose}>
        <ErrorBanner error={error} />

        <form onSubmit={onSubmit} className="stack">
          <div className="grid">
            <div style={{ gridColumn: "span 12" }}>
              <div className="label">السيارة</div>
              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <select className="input" style={{ flex: "1 1 320px" }} value={carId} onChange={(e) => setCarId(e.target.value)}>
                  <option value="">— اختر سيارة —</option>
                  {cars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {buildCarTitle(c)} — {formatMoneyILS(c.asking_price)} — {c.status === "reserved" ? "محجوز" : "متاح"}
                    </option>
                  ))}
                </select>
                {chosenCar ? (
                  <div className="pill info" title="السعر المطلوب">
                    <Car size={16} /> المطلوب: {formatMoneyILS(chosenCar.asking_price)}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div className="label">الزبون</div>
              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <select className="input" style={{ flex: "1 1 320px" }} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">— اختر زبون —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}{c.phone ? ` — ${c.phone}` : ""}
                    </option>
                  ))}
                </select>

                {canCreateCustomer ? (
                  <button type="button" className="btn" onClick={() => setQuickCustomerOpen(true)}>
                    <UserPlus size={18} /> إضافة زبون سريع
                  </button>
                ) : null}
              </div>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">سعر البيع (₪)</div>
              <input className="input" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} inputMode="numeric" placeholder="" required />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">طريقة الدفع</div>
              <div className="input" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CreditCard size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
                <select
                  style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontWeight: 900 }}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">تاريخ البيع</div>
              <div className="input" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Calendar size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
                <input
                  style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontWeight: 900 }}
                  type="datetime-local"
                  value={soldAt}
                  onChange={(e) => setSoldAt(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <div className="label">ملاحظات</div>
              <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري" />
            </div>
          </div>

          <div className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={onClose}>
              إلغاء
            </button>
            <button className="btn primary" disabled={saving}>
              <BadgeCheck size={18} /> {saving ? "..." : "تسجيل"}
            </button>
          </div>
        </form>
      </Modal>

      <QuickCustomerModal
        open={quickCustomerOpen}
        onClose={() => setQuickCustomerOpen(false)}
        toast={toast}
        onCreated={(c) => {
          // after quick create, set as selected
          if (c?.id) setCustomerId(c.id);
        }}
      />
    </>
  );
}

export default function Sales() {
  const { toast, isAdmin, isSales } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cars, setCars] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesRows, setSalesRows] = useState([]);

  const [q, setQ] = useState("");
  const [monthOnly, setMonthOnly] = useState(true);

  const [saleOpen, setSaleOpen] = useState(false);
  const [defaultCarId, setDefaultCarId] = useState("");

  const [confirmDel, setConfirmDel] = useState({ open: false, row: null });

  const canCreateCustomer = isAdmin || isSales; // (B)

  const subtitle = useMemo(() => {
    if (isAdmin) return "أدمن: كل المبيعات + حذف/تعديل";
    if (isSales) return "مبيعات: تسجل مبيعاتك فقط";
    return "";
  }, [isAdmin, isSales]);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [{ data: carsData, error: carsErr }, { data: custData, error: custErr }] =
        await Promise.all([
          supabase
            .from("cars")
            .select("id, make, model, year, status, asking_price")
            .neq("status", "sold")
            .order("created_at", { ascending: false }),
          supabase
            .from("customers")
            .select("id, full_name, phone")
            .order("created_at", { ascending: false }),
        ]);

      if (carsErr) throw carsErr;
      if (custErr) throw custErr;

      setCars(carsData || []);
      setCustomers(custData || []);

      await loadSales();
      setLoading(false);
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  }

  async function loadSales() {
    let query = supabase
      .from("sales_list_view")
      .select(
        "id, sold_at, sold_price, payment_method, car_title, customer_name, sales_user_name, salesperson_id",
      )
      .order("sold_at", { ascending: false })
      .limit(250);

    const qq = safeText(q);
    if (qq) {
      query = query.or(
        `car_title.ilike.%${qq}%,customer_name.ilike.%${qq}%,sales_user_name.ilike.%${qq}%`,
      );
    }

    if (monthOnly) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      query = query.gte("sold_at", start.toISOString());
    }

    const { data, error: err } = await query;
    if (err) throw err;
    setSalesRows(data || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function onDeleteConfirmed() {
    const row = confirmDel.row;
    if (!row?.id) return;

    try {
      const { error: delErr } = await supabase.from("sales").delete().eq("id", row.id);
      if (delErr) throw delErr;
      toast?.("تم حذف البيع.", "ok");
      setConfirmDel({ open: false, row: null });
      await loadAll();
    } catch (e) {
      toast?.("فشل حذف البيع.", "danger");
      console.warn(e);
    }
  }

  const totalShown = useMemo(() => {
    const sum = salesRows.reduce((acc, r) => acc + Number(r.sold_price || 0), 0);
    return Number.isFinite(sum) ? sum : 0;
  }, [salesRows]);

  return (
    <div className="container">
      <PageHeader
        title="المبيعات"
        subtitle={subtitle}
        actions={
          <button
            className="btn primary"
            onClick={() => {
              setDefaultCarId("");
              setSaleOpen(true);
            }}
          >
            <Plus size={18} /> تسجيل بيع
          </button>
        }
      />

      <ErrorBanner error={error} />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row space" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <Search size={18} />
            <div className="h2">فلاتر</div>
          </div>
          <button
            className="btn"
            onClick={async () => {
              try {
                await loadSales();
              } catch (e) {
                setError(e);
              }
            }}
          >
            تحديث
          </button>
        </div>

        <div className="filtersBar">
          <Control icon={Search}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث: سيارة / زبون / موظف"
            />
          </Control>

          <label className="pill" style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={monthOnly}
              onChange={(e) => setMonthOnly(e.target.checked)}
            />
            هذا الشهر فقط
          </label>

          <div className="pill info">
            <BadgeDollarSign size={16} /> الإجمالي المعروض: {formatMoneyILS(totalShown)}
          </div>

          <button
            className="btn gold"
            onClick={async () => {
              try {
                await loadSales();
              } catch (e) {
                setError(e);
              }
            }}
          >
            <BadgeDollarSign size={18} /> تطبيق
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">جاري التحميل…</div>
      ) : salesRows.length === 0 ? (
        <EmptyState
          icon={BadgeDollarSign}
          title="لا يوجد مبيعات"
          description="ابدأ بتسجيل أول عملية بيع."
          actionLabel="تسجيل بيع"
          onAction={() => setSaleOpen(true)}
        />
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>السيارة</th>
                <th>الزبون</th>
                <th>سعر البيع</th>
                <th>الدفع</th>
                <th>الموظف</th>
                {isAdmin ? <th>إجراءات</th> : null}
              </tr>
            </thead>
            <tbody>
              {salesRows.map((r) => (
                <tr key={r.id}>
                  <td className="ltrIso">{r.sold_at ? new Date(r.sold_at).toLocaleString("he-IL") : "-"}</td>
                  <td>{r.car_title || "-"}</td>
                  <td>{r.customer_name || "-"}</td>
                  <td className="ltrIso">{formatMoneyILS(r.sold_price)}</td>
                  <td>{r.payment_method || "-"}</td>
                  <td>{r.sales_user_name || "-"}</td>
                  {isAdmin ? (
                    <td>
                      <button className="btn danger" onClick={() => setConfirmDel({ open: true, row: r })}>
                        <Trash2 size={16} /> حذف
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SaleModal
        open={saleOpen}
        cars={cars}
        customers={customers}
        defaultCarId={defaultCarId}
        onClose={() => setSaleOpen(false)}
        onSaved={loadAll}
        toast={toast}
        canCreateCustomer={canCreateCustomer}
      />

      <ConfirmDialog
        open={confirmDel.open}
        title="حذف عملية بيع"
        message="هل أنت متأكد؟ سيتم حذف عملية البيع، وقد تعود حالة السيارة إلى متاح إذا لم يوجد بيع آخر لها."
        confirmText="حذف"
        cancelText="إلغاء"
        danger
        onCancel={() => setConfirmDel({ open: false, row: null })}
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}
