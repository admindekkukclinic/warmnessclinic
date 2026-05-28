export type InstallmentInput = {
  isInstallment: boolean;
  totalMonths: string;
  currentMonth: string;
};

export type InstallmentData = {
  is_installment: boolean;
  installment_total_months: number | null;
  installment_current_month: number | null;
};

export type InstallmentExpense = {
  amount: number | string;
  is_installment?: boolean | null;
  installment_total_months?: number | null;
  installment_current_month?: number | null;
};

export const parseInstallmentInput = (
  input: InstallmentInput
): InstallmentData | null => {
  if (!input.isInstallment) {
    return {
      is_installment: false,
      installment_total_months: null,
      installment_current_month: null,
    };
  }

  const totalMonths = Number.parseInt(input.totalMonths, 10);
  const currentMonth = Number.parseInt(input.currentMonth, 10);

  if (
    !Number.isFinite(totalMonths) ||
    !Number.isFinite(currentMonth) ||
    totalMonths <= 0 ||
    currentMonth <= 0 ||
    currentMonth > totalMonths
  ) {
    return null;
  }

  return {
    is_installment: true,
    installment_total_months: totalMonths,
    installment_current_month: currentMonth,
  };
};

export const getInstallmentLabel = (expense: InstallmentExpense) => {
  if (
    !expense.is_installment ||
    !expense.installment_current_month ||
    !expense.installment_total_months
  ) {
    return "";
  }

  return `งวดที่ ${expense.installment_current_month} / ${expense.installment_total_months}`;
};

export const getRemainingInstallmentMonths = (expense: InstallmentExpense) => {
  if (
    !expense.is_installment ||
    !expense.installment_current_month ||
    !expense.installment_total_months
  ) {
    return 0;
  }

  return Math.max(
    expense.installment_total_months - expense.installment_current_month,
    0
  );
};

export const getRemainingInstallmentBalance = (expense: InstallmentExpense) =>
  getRemainingInstallmentMonths(expense) * Number(expense.amount || 0);
