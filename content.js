/**
 * Open in Steam - Content Script
 *
 * Injects an "Open in Steam" button on Steam Store and Community pages
 * that opens the Steam desktop client to the corresponding page.
 *
 * Supported pages:
 * - Store app pages:      /app/<appid>/         → steam://store/<appid>
 * - Store sub pages:      /sub/<subid>/         → steam://openurl/...
 * - Workshop / shared:    /sharedfiles/...?id=  → steam://url/CommunityFilePage/<id>
 *
 * Features:
 * - Injects into the page's header navigation area
 * - Falls back to fixed-position button if header not found
 * - Handles SPA-style navigation with MutationObserver + periodic URL check
 * - Prevents duplicate button injection
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const BUTTON_ID = 'ois-open-in-steam-btn';
const URL_CHECK_INTERVAL = 500; // ms

/**
 * CSS selectors for injection points on Steam pages.
 * Tried in order — first match wins.
 */
const HEADER_SELECTORS = [
    // Steam Store selectors
    '.apphub_OtherSiteInfo',              // Area with "Community Hub" link
    '.apphub_HeaderTop',                  // Header top area
    '#tabControls',                       // Tab controls
    '.game_title_area .block_banner',     // Game title area
    '.game_header_image_ctn',             // Game header container
    '.page_title_area',                   // Generic page title (sub pages)
    '.page_header_ctn',                   // Generic page header

    // Steam Community / Workshop selectors
    '.workshopItemDetailsHeader',         // Workshop item header
    '.workshopItemTitle',                 // Workshop item title
    '.breadcrumbs',                       // Breadcrumb navigation
];

// =============================================================================
// PAGE DETECTION
// =============================================================================

/**
 * Detects the current page type and extracts relevant info for the button.
 *
 * @returns {{ type: string, id: string|null, steamUrl: string } | null}
 *   Returns page info object, or null if not a supported page.
 */
function detectPageInfo() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    // ── Store pages ──────────────────────────────────────────────────────
    if (hostname === 'store.steampowered.com') {
        // App page: /app/730/Counter-Strike_2/
        const appMatch = pathname.match(/\/app\/(\d+)/);
        if (appMatch) {
            return {
                type: 'app',
                id: appMatch[1],
                steamUrl: `steam://store/${appMatch[1]}`,
            };
        }

        // Sub/package page: /sub/12345/
        const subMatch = pathname.match(/\/sub\/(\d+)/);
        if (subMatch) {
            return {
                type: 'sub',
                id: subMatch[1],
                steamUrl: `steam://openurl/https://store.steampowered.com/sub/${subMatch[1]}/`,
            };
        }

        // Bundle page: /bundle/12345/
        const bundleMatch = pathname.match(/\/bundle\/(\d+)/);
        if (bundleMatch) {
            return {
                type: 'bundle',
                id: bundleMatch[1],
                steamUrl: `steam://openurl/${window.location.href}`,
            };
        }
    }

    // ── Community pages ──────────────────────────────────────────────────
    if (hostname === 'steamcommunity.com') {
        // Workshop / community file: /sharedfiles/filedetails/?id=3664628116
        if (pathname.startsWith('/sharedfiles/filedetails')) {
            const id = new URL(window.location.href).searchParams.get('id');
            if (id && /^\d+$/.test(id)) {
                return {
                    type: 'workshop',
                    id: id,
                    steamUrl: `steam://url/CommunityFilePage/${id}`,
                };
            }
        }
    }

    // Not a recognized page type — no button injected
    // (The toolbar icon in background.js still works via fallback)
    return null;
}

// =============================================================================
// BUTTON CREATION
// =============================================================================

/**
 * Steam logo SVG path (official logo outline)
 */
const STEAM_ICON_SVG = `
<svg class="ois-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658a3.387 3.387 0 0 1 1.912-.59c.063 0 .125.004.188.006l2.861-4.142V8.91a4.525 4.525 0 0 1 4.524-4.524 4.527 4.527 0 0 1 4.524 4.527 4.525 4.525 0 0 1-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303a3.015 3.015 0 0 0-3.015-3.015 3.015 3.015 0 0 0-3.015 3.015 3.015 3.015 0 0 0 3.015 3.015 3.015 3.015 0 0 0 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
</svg>`;

/**
 * Creates the "Open in Steam" button element.
 *
 * @param {string} steamUrl - The steam:// URL to open on click
 * @param {string} pageType - The detected page type (for logging)
 * @param {boolean} isFixed - Whether to use fixed positioning (fallback mode)
 * @returns {HTMLButtonElement} The button element
 */
function createButton(steamUrl, pageType = 'unknown', isFixed = false) {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.className = 'ois-steam-button' + (isFixed ? ' ois-fixed' : '');
    button.title = 'Open this page in the Steam desktop client';
    button.dataset.steamUrl = steamUrl;
    button.dataset.pageType = pageType;

    // Steam logo icon + label
    button.innerHTML = `
    ${STEAM_ICON_SVG}
    <span class="ois-text">Open in Steam</span>
  `;

    // Click handler — triggers Steam protocol
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log(`[Open in Steam] Opening (${pageType}):`, steamUrl);

        // Visual feedback
        button.classList.add('ois-clicked');

        // Create a temporary anchor and click it — reliable for protocol handlers
        const link = document.createElement('a');
        link.href = steamUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // Cleanup
        setTimeout(() => {
            link.remove();
            button.classList.remove('ois-clicked');
        }, 300);
    });

    return button;
}

// =============================================================================
// BUTTON INJECTION
// =============================================================================

/**
 * Finds the best injection point and inserts the button.
 * Falls back to fixed-position button if no header found.
 *
 * @param {HTMLButtonElement} button - The button to inject
 * @returns {boolean} True if injection succeeded
 */
function injectButton(button) {
    // Try each header selector
    for (const selector of HEADER_SELECTORS) {
        const container = document.querySelector(selector);
        if (container) {
            container.insertBefore(button, container.firstChild);
            console.log(`[Open in Steam] Injected into: ${selector}`);
            return true;
        }
    }

    // Fallback: Add as fixed-position button
    console.log('[Open in Steam] No header found, using fixed position');
    button.classList.add('ois-fixed');
    document.body.appendChild(button);
    return true;
}

/**
 * Removes any existing button from the page.
 */
function removeExistingButton() {
    const existing = document.getElementById(BUTTON_ID);
    if (existing) {
        existing.remove();
        console.log('[Open in Steam] Removed existing button');
    }
}

// =============================================================================
// MAIN LOGIC
// =============================================================================

/**
 * Current state
 */
let lastUrl = '';
let urlCheckInterval = null;

/**
 * Main initialization — determines if button should be shown and injects it.
 */
function initialize() {
    const currentUrl = window.location.href;

    // Skip if URL hasn't changed and button exists
    if (currentUrl === lastUrl && document.getElementById(BUTTON_ID)) {
        return;
    }

    lastUrl = currentUrl;

    // Detect page type — only show button on recognized pages
    const pageInfo = detectPageInfo();

    if (!pageInfo) {
        // Not a recognized page — remove button if it exists and exit
        removeExistingButton();
        console.log('[Open in Steam] Not a recognized page, button hidden');
        return;
    }

    // Remove any existing button first (handles navigation between pages)
    removeExistingButton();

    // Create and inject the button
    const button = createButton(pageInfo.steamUrl, pageInfo.type);
    injectButton(button);
    console.log(`[Open in Steam] Ready for ${pageInfo.type} ${pageInfo.id || '(no id)'}`);
}

/**
 * Sets up SPA navigation detection.
 * Uses both MutationObserver and periodic URL check for robustness.
 */
function setupNavigationDetection() {
    // 1. MutationObserver — catches most dynamic changes
    const observer = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
            console.log('[Open in Steam] URL change detected (mutation)');
            initialize();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 2. Periodic URL check — catches edge cases the observer might miss
    if (urlCheckInterval) {
        clearInterval(urlCheckInterval);
    }

    urlCheckInterval = setInterval(() => {
        if (window.location.href !== lastUrl) {
            console.log('[Open in Steam] URL change detected (interval)');
            initialize();
        }
    }, URL_CHECK_INTERVAL);

    // 3. History API events
    window.addEventListener('popstate', () => {
        console.log('[Open in Steam] popstate event');
        initialize();
    });
}

/**
 * Entry point — wait for page to be ready, then initialize.
 */
function main() {
    // Initial injection
    if (document.readyState === 'complete') {
        initialize();
    } else {
        window.addEventListener('load', initialize);
    }

    // Set up continuous navigation detection
    setupNavigationDetection();
}

// Start the extension
main();
