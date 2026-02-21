"use client";

import RotatingTextImport from "@/components/RotatingText";

interface RotatingTextProps {
  words: string[];
  interval?: number;
  className?: string;
}

export function RotatingText({ words, interval = 2600, className }: RotatingTextProps) {
  const items = words.length ? words : [""];
  const baseClass = [
    "inline-flex",
    "items-center",
    "justify-center",
    "align-middle",
    "text-[inherit]",
    "leading-[inherit]",
  ].join(" ");
  const mainClassName = className ? `${baseClass} ${className}` : baseClass;

  return (
    <RotatingTextImport
      texts={items}
      mainClassName={mainClassName}
      staggerFrom="last"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "-120%" }}
      staggerDuration={0.025}
      splitLevelClassName="overflow-hidden"
      transition={{ type: "spring", damping: 30, stiffness: 400 }}
      rotationInterval={interval}
    />
  );
}
