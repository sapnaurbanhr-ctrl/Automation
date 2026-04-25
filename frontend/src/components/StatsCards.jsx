import { Users, Sparkles, MessageCircle, Trophy, XCircle } from "lucide-react";

const STATUS_META = [
  { key: "new", label: "New", icon: Sparkles, color: "#3730A3", bg: "#E0E7FF" },
  { key: "contacted", label: "Contacted", icon: MessageCircle, color: "#92400E", bg: "#FEF3C7" },
  { key: "won", label: "Won", icon: Trophy, color: "#065F46", bg: "#D1FAE5" },
  { key: "lost", label: "Lost", icon: XCircle, color: "#991B1B", bg: "#FEE2E2" },
];

export default function StatsCards({ stats }) {
  if (!stats) return null;
  const total = stats.total || 0;
  const by = stats.by_status || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6" data-testid="stats-grid">
      <div className="crm-stat-card" data-testid="stat-total">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E]">
            Total Leads
          </span>
          <div
            className="h-9 w-9 rounded-md flex items-center justify-center"
            style={{ background: "#E7E5E4", color: "#2D5A27" }}
          >
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="text-4xl font-light tracking-tight text-[#1C1917]">{total}</div>
        <div className="text-sm text-[#57534E] mt-1">
          Pipeline value ${Number(stats.total_value || 0).toLocaleString()}
        </div>
      </div>

      {STATUS_META.map(({ key, label, icon: Icon, color, bg }) => {
        const upper = label;
        const count = by[upper] || 0;
        return (
          <div
            key={key}
            className="crm-stat-card"
            data-testid={`stat-${key}`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E]">
                {label}
              </span>
              <div
                className="h-9 w-9 rounded-md flex items-center justify-center"
                style={{ background: bg, color }}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-4xl font-light tracking-tight text-[#1C1917]">{count}</div>
            <div className="text-sm text-[#57534E] mt-1">
              {total > 0 ? Math.round((count / total) * 100) : 0}% of pipeline
            </div>
          </div>
        );
      })}
    </div>
  );
}
