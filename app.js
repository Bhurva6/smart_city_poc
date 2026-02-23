/* =============================================
   VIGILANT LABS — Dashboard Application Logic
   ============================================= */

(function () {
    'use strict';

    // ── Data: area → use-cases → events ───────────────────
    const AREAS = {
        1: {
            name: 'Traffic Junction',
            zone: 'Zone 01',
            description: 'Helmet violation detection & triple riding monitoring at urban intersections',
            rawVideo: '/assets/3_seat_helmet.mp4',
            heatmapVideo: '/assets/heatmap/3_seat_helmet_heatmap.mp4',
            useCases: ['helmet', 'triple'],
        },
        2: {
            name: 'Highway',
            zone: 'Zone 02',
            description: 'Wrong-way driving alerts & crowd density monitoring on major highways',
            rawVideo: '/assets/wrongside_helmet_car_people_2.mp4',
            heatmapVideo: '/assets/heatmap/wrongside_helmet_car_people_2_heatmap.mp4',
            useCases: ['wrongway', 'crowd'],
        },
    };

    const USE_CASE_LABELS = {
        helmet: 'Helmet Violation',
        triple: 'Triple Riding',
        wrongway: 'Wrong-Way Driving',
        crowd: 'Crowd Detection',
    };

    // Simulated detection events mapped to real asset images
    const EVENTS = [
        // Area 1 — Helmet
        {
            area: 1,
            type: 'helmet',
            timestamp: '2026-02-24T01:12:20',
            image: '/assets/helmet/helmet_violation_1771516340_8_31.jpg',
            confidence: 96.4,
            status: 'flagged',
        },
        {
            area: 1,
            type: 'helmet',
            timestamp: '2026-02-24T01:12:47',
            image: '/assets/helmet/helmet_violation_1771516367_62_78.jpg',
            confidence: 94.1,
            status: 'flagged',
        },
        {
            area: 1,
            type: 'helmet',
            timestamp: '2026-02-24T01:12:54',
            image: '/assets/helmet/helmet_violation_1771516374_37_110.jpg',
            confidence: 97.8,
            status: 'reviewed',
        },
        {
            area: 1,
            type: 'helmet',
            timestamp: '2026-02-24T01:13:26',
            image: '/assets/helmet/helmet_violation_1771516406_150_186.jpg',
            confidence: 93.5,
            status: 'flagged',
        },
        // Area 1 — Triple Riding
        {
            area: 1,
            type: 'triple',
            timestamp: '2026-02-24T01:13:02',
            image: '/assets/triple/triple_riding_1771516382_107_108.jpg',
            confidence: 91.2,
            status: 'flagged',
        },
        {
            area: 1,
            type: 'triple',
            timestamp: '2026-02-24T01:13:18',
            image: '/assets/triple/triple_riding_1771516398_141_146.jpg',
            confidence: 89.7,
            status: 'reviewed',
        },
        // Area 2 — Wrong-Way
        {
            area: 2,
            type: 'wrongway',
            timestamp: '2026-02-24T01:20:10',
            image: '/assets/wrong_way/wrong-way.jpeg',
            confidence: 95.3,
            status: 'flagged',
        },
        {
            area: 2,
            type: 'wrongway',
            timestamp: '2026-02-24T01:21:45',
            image: '/assets/wrong_way/wrong-way1.jpeg',
            confidence: 92.8,
            status: 'flagged',
        },
        // Area 2 — Wrong-Way (additional)
        {
            area: 2,
            type: 'wrongway',
            timestamp: '2026-02-24T01:22:30',
            image: '/assets/wrong_way/wrong_way2.jpg',
            confidence: 93.1,
            status: 'flagged',
        },
        // Area 2 — Crowd
        {
            area: 2,
            type: 'crowd',
            timestamp: '2026-02-24T00:43:51',
            image: '/assets/crowd/vlcsnap-2026-02-24-00h43m51s528.png',
            confidence: 88.6,
            status: 'reviewed',
        },
        {
            area: 2,
            type: 'crowd',
            timestamp: '2026-02-24T00:44:03',
            image: '/assets/crowd/vlcsnap-2026-02-24-00h44m03s011.png',
            confidence: 90.1,
            status: 'flagged',
        },
        {
            area: 2,
            type: 'crowd',
            timestamp: '2026-02-24T00:44:37',
            image: '/assets/crowd/vlcsnap-2026-02-24-00h44m37s770.png',
            confidence: 91.4,
            status: 'flagged',
        },
    ];

    // ── State ─────────────────────────────────────────────
    let currentArea = null;

    // ── DOM refs ──────────────────────────────────────────
    const landingView = document.getElementById('landing-view');
    const areaView = document.getElementById('area-view');
    const backBtn = document.getElementById('back-btn');
    const areaBreadcrumb = document.getElementById('area-breadcrumb');
    const areaTitle = document.getElementById('area-title');
    const areaDescription = document.getElementById('area-description');
    const rawVideo = document.getElementById('raw-video');
    const heatmapVideo = document.getElementById('heatmap-video');
    const filterType = document.getElementById('filter-type');
    const filterDateFrom = document.getElementById('filter-date-from');
    const filterDateTo = document.getElementById('filter-date-to');
    const filterApplyBtn = document.getElementById('filter-apply-btn');
    const filterResetBtn = document.getElementById('filter-reset-btn');
    const detectionsTbody = document.getElementById('detections-tbody');
    const detectionsCount = document.getElementById('detections-count');
    const noResults = document.getElementById('no-results');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');

    // ── Navigation ────────────────────────────────────────
    function showLanding() {
        areaView.classList.remove('active');
        landingView.classList.add('active');
        currentArea = null;
        // Pause videos
        rawVideo.pause();
        heatmapVideo.pause();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showArea(areaId) {
        const area = AREAS[areaId];
        if (!area) return;
        currentArea = areaId;

        // Update header
        areaBreadcrumb.textContent = area.zone;
        areaTitle.textContent = area.name;
        areaDescription.textContent = area.description;

        // Populate type filter
        filterType.innerHTML = '<option value="all">All Types</option>';
        area.useCases.forEach(uc => {
            const opt = document.createElement('option');
            opt.value = uc;
            opt.textContent = USE_CASE_LABELS[uc];
            filterType.appendChild(opt);
        });

        // Set default date range (today)
        const today = '2026-02-24';
        filterDateFrom.value = today + 'T00:00';
        filterDateTo.value = today + 'T23:59';

        // Load videos — set src directly for reliable cross-browser loading
        rawVideo.src = area.rawVideo;
        heatmapVideo.src = area.heatmapVideo;

        // Switch view
        landingView.classList.remove('active');
        areaView.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Render table
        renderTable();
    }

    // ── Table rendering ───────────────────────────────────
    function renderTable() {
        const typeVal = filterType.value;
        const fromVal = filterDateFrom.value;
        const toVal = filterDateTo.value;

        let filtered = EVENTS.filter(e => e.area === currentArea);

        // Type filter
        if (typeVal !== 'all') {
            filtered = filtered.filter(e => e.type === typeVal);
        }

        // Date filter
        if (fromVal) {
            filtered = filtered.filter(e => e.timestamp >= fromVal);
        }
        if (toVal) {
            filtered = filtered.filter(e => e.timestamp <= toVal);
        }

        // Sort by timestamp descending
        filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        // Update count
        detectionsCount.textContent = `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`;

        // Toggle no-results
        const tableWrapper = document.querySelector('.table-wrapper');
        if (filtered.length === 0) {
            tableWrapper.style.display = 'none';
            noResults.style.display = 'block';
        } else {
            tableWrapper.style.display = 'block';
            noResults.style.display = 'none';
        }

        // Build rows
        detectionsTbody.innerHTML = '';
        filtered.forEach((evt, idx) => {
            const tr = document.createElement('tr');
            tr.style.animation = `rowFadeIn 0.3s ease ${idx * 0.05}s both`;

            const badgeClass = `violation-badge-${evt.type}`;
            const statusClass = evt.status === 'flagged' ? 'status-flagged' : 'status-reviewed';
            const ts = formatTimestamp(evt.timestamp);

            tr.innerHTML = `
        <td class="td-index">${String(idx + 1).padStart(2, '0')}</td>
        <td class="td-timestamp">${ts}</td>
        <td><span class="violation-badge ${badgeClass}">${USE_CASE_LABELS[evt.type]}</span></td>
        <td><img class="snapshot-thumb" src="${evt.image}" alt="${USE_CASE_LABELS[evt.type]} snapshot" data-full="${evt.image}"></td>
      `;
            detectionsTbody.appendChild(tr);
        });
    }

    function formatTimestamp(ts) {
        const d = new Date(ts);
        const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        return `${date} · ${time}`;
    }

    // ── Lightbox ──────────────────────────────────────────
    function openLightbox(src) {
        lightboxImg.src = src;
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.style.display = 'none';
        document.body.style.overflow = '';
    }

    // ── Row animation keyframes (inject once) ─────────────
    const style = document.createElement('style');
    style.textContent = `
    @keyframes rowFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
    document.head.appendChild(style);

    // ── Event Listeners ───────────────────────────────────
    // Area cards
    document.querySelectorAll('.area-card').forEach(card => {
        card.addEventListener('click', () => {
            const areaId = parseInt(card.dataset.area, 10);
            showArea(areaId);
        });
    });

    // Back button
    backBtn.addEventListener('click', showLanding);

    // Filter buttons
    filterApplyBtn.addEventListener('click', renderTable);
    filterResetBtn.addEventListener('click', () => {
        filterType.value = 'all';
        filterDateFrom.value = '2026-02-24T00:00';
        filterDateTo.value = '2026-02-24T23:59';
        renderTable();
    });

    // Also re-render on type change for instant feedback
    filterType.addEventListener('change', renderTable);

    // Lightbox — delegate clicks on thumbnails
    detectionsTbody.addEventListener('click', (e) => {
        if (e.target.classList.contains('snapshot-thumb')) {
            openLightbox(e.target.dataset.full);
        }
    });

    // Close lightbox
    lightboxClose.addEventListener('click', closeLightbox);
    document.querySelector('.lightbox-overlay')?.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });

    // Sync videos — when one plays, play the other (flag prevents infinite loop)
    let isSyncing = false;

    function safePlay(video) {
        const p = video.play();
        if (p && typeof p.then === 'function') {
            p.catch(() => {}).finally(() => { isSyncing = false; });
        } else {
            isSyncing = false;
        }
    }

    rawVideo.addEventListener('play', () => {
        if (isSyncing) return;
        isSyncing = true;
        heatmapVideo.currentTime = rawVideo.currentTime;
        safePlay(heatmapVideo);
    });
    rawVideo.addEventListener('pause', () => {
        if (isSyncing) return;
        isSyncing = true;
        heatmapVideo.pause();
        isSyncing = false;
    });
    rawVideo.addEventListener('seeked', () => {
        if (!isSyncing) heatmapVideo.currentTime = rawVideo.currentTime;
    });

    heatmapVideo.addEventListener('play', () => {
        if (isSyncing) return;
        isSyncing = true;
        rawVideo.currentTime = heatmapVideo.currentTime;
        safePlay(rawVideo);
    });
    heatmapVideo.addEventListener('pause', () => {
        if (isSyncing) return;
        isSyncing = true;
        rawVideo.pause();
        isSyncing = false;
    });
    heatmapVideo.addEventListener('seeked', () => {
        if (!isSyncing) rawVideo.currentTime = heatmapVideo.currentTime;
    });

})();
