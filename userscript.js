// ==UserScript==
// @name         strudel-extras
// @namespace    http://tampermonkey.net/
// @version      2025-10-28
// @description  Strudel REPL goodies - local storage sync and UI fixes
// @author       terryfail
// @match        https://strudel.cc/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=strudel.cc
// @grant        GM_xmlhttpRequest
// @connect      localhost
// ==/UserScript==


// --- Inject console patching code into the page context ---
(function injectConsolePatch() {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = `
        (function() {
            function containsIsItLoaded(args) {
                return args && Array.prototype.some.call(args, arg => typeof arg === 'string' && arg.includes('Is it loaded'));
            }
            function showLoadedIndicator() {
                const loaded = document.getElementById('strudel-loaded-indicator');
                if (loaded) {
                    loaded.style.display = 'inline-block';
                    setTimeout(() => { loaded.style.opacity = '1'; }, 10);
                    setTimeout(() => { loaded.style.opacity = '0'; }, 1500);
                    setTimeout(() => { loaded.style.display = 'none'; }, 2000);
                }
            }
            const origLog = window.console.log;
            const origWarn = window.console.warn;
            const origError = window.console.error;
            window.console.log = function() {
                if (containsIsItLoaded(arguments)) showLoadedIndicator();
                return origLog.apply(this, arguments);
            };
            window.console.warn = function() {
                if (containsIsItLoaded(arguments)) showLoadedIndicator();
                return origWarn.apply(this, arguments);
            };
            window.console.error = function() {
                if (containsIsItLoaded(arguments)) showLoadedIndicator();
                return origError.apply(this, arguments);
            };
        })();
    `;
    document.documentElement.appendChild(script);
    script.remove();
})();

(function() {
    'use strict';

    // --- Catch error in window.onerror and unhandledrejection for loading indicator ---
    function errorMessageMatches(msg) {
        return typeof msg === 'string' && msg.includes("can't access property \"connect\", t is undefined");
    }

    window.addEventListener('error', function(event) {
        if (errorMessageMatches(event.message)) {
            showLoadingIndicator();
        }
    });

    window.addEventListener('unhandledrejection', function(event) {
        if (event && event.reason && typeof event.reason.message === 'string' && errorMessageMatches(event.reason.message)) {
            showLoadingIndicator();
        } else if (typeof event.reason === 'string' && errorMessageMatches(event.reason)) {
            showLoadingIndicator();
        }
    });

    // Patch window.onerror directly for maximum compatibility
    const origOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
        if (errorMessageMatches(message)) {
            showLoadingIndicator();
        }
        if (typeof origOnError === 'function') {
            return origOnError.apply(this, arguments);
        }
    };

        // --- Inject sync status icon ---
        function injectSyncStatusIcon() {
            // Wait for the h1 to be present
            const interval = setInterval(() => {
                const h1 = document.querySelector('h1.text-xl.text-foreground.font-bold.flex.space-x-2.items-center');
                if (h1 && !document.getElementById('strudel-sync-status')) {
                    // Create icon
                    const icon = document.createElement('span');
                    icon.id = 'strudel-sync-status';
                    icon.title = 'Sync status';
                    icon.style.display = 'inline-block';
                    icon.style.verticalAlign = 'middle';
                    icon.style.marginLeft = '8px';
                    icon.style.cursor = 'pointer';
                    icon.innerHTML = `
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <g id="sync-arrows">
                                <path d="M21 2v6h-6"/>
                                <path d="M3 22v-6h6"/>
                                <path d="M3.51 9a9 9 0 0 1 14.13-3.36L21 8"/>
                                <path d="M20.49 15A9 9 0 0 1 5.87 18.64L3 16"/>
                            </g>
                        </svg>
                    `;
                    icon.style.color = '#e74c3c'; // red by default
                    icon.addEventListener('click', () => {
                        setSyncStatus(false); // show red while retrying
                        syncToServer();
                    });
                    // Insert after h1
                    h1.parentNode.insertBefore(icon, h1.nextSibling);
                    clearInterval(interval);
                }
            }, 500);
        }

        function setSyncStatus(success) {
                const icon = document.getElementById('strudel-sync-status');
                if (icon) {
                        icon.style.color = success ? '#27ae60' : '#e74c3c'; // green or red
                }
        }


        injectSyncStatusIcon();


        // --- Inject 'Is it loaded' indicator next to sync status ---
        function injectLoadedIndicator() {
            const interval = setInterval(() => {
                const syncIcon = document.getElementById('strudel-sync-status');
                if (syncIcon && !document.getElementById('strudel-loaded-indicator')) {
                    const loaded = document.createElement('span');
                    loaded.id = 'strudel-loaded-indicator';
                    loaded.title = 'Is it loaded?';
                    loaded.style.display = 'none';
                    loaded.style.marginLeft = '6px';
                    loaded.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 50 50">
                            <g>
                                <circle cx="25" cy="25" r="20" fill="none" stroke="#dbd034ff" stroke-width="5" stroke-linecap="round" stroke-dasharray="31.4 31.4">
                                    <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/>
                                </circle>
                                <path d="M25 10 L25 25 L40 25" stroke="#dbd034ff" stroke-width="3" fill="none" stroke-linecap="round"/>
                            </g>
                        </svg>
                    `;
                    loaded.style.opacity = '0';
                    loaded.style.transition = 'opacity 0.5s';
                    syncIcon.parentNode.insertBefore(loaded, syncIcon.nextSibling);
                    clearInterval(interval);
                }
            }, 500);
        }
        injectLoadedIndicator();

        // Note: showLoadedIndicator is now only called from the injected script

            // --- Inject loading indicator next to sync status ---

        function injectLoadingIndicator() {
            const interval = setInterval(() => {
                const syncIcon = document.getElementById('strudel-sync-status');
                if (syncIcon && !document.getElementById('strudel-loading-indicator')) {
                    const loading = document.createElement('span');
                    loading.id = 'strudel-loading-indicator';
                    loading.title = 'Loading...';
                    loading.style.display = 'none';
                    loading.style.marginLeft = '6px';
                    loading.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 50 50">
                            <g>
                                <circle cx="25" cy="25" r="20" fill="none" stroke="#888" stroke-width="5" stroke-linecap="round" stroke-dasharray="31.4 31.4">
                                    <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/>
                                </circle>
                            </g>
                        </svg>
                    `;
                    syncIcon.parentNode.insertBefore(loading, syncIcon.nextSibling);
                    clearInterval(interval);
                }
            }, 500);
        }
        injectLoadingIndicator();

            // Show/hide loading indicator
            function showLoadingIndicator() {
                    const loading = document.getElementById('strudel-loading-indicator');
                    if (loading) {
                            loading.style.display = 'inline-block';
                            setTimeout(() => { loading.style.display = 'none'; }, 3000);
                    }
            }

        // --- Inject draggable resize handler between #code and menu panel ---
        function injectResizeHandler() {
            const interval = setInterval(() => {
                const codeSection = document.getElementById('code');
                const menuPanel = document.querySelector('nav[aria-label="Menu Panel"]');
                if (codeSection && menuPanel && !document.getElementById('strudel-resize-handler')) {
                    // Set parent to flex if not already
                    const parent = codeSection.parentNode;
                    if (parent && parent.style.display !== 'flex') {
                        parent.style.display = 'flex';
                        parent.style.flexDirection = 'row';
                    }
                    codeSection.style.flex = '0 0 60%';
                    menuPanel.style.flex = '1 1 40%';
                    menuPanel.style.minWidth = '120px';
                    codeSection.style.minWidth = '120px';
                        // Remove max-width if present (inline and computed)
                        menuPanel.style.removeProperty('max-width');
                        menuPanel.style.setProperty('max-width', 'none', 'important');

                    // Create handler
                    const handler = document.createElement('div');
                    handler.id = 'strudel-resize-handler';
                        handler.style.width = '2px';
                    handler.style.cursor = 'col-resize';
                        handler.style.background = '#222';
                    handler.style.zIndex = '1000';
                    handler.style.userSelect = 'none';
                    handler.style.position = 'relative';
                    handler.style.height = '100%';

                    // Insert handler between codeSection and menuPanel
                    parent.insertBefore(handler, menuPanel);

                    // Drag logic
                    let dragging = false;
                    handler.addEventListener('mousedown', (e) => {
                        dragging = true;
                        document.body.style.cursor = 'col-resize';
                        e.preventDefault();
                    });
                    document.addEventListener('mousemove', (e) => {
                        if (!dragging) return;
                        // Get parent left edge
                        const parentRect = parent.getBoundingClientRect();
                        let x = e.clientX - parentRect.left;
                        // Clamp
                        const min = 120, max = parentRect.width - 120;
                        x = Math.max(min, Math.min(x, max));
                        // Set flex-basis in px
                        codeSection.style.flex = `0 0 ${x}px`;
                        menuPanel.style.flex = `1 1 ${parentRect.width - x - handler.offsetWidth}px`;
                    });
                    document.addEventListener('mouseup', () => {
                        if (dragging) {
                            dragging = false;
                            document.body.style.cursor = '';
                        }
                    });
                    clearInterval(interval);
                }
            }, 500);
        }

        injectResizeHandler();

    let debounceTimer;


        // --- Only patch console.error for loading indicator in userscript context ---
        const originalConsoleError = console.error;
        console.error = function(...args) {
            if (args && args.length > 0 && typeof args[0] === 'string' && args[0].includes("can't access property \"connect\", t is undefined")) {
                showLoadingIndicator();
            }
            originalConsoleError.apply(console, args);
        };

    function syncToServer() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const data = { ...localStorage };

            GM_xmlhttpRequest({
                method: 'POST',
                url: 'http://localhost:13121/sync',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data, null, 2),
                    onload: (response) => {
                        setSyncStatus(true);
                        console.log('Synced:', response.status);
                    },
                    onerror: (error) => {
                        setSyncStatus(false);
                        console.error('Sync failed:', error);
                    }
            });
        }, 500); // Wait 500ms after last change
    }

    // Watch localStorage changes
    window.addEventListener('storage', syncToServer);

    // Intercept localStorage.setItem
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        syncToServer();
    };

    // Initial sync on load
    syncToServer();
        // Set initial status to red until first sync
        setSyncStatus(false);
})();
