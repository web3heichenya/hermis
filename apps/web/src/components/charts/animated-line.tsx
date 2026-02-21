"use client";

import { useEffect, useMemo, useRef } from "react";

type AnimatedLineProps = {
  values: number[];
  stroke?: string;
};

export function AnimatedLine({ values, stroke = "url(#chartGradient)" }: AnimatedLineProps) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const pathData = useMemo(() => {
    if (!values.length) {
      return { d: "", points: "", viewBox: "0 0 100 40" };
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const step = values.length > 1 ? 100 / (values.length - 1) : 100;

    const coordinates = values.map((value, index) => {
      const x = step * index;
      const normalized = (value - min) / range;
      const y = 36 - normalized * 28;
      return `${x},${y}`;
    });

    const d = coordinates.reduce((acc, coordinate, index) => {
      return index === 0 ? `M${coordinate}` : `${acc} L${coordinate}`;
    }, "");

    return {
      d,
      points: coordinates.join(" "),
      viewBox: "0 0 100 40",
    };
  }, [values]);

  useEffect(() => {
    const path = pathRef.current;
    if (!path || !pathData.d) return;

    const totalLength = path.getTotalLength();
    path.style.strokeDasharray = `${totalLength}`;
    path.style.strokeDashoffset = `${totalLength}`;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    requestAnimationFrame(() => {
      if (!path) return;
      path.style.transition = prefersReducedMotion ? "none" : "stroke-dashoffset 1.6s ease-out";
      path.style.strokeDashoffset = "0";
    });
  }, [pathData]);

  return (
    <svg
      role="img"
      aria-label="Trend"
      className="h-28 w-full"
      viewBox={pathData.viewBox}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="chartGradient" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#9F8CFF" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="chartFill" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        d={pathData.d}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeLinecap="round"
        className="drop-shadow-[0_6px_16px_rgba(124,92,255,0.25)]"
      />
      <polyline points={pathData.points} fill="url(#chartFill)" stroke="none" opacity={0.18} />
    </svg>
  );
}
