export function formatNumber(n: number) {
  return new Intl.NumberFormat(undefined).format(n);
}

export function formatPercentage(num: number, denom: number) {
  if (!denom || denom === 0) return "0%";
  const pct = (num / denom) * 100;
  if (pct === 0) return "0%";

  // For small percentages prefer 1 decimal, but if that would round to "0.0"
  // show two decimals for clarity (e.g. 0.04% -> 0.04%).
  if (pct < 1) {
    const one = pct.toFixed(1);
    if (one === "0.0") return `${pct.toFixed(2)}%`;
    return `${one}%`;
  }

  return `${Math.floor(pct)}%`;
}
