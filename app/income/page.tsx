"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Income = {
  id: string;
  treatment: string;
  amount: number;
  created_at?: string;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amount);

export default function IncomePage() {
  const [incomeItems, setIncomeItems] = useState<Income[]>([]);
  const [treatmentName, setTreatmentName] = useState("");
  const [amount, setAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTreatmentName, setEditTreatmentName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const getIncomeItems = async () => {
    const { data, error } = await supabase
      .from("income")
      .select("id, treatment, amount, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch income records:", error);
      setErrorMessage("Unable to load income records.");
    }

    return data ?? [];
  };

  const fetchIncomeItems = async () => {
    const data = await getIncomeItems();
    setIncomeItems(data);
  };

  useEffect(() => {
    let isMounted = true;

    const loadIncomeItems = async () => {
      const data = await getIncomeItems();

      if (isMounted) {
        setIncomeItems(data);
      }
    };

    loadIncomeItems();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetForm = () => {
    setTreatmentName("");
    setAmount("");
  };

  const addIncome = async () => {
    const parsedAmount = Number.parseFloat(amount);

    if (!treatmentName.trim() || !Number.isFinite(parsedAmount)) {
      setErrorMessage("Enter a treatment name and valid amount.");
      return;
    }

    const { error } = await supabase.from("income").insert([
      {
        treatment: treatmentName.trim(),
        amount: parsedAmount,
      },
    ]);

    if (error) {
      console.error("Failed to add income record:", error);
      setErrorMessage("Unable to add income record.");
      return;
    }

    setErrorMessage("");
    resetForm();
    fetchIncomeItems();
  };

  const startEdit = (income: Income) => {
    setEditingId(income.id);
    setEditTreatmentName(income.treatment);
    setEditAmount(income.amount.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTreatmentName("");
    setEditAmount("");
  };

  const updateIncome = async (id: string) => {
    const parsedAmount = Number.parseFloat(editAmount);

    if (!editTreatmentName.trim() || !Number.isFinite(parsedAmount)) {
      setErrorMessage("Enter a treatment name and valid amount.");
      return;
    }

    const { error } = await supabase
      .from("income")
      .update({
        treatment: editTreatmentName.trim(),
        amount: parsedAmount,
      })
      .eq("id", id);

    if (error) {
      console.error("Failed to update income record:", error);
      setErrorMessage("Unable to update income record.");
      return;
    }

    setErrorMessage("");
    cancelEdit();
    fetchIncomeItems();
  };

  const deleteIncome = async (id: string) => {
    if (!confirm("Delete this income record?")) return;

    const { error } = await supabase
      .from("income")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete income record:", error);
      setErrorMessage("Unable to delete income record.");
      return;
    }

    setErrorMessage("");
    fetchIncomeItems();
  };

  const filteredIncomeItems = incomeItems.filter((income) =>
    income.treatment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalIncome = incomeItems.reduce(
    (sum, income) => sum + income.amount,
    0
  );
  const averageIncome =
    incomeItems.length > 0 ? totalIncome / incomeItems.length : 0;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-900 to-emerald-700 p-8 text-white shadow-xl shadow-emerald-900/15">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Clinic Revenue
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Income Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100">
              Record completed treatments, track revenue, and keep income data
              ready for reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">
                Records
              </p>
              <p className="mt-2 text-3xl font-bold">{incomeItems.length}</p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">
                Total Income
              </p>
              <p className="mt-2 text-3xl font-bold">
                {formatCurrency(totalIncome)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">
                Average
              </p>
              <p className="mt-2 text-3xl font-bold">
                {formatCurrency(averageIncome)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Income Records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Add treatment income and update amounts when records change.
              </p>
            </div>

            <div className="relative w-full xl:max-w-sm">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Find
              </span>
              <input
                type="text"
                placeholder="Search treatments"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-16 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_180px_auto]">
            <input
              type="text"
              placeholder="Treatment name"
              value={treatmentName}
              onChange={(e) => setTreatmentName(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <button
              onClick={addIncome}
              className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              Add Income
            </button>
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Treatment</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredIncomeItems.map((income) => {
                const isEditing = editingId === income.id;

                return (
                  <tr
                    key={income.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTreatmentName}
                          onChange={(e) => setEditTreatmentName(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700">
                            {income.treatment.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {income.treatment}
                            </p>
                            <p className="text-xs text-slate-500">
                              Treatment income
                            </p>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-5">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-slate-900">
                          {formatCurrency(income.amount)}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        Saved
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => updateIncome(income.id)}
                              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                            >
                              Save
                            </button>

                            <button
                              onClick={cancelEdit}
                              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(income)}
                              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteIncome(income.id)}
                              className="rounded-xl border border-red-100 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredIncomeItems.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-semibold text-slate-400">
              +
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              No income records found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Add a new income record or adjust your search term.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
