"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Expense = {
  id: string;
  category: string;
  amount: number;
  created_at?: string;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amount);

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const getExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMessage("Unable to load expense records.");
    }

    return data ?? [];
  };

  const fetchExpenses = async () => {
    const data = await getExpenses();
    setExpenses(data);
  };

  useEffect(() => {
    let isMounted = true;

    const loadExpenses = async () => {
      const data = await getExpenses();

      if (isMounted) {
        setExpenses(data);
      }
    };

    loadExpenses();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetForm = () => {
    setCategory("");
    setAmount("");
  };

  const addExpense = async () => {
    const parsedAmount = Number.parseFloat(amount);

    if (!category.trim() || !Number.isFinite(parsedAmount)) {
      setErrorMessage("Enter a category and valid amount.");
      return;
    }

    const { error } = await supabase.from("expenses").insert([
      {
        category: category.trim(),
        amount: parsedAmount,
      },
    ]);

    if (error) {
      console.error(error);
      setErrorMessage("Unable to add expense record.");
      return;
    }

    setErrorMessage("");
    resetForm();
    fetchExpenses();
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditCategory(expense.category);
    setEditAmount(expense.amount.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCategory("");
    setEditAmount("");
  };

  const updateExpense = async (id: string) => {
    const parsedAmount = Number.parseFloat(editAmount);

    if (!editCategory.trim() || !Number.isFinite(parsedAmount)) {
      setErrorMessage("Enter a category and valid amount.");
      return;
    }

    const { error } = await supabase
      .from("expenses")
      .update({
        category: editCategory.trim(),
        amount: parsedAmount,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      setErrorMessage("Unable to update expense record.");
      return;
    }

    setErrorMessage("");
    cancelEdit();
    fetchExpenses();
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Delete this expense record?")) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      setErrorMessage("Unable to delete expense record.");
      return;
    }

    setErrorMessage("");
    fetchExpenses();
  };

  const filteredExpenses = expenses.filter((expense) =>
    expense.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const averageExpense =
    expenses.length > 0 ? totalExpenses / expenses.length : 0;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-rose-900 to-red-700 p-8 text-white shadow-xl shadow-red-900/15">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-200">
              Clinic Spending
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Expenses Management
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-red-100">
              Record operating costs, track spending categories, and keep
              expense data ready for reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-red-100">
                Records
              </p>
              <p className="mt-2 text-3xl font-bold">{expenses.length}</p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-red-100">
                Total Expenses
              </p>
              <p className="mt-2 text-3xl font-bold">
                {formatCurrency(totalExpenses)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-red-100">
                Average
              </p>
              <p className="mt-2 text-3xl font-bold">
                {formatCurrency(averageExpense)}
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
                Expense Records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Add expense categories and update amounts when costs change.
              </p>
            </div>

            <div className="relative w-full xl:max-w-sm">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Find
              </span>
              <input
                type="text"
                placeholder="Search categories"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-16 pr-4 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_180px_auto]">
            <input
              type="text"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />

            <button
              onClick={addExpense}
              className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
            >
              Add Expense
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
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => {
                const isEditing = editingId === expense.id;

                return (
                  <tr
                    key={expense.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-sm font-bold text-red-700">
                            {expense.category.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {expense.category}
                            </p>
                            <p className="text-xs text-slate-500">
                              Operating expense
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
                          className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-slate-900">
                          {formatCurrency(expense.amount)}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                        Saved
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => updateExpense(expense.id)}
                              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
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
                              onClick={() => startEdit(expense)}
                              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteExpense(expense.id)}
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

        {filteredExpenses.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-semibold text-slate-400">
              +
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              No expense records found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Add a new expense record or adjust your search term.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
