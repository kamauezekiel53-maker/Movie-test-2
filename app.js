/* =============================== MOVIE HUB UPDATED APP.JS (FIXED + COMPLETED) =============================== */

/* ----------------------------- CONFIG ----------------------------- */ const API_KEY = '7cc9abef50e4c94689f48516718607be'; const IMG_BASE = 'https://image.tmdb.org/t/p/w500'; const API_BASE = 'https://api.themoviedb.org/3'; const GIFTED_BASE = 'https://movieapi.giftedtech.co.ke/api';

/* ----------------------------- DOM ----------------------------- */ const moviesGrid = document.getElementById('moviesGrid'); const loader = document.getElementById('loader'); const searchInput = document.getElementById('searchInput'); const sectionButtons = document.querySelectorAll('.sec-btn'); const pageInfo = document.getElementById('pageInfo'); const prevBtn = document.getElementById('prevPage'); const nextBtn = document.getElementById('nextPage'); const themeToggle = document.getElementById('themeToggle'); const colorTheme = document.getElementById('colorTheme');

const modal = document.getElementById('modal'); const modalClose = document.getElementById('modalClose'); const modalPoster = document.getElementById('modalPoster'); const modalTitle = document.getElementById('modalTitle'); const modalOverview = document.getElementById('modalOverview'); const modalSub = document.getElementById('modalSub'); const modalCast = document.getElementById('modalCast'); const modalVideos = document.getElementById('modalVideos'); const modalDownload = document.getElementById('modalDownload');

/* ----------------------------- STATE ----------------------------- */ let state = { section: 'popular', page: 1, total_pages: 1, query: '', debounceTimer: null, };

/* ----------------------------- PROXY (ONLY FOR TMDB) ----------------------------- */ function proxy(url) { return https://corsproxy.io/?${encodeURIComponent(url)}; }

function qs(url) { const u = new URL(url); u.searchParams.set('api_key', API_KEY); return fetch(proxy(u.toString())).then(r => { if (!r.ok) throw new Error('Network error'); return r.json(); }); }

/* ----------------------------- UI HELPERS ----------------------------- */ function showLoader() { loader.classList.remove('hidden'); } function hideLoader() { loader.classList.add('hidden'); } function clearGrid() { moviesGrid.innerHTML = ''; } function escapeHtml(s = '') { return String(s).replaceAll('&', '&').replaceAll('<', '<').replaceAll('>', '>'); }

/* ----------------------------- TMDB ENDPOINTS ----------------------------- */ function endpointForSection(section, page = 1) { switch (section) { case 'trending': return ${API_BASE}/trending/movie/week?page=${page}; case 'now_playing': return ${API_BASE}/movie/now_playing?page=${page}; case 'top_rated': return ${API_BASE}/movie/top_rated?page=${page}; default: return ${API_BASE}/movie/popular?page=${page}; } }

/* ----------------------------- RENDER MOVIES ----------------------------- */ function renderMovies(list) { clearGrid();

if (!list || list.length === 0) { moviesGrid.innerHTML = '<p class="muted">No results found.</p>'; return; }

list.forEach(m => { const card = document.createElement('div'); card.className = 'card'; card.dataset.id = m.id;

const poster = m.poster_path ? IMG_BASE + m.poster_path : '';

card.innerHTML = `
  <div class="poster">
    ${poster ? `<img src="${poster}" alt="${escapeHtml(m.title)}">`
    : '<div style="padding:18px;color:var(--muted)">No Image</div>'}
  </div>
  <div class="card-body">
    <div class="title-row">
      <h3>${escapeHtml(m.title)}</h3>
      <span class="badge">⭐ ${m.vote_average ? m.vote_average.toFixed(1) : '—'}</span>
    </div>
    <div style="font-size:13px;color:var(--muted)">
      ${m.release_date ? m.release_date.slice(0,4) : '—'}
    </div>
  </div>
`;

moviesGrid.appendChild(card);

}); }

/* ----------------------------- LOAD SECTION ----------------------------- */ async function loadSection(section = state.section, page = state.page) { try { showLoader(); const url = endpointForSection(section, page); const data = await qs(url); renderMovies(data.results); state.total_pages = data.total_pages || 1; pageInfo.textContent = Page ${state.page} of ${state.total_pages}; prevBtn.disabled = state.page <= 1; nextBtn.disabled = state.page >= state.total_pages; } catch (e) { moviesGrid.innerHTML = '<p class="muted">Failed to load movies.</p>'; } finally { hideLoader(); } }

/* ----------------------------- GIFTED SEARCH ----------------------------- */ async function giftedSearch(title) { try { const url = ${GIFTED_BASE}/search?query=${encodeURIComponent(title)}; const res = await fetch(url); if (!res.ok) return null; const data = await res.json(); if (!data.results || data.results.length === 0) return null; return data.results[0].id; } catch (e) { return null; } }

async function giftedSources(id) { try { const res = await fetch(${GIFTED_BASE}/sources/${id}); if (!res.ok) return { items: [], subtitles: [] }; const data = await res.json(); return { items: data.results || data.items || [], subtitles: data.subtitles || [] }; } catch (e) { return { items: [], subtitles: [] }; } }

/* ----------------------------- MODAL — MOVIE DETAILS ----------------------------- */ async function openModal(movieId) { try { modal.classList.remove('hidden'); document.body.style.overflow = 'hidden';

modalPoster.src = '';
modalTitle.textContent = 'Loading...';
modalOverview.textContent = '';
modalCast.innerHTML = '';
modalVideos.innerHTML = '';
modalDownload.innerHTML = '';

const data = await qs(`${API_BASE}/movie/${movieId}?append_to_response=videos,credits`);

modalPoster.src = data.poster_path ? IMG_BASE + data.poster_path : '';
modalTitle.textContent = data.title || 'Untitled';
modalSub.textContent = `${data.release_date ?? ''} • ${data.runtime ? data.runtime + ' min' : ''}`;
modalOverview.textContent = data.overview || 'No description available.';

modalCast.innerHTML = data.credits?.cast?.slice(0, 8).map(c => `
  <div>
    <img src="${c.profile_path ? IMG_BASE + c.profile_path : ''}" style="width:100%;border-radius:6px">
    <small>${c.name}</small>
  </div>
`).join('');

const vids = data.videos?.results?.filter(v => v.type === 'Trailer' && v.site === 'YouTube') || [];
modalVideos.innerHTML = vids.length
  ? vids.map(v => `<iframe src="https://www.youtube.com/embed/${v.key}" allowfullscreen></iframe>`).join('')
  : '<p class="muted">No trailers available.</p>';

await loadDownloadLinks(data.title);

} catch (e) { modalOverview.textContent = 'Failed to load details.'; } }

/* ----------------------------- DOWNLOAD LINKS ----------------------------- */ async function loadDownloadLinks(title) { try { modalDownload.innerHTML = '<p class="muted">Loading download links...</p>';

const giftedId = await giftedSearch(title);
if (!giftedId) {
  modalDownload.innerHTML = '<p class="muted">No download links found.</p>';
  return;
}

const { items, subtitles } = await giftedSources(giftedId);
if (!items || items.length === 0) {
  modalDownload.innerHTML = '<p class="muted">No links available.</p>';
  return;
}

modalDownload.innerHTML = items.map(it => {
  const quality = it.quality || it.q || 'Link';
  const size = it.size ? formatBytes(Number(it.size)) : 'Unknown';
  const download = it.download_url || it.download || it.url || '#';
  const stream = it.stream_url || null;

  return `
    <div style="margin-bottom:10px">
      <strong style="color:var(--accent)">${escapeHtml(quality)}</strong><br>
      <a class="btn" href="${download}" target="_blank">Download (${escapeHtml(size)})</a>
      ${stream ? `<a class="btn" href="${stream}" target="_blank" style="margin-left:8px;background:transparent;border:1px solid rgba(255,255,255,0.06)">Stream</a>` : ''}
    </div>
  `;
}).join('');

if (subtitles && subtitles.length) {
  modalDownload.innerHTML += `
    <div style="margin-top:8px">
      <strong>Subtitles:</strong><br>
      ${subtitles.map(s => `<div style="font-size:13px">${escapeHtml(s.lanName || s.lan || 'Subtitle')} — <a href="${s.url}" target="_blank">Download</a></div>`).join('')}
    </div>`;
}

} catch (e) { modalDownload.innerHTML = '<p class="muted">Failed to load links.</p>'; } }

/* ----------------------------- UTILITIES ----------------------------- */ function formatBytes(bytes) { if (!bytes || isNaN(bytes)) return 'Unknown'; const kb = 1024; if (bytes < kb) return bytes + ' B'; if (bytes < kb * kb) return (bytes / kb).toFixed(1) + ' KB'; if (bytes < kb * kb * kb) return (bytes / (kb * kb)).toFixed(1) + ' MB'; return (bytes / (kb * kb * kb)).toFixed(1) + ' GB'; }

/* ----------------------------- EVENTS ----------------------------- */ moviesGrid.addEventListener('click', e => { const card = e.target.closest('.card'); if (card) openModal(card.dataset.id); });

modalClose.addEventListener('click', () => { modal.classList.add('hidden'); document.body.style.overflow = ''; });

modal.addEventListener('click', e => { if (e.target === modal) { modal.classList.add('hidden'); document.body.style.overflow = ''; } });

/* SECTION BUTTONS */ sectionButtons.forEach(btn => { btn.addEventListener('click', () => { state.section = btn.dataset.section; state.page = 1; loadSection(); }); });

/* PAGINATION */ prevBtn.addEventListener('click', () => { if (state.page > 1) { state.page--; loadSection(); } });

nextBtn.addEventListener('click', () => { if (state.page < state.total_pages) { state.page++; loadSection(); } });

/* SEARCH */ searchInput.addEventListener('input', () => { clearTimeout(state.debounceTimer); state.debounceTimer = setTimeout(() => { const q = searchInput.value.trim();

if (!q) {
  state.query = '';
  loadSection();
  return;
}

state.query = q;
doSearch(q);

}, 400); });

async function doSearch(query) { try { showLoader(); const url = ${API_BASE}/search/movie?query=${encodeURIComponent(query)}; const data = await qs(url); renderMovies(data.results); } catch (e) { moviesGrid.innerHTML = '<p class="muted">Search failed.</p>'; } finally { hideLoader(); } }

/* INITIAL LOAD */ loadSection();