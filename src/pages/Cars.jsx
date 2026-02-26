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

function toDateOrNull(v) {
  const s = safeText(v);
  return s ? s : null; // ISO string YYYY-MM-DD
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

function CarModal({ open, mode, isAdmin, initial, suppliers, onClose, onSaved, toast }) {
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

  const [plateNumber, setPlateNumber] = useState("");
  const [color, setColor] = useState("");
  const [stockNo, setStockNo] = useState("");

  // Extended details (car_details)
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  // Registration / general
  const [onRoadDate, setOnRoadDate] = useState("");
  const [trimLevel, setTrimLevel] = useState("");
  const [lastTestDate, setLastTestDate] = useState("");
  const [testValidUntil, setTestValidUntil] = useState("");
  const [ownershipType, setOwnershipType] = useState("");
  const [chassisNo, setChassisNo] = useState("");
  const [ministryCode, setMinistryCode] = useState("");
  const [modelCode, setModelCode] = useState("");
  const [registrationInstruction, setRegistrationInstruction] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [importerName, setImporterName] = useState("");
  const [priceOnRoad, setPriceOnRoad] = useState("");
  const [gasInstalled, setGasInstalled] = useState("");
  const [colorChanged, setColorChanged] = useState("");
  const [ownershipChanged, setOwnershipChanged] = useState("");

  // Technical
  const [engineModel, setEngineModel] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [tireFront, setTireFront] = useState("");
  const [tireRear, setTireRear] = useState("");
  const [emissionGroup, setEmissionGroup] = useState("");
  const [gearbox, setGearbox] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [registrationGroup, setRegistrationGroup] = useState("");
  const [engineCc, setEngineCc] = useState("");
  const [horsepower, setHorsepower] = useState("");
  const [euroStandard, setEuroStandard] = useState("");
  const [driveType, setDriveType] = useState("");
  const [driveTech, setDriveTech] = useState("");
  const [electricWindowsCount, setElectricWindowsCount] = useState("");
  const [sunroof, setSunroof] = useState("");
  const [alloyWheels, setAlloyWheels] = useState("");
  const [tirePressureSensors, setTirePressureSensors] = useState("");
  const [reverseCamera, setReverseCamera] = useState("");
  const [doorsCount, setDoorsCount] = useState("");
  const [seatsCount, setSeatsCount] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [towNoBrakes, setTowNoBrakes] = useState("");
  const [towWithBrakes, setTowWithBrakes] = useState("");

  // Safety
  const [airbagsCount, setAirbagsCount] = useState("");
  const [abs, setAbs] = useState("");
  const [stabilityControl, setStabilityControl] = useState("");
  const [laneDepartureWarning, setLaneDepartureWarning] = useState("");
  const [distanceMonitor, setDistanceMonitor] = useState("");
  const [adaptiveCruise, setAdaptiveCruise] = useState("");
  const [disabledTag, setDisabledTag] = useState("");

  // Ownership history (JSON array)
  const [ownershipHistory, setOwnershipHistory] = useState("");


  // Admin-only finance
  const [purchasePrice, setPurchasePrice] = useState("");
  const [adSpend, setAdSpend] = useState("");
  const [fuelCost, setFuelCost] = useState("");
  const [otherCost, setOtherCost] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

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

    setPlateNumber(initial?.plate_number || "");
    setColor(initial?.color || "");
    setStockNo(initial?.stock_no || "");

    // reset extended details
    setOnRoadDate("");
    setTrimLevel("");
    setLastTestDate("");
    setTestValidUntil("");
    setOwnershipType("");
    setChassisNo("");
    setMinistryCode("");
    setModelCode("");
    setRegistrationInstruction("");
    setEngineNumber("");
    setImporterName("");
    setPriceOnRoad("");
    setGasInstalled("");
    setColorChanged("");
    setOwnershipChanged("");

    setEngineModel("");
    setFuelType("");
    setTireFront("");
    setTireRear("");
    setEmissionGroup("");
    setGearbox("");
    setBodyType("");
    setRegistrationGroup("");
    setEngineCc("");
    setHorsepower("");
    setEuroStandard("");
    setDriveType("");
    setDriveTech("");
    setElectricWindowsCount("");
    setSunroof("");
    setAlloyWheels("");
    setTirePressureSensors("");
    setReverseCamera("");
    setDoorsCount("");
    setSeatsCount("");
    setTotalWeight("");
    setTowNoBrakes("");
    setTowWithBrakes("");

    setAirbagsCount("");
    setAbs("");
    setStabilityControl("");
    setLaneDepartureWarning("");
    setDistanceMonitor("");
    setAdaptiveCruise("");
    setDisabledTag("");
    setOwnershipHistory("");

    setDetailsLoaded(false);

    setPurchasePrice("");
    setAdSpend("");
    setFuelCost("");
    setOtherCost("");
    setFinanceLoaded(false);

    setSupplierId("");
    setPurchaseDate("");
    setInternalNotes("");

    async function loadFinance() {
      if (!isAdmin || !initial?.id) return;
      const { data, error: finErr } = await supabase
        .from("car_finance")
        .select("purchase_price, ad_spend, ads_cost, fuel_cost, other_cost, supplier_id, purchase_date, internal_notes")
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
      const adVal = data?.ad_spend != null ? data.ad_spend : data?.ads_cost;
      setAdSpend(adVal != null ? String(adVal) : "");
      setSupplierId(data?.supplier_id || "");
      setPurchaseDate(data?.purchase_date ? String(data.purchase_date) : "");
      setInternalNotes(data?.internal_notes || "");
      setFuelCost(data?.fuel_cost != null ? String(data.fuel_cost) : "");
      setOtherCost(data?.other_cost != null ? String(data.other_cost) : "");
      setFinanceLoaded(true);
    }

    async function loadDetails() {
      if (!initial?.id) {
        setDetailsLoaded(true);
        return;
      }
      const { data: d, error: dErr } = await supabase
        .from("car_details")
        .select("*")
        .eq("car_id", initial.id)
        .maybeSingle();

      if (dErr) {
        console.warn(dErr);
        setDetailsLoaded(true);
        return;
      }

      setOnRoadDate(d?.on_road_date ? String(d.on_road_date) : "");
      setTrimLevel(d?.trim_level || "");
      setLastTestDate(d?.last_test_date ? String(d.last_test_date) : "");
      setTestValidUntil(d?.test_valid_until ? String(d.test_valid_until) : "");
      setOwnershipType(d?.ownership_type || "");
      setChassisNo(d?.chassis_no || "");
      setMinistryCode(d?.ministry_code || "");
      setModelCode(d?.model_code || "");
      setRegistrationInstruction(d?.registration_instruction || "");
      setEngineNumber(d?.engine_number || "");
      setImporterName(d?.importer_name || "");
      setPriceOnRoad(d?.price_on_road != null ? String(d.price_on_road) : "");
      setGasInstalled(d?.gas_installed == null ? "" : String(d.gas_installed));
      setColorChanged(d?.color_changed == null ? "" : String(d.color_changed));
      setOwnershipChanged(d?.ownership_changed == null ? "" : String(d.ownership_changed));

      setEngineModel(d?.engine_model || "");
      setFuelType(d?.fuel_type || "");
      setTireFront(d?.tire_front || "");
      setTireRear(d?.tire_rear || "");
      setEmissionGroup(d?.emission_group != null ? String(d.emission_group) : "");
      setGearbox(d?.gearbox || "");
      setBodyType(d?.body_type || "");
      setRegistrationGroup(d?.registration_group || "");
      setEngineCc(d?.engine_cc != null ? String(d.engine_cc) : "");
      setHorsepower(d?.horsepower != null ? String(d.horsepower) : "");
      setEuroStandard(d?.euro_standard || "");
      setDriveType(d?.drive_type || "");
      setDriveTech(d?.drive_tech || "");
      setElectricWindowsCount(d?.electric_windows_count != null ? String(d.electric_windows_count) : "");
      setSunroof(d?.sunroof == null ? "" : String(d.sunroof));
      setAlloyWheels(d?.alloy_wheels == null ? "" : String(d.alloy_wheels));
      setTirePressureSensors(d?.tire_pressure_sensors == null ? "" : String(d.tire_pressure_sensors));
      setReverseCamera(d?.reverse_camera == null ? "" : String(d.reverse_camera));
      setDoorsCount(d?.doors_count != null ? String(d.doors_count) : "");
      setSeatsCount(d?.seats_count != null ? String(d.seats_count) : "");
      setTotalWeight(d?.total_weight != null ? String(d.total_weight) : "");
      setTowNoBrakes(d?.tow_no_brakes != null ? String(d.tow_no_brakes) : "");
      setTowWithBrakes(d?.tow_with_brakes != null ? String(d.tow_with_brakes) : "");

      setAirbagsCount(d?.airbags_count != null ? String(d.airbags_count) : "");
      setAbs(d?.abs == null ? "" : String(d.abs));
      setStabilityControl(d?.stability_control == null ? "" : String(d.stability_control));
      setLaneDepartureWarning(d?.lane_departure_warning == null ? "" : String(d.lane_departure_warning));
      setDistanceMonitor(d?.distance_monitor == null ? "" : String(d.distance_monitor));
      setAdaptiveCruise(d?.adaptive_cruise == null ? "" : String(d.adaptive_cruise));
      setDisabledTag(d?.disabled_tag == null ? "" : String(d.disabled_tag));

      setOwnershipHistory(d?.ownership_history ? JSON.stringify(d.ownership_history, null, 2) : "");
      setDetailsLoaded(true);
    }

    loadFinance();
    loadDetails();
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
        plate_number: safeText(plateNumber) || null,
        color: safeText(color) || null,
        stock_no: safeText(stockNo) || null,
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

      // Extended details (car_details)
      let ownershipHistoryJson = null;
      const oh = safeText(ownershipHistory);
      if (oh) {
        try {
          ownershipHistoryJson = JSON.parse(oh);
        } catch (err) {
          throw new Error("تاريخ الملكيات: JSON غير صالح. صحّحه أو اتركه فارغًا.");
        }
      }

      const detailsPayload = {
        car_id: carRow.id,

        on_road_date: toDateOrNull(onRoadDate),
        trim_level: safeText(trimLevel) || null,
        last_test_date: toDateOrNull(lastTestDate),
        test_valid_until: toDateOrNull(testValidUntil),
        ownership_type: safeText(ownershipType) || null,
        chassis_no: safeText(chassisNo) || null,
        ministry_code: safeText(ministryCode) || null,
        model_code: safeText(modelCode) || null,
        registration_instruction: safeText(registrationInstruction) || null,
        engine_number: safeText(engineNumber) || null,
        importer_name: safeText(importerName) || null,
        price_on_road: toNumberOrNull(priceOnRoad),

        gas_installed: toBoolOrNull(gasInstalled),
        color_changed: toBoolOrNull(colorChanged),
        ownership_changed: toBoolOrNull(ownershipChanged),

        engine_model: safeText(engineModel) || null,
        fuel_type: safeText(fuelType) || null,
        tire_front: safeText(tireFront) || null,
        tire_rear: safeText(tireRear) || null,
        emission_group: toNumberOrNull(emissionGroup),
        gearbox: safeText(gearbox) || null,
        body_type: safeText(bodyType) || null,
        registration_group: safeText(registrationGroup) || null,
        engine_cc: toNumberOrNull(engineCc),
        horsepower: toNumberOrNull(horsepower),
        euro_standard: safeText(euroStandard) || null,
        drive_type: safeText(driveType) || null,
        drive_tech: safeText(driveTech) || null,

        electric_windows_count: toNumberOrNull(electricWindowsCount),
        sunroof: toBoolOrNull(sunroof),
        alloy_wheels: toBoolOrNull(alloyWheels),
        tire_pressure_sensors: toBoolOrNull(tirePressureSensors),
        reverse_camera: toBoolOrNull(reverseCamera),
        doors_count: toNumberOrNull(doorsCount),
        seats_count: toNumberOrNull(seatsCount),
        total_weight: toNumberOrNull(totalWeight),
        tow_no_brakes: toNumberOrNull(towNoBrakes),
        tow_with_brakes: toNumberOrNull(towWithBrakes),

        airbags_count: toNumberOrNull(airbagsCount),
        abs: toBoolOrNull(abs),
        stability_control: toBoolOrNull(stabilityControl),
        lane_departure_warning: toBoolOrNull(laneDepartureWarning),
        distance_monitor: toBoolOrNull(distanceMonitor),
        adaptive_cruise: toBoolOrNull(adaptiveCruise),

        disabled_tag: toBoolOrNull(disabledTag),
        ownership_history: ownershipHistoryJson,
      };

      // Upsert only if any detail is present
      const anyDetails = Object.entries(detailsPayload).some(([k, v]) => k !== "car_id" && v != null && v !== "");
      if (anyDetails) {
        const { error: detErr } = await supabase
          .from("car_details")
          .upsert(detailsPayload, { onConflict: "car_id" });
        if (detErr) throw detErr;
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

          <div className="subtleBox">
            <div className="label">معلومات سريعة</div>
            <div style={{ fontWeight: 900, lineHeight: 1.8 }}>
              {initial?.plate_number ? `لوحة: ${initial.plate_number}` : ""}
              {initial?.plate_number && (initial?.color || initial?.vin) ? " • " : ""}
              {initial?.color ? `لون: ${initial.color}` : ""}
              {(initial?.color && initial?.vin) ? " • " : ""}
              {initial?.vin ? `VIN: ${initial.vin}` : ""}
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
              <div className="label">رقم السيارة (لوحة)</div>
              <input
                className="input ltrIso"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder="814-41-303"
              />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">اللون</div>
              <input
                className="input"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="أسود / أبيض..."
              />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <div className="label">رقم مخزون (اختياري)</div>
              <input
                className="input"
                value={stockNo}
                onChange={(e) => setStockNo(e.target.value)}
                placeholder="STK-001"
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
              <div className="h2">تفاصيل الوزارة / الرخصة (اختياري)</div>
              <div className="muted">حسب صورة “פרטי רכב”.</div>
            </div>

            {!detailsLoaded && initial?.id ? (
              <div className="muted">جاري تحميل…</div>
            ) : (
              <div className="grid">
                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">مועד עלייה לכביש (تاريخ نزول على الشارع)</div>
                  <input className="input ltrIso" value={onRoadDate} onChange={(e)=>setOnRoadDate(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">رמת גימור (فئة/تجهيز)</div>
                  <input className="input" value={trimLevel} onChange={(e)=>setTrimLevel(e.target.value)} placeholder="STYLE..." />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">اسم المستورد</div>
                  <input className="input" value={importerName} onChange={(e)=>setImporterName(e.target.value)} placeholder="..." />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">תאריך רישוי אחרון (آخر ترخيص)</div>
                  <input className="input ltrIso" value={lastTestDate} onChange={(e)=>setLastTestDate(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">רישוי בתוקף עד (ساري حتى)</div>
                  <input className="input ltrIso" value={testValidUntil} onChange={(e)=>setTestValidUntil(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">בעלות (نوع الملكية)</div>
                  <input className="input" value={ownershipType} onChange={(e)=>setOwnershipType(e.target.value)} placeholder="خصوصي / لיסינג / סוחר..." />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="label">מס שלדה (Chassis)</div>
                  <input className="input ltrIso" value={chassisNo} onChange={(e)=>setChassisNo(e.target.value)} placeholder="VSSZZZ..." />
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="label">מספר מנוע</div>
                  <input className="input ltrIso" value={engineNumber} onChange={(e)=>setEngineNumber(e.target.value)} placeholder="DLA..." />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">كود משרד התחבורה</div>
                  <input className="input ltrIso" value={ministryCode} onChange={(e)=>setMinistryCode(e.target.value)} placeholder="778.593" />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">كود דגם</div>
                  <input className="input ltrIso" value={modelCode} onChange={(e)=>setModelCode(e.target.value)} placeholder="KJ12RZ" />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">הוראת רישום</div>
                  <input className="input ltrIso" value={registrationInstruction} onChange={(e)=>setRegistrationInstruction(e.target.value)} placeholder="211541" />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">מחיר במועד עלייה לכביש (₪)</div>
                  <input className="input ltrIso" value={priceOnRoad} onChange={(e)=>setPriceOnRoad(e.target.value)} inputMode="numeric" placeholder="114900" />
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">هل تم تركيب غاز (גפ&quot;מ)؟</div>
                  <select className="input" value={gasInstalled} onChange={(e)=>setGasInstalled(e.target.value)}>
                    <option value="">—</option>
                    <option value="true">نعم</option>
                    <option value="false">لا</option>
                  </select>
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">هل تم تغيير اللون؟</div>
                  <select className="input" value={colorChanged} onChange={(e)=>setColorChanged(e.target.value)}>
                    <option value="">—</option>
                    <option value="true">نعم</option>
                    <option value="false">لا</option>
                  </select>
                </div>

                <div style={{ gridColumn: "span 4" }}>
                  <div className="label">هل كان تغيير ملكية؟</div>
                  <select className="input" value={ownershipChanged} onChange={(e)=>setOwnershipChanged(e.target.value)}>
                    <option value="">—</option>
                    <option value="true">نعم</option>
                    <option value="false">لا</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="subtleBox">
            <div className="row space" style={{ marginBottom: 8 }}>
              <div className="h2">مواصفات تقنية (اختياري)</div>
              <div className="muted">حسب صورة “פרטי מנוע”.</div>
            </div>

            <div className="grid">
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">דגם מנוע</div>
                <input className="input" value={engineModel} onChange={(e)=>setEngineModel(e.target.value)} placeholder="DLA" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">סוג דלק</div>
                <input className="input" value={fuelType} onChange={(e)=>setFuelType(e.target.value)} placeholder="بنزين" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">תיבת הילוכים</div>
                <input className="input" value={gearbox} onChange={(e)=>setGearbox(e.target.value)} placeholder="اوتوماتيك" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">צמיג קדמי</div>
                <input className="input ltrIso" value={tireFront} onChange={(e)=>setTireFront(e.target.value)} placeholder="185/65 R15" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">צמיג אחורי</div>
                <input className="input ltrIso" value={tireRear} onChange={(e)=>setTireRear(e.target.value)} placeholder="185/65 R15" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">קבוצת זיהום</div>
                <input className="input ltrIso" value={emissionGroup} onChange={(e)=>setEmissionGroup(e.target.value)} inputMode="numeric" placeholder="14" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">מרכב</div>
                <input className="input" value={bodyType} onChange={(e)=>setBodyType(e.target.value)} placeholder="הצ'בק" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">קבוצת רישוי</div>
                <input className="input ltrIso" value={registrationGroup} onChange={(e)=>setRegistrationGroup(e.target.value)} placeholder="2" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">נפח מנוע (cc)</div>
                <input className="input ltrIso" value={engineCc} onChange={(e)=>setEngineCc(e.target.value)} inputMode="numeric" placeholder="999" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">כוח סוס</div>
                <input className="input ltrIso" value={horsepower} onChange={(e)=>setHorsepower(e.target.value)} inputMode="numeric" placeholder="110" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">סוג תקינה</div>
                <input className="input" value={euroStandard} onChange={(e)=>setEuroStandard(e.target.value)} placeholder="אירופאית" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">הנעה</div>
                <input className="input" value={driveType} onChange={(e)=>setDriveType(e.target.value)} placeholder="4X2" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">טכנולוגיית הנעה</div>
                <input className="input" value={driveTech} onChange={(e)=>setDriveTech(e.target.value)} placeholder="הנעה רגילה" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">عدد نوافذ كهرباء</div>
                <input className="input ltrIso" value={electricWindowsCount} onChange={(e)=>setElectricWindowsCount(e.target.value)} inputMode="numeric" placeholder="4" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">عدد الأبواب</div>
                <input className="input ltrIso" value={doorsCount} onChange={(e)=>setDoorsCount(e.target.value)} inputMode="numeric" placeholder="5" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">عدد المقاعد</div>
                <input className="input ltrIso" value={seatsCount} onChange={(e)=>setSeatsCount(e.target.value)} inputMode="numeric" placeholder="5" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">الوزن الكلي</div>
                <input className="input ltrIso" value={totalWeight} onChange={(e)=>setTotalWeight(e.target.value)} inputMode="numeric" placeholder="1635" />
              </div>
              <div style={{ gridColumn: "span 4" }}>
                <div className="label">سحب بدون فرامل</div>
                <input className="input ltrIso" value={towNoBrakes} onChange={(e)=>setTowNoBrakes(e.target.value)} inputMode="numeric" placeholder="580" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">سحب مع فرامل</div>
                <input className="input ltrIso" value={towWithBrakes} onChange={(e)=>setTowWithBrakes(e.target.value)} inputMode="numeric" placeholder="1100" />
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">فتحة سقف</div>
                <select className="input" value={sunroof} onChange={(e)=>setSunroof(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">جنطات ألمنيوم</div>
                <select className="input" value={alloyWheels} onChange={(e)=>setAlloyWheels(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">حساسات ضغط هوا</div>
                <select className="input" value={tirePressureSensors} onChange={(e)=>setTirePressureSensors(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">كاميرا خلفية</div>
                <select className="input" value={reverseCamera} onChange={(e)=>setReverseCamera(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>
            </div>
          </div>

          <div className="subtleBox">
            <div className="row space" style={{ marginBottom: 8 }}>
              <div className="h2">أنظمة أمان (اختياري)</div>
              <div className="muted">حسب صورة “מערכות בטיחות”.</div>
            </div>

            <div className="grid">
              <div style={{ gridColumn: "span 3" }}>
                <div className="label">عدد الوسائد الهوائية</div>
                <input className="input ltrIso" value={airbagsCount} onChange={(e)=>setAirbagsCount(e.target.value)} inputMode="numeric" placeholder="6" />
              </div>

              <div style={{ gridColumn: "span 3" }}>
                <div className="label">ABS</div>
                <select className="input" value={abs} onChange={(e)=>setAbs(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 3" }}>
                <div className="label">بكرت ثبات / יציבות</div>
                <select className="input" value={stabilityControl} onChange={(e)=>setStabilityControl(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 3" }}>
                <div className="label">تحذير ستّية عن مسار</div>
                <select className="input" value={laneDepartureWarning} onChange={(e)=>setLaneDepartureWarning(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">نظام مراقبة مسافة للأمام</div>
                <select className="input" value={distanceMonitor} onChange={(e)=>setDistanceMonitor(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">كروز كنترول تكيّفي</div>
                <select className="input" value={adaptiveCruise} onChange={(e)=>setAdaptiveCruise(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>

              <div style={{ gridColumn: "span 4" }}>
                <div className="label">תג נכה (بطاقة إعاقة)</div>
                <select className="input" value={disabledTag} onChange={(e)=>setDisabledTag(e.target.value)}>
                  <option value="">—</option>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              </div>
            </div>
          </div>

          <div className="subtleBox">
            <div className="row space" style={{ marginBottom: 8 }}>
              <div className="h2">تاريخ الملكيات (اختياري)</div>
              <div className="muted">JSON Array مثل: [{'{'}"from":"07/2024","to":"12/2025","ownerType":"ליסינג"{'}'}]</div>
            </div>

            <textarea
              className="input ltrIso"
              rows={6}
              value={ownershipHistory}
              onChange={(e)=>setOwnershipHistory(e.target.value)}
              placeholder={`[
  {"from":"07/2024","to":"12/2025","ownerType":"ליסינג"},
  {"from":"12/2025","to":"02/2026","ownerType":"סוחר"}
]`}
            />
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
                <div style={{ gridColumn: "span 6" }}>
                  <div className="label">المورد</div>
                  <select className="input" value={supplierId} onChange={(e)=>setSupplierId(e.target.value)}>
                    <option value="">—</option>
                    {(suppliers || []).map((s) => (
                      <option key={s.id} value={s.id}>{s.company}</option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: "span 6" }}>
                  <div className="label">تاريخ الشراء (اختياري)</div>
                  <input className="input ltrIso" value={purchaseDate} onChange={(e)=>setPurchaseDate(e.target.value)} placeholder="YYYY-MM-DD" />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div className="label">سعر الشراء (سعر السيارة الأصلي)</div>
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

                <div style={{ gridColumn: "span 12" }}>
                  <div className="label">ملاحظات داخلية (اختياري)</div>
                  <textarea
                    className="input"
                    rows={2}
                    value={internalNotes}
                    onChange={(e)=>setInternalNotes(e.target.value)}
                    placeholder="مثال: تم فحص السيارة / ملاحظات على الشراء..."
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
          "id, plate_number, color, stock_no, make, model, year, type, status, asking_price, mileage, description, vin, main_image_url, created_at",
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
        suppliers={suppliers}
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