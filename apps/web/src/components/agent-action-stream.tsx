"use client";

/**
 * Agent-style streaming progress display. Renders a list of action labels
 * that progressively reveal one-by-one with a spinner, then flip to a
 * checkmark when the next step starts (or `done` is signalled).
 *
 * Used during long-running async operations (Claude Vision parse, on-chain
 * escrow deploy) so the user sees what the system is doing in real time
 * instead of staring at a blind spinner.
 */
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type AgentActionStreamProps = {
  steps: ReadonlyArray<string>;
  /**
   * Per-step pacing in ms before advancing to the next step. The total of
   * all entries should roughly match the expected operation duration. The
   * last entry is held until `done` is true (or forever, if `done` stays
   * false). Default : 1500 ms per step.
   */
  pacing?: ReadonlyArray<number>;
  /**
   * Becomes `true` when the underlying operation finishes. Triggers an
   * immediate snap to "all done" regardless of where the animation is.
   */
  done?: boolean;
  /** Tone of the tile (color of the spinner / checkmark accent). */
  tone?: "brand" | "emerald";
  /** Optional title shown above the list. */
  title?: string;
  /** Optional sub-title shown beneath the title. */
  subtitle?: string;
};

export function AgentActionStream({
  steps,
  pacing,
  done = false,
  tone = "brand",
  title,
  subtitle,
}: AgentActionStreamProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (done) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveIndex(steps.length);
      return;
    }
    if (activeIndex >= steps.length - 1) return; // hold on the last step
    const delay = pacing?.[activeIndex] ?? 1500;
    const timer = setTimeout(() => {
      setActiveIndex((i) => Math.min(i + 1, steps.length - 1));
    }, delay);
    return () => clearTimeout(timer);
  }, [activeIndex, done, steps.length, pacing]);

  const accent =
    tone === "emerald"
      ? {
          spinnerText: "text-emerald-700",
          checkBg: "bg-emerald-500",
          border: "border-emerald-200",
          bg: "bg-emerald-50/60",
        }
      : {
          spinnerText: "text-brand-700",
          checkBg: "bg-brand-600",
          border: "border-brand-200",
          bg: "bg-brand-50/60",
        };

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", accent.border, accent.bg)}>
      {(title || subtitle) && (
        <div className="space-y-0.5">
          {title && <p className="text-sm font-semibold text-ink-900">{title}</p>}
          {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
        </div>
      )}
      <ol className="space-y-1.5">
        {steps.map((step, i) => {
          const isDone = i < activeIndex || done;
          const isActive = i === activeIndex && !done;
          const isUpcoming = i > activeIndex && !done;
          return (
            <li
              key={i}
              className={cn(
                "flex items-center gap-2.5 text-sm transition-all duration-300",
                isUpcoming && "opacity-30",
                (isActive || isDone) && "animate-fade-up",
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center flex-shrink-0">
                {isDone ? (
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded-full",
                      accent.checkBg,
                    )}
                  >
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </span>
                ) : isActive ? (
                  <Loader2 className={cn("h-4 w-4 animate-spin", accent.spinnerText)} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />
                )}
              </span>
              <span
                className={cn(
                  "tnum",
                  isDone ? "text-ink-700" : isActive ? "text-ink-900 font-medium" : "text-ink-500",
                )}
              >
                {step}
                {isActive && (
                  <span className="ml-1 inline-flex gap-0.5">
                    <span className="animate-pulse [animation-delay:0ms]">.</span>
                    <span className="animate-pulse [animation-delay:200ms]">.</span>
                    <span className="animate-pulse [animation-delay:400ms]">.</span>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
