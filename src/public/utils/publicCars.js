import { supabase, isSupabaseConfigured } from "../../supabaseClient";
import { demoCars } from "../data/demoCars";

function normalizeCar(row) {
  if (!row || typeof row !== "object") return null;

  // Try to be schema-agnostic: support common names.
  const id = row.id ?? row.uuid ?? row.slug;
  if (!id) return null;

  const images =
    row.images ??
    row.photos ??
    row.gallery ??
    (row.image_url ? [row.image_url] : null) ??
    (row.cover ? [row.cover] : null);

  const year = row.year ?? row.model_year ?? row.car_year;
  const make = row.make ?? row.brand ?? row.manufacturer;
  const model = row.model ?? row.trim ?? row.name;
  const titleAr = row.title_ar ?? row.titleAr ?? row.title ?? "";
  const priceAed = row.price_aed ?? row.priceAed ?? row.price ?? 0;
  const km = row.km ?? row.mileage ?? row.odometer;

  return {
    id: String(id),
    year: year ? Number(year) : undefined,
    make: make ?? "",
    model: model ?? "",
    titleAr: titleAr || (make && model ? `${make} ${model}` : "سيارة"),
    priceAed: Number(priceAed || 0),
    km: km ? Number(km) : undefined,
    cylinders: row.cylinders ?? row.engine_cylinders,
    transmissionAr: row.transmission_ar ?? row.transmission ?? "",
    driveAr: row.drive_ar ?? row.drive ?? "",
    doors: row.doors,
    colorAr: row.color_ar ?? row.color,
    fuelAr: row.fuel_ar ?? row.fuel,
    locationAr: row.location_ar ?? row.location,
    ownerAr: row.owner_ar ?? row.owner,
    badges: row.badges ?? [],
    whatsapp: row.whatsapp,
    phoneMasked: row.phone_masked ?? row.phoneMasked,
    images: Array.isArray(images) ? images : [],
    descriptionAr: row.description_ar ?? row.description ?? "",
  };
}

export async function loadPublicCars() {
  if (!isSupabaseConfigured || !supabase) return demoCars;

  // Attempt to read from a `cars` table. If it fails, fallback to demo.
  try {
    const { data, error } = await supabase
      .from("cars")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(24);
    if (error) throw error;

    const mapped = (data ?? []).map(normalizeCar).filter(Boolean);
    return mapped.length ? mapped : demoCars;
  } catch {
    return demoCars;
  }
}
