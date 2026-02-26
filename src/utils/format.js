export function formatMoneyILS(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₪${Math.round(n).toLocaleString()}`;
  }
}

export function safeText(s) {
  return String(s ?? "").trim();
}

export function toNumberOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "available") return "متاح";
  if (s === "reserved") return "محجوز";
  if (s === "sold") return "مباع";
  return "-";
}

export function statusVariant(status) {
  const s = String(status || "").toLowerCase();
  if (s === "available") return "ok";
  if (s === "reserved") return "warn";
  if (s === "sold") return "info";
  return "info";
}
