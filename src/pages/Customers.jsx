import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  UsersRound,
  Plus,
  Search,
  Pencil,
  Trash2,
  BadgeCheck,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import Control from "../components/Control";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import ErrorBanner from "../components/ErrorBanner";
import EmptyState from "../components/EmptyState";

import { supabase } from "../supabaseClient";
import { safeText } from "../utils/format";

function CustomerModal({ open, mode, canEdit, initial, onClose, onSaved, toast }) {
  const isEdit = mode === "edit";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);

    setFullName(initial?.full_name || "");
    setPhone(initial?.phone || "");
    setEmail(initial?.email || "");
    setCity(initial?.city || "");
    setNotes(initial?.notes || "");
  }, [open, initial]);

  async function onSubmit(e) {
    e?.preventDefault?.();
    if (!canEdit) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        full_name: safeText(fullName),
        phone: safeText(phone) || null,
        email: safeText(email) || null,
        city: safeText(city) || null,
        notes: safeText(notes) || null,
      };

      if (!payload.full_name) throw new Error("الرجاء إدخال اسم الزبون.");

      if (isEdit && initial?.id) {
        const { error: updErr } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", initial.id);
        if (updErr) throw updErr;
        toast?.("تم تحديث الزبون.", "ok");
      } else {
        const { error: insErr } = await supabase.from("customers").insert(payload);
        if (insErr) throw insErr;
        toast?.("تمت إضافة الزبون.", "ok");
      }

      onSaved?.();
      onClose?.();
      setSaving(false);
    } catch (e2) {
      setError(e2);
      setSaving(false);
    }
  }

  const title = isEdit ? "تعديل زبون" : "إضافة زبون";

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <ErrorBanner error={error} />

      <form onSubmit={onSubmit} className="stack">
        <div className="grid">
          <div style={{ gridColumn: "span 6" }}>
            <div className="label">اسم الزبون</div>
            <div className="input" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <UsersRound size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
              <input
                style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontWeight: 900 }}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="محمد أحمد"
                required
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

          <div style={{ gridColumn: "span 6" }}>
            <div className="label">المدينة</div>
            <div className="input" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <MapPin size={18} style={{ opacity: 0.7, flex: "0 0 auto" }} />
              <input
                style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontWeight: 900 }}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="الطيبة"
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

        {!canEdit ? (
          <div className="muted" style={{ marginTop: 8, lineHeight: 1.8 }}>
            لا تملك صلاحية تعديل هذا السجل.
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

export default function Customers() {
  const { toast, isAdmin, isSales } = useOutletContext();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [activeRow, setActiveRow] = useState(null);

  const [confirmDel, setConfirmDel] = useState({ open: false, row: null });

  const canCreate = isAdmin || isSales; // (B) sales can INSERT customers
  const canEdit = isAdmin;

  const subtitle = useMemo(() => {
    if (isAdmin) return "أدمن: إضافة/تعديل/حذف";
    if (isSales) return "مبيعات: مشاهدة + إضافة زبون جديد فقط";
    return "";
  }, [isAdmin, isSales]);

  async function loadCustomers() {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("customers")
        .select("id, full_name, phone, email, city, notes, created_at")
        .order("created_at", { ascending: false });

      const qq = safeText(q);
      if (qq) {
        query = query.or(
          `full_name.ilike.%${qq}%,phone.ilike.%${qq}%,email.ilike.%${qq}%,city.ilike.%${qq}%`,
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
    loadCustomers();
  }, []);

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
      const { error: delErr } = await supabase.from("customers").delete().eq("id", row.id);
      if (delErr) throw delErr;
      toast?.("تم حذف الزبون.", "ok");
      setConfirmDel({ open: false, row: null });
      await loadCustomers();
    } catch (e) {
      toast?.("فشل حذف الزبون.", "danger");
      console.warn(e);
    }
  }

  return (
    <div className="container">
      <PageHeader
        title="الزباين"
        subtitle={subtitle}
        actions={
          canCreate ? (
            <button className="btn primary" onClick={openCreate}>
              <Plus size={18} /> إضافة زبون
            </button>
          ) : null
        }
      />

      <ErrorBanner error={error} />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row space" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <Search size={18} />
            <div className="h2">بحث</div>
          </div>
          <button className="btn" onClick={loadCustomers}>
            تحديث
          </button>
        </div>

        <div className="filtersBar">
          <Control icon={Search}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="اسم / هاتف / إيميل / مدينة"
            />
          </Control>

          <button className="btn gold" onClick={loadCustomers}>
            <UsersRound size={18} /> تطبيق
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">جاري التحميل…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="لا يوجد زباين"
          description={canCreate ? "ابدأ بإضافة أول زبون." : "لا تملك صلاحية إضافة زباين."}
          actionLabel={canCreate ? "إضافة زبون" : undefined}
          onAction={canCreate ? openCreate : undefined}
        />
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الهاتف</th>
                <th>الإيميل</th>
                <th>المدينة</th>
                <th>تاريخ الإضافة</th>
                {isAdmin ? <th>إجراءات</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 950 }}>{r.full_name}</td>
                  <td className="ltrIso">{r.phone || "-"}</td>
                  <td className="ltrIso">{r.email || "-"}</td>
                  <td>{r.city || "-"}</td>
                  <td className="ltrIso">
                    {r.created_at ? new Date(r.created_at).toLocaleString("he-IL") : "-"}
                  </td>

                  {isAdmin ? (
                    <td>
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <button className="btn" onClick={() => openEdit(r)} title="تعديل">
                          <Pencil size={16} /> تعديل
                        </button>
                        <button
                          className="btn danger"
                          onClick={() => setConfirmDel({ open: true, row: r })}
                          title="حذف"
                        >
                          <Trash2 size={16} /> حذف
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CustomerModal
        open={modalOpen}
        mode={modalMode}
        canEdit={modalMode === "create" ? canCreate : canEdit}
        initial={activeRow}
        onClose={() => setModalOpen(false)}
        onSaved={loadCustomers}
        toast={toast}
      />

      <ConfirmDialog
        open={confirmDel.open}
        title="حذف زبون"
        message="هل أنت متأكد؟ سيتم حذف الزبون نهائيًا."
        confirmText="حذف"
        cancelText="إلغاء"
        danger
        onCancel={() => setConfirmDel({ open: false, row: null })}
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}
