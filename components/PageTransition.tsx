"use client";

import { usePathname } from "next/navigation";

/** Re-runs the enter animation on every route change for seamless navigation. */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div key={path} className="page-enter">
      {children}
    </div>
  );
}
