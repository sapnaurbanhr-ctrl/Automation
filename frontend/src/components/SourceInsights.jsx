import { Linkedin, Globe, Users, MoreHorizontal } from "lucide-react";

const META = [
  { key: "LinkedIn", icon: Linkedin, color: "#0A66C2", bg: "#E8F0FE" },
  { key: "Website", icon: Globe, color: "#2D5A27", bg: "#E7F0E5" },
  { key: "Referral", icon: Users, color: "#92400E", bg: "#FEF3C7" },
  { key: "Other", icon: MoreHorizontal, color: "#57534E", bg: "#F7F5F2" },
];

export default function SourceInsights({ stats }) {
  if (!stats) return null;
  const by = stats.by_source || {};
  const total = META.reduce((s, m) => s + (by[m.key] || 0), 0);

  return (
    <div className="bg-white border border-[#E7E5E4] rounded-lg p-6" data-testid="source-insights">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E]">
            Lead source insights
          </div>
          <h3 className="text-xl tracking-tight font-medium text-[#1C1917] mt-1">
            Where your leads come from
          </h3>
        </div>
        <div className="text-sm text-[#57534E]">{total} total</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {META.map(({ key, icon: Icon, color, bg }) => {
          const count = by[key] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={key}
              className="border border-[#E7E5E4] rounded-md p-4"
              data-testid={`source-${key.toLowerCase()}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[#1C1917]">{key}</span>
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center"
                  style={{ background: bg, color }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-2xl font-light text-[#1C1917]">{count}</div>
              <div className="mt-2 h-1.5 bg-[#F7F5F2] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <div className="text-xs text-[#57534E] mt-2">{pct}% of total</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
