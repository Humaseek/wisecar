import { supabase } from "../supabaseClient";

const DEFAULT_PAGE_SIZE = 12;

export function getContactPhone() {
  const v = import.meta?.env?.VITE_CONTACT_PHONE;
  return v && String(v).trim() ? String(v).trim() : "050-000-0000";
}

export function getWhatsappPhone() {
  // digits only for wa.me
  const raw = import.meta?.env?.VITE_WHATSAPP_PHONE;
  const fallback = getContactPhone();
  const s = (raw && String(raw).trim()) || fallback;
  return String(s).replace(/[^0-9]/g, "");
}

export async function fetchLatestCars(limit = 8) {
  const { data, error } = await supabase
    .from("cars")
    .select("id, make, model, year, mileage, status, asking_price, main_image_url, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function fetchCarById(id) {
  const { data, error } = await supabase
    .from("cars")
    .select(
      `
      id,
      stock_no,
      plate_number,
      vin,
      make,
      model,
      car_type,
      year,
      color,
      mileage,
      status,
      asking_price,
      notes_public,
      description,
      main_image_url,
      created_at,
      car_details(
        on_road_date,
        trim_level,
        fuel_type,
        gearbox,
        body_type,
        engine_cc,
        horsepower,
        doors_count,
        seats_count,
        owners_count,
        test_valid_until
      ),
      car_images(
        id,
        public_url,
        is_primary,
        sort_order
      )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function applyRange(q, col, min, max) {
  if (min !== "" && min != null && !Number.isNaN(Number(min))) {
    q = q.gte(col, Number(min));
  }
  if (max !== "" && max != null && !Number.isNaN(Number(max))) {
    q = q.lte(col, Number(max));
  }
  return q;
}

export async function fetchCarsPaged({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  search = "",
  make = "",
  model = "",
  yearFrom = "",
  yearTo = "",
  priceFrom = "",
  priceTo = "",
  kmFrom = "",
  kmTo = "",
  status = "",
  carType = "",
  sort = "newest", // newest | priceAsc | priceDesc | yearDesc
} = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("cars")
    .select(
      "id, make, model, year, mileage, status, asking_price, main_image_url, car_type, created_at",
      { count: "exact" },
    );

  const s = String(search || "").trim();
  if (s) {
    // simple search across make/model/plate
    q = q.or(`make.ilike.%${s}%,model.ilike.%${s}%,plate_number.ilike.%${s}%`);
  }

  if (make) q = q.eq("make", make);
  if (model) q = q.eq("model", model);
  if (status) q = q.eq("status", status);
  if (carType) q = q.eq("car_type", carType);

  q = applyRange(q, "year", yearFrom, yearTo);
  q = applyRange(q, "asking_price", priceFrom, priceTo);
  q = applyRange(q, "mileage", kmFrom, kmTo);

  if (sort === "priceAsc") q = q.order("asking_price", { ascending: true });
  else if (sort === "priceDesc") q = q.order("asking_price", { ascending: false });
  else if (sort === "yearDesc") q = q.order("year", { ascending: false, nullsFirst: false });
  else q = q.order("created_at", { ascending: false });

  const { data, error, count } = await q.range(from, to);
  if (error) throw error;

  return { rows: data || [], total: count || 0, pageSize, page };
}

export async function fetchMakesAndModels() {
  // Try to read from dedicated tables. If empty, fallback to distinct from cars.
  const { data: makes, error: makesErr } = await supabase
    .from("car_makes")
    .select("name")
    .order("name", { ascending: true });

  if (!makesErr && Array.isArray(makes) && makes.length) {
    const { data: models, error: modelsErr } = await supabase
      .from("car_models")
      .select("name, car_makes(name)")
      .order("name", { ascending: true });

    const map = {};
    for (const m of makes) map[m.name] = [];

    if (!modelsErr && Array.isArray(models)) {
      for (const row of models) {
        const mk = row?.car_makes?.name;
        if (!mk) continue;
        if (!map[mk]) map[mk] = [];
        map[mk].push(row.name);
      }
    }

    const list = Object.keys(map);
    list.sort((a, b) => a.localeCompare(b, "he"));
    for (const k of list) map[k] = Array.from(new Set(map[k])).sort((a, b) => a.localeCompare(b, "he"));

    return { makes: list, makeModelMap: map };
  }

  // Fallback: distinct makes/models from cars
  const { data: cars, error } = await supabase
    .from("cars")
    .select("make, model")
    .limit(5000);
  if (error) throw error;

  const map = {};
  for (const r of cars || []) {
    const mk = r?.make;
    const md = r?.model;
    if (!mk) continue;
    if (!map[mk]) map[mk] = [];
    if (md) map[mk].push(md);
  }
  const makesList = Object.keys(map).sort((a, b) => a.localeCompare(b, "he"));
  for (const k of makesList) map[k] = Array.from(new Set(map[k])).sort((a, b) => a.localeCompare(b, "he"));
  return { makes: makesList, makeModelMap: map };
}
