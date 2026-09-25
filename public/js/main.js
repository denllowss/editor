/**
 * DenjiMotion Studio - Main JavaScript
 * Handles data fetching from FishDatabase, New Project creation,
 * Your Project listing, ContextMenu integration, and package version.
 */

// Fallback empty projects list
const FALLBACK_PROJECTS = [];

document.addEventListener('DOMContentLoaded', () => {
  initUIProtections();
  initVersionFetcher();
  initProjectsFetcher();
  initDashboardSelection();
  initWelcomeModal();
  applyAppColorTheme();
  syncAppThemeUI();

  // Purge all non-essential caches when opening index.html (preserves projects and media)
  if (typeof window.cleanupAllStudioCaches === 'function') {
    window.cleanupAllStudioCaches('index_init').catch(() => {});
  }

  // Handle redirect errors from editor (ghost project guard)
  const _urlErr = new URLSearchParams(window.location.search).get('error');
  if (_urlErr) {
    const _errMessages = {
      project_not_found: 'Project tidak ditemukan atau sudah dihapus.'
    };
    setTimeout(() => showDashboardToast(_errMessages[_urlErr] || 'Project tidak valid.', 4000), 600);
    // Clean the ?error= from URL bar without reload
    history.replaceState(null, '', window.location.pathname);
  }
});

/**
 * Wires multi-select toolbar buttons + Escape-to-exit selection mode
 */
function initDashboardSelection() {
  const toggleBtn = document.getElementById('btn-toggle-select');
  if (toggleBtn) toggleBtn.addEventListener('click', () => setSelectionMode(true));
  const cancelBtn = document.getElementById('btn-select-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', () => setSelectionMode(false));
  const allBtn = document.getElementById('btn-select-all');
  if (allBtn) allBtn.addEventListener('click', () => selectAllProjects());
  const delBtn = document.getElementById('btn-select-delete');
  if (delBtn) delBtn.addEventListener('click', () => openDeleteModalMulti([...selectedProjectIds]));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selectionMode && !document.querySelector('.modal-backdrop.is-active')) {
      setSelectionMode(false);
    }
  });
}

/**
 * Disables browser context menu (right click), zoom, and text selection
 */
function initUIProtections() {
  // Disable text selection drag
  document.addEventListener('selectstart', (e) => {
    // Allow input and textarea elements to be selected
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
  });

  // Disable Ctrl + Wheel Zoom
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });

  // Disable Ctrl/Cmd + (+, -, 0, =) Zoom keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0', '_'].includes(e.key)) {
      e.preventDefault();
    }
  });

  // Disable Safari/iOS Multi-touch Gestures (Pinch to zoom)
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());
}

/**
 * Formats raw package version into clean short form:
 * e.g., "0.1.0-pre-alpha" -> "0.1.0 PA"
 */
function formatAppVersion(raw) {
  if (!raw) return '';
  let str = String(raw).trim().replace(/^v\.?/i, '');
  
  let tag = '';
  if (/[-_.\s]pre[-_.\s]?alpha$/i.test(str)) {
    tag = 'Pre-Alpha';
    str = str.replace(/[-_.\s]pre[-_.\s]?alpha$/i, '');
  } else if (/[-_.\s]alpha$/i.test(str)) {
    tag = 'Alpha';
    str = str.replace(/[-_.\s]alpha$/i, '');
  } else if (/[-_.\s]beta$/i.test(str)) {
    tag = 'Beta';
    str = str.replace(/[-_.\s]beta$/i, '');
  }
  
  const numPart = str.replace(/[-_]/g, '.');
  return tag ? `${numPart} ${tag}` : numPart;
}

/**
 * Formats relative timestamp for project card
 */
function formatRelativeTime(isoString) {
  if (!isoString) return 'Just now';
  const timestamp = new Date(isoString).getTime();
  if (isNaN(timestamp)) return 'Just now';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Dynamically detects latest version tag and synchronizes version pills/badges
 * across Studio navbar and Welcome changelog modal without hardcoding tag literals.
 */
function syncWelcomeVersionTags(pkgVersion) {
  let detected = pkgVersion;
  if (!detected) {
    const firstPill = document.querySelector('.welcome-changelog-feed .welcome-version-pill');
    if (firstPill && firstPill.textContent) {
      detected = firstPill.textContent.trim();
    }
  }
  if (!detected) {
    return;
  }

  const cleanNum = String(detected).trim().replace(/^v\.?/i, '');
  const displayTag = `v${cleanNum}`;
  if (typeof window !== 'undefined') {
    window.OFT_VERSION = cleanNum;
  }

  // 1. Sync Studio top navbar badge
  const badgeEl = document.getElementById('studio-version-badge');
  if (badgeEl) {
    badgeEl.textContent = formatAppVersion(cleanNum);
  }

  // 2. Sync Welcome modal header badge
  const welcomeBadge = document.querySelector('.welcome-header-title-box .welcome-badge');
  if (welcomeBadge) {
    welcomeBadge.textContent = displayTag;
  }

  // 3. Dynamically assign Latest badge only to the first version block
  const blocks = document.querySelectorAll('.welcome-changelog-feed .welcome-version-block');
  blocks.forEach((block, index) => {
    const header = block.querySelector('.welcome-version-header');
    let latestBadge = block.querySelector('.welcome-version-badge-latest');
    if (index === 0) {
      if (!latestBadge && header) {
        latestBadge = document.createElement('span');
        latestBadge.className = 'welcome-version-badge-latest';
        latestBadge.textContent = 'Latest';
        const pill = header.querySelector('.welcome-version-pill');
        if (pill && pill.nextSibling) {
          header.insertBefore(latestBadge, pill.nextSibling);
        } else {
          header.appendChild(latestBadge);
        }
      }
      const pill = block.querySelector('.welcome-version-pill');
      if (pill && !pill.textContent.trim()) {
        pill.textContent = displayTag;
      }
    } else {
      if (latestBadge) {
        latestBadge.remove();
      }
    }
  });
}

/**
 * Fetches version metadata and updates the badges dynamically
 */
async function initVersionFetcher() {
  if (window.location.protocol === 'file:') {
    syncWelcomeVersionTags();
    return;
  }

  try {
    const response = await fetch('./version.json');
    if (response.ok) {
      const data = await response.json();
      if (data && data.version) {
        syncWelcomeVersionTags(data.version);
        return;
      }
    }
  } catch (_) {}

  syncWelcomeVersionTags();
}

/**
 * Loads projects from FishDatabase and populates the "Your Project" list
 */
async function initProjectsFetcher() {
  const listContainer = document.getElementById('projects-container');
  const countBadge = document.getElementById('project-count-badge');
  if (!listContainer) return;

  async function loadAndRender() {
    let projects = [];
    if (window.FishDatabase && typeof window.FishDatabase.getProjects === 'function') {
      try {
        projects = await window.FishDatabase.getProjects();
      } catch (e) {
        projects = [];
      }
    }
    setAllProjectsCache(projects);
    renderProjects(getVisibleProjects(), listContainer, countBadge);
  }

  // Initial load
  await loadAndRender();

  // Finder ala CapCut: cari + urut (render ulang dari cache, tanpa baca DB)
  const searchInput = document.getElementById('project-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      projectSearchQuery = searchInput.value || '';
      renderProjects(getVisibleProjects(), listContainer, countBadge);
    });
  }
  const sortSelect = document.getElementById('project-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      projectSortMode = sortSelect.value || 'newest';
      renderProjects(getVisibleProjects(), listContainer, countBadge);
    });
  }

  // Listen to custom DB project update events
  window.addEventListener('fish-db-projects-updated', () => {
    loadAndRender();
  });

  // Project item left-click navigation (delegated)
  listContainer.addEventListener('click', (e) => {
    const item = e.target.closest('.project-item');
    if (!item) return;
    // Tombol ⋯: buka menu konteks ala CapCut (tanpa navigasi)
    if (e.target.closest('.project-more-btn')) {
      e.stopPropagation();
      if (!selectionMode) openProjectCardMenu(item);
      return;
    }
    // Mode pilih: tap = centang, bukan navigasi
    if (selectionMode) {
      if (item.dataset.id) toggleProjectSelected(item.dataset.id);
      return;
    }
    const swipeBox = e.target.closest('.project-swipe-container');
    if (swipeBox && swipeBox._hasSwiped) {
      return;
    }
    const projectId = item.dataset.id;
    if (projectId) {
      window.location.href = `editor.html?id=${encodeURIComponent(projectId)}`;
    }
  });

  // Attach Right-Click & Press-Hold ContextMenu
  if (window.ContextMenu && typeof window.ContextMenu.bindTrigger === 'function') {
    window.ContextMenu.bindTrigger(listContainer, '.project-item', (target) => {
      if (selectionMode) return []; // menu tahan-lama mati saat mode pilih
      const projectId = target.dataset.id;
      const projectName = target.querySelector('.project-name')?.textContent || 'Project';
      return [
        {
          label: 'Rename',
          icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
          action: () => openRenameModal(projectId, projectName)
        },
        {
          label: 'Save as .ofts',
          icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
          action: () => exportProjectAction(projectId, projectName)
        },
        {
          label: 'Project Settings',
          icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
          action: () => openProjectSettingsModal(projectId)
        },
        {
          label: 'Duplicate',
          icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
          action: async () => {
            if (window.FishDatabase) {
              await window.FishDatabase.duplicateProject(projectId);
              await loadAndRender();
            }
          }
        },
        { divider: true },
        {
          label: 'Remove project',
          icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
          danger: true,
          action: () => openDeleteModal(projectId, projectName)
        }
      ];
    });
  }
}



/**
 * Cache + finder ala CapCut: daftar penuh dari DB disimpan sekali,
 * pencarian & pengurutan hanya memfilter cache lalu render ulang.
 */
let allProjectsCache = [];
let projectSearchQuery = '';
let projectSortMode = 'newest';

function setAllProjectsCache(projects) {
  allProjectsCache = Array.isArray(projects) ? projects.slice() : [];
}

function projectTimestamp(p) {
  if (!p) return 0;
  const t = new Date(p.updatedAt || p.createdAt || 0).getTime();
  return isNaN(t) ? 0 : t;
}

function getVisibleProjects() {
  const q = String(projectSearchQuery || '').trim().toLowerCase();
  let list = allProjectsCache.slice();
  if (q) {
    list = list.filter((p) => String((p && p.name) || '').toLowerCase().includes(q));
  }
  if (projectSortMode === 'oldest') {
    list.sort((a, b) => projectTimestamp(a) - projectTimestamp(b));
  } else if (projectSortMode === 'name') {
    list.sort((a, b) => String((a && a.name) || '').localeCompare(String((b && b.name) || '')));
  } else {
    list.sort((a, b) => projectTimestamp(b) - projectTimestamp(a));
  }
  return list;
}

function syncProjectsFinder() {
  const finder = document.getElementById('projects-finder');
  if (finder) finder.hidden = allProjectsCache.length === 0;
}

/**
 * Blok thumbnail kartu: placeholder gradien + bingkai rasio aspek project.
 * Memakai thumbnail asli bila project menyimpannya (data:image…).
 */
function projectThumbHtml(project, name) {
  const arRaw = (project && project.aspectRatio) || '16:9';
  const m = String(arRaw).match(/(\d+(?:\.\d+)?)\s*[:/x×]\s*(\d+(?:\.\d+)?)/);
  const arLabel = m ? `${m[1]}:${m[2]}` : '16:9';
  const arCss = m ? `${m[1]} / ${m[2]}` : '16 / 9';
  const palettes = [
    ['#5a252c', '#1b1012'], ['#4b2a3b', '#160f15'],
    ['#67412a', '#21140f'], ['#32264a', '#110e18']
  ];
  const nm = String(name || '?');
  let hsh = 0;
  for (let i = 0; i < nm.length; i++) hsh = (hsh * 31 + nm.charCodeAt(i)) | 0;
  const pal = palettes[Math.abs(hsh) % palettes.length];
  const initial = escapeHtml((nm.trim().charAt(0) || '•').toUpperCase());
  const rawThumb = project && typeof project.thumbnail === 'string' ? project.thumbnail : '';
  const thumbImg = rawThumb.startsWith('data:image')
    ? `<img class="project-thumb-img" src="${escapeHtml(rawThumb)}" alt="" draggable="false">` : '';
  return `<div class="project-thumb" style="background:linear-gradient(135deg,${pal[0]},${pal[1]})" aria-hidden="true">`
    + thumbImg
    + `<div class="project-thumb-shape" style="aspect-ratio:${escapeHtml(arCss)}">`
    + `<span class="project-thumb-initial">${initial}</span>`
    + `<svg class="project-thumb-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
    + `</div><span class="project-thumb-badge">${escapeHtml(arLabel)}</span></div>`;
}

/**
 * Buka menu konteks kartu via event contextmenu sintetis — item menu
 * dijamin identik dengan yang didaftarkan ContextMenu.bindTrigger.
 */
function openProjectCardMenu(item) {
  if (!item || !window.ContextMenu) return;
  const btn = item.querySelector('.project-more-btn');
  const r = btn ? btn.getBoundingClientRect() : item.getBoundingClientRect();
  const x = Math.min(window.innerWidth - 8, Math.max(8, r.left + r.width / 2));
  const y = Math.min(window.innerHeight - 8, r.bottom + 6);
  try {
    item.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2
    }));
  } catch (_) {}
}

/**
 * Renders project cards inside the Your Project list with swipe actions
 */
function renderProjects(projects, container, countBadge) {
  if (countBadge) {
    countBadge.textContent = String(projects ? projects.length : 0);
    countBadge.setAttribute('title', `${projects ? projects.length : 0} Total Projects`);
  }

  if (!container) return;
  syncProjectsFinder();

  if (!projects || projects.length === 0) {
    const isFiltering = allProjectsCache.length > 0;
    container.innerHTML = `
      <div class="projects-empty">
        <div class="projects-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M10 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8L10 4zM12 7.2c-1.5 0-2.8 1.3-2.8 2.8h1.4c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4c0 .8-.6 1.4-1.3 2-.7.6-.8 1.2-.8 2.5h1.4v-.3c0-.8.4-1.3 1.1-1.9.7-.6 1-1.3 1-2.3 0-1.5-1.3-2.8-2.8-2.8zM12 17.6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
          </svg>
        </div>
        ${isFiltering
          ? '<span class="projects-empty-title">No matching projects</span><span class="projects-empty-sub">Try another keyword</span>'
          : '<span class="projects-empty-title">No projects yet</span><span class="projects-empty-sub">Tap <b>New Project</b> to start creating</span>'}
      </div>
    `;
    updateProjectsToolbar([]);
    return;
  }

  container.innerHTML = projects.map(project => {
    const name = project.name || 'Untitled Project';
    const size = project.size || '12 KB';
    const savedTime = formatRelativeTime(project.updatedAt || project.createdAt);
    const specs = `${escapeHtml(project.resolution || '1080p')} • ${escapeHtml(project.fps || '60')} fps`;

    return `
      <div class="project-swipe-container" data-id="${escapeHtml(project.id)}" data-name="${escapeHtml(name)}">
        <!-- Slide RIGHT reveals Delete (Left side) -->
        <div class="project-swipe-action action-delete" aria-hidden="true" title="Slide right to delete">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
          <span>Delete</span>
        </div>

        <!-- Slide LEFT reveals Export to .ofts (Right side) -->
        <div class="project-swipe-action action-export" aria-hidden="true" title="Slide left to export">
          <span>Export .ofts</span>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
        </div>

        <!-- Top Layer Project Item Card -->
        <article class="project-item" data-id="${escapeHtml(project.id)}" tabindex="0" role="button" aria-label="Project: ${escapeHtml(name)}">
          <span class="select-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>
          ${projectThumbHtml(project, name)}
          <div class="project-meta">
            <div class="project-row-main">
              <span class="project-name">${escapeHtml(name)}</span>
              <span class="project-size" data-project-size-id="${escapeHtml(project.id)}">${escapeHtml(size)}</span>
            </div>
            <div class="project-row-sub">
              <span class="project-saved">${escapeHtml(savedTime)}</span>
              <span class="project-specs">${specs}</span>
            </div>
          </div>
          <button type="button" class="project-more-btn" aria-label="Project options" tabindex="-1">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </button>
        </article>
      </div>
    `;
  }).join('');

  bindProjectSwipeGestures(container);

  // Multi-select: terapkan status centang + sinkron toolbar hitungan
  applySelectionToCards(container);
  updateProjectsToolbar(projects);

  // Asynchronously compute and hydrate true total project size (JSON + Media + Frame Caches)
  if (window.FishDatabase && typeof window.FishDatabase.getProjectTotalSize === 'function') {
    (projects || []).forEach(project => {
      if (!project || !project.id) return;
      window.FishDatabase.getProjectTotalSize(project.id).then(res => {
        if (!res || !res.formatted) return;
        const selector = (window.CSS && typeof window.CSS.escape === 'function')
          ? `.project-size[data-project-size-id="${window.CSS.escape(project.id)}"]`
          : `.project-size[data-project-size-id="${project.id}"]`;
        const sizeBadge = container.querySelector(selector);
        if (sizeBadge) {
          sizeBadge.textContent = res.formatted;
          const tooltip = `${res.formatted} (${res.bytes.toLocaleString()} bytes)\n• Project: ${res.breakdown.jsonFormatted}\n• Media: ${res.breakdown.mediaFormatted}\n• Cache: ${res.breakdown.cacheFormatted}`;
          sizeBadge.setAttribute('title', tooltip);
        }
        if (project.size !== res.formatted) {
          project.size = res.formatted;
          project.sizeBytes = res.bytes;
          if (typeof window.FishDatabase.updateProjectSize === 'function') {
            window.FishDatabase.updateProjectSize(project.id, res.formatted, res.bytes);
          }
        }
      }).catch(() => {});
    });
  }
}

/**
 * Binds touch & pointer swipe gestures for project cards:
 * Slide RIGHT -> Delete project
 * Slide LEFT  -> Export project to .ofts
 */
function bindProjectSwipeGestures(container) {
  const swipeContainers = container.querySelectorAll('.project-swipe-container');

  swipeContainers.forEach(swipeBox => {
    const itemEl = swipeBox.querySelector('.project-item');
    const deleteAction = swipeBox.querySelector('.action-delete');
    const exportAction = swipeBox.querySelector('.action-export');
    if (!itemEl) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isPointerDown = false;
    let isDragging = false;
    let isLockedDirection = false;
    let isVerticalScroll = false;
    let activePointerId = null;

    const SWIPE_TRIGGER_THRESHOLD = 75; // px to trigger action
    const MAX_DRAG_DISTANCE = 140; // max visual drag boundary

    const onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (selectionMode) return; // swipe mati saat mode pilih

      startX = e.clientX;
      startY = e.clientY;
      currentX = 0;
      isPointerDown = true;
      isDragging = false;
      isLockedDirection = false;
      isVerticalScroll = false;
      activePointerId = e.pointerId;

      itemEl.style.transition = 'none';
    };

    const onPointerMove = (e) => {
      if (!isPointerDown || e.pointerId !== activePointerId) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!isLockedDirection) {
        if (Math.hypot(dx, dy) >= 6) {
          isLockedDirection = true;
          if (Math.abs(dy) > Math.abs(dx)) {
            isVerticalScroll = true;
            return;
          } else {
            isDragging = true;
            try {
              itemEl.setPointerCapture(e.pointerId);
            } catch (err) {}
          }
        } else {
          return;
        }
      }

      if (isVerticalScroll || !isDragging) return;

      e.preventDefault();

      // Non-linear drag resistance beyond 85px
      let targetX = dx;
      if (Math.abs(targetX) > 85) {
        const excess = Math.abs(targetX) - 85;
        const sign = targetX > 0 ? 1 : -1;
        targetX = sign * (85 + excess * 0.35);
      }
      currentX = Math.max(-MAX_DRAG_DISTANCE, Math.min(MAX_DRAG_DISTANCE, targetX));
      itemEl.style.transform = `translateX(${currentX}px)`;

      // Dynamic action reveal feedback
      if (currentX > 0) {
        // Swiping RIGHT -> Delete
        if (deleteAction) {
          deleteAction.style.opacity = '1';
          if (currentX >= SWIPE_TRIGGER_THRESHOLD) {
            deleteAction.classList.add('is-ready');
          } else {
            deleteAction.classList.remove('is-ready');
          }
        }
        if (exportAction) exportAction.style.opacity = '0';
      } else if (currentX < 0) {
        // Swiping LEFT -> Export
        if (exportAction) {
          exportAction.style.opacity = '1';
          if (Math.abs(currentX) >= SWIPE_TRIGGER_THRESHOLD) {
            exportAction.classList.add('is-ready');
          } else {
            exportAction.classList.remove('is-ready');
          }
        }
        if (deleteAction) deleteAction.style.opacity = '0';
      } else {
        if (deleteAction) deleteAction.style.opacity = '0';
        if (exportAction) exportAction.style.opacity = '0';
      }
    };

    const onPointerEnd = (e) => {
      if (!isPointerDown || (e.pointerId !== activePointerId && activePointerId !== null)) return;
      isPointerDown = false;

      try {
        if (itemEl.hasPointerCapture(e.pointerId)) {
          itemEl.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}

      if (isDragging) {
        swipeBox._hasSwiped = true;
        setTimeout(() => {
          swipeBox._hasSwiped = false;
        }, 320);

        const finalX = currentX;

        // Animate snap-back to origin
        itemEl.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
        itemEl.style.transform = 'translateX(0px)';

        if (finalX >= SWIPE_TRIGGER_THRESHOLD) {
          // Slide RIGHT -> Delete confirmation modal
          const projectId = swipeBox.dataset.id;
          const projectName = swipeBox.dataset.name;
          openDeleteModal(projectId, projectName);
        } else if (finalX <= -SWIPE_TRIGGER_THRESHOLD) {
          // Slide LEFT -> Export to .ofts
          const projectId = swipeBox.dataset.id;
          const projectName = swipeBox.dataset.name;
          exportProjectAction(projectId, projectName);
        }

        setTimeout(() => {
          if (deleteAction) {
            deleteAction.style.opacity = '';
            deleteAction.classList.remove('is-ready');
          }
          if (exportAction) {
            exportAction.style.opacity = '';
            exportAction.classList.remove('is-ready');
          }
          itemEl.style.transition = '';
        }, 240);
      }

      activePointerId = null;
      isDragging = false;
      isLockedDirection = false;
      isVerticalScroll = false;
    };

    itemEl.addEventListener('pointerdown', onPointerDown);
    itemEl.addEventListener('pointermove', onPointerMove);
    itemEl.addEventListener('pointerup', onPointerEnd);
    itemEl.addEventListener('pointercancel', onPointerEnd);

    // Direct click fallback on revealed actions
    if (deleteAction) {
      deleteAction.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteModal(swipeBox.dataset.id, swipeBox.dataset.name);
      });
    }
    if (exportAction) {
      exportAction.addEventListener('click', (e) => {
        e.stopPropagation();
        exportProjectAction(swipeBox.dataset.id, swipeBox.dataset.name);
      });
    }
  });
}

/**
 * Basic XSS sanitizer for safe template string rendering
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Opens the Project Settings Modal and populates existing configuration
 */
async function openProjectSettingsModal(projectId) {
  if (!projectId) return;

  let project = null;
  if (window.FishDatabase && typeof window.FishDatabase.getProject === 'function') {
    try {
      project = await window.FishDatabase.getProject(projectId);
    } catch (e) {
      console.warn('Failed to load project for settings:', e);
    }
  }

  if (!project) return;

  const idInput = document.getElementById('settings-project-id');
  const nameInput = document.getElementById('settings-input-name');
  if (idInput) idInput.value = projectId;
  if (nameInput) nameInput.value = project.name || '';

  // 1. Aspect Ratio Frame (preset + custom)
  const aspectVal = project.aspectRatio || '16:9';
  const aspectGrid = document.getElementById('settings-options-aspect-ratio');
  if (aspectGrid) {
    if (window.CustomAspect) {
      window.CustomAspect.syncGrid(aspectGrid, aspectVal);
    } else {
      aspectGrid.querySelectorAll('.aspect-ratio-frame').forEach(f => {
        f.classList.toggle('is-selected', f.dataset.val === aspectVal);
      });
    }
  }

  // 2. Resolution Dropdown
  const resVal = project.resolution || '1080p';
  const resDropdown = document.getElementById('settings-dropdown-resolution');
  if (resDropdown) {
    resDropdown.dataset.value = resVal;
    const label = resDropdown.querySelector('.custom-dropdown-label');
    if (label) label.textContent = resVal;
    resDropdown.querySelectorAll('.custom-dropdown-item').forEach(item => {
      item.classList.toggle('is-selected', item.dataset.val === resVal);
    });
  }

  // 3. FPS Dropdown
  const fpsVal = String(project.fps || '60');
  const fpsDropdown = document.getElementById('settings-dropdown-fps');
  if (fpsDropdown) {
    fpsDropdown.dataset.value = fpsVal;
    const label = fpsDropdown.querySelector('.custom-dropdown-label');
    if (label) label.textContent = `${fpsVal} FPS`;
    fpsDropdown.querySelectorAll('.custom-dropdown-item').forEach(item => {
      item.classList.toggle('is-selected', item.dataset.val === fpsVal);
    });
  }

  // 4. Background Color Swatch
  const bgVal = project.bgColor || 'transparent';
  const bgRow = document.getElementById('settings-options-bgcolor');
  if (bgRow) {
    bgRow.querySelectorAll('.modal-color-swatch').forEach(s => {
      s.classList.toggle('is-selected', s.dataset.val === bgVal);
    });
  }

  if (window.Modal) {
    window.Modal.open('modal-project-settings');
  }

  setTimeout(() => {
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
    }
  }, 80);
}

/**
 * Saves updated project settings (name, aspect ratio, resolution, fps, background color)
 */
async function saveProjectSettingsAction() {
  const idInput = document.getElementById('settings-project-id');
  const nameInput = document.getElementById('settings-input-name');
  const projectId = idInput ? idInput.value : '';
  if (!projectId || !window.FishDatabase) return;

  const newName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Project';
  const aspectGridEl = document.getElementById('settings-options-aspect-ratio');
  let selectedRatio = document.querySelector('#settings-options-aspect-ratio .aspect-ratio-frame.is-selected')?.dataset.val || '16:9';
  if (window.CustomAspect && aspectGridEl) {
    const r = window.CustomAspect.resolveGrid(aspectGridEl);
    if (r.error) {
      window.CustomAspect.flagInvalidRow(aspectGridEl);
      showDashboardToast(r.error);
      return;
    }
    selectedRatio = r.aspect;
  }
  const selectedRes = document.getElementById('settings-dropdown-resolution')?.dataset.value || '1080p';
  const selectedFps = document.getElementById('settings-dropdown-fps')?.dataset.value || '60';
  const selectedBg = document.querySelector('#settings-options-bgcolor .modal-color-swatch.is-selected')?.dataset.val || 'transparent';

  try {
    const project = await window.FishDatabase.getProject(projectId);
    if (project) {
      project.name = newName;
      project.aspectRatio = selectedRatio;
      project.resolution = selectedRes;
      project.fps = selectedFps;
      project.bgColor = selectedBg;
      await window.FishDatabase.saveProject(project);
      showDashboardToast('Project settings saved');
    }
  } catch (err) {
    console.warn('Failed to save project settings:', err);
    showDashboardToast('Failed to save settings');
  }

  if (window.Modal) {
    window.Modal.close();
  }
}

/**
 * Quick rename project (modal kecil, tanpa membuka Settings)
 */
function openRenameModal(projectId, currentName) {
  if (!projectId) return;
  const idInput = document.getElementById('rename-project-id');
  const nameInput = document.getElementById('rename-input-name');
  if (idInput) idInput.value = projectId;
  if (nameInput) nameInput.value = currentName || '';
  if (window.Modal) window.Modal.open('modal-rename-project');
  if (nameInput) {
    setTimeout(() => {
      try { nameInput.focus(); nameInput.select(); } catch (_) {}
    }, 80);
  }
}

async function saveRenameProjectAction() {
  const idInput = document.getElementById('rename-project-id');
  const nameInput = document.getElementById('rename-input-name');
  const projectId = idInput ? idInput.value : '';
  const newName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : '';
  if (!projectId) return;
  if (!newName) {
    showDashboardToast('Name cannot be empty');
    return;
  }
  try {
    if (window.FishDatabase) {
      if (typeof window.FishDatabase.renameProject === 'function') {
        await window.FishDatabase.renameProject(projectId, newName);
      } else if (typeof window.FishDatabase.getProject === 'function') {
        const p = await window.FishDatabase.getProject(projectId);
        if (p) {
          p.name = newName;
          await window.FishDatabase.saveProject(p);
        }
      }
    }
    const hit = allProjectsCache.find((p) => p && p.id === projectId);
    if (hit) hit.name = newName;
    renderProjects(getVisibleProjects(), document.getElementById('projects-container'), document.getElementById('project-count-badge'));
    showDashboardToast('Project renamed');
  } catch (err) {
    console.warn('Failed to rename project:', err);
    showDashboardToast('Failed to rename project');
  }
  try { if (window.Modal) window.Modal.close(); } catch (_) {}
}

/**
 * Multi-select daftar project (v0.15.0): mode pilih + Set id terpilih.
 * Selama aktif: tap kartu = centang (bukan navigasi), swipe & menu
 * tahan-lama dimatikan, hapus berjalan borongan dengan konfirmasi.
 */
const selectedProjectIds = new Set();
let selectionMode = false;
let pendingMultiDeleteIds = null;

function isSelectionMode() {
  return selectionMode;
}

function setSelectionMode(on) {
  selectionMode = !!on;
  if (!selectionMode) {
    selectedProjectIds.clear();
    pendingMultiDeleteIds = null;
  }
  const panel = document.getElementById('panel-local-projects');
  if (panel) panel.classList.toggle('is-selecting', selectionMode);
  const toolbar = document.getElementById('projects-toolbar');
  if (toolbar) toolbar.hidden = selectionMode;
  const finder = document.getElementById('projects-finder');
  if (finder) finder.style.display = selectionMode ? 'none' : '';
  const selectbar = document.getElementById('projects-selectbar');
  if (selectbar) selectbar.hidden = !selectionMode;
  const listContainer = document.getElementById('projects-container');
  if (listContainer) applySelectionToCards(listContainer);
  updateSelectBar();
}

function applySelectionToCards(container) {
  if (!container) return;
  container.querySelectorAll('.project-swipe-container').forEach((card) => {
    card.classList.toggle('is-selected', selectedProjectIds.has(card.dataset.id));
  });
}

function toggleProjectSelected(projectId) {
  if (!projectId) return;
  if (selectedProjectIds.has(projectId)) {
    selectedProjectIds.delete(projectId);
  } else {
    selectedProjectIds.add(projectId);
  }
  const listContainer = document.getElementById('projects-container');
  if (listContainer) {
    listContainer.querySelectorAll('.project-swipe-container').forEach((card) => {
      if (card.dataset.id === projectId) {
        card.classList.toggle('is-selected', selectedProjectIds.has(projectId));
      }
    });
  }
  updateSelectBar();
}

function selectAllProjects() {
  const listContainer = document.getElementById('projects-container');
  if (!listContainer) return;
  const cards = listContainer.querySelectorAll('.project-swipe-container');
  const allSelected = cards.length > 0 && Array.from(cards).every((c) => selectedProjectIds.has(c.dataset.id));
  if (allSelected) {
    selectedProjectIds.clear();
  } else {
    cards.forEach((c) => { if (c.dataset.id) selectedProjectIds.add(c.dataset.id); });
  }
  applySelectionToCards(listContainer);
  updateSelectBar();
}

function updateSelectBar() {
  const countEl = document.getElementById('selectbar-count');
  const deleteBtn = document.getElementById('btn-select-delete');
  const allBtn = document.getElementById('btn-select-all');
  const n = selectedProjectIds.size;
  if (countEl) countEl.textContent = `${n} dipilih`;
  if (deleteBtn) deleteBtn.disabled = n === 0;
  if (allBtn) {
    const listContainer = document.getElementById('projects-container');
    const total = listContainer ? listContainer.querySelectorAll('.project-swipe-container').length : 0;
    allBtn.textContent = total > 0 && n >= total ? 'Kosongkan' : 'Semua';
  }
}

function updateProjectsToolbar(projects) {
  const label = document.getElementById('projects-count-label');
  const toggleBtn = document.getElementById('btn-toggle-select');
  const n = projects ? projects.length : 0;
  if (label) label.textContent = n === 0 ? '' : `${n} project`;
  if (toggleBtn) toggleBtn.style.display = n === 0 ? 'none' : '';
  if (selectionMode) {
    if (n === 0) {
      setSelectionMode(false);
    } else {
      updateSelectBar();
    }
  }
}

/**
 * Opens the Delete Project Confirmation Modal (single project)
 */
function openDeleteModal(projectId, currentName) {
  const modal = document.getElementById('modal-delete-project');
  const idInput = document.getElementById('delete-project-id');
  const targetNameEl = document.getElementById('delete-target-name');
  const promptEl = document.getElementById('delete-project-prompt');
  if (!modal || !idInput) return;

  idInput.value = projectId || '';
  const displayName = `"${currentName || 'Untitled'}"`;
  if (targetNameEl) {
    targetNameEl.textContent = displayName;
  } else if (promptEl) {
    promptEl.textContent = `Delete project ${displayName}?`;
  }

  if (window.Modal) {
    window.Modal.open('modal-delete-project');
  }
}

/**
 * Opens the Delete Confirmation Modal for MULTI-select (bulk delete).
 * Reuses the single modal; confirm branch detects pendingMultiDeleteIds first.
 */
function openDeleteModalMulti(ids) {
  pendingMultiDeleteIds = (ids || []).filter(Boolean);
  if (!pendingMultiDeleteIds.length) return;
  openDeleteModal('', `${pendingMultiDeleteIds.length} project terpilih`);
}

async function confirmMultiDeleteProjects(ids) {
  const listContainer = document.getElementById('projects-container');
  const countBadge = document.getElementById('project-count-badge');
  let okCount = 0;
  if (window.FishDatabase) {
    // Sekuensial (bukan paralel): transaksi IndexedDB ke store yang sama
    for (const pid of ids) {
      try {
        await window.FishDatabase.deleteProject(pid);
        const stillThere = await window.FishDatabase.getProject(pid);
        if (!stillThere) okCount++;
      } catch (e) {
        console.warn('Bulk delete error:', pid, e);
      }
    }
  }
  try { if (window.Modal) window.Modal.close(); } catch (_) {}
  if (okCount === ids.length) {
    showDashboardToast(`${okCount} project dihapus`);
  } else if (okCount > 0) {
    showDashboardToast(`${okCount} dari ${ids.length} project dihapus`);
  } else {
    showDashboardToast('Gagal menghapus project — coba lagi');
  }
  setSelectionMode(false);
  if (listContainer && window.FishDatabase) {
    try {
      const projects = await window.FishDatabase.getProjects();
      setAllProjectsCache(projects);
      renderProjects(getVisibleProjects(), listContainer, countBadge);
    } catch (_) {}
  }
}

/**
 * Confirms deletion of project from modal
 */
async function confirmDeleteProjectAction() {
  // Jalur MULTI-select (borongan) didahulukan
  if (pendingMultiDeleteIds && pendingMultiDeleteIds.length) {
    const ids = pendingMultiDeleteIds;
    pendingMultiDeleteIds = null;
    await confirmMultiDeleteProjects(ids);
    return;
  }

  const idInput = document.getElementById('delete-project-id');
  let projectId = idInput ? idInput.value : '';

  // NOTE: modal ditutup BELAKANGAN & terjaga (lihat bawah) — kegagalan modal
  // tak boleh menggagalkan penghapusan database.

  const listContainer = document.getElementById('projects-container');
  const countBadge = document.getElementById('project-count-badge');

  // Fallback: If projectId was empty, match by target name or single remaining card
  if (!projectId) {
    const targetNameEl = document.getElementById('delete-target-name');
    const rawName = targetNameEl ? targetNameEl.textContent.replace(/^"|"$/g, '').trim() : '';
    if (rawName && window.FishDatabase) {
      try {
        const all = await window.FishDatabase.getProjects();
        const found = all.find(p => p && (p.name === rawName || p.id === rawName));
        if (found) projectId = found.id;
      } catch (_) {}
    }
    if (!projectId && listContainer) {
      const cards = listContainer.querySelectorAll('.project-swipe-container');
      if (cards.length === 1 && cards[0].dataset.id) {
        projectId = cards[0].dataset.id;
      }
    }
  }

  if (!projectId) {
    try { if (window.Modal) window.Modal.close(); } catch (_) {}
    showDashboardToast('Project tidak ditemukan — batal menghapus');
    return;
  }

  if (listContainer && projectId) {
    const cards = listContainer.querySelectorAll('.project-swipe-container');
    cards.forEach(card => {
      if (card.dataset.id === projectId || card.dataset.name === projectId) {
        card.remove();
      }
    });
    const remaining = listContainer.querySelectorAll('.project-swipe-container').length;
    if (countBadge) {
      countBadge.textContent = String(remaining);
      countBadge.setAttribute('title', `${remaining} Total Projects`);
    }
    if (remaining === 0) {
      setAllProjectsCache([]);
      renderProjects([], listContainer, countBadge);
    }
  }

  // Hapus di database + VERIFIKASI (batas 5 detik). Kartu sudah disingkirkan
  // dari DOM di atas; bila verifikasi gagal, refresh di bawah memulihkannya
  // (menangkal "hilang palsu": kartu lenyap tapi project muncul lagi).
  let deleted = false;
  if (window.FishDatabase) {
    try {
      const attempt = (async () => {
        await window.FishDatabase.deleteProject(projectId);
        return !(await window.FishDatabase.getProject(projectId));
      })();
      const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 5000));
      const result = await Promise.race([attempt, timeout]);
      deleted = result === true;
      if (result === 'timeout') console.warn('Delete project timed out:', projectId);
    } catch (e) {
      console.warn('Delete project error:', e);
      deleted = false;
    }
  }

  // Tutup modal belakangan & terjaga
  try { if (window.Modal) window.Modal.close(); } catch (_) {}

  showDashboardToast(deleted ? 'Project deleted successfully' : 'Gagal menghapus project — coba lagi');

  // Refresh project list from database (filter id terhapus HANYA bila terverifikasi)
  if (listContainer && window.FishDatabase) {
    try {
      let projects = await window.FishDatabase.getProjects();
      if (deleted) {
        projects = projects.filter(p => p && p.id !== projectId && String(p.id).trim() !== String(projectId).trim());
      }
      setAllProjectsCache(projects);
      renderProjects(getVisibleProjects(), listContainer, countBadge);
    } catch (_) {}
  }
}

/**
 * Exports project as .ofts package
 */
async function exportProjectAction(projectId, projectName) {
  showDashboardToast(`Exporting ${projectName || 'project'}...`);

  if (window.FishDatabase && typeof window.FishDatabase.exportProjectToOFTS === 'function') {
    try {
      await window.FishDatabase.exportProjectToOFTS(projectId);
      showDashboardToast('.ofts export completed');
    } catch (err) {
      console.warn('Export project error:', err);
      showDashboardToast('Failed to export .ofts file');
    }
  }
}

let dashboardToastTimer = null;

/**
 * Displays a non-intrusive dashboard toast notification
 */
function showDashboardToast(text, duration = 2400) {
  let toast = document.getElementById('dashboard-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'dashboard-toast';
    toast.className = 'dashboard-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = text;
  toast.classList.add('is-visible');

  if (dashboardToastTimer) {
    clearTimeout(dashboardToastTimer);
  }

  dashboardToastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, duration);
}

/**
 * Creates project and navigates to editor
 */
let isCreatingNewProject = false;

async function createNewProjectAction() {
  if (isCreatingNewProject) return;
  isCreatingNewProject = true;

  const createBtn = document.querySelector('#modal-new-project .modal-btn-create');
  if (createBtn) {
    createBtn.style.opacity = '0.6';
    createBtn.style.pointerEvents = 'none';
  }

  const nameInput = document.getElementById('project-input-name');
  const name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'New_Project';

  const npAspectGrid = document.getElementById('options-aspect-ratio');
  let selectedRatio = document.querySelector('#options-aspect-ratio .aspect-ratio-frame.is-selected')?.dataset.val || '16:9';
  if (window.CustomAspect && npAspectGrid) {
    const r = window.CustomAspect.resolveGrid(npAspectGrid);
    if (r.error) {
      window.CustomAspect.flagInvalidRow(npAspectGrid);
      showDashboardToast(r.error);
      isCreatingNewProject = false;
      if (createBtn) {
        createBtn.style.opacity = '';
        createBtn.style.pointerEvents = '';
      }
      return;
    }
    selectedRatio = r.aspect;
  }
  const selectedRes = document.getElementById('dropdown-resolution')?.dataset.value || '1080p';
  const selectedFps = document.getElementById('dropdown-fps')?.dataset.value || '60';
  const selectedBg = document.querySelector('#options-bgcolor .modal-color-swatch.is-selected')?.dataset.val || 'transparent';

  const projectId = 'prj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  try {
    if (window.FishDatabase && typeof window.FishDatabase.createProject === 'function') {
      await window.FishDatabase.createProject({
        id: projectId,
        name: name,
        aspectRatio: selectedRatio,
        resolution: selectedRes,
        fps: selectedFps,
        bgColor: selectedBg
      });
    }
  } catch (err) {
    console.warn('FishDatabase createProject error, using fallback:', err);
  }

  // Close modal without triggering history.back (prevents navigation abort in Safari)
  if (window.Modal) {
    window.Modal.close(false);
  }

  const query = new URLSearchParams({
    id: projectId,
    name: name,
    aspect: selectedRatio,
    resolution: selectedRes,
    fps: selectedFps,
    bg: selectedBg
  });

  window.location.href = `editor.html?${query.toString()}`;
}

/**
 * Initializes interactive option selectors for modal dialogs (Custom Dropdowns, Aspect Frames, Swatches)
 */
document.addEventListener('DOMContentLoaded', () => {
  // Custom Themed Dropdowns
  document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
    const trigger = dropdown.querySelector('.custom-dropdown-trigger');
    const label = dropdown.querySelector('.custom-dropdown-label');
    const items = dropdown.querySelectorAll('.custom-dropdown-item');

    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-dropdown.is-open').forEach(other => {
          if (other !== dropdown) other.classList.remove('is-open');
        });
        dropdown.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', dropdown.classList.contains('is-open'));
      });
    }

    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = item.dataset.val;
        dropdown.dataset.value = val;
        if (label) label.textContent = item.textContent;
        items.forEach(i => i.classList.remove('is-selected'));
        item.classList.add('is-selected');
        dropdown.classList.remove('is-open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    });
  });

  // Close custom dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown.is-open').forEach(dropdown => {
      dropdown.classList.remove('is-open');
      const trigger = dropdown.querySelector('.custom-dropdown-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  });

  // Aspect Ratio Visual Frames (+ baris input custom)
  document.querySelectorAll('.modal-aspect-grid').forEach(grid => {
    grid.addEventListener('click', (e) => {
      const frame = e.target.closest('.aspect-ratio-frame');
      if (!frame) return;
      grid.querySelectorAll('.aspect-ratio-frame').forEach(f => f.classList.remove('is-selected'));
      frame.classList.add('is-selected');
      if (window.CustomAspect) window.CustomAspect.updateCustomRow(grid);
    });
  });

  // Color Swatches
  document.querySelectorAll('.modal-color-swatches').forEach(row => {
    row.addEventListener('click', (e) => {
      const swatch = e.target.closest('.modal-color-swatch');
      if (!swatch) return;
      row.querySelectorAll('.modal-color-swatch').forEach(s => s.classList.remove('is-selected'));
      swatch.classList.add('is-selected');
    });
  });

  // Modular Settings Category Accordion Expand/Collapse (Capture phase)
  document.addEventListener('click', (e) => {
    const header = e.target.closest('.settings-category-header');
    if (!header) return;
    const category = header.closest('.settings-category');
    if (!category) return;
    const isCollapsed = category.classList.toggle('is-collapsed');
    header.setAttribute('aria-expanded', String(!isCollapsed));
  }, true);

  // Modular Drag & Drop Zones
  document.querySelectorAll('.modal-dropzone').forEach(dropzone => {
    const fileInput = dropzone.querySelector('input[type="file"]');
    const statusEl = dropzone.querySelector('.dropzone-file-status');

    dropzone.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });

    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (fileInput) fileInput.click();
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'dragend'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('is-dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleImportedFiles(e.dataTransfer.files, dropzone, statusEl);
      }
    });

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
          handleImportedFiles(fileInput.files, dropzone, statusEl);
        }
      });
    }
  });

  // Enter key support for project inputs
  const newNameInput = document.getElementById('project-input-name');
  if (newNameInput) {
    newNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createNewProjectAction();
      }
    });
  }

  const renameInput = document.getElementById('rename-input-name');
  if (renameInput) {
    renameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveRenameProjectAction();
      }
    });
  }

  const settingsInput = document.getElementById('settings-input-name');
  if (settingsInput) {
    settingsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveProjectSettingsAction();
      }
    });
  }
});

/**
 * Handles imported .ofts project file
 */
async function handleImportedFiles(files, dropzone, statusEl) {
  if (!files || files.length === 0) return;
  const file = files[0];
  if (!file || !file.name.toLowerCase().endsWith('.ofts')) {
    alert('Only .ofts files are supported');
    return;
  }

  dropzone.classList.add('has-file');
  if (statusEl) {
    statusEl.textContent = `Importing ${file.name}...`;
  }

  let importedProject = null;

  if (window.FishDatabase && typeof window.FishDatabase.importOFTSPackage === 'function') {
    try {
      importedProject = await window.FishDatabase.importOFTSPackage(file);
    } catch (e) {
      console.warn('OFTS package import error:', e);
      alert('Failed to import .ofts file');
    }
  }

  setTimeout(() => {
    if (window.Modal) window.Modal.close();
    dropzone.classList.remove('has-file');
    if (statusEl) statusEl.textContent = '';
    
    if (importedProject && importedProject.id) {
      window.location.href = `editor.html?id=${encodeURIComponent(importedProject.id)}&template=1`;
    } else {
      loadAndRender();
    }
  }, 300);
}

/**
 * Automatically displays Welcome modal on first visit unless dismissed
 */
function initWelcomeModal() {
  syncWelcomeVersionTags();
  // Node.js port: auto-popup welcome dimatikan permanen — tidak ada lagi
  // notifikasi setiap buka web. Modal tetap bisa dibuka manual via tombol Info.
}

/**
 * Closes welcome modal and saves dismissal preference if checked
 */
function closeWelcomeModal() {
  const checkbox = document.getElementById('welcome-dismiss-checkbox');
  if (checkbox && checkbox.checked) {
    try {
      localStorage.setItem('oft_seen_welcome_v1', '1');
    } catch (e) {
      console.warn('[Storage] Failed to save welcome dismissal:', e);
    }
  }
  if (window.Modal) {
    window.Modal.close();
  }
}

/**
 * Opens donate modal from inside welcome modal
 */
function openDonateFromWelcome() {
  const checkbox = document.getElementById('welcome-dismiss-checkbox');
  if (checkbox && checkbox.checked) {
    try {
      localStorage.setItem('oft_seen_welcome_v1', '1');
    } catch (e) {
      console.warn('[Storage] Failed to save welcome dismissal:', e);
    }
  }
  if (window.Modal) {
    window.Modal.open('modal-donate');
  }
}

/**
 * Toggles accordion preview for QRIS donation
 */
function toggleQrisDisplay() {
  const content = document.getElementById('donate-qris-content');
  const arrow = document.getElementById('qris-arrow-icon');
  if (!content) return;

  const isHidden = content.style.display === 'none' || !content.style.display;
  if (isHidden) {
    content.style.display = 'flex';
    if (arrow) arrow.classList.add('is-open');
  } else {
    content.style.display = 'none';
    if (arrow) arrow.classList.remove('is-open');
  }
}

/* ==========================================================================
   Setting Utama: mode tampilan + warna tema.
   Mode disimpan di denjimotion_theme; warna di denjimotion_color_theme.
   Keduanya berlaku di dasbor dan editor via snippet pra-render di <head>.
   ========================================================================== */
const APP_THEME_KEY = 'denjimotion_theme';
const APP_THEME_KEY_LEGACY = 'fishtool_theme'; // fallback baca sekali (era FishTool)
const APP_COLOR_THEME_KEY = 'denjimotion_color_theme';
const APP_COLOR_THEME_KEY_LEGACY = 'fishtool_color_theme';
const APP_CUSTOM_COLOR_KEY = 'denjimotion_custom_color';
const APP_CUSTOM_COLOR_KEY_LEGACY = 'fishtool_custom_color';
const APP_COLOR_THEMES = new Set(['maroon', 'cyber-cyan', 'amber-terminal', 'custom']);

const CUSTOM_THEME_VARIABLES = [
  '--custom-theme-color',
  '--color-primary', '--color-primary-hover', '--color-primary-active', '--color-accent', '--color-accent-subtle',
  '--bg-canvas', '--bg-dashboard', '--bg-panel', '--bg-panel-hover', '--bg-panel-active', '--bg-panel-inner', '--bg-panel-inner-hover',
  '--badge-prealpha-bg', '--badge-prealpha-text', '--badge-count-bg', '--badge-count-text',
  '--track-video', '--track-video-dark', '--track-image', '--track-image-dark', '--track-audio', '--track-audio-dark',
  '--track-adj', '--track-adj-dark', '--track-color', '--track-color-dark', '--track-text', '--track-text-dark',
  '--grid-line-thin', '--grid-line-major', '--grid-crosshair', '--grid-dot',
  '--text-primary', '--text-secondary', '--text-muted', '--text-dim',
  '--border-panel', '--border-subtle', '--border-focus',
  '--kf-default-bg', '--kf-default-border', '--kf-active-bg', '--kf-active-border',
  '--kf-selected-bg', '--kf-selected-border', '--kf-selected-dot'
];

function getAppTheme() {
  try {
    const v = window.localStorage ? (localStorage.getItem(APP_THEME_KEY) || localStorage.getItem(APP_THEME_KEY_LEGACY)) : null;
    return v === 'light' ? 'light' : 'dark';
  } catch (_) {
    return 'dark';
  }
}

function normalizeHexColor(value) {
  const raw = String(value || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return '#' + raw.split('').map(ch => ch + ch).join('').toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return '#' + raw.toLowerCase();
  return null;
}

function getAppCustomColor() {
  try {
    if (!window.localStorage) return '#c23b3b';
    const customStored = localStorage.getItem(APP_CUSTOM_COLOR_KEY) || localStorage.getItem(APP_CUSTOM_COLOR_KEY_LEGACY);
    const themeStored = localStorage.getItem(APP_COLOR_THEME_KEY) || localStorage.getItem(APP_COLOR_THEME_KEY_LEGACY);
    return normalizeHexColor(customStored) || normalizeHexColor(themeStored) || '#c23b3b';
  } catch (_) {
    return '#c23b3b';
  }
}

function getAppColorTheme() {
  try {
    const stored = window.localStorage
      ? (localStorage.getItem(APP_COLOR_THEME_KEY) || localStorage.getItem(APP_COLOR_THEME_KEY_LEGACY))
      : null;
    if (stored === 'custom' || normalizeHexColor(stored)) return 'custom';
    return APP_COLOR_THEMES.has(stored) ? stored : 'maroon';
  } catch (_) {
    return 'maroon';
  }
}

function clampThemeValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHslColor(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  const delta = max - min;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return { h: hue, s: saturation * 100, l: lightness * 100 };
}

function hslThemeColor(h, s, l) {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function rgbFromHexColor(hex) {
  const normalized = normalizeHexColor(hex) || '#c23b3b';
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16)
  };
}

function getCustomThemeVariables(hex, mode) {
  const rgb = rgbFromHexColor(hex);
  const hsl = rgbToHslColor(rgb.r, rgb.g, rgb.b);
  const isLight = mode === 'light';
  const accentS = clampThemeValue(hsl.s, 35, 92);
  const accentL = isLight
    ? clampThemeValue(hsl.l, 28, 48)
    : clampThemeValue(hsl.l, 48, 70);
  const surfaceS = clampThemeValue(Math.max(hsl.s * 0.34, 8), 8, 32);
  const alpha = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, `;
  const primary = hslThemeColor(hsl.h, accentS, accentL);
  const hover = hslThemeColor(hsl.h, accentS, clampThemeValue(accentL + (isLight ? 10 : 12), 0, 92));
  const active = hslThemeColor(hsl.h, accentS, clampThemeValue(accentL - (isLight ? 10 : 14), 8, 85));
  const subtle = hslThemeColor(hsl.h, clampThemeValue(accentS * 0.72, 20, 78), isLight ? 82 : 28);
  const surface = (lightness) => hslThemeColor(hsl.h, surfaceS, lightness);

  const vars = {
    '--custom-theme-color': normalizeHexColor(hex) || '#c23b3b',
    '--color-primary': primary,
    '--color-primary-hover': hover,
    '--color-primary-active': active,
    '--color-accent': active,
    '--color-accent-subtle': subtle,
    '--bg-canvas': surface(isLight ? 94 : 5),
    '--bg-dashboard': surface(isLight ? 98 : 8),
    '--bg-panel': isLight ? '#ffffff' : surface(13),
    '--bg-panel-hover': surface(isLight ? 91 : 17),
    '--bg-panel-active': surface(isLight ? 87 : 10),
    '--bg-panel-inner': surface(isLight ? 97 : 9),
    '--bg-panel-inner-hover': surface(isLight ? 91 : 17),
    '--badge-prealpha-bg': surface(isLight ? 91 : 17),
    '--badge-prealpha-text': primary,
    '--badge-count-bg': primary,
    '--badge-count-text': isLight ? '#ffffff' : surface(5),
    '--track-video': primary,
    '--track-video-dark': subtle,
    '--track-image': hover,
    '--track-image-dark': subtle,
    '--track-audio': hslThemeColor(hsl.h, clampThemeValue(accentS - 8, 25, 90), isLight ? 44 : 68),
    '--track-audio-dark': hslThemeColor(hsl.h, clampThemeValue(accentS - 15, 18, 75), isLight ? 72 : 35),
    '--track-adj': active,
    '--track-adj-dark': surface(isLight ? 78 : 23),
    '--track-color': hover,
    '--track-color-dark': surface(isLight ? 80 : 26),
    '--track-text': primary,
    '--track-text-dark': subtle,
    '--grid-line-thin': `${alpha}0.18)`,
    '--grid-line-major': `${alpha}0.45)`,
    '--grid-crosshair': hover,
    '--grid-dot': `${alpha}0.55)`,
    '--text-primary': primary,
    '--text-secondary': hover,
    '--text-muted': isLight ? surface(38) : surface(64),
    '--text-dim': isLight ? surface(58) : surface(38),
    '--border-panel': surface(isLight ? 80 : 25),
    '--border-subtle': `${alpha}0.22)`,
    '--border-focus': primary,
    '--kf-default-bg': surface(isLight ? 98 : 8),
    '--kf-default-border': isLight ? surface(38) : surface(64),
    '--kf-active-bg': primary,
    '--kf-active-border': isLight ? surface(24) : surface(5),
    '--kf-selected-bg': '#ffffff',
    '--kf-selected-border': isLight ? surface(24) : surface(5),
    '--kf-selected-dot': primary
  };
  return vars;
}

function clearCustomThemeVariables() {
  const root = document.documentElement;
  CUSTOM_THEME_VARIABLES.forEach((name) => root.style.removeProperty(name));
}

function applyAppColorTheme() {
  const root = document.documentElement;
  const theme = getAppColorTheme();
  clearCustomThemeVariables();

  if (theme === 'maroon') {
    root.removeAttribute('data-color-theme');
    return;
  }
  if (theme === 'custom') {
    root.setAttribute('data-color-theme', 'custom');
    const customColor = getAppCustomColor();
    Object.entries(getCustomThemeVariables(customColor, getAppTheme())).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });
    return;
  }
  root.setAttribute('data-color-theme', theme);
}

function syncAppThemeUI() {
  const mode = getAppTheme();
  const colorTheme = getAppColorTheme();
  const customColor = getAppCustomColor();
  document.querySelectorAll('#settings-theme-grid .theme-mode-btn').forEach((btn) => {
    btn.classList.toggle('is-selected', btn.dataset.themeVal === mode);
  });
  document.querySelectorAll('#settings-color-theme-grid .theme-color-btn').forEach((btn) => {
    btn.classList.toggle('is-selected', btn.dataset.colorThemeVal === colorTheme);
  });
  const colorInput = document.getElementById('settings-custom-color');
  if (colorInput) colorInput.value = customColor;
  const hexInput = document.getElementById('settings-custom-color-hex');
  if (hexInput) hexInput.value = customColor.toUpperCase();
  const customDot = document.getElementById('settings-custom-color-dot');
  if (customDot) customDot.style.backgroundColor = customColor;
}

function setAppTheme(mode) {
  const next = mode === 'light' ? 'light' : 'dark';
  try {
    if (window.localStorage) localStorage.setItem(APP_THEME_KEY, next);
  } catch (_) {}
  if (next === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  applyAppColorTheme();
  syncAppThemeUI();
}

function setAppColorTheme(theme) {
  const next = APP_COLOR_THEMES.has(theme) ? theme : 'maroon';
  try {
    if (window.localStorage) localStorage.setItem(APP_COLOR_THEME_KEY, next);
  } catch (_) {}
  applyAppColorTheme();
  syncAppThemeUI();
}

function setAppCustomColorTheme(value) {
  const normalized = normalizeHexColor(value);
  if (!normalized) return false;
  try {
    if (window.localStorage) {
      localStorage.setItem(APP_CUSTOM_COLOR_KEY, normalized);
      localStorage.setItem(APP_COLOR_THEME_KEY, 'custom');
    }
  } catch (_) {}
  applyAppColorTheme();
  syncAppThemeUI();
  return true;
}

function setAppCustomColorFromInput(value) {
  if (!setAppCustomColorTheme(value)) syncAppThemeUI();
}

function openAppSettingsModal() {
  syncAppThemeUI();
  // Sinkronkan dropdown Tampilan Editor dari simpanan (apabila modul ada)
  try {
    if (window.LayoutStyles && typeof window.LayoutStyles.apply === 'function') {
      window.LayoutStyles.apply();
    }
  } catch (_) {}
  if (window.Modal) window.Modal.open('modal-app-settings');
}

// Global exposes for HTML onclick handlers & module interop
window.setAppTheme = setAppTheme;
window.getAppTheme = getAppTheme;
window.setAppColorTheme = setAppColorTheme;
window.getAppColorTheme = getAppColorTheme;
window.setAppCustomColorTheme = setAppCustomColorTheme;
window.setAppCustomColorFromInput = setAppCustomColorFromInput;
window.getAppCustomColor = getAppCustomColor;
window.openAppSettingsModal = openAppSettingsModal;
window.openDeleteModal = openDeleteModal;
window.confirmDeleteProjectAction = confirmDeleteProjectAction;
window.exportProjectAction = exportProjectAction;
window.showDashboardToast = showDashboardToast;
window.openRenameModal = openRenameModal;
window.saveRenameProjectAction = saveRenameProjectAction;
window.openProjectSettingsModal = openProjectSettingsModal;
window.saveProjectSettingsAction = saveProjectSettingsAction;
window.syncWelcomeVersionTags = syncWelcomeVersionTags;
window.createNewProjectAction = createNewProjectAction;
window.closeWelcomeModal = closeWelcomeModal;
window.openDonateFromWelcome = openDonateFromWelcome;
window.toggleQrisDisplay = toggleQrisDisplay;
window.DashboardSelection = {
  isActive: isSelectionMode,
  enter: () => setSelectionMode(true),
  exit: () => setSelectionMode(false),
  toggle: toggleProjectSelected,
  selectAll: selectAllProjects,
  selected: () => [...selectedProjectIds]
};
