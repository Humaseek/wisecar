export function safeText(v) {
  if (v == null) return "";
  const s = String(v).trim();
  return s;
}

export function formatMoneyILS(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "₪0";
  // Hebrew locale -> ₪ with commas
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatKm(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${new Intl.NumberFormat("he-IL").format(n)} ק"מ`;
}

export function formatYear(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return String(n);
}

export function statusLabel(status) {
  switch (status) {
    case "available":
      return "זמין";
    case "reserved":
      return "שמורה";
    case "sold":
      return "נמכר";
    default:
      return "—";
  }
}

export function statusTone(status) {
  switch (status) {
    case "available":
      return "ok";
    case "reserved":
      return "warn";
    case "sold":
      return "muted";
    default:
      return "muted";
  }
}

export function makeTitle(car) {
  const make = safeText(car?.make);
  const model = safeText(car?.model);
  const year = car?.year ? String(car.year) : "";
  return [make, model, year].filter(Boolean).join(" ");
}

export function pickPrimaryImage(car) {
  const main = safeText(car?.main_image_url);
  if (main) return main;
  const images = Array.isArray(car?.car_images) ? car.car_images : [];
  const primary = images
    .slice()
    .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
    .find((x) => x?.is_primary && x?.public_url);
  if (primary?.public_url) return primary.public_url;
  const first = images
    .slice()
    .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
    .find((x) => x?.public_url);
  if (first?.public_url) return first.public_url;
  return "/placeholder-car.svg";
}
