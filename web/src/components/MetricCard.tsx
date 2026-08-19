export function MetricCard({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div className="metric-card" title={help}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{help}</p>
    </div>
  );
}
