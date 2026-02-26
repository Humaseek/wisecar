import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Truck,
  Plus,
  Search,
  Pencil,
  Trash2,
  BadgeCheck,
  Phone,
  Mail,
  Building2,
  ShieldAlert,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import Control from "../components/Control";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import ErrorBanner from "../components/ErrorBanner";
import EmptyState from "../components/EmptyState";

import { supabase } from "../supabaseClient";
import { safeText } from "../utils/format";

function SupplierModal({ open, mode, canEdit, initial, onClose, onSaved, toast }) {
  const isEdit = mode === "edit";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(initial?.name || "");
    setCompany(initial?.company || "");
    setPhone(initial?.phone || "");
    setEmail(initial?.email || "");
    setNotes(initial?.notes || "");
  }, [open, initial]);

  async function onSubmit(e) {
    e?.preventDefault?.();
    if (!canEdit) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: safeText(name),
        company: safeText(company) || null,
        phone: safeText(phone) || null,
        email: safeText(email) || null,
        notes: safeText(notes) || null,
      };

      if (!payload.name) throw new Error("الرجاء إدخال اسم المورد.");

      if (isEdit && initial?.id) {
        const { error: updErr } = await supabase
          .from("suppliers")
          .update(payload)
          .eq("id", initial.id);
        if (updErr) throw updErr;
        toast?.("تم تحديث المورد.", "ok");
      } else {
        const { error: insErr } = await supabase.from("suppliers").insert(payload);
        if (insErr) throw insErr;
        toast?.("تمت إضافة المورد.", "ok");
      }

      onSaved?.();
      onClose?.();
      setSaving(false);
    } catch (e2) {
      setError(e2);
      setSaving(false);
    }
  }

  const title = isEdit ? "تعديل مورد" : "إضافة مورد";

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <ErrorBanner error={error} />

      <form onSubmit={onSubmit} className="stack">
        <div className="grid">
          <div style={{ gridColumn: "span 6" }}>
            <div className="label">اسم المورد</div>
            <div className="input" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Truck size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
              <input
                style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontWeight: 900 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مورد سيارات"
                required
              />
            </div>
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="label">الشركة (اختياري)</div>
            <div className="input" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Building2 size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
              <input
                style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontWeight: 900 }}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="اسم الشركة"
              />
            </div>
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="label">الهاتف</div>
            <div className="input" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Phone size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
              <input
                style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontWeight: 900 }}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
              />
            </div>
          </div>

          <div style={{ gridColumn: "span 6" }}>
            <div className="label">الإيميل</div>
            <div className="input" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Mail size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
              <input
                style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontWeight: 900 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                type="email"
                inputMode="email"
              />
            </div>
          </div>

          <div style={{ gridColumn: "span 12" }}>
            <div className="label">ملاحظات</div>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات داخلية (اختياري)"
            />
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn primary" disabled={!canEdit || saving}>
            <BadgeCheck size={18} /> {saving ? "..." : "حفظ"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Suppliers() {
  const { toast, isAdmin } = useOutletContext();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [activeRow, setActiveRow] = useState(null);

  const [confirmDel, setConfirmDel] = useState({ open: false, row: null });

  const subtitle = useMemo(() => "أدمن فقط: إدارة الموردين", []);

  async function loadSuppliers() {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("suppliers")
        .select("id, name, company, phone, email, notes, created_at")
        .order("created_at", { ascending: false });

      const qq = safeText(q);
      if (qq) {
        query = query.or(
          `name.ilike.%${qq}%,company.ilike.%${qq}%,phone.ilike.%${qq}%,email.ilike.%${qq}%`,
        );
      }

      const { data, error: err } = await query;
      if (err) throw err;

      setRows(data || []);
      setLoading(false);
    } catch (e) {
      setError(e);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) loadSuppliers();
  }, [isAdmin]);

  function openCreate() {
    setActiveRow(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function openEdit(row) {
    setActiveRow(row);
    setModalMode("edit");
    setModalOpen(true);
  }

  async function onDeleteConfirmed() {
    const row = confirmDel.row;
    if (!row?.id) return;

    try {
      const { error: delErr } = await supabase.from("suppliers").delete().eq("id", row.id);
      if (delErr) throw delErr;
      toast?.("تم حذف المورد.", "ok");
      setConfirmDel({ open: false, row: null });
      await loadSuppliers();
    } catch (e) {
      toast?.("فشل حذف المورد.", "danger");
      console.warn(e);
    }
  }

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: 820 }}>
          <div className="row" style={{ gap: 10 }}>
            <ShieldAlert size={22} />
            <div className="h1">ممنوع الوصول</div>
          </div>
          <div className="muted" style={{ marginTop: 10, lineHeight: 1.9 }}>
            صفحة <span className="ltrIso">Suppliers</span> متاحة للأدمن فقط.
          </div>
          <hr className="sep" />
          <button className="btn" onClick={() => navigate("/")}>العودة للداشبورد</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader
        title="الموردين"
        subtitle={subtitle}
        actions={
          <button className="btn primary" onClick={openCreate}>
            <Plus size={18} /> إضافة مورد
          </button>
        }
      />

      <ErrorBanner error={error} />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row space" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <Search size={18} />
            <div className="h2">بحث</div>
          </div>
          <button className="btn" onClick={loadSuppliers}>
            تحديث
          </button>
        </div>

        <div className="filtersBar">
          <Control icon={Search}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم / شركة / هاتف / إيميل" />
          </Control>

          <button className="btn gold" onClick={loadSuppliers}>
            <Truck size={18} /> تطبيق
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">جاري التحميل…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="لا يوجد موردين"
          description="ابدأ بإضافة أول مورد."
          actionLabel="إضافة مورد"
          onAction={openCreate}
        />
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الشركة</th>
                <th>الهاتف</th>
                <th>الإيميل</th>
                <th>تاريخ الإضافة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 950 }}>{r.name}</td>
                  <td>{r.company || "-"}</td>
                  <td className="ltrIso">{r.phone || "-"}</td>
                  <td className="ltrIso">{r.email || "-"}</td>
                  <td className="ltrIso">{r.created_at ? new Date(r.created_at).toLocaleString("he-IL") : "-"}</td>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <button className="btn" onClick={() => openEdit(r)} title="تعديل">
                        <Pencil size={16} /> تعديل
                      </button>
                      <button className="btn danger" onClick={() => setConfirmDel({ open: true, row: r })} title="حذف">
                        <Trash2 size={16} /> حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SupplierModal
        open={modalOpen}
        mode={modalMode}
        canEdit={isAdmin}
        initial={activeRow}
        onClose={() => setModalOpen(false)}
        onSaved={loadSuppliers}
        toast={toast}
      />

      <ConfirmDialog
        open={confirmDel.open}
        title="حذف مورد"
        message="هل أنت متأكد؟ سيتم حذف المورد نهائيًا."
        confirmText="حذف"
        cancelText="إلغاء"
        danger
        onCancel={() => setConfirmDel({ open: false, row: null })}
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}
