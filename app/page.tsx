"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  created_at?: string;
};

type MoneyRecord = {
  id: string;
  amount: number | string;
  created_at?: string;
};

type DashboardData = {
  inventoryItems: InventoryItem[];
  incomeItems: MoneyRecord[];
  expenseItems: MoneyRecord[];
};

type TrendPoint = {
  label: string;
  income: number;
  expenses: number;
};

const emptyDashboardData: DashboardData = {
  inventoryItems: [],
  incomeItems: [],
  expenseItems: [],
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amount);

const getAmountTotal = (records: MoneyRecord[]) =>
  records.reduce((sum, record) => sum + Number(record.amount || 0), 0);

const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

const buildLastSevenDaysTrend = (
  incomeItems: MoneyRecord[],
  expenseItems: MoneyRecord[]
) => {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));

    return {
      key: getDateKey(date),
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      income: 0,
      expenses: 0,
    };
  });

  const dayMap = new Map<string, TrendPoint & { key: string }>(
    days.map((day) => [day.key, day])
  );

  incomeItems.forEach((record) => {
    if (!record.created_at) return;

    const day = dayMap.get(getDateKey(new Date(record.created_at)));

    if (day) {
      day.income += Number(record.amount || 0);
    }
  });

  expenseItems.forEach((record) => {
    if (!record.created_at) return;

    const day = dayMap.get(getDateKey(new Date(record.created_at)));

    if (day) {
      day.expenses += Number(record.amount || 0);
    }
  });

  return days.map((day) => ({
    label: day.label,
    income: day.income,
    expenses: day.expenses,
  }));
};

const getInventorySegments = (items: InventoryItem[]) => {
  const low = items.filter((item) => item.quantity <= 5).length;
  const moderate = items.filter(
    (item) => item.quantity > 5 && item.quantity <= 20
  ).length;
  const healthy = items.filter((item) => item.quantity > 20).length;

  return [
    { label: "Low", value: low, color: "bg-orange-500" },
    { label: "Moderate", value: moderate, color: "bg-blue-500" },
    { label: "Healthy", value: healthy, color: "bg-emerald-500" },
  ];
};

export default function Home() {
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(emptyDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      const [inventoryResult, incomeResult, expensesResult] =
        await Promise.all([
          supabase.from("inventory").select("id, name, quantity, created_at"),
          supabase.from("income").select("id, amount, created_at"),
          supabase.from("expenses").select("id, amount, created_at"),
        ]);

      const errors = [
        inventoryResult.error,
        incomeResult.error,
        expensesResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error("Failed to load dashboard analytics:", errors);

        if (isMounted) {
          setErrorMessage("Unable to load dashboard analytics.");
        }

        return;
      }

      if (isMounted) {
        setDashboardData({
          inventoryItems: inventoryResult.data ?? [],
          incomeItems: incomeResult.data ?? [],
          expenseItems: expensesResult.data ?? [],
        });
        setErrorMessage("");
      }
    };

    const refreshDashboardData = async () => {
      if (isMounted) {
        setIsLoading(true);
      }

      await loadDashboardData();

      if (isMounted) {
        setIsLoading(false);
      }
    };

    refreshDashboardData();

    const channel = supabase
      .channel("dashboard-analytics")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        refreshDashboardData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "income" },
        refreshDashboardData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        refreshDashboardData
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Dashboard analytics realtime subscription failed.");
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const totalInventoryItems = dashboardData.inventoryItems.length;
  const lowStockItems = dashboardData.inventoryItems.filter(
    (item) => item.quantity <= 5
  ).length;
  const totalInventoryUnits = dashboardData.inventoryItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const totalIncome = getAmountTotal(dashboardData.incomeItems);
  const totalExpenses = getAmountTotal(dashboardData.expenseItems);
  const netProfit = totalIncome - totalExpenses;
  const trendData = buildLastSevenDaysTrend(
    dashboardData.incomeItems,
    dashboardData.expenseItems
  );
  const maxTrendValue = Math.max(
    1,
    ...trendData.map((day) => Math.max(day.income, day.expenses))
  );
  const maxFinanceValue = Math.max(1, totalIncome, totalExpenses);
  const inventorySegments = getInventorySegments(dashboardData.inventoryItems);
  const topInventoryItems = [...dashboardData.inventoryItems]
    .sort((first, second) => second.quantity - first.quantity)
    .slice(0, 5);
  const maxInventoryQuantity = Math.max(
    1,
    ...topInventoryItems.map((item) => item.quantity)
  );
  const inventoryHealthPercent =
    totalInventoryItems > 0
      ? Math.round(((totalInventoryItems - lowStockItems) / totalInventoryItems) * 100)
      : 0;

  const summaryCards = [
    {
      label: "Total Income",
      value: formatCurrency(totalIncome),
      helper: "All saved income records",
      color: "text-emerald-600",
      accent: "bg-emerald-50",
    },
    {
      label: "Total Expenses",
      value: formatCurrency(totalExpenses),
      helper: "All saved expense records",
      color: "text-red-500",
      accent: "bg-red-50",
    },
    {
      label: "Net Profit",
      value: formatCurrency(netProfit),
      helper: "Income minus expenses",
      color: netProfit >= 0 ? "text-blue-600" : "text-red-600",
      accent: netProfit >= 0 ? "bg-blue-50" : "bg-red-50",
    },
    {
      label: "Inventory Items",
      value: totalInventoryItems.toString(),
      helper: `${totalInventoryUnits} units in stock`,
      color: "text-violet-600",
      accent: "bg-violet-50",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-700 p-8 text-white shadow-xl shadow-blue-900/15">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
              Analytics Overview
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Clinic Performance Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
              Realtime financial and stock insights calculated from Supabase
              income, expenses, and inventory data.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
                Status
              </p>
              <p className="mt-2 text-sm font-semibold">
                {isLoading ? "Syncing..." : "Live data"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
                Stock Health
              </p>
              <p className="mt-2 text-2xl font-bold">
                {isLoading ? "..." : `${inventoryHealthPercent}%`}
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur sm:col-span-1">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
                Low Stock
              </p>
              <p className="mt-2 text-2xl font-bold">
                {isLoading ? "..." : lowStockItems}
              </p>
            </div>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {errorMessage}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${card.accent}`}
            >
              <span className={`text-lg font-bold ${card.color}`}>
                {card.label.charAt(0)}
              </span>
            </div>

            <h2 className="text-sm font-medium text-gray-500">
              {card.label}
            </h2>

            <p className={`mt-2 text-3xl font-bold ${card.color}`}>
              {isLoading ? "..." : card.value}
            </p>

            <p className="mt-3 text-sm text-slate-500">{card.helper}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 xl:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Income vs Expenses
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Seven-day trend from saved transaction dates.
              </p>
            </div>

            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                Income
              </span>
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                Expenses
              </span>
            </div>
          </div>

          <div className="mt-8 flex h-72 items-end gap-3 overflow-hidden rounded-2xl bg-slate-50 px-4 pb-4 pt-6 sm:gap-5">
            {trendData.map((day) => (
              <div
                key={day.label}
                className="flex h-full min-w-0 flex-1 flex-col justify-end gap-3"
              >
                <div className="flex flex-1 items-end justify-center gap-1.5">
                  <div
                    className="w-full max-w-8 rounded-t-xl bg-emerald-500 transition-all"
                    style={{
                      height: `${Math.max(4, (day.income / maxTrendValue) * 100)}%`,
                    }}
                    title={`Income: ${formatCurrency(day.income)}`}
                  />
                  <div
                    className="w-full max-w-8 rounded-t-xl bg-red-500 transition-all"
                    style={{
                      height: `${Math.max(4, (day.expenses / maxTrendValue) * 100)}%`,
                    }}
                    title={`Expenses: ${formatCurrency(day.expenses)}`}
                  />
                </div>
                <p className="truncate text-center text-xs font-medium text-slate-500">
                  {day.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Financial Mix
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Total income, expenses, and remaining profit.
          </p>

          <div className="mt-8 space-y-5">
            {[
              {
                label: "Income",
                value: totalIncome,
                color: "bg-emerald-500",
                textColor: "text-emerald-700",
              },
              {
                label: "Expenses",
                value: totalExpenses,
                color: "bg-red-500",
                textColor: "text-red-700",
              },
              {
                label: "Net Profit",
                value: netProfit,
                color: netProfit >= 0 ? "bg-blue-500" : "bg-red-500",
                textColor: netProfit >= 0 ? "text-blue-700" : "text-red-700",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">
                    {item.label}
                  </span>
                  <span className={`font-semibold ${item.textColor}`}>
                    {isLoading ? "..." : formatCurrency(item.value)}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.abs(item.value / maxFinanceValue) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Inventory Health
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Stock distribution by quantity range.
          </p>

          <div className="mt-8 space-y-5">
            {inventorySegments.map((segment) => {
              const percent =
                totalInventoryItems > 0
                  ? (segment.value / totalInventoryItems) * 100
                  : 0;

              return (
                <div key={segment.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600">
                      {segment.label}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {isLoading ? "..." : `${segment.value} items`}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${segment.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 xl:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Top Inventory Levels
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Highest quantity items currently available.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
              {totalInventoryUnits} total units
            </span>
          </div>

          <div className="mt-8 space-y-4">
            {topInventoryItems.length > 0 ? (
              topInventoryItems.map((item) => (
                <div key={item.id} className="grid gap-2 sm:grid-cols-[160px_1fr_80px] sm:items-center">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {item.name}
                  </p>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${(item.quantity / maxInventoryQuantity) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 sm:text-right">
                    {item.quantity} units
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center">
                <p className="font-semibold text-slate-800">
                  No inventory data yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Add inventory items to populate this chart.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
