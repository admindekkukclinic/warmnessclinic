"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type InventoryItem = {
  id: string;
  quantity: number;
};

type MoneyRecord = {
  id: string;
  amount: number | string;
};

type DashboardData = {
  inventoryItems: InventoryItem[];
  incomeItems: MoneyRecord[];
  expenseItems: MoneyRecord[];
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
          supabase.from("inventory").select("id, quantity"),
          supabase.from("income").select("id, amount"),
          supabase.from("expenses").select("id, amount"),
        ]);

      const errors = [
        inventoryResult.error,
        incomeResult.error,
        expensesResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error("Failed to load dashboard data:", errors);

        if (isMounted) {
          setErrorMessage("Unable to load dashboard data.");
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
      .channel("dashboard-metrics")
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
          console.error("Dashboard realtime subscription failed.");
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
  const totalIncome = getAmountTotal(dashboardData.incomeItems);
  const totalExpenses = getAmountTotal(dashboardData.expenseItems);
  const netProfit = totalIncome - totalExpenses;

  const summaryCards = [
    {
      label: "Inventory Items",
      value: totalInventoryItems.toString(),
      helper: "Products currently tracked",
      color: "text-blue-600",
      accent: "bg-blue-50",
    },
    {
      label: "Low Stock Items",
      value: `${lowStockItems} Items`,
      helper: "Quantity at 5 or below",
      color: "text-orange-500",
      accent: "bg-orange-50",
    },
    {
      label: "Total Income",
      value: formatCurrency(totalIncome),
      helper: "All saved income records",
      color: "text-green-600",
      accent: "bg-green-50",
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
      color: netProfit >= 0 ? "text-emerald-600" : "text-red-600",
      accent: netProfit >= 0 ? "bg-emerald-50" : "bg-red-50",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 p-8 text-white shadow-xl shadow-blue-900/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
              Clinic Overview
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
              Live clinic metrics calculated from inventory, income, and
              expenses data in Supabase.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
              Status
            </p>
            <p className="mt-2 text-sm font-semibold">
              {isLoading ? "Syncing data..." : "Live data loaded"}
            </p>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {errorMessage}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
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
    </div>
  );
}
