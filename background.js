/**
 * Open in Steam - Background Service Worker
 *
 * Handles toolbar icon clicks to open the current Steam web page
 * in the Steam desktop client via steam:// protocol deep links.
 *
 * This complements the content script (which injects a visible button
 * on recognized pages) by providing a universal toolbar action that
 * works on ANY Steam page, including ones the content script doesn't
 * explicitly handle.
 */

// =============================================================================
// TOOLBAR ACTION
// =============================================================================

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab?.url) return;

    const steamUrl = toSteamClientUrl(tab.url);
    if (!steamUrl) return;

    console.log('[Open in Steam] Toolbar click → opening:', steamUrl);

    // Navigate the current tab to the steam:// URL.
    // The browser hands it off to the Steam client protocol handler.
    // Using tabs.update keeps it "one click" without creating extra tabs.
    chrome.tabs.update(tab.id, { url: steamUrl });
});

// =============================================================================
// URL CONVERSION
// =============================================================================

/**
 * Converts a Steam web URL into the best matching steam:// deep link.
 *
 * Priority:
 *   1. Store app page  → steam://store/<appid>
 *   2. Store sub page  → steam://openurl/<original_url>
 *   3. Workshop file   → steam://url/CommunityFilePage/<id>
 *   4. Any Steam page  → steam://openurl/<original_url>  (fallback)
 *   5. Non-Steam page  → null  (do nothing)
 *
 * @param {string} urlString - The web URL to convert
 * @returns {string|null} The steam:// URL, or null if not a Steam page
 */
function toSteamClientUrl(urlString) {
    let u;
    try {
        u = new URL(urlString);
    } catch {
        return null;
    }

    // ── Store pages ──────────────────────────────────────────────────────
    if (u.hostname === 'store.steampowered.com') {
        const parts = u.pathname.split('/').filter(Boolean);

        // App page: /app/730/Counter-Strike_2/
        if (parts[0] === 'app' && parts[1] && /^\d+$/.test(parts[1])) {
            return `steam://store/${parts[1]}`;
        }

        // Sub/package page: /sub/12345/
        if (parts[0] === 'sub' && parts[1] && /^\d+$/.test(parts[1])) {
            return `steam://openurl/https://store.steampowered.com/sub/${parts[1]}/`;
        }

        // Bundle page: /bundle/12345/
        if (parts[0] === 'bundle' && parts[1] && /^\d+$/.test(parts[1])) {
            return `steam://openurl/${urlString}`;
        }

        // Any other store page → fallback
        return `steam://openurl/${urlString}`;
    }

    // ── Community pages ──────────────────────────────────────────────────
    if (u.hostname === 'steamcommunity.com') {
        // Workshop / shared file: /sharedfiles/filedetails/?id=3664628116
        if (u.pathname.startsWith('/sharedfiles/filedetails')) {
            const id = u.searchParams.get('id');
            if (id && /^\d+$/.test(id)) {
                return `steam://url/CommunityFilePage/${id}`;
            }
        }

        // Any other community page → fallback
        return `steam://openurl/${urlString}`;
    }

    // ── Not a Steam page ────────────────────────────────────────────────
    return null;
}
