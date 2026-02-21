"use client";

import type { ReactNode } from "react";
import { ProgressProvider } from "@bprogress/next/app";

type ProgressBoundaryProps = {
  children: ReactNode;
};

export function ProgressBoundary({ children }: ProgressBoundaryProps) {
  return (
    <ProgressProvider height="4px" color="#5840ff" options={{ showSpinner: false }} shallowRouting>
      {children}
    </ProgressProvider>
  );
}
