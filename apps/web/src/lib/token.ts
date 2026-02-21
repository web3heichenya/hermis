type FormatTokenAmountOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export function formatTokenAmount(
  value: number,
  tokenSymbol = "ETH",
  options?: FormatTokenAmountOptions
) {
  const absValue = Math.abs(value);

  const maximumFractionDigits = options?.maximumFractionDigits ?? selectFractionDigits(absValue);
  const minimumFractionDigits = options?.minimumFractionDigits ?? 0;

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  })} ${tokenSymbol}`;
}

function selectFractionDigits(absValue: number) {
  if (absValue === 0) {
    return 2;
  }
  if (absValue >= 1) {
    return 2;
  }
  if (absValue >= 0.01) {
    return 4;
  }
  if (absValue >= 0.0001) {
    return 6;
  }
  return 8;
}
