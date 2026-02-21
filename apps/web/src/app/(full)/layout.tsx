import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

export default function FullLayout({ children }: { children: ReactNode }) {
  return <AppShell showTabs={false}>{children}</AppShell>;
}
