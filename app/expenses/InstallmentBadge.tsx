type InstallmentBadgeProps = {
  label: string;
};

export function InstallmentBadge({ label }: InstallmentBadgeProps) {
  if (!label) {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        One-time
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
      {label}
    </span>
  );
}

