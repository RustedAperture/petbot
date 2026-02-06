export function normalizeUrl(url: string): string {
  if (!url) {
    return url;
  }

  let cleanUrl = url.trim().normalize("NFKC");

  const lookalikes: Record<string, string> = {
    һ: "h",
    р: "p",
    ρ: "p",
    с: "c",
    о: "o",
    а: "a",
    е: "e",
    х: "x",
    ѕ: "s",
    і: "i",
    ｈ: "h",
    ｔ: "t",
    ｐ: "p",
    ｓ: "s",
    "：": ":",
    "／": "/",
    α: "a",
    ο: "o",
    τ: "t",
    υ: "u",
    ν: "v",
  };

  const regex = new RegExp(`[${Object.keys(lookalikes).join("")}]`, "g");
  cleanUrl = cleanUrl.replace(regex, (match) => lookalikes[match]);

  return cleanUrl;
}
