import http from "node:http";

export function isAllowedMethod(
  method: string,
  allowedMethods: readonly string[],
  res: http.ServerResponse,
): boolean {
  if (!allowedMethods.includes(method as any)) {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "method_not_allowed" }));
    return false;
  }
  return true;
}

export async function parseJsonBody<T = unknown>(
  req: http.IncomingMessage,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        // If you want strict non-empty, throw here instead:
        resolve({} as T);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as T;
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
