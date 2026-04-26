"use client";

/**
 * Smart-Order-Routing allocation pie + per-source breakdown.
 *
 * Recharts donut on the left, ordered list of sources on the right with
 * predicted slippage in bps and predicted delay in seconds. The "engine"
 * badge (CVXPY ✓ or Greedy fallback) is surfaced so the demo can show the
 * tech credentials without hiding the fallback.
 */
import { Activity, Clock, Cpu } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { SorAllocation } from "@/lib/quote/schemas";
import { cn } from "@/lib/utils";

const COLORS = [
  "#0EA5E9", // brand-500 — Yellow Card
  "#10B981", // emerald-500 — OTC #1
  "#F59E0B", // amber-500 — OTC #2
];

const DISPLAY_NAMES: Record<string, string> = {
  yellow_card: "Yellow Card",
  otc_desk_1: "OTC Desk #1",
  otc_desk_2: "OTC Desk #2",
};

export function SorAllocationChart({
  allocation,
  totalCostBps,
  vsBaselineSavingsBps,
  engine,
}: {
  allocation: SorAllocation[];
  totalCostBps: number;
  vsBaselineSavingsBps: number;
  engine: "cvxpy" | "greedy_fallback";
}) {
  const t = useTranslations("quote.sor");
  const format = useFormatter();

  // Recharts wants raw numbers — share is 0..1, we display as %.
  const chartData = allocation
    .filter((a) => a.ngn_amount > 0)
    .map((a, i) => ({
      ...a,
      color: COLORS[i % COLORS.length],
    }));

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-900 inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-700" />
            {t("title")}
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">{t("subtitle")}</p>
        </div>
        <EngineBadge engine={engine} />
      </header>

      <div className="grid gap-5 sm:grid-cols-[180px_1fr] items-center">
        {/* Donut */}
        <div className="h-44 mx-auto sm:mx-0 w-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="ngn_amount"
                nameKey="source_id"
                innerRadius={42}
                outerRadius={75}
                paddingAngle={2}
                strokeWidth={0}
                isAnimationActive
                animationDuration={700}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => {
                  const p = item.payload as SorAllocation & { color: string };
                  const num = typeof value === "number" ? value : Number(value);
                  return [
                    `${format.number(num, { maximumFractionDigits: 0 })} NGN (${(p.share * 100).toFixed(0)}%)`,
                    DISPLAY_NAMES[p.source_id] ?? p.source_id,
                  ];
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  fontSize: 12,
                  fontVariantNumeric: "tabular-nums",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Source legend */}
        <ul className="space-y-2">
          {chartData.map((a) => (
            <li
              key={a.source_id}
              className="grid grid-cols-[12px_1fr_auto] gap-2 items-center text-sm"
            >
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: a.color }} />
              <div className="min-w-0">
                <p className="font-medium text-ink-900 truncate">
                  {a.display_name ?? DISPLAY_NAMES[a.source_id] ?? a.source_id}
                </p>
                <p className="text-xs text-ink-500 inline-flex items-center gap-2">
                  <span className="tnum">{a.predicted_slippage_bps.toFixed(1)} bps</span>
                  <span className="text-ink-300">·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {Math.round(a.predicted_delay_seconds)}s
                  </span>
                </p>
              </div>
              <span className="font-semibold tnum text-ink-900">{(a.share * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer stats */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ink-100 text-xs">
        <div>
          <p className="text-ink-500">{t("totalCost")}</p>
          <p className="text-sm font-semibold tnum text-ink-900 mt-0.5">
            {totalCostBps.toFixed(1)} bps
          </p>
        </div>
        <div>
          <p className="text-ink-500">{t("vsBaseline")}</p>
          <p
            className={cn(
              "text-sm font-semibold tnum mt-0.5",
              vsBaselineSavingsBps > 0
                ? "text-emerald-700"
                : vsBaselineSavingsBps < 0
                  ? "text-rose-700"
                  : "text-ink-900",
            )}
          >
            {vsBaselineSavingsBps > 0 ? "−" : vsBaselineSavingsBps < 0 ? "+" : ""}
            {Math.abs(vsBaselineSavingsBps).toFixed(1)} bps
          </p>
        </div>
      </div>
    </div>
  );
}

function EngineBadge({ engine }: { engine: "cvxpy" | "greedy_fallback" }) {
  const t = useTranslations("quote.sor");
  if (engine === "cvxpy") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
        <Cpu className="h-3 w-3" />
        {t("engineCvxpy")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
      <Cpu className="h-3 w-3" />
      {t("engineGreedy")}
    </span>
  );
}
