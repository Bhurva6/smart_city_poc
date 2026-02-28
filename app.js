/* =============================================
   VIGILANT LABS — Dashboard Application Logic
   ============================================= */

(function () {
    'use strict';

    // ── Location Folders ─────────────────────────────────────────────────────
    const LOCATION_FOLDERS = [
        'CBS_27th_Jan_Towards_Meher_Signal_(Copy)_20260127-100000_20260127-160000',
        'CBS_27th_Jan_Towards_Meher_Signal_(Copy)_20260127-160000_20260127-190000',
        'CBS_4th_Feb_CBS_Towards_Shalimar_(Copy)_20260204-170000_20260204-173000',
        'CBS_4th_Feb_RLVD_Towards_Trimbak_Naka_(Copy)_20260204-161800_20260204-183000',
        'CBS_4th_Feb_output',
        'CBS_4th_Feb_output1',
        'Chh_Shivaji_Maharaj_Statue_NK_13th_Jan_Towards_Sinnar_phata_(Copy)_20260113-184842_20260113-235959',
        'Chh_Shivaji_Maharaj_Statue_NK_14th_Jan_Towards_Sinnar_phata_(Copy)_20260114-000000_20260114-120000',
        'Dr_Ambedkar_Statue_1st_Jan_Towards_Ambedkar_Statue_20260101-060000_20260101-115959',
        'Dr_Ambedkar_Statue_1st_Jan_Towards_Ambedkar_Statue_20260101-120000_20260101-180000',
        'Dr_Ambedkar_Statue_1st_Jan_Towards_Ambedkar_Statue_20260101-180000_20260102-000000',
        'Dr_Ambedkar_Statue_1st_Jan_Towards_Ambedkar_Statue_20260102-000000_20260102-060000',
        'Dwarka_Circle_4th_Feb_2026_Towards_Mumbai_Naka_Dwarka_Circle_20260204-154500_20260204-170000_Towards_Mumbai_Naka_Dwarka_Circle_20260204-154500_20260204-170000',
        'Dwarka_Circle_4th_Feb_2026_Towards_Nashik_Road_20260204-154500_20260204-170000_Towards_Nashik_Road_20260204-154500_20260204-170000',
        'Dwarka_Circle_4th_Feb_2026_Towards_Nashik_Road_20260204-154500_20260204-170000_output2',
        'Kapila_Sangam_Ghat_1st_January_20260101-110000_20260101-140000_PTZ_Kapila_Sangam_Ghat_20260101-110000_20260101-140000',
        'Kapila_Sangam_Ghat_1st_January_20260101-140000_20260101-180000_PTZ_Kapila_Sangam_Ghat_20260101-140000_20260101-180000',
        'Ramsetu_1st_Jan_PTZ_Ramsetu_(Copy)_20260101-120000_20260101-180000(1)',
        'Ramsetu_1st_Jan_PTZ_Ramsetu_(Copy)_20260101-180000_20260101-235959',
    ];

    const VIOLATION_LABELS = {
        'HELMET_VIOLATION': 'Helmet Violation',
        'TRIPLE_RIDING':     'Triple Riding',
        'WRONG_SIDE':        'Wrong-Way Driving',
        'CROWD_ANOMALY':     'Crowd Detection',
    };

    const VIOLATION_BADGE_CLASSES = {
        'HELMET_VIOLATION': 'badge-helmet',
        'TRIPLE_RIDING':    'badge-triple',
        'WRONG_SIDE':       'badge-wrongway',
        'CROWD_ANOMALY':    'badge-crowd',
    };

    const VIOLATION_TYPE_OPTIONS = [
        { value: 'all',               label: 'All Types' },
        { value: 'HELMET_VIOLATION',  label: 'Helmet Violation' },
        { value: 'TRIPLE_RIDING',     label: 'Triple Riding' },
        { value: 'WRONG_SIDE',        label: 'Wrong-Way Driving' },
        { value: 'CROWD_ANOMALY',     label: 'Crowd Detection' },
    ];

    const OVERLAY_COLORS = [
        'orange','orange','green','orange','orange','orange',
        'green','orange','red','orange','red','green',
        'red','red','red','orange','orange','orange','green',
    ];

    // ── CDN Configuration ─────────────────────────────────────────────────────
    // When deploying to Vercel, set this to your Cloudflare R2 public base URL.
    // Example: 'https://pub-abc123.r2.dev'
    // Leave empty for local development (files served from same origin).
    const VIDEO_CDN_BASE = '';

    // Prefix a server-relative path with CDN base when configured.
    function cdnUrl(path) {
        return VIDEO_CDN_BASE ? VIDEO_CDN_BASE.replace(/\/$/, '') + path : path;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function formatLocationLabel(folder) {
        let label = folder;
        label = label.replace(/\(\d+\)$/, '');
        label = label.replace(/(_\d{8}-\d{6})+/g, '');
        label = label.replace(/\(Copy\)/g, '');
        label = label.replace(/_PTZ[^_]*/g, '');
        label = label.replace(/_output\d*$/g, '');
        label = label.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
        return label;
    }

    // Convert an absolute path from events.jsonl to a web-relative /output/... path.
    // The files exist at smart_city_poc/output/... regardless of where events.jsonl was generated.
    function toWebPath(absolutePath) {
        if (!absolutePath) return '';
        const idx = absolutePath.indexOf('/output/');
        if (idx !== -1) return absolutePath.substring(idx);
        return absolutePath;
    }

    // Load a video element trying each source in order.
    // Uses native browser onerror to cascade — no HEAD requests.
    // onFail() is called if every source fails (optional).
    function tryVideoSources(videoEl, sources, onFail) {
        const srcs = sources.filter(Boolean);
        if (!srcs.length) { onFail && onFail(); return; }

        function attempt(i) {
            if (i >= srcs.length) { onFail && onFail(); return; }
            videoEl.onerror = () => attempt(i + 1);
            videoEl.src = srcs[i];
            videoEl.load();
            videoEl.play().catch(() => {}); // trigger autoplay; ignore policy errors
        }
        attempt(0);
    }

    // Show a "video unavailable" placeholder inside a .video-panel
    function showVideoUnavailable(panel, message) {
        const vid = panel && panel.querySelector('video');
        if (vid) vid.style.display = 'none';
        if (!panel) return;
        let ph = panel.querySelector('.video-unavailable');
        if (!ph) {
            ph = document.createElement('div');
            ph.className = 'video-unavailable';
            panel.appendChild(ph);
        }
        ph.textContent = message || 'Annotated video not available';
    }

    function formatTimestamp(ts) {
        if (!ts) return '—';
        const d = new Date(ts);
        if (isNaN(d)) return ts;
        const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        return `${date} · ${time}`;
    }

    // ── DOM refs ──────────────────────────────────────────────────────────────
    const landingView = document.getElementById('landing-view');
    const areaView    = document.getElementById('area-view');
    const videoGrid   = document.getElementById('video-grid');

    // ── Landing Page: Input Video Grid ────────────────────────────────────────

    function renderVideoGrid() {
        if (!videoGrid) return;
        videoGrid.className = 'video-grid';
        videoGrid.innerHTML = '';

        LOCATION_FOLDERS.forEach((folder, i) => {
            const label        = formatLocationLabel(folder);
            const overlayColor = OVERLAY_COLORS[i] || 'orange';

            const div = document.createElement('div');
            div.className = 'video-grid-item';
            div.innerHTML = `
                <video autoplay muted loop playsinline class="video-grid-player"></video>
                <div class="video-overlay video-overlay-${overlayColor}"></div>
                <div class="video-grid-label">${label}</div>
                <button class="video-grid-view-btn" aria-label="View Analysis for ${label}">View Analysis</button>
            `;

            // All input videos confirmed at /inputs/{folder}.mp4
            div.querySelector('.video-grid-player').src = cdnUrl(`/inputs/${folder}.mp4`);

            div.querySelector('.video-grid-view-btn').addEventListener('click', () => {
                window.location.hash = `#dashboard-${i}`;
            });
            videoGrid.appendChild(div);
        });
    }

    function hideZoneUI() {
        const t = document.getElementById('zone-toggle-container');
        if (t) { t.innerHTML = ''; t.style.display = 'none'; }
        const a = document.getElementById('area-info-container');
        if (a) { a.innerHTML = ''; a.style.display = 'none'; }
    }

    // ── Dashboard View ────────────────────────────────────────────────────────

    let currentEvents = [];

    function renderDashboard(folderIdx) {
        folderIdx = Math.min(Math.max(parseInt(folderIdx, 10) || 0, 0), LOCATION_FOLDERS.length - 1);

        landingView && landingView.classList.remove('active');
        areaView    && areaView.classList.remove('active');
        const existing = document.getElementById('dashboard-view');
        if (existing) existing.remove();

        const folder = LOCATION_FOLDERS[folderIdx];

        const locationOptions = LOCATION_FOLDERS.map((f, i) =>
            `<option value="${i}"${i === folderIdx ? ' selected' : ''}>${formatLocationLabel(f)}</option>`
        ).join('');

        const violationOptions = VIOLATION_TYPE_OPTIONS.map(t =>
            `<option value="${t.value}">${t.label}</option>`
        ).join('');

        const dashView = document.createElement('div');
        dashView.id        = 'dashboard-view';
        dashView.className = 'view active';
        dashView.innerHTML = `
            <nav class="navbar dashboard-navbar">
                <div class="nav-brand">
                    <button id="db-back-btn" class="back-btn" aria-label="Back to overview">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <div class="brand-icon brand-icon-sm">
                        <img src="/logo.webp" alt="Vigilant Labs" style="width:36px;height:36px;object-fit:contain;border-radius:6px;">
                    </div>
                    <span class="brand-text">Vigilant Labs</span>
                    <span class="breadcrumb-sep">/</span>
                    <select id="db-zone-select" class="dashboard-zone-select">
                        ${locationOptions}
                    </select>
                </div>
                <div class="nav-meta">
                    <span class="pulse-dot"></span>
                    <span class="nav-status">Live Analysis</span>
                </div>
            </nav>

            <div class="filters-bar">
                <div class="filter-group">
                    <label class="filter-label" for="db-date-from">From</label>
                    <input type="datetime-local" id="db-date-from" class="filter-input">
                </div>
                <div class="filter-group">
                    <label class="filter-label" for="db-date-to">To</label>
                    <input type="datetime-local" id="db-date-to" class="filter-input">
                </div>
                <div class="filter-group">
                    <label class="filter-label" for="db-violation-type">Violation Type</label>
                    <select id="db-violation-type" class="filter-input">
                        ${violationOptions}
                    </select>
                </div>
                <button id="db-filter-apply" class="filter-apply-btn">Apply Filters</button>
                <button id="db-filter-reset" class="filter-reset-btn">Reset</button>
            </div>

            <div class="dashboard-main">
                <div class="dashboard-video">
                    <div class="video-panel">
                        <div class="video-panel-header">
                            <span class="video-label"><span class="rec-dot"></span> Plain Video</span>
                        </div>
                        <video id="db-plain-video" class="video-player" controls muted autoplay loop playsinline></video>
                    </div>
                    <div class="video-panel" style="margin-top:16px;">
                        <div class="video-panel-header">
                            <span class="video-label"><span class="rec-dot rec-dot-heat"></span> Heatmap Analysis</span>
                        </div>
                        <video id="db-heatmap-video" class="video-player" controls muted autoplay loop playsinline></video>
                    </div>
                    <div id="db-metrics-row" class="dashboard-metrics-row" style="margin-top:20px;"></div>
                </div>

                <div class="dashboard-table">
                    <div class="detections-header">
                        <h2 class="detections-title">Detection Events</h2>
                        <span id="db-events-count" class="detections-count">Loading…</span>
                    </div>
                    <div class="table-wrapper" id="db-table-wrapper">
                        <table class="detections-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Timestamp</th>
                                    <th>Violation Type</th>
                                    <th>Confidence</th>
                                    <th>Snapshot</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="db-events-tbody"></tbody>
                        </table>
                    </div>
                    <div id="db-no-results" class="no-results" style="display:none;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4">
                            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                        </svg>
                        <p>No detection events found for the selected filters.</p>
                    </div>
                </div>
            </div>

            <div id="db-modal" class="lightbox" style="display:none;">
                <div class="lightbox-overlay"></div>
                <div class="lightbox-content">
                    <button id="db-modal-close" class="lightbox-close">&times;</button>
                    <img id="db-modal-img" src="" alt="Detection snapshot">
                </div>
            </div>
        `;
        document.body.appendChild(dashView);

        // ── Controls ──────────────────────────────────────────────────────────
        dashView.querySelector('#db-back-btn').onclick = () => { window.location.hash = ''; };

        const zoneSelect = dashView.querySelector('#db-zone-select');
        zoneSelect.addEventListener('change', () => {
            window.location.hash = `#dashboard-${zoneSelect.value}`;
        });

        const dateFrom     = dashView.querySelector('#db-date-from');
        const dateTo       = dashView.querySelector('#db-date-to');
        const violationType = dashView.querySelector('#db-violation-type');

        dashView.querySelector('#db-filter-apply').onclick = applyFilters;
        dashView.querySelector('#db-filter-reset').onclick = () => {
            dateFrom.value        = '';
            dateTo.value          = '';
            violationType.value   = 'all';
            applyFilters();
        };
        violationType.addEventListener('change', applyFilters);

        // ── Modal ─────────────────────────────────────────────────────────────
        const modal    = dashView.querySelector('#db-modal');
        const modalImg = dashView.querySelector('#db-modal-img');
        dashView.querySelector('#db-modal-close').onclick          = () => { modal.style.display = 'none'; };
        dashView.querySelector('.lightbox-overlay').onclick         = () => { modal.style.display = 'none'; };
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') modal.style.display = 'none';
            if (!document.getElementById('dashboard-view')) {
                document.removeEventListener('keydown', escHandler);
            }
        });

        // ── Filters ───────────────────────────────────────────────────────────
        function applyFilters() {
            renderEventsTable(currentEvents, dateFrom.value, dateTo.value, violationType.value);
        }

        // ── Events Table ──────────────────────────────────────────────────────
        function renderEventsTable(events, fromVal, toVal, typeVal) {
            const tbody       = dashView.querySelector('#db-events-tbody');
            const noResults   = dashView.querySelector('#db-no-results');
            const tableWrap   = dashView.querySelector('#db-table-wrapper');
            const countEl     = dashView.querySelector('#db-events-count');
            tbody.innerHTML   = '';

            let filtered = [...events];
            if (typeVal && typeVal !== 'all') {
                filtered = filtered.filter(e => e.event_type === typeVal);
            }
            if (fromVal) filtered = filtered.filter(e => e.ts >= fromVal);
            if (toVal)   filtered = filtered.filter(e => e.ts <= toVal);
            filtered.sort((a, b) => b.ts.localeCompare(a.ts));

            countEl.textContent = `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`;

            if (filtered.length === 0) {
                tableWrap.style.display   = 'none';
                noResults.style.display   = 'flex';
                return;
            }
            tableWrap.style.display = 'block';
            noResults.style.display = 'none';

            filtered.forEach((evt, idx) => {
                const tr         = document.createElement('tr');
                const badgeClass = VIOLATION_BADGE_CLASSES[evt.event_type] || '';
                const typeLabel  = VIOLATION_LABELS[evt.event_type] || evt.event_type;
                const confidence = evt.confidence != null
                    ? `${(evt.confidence * 100).toFixed(1)}%` : '—';

                // Convert absolute snapshot path → web-relative /output/... path
                const snapPath = toWebPath(evt.snapshot || '');

                tr.style.animation = `rowFadeIn 0.3s ease ${Math.min(idx * 0.04, 0.5)}s both`;
                tr.innerHTML = `
                    <td class="td-index">${String(idx + 1).padStart(2, '0')}</td>
                    <td class="td-timestamp">${formatTimestamp(evt.ts)}</td>
                    <td><span class="violation-badge ${badgeClass}">${typeLabel}</span></td>
                    <td class="td-confidence">${confidence}</td>
                    <td class="td-snap">
                        ${snapPath
                            ? `<img class="snapshot-thumb" src="${snapPath}" alt="${typeLabel}" data-full="${snapPath}">`
                            : '<span class="no-snap">—</span>'
                        }
                    </td>
                    <td>
                        <button class="dashboard-action-btn accept">Accept</button>
                        <button class="dashboard-action-btn reject">Reject</button>
                    </td>
                `;

                // Snapshot: hide on error, open modal on click
                const thumb = tr.querySelector('.snapshot-thumb');
                if (thumb) {
                    thumb.addEventListener('error', () => { thumb.style.display = 'none'; });
                    thumb.onclick = () => { modalImg.src = thumb.dataset.full; modal.style.display = 'flex'; };
                }

                // Accept / Reject
                const acceptBtn = tr.querySelector('.accept');
                const rejectBtn = tr.querySelector('.reject');
                acceptBtn.onclick = () => {
                    acceptBtn.textContent = 'Accepted';
                    acceptBtn.classList.add('done');
                    acceptBtn.disabled = rejectBtn.disabled = true;
                };
                rejectBtn.onclick = () => {
                    rejectBtn.textContent = 'Rejected';
                    rejectBtn.classList.add('done');
                    rejectBtn.disabled = acceptBtn.disabled = true;
                };

                tbody.appendChild(tr);
            });
        }

        // ── Load Videos + Data ────────────────────────────────────────────────
        function loadContent(folder) {
            const plainVideo   = dashView.querySelector('#db-plain-video');
            const heatmapVideo = dashView.querySelector('#db-heatmap-video');
            const plainPanel   = plainVideo.closest('.video-panel');
            const heatmapPanel = heatmapVideo.closest('.video-panel');

            // Plain video must only ever show the AI-annotated output — never the raw input feed
            // Priority: output_videos/ (faststart) → output/ fallback; both prefixed with CDN base if set
            tryVideoSources(plainVideo, [
                cdnUrl(`/output_videos/${folder}/videos/${folder}_plain.mp4`),
                cdnUrl(`/output/${folder}/videos/${folder}_plain.mp4`),
            ], () => showVideoUnavailable(plainPanel, 'Annotated video not available'));

            tryVideoSources(heatmapVideo, [
                cdnUrl(`/output_videos/${folder}/videos/${folder}_heatmap.mp4`),
                cdnUrl(`/output/${folder}/videos/${folder}_heatmap.mp4`),
            ], () => showVideoUnavailable(heatmapPanel, 'Heatmap video not available'));

            // Sync playback between plain and heatmap
            let syncing = false;
            function syncPair(master, slave) {
                master.addEventListener('play', () => {
                    if (syncing) return; syncing = true;
                    slave.currentTime = master.currentTime;
                    slave.play().catch(() => {}).finally(() => { syncing = false; });
                });
                master.addEventListener('pause', () => {
                    if (syncing) return; syncing = true;
                    slave.pause(); syncing = false;
                });
                master.addEventListener('seeked', () => {
                    if (!syncing) slave.currentTime = master.currentTime;
                });
            }
            syncPair(plainVideo, heatmapVideo);
            syncPair(heatmapVideo, plainVideo);

            // Load detection events from events.jsonl
            currentEvents = [];
            const countEl = dashView.querySelector('#db-events-count');
            countEl.textContent = 'Loading…';

            fetch(`/output/${folder}/reports/events.jsonl`)
                .then(r => { if (!r.ok) throw new Error('Not found'); return r.text(); })
                .then(text => {
                    currentEvents = text.trim().split('\n')
                        .filter(l => l.trim())
                        .map(line => { try { return JSON.parse(line); } catch (e) { return null; } })
                        .filter(Boolean);
                    applyFilters();
                })
                .catch(() => {
                    countEl.textContent = '0 events';
                    dashView.querySelector('#db-table-wrapper').style.display = 'none';
                    dashView.querySelector('#db-no-results').style.display    = 'flex';
                });

            // Load vehicle-count metrics from report JSON
            fetch(`/output/${folder}/reports/report_${folder}.json`)
                .then(r => r.json())
                .then(renderMetrics)
                .catch(() => renderMetrics({}));
        }

        function renderMetrics(data) {
            const row = dashView.querySelector('#db-metrics-row');
            if (!row) return;
            const defs = [
                { key: 'persons',   label: 'Persons',    icon: '🚶' },
                { key: 'two_wheel', label: '2-Wheelers', icon: '🏍️' },
                { key: 'four_wheel',label: '4-Wheelers', icon: '🚗' },
                { key: 'cars',      label: 'Cars',       icon: '🚙' },
                { key: 'buses',     label: 'Buses',      icon: '🚌' },
                { key: 'trucks',    label: 'Trucks',     icon: '🚛' },
            ];
            const items = defs.filter(d => data[d.key] > 0);
            row.innerHTML = items.map(d => `
                <div class="dashboard-metric-box">
                    <div class="metric-icon">${d.icon}</div>
                    <div class="metric-value">${data[d.key]}</div>
                    <div class="metric-label">${d.label}</div>
                </div>
            `).join('');
        }

        loadContent(folder);
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    function showLanding() {
        const dashView = document.getElementById('dashboard-view');
        if (dashView) dashView.remove();
        areaView    && areaView.classList.remove('active');
        landingView && landingView.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash;
        if (hash.startsWith('#dashboard-')) {
            const idx = parseInt(hash.replace('#dashboard-', ''), 10);
            renderDashboard(isNaN(idx) ? 0 : idx);
        } else {
            showLanding();
        }
    });

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => { window.location.hash = ''; });

    // ── Row animation keyframes ───────────────────────────────────────────────
    const ks = document.createElement('style');
    ks.textContent = `
        @keyframes rowFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(ks);

    // ── Init ──────────────────────────────────────────────────────────────────
    const initHash = window.location.hash;
    if (initHash.startsWith('#dashboard-')) {
        const idx = parseInt(initHash.replace('#dashboard-', ''), 10);
        renderDashboard(isNaN(idx) ? 0 : idx);
    } else {
        hideZoneUI();
        renderVideoGrid();
    }

})();
