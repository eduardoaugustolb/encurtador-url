interface Props {
  label: string;
  value: string | number;
}

export function StatsCard({ label, value }: Props) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
