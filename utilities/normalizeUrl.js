/**
 * Normalizes URLs by converting lookalike Unicode characters to ASCII equivalents
 * @param {string} url - The URL to normalize
 * @returns {string} - The normalized URL
 */
exports.normalizeUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return url;
    }

    // Convert lookalike characters to ASCII
    let cleanUrl = url.trim().normalize('NFKC');
    
    // Convert common lookalike characters
    const lookalikes = {
        'һ': 'h', // Cyrillic small letter shha
        'р': 'p', // Cyrillic small letter er
        'ρ': 'p', // Greek small letter rho
        'с': 'c', // Cyrillic small letter es
        'о': 'o', // Cyrillic small letter o
        'а': 'a', // Cyrillic small letter a
        'е': 'e', // Cyrillic small letter ie
        'х': 'x', // Cyrillic small letter ha
        'ѕ': 's', // Cyrillic small letter dze
        'і': 'i', // Cyrillic small letter byelorussian-ukrainian i
        'ｈ': 'h', // Fullwidth latin small letter h
        'ｔ': 't', // Fullwidth latin small letter t
        'ｐ': 'p', // Fullwidth latin small letter p
        'ｓ': 's', // Fullwidth latin small letter s
        '：': ':', // Fullwidth colon
        '／': '/', // Fullwidth solidus
        'α': 'a', // Greek small letter alpha
        'ο': 'o', // Greek small letter omicron
        'τ': 't', // Greek small letter tau
        'υ': 'u', // Greek small letter upsilon
        'ν': 'v', // Greek small letter nu
    };

    for (const [fake, real] of Object.entries(lookalikes)) {
        cleanUrl = cleanUrl.replaceAll(fake, real);
    }

    return cleanUrl;
};