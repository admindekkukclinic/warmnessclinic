export type ExpenseType = "one_time" | "recurring";

export type ExpenseCategory = {
  id: string;
  name: string;
  created_at?: string;
};

export type Expense = {
  id: string;
  title: string | null;
  category_id: string | null;
  category: string;
  amount: number | string;
  expense_date: string | null;
  expense_type?: ExpenseType;
  recurring_expense_id?: string | null;
  paid_month?: string | null;
  is_installment?: boolean;
  installment_total_months?: number | null;
  installment_current_month?: number | null;
  installment_group_id?: string | null;
  created_at?: string;
};

export type RecurringExpense = {
  id: string;
  title: string;
  category_id?: string | null;
  category?: string | null;
  monthly_amount: number | string;
  payment_date?: string | null;
  start_month?: string | null;
  end_month?: string | null;
  total_months: number;
  paid_months?: number;
  current_month?: number | null;
  payment_day?: number | null;
  fixed_monthly_amount?: boolean | null;
  is_active?: boolean | null;
  created_at?: string;
};

export type RecurringExpensePayload = {
  title: string;
  monthly_amount: number;
  payment_date: string;
  total_months: number;
  current_month: number;
};
