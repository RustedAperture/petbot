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

    const cleanup = () => {
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("error", onError);
    };

    const onError = (err: Error) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      cleanup();
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
        cleanup();
        reject(new Error("Payload too large"));
        return;
      }

      raw += chunkString;
    };

    const onEnd = () => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      cleanup();

      if (!raw) {
        reject(new Error("empty_body"));
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
