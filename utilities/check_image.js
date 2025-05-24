const logger = require("./../logger");

exports.checkImage = async (url) => {
    try {
        // Validate URL format
        if (!url || typeof url !== 'string') {
            logger.error(`Invalid URL provided: ${url}`);
            return false;
        }

        // More strict ASCII-only validation for schemes
        const httpRegex = /^https?:\/\//;
        if (!httpRegex.test(url)) {
            logger.error(`URL missing valid ASCII scheme (http/https): ${url} (original: ${url})`);
            return false;
        }

        // Additional validation using URL constructor
        try {
            new URL(url);
        } catch (urlError) {
            logger.error(`Invalid URL format: ${url}`, urlError.message);
            return false;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
            logger.error(`HTTP Error: ${response.status} ${response.statusText} for URL: ${url}`);
            return false;
        }
        
        const content = await response.blob();
        return content.type.startsWith("image/");
    } catch (error) {
        if (error.cause && error.cause.message === 'unknown scheme') {
            logger.error(`Invalid URL scheme for: ${url}. Only http:// and https:// are supported.`);
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            logger.error(`Network error fetching URL: ${url}`, error.message);
        } else if (error.name === 'AbortError') {
            logger.error(`Request timeout for URL: ${url}`);
        } else {
            logger.error(`Unexpected error fetching URL: ${url}`, error.name, error.message);
        }
        return false;
    }
};