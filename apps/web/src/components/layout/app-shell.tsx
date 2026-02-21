import Link from "next/link";
import type { ReactNode } from "react";

import { TabBar } from "@/components/layout/tab-bar";
import { AppHeader } from "@/components/layout/app-header";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  backHref?: string;
  actionSlot?: ReactNode;
  showTabs?: boolean;
}

export function AppShell({
  children,
  title,
  subtitle,
  backHref,
  actionSlot,
  showTabs = true,
}: AppShellProps) {
  const hasHeader = Boolean(title || backHref || actionSlot);
  const contentPadding = showTabs ? "pb-24 lg:pb-12" : "pb-12";

  return (
    <div className="from-background via-background/95 to-background relative min-h-screen w-full bg-gradient-to-b">
      <div className="flex min-h-screen flex-col">
        <AppHeader />

        <div className="flex-1">
          <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col gap-6 px-4 pt-6 pb-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-12">
            <div className="bg-background/85 flex flex-1 flex-col rounded-[28px] shadow-[0_25px_70px_-32px_rgba(0,0,0,0.55)] backdrop-blur lg:rounded-[36px]">
              {hasHeader && (
                <div className="border-border/40 border-b px-4 py-4 sm:px-6 lg:px-8">
                  <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {backHref && (
                        <Link
                          href={backHref}
                          className="border-border/40 bg-muted/60 text-muted-foreground hover:bg-muted flex size-9 items-center justify-center rounded-full border transition"
                        >
                          <svg className="size-4" aria-hidden>
                            <use href="#icon-chevron" />
                          </svg>
                          <span className="sr-only">Back</span>
                        </Link>
                      )}
                      <div className="min-w-0">
                        {title && (
                          <h1 className="text-foreground truncate text-xl font-semibold tracking-tight sm:text-2xl">
                            {title}
                          </h1>
                        )}
                        {subtitle && (
                          <p className="text-muted-foreground/80 mt-1 text-sm">{subtitle}</p>
                        )}
                      </div>
                    </div>
                    {actionSlot && (
                      <div className="flex shrink-0 items-center gap-2">{actionSlot}</div>
                    )}
                  </div>
                </div>
              )}

              <main className="flex-1 overflow-y-auto">
                <div
                  className={`w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 ${contentPadding}`}
                >
                  {children}
                </div>
              </main>
            </div>
          </div>
        </div>

        {showTabs && <TabBar />}
      </div>
    </div>
  );
}
