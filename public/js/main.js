/**
 * OpenFishTools Studio - Main JavaScript
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
    renderProjects(projects, listContainer, countBadge);
  }

  // Initial load
  await loadAndRender();

  // Listen to custom DB project update events
  window.addEventListener('fish-db-projects-updated', () => {
    loadAndRender();
  });

  // Project item left-click navigation (delegated)
  listContainer.addEventListener('click', (e) => {
    const item = e.target.closest('.project-item');
    if (!item) return;
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
 * Renders project cards inside the Your Project list with swipe actions
 */
function renderProjects(projects, container, countBadge) {
  if (countBadge) {
    countBadge.textContent = String(projects ? projects.length : 0);
    countBadge.setAttribute('title', `${projects ? projects.length : 0} Total Projects`);
  }

  if (!container) return;

  if (!projects || projects.length === 0) {
    container.innerHTML = `
      <div class="projects-empty">
        <div class="projects-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M10 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8L10 4zM12 7.2c-1.5 0-2.8 1.3-2.8 2.8h1.4c0-.8.6-1.4 1.4-1.4s1.4.6 1.4 1.4c0 .8-.6 1.4-1.3 2-.7.6-.8 1.2-.8 2.5h1.4v-.3c0-.8.4-1.3 1.1-1.9.7-.6 1-1.3 1-2.3 0-1.5-1.3-2.8-2.8-2.8zM12 17.6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
          </svg>
        </div>
        <span>No projects found in database</span>
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
          <div class="project-row-main">
            <span class="project-name">${escapeHtml(name)}</span>
            <span class="project-size" data-project-size-id="${escapeHtml(project.id)}">${escapeHtml(size)}</span>
          </div>
          <div class="project-row-sub">
            <span class="project-saved">${escapeHtml(savedTime)}</span>
            <span class="project-specs">${specs}</span>
          </div>
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
 * Legacy compatibility wrappers
 */
function openRenameModal(projectId, currentName) {
  openProjectSettingsModal(projectId);
}

async function saveRenameProjectAction() {
  await saveProjectSettingsAction();
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
      renderProjects(projects, listContainer, countBadge);
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
      renderProjects(projects, listContainer, countBadge);
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

// Global exposes for HTML onclick handlers & module interop
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
