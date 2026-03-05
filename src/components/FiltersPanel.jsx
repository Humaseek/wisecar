import React, { useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";

export default function FiltersPanel({
  openMobile,
  onCloseMobile,
  makes,
  makeModelMap,
  value,
  onChange,
  onReset,
}) {
  const models = useMemo(() => {
    const mk = value.make;
    if (!mk) return [];
    const list = makeModelMap?.[mk] || [];
    return Array.isArray(list) ? list : [];
  }, [makeModelMap, value.make]);

  const set = (patch) => onChange({ ...value, ...patch, page: 1 });

  const Panel = (
    <div className="filtersCard">
      <div className="filtersHead">
        <div className="filtersTitle">
          <SlidersHorizontal size={18} />
          חיפוש מתקדם
        </div>
        <button className="btn btnGhost" onClick={onReset}>
          איפוס
        </button>
      </div>

      <div className="filtersGrid">
        <label className="field">
          <div className="fieldLabel">טקסט חופשי</div>
          <input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="טויוטה, קיה, מספר רישוי..."
          />
        </label>

        <label className="field">
          <div className="fieldLabel">יצרן</div>
          <select value={value.make} onChange={(e) => set({ make: e.target.value, model: "" })}>
            <option value="">הכול</option>
            {makes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <div className="fieldLabel">דגם</div>
          <select value={value.model} onChange={(e) => set({ model: e.target.value })} disabled={!value.make}>
            <option value="">הכול</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <div className="fieldRow">
          <label className="field">
            <div className="fieldLabel">שנה מ-</div>
            <input value={value.yearFrom} onChange={(e) => set({ yearFrom: e.target.value })} placeholder="2015" />
          </label>
          <label className="field">
            <div className="fieldLabel">עד</div>
            <input value={value.yearTo} onChange={(e) => set({ yearTo: e.target.value })} placeholder="2025" />
          </label>
        </div>

        <div className="fieldRow">
          <label className="field">
            <div className="fieldLabel">מחיר מ-</div>
            <input value={value.priceFrom} onChange={(e) => set({ priceFrom: e.target.value })} placeholder="20000" />
          </label>
          <label className="field">
            <div className="fieldLabel">עד</div>
            <input value={value.priceTo} onChange={(e) => set({ priceTo: e.target.value })} placeholder="120000" />
          </label>
        </div>

        <div className="fieldRow">
          <label className="field">
            <div className="fieldLabel">ק"מ מ-</div>
            <input value={value.kmFrom} onChange={(e) => set({ kmFrom: e.target.value })} placeholder="0" />
          </label>
          <label className="field">
            <div className="fieldLabel">עד</div>
            <input value={value.kmTo} onChange={(e) => set({ kmTo: e.target.value })} placeholder="150000" />
          </label>
        </div>

        <label className="field">
          <div className="fieldLabel">סטטוס</div>
          <select value={value.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">הכול</option>
            <option value="available">זמין</option>
            <option value="reserved">שמורה</option>
            <option value="sold">נמכר</option>
          </select>
        </label>

        <label className="field">
          <div className="fieldLabel">סוג רכב</div>
          <select value={value.carType} onChange={(e) => set({ carType: e.target.value })}>
            <option value="">הכול</option>
            <option value="Sedan">סדאן</option>
            <option value="SUV">SUV</option>
            <option value="Hatchback">האצ'בק</option>
            <option value="Coupe">קופה</option>
            <option value="Pickup">טנדר</option>
            <option value="Van">ואן</option>
            <option value="Crossover">קרוסאובר</option>
            <option value="Other">אחר</option>
          </select>
        </label>

        <label className="field">
          <div className="fieldLabel">מיון</div>
          <select value={value.sort} onChange={(e) => set({ sort: e.target.value })}>
            <option value="newest">הכי חדש</option>
            <option value="priceAsc">מחיר: נמוך לגבוה</option>
            <option value="priceDesc">מחיר: גבוה לנמוך</option>
            <option value="yearDesc">שנה: חדש לישן</option>
          </select>
        </label>
      </div>
    </div>
  );

  return (
    <>
      <div className="filtersDesktop">{Panel}</div>

      {/* Mobile */}
      <div className={openMobile ? "drawerOverlay show" : "drawerOverlay"} onClick={onCloseMobile} />
      <aside className={openMobile ? "drawer show" : "drawer"}>
        <div className="drawerTop">
          <div className="drawerTitle">חיפוש מתקדם</div>
          <button className="btnIcon" onClick={onCloseMobile} aria-label="סגור">
            <X />
          </button>
        </div>
        <div style={{ padding: 12 }}>{Panel}</div>
      </aside>
    </>
  );
}
