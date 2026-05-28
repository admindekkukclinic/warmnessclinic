"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { parseInstallmentInput } from "@/lib/expenseInstallments";
import type { RecurringExpense } from "@/lib/expenseTypes";

type ExpenseCategory = {
  id: string;
  name: string;
  created_at?: string;
};

type Expense = {
  id: string;
  title: string | null;
  category_id: string | null;
  category: string;
  amount: number | string;
  expense_date: string | null;
  expense_type?: "one_time" | "recurring";
  recurring_expense_id?: string | null;
  paid_month?: string | null;
  is_installment: boolean;
  installment_total_months: number | null;
  installment_current_month: number | null;
  installment_group_id: string | null;
  created_at?: string;
};

type ExpensePayload = {
  title: string;
  category_id: string | null;
  category: string;
  amount: number;
  expense_date: string;
  is_installment: boolean;
  installment_total_months: number | null;
  installment_current_month: number | null;
  installment_group_id: string | null;
};

type ExpenseTab =
  | "one_time"
  | "monthly"
  | "doctor_fee"
  | "lab_fee"
  | "recurring";

type RecurringExpensePayload = {
  title: string;
  monthly_amount: number;
  payment_date: string;
  total_months: number;
  current_month: number;
};

const INSTALLMENT_EXPENSE_TITLES = [
  "ค่าผ่อนหนี้คุณแม่",
  "ค่าผ่อนเครื่องสแกนฟัน",
  "ค่าผ่อนยูนิต",
];

const INSTALLMENT_MONTHLY_AMOUNT_BY_TITLE: Record<string, string> = {
  "ค่าผ่อนหนี้คุณแม่": "5000",
  "ค่าผ่อนเครื่องสแกนฟัน": "16660",
  "ค่าผ่อนยูนิต": "34444.46",
};

const INSTALLMENT_TOTAL_MONTHS_BY_TITLE: Record<string, string> = {
  "ค่าผ่อนหนี้คุณแม่": "80",
  "ค่าผ่อนเครื่องสแกนฟัน": "48",
  "ค่าผ่อนยูนิต": "36",
};

const INSTALLMENT_CURRENT_MONTH_BY_TITLE: Record<string, string> = {};

const INSTALLMENT_CURRENT_MONTH_RULE_BY_TITLE: Record<
  string,
  { baseMonth: string; baseCurrentMonth: number }
> = {
  "ค่าผ่อนหนี้คุณแม่": {
    baseMonth: "2026-05",
    baseCurrentMonth: 16,
  },
  "ค่าผ่อนเครื่องสแกนฟัน": {
    baseMonth: "2026-05",
    baseCurrentMonth: 26,
  },
  "ค่าผ่อนยูนิต": {
    baseMonth: "2026-03",
    baseCurrentMonth: 17,
  },
};

const ALL_INSTALLMENT_EXPENSES_VALUE = "__all_installment_expenses__";

const MONTHLY_EXPENSE_CATEGORY = "รายจ่ายประจำ";
const LEGACY_MONTHLY_EXPENSE_CATEGORY = "รายจ่ายประจำเดือน";

const isMonthlyExpenseCategory = (category: string) =>
  category === MONTHLY_EXPENSE_CATEGORY ||
  category === LEGACY_MONTHLY_EXPENSE_CATEGORY;

const getExpenseCategoryLabel = (category: string) =>
  category === LEGACY_MONTHLY_EXPENSE_CATEGORY
    ? MONTHLY_EXPENSE_CATEGORY
    : category;

const MONTHLY_EXPENSE_TITLES = [
  "ค่าเช่าคลินิก",
  "ค่าจ้างพนักงานประจำ",
  "ค่าภาษีลูกจ้าง",
  "หักเงินเข้ากองกลาง",
  "ค่าไฟฟ้า",
  "ค่าน้ำ",
  "ค่าอินเตอร์เน็ต",
  "ค่าโทรศัพท์",
  "ค่าธรรมเนียมชำระบัตร",
  "ค่าขยะติดเชื้อ",
  "ค่า OT/ สวัสดิการพิเศษ",
  "ค่าภาษีป้าย",
  "ค่าภาษีโรงเรือน",
];

const MONTHLY_EXPENSE_AMOUNT_BY_TITLE: Record<string, string> = {
  "ค่าเช่าคลินิก": "15000",
  "ค่าจ้างพนักงานประจำ": "24000",
  "ค่าภาษีลูกจ้าง": "540",
  "หักเงินเข้ากองกลาง": "3000",
};

const ALL_MONTHLY_EXPENSES_VALUE = "__all_monthly_expenses__";

const DOCTOR_FEE_CATEGORY = "Doctor fee";
const DOCTOR_FEE_LAB_CATEGORY = "Doctor fee ค่าแลปส่วนร้าน";

const LAB_FEE_CATEGORY = "ค่าแลป";

const LAB_FEE_DOCTOR_NAMES = [
  "ทพ.ทศพล อินประโคน",
  "ทพญ.ดวงประทีป วัฒนโกศล",
  "ทพญ.กุลรวี อินประโคน",
  "ทพ.สันติ การรัมย์",
  "ทพญ.ปรางทิพย์ วรขจิต",
];

const DOCTOR_FEE_TITLES = LAB_FEE_DOCTOR_NAMES;

const LAB_FEE_COMPANIES = [
  "Artechna",
  "Dentifi",
  "KDL",
  "Hexa",
  "Dentaneer",
  "บ้านหมอฟัน",
  "PC",
  "Tooconcept",
];

const LAB_FEE_WORK_TYPES = [
  "ครอบฟัน",
  "ครอบฟันบนรากเทียม",
  "ฟันเทียมถอดได้",
  "Special tray",
  "Occlusion rim",
  "Essix retainer",
  "Retainer จัดฟัน",
  "สะพานฟัน",
  "อุปกรณ์รากเทียม",
];

type DoctorFeeRecord = {
  id: string;
  title: string;
  grossAmount: number;
  labAmount: number;
  doctorLabShare: number;
  clinicLabShare: number;
  netAmount: number;
  expenseDate: string | null;
  feeExpense: Expense;
  labExpense?: Expense;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(amount);

const getDoctorFeeBreakdown = (grossAmount: number, labAmount: number) => {
  const safeGrossAmount = Number.isFinite(grossAmount) ? grossAmount : 0;
  const safeLabAmount = Number.isFinite(labAmount) ? labAmount : 0;
  const doctorLabShare = safeLabAmount / 2;
  const clinicLabShare = safeLabAmount / 2;
  const netAmount = Math.max(safeGrossAmount - doctorLabShare, 0);

  return {
    clinicLabShare,
    doctorLabShare,
    netAmount,
  };
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const getCurrentMonthInput = () => new Date().toISOString().slice(0, 7);

const getMonthInputFromDate = (date: string) => date.slice(0, 7);

const getMonthDifference = (fromMonth: string, toMonth: string) => {
  const [fromYear, fromMonthIndex] = fromMonth.split("-").map(Number);
  const [toYear, toMonthIndex] = toMonth.split("-").map(Number);

  return (toYear - fromYear) * 12 + (toMonthIndex - fromMonthIndex);
};

const getInstallmentCurrentMonthByTitle = (
  title: string,
  paymentDate: string
) => {
  const rule = INSTALLMENT_CURRENT_MONTH_RULE_BY_TITLE[title];

  if (rule && paymentDate) {
    const calculatedMonth =
      rule.baseCurrentMonth +
      getMonthDifference(rule.baseMonth, getMonthInputFromDate(paymentDate));
    const totalMonths = Number.parseInt(
      INSTALLMENT_TOTAL_MONTHS_BY_TITLE[title] ?? "0",
      10
    );

    return Math.min(Math.max(calculatedMonth, 0), totalMonths).toString();
  }

  return INSTALLMENT_CURRENT_MONTH_BY_TITLE[title] ?? "";
};

const getResolvedInstallmentCurrentMonth = (
  title: string,
  paymentDate: string,
  enteredCurrentMonth: string
) =>
  INSTALLMENT_CURRENT_MONTH_RULE_BY_TITLE[title]
    ? getInstallmentCurrentMonthByTitle(title, paymentDate)
    : enteredCurrentMonth;

const getPaymentDayFromDate = (paymentDate: string) =>
  Number.parseInt(paymentDate.slice(8, 10), 10);

const getPaymentDateForMonth = (month: string, paymentDay: number) => {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  const safeDay = Math.min(paymentDay, lastDay);

  return `${month}-${safeDay.toString().padStart(2, "0")}`;
};

const getRecurringStartMonth = (expense: RecurringExpense) =>
  expense.start_month?.slice(0, 7) ??
  (expense.payment_date
    ? getMonthInputFromDate(expense.payment_date)
    : getCurrentMonthInput());

const getRecurringPaymentDay = (expense: RecurringExpense) =>
  Number(expense.payment_day) ||
  (expense.payment_date ? getPaymentDayFromDate(expense.payment_date) : 1);

const getRecurringCurrentMonth = (expense: RecurringExpense) =>
  Number(expense.current_month ?? expense.paid_months ?? 0);

const formatDate = (date: string | null | undefined) => {
  if (!date) return "ยังไม่ระบุ";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const logSupabaseError = (message: string, error: unknown) => {
  if (error && typeof error === "object") {
    console.error(message, getSupabaseErrorDetails(error));
    return;
  }

  console.error(message, error);
};

const getSupabaseErrorDetails = (error: unknown) => {
  if (error && typeof error === "object") {
    const supabaseError = error as {
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      message?: unknown;
    };

    return {
      message: supabaseError.message,
      details: supabaseError.details,
      hint: supabaseError.hint,
      code: supabaseError.code,
      error,
    };
  }

  return { error };
};

const getSupabaseErrorMessage = (fallback: string, error: unknown) => {
  const details = getSupabaseErrorDetails(error);
  const detailText = [
    ["message", details.message],
    ["details", details.details],
    ["hint", details.hint],
    ["code", details.code],
  ]
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `${label}: ${String(value)}`)
    .join(" | ");

  if (detailText) {
    return `${fallback}: ${detailText}`;
  }

  return fallback;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<
    RecurringExpense[]
  >([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [activeTab, setActiveTab] = useState<ExpenseTab>("recurring");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [expenseDate, setExpenseDate] = useState(getTodayDate());
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentTotalMonths, setInstallmentTotalMonths] = useState("");
  const [installmentCurrentMonth, setInstallmentCurrentMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState(getTodayDate());
  const [isLoading, setIsLoading] = useState(true);
  const [isRecurringLoading, setIsRecurringLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [recurringErrorMessage, setRecurringErrorMessage] = useState("");
  const [recurringTitle, setRecurringTitle] = useState("");
  const [recurringMonthlyAmount, setRecurringMonthlyAmount] = useState("");
  const [recurringTotalMonths, setRecurringTotalMonths] = useState("");
  const [recurringPaidMonths, setRecurringPaidMonths] = useState("");
  const [recurringPaymentDate, setRecurringPaymentDate] = useState(
    getTodayDate()
  );
  const [monthlyTitle, setMonthlyTitle] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [monthlyExpenseDate, setMonthlyExpenseDate] = useState(getTodayDate());
  const [monthlyErrorMessage, setMonthlyErrorMessage] = useState("");
  const [doctorFeeTitle, setDoctorFeeTitle] = useState("");
  const [doctorFeeAmount, setDoctorFeeAmount] = useState("");
  const [doctorFeeDate, setDoctorFeeDate] = useState(getTodayDate());
  const [doctorFeeErrorMessage, setDoctorFeeErrorMessage] = useState("");
  const [editingDoctorFeeId, setEditingDoctorFeeId] = useState<string | null>(
    null
  );
  const [editDoctorFeeGrossAmount, setEditDoctorFeeGrossAmount] = useState("");
  const [editDoctorFeeLabAmount, setEditDoctorFeeLabAmount] = useState("");
  const [editDoctorFeeDate, setEditDoctorFeeDate] = useState(getTodayDate());
  const [labFeeDoctorName, setLabFeeDoctorName] = useState("");
  const [labFeeCompany, setLabFeeCompany] = useState("");
  const [labFeeWorkType, setLabFeeWorkType] = useState("");
  const [labFeeAmount, setLabFeeAmount] = useState("");
  const [labFeeDate, setLabFeeDate] = useState(getTodayDate());
  const [labFeeErrorMessage, setLabFeeErrorMessage] = useState("");
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(
    null
  );
  const [editRecurringTitle, setEditRecurringTitle] = useState("");
  const [editRecurringMonthlyAmount, setEditRecurringMonthlyAmount] =
    useState("");
  const [editRecurringTotalMonths, setEditRecurringTotalMonths] = useState("");
  const [editRecurringPaidMonths, setEditRecurringPaidMonths] = useState("");
  const [editRecurringPaymentDate, setEditRecurringPaymentDate] =
    useState(getTodayDate());
  const [summaryMonth, setSummaryMonth] = useState(getCurrentMonthInput());

  const getCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("id, name, created_at")
      .order("name", { ascending: true });

    if (error) {
      logSupabaseError("Failed to load expense categories:", error);
    }

    return data ?? [];
  }, []);

  const getExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      logSupabaseError("Failed to load expense records:", error);
      setErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถโหลดรายการรายจ่ายได้", error)
      );
    }

    return data ?? [];
  }, []);

  const getRecurringExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from("recurring_expenses")
      .select("*");

    if (error) {
      logSupabaseError("Failed to load recurring expenses:", error);
      setRecurringErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถโหลดรายการผ่อนได้", error)
      );
    }

    return data ?? [];
  }, []);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    const data = await getExpenses();
    setExpenses(data);
    setIsLoading(false);
  }, [getExpenses]);

  const fetchRecurringExpenses = useCallback(async () => {
    setIsRecurringLoading(true);
    const data = await getRecurringExpenses();
    setRecurringExpenses(data);
    setIsRecurringLoading(false);
  }, [getRecurringExpenses]);

  const getUsedMonthlyExpenseTitles = useCallback(
    (month: string) =>
      new Set(
        expenses
          .filter(
            (expense) =>
              isMonthlyExpenseCategory(expense.category) &&
              (expense.expense_date ?? "").startsWith(month)
          )
          .map((expense) => expense.title ?? "")
          .filter(Boolean)
      ),
    [expenses]
  );

  const getUsedDoctorFeeTitles = useCallback(
    (month: string) =>
      new Set(
        expenses
          .filter(
            (expense) =>
              expense.category === DOCTOR_FEE_CATEGORY &&
              (expense.expense_date ?? "").startsWith(month)
          )
          .map((expense) => expense.title ?? "")
          .filter(Boolean)
      ),
    [expenses]
  );

  const getDoctorLabFeeTotal = useCallback(
    (doctorName: string, month: string) =>
      expenses
        .filter(
          (expense) =>
            expense.category === LAB_FEE_CATEGORY &&
            (expense.expense_date ?? "").startsWith(month) &&
            (expense.title ?? "").startsWith(`${doctorName} -`)
        )
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses]
  );

  useEffect(() => {
    let isMounted = true;

    const loadPageData = async () => {
      const [categoryData, expenseData, recurringExpenseData] =
        await Promise.all([
          getCategories(),
          getExpenses(),
          getRecurringExpenses(),
        ]);

      if (isMounted) {
        setCategories(categoryData);
        setExpenses(expenseData);
        setRecurringExpenses(recurringExpenseData);
        setIsLoading(false);
        setIsRecurringLoading(false);
      }
    };

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, [getCategories, getExpenses, getRecurringExpenses]);

  const resetExpenseForm = () => {
    setAmount("");
    setTitle("");
    setExpenseDate(getTodayDate());
    setIsInstallment(false);
    setInstallmentTotalMonths("");
    setInstallmentCurrentMonth("");
  };

  const resetRecurringForm = () => {
    setRecurringTitle("");
    setRecurringMonthlyAmount("");
    setRecurringTotalMonths("");
    setRecurringPaidMonths("");
    setRecurringPaymentDate(getTodayDate());
  };

  const resetMonthlyExpenseForm = () => {
    setMonthlyTitle("");
    setMonthlyAmount("");
    setMonthlyExpenseDate(getTodayDate());
  };

  const resetDoctorFeeForm = () => {
    setDoctorFeeTitle("");
    setDoctorFeeAmount("");
    setDoctorFeeDate(getTodayDate());
  };

  const resetLabFeeForm = () => {
    setLabFeeDoctorName("");
    setLabFeeCompany("");
    setLabFeeWorkType("");
    setLabFeeAmount("");
    setLabFeeDate(getTodayDate());
  };

  const getRecurringExpensePayload = ({
    currentMonths,
    monthlyAmount,
    paymentDate,
    title,
    totalMonths,
  }: {
    currentMonths: string;
    monthlyAmount: string;
    paymentDate: string;
    title: string;
    totalMonths: string;
  }): RecurringExpensePayload | null => {
    const parsedMonthlyAmount = Number.parseFloat(monthlyAmount);
    const parsedTotalMonths = Number.parseInt(totalMonths, 10);
    const parsedCurrentMonths = Number.parseInt(currentMonths, 10);

    if (
      !title.trim() ||
      !Number.isFinite(parsedMonthlyAmount) ||
      parsedMonthlyAmount <= 0 ||
      !paymentDate ||
      !Number.isFinite(parsedTotalMonths) ||
      parsedTotalMonths <= 0 ||
      !Number.isFinite(parsedCurrentMonths) ||
      parsedCurrentMonths < 0 ||
      parsedCurrentMonths > parsedTotalMonths
    ) {
      return null;
    }

    return {
      title: title.trim(),
      monthly_amount: parsedMonthlyAmount,
      payment_date: paymentDate,
      total_months: parsedTotalMonths,
      current_month: parsedCurrentMonths,
    };
  };

  const getExpensePayload = (
    enteredTitle: string,
    enteredAmount: string,
    enteredDate: string,
    installmentInput: {
      isInstallment: boolean;
      totalMonths: string;
      currentMonth: string;
    },
    existingExpense?: Pick<
      Expense,
      "category" | "category_id" | "installment_group_id"
    > | null
  ): ExpensePayload | null => {
    const parsedAmount = Number.parseFloat(enteredAmount);
    const trimmedTitle = enteredTitle.trim();
    const installmentData = parseInstallmentInput(installmentInput);

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount < 0 ||
      !enteredDate ||
      !installmentData
    ) {
      return null;
    }

    // One expense row represents the current monthly payment. The group id
    // lets future rows for the same installment plan be tied together.
    const installmentGroupId = installmentData.is_installment
      ? existingExpense?.installment_group_id ?? crypto.randomUUID()
      : null;

    return {
      title: trimmedTitle,
      category_id: existingExpense?.category_id ?? null,
      category: existingExpense?.category ?? "รายจ่ายครั้งเดียว",
      amount: parsedAmount,
      expense_date: enteredDate,
      ...installmentData,
      installment_group_id: installmentGroupId,
    };
  };

  const addExpense = async () => {
    const payload = getExpensePayload(
      title,
      amount,
      expenseDate,
      {
        isInstallment,
        totalMonths: installmentTotalMonths,
        currentMonth: installmentCurrentMonth,
      }
    );

    if (!payload) {
      setErrorMessage(
        "กรุณากรอกจำนวนเงิน วันที่ และข้อมูลงวดให้ถูกต้อง"
      );
      return;
    }

    const { error } = await supabase.from("expenses").insert([payload]);

    if (error) {
      logSupabaseError("Failed to add expense record:", error);
      setErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถเพิ่มรายการรายจ่ายได้", error)
      );
      return;
    }

    setErrorMessage("");
    resetExpenseForm();
    fetchExpenses();
  };

  const addRecurringExpense = async () => {
    if (recurringTitle === ALL_INSTALLMENT_EXPENSES_VALUE) {
      const enteredCurrentMonths = Number.parseInt(recurringPaidMonths, 10);

      if (
        !recurringPaymentDate ||
        (recurringPaidMonths !== "" &&
          (!Number.isFinite(enteredCurrentMonths) || enteredCurrentMonths < 0))
      ) {
        setRecurringErrorMessage(
          "กรุณากรอกงวดปัจจุบัน และวันที่จ่ายให้ถูกต้อง"
        );
        return;
      }

      const existingTitles = new Set(
        recurringExpenses.map((expense) => expense.title).filter(Boolean)
      );
      const titlesToInsert = INSTALLMENT_EXPENSE_TITLES.filter(
        (title) => !existingTitles.has(title)
      );

      if (titlesToInsert.length === 0) {
        setRecurringErrorMessage("บันทึกรายการผ่อนครบแล้ว");
        setRecurringTitle("");
        setRecurringMonthlyAmount("");
        setRecurringTotalMonths("");
        return;
      }

      const insertPayloads: RecurringExpensePayload[] = titlesToInsert.map(
        (title) => ({
          title,
          monthly_amount: Number.parseFloat(
            INSTALLMENT_MONTHLY_AMOUNT_BY_TITLE[title]
          ),
          total_months: Number.parseInt(
            INSTALLMENT_TOTAL_MONTHS_BY_TITLE[title],
            10
          ),
          current_month: Number.parseInt(
            recurringPaidMonths ||
              getInstallmentCurrentMonthByTitle(title, recurringPaymentDate) ||
              "0",
            10
          ),
          payment_date: recurringPaymentDate,
        })
      );

      const { error } = await supabase
        .from("recurring_expenses")
        .insert(insertPayloads);

      if (error) {
        logSupabaseError("Failed to add all recurring expenses:", error);
        setRecurringErrorMessage(
          getSupabaseErrorMessage("ไม่สามารถเพิ่มรายการผ่อนได้", error)
        );
        return;
      }

      setRecurringErrorMessage("");
      resetRecurringForm();
      fetchRecurringExpenses();
      return;
    }

    const payload = getRecurringExpensePayload({
      currentMonths: getResolvedInstallmentCurrentMonth(
        recurringTitle,
        recurringPaymentDate,
        recurringPaidMonths
      ),
      monthlyAmount: recurringMonthlyAmount,
      paymentDate: recurringPaymentDate,
      title: recurringTitle,
      totalMonths: recurringTotalMonths,
    });

    if (!payload) {
      setRecurringErrorMessage(
        "กรุณาเลือกรายการผ่อน กรอกยอดเงินมากกว่า 0 จำนวนงวด งวดที่จ่ายแล้ว และวันที่จ่ายให้ถูกต้อง"
      );
      return;
    }

    const insertPayload: RecurringExpensePayload = {
      title: payload.title,
      monthly_amount: payload.monthly_amount,
      total_months: payload.total_months,
      current_month: payload.current_month,
      payment_date: payload.payment_date,
    };

    const { error } = await supabase
      .from("recurring_expenses")
      .insert([insertPayload]);

    if (error) {
      logSupabaseError("Failed to add recurring expense:", error);
      setRecurringErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถเพิ่มรายการผ่อนได้", error)
      );
      return;
    }

    setRecurringErrorMessage("");
    resetRecurringForm();
    fetchRecurringExpenses();
  };

  const addMonthlyExpense = async () => {
    if (monthlyTitle === ALL_MONTHLY_EXPENSES_VALUE) {
      if (!monthlyExpenseDate) {
        setMonthlyErrorMessage("กรุณาเลือกวันที่จ่ายเงินให้ถูกต้อง");
        return;
      }

      const selectedMonth = getMonthInputFromDate(monthlyExpenseDate);
      const usedTitles = getUsedMonthlyExpenseTitles(selectedMonth);
      const titlesToInsert = MONTHLY_EXPENSE_TITLES.filter(
        (title) => !usedTitles.has(title)
      );

      if (titlesToInsert.length === 0) {
        setMonthlyErrorMessage("บันทึกรายจ่ายประจำครบแล้วสำหรับเดือนนี้");
        setMonthlyTitle("");
        setMonthlyAmount("");
        return;
      }

      const payloads: ExpensePayload[] = titlesToInsert.map((title) => ({
        title,
        category_id: null,
        category: MONTHLY_EXPENSE_CATEGORY,
        amount: Number.parseFloat(MONTHLY_EXPENSE_AMOUNT_BY_TITLE[title]),
        expense_date: monthlyExpenseDate,
        is_installment: false,
        installment_total_months: null,
        installment_current_month: null,
        installment_group_id: null,
      }));

      const { error } = await supabase.from("expenses").insert(payloads);

      if (error) {
        logSupabaseError("Failed to add all monthly expenses:", error);
        setMonthlyErrorMessage(
          getSupabaseErrorMessage("ไม่สามารถเพิ่มรายจ่ายประจำได้", error)
        );
        return;
      }

      setMonthlyErrorMessage("");
      resetMonthlyExpenseForm();
      fetchExpenses();
      return;
    }

    const parsedAmount = Number.parseFloat(monthlyAmount);
    const trimmedTitle = monthlyTitle.trim();

    if (
      !trimmedTitle ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !monthlyExpenseDate
    ) {
      setMonthlyErrorMessage(
        "กรุณากรอกชื่อรายการ จำนวนเงิน และวันที่จ่ายเงินให้ถูกต้อง"
      );
      return;
    }

    if (
      getUsedMonthlyExpenseTitles(
        getMonthInputFromDate(monthlyExpenseDate)
      ).has(trimmedTitle)
    ) {
      setMonthlyErrorMessage(
        "รายการนี้ถูกบันทึกในเดือนนี้แล้ว กรุณาเลือกรายการอื่นหรือเปลี่ยนเดือน"
      );
      setMonthlyTitle("");
      setMonthlyAmount("");
      return;
    }

    const payload: ExpensePayload = {
      title: trimmedTitle,
      category_id: null,
      category: MONTHLY_EXPENSE_CATEGORY,
      amount: parsedAmount,
      expense_date: monthlyExpenseDate,
      is_installment: false,
      installment_total_months: null,
      installment_current_month: null,
      installment_group_id: null,
    };

    const { error } = await supabase.from("expenses").insert([payload]);

    if (error) {
      logSupabaseError("Failed to add monthly expense:", error);
      setMonthlyErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถเพิ่มรายจ่ายประจำได้", error)
      );
      return;
    }

    setMonthlyErrorMessage("");
    resetMonthlyExpenseForm();
    fetchExpenses();
  };

  const addDoctorFee = async () => {
    const parsedGrossAmount = Number.parseFloat(doctorFeeAmount);
    const trimmedTitle = doctorFeeTitle.trim();
    const parsedLabAmount =
      trimmedTitle && doctorFeeDate
        ? getDoctorLabFeeTotal(
            trimmedTitle,
            getMonthInputFromDate(doctorFeeDate)
          )
        : 0;

    if (
      !trimmedTitle ||
      !Number.isFinite(parsedGrossAmount) ||
      parsedGrossAmount <= 0 ||
      !Number.isFinite(parsedLabAmount) ||
      parsedLabAmount < 0 ||
      !doctorFeeDate
    ) {
      setDoctorFeeErrorMessage(
        "กรุณาเลือกรายการ กรอก Doctor fee ค่าแลป และวันที่จ่ายเงินให้ถูกต้อง"
      );
      return;
    }

    if (
      getUsedDoctorFeeTitles(getMonthInputFromDate(doctorFeeDate)).has(
        trimmedTitle
      )
    ) {
      setDoctorFeeErrorMessage(
        "รายการนี้ถูกบันทึกในเดือนนี้แล้ว กรุณาเลือกรายการอื่นหรือเปลี่ยนเดือน"
      );
      setDoctorFeeTitle("");
      setDoctorFeeAmount("");
      return;
    }

    const { clinicLabShare, netAmount } = getDoctorFeeBreakdown(
      parsedGrossAmount,
      parsedLabAmount
    );
    const payloads: ExpensePayload[] = [
      {
        title: trimmedTitle,
        category_id: null,
        category: DOCTOR_FEE_CATEGORY,
        amount: netAmount,
        expense_date: doctorFeeDate,
        is_installment: false,
        installment_total_months: null,
        installment_current_month: null,
        installment_group_id: null,
      },
    ];

    if (clinicLabShare > 0) {
      payloads.push({
        title: trimmedTitle,
        category_id: null,
        category: DOCTOR_FEE_LAB_CATEGORY,
        amount: clinicLabShare,
        expense_date: doctorFeeDate,
        is_installment: false,
        installment_total_months: null,
        installment_current_month: null,
        installment_group_id: null,
      });
    }

    const { error } = await supabase.from("expenses").insert(payloads);

    if (error) {
      logSupabaseError("Failed to add doctor fee:", error);
      setDoctorFeeErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถเพิ่ม Doctor fee ได้", error)
      );
      return;
    }

    setDoctorFeeErrorMessage("");
    resetDoctorFeeForm();
    fetchExpenses();
  };

  const updateDoctorFee = async (record: DoctorFeeRecord) => {
    const parsedGrossAmount = Number.parseFloat(editDoctorFeeGrossAmount);
    const parsedLabAmount = Number.parseFloat(editDoctorFeeLabAmount || "0");

    if (
      !Number.isFinite(parsedGrossAmount) ||
      parsedGrossAmount <= 0 ||
      !Number.isFinite(parsedLabAmount) ||
      parsedLabAmount < 0 ||
      !editDoctorFeeDate
    ) {
      setDoctorFeeErrorMessage(
        "กรุณากรอก Doctor fee ค่าแลป และวันที่จ่ายเงินให้ถูกต้อง"
      );
      return;
    }

    const { clinicLabShare, netAmount } = getDoctorFeeBreakdown(
      parsedGrossAmount,
      parsedLabAmount
    );
    const feePayload: ExpensePayload = {
      title: record.title,
      category_id: null,
      category: DOCTOR_FEE_CATEGORY,
      amount: netAmount,
      expense_date: editDoctorFeeDate,
      is_installment: false,
      installment_total_months: null,
      installment_current_month: null,
      installment_group_id: null,
    };

    const { error: feeError } = await supabase
      .from("expenses")
      .update(feePayload)
      .eq("id", record.feeExpense.id);

    if (feeError) {
      logSupabaseError("Failed to update doctor fee:", feeError);
      setDoctorFeeErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถอัปเดต Doctor fee ได้", feeError)
      );
      return;
    }

    if (clinicLabShare > 0) {
      const labPayload: ExpensePayload = {
        title: record.title,
        category_id: null,
        category: DOCTOR_FEE_LAB_CATEGORY,
        amount: clinicLabShare,
        expense_date: editDoctorFeeDate,
        is_installment: false,
        installment_total_months: null,
        installment_current_month: null,
        installment_group_id: null,
      };

      const labResult = record.labExpense
        ? await supabase
            .from("expenses")
            .update(labPayload)
            .eq("id", record.labExpense.id)
        : await supabase.from("expenses").insert([labPayload]);

      if (labResult.error) {
        logSupabaseError("Failed to save doctor fee lab share:", labResult.error);
        setDoctorFeeErrorMessage(
          getSupabaseErrorMessage(
            "อัปเดต Doctor fee แล้ว แต่ไม่สามารถบันทึกค่าแลปส่วนร้านได้",
            labResult.error
          )
        );
        return;
      }
    } else if (record.labExpense) {
      const { error: deleteLabError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", record.labExpense.id);

      if (deleteLabError) {
        logSupabaseError("Failed to delete doctor fee lab share:", deleteLabError);
        setDoctorFeeErrorMessage(
          getSupabaseErrorMessage(
            "อัปเดต Doctor fee แล้ว แต่ไม่สามารถลบค่าแลปส่วนร้านได้",
            deleteLabError
          )
        );
        return;
      }
    }

    setDoctorFeeErrorMessage("");
    setEditingDoctorFeeId(null);
    setEditDoctorFeeGrossAmount("");
    setEditDoctorFeeLabAmount("");
    setEditDoctorFeeDate(getTodayDate());
    fetchExpenses();
  };

  const deleteDoctorFee = async (record: DoctorFeeRecord) => {
    if (!confirm("ต้องการลบ Doctor fee นี้หรือไม่?")) return;

    const idsToDelete = [record.feeExpense.id, record.labExpense?.id].filter(
      (id): id is string => Boolean(id)
    );
    const { error } = await supabase
      .from("expenses")
      .delete()
      .in("id", idsToDelete);

    if (error) {
      logSupabaseError("Failed to delete doctor fee:", error);
      setDoctorFeeErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถลบ Doctor fee ได้", error)
      );
      return;
    }

    setDoctorFeeErrorMessage("");
    fetchExpenses();
  };

  const addLabFee = async () => {
    const parsedAmount = Number.parseFloat(labFeeAmount);
    const trimmedDoctorName = labFeeDoctorName.trim();
    const trimmedCompany = labFeeCompany.trim();
    const trimmedWorkType = labFeeWorkType.trim();

    if (
      !trimmedDoctorName ||
      !trimmedCompany ||
      !trimmedWorkType ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !labFeeDate
    ) {
      setLabFeeErrorMessage(
        "กรุณาเลือกชื่อหมอ บริษัทของแลป ชนิดงานแลป กรอกค่าแลป และวันที่จ่ายเงินให้ถูกต้อง"
      );
      return;
    }

    const payload: ExpensePayload = {
      title: `${trimmedDoctorName} - ${trimmedCompany} - ${trimmedWorkType}`,
      category_id: null,
      category: LAB_FEE_CATEGORY,
      amount: parsedAmount,
      expense_date: labFeeDate,
      is_installment: false,
      installment_total_months: null,
      installment_current_month: null,
      installment_group_id: null,
    };

    const { error } = await supabase.from("expenses").insert([payload]);

    if (error) {
      logSupabaseError("Failed to add lab fee:", error);
      setLabFeeErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถเพิ่มค่าแลปได้", error)
      );
      return;
    }

    setLabFeeErrorMessage("");
    resetLabFeeForm();
    fetchExpenses();
  };

  const startRecurringEdit = (expense: RecurringExpense) => {
    setEditingRecurringId(expense.id);
    setEditRecurringTitle(expense.title);
    setEditRecurringMonthlyAmount(expense.monthly_amount.toString());
    setEditRecurringTotalMonths(expense.total_months.toString());
    setEditRecurringPaidMonths(getRecurringCurrentMonth(expense).toString());
    setEditRecurringPaymentDate(
      expense.payment_date ??
        getPaymentDateForMonth(
          getRecurringStartMonth(expense),
          getRecurringPaymentDay(expense)
        )
    );
  };

  const cancelRecurringEdit = () => {
    setEditingRecurringId(null);
    setEditRecurringTitle("");
    setEditRecurringMonthlyAmount("");
    setEditRecurringTotalMonths("");
    setEditRecurringPaidMonths("");
    setEditRecurringPaymentDate(getTodayDate());
  };

  const updateRecurringExpense = async (id: string) => {
    const payload = getRecurringExpensePayload({
      currentMonths: getResolvedInstallmentCurrentMonth(
        editRecurringTitle,
        editRecurringPaymentDate,
        editRecurringPaidMonths
      ),
      monthlyAmount: editRecurringMonthlyAmount,
      paymentDate: editRecurringPaymentDate,
      title: editRecurringTitle,
      totalMonths: editRecurringTotalMonths,
    });

    if (!payload) {
      setRecurringErrorMessage(
        "กรุณาเลือกรายการผ่อน กรอกยอดเงินมากกว่า 0 จำนวนงวด งวดที่จ่ายแล้ว และวันที่จ่ายให้ถูกต้อง"
      );
      return;
    }

    const { error } = await supabase
      .from("recurring_expenses")
      .update(payload)
      .eq("id", id);

    if (error) {
      logSupabaseError("Failed to update recurring expense:", error);
      setRecurringErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถอัปเดตรายการผ่อนได้", error)
      );
      return;
    }

    setRecurringErrorMessage("");
    cancelRecurringEdit();
    fetchRecurringExpenses();
  };

  const deleteRecurringExpense = async (id: string) => {
    if (!confirm("ต้องการลบรายการผ่อนนี้หรือไม่?")) return;

    const { error } = await supabase
      .from("recurring_expenses")
      .delete()
      .eq("id", id);

    if (error) {
      logSupabaseError("Failed to delete recurring expense:", error);
      setRecurringErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถลบรายการผ่อนได้", error)
      );
      return;
    }

    setRecurringErrorMessage("");
    fetchRecurringExpenses();
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditTitle(expense.title ?? "");
    setEditAmount(expense.amount.toString());
    setEditExpenseDate(expense.expense_date ?? getTodayDate());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditAmount("");
    setEditExpenseDate(getTodayDate());
  };

  const updateExpense = async (id: string) => {
    const existingExpense = expenses.find((expense) => expense.id === id);
    const payload = getExpensePayload(
      editTitle,
      editAmount,
      editExpenseDate,
      {
        isInstallment: existingExpense?.is_installment ?? false,
        totalMonths: existingExpense?.installment_total_months?.toString() ?? "",
        currentMonth:
          existingExpense?.installment_current_month?.toString() ?? "",
      },
      existingExpense
    );

    if (!payload) {
      setErrorMessage(
        "กรุณากรอกจำนวนเงิน วันที่ และข้อมูลงวดให้ถูกต้อง"
      );
      return;
    }

    const { error } = await supabase
      .from("expenses")
      .update(payload)
      .eq("id", id);

    if (error) {
      logSupabaseError("Failed to update expense record:", error);
      setErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถอัปเดตรายการรายจ่ายได้", error)
      );
      return;
    }

    setErrorMessage("");
    cancelEdit();
    fetchExpenses();
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("ต้องการลบรายการรายจ่ายนี้หรือไม่?")) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      logSupabaseError("Failed to delete expense record:", error);
      setErrorMessage(
        getSupabaseErrorMessage("ไม่สามารถลบรายการรายจ่ายได้", error)
      );
      return;
    }

    setErrorMessage("");
    fetchExpenses();
  };

  const filteredExpenses = expenses.filter((expense) => {
    const searchableText = [
      getExpenseCategoryLabel(expense.category),
      expense.title ?? "",
    ].join(" ");

    return searchableText.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredRecurringExpenses = recurringExpenses.filter((expense) => {
    const searchableText = [expense.category ?? "รายการผ่อน", expense.title].join(" ");

    return searchableText.toLowerCase().includes(searchTerm.toLowerCase());
  });
  const filteredOneTimeExpenses = filteredExpenses.filter(
    (expense) =>
      !isMonthlyExpenseCategory(expense.category) &&
      expense.category !== DOCTOR_FEE_CATEGORY &&
      expense.category !== DOCTOR_FEE_LAB_CATEGORY &&
      expense.category !== LAB_FEE_CATEGORY
  );
  const filteredMonthlyExpenses = filteredExpenses.filter(
    (expense) => isMonthlyExpenseCategory(expense.category)
  );
  const filteredDoctorFeeExpenses = filteredExpenses.filter(
    (expense) => expense.category === DOCTOR_FEE_CATEGORY
  );
  const filteredLabFeeExpenses = filteredExpenses.filter(
    (expense) => expense.category === LAB_FEE_CATEGORY
  );
  const doctorFeeLabExpenses = expenses.filter(
    (expense) => expense.category === DOCTOR_FEE_LAB_CATEGORY
  );
  const getDoctorFeeRecord = (feeExpense: Expense): DoctorFeeRecord => {
    const expenseMonth = feeExpense.expense_date
      ? getMonthInputFromDate(feeExpense.expense_date)
      : "";
    const labExpense = doctorFeeLabExpenses.find(
      (expense) =>
        expense.title === feeExpense.title &&
        (expense.expense_date ?? "").startsWith(expenseMonth)
    );
    const savedClinicLabShare = Number(labExpense?.amount || 0);
    const latestLabAmount = feeExpense.title
      ? getDoctorLabFeeTotal(feeExpense.title, expenseMonth)
      : 0;
    const labAmount =
      latestLabAmount > 0 ? latestLabAmount : savedClinicLabShare * 2;
    const doctorLabShare = labAmount / 2;
    const clinicLabShare = labAmount / 2;
    const grossAmount = Number(feeExpense.amount || 0) + savedClinicLabShare;
    const netAmount = Math.max(grossAmount - doctorLabShare, 0);

    return {
      clinicLabShare,
      doctorLabShare,
      expenseDate: feeExpense.expense_date,
      feeExpense,
      grossAmount,
      id: feeExpense.id,
      labAmount,
      labExpense,
      netAmount,
      title: feeExpense.title ?? DOCTOR_FEE_CATEGORY,
    };
  };
  const doctorFeeRecords: DoctorFeeRecord[] =
    filteredDoctorFeeExpenses.map(getDoctorFeeRecord);
  const visibleExpenseRows =
    activeTab === "monthly"
      ? filteredMonthlyExpenses
      : activeTab === "doctor_fee"
        ? filteredDoctorFeeExpenses
        : activeTab === "lab_fee"
          ? filteredLabFeeExpenses
          : filteredOneTimeExpenses;
  const expenseTableEmptyMessage =
    activeTab === "monthly"
      ? "ไม่พบรายจ่ายประจำ"
      : activeTab === "doctor_fee"
        ? "ไม่พบ Doctor fee"
        : activeTab === "lab_fee"
          ? "ไม่พบค่าแลป"
          : "ไม่พบรายการรายจ่าย";
  const expenseTableEmptyDescription =
    activeTab === "monthly"
      ? "เพิ่มรายจ่ายประจำใหม่ หรือปรับคำค้นหา"
      : activeTab === "doctor_fee"
        ? "เพิ่ม Doctor fee ใหม่ หรือปรับคำค้นหา"
        : activeTab === "lab_fee"
          ? "เพิ่มค่าแลปใหม่ หรือปรับคำค้นหา"
          : "เพิ่มรายการรายจ่ายใหม่ หรือปรับคำค้นหา";
  const selectedMonthlyExpenseMonth = monthlyExpenseDate
    ? getMonthInputFromDate(monthlyExpenseDate)
    : getCurrentMonthInput();
  const usedMonthlyExpenseTitles = getUsedMonthlyExpenseTitles(
    selectedMonthlyExpenseMonth
  );
  const availableMonthlyExpenseTitles = MONTHLY_EXPENSE_TITLES.filter(
    (title) => !usedMonthlyExpenseTitles.has(title)
  );
  const selectedDoctorFeeMonth = doctorFeeDate
    ? getMonthInputFromDate(doctorFeeDate)
    : getCurrentMonthInput();
  const usedDoctorFeeTitles = getUsedDoctorFeeTitles(selectedDoctorFeeMonth);
  const availableDoctorFeeTitles = DOCTOR_FEE_TITLES.filter(
    (title) => !usedDoctorFeeTitles.has(title)
  );
  const existingInstallmentExpenseTitles = new Set(
    recurringExpenses.map((expense) => expense.title).filter(Boolean)
  );
  const availableInstallmentExpenseTitles = INSTALLMENT_EXPENSE_TITLES.filter(
    (title) => !existingInstallmentExpenseTitles.has(title)
  );

  const monthlyExpenses = expenses.filter((expense) =>
    (expense.expense_date ?? "").startsWith(summaryMonth)
  );

  const isRecurringPayment = (expense: Expense) =>
    expense.expense_type === "recurring" || Boolean(expense.recurring_expense_id);

  const monthlyTotalPaid = monthlyExpenses.reduce(
    (sum, expense) =>
      expense.category === DOCTOR_FEE_LAB_CATEGORY
        ? sum
        : sum + Number(expense.amount || 0),
    0
  );

  const monthlyDoctorFeeTotal = expenses
    .filter(
      (expense) =>
        expense.category === DOCTOR_FEE_CATEGORY &&
        (expense.expense_date ?? "").startsWith(summaryMonth)
    )
    .reduce(
      (sum, feeExpense) => sum + getDoctorFeeRecord(feeExpense).netAmount,
      0
    );

  const monthlyLabFeeTotal = monthlyExpenses.reduce(
    (sum, expense) =>
      expense.category === LAB_FEE_CATEGORY
        ? sum + Number(expense.amount || 0)
        : sum,
    0
  );

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );
  const doctorFeeLabAmount =
    doctorFeeTitle && doctorFeeDate
      ? getDoctorLabFeeTotal(
          doctorFeeTitle,
          getMonthInputFromDate(doctorFeeDate)
        ).toString()
      : "";
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-rose-900 to-red-700 p-8 text-white shadow-xl shadow-red-900/15">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-200">
              รายจ่ายคลินิก
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              จัดการรายจ่าย
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-red-100">
              บันทึกรายจ่ายครั้งเดียว รายจ่ายประจำ และรายการผ่อนโดยเชื่อมกับ Supabase
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-red-100">
                จำนวนรายการ
              </p>
              <p className="mt-2 text-3xl font-bold">{expenses.length}</p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-red-100">
                รายการ
              </p>
              <p className="mt-2 text-3xl font-bold">{categories.length}</p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs font-medium uppercase tracking-wide text-red-100">
                รายจ่ายรวม
              </p>
              <p className="mt-2 text-3xl font-bold">
                {formatCurrency(totalExpenses)}
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
                สรุปรายเดือน
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                ดูรายจ่ายรวม ค่า DF ทันตแพทย์ และค่าแลปตามเดือนที่เลือก
              </p>
            </div>

            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:w-56">
              เดือนสรุป
              <input
                type="month"
                value={summaryMonth}
                onChange={(event) => setSummaryMonth(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                รวมรายจ่ายเดือนนี้
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatCurrency(monthlyTotalPaid)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                รวมค่า DF สุทธิของทันตแพทย์
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatCurrency(monthlyDoctorFeeTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                รวมค่าแลป
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {formatCurrency(monthlyLabFeeTotal)}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">วันที่</th>
                <th className="px-6 py-4 font-semibold">รายการ</th>
                <th className="px-6 py-4 font-semibold">ประเภท</th>
                <th className="px-6 py-4 font-semibold">รายการ</th>
                <th className="px-6 py-4 text-right font-semibold">จำนวนเงิน</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {monthlyExpenses.map((expense) => {
                const recurringPayment = isRecurringPayment(expense);

                return (
                  <tr key={expense.id} className="transition hover:bg-slate-50/80">
                    <td className="px-6 py-5 text-sm font-medium text-slate-700">
                      {formatDate(expense.expense_date)}
                    </td>

                    <td className="px-6 py-5">
                      <p className="font-semibold text-slate-900">
                        {expense.title || getExpenseCategoryLabel(expense.category)}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          recurringPayment
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {recurringPayment ? "ผ่อน" : "ครั้งเดียว"}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-sm font-medium text-slate-800">
                      {getExpenseCategoryLabel(expense.category)}
                    </td>

                    <td className="px-6 py-5 text-right text-lg font-semibold text-slate-900">
                      {formatCurrency(Number(expense.amount || 0))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="px-6 py-10 text-center text-sm font-medium text-slate-500">
            กำลังโหลดสรุปรายเดือน...
          </div>
        )}

        {!isLoading && monthlyExpenses.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-semibold text-slate-400">
              +
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              ไม่พบรายการจ่ายในเดือนนี้
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              เพิ่มรายจ่ายครั้งเดียว หรือบันทึกการจ่ายของรายการผ่อน
            </p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                รายการรายจ่าย
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                เพิ่มรายจ่ายครั้งเดียว รายจ่ายประจำ หรือรายการผ่อน
              </p>
            </div>

            <div className="relative w-full xl:max-w-sm">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                ค้นหา
              </span>
              <input
                type="text"
                  placeholder={
                    activeTab === "monthly" ||
                    activeTab === "one_time" ||
                    activeTab === "doctor_fee" ||
                    activeTab === "lab_fee"
                      ? "ค้นหารายการ"
                      : "ค้นหารายการหรือหมวดหมู่"
                  }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-16 pr-4 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="mt-6 inline-flex rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab("recurring")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "recurring"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              รายการผ่อน
            </button>

            <button
              onClick={() => setActiveTab("monthly")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "monthly"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              รายจ่ายประจำ
            </button>

            <button
              onClick={() => setActiveTab("lab_fee")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "lab_fee"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              ค่าแลป
            </button>

            <button
              onClick={() => setActiveTab("doctor_fee")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "doctor_fee"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Doctor fee
            </button>

            <button
              onClick={() => setActiveTab("one_time")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "one_time"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              รายจ่ายครั้งเดียว
            </button>
          </div>

          {activeTab === "one_time" ? (
            <>
              <div className="mt-6 grid gap-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_180px_190px_auto]">
                  <input
                    type="text"
                    placeholder="ชื่อรายการ"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="จำนวนเงิน"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />

                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />

                  <button
                    onClick={addExpense}
                    className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
                  >
                    เพิ่มรายจ่าย
                  </button>
                </div>

              </div>

              {errorMessage && (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                  {errorMessage}
                </p>
              )}
            </>
          ) : activeTab === "monthly" ? (
            <>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_190px_170px_190px_auto]">
                  <select
                    aria-label="ชื่อรายจ่ายประจำ"
                    value={monthlyTitle}
                    onChange={(e) => {
                      const selectedTitle = e.target.value;
                      setMonthlyTitle(selectedTitle);
                      setMonthlyAmount(
                        MONTHLY_EXPENSE_AMOUNT_BY_TITLE[selectedTitle] ?? ""
                      );
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  >
                    <option value="">เลือกรายจ่ายประจำ</option>
                    {availableMonthlyExpenseTitles.length > 0 && (
                      <option value={ALL_MONTHLY_EXPENSES_VALUE}>
                        กดเลือกทั้งหมด
                      </option>
                    )}
                    {availableMonthlyExpenseTitles.map((monthlyExpenseTitle) => (
                      <option
                        key={monthlyExpenseTitle}
                        value={monthlyExpenseTitle}
                      >
                        {monthlyExpenseTitle}
                      </option>
                    ))}
                    {availableMonthlyExpenseTitles.length === 0 && (
                      <option value="" disabled>
                        บันทึกครบทุกรายจ่ายประจำของเดือนนี้แล้ว
                      </option>
                    )}
                  </select>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder={
                      monthlyTitle === ALL_MONTHLY_EXPENSES_VALUE
                        ? "บันทึกทุกรายจ่ายประจำ"
                        : "จำนวนเงิน"
                    }
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value)}
                    disabled={monthlyTitle === ALL_MONTHLY_EXPENSES_VALUE}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      วันที่จ่ายเงิน
                    </span>
                    <input
                      type="date"
                      aria-label="วันที่จ่ายเงิน"
                      value={monthlyExpenseDate}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        setMonthlyExpenseDate(selectedDate);

                        if (
                          monthlyTitle &&
                          getUsedMonthlyExpenseTitles(
                            getMonthInputFromDate(selectedDate)
                          ).has(monthlyTitle)
                        ) {
                          setMonthlyTitle("");
                          setMonthlyAmount("");
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-28 pr-4 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    />
                  </div>

                  <button
                    onClick={addMonthlyExpense}
                    disabled={availableMonthlyExpenseTitles.length === 0}
                    className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    เพิ่มรายจ่ายประจำ
                  </button>
                </div>
              </div>

              {monthlyErrorMessage && (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                  {monthlyErrorMessage}
                </p>
              )}
            </>
          ) : activeTab === "doctor_fee" ? (
            <>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_220px_190px_auto]">
                  <select
                    aria-label="ชื่อ Doctor fee"
                    value={doctorFeeTitle}
                    onChange={(e) => {
                      const selectedTitle = e.target.value;
                      setDoctorFeeTitle(selectedTitle);
                      setDoctorFeeAmount("");
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  >
                    <option value="">รายชื่อทันตแพทย์</option>
                    {availableDoctorFeeTitles.map((doctorFeeTitleOption) => (
                      <option
                        key={doctorFeeTitleOption}
                        value={doctorFeeTitleOption}
                      >
                        {doctorFeeTitleOption}
                      </option>
                    ))}
                    {availableDoctorFeeTitles.length === 0 && (
                      <option value="" disabled>
                        บันทึกครบทุก Doctor fee ของเดือนนี้แล้ว
                      </option>
                    )}
                  </select>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Doctor fee ก่อนหัก"
                    value={doctorFeeAmount}
                    onChange={(e) => setDoctorFeeAmount(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="รวมค่าแลปของคนไข้"
                    value={doctorFeeLabAmount}
                    readOnly
                    className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      วันที่จ่ายเงิน
                    </span>
                    <input
                      type="date"
                      aria-label="วันที่จ่ายเงิน"
                      value={doctorFeeDate}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        setDoctorFeeDate(selectedDate);

                        if (
                          doctorFeeTitle &&
                          getUsedDoctorFeeTitles(
                            getMonthInputFromDate(selectedDate)
                          ).has(doctorFeeTitle)
                        ) {
                          setDoctorFeeTitle("");
                          setDoctorFeeAmount("");
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-28 pr-4 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    />
                  </div>

                  <button
                    onClick={addDoctorFee}
                    disabled={availableDoctorFeeTitles.length === 0}
                    className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                  >
                    เพิ่ม Doctor fee
                  </button>
                </div>

              </div>

              {doctorFeeErrorMessage && (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                  {doctorFeeErrorMessage}
                </p>
              )}
            </>
          ) : activeTab === "lab_fee" ? (
            <>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px_160px_190px_auto]">
                  <select
                    aria-label="ชื่อหมอ"
                    value={labFeeDoctorName}
                    onChange={(event) =>
                      setLabFeeDoctorName(event.target.value)
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  >
                    <option value="">รายชื่อทันตแพทย์</option>
                    {LAB_FEE_DOCTOR_NAMES.map((doctorName) => (
                      <option key={doctorName} value={doctorName}>
                        {doctorName}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="บริษัทของแลป"
                    value={labFeeCompany}
                    onChange={(event) => setLabFeeCompany(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  >
                    <option value="">บริษัทของแลป</option>
                    {LAB_FEE_COMPANIES.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="ชนิดงานแลป"
                    value={labFeeWorkType}
                    onChange={(event) => setLabFeeWorkType(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  >
                    <option value="">ชนิดงานแลป</option>
                    {LAB_FEE_WORK_TYPES.map((workType) => (
                      <option key={workType} value={workType}>
                        {workType}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="ค่าแลป"
                    value={labFeeAmount}
                    onChange={(event) => setLabFeeAmount(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      วันที่จ่ายเงิน
                    </span>
                    <input
                      type="date"
                      aria-label="วันที่จ่ายเงิน"
                      value={labFeeDate}
                      onChange={(event) => setLabFeeDate(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-28 pr-4 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    />
                  </div>

                  <button
                    onClick={addLabFee}
                    className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
                  >
                    เพิ่มค่าแลป
                  </button>
                </div>
              </div>

              {labFeeErrorMessage && (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                  {labFeeErrorMessage}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px_190px_170px]">
                  <select
                    aria-label="ชื่อรายการผ่อน"
                    value={recurringTitle}
                    onChange={(e) => {
                      const selectedTitle = e.target.value;
                      setRecurringTitle(selectedTitle);
                      if (selectedTitle === ALL_INSTALLMENT_EXPENSES_VALUE) {
                        setRecurringMonthlyAmount("");
                        setRecurringTotalMonths("");
                        setRecurringPaidMonths("");
                        return;
                      }
                      setRecurringMonthlyAmount(
                        INSTALLMENT_MONTHLY_AMOUNT_BY_TITLE[selectedTitle] ?? ""
                      );
                      setRecurringTotalMonths(
                        INSTALLMENT_TOTAL_MONTHS_BY_TITLE[selectedTitle] ?? ""
                      );
                      setRecurringPaidMonths(
                        getInstallmentCurrentMonthByTitle(
                          selectedTitle,
                          recurringPaymentDate
                        )
                      );
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  >
                    <option value="">เลือกรายการผ่อน</option>
                    {availableInstallmentExpenseTitles.length > 0 && (
                      <option value={ALL_INSTALLMENT_EXPENSES_VALUE}>
                        กดเลือกทั้งหมด
                      </option>
                    )}
                    {availableInstallmentExpenseTitles.map((installmentTitle) => (
                      <option key={installmentTitle} value={installmentTitle}>
                        {installmentTitle}
                      </option>
                    ))}
                    {availableInstallmentExpenseTitles.length === 0 && (
                      <option value="" disabled>
                        บันทึกรายการผ่อนครบแล้ว
                      </option>
                    )}
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={
                      recurringTitle === ALL_INSTALLMENT_EXPENSES_VALUE
                        ? "บันทึกทุกรายการผ่อน"
                        : "ยอดต่อเดือน"
                    }
                    value={recurringMonthlyAmount}
                    onChange={(e) =>
                      setRecurringMonthlyAmount(e.target.value)
                    }
                    disabled={recurringTitle === ALL_INSTALLMENT_EXPENSES_VALUE}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />

                  <input
                    type="number"
                    min="1"
                    aria-label="จำนวนงวดทั้งหมด"
                    placeholder={
                      recurringTitle === ALL_INSTALLMENT_EXPENSES_VALUE
                        ? "ใช้จำนวนงวดอัตโนมัติ"
                        : "จำนวนงวดทั้งหมด"
                    }
                    value={recurringTotalMonths}
                    onChange={(e) => setRecurringTotalMonths(e.target.value)}
                    disabled={recurringTitle === ALL_INSTALLMENT_EXPENSES_VALUE}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 md:self-end"
                  />

                  <input
                    type="number"
                    min="0"
                    aria-label="ปัจจุบันงวดที่"
                    placeholder="ปัจจุบันงวดที่"
                    value={getResolvedInstallmentCurrentMonth(
                      recurringTitle,
                      recurringPaymentDate,
                      recurringPaidMonths
                    )}
                    onChange={(e) => setRecurringPaidMonths(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 md:self-end"
                  />

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      วันที่จ่ายเงิน
                    </span>
                    <input
                      type="date"
                      aria-label="วันที่จ่ายเงิน"
                      value={recurringPaymentDate}
                      onInput={(e) => {
                        const selectedDate = e.currentTarget.value;
                        setRecurringPaymentDate(selectedDate);

                        if (recurringTitle !== ALL_INSTALLMENT_EXPENSES_VALUE) {
                          setRecurringPaidMonths(
                            getInstallmentCurrentMonthByTitle(
                              recurringTitle,
                              selectedDate
                            )
                          );
                        }
                      }}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        setRecurringPaymentDate(selectedDate);

                        if (recurringTitle !== ALL_INSTALLMENT_EXPENSES_VALUE) {
                          setRecurringPaidMonths(
                            getInstallmentCurrentMonthByTitle(
                              recurringTitle,
                              selectedDate
                            )
                          );
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-28 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={addRecurringExpense}
                    disabled={availableInstallmentExpenseTitles.length === 0}
                    className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
                  >
                    เพิ่มรายการผ่อน
                  </button>
                </div>
              </div>

              {recurringErrorMessage && (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                  {recurringErrorMessage}
                </p>
              )}
            </>
          )}
        </div>

        {activeTab !== "recurring" && activeTab !== "doctor_fee" ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">รายการ</th>
                    <th className="px-6 py-4 font-semibold">จำนวนเงิน</th>
                    <th className="px-6 py-4 font-semibold">วันที่จ่าย</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      จัดการ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {visibleExpenseRows.map((expense) => {
                    const isEditing = editingId === expense.id;

                    return (
                      <tr
                        key={expense.id}
                        className="transition hover:bg-slate-50/80"
                      >
                    <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-sm font-bold text-red-700">
	                              {(expense.title ?? getExpenseCategoryLabel(expense.category))
                                  .charAt(0)
                                  .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
	                                {expense.title || getExpenseCategoryLabel(expense.category)}
                              </p>
                              <p className="text-xs text-slate-500">
	                                {activeTab === "monthly"
                                  ? "รายจ่ายประจำ"
                                  : activeTab === "lab_fee"
                                    ? "ค่าแลป"
                                  : "รายจ่ายดำเนินงาน"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            />
                          ) : (
                            <span className="text-lg font-semibold text-slate-900">
                              {formatCurrency(Number(expense.amount || 0))}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editExpenseDate}
                              onChange={(e) =>
                                setEditExpenseDate(e.target.value)
                              }
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            />
                          ) : (
                            <span className="text-sm font-medium text-slate-700">
                              {formatDate(expense.expense_date)}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => updateExpense(expense.id)}
                                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                                >
                                  บันทึก
                                </button>

                                <button
                                  onClick={cancelEdit}
                                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  ยกเลิก
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(expense)}
                                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                >
                                  แก้ไข
                                </button>

                                <button
                                  onClick={() => deleteExpense(expense.id)}
                                  className="rounded-xl border border-red-100 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                >
                                  ลบ
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

            {isLoading && (
              <div className="px-6 py-10 text-center text-sm font-medium text-slate-500">
                กำลังโหลดรายจ่าย...
              </div>
            )}

            {!isLoading && visibleExpenseRows.length === 0 && (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-semibold text-slate-400">
                  +
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {expenseTableEmptyMessage}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {expenseTableEmptyDescription}
                </p>
              </div>
            )}
          </>
        ) : activeTab === "doctor_fee" ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">รายการ</th>
                    <th className="px-6 py-4 font-semibold">
                      Doctor fee ก่อนหัก
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      รวมค่าแลปของคนไข้
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      หักค่าแลปหมอ 50%
                    </th>
                    <th className="px-6 py-4 font-semibold">ยอดจ่ายสุทธิ</th>
                    <th className="px-6 py-4 font-semibold">วันที่จ่าย</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      จัดการ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {doctorFeeRecords.map((record) => {
                    const isEditingDoctorFee =
                      editingDoctorFeeId === record.id;
                    const editGrossAmount = Number.parseFloat(
                      editDoctorFeeGrossAmount || "0"
                    );
                    const editLabAmount = Number.parseFloat(
                      editDoctorFeeLabAmount || "0"
                    );
                    const editBreakdown = getDoctorFeeBreakdown(
                      editGrossAmount,
                      editLabAmount
                    );

                    return (
                      <tr
                        key={record.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-sm font-bold text-red-700">
                              {record.title.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {record.title}
                              </p>
                              <p className="text-xs text-slate-500">
                                Doctor fee
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          {isEditingDoctorFee ? (
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editDoctorFeeGrossAmount}
                              onChange={(event) =>
                                setEditDoctorFeeGrossAmount(event.target.value)
                              }
                              className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-slate-900">
                              {formatCurrency(record.grossAmount)}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {isEditingDoctorFee ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editDoctorFeeLabAmount}
                              onChange={(event) =>
                                setEditDoctorFeeLabAmount(event.target.value)
                              }
                              className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-slate-900">
                              {formatCurrency(record.labAmount)}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5 text-sm font-medium text-slate-700">
                          {formatCurrency(
                            isEditingDoctorFee
                              ? editBreakdown.doctorLabShare
                              : record.doctorLabShare
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <span className="text-lg font-semibold text-slate-900">
                            {formatCurrency(
                              isEditingDoctorFee
                                ? editBreakdown.netAmount
                                : record.netAmount
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          {isEditingDoctorFee ? (
                            <input
                              type="date"
                              value={editDoctorFeeDate}
                              onChange={(event) =>
                                setEditDoctorFeeDate(event.target.value)
                              }
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            />
                          ) : (
                            <span className="text-sm font-medium text-slate-700">
                              {formatDate(record.expenseDate)}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            {isEditingDoctorFee ? (
                              <>
                                <button
                                  onClick={() => updateDoctorFee(record)}
                                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                                >
                                  บันทึก
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingDoctorFeeId(null);
                                    setEditDoctorFeeGrossAmount("");
                                    setEditDoctorFeeLabAmount("");
                                    setEditDoctorFeeDate(getTodayDate());
                                  }}
                                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  ยกเลิก
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingDoctorFeeId(record.id);
                                    setEditDoctorFeeGrossAmount(
                                      record.grossAmount.toString()
                                    );
                                    setEditDoctorFeeLabAmount(
                                      record.labAmount.toString()
                                    );
                                    setEditDoctorFeeDate(
                                      record.expenseDate ?? getTodayDate()
                                    );
                                  }}
                                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                >
                                  แก้ไข
                                </button>

                                <button
                                  onClick={() => deleteDoctorFee(record)}
                                  className="rounded-xl border border-red-100 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                >
                                  ลบ
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

            {isLoading && (
              <div className="px-6 py-10 text-center text-sm font-medium text-slate-500">
                กำลังโหลดรายจ่าย...
              </div>
            )}

            {!isLoading && doctorFeeRecords.length === 0 && (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-semibold text-slate-400">
                  +
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {expenseTableEmptyMessage}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {expenseTableEmptyDescription}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">รายการ</th>
                    <th className="px-6 py-4 font-semibold">
                      ยอดต่อเดือน
                    </th>
                    <th className="px-6 py-4 font-semibold">งวด</th>
                    <th className="px-6 py-4 font-semibold">วันที่จ่าย</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      จัดการ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRecurringExpenses.map((expense) => {
                    const isEditingRecurring = editingRecurringId === expense.id;
                    const paidMonths = getRecurringCurrentMonth(expense);
                    const totalMonths = Number(expense.total_months || 0);
                    const remainingMonths = Math.max(
                      totalMonths - paidMonths,
                      0
                    );

                    return (
                      <tr
                        key={expense.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-5">
                          {isEditingRecurring ? (
                            <select
                              value={editRecurringTitle}
                              onChange={(event) => {
                                const selectedTitle = event.target.value;
                                setEditRecurringTitle(selectedTitle);
                                setEditRecurringMonthlyAmount(
                                  INSTALLMENT_MONTHLY_AMOUNT_BY_TITLE[
                                    selectedTitle
                                  ] ?? ""
                                );
                                setEditRecurringTotalMonths(
                                  INSTALLMENT_TOTAL_MONTHS_BY_TITLE[
                                    selectedTitle
                                  ] ?? ""
                                );
                                setEditRecurringPaidMonths(
                                  getInstallmentCurrentMonthByTitle(
                                    selectedTitle,
                                    editRecurringPaymentDate
                                  )
                                );
                              }}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            >
                              <option value="">เลือกรายการผ่อน</option>
                              {INSTALLMENT_EXPENSE_TITLES.map(
                                (installmentTitle) => (
                                  <option
                                    key={installmentTitle}
                                    value={installmentTitle}
                                  >
                                    {installmentTitle}
                                  </option>
                                )
                              )}
                            </select>
                          ) : (
                            <p className="font-semibold text-slate-900">
                              {expense.title}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {isEditingRecurring ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editRecurringMonthlyAmount}
                              onChange={(event) =>
                                setEditRecurringMonthlyAmount(
                                  event.target.value
                                )
                              }
                              className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            />
                          ) : (
                            <span className="text-lg font-semibold text-slate-900">
                              {formatCurrency(
                                Number(expense.monthly_amount || 0)
                              )}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {isEditingRecurring ? (
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                aria-label="ปัจจุบันงวดที่"
                                placeholder="ปัจจุบันงวดที่"
                                value={getResolvedInstallmentCurrentMonth(
                                  editRecurringTitle,
                                  editRecurringPaymentDate,
                                  editRecurringPaidMonths
                                )}
                                onChange={(event) =>
                                  setEditRecurringPaidMonths(
                                    event.target.value
                                  )
                                }
                                className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                              />
                              <input
                                type="number"
                                min="1"
                                aria-label="จำนวนงวดทั้งหมด"
                                placeholder="จำนวนงวดทั้งหมด"
                                value={editRecurringTotalMonths}
                                onChange={(event) =>
                                  setEditRecurringTotalMonths(
                                    event.target.value
                                  )
                                }
                                className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {paidMonths} / {totalMonths}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                เหลืออีก {remainingMonths} งวด
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {isEditingRecurring ? (
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                วันที่จ่ายเงิน
                              </span>
                              <input
                                type="date"
                                aria-label="วันที่จ่ายเงิน"
                                value={editRecurringPaymentDate}
                                onInput={(event) => {
                                  const selectedDate =
                                    event.currentTarget.value;
                                  setEditRecurringPaymentDate(selectedDate);
                                  setEditRecurringPaidMonths(
                                    getInstallmentCurrentMonthByTitle(
                                      editRecurringTitle,
                                      selectedDate
                                    )
                                  );
                                }}
                                onChange={(event) => {
                                  const selectedDate = event.target.value;
                                  setEditRecurringPaymentDate(selectedDate);
                                  setEditRecurringPaidMonths(
                                    getInstallmentCurrentMonthByTitle(
                                      editRecurringTitle,
                                      selectedDate
                                    )
                                  );
                                }}
                                className="rounded-xl border border-slate-200 py-2 pl-24 pr-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                              />
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-slate-700">
                              {formatDate(
                                expense.payment_date ??
                                  getPaymentDateForMonth(
                                    getRecurringStartMonth(expense),
                                    getRecurringPaymentDay(expense)
                                  )
                              )}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            {isEditingRecurring ? (
                              <>
                                <button
                                  onClick={() =>
                                    updateRecurringExpense(expense.id)
                                  }
                                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                                >
                                  บันทึก
                                </button>

                                <button
                                  onClick={cancelRecurringEdit}
                                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  ยกเลิก
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startRecurringEdit(expense)}
                                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                >
                                  แก้ไข
                                </button>

                                <button
                                  onClick={() =>
                                    deleteRecurringExpense(expense.id)
                                  }
                                  className="rounded-xl border border-red-100 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                >
                                  ลบ
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

            {isRecurringLoading && (
              <div className="px-6 py-10 text-center text-sm font-medium text-slate-500">
                กำลังโหลดรายการผ่อน...
              </div>
            )}

            {!isRecurringLoading && filteredRecurringExpenses.length === 0 && (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-semibold text-slate-400">
                  +
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  ไม่พบรายการผ่อน
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  เพิ่มแผนผ่อนใหม่ หรือปรับคำค้นหา
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
