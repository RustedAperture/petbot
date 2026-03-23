import http from "node:http";

export function isAllowedMethod(
  method: string,
  allowedMethods: readonly string[],
  res: http.ServerResponse,
): boolean {
  if (!allowedMethods.includes(method as any)) {
    res.writeHead(405, {
      "Content-Type": "application/json",
      Allow: allowedMethods.join(", "),
    });
    res.end(JSON.stringify({ error: "method_not_allowed" }));
    return false;
  }
  return true;
}

export interface ParseJsonBodyOptions {
  maxBodySize?: number;
}

const DEFAULT_MAX_BODY_SIZE_BYTES = 1_048_576; // 1 MB

export async function parseJsonBody<T = unknown>(
  req: http.IncomingMessage,
  options: ParseJsonBodyOptions = {},
): Promise<T> {
  const maxBodySize = options.maxBodySize ?? DEFAULT_MAX_BODY_SIZE_BYTES;

  return new Promise((resolve, reject) => {
    let raw = "";
    let receivedBytes = 0;
    let isSettled = false;

    const onError = (err: Error) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      reject(err);
    };

    const onData = (chunk: Buffer | string) => {
      if (isSettled) {
        return;
      }

      const chunkString = chunk.toString();
      receivedBytes += Buffer.byteLength(chunkString);

      if (receivedBytes > maxBodySize) {
        isSettled = true;
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }

      raw += chunkString;
    };

    const onEnd = () => {
      if (isSettled) {
        return;
      }
      isSettled = true;

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
    };

    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onError);
  });
}
