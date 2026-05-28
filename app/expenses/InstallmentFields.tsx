type InstallmentFieldsProps = {
  currentMonth: string;
  isInstallment: boolean;
  onCurrentMonthChange: (value: string) => void;
  onIsInstallmentChange: (value: boolean) => void;
  onTotalMonthsChange: (value: string) => void;
  totalMonths: string;
};

export function InstallmentFields({
  currentMonth,
  isInstallment,
  onCurrentMonthChange,
  onIsInstallmentChange,
  onTotalMonthsChange,
  totalMonths,
}: InstallmentFieldsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <label className="flex items-center gap-3 text-sm font-semibold text-slate-800">
        <input
          type="checkbox"
          checked={isInstallment}
          onChange={(event) => onIsInstallmentChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
        />
        เป็นรายจ่ายแบบผ่อน
      </label>

      {isInstallment && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            type="number"
            min="1"
            placeholder="จำนวนงวดทั้งหมด"
            value={totalMonths}
            onChange={(event) => onTotalMonthsChange(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
          />

          <input
            type="number"
            min="1"
            placeholder="งวดปัจจุบัน"
            value={currentMonth}
            onChange={(event) => onCurrentMonthChange(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
          />
        </div>
      )}
    </div>
  );
}
