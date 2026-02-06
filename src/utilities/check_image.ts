import fetch from "node-fetch";

export async function checkImage(url: string) {
  try {
    const res = await fetch(url, { method: "HEAD" } as any);
    const contentType = res.headers.get("content-type") || "";
    return contentType.startsWith("image/");
  } catch (e) {
    return false;
  }
}

export default { checkImage };
