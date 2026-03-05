import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Car, BadgeDollarSign, TrendingUp, UsersRound, ShieldCheck } from "lucide-react";
import PageHeader from "../components/PageHeader";
import KpiCard from "../components/KpiCard";
import ErrorBanner from "../components/ErrorBanner";
import { supabase } from "../supabaseClient";
import { formatMoneyILS } from "../utils/format";

async function countCarsByStatus(status) {
  const { count, error } = await supabase
    .from("cars")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  if (error) throw error;
  return count || 0;
}

export default function Dashboard() {
  const { profile, isAdmin, isSales } = useOutletContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [availableCount, setAvailableCount] = useState(0);
  const [reservedCount, setReservedCount] = useState(0);
  const [soldCount, setSoldCount] = useState(0);

  const [revenueTotal, setRevenueTotal] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);
  const [profitTotal, setProfitTotal] = useState(null);

  const [recentSales, setRecentSales] = useState([]);

  const subtitle = useMemo(() => {
    const roleLabel = isAdmin ? "أدمن" : isSales ? "مبيعات" : "";
    return `مرحبًا ${profile?.full_name || ""} — دورك: ${roleLabel}`;
  }, [profile?.full_name, isAdmin, isSales]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [a, r, s] = await Promise.all([
          countCarsByStatus("available"),
          countCarsByStatus("reserved"),
          countCarsByStatus("sold"),
        ]);

        if (!mounted) return;
        setAvailableCount(a);
        setReservedCount(r);
        setSoldCount(s);

        // الإيرادات (تتبع RLS: المبيعات ترى مبيعاتها فقط)
        const { data: totalData, error: totalErr } = await supabase.rpc(
          "sales_sum_total",
        );
        if (totalErr) throw totalErr;

        const { data: monthData, error: monthErr } = await supabase.rpc(
          "sales_sum_this_month",
        );
        if (monthErr) throw monthErr;

        if (!mounted) return;
        setRevenueTotal(Number(totalData || 0));
        setRevenueMonth(Number(monthData || 0));

        if (isAdmin) {
          const { data: profitData, error: profitErr } = await supabase.rpc(
            "profit_sum_total",
          );
          if (profitErr) throw profitErr;
          if (!mounted) return;
          setProfitTotal(Number(profitData || 0));
        } else {
          setProfitTotal(null);
        }

        const { data: salesRows, error: salesErr } = await supabase
          .from("sales_list_view")
          .select(
            "id, sold_at, sold_price, payment_method, car_title, customer_name, sales_user_name",
          )
          .order("sold_at", { ascending: false })
          .limit(8);

        if (salesErr) throw salesErr;
        if (!mounted) return;
        setRecentSales(salesRows || []);

        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setError(e);
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  return (
    <div className="container">
      <PageHeader
        title="لوحة التحكم"
        subtitle={subtitle}
        actions={
          <div className="pill info">
            <ShieldCheck size={16} /> صلاحيات محمية بـ RLS
          </div>
        }
      />

      <ErrorBanner error={error} />

      {loading ? (
        <div className="card">جاري تحميل البيانات…</div>
      ) : (
        <>
          <div className="kpiGrid" style={{ marginBottom: 14 }}>
            <KpiCard
              icon={Car}
              label="سيارات متاحة"
              value={availableCount}
              hint="جاهزة للبيع"
              variant="ok"
            />
            <KpiCard
              icon={Car}
              label="محجوزة"
              value={reservedCount}
              hint="بانتظار قرار"
              variant="warn"
            />
            <KpiCard
              icon={Car}
              label="مباعة"
              value={soldCount}
              hint="من المخزون"
              variant="info"
            />
            <KpiCard
              icon={BadgeDollarSign}
              label={isAdmin ? "إيرادات (كل المبيعات)" : "إيراداتك"}
              value={formatMoneyILS(revenueTotal)}
              hint={`هذا الشهر: ${formatMoneyILS(revenueMonth)}`}
              variant="ok"
            />
            {isAdmin ? (
              <KpiCard
                icon={TrendingUp}
                label="الربح التقريبي"
                value={profitTotal === null ? "-" : formatMoneyILS(profitTotal)}
                hint="(إيرادات - تكاليف داخلية)"
                variant="info"
              />
            ) : (
              <KpiCard
                icon={UsersRound}
                label="ملاحظة"
                value="المبيعات"
                hint="لن ترى أسعار الشراء/المصاريف الداخلية"
                variant="warn"
              />
            )}
          </div>

          <div className="card">
            <div className="row space" style={{ marginBottom: 10 }}>
              <div className="h1">آخر المبيعات</div>
              <div className="muted">عرض حسب صلاحياتك</div>
            </div>

            {recentSales.length === 0 ? (
              <div className="muted">لا يوجد مبيعات بعد.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>السيارة</th>
                      <th>الزبون</th>
                      <th>السعر المباع</th>
                      <th>طريقة الدفع</th>
                      <th>الموظف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((row) => (
                      <tr key={row.id}>
                        <td className="ltrIso">
                          {row.sold_at ? new Date(row.sold_at).toLocaleString("he-IL") : "-"}
                        </td>
                        <td>{row.car_title || "-"}</td>
                        <td>{row.customer_name || "-"}</td>
                        <td className="ltrIso">{formatMoneyILS(row.sold_price)}</td>
                        <td>{row.payment_method || "-"}</td>
                        <td>{row.sales_user_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
