const logger = require("./../logger");

exports.checkImage = async (url) => {
  try {
    // Validate URL format
    if (!url || typeof url !== "string") {
      logger.error(`Invalid URL provided: ${url}`);
      return false;
    }

    const httpRegex = /^https?:\/\//;
    if (!httpRegex.test(url)) {
      logger.error(
        `URL missing valid ASCII scheme (http/https): ${url} (original: ${url})`,
      );
      return false;
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch (urlError) {
      logger.error(`Invalid URL format: ${url}`, urlError.message);
      return false;
    }

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: `${parsed.origin}/`,
      Connection: "keep-alive",
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      logger.error(
        `HTTP Error: ${response.status} ${response.statusText} for URL: ${url}`,
      );
      return false;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType) {
      logger.error(
        `No content type found for URL: ${url}. Headers: ${JSON.stringify(
          Object.fromEntries(response.headers),
        )}`,
      );
      return false;
    }

    logger.debug(`Content-Type for ${url}: ${contentType}`);

    if (contentType) {
      const normalizedType = contentType.toLowerCase();
      if (
        normalizedType.startsWith("image/") ||
        normalizedType === "gif" ||
        normalizedType === "jpeg" ||
        normalizedType === "jpg" ||
        normalizedType === "png" ||
        normalizedType === "webp"
      ) {
        return true;
      }
    }

    const pathname = parsed.pathname.toLowerCase();
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".bmp",
      ".svg",
    ];
    if (imageExtensions.some((ext) => pathname.endsWith(ext))) {
      logger.debug(`Detected image by file extension: ${pathname}`);
      return true;
    }

    logger.debug(
      `Not detected as image. Content-Type: ${contentType}, Path: ${pathname}`,
    );
    return false;
  } catch (error) {
    if (error.cause && error.cause.message === "unknown scheme") {
      logger.error(
        `Invalid URL scheme for: ${url}. Only http:// and https:// are supported.`,
      );
    } else if (error.name === "TypeError" && error.message.includes("fetch")) {
      logger.error(`Network error fetching URL: ${url}`, error.message);
    } else if (error.name === "AbortError") {
      logger.error(`Request timeout for URL: ${url}`);
    } else {
      logger.error(`Unexpected error fetching URL: ${url}`, error);
    }
    return false;
  }
};
