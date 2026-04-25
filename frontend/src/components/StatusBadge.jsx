const COLORS = {
  New: { bg: "#E0E7FF", text: "#3730A3", border: "#C7D2FE" },
  Contacted: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  Won: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
  Lost: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
};

export default function StatusBadge({ status }) {
  const c = COLORS[status] || COLORS.New;
  return (
    <span
      data-testid={`status-badge-${status?.toLowerCase()}`}
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      {status}
    </span>
  );
}
