import type { ReactNode } from "react";

// Root layout — html/body live in src/app/[locale]/layout.tsx so the `lang`
// attribute is set per locale. This file exists because Next.js requires a
// root layout, but it is intentionally a passthrough.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
