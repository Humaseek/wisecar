import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter } from "lucide-react";
import { fetchCarsPaged, fetchMakesAndModels } from "../lib/carsApi";
import CarCard from "../components/CarCard";
import FiltersPanel from "../components/FiltersPanel";
import Pagination from "../components/Pagination";

function toStateFromParams(sp) {
  return {
    page: Number(sp.get("page") || 1) || 1,
    search: sp.get("q") || "",
    make: sp.get("make") || "",
    model: sp.get("model") || "",
    yearFrom: sp.get("y1") || "",
    yearTo: sp.get("y2") || "",
    priceFrom: sp.get("p1") || "",
    priceTo: sp.get("p2") || "",
    kmFrom: sp.get("k1") || "",
    kmTo: sp.get("k2") || "",
    status: sp.get("status") || "",
    carType: sp.get("type") || "",
    sort: sp.get("sort") || "newest",
  };
}

function toParamsFromState(st) {
  const sp = new URLSearchParams();
  if (st.page && st.page !== 1) sp.set("page", String(st.page));
  if (st.search) sp.set("q", st.search);
  if (st.make) sp.set("make", st.make);
  if (st.model) sp.set("model", st.model);
  if (st.yearFrom) sp.set("y1", st.yearFrom);
  if (st.yearTo) sp.set("y2", st.yearTo);
  if (st.priceFrom) sp.set("p1", st.priceFrom);
  if (st.priceTo) sp.set("p2", st.priceTo);
  if (st.kmFrom) sp.set("k1", st.kmFrom);
  if (st.kmTo) sp.set("k2", st.kmTo);
  if (st.status) sp.set("status", st.status);
  if (st.carType) sp.set("type", st.carType);
  if (st.sort && st.sort !== "newest") sp.set("sort", st.sort);
  return sp;
}

export default function Cars() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => toStateFromParams(searchParams));

  const [makes, setMakes] = useState([]);
  const [makeModelMap, setMakeModelMap] = useState({});

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    // keep state in sync when URL changes
    setFilters(toStateFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    fetchMakesAndModels()
      .then(({ makes: m, makeModelMap: map }) => {
        if (!alive) return;
        setMakes(m || []);
        setMakeModelMap(map || {});
      })
      .catch((e) => {
        console.error(e);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    fetchCarsPaged({
      page: filters.page,
      pageSize: 12,
      search: filters.search,
      make: filters.make,
      model: filters.model,
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
      priceFrom: filters.priceFrom,
      priceTo: filters.priceTo,
      kmFrom: filters.kmFrom,
      kmTo: filters.kmTo,
      status: filters.status,
      carType: filters.carType,
      sort: filters.sort,
    })
      .then((res) => {
        if (!alive) return;
        setRows(res.rows);
        setTotal(res.total);
      })
      .catch((e) => {
        console.error(e);
        if (!alive) return;
        setErr("לא הצלחנו לטעון רכבים.");
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [filters]);

  const onChangeFilters = (next) => {
    setFilters(next);
    setSearchParams(toParamsFromState(next));
  };

  const onReset = () => {
    const next = {
      page: 1,
      search: "",
      make: "",
      model: "",
      yearFrom: "",
      yearTo: "",
      priceFrom: "",
      priceTo: "",
      kmFrom: "",
      kmTo: "",
      status: "",
      carType: "",
      sort: "newest",
    };
    onChangeFilters(next);
  };

  const title = useMemo(() => {
    if (!total) return "רכבים";
    return `רכבים (${new Intl.NumberFormat("he-IL").format(total)})`;
  }, [total]);

  return (
    <div className="container section" style={{ paddingTop: 22 }}>
      <div className="listHead">
        <div>
          <h1 className="pageTitle">{title}</h1>
          <div className="muted">תוצאות לפי פילטרים • הצגת קארדים ברורים עם תמונות</div>
        </div>

        <button className="btn btnPrimary mobileOnly" onClick={() => setMobileFiltersOpen(true)}>
          <Filter size={18} />
          סינון
        </button>
      </div>

      <div className="listGrid">
        <FiltersPanel
          openMobile={mobileFiltersOpen}
          onCloseMobile={() => setMobileFiltersOpen(false)}
          makes={makes}
          makeModelMap={makeModelMap}
          value={filters}
          onChange={onChangeFilters}
          onReset={onReset}
        />

        <div>
          {err ? <div className="alert">{err}</div> : null}

          {loading ? (
            <div className="gridCars">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeletonCard" />
              ))}
            </div>
          ) : rows.length ? (
            <div className="gridCars">
              {rows.map((c) => (
                <CarCard key={c.id} car={c} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="emptyTitle">לא נמצאו רכבים</div>
              <div className="muted">נסו לשנות פילטרים או לאפס.</div>
              <button className="btn btnGhost" onClick={onReset} style={{ marginTop: 10 }}>
                איפוס
              </button>
            </div>
          )}

          <Pagination
            page={filters.page}
            pageSize={12}
            total={total}
            onPage={(p) => onChangeFilters({ ...filters, page: p })}
          />
        </div>
      </div>
    </div>
  );
}
