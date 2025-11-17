/* MovieHub — GiftedTech only
   Search -> getById -> stream / downloads / subtitles
*/

const GIFT_SEARCH = 'https://movieapi.giftedtech.co.ke/api/search?query=';
const GIFT_GET = 'https://movieapi.giftedtech.co.ke/api/getById?id=';

const resultsGrid = document.getElementById('resultsGrid');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalPoster = document.getElementById('modalPoster');
const modalTitle = document.getElementById('modalTitle');
const modalYear = document.getElementById('modalYear');
const playerWrap = document.getElementById('playerWrap');
const downloadList = document.getElementById('downloadList');
const subtitleList = document.getElementById('subtitleList');
const openInNewTab = document.getElementById('openInNewTab');

let state = { query: '', page: 1, perPage: 20, lastResults: [] };

/* helpers */
function showLoader(){ loader.classList.remove('hidden'); }
function hideLoader(){ loader.classList.add('hidden'); }

function safeText(s){ return String(s ?? '').trim(); }

function renderResults(list){
  resultsGrid.innerHTML = '';
  if(!list || list.length === 0){
    resultsGrid.innerHTML = `<p class="muted">No results found.</p>`;
    return;
  }
  list.forEach(item=>{
    // GiftedTech search item commonly contains { title, poster, year, movieid }
    const title = safeText(item.title || item.name || '');
    const poster = safeText(item.poster || item.image || '');
    const year = safeText(item.year || item.y || '');
    const id = safeText(item.movieid || item.id || item._id);
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = id;
    el.innerHTML = `
      <img src="${poster}" alt="${title}">
      <div class="title">${title}</div>
      <div class="meta muted">${year}</div>
    `;
    el.addEventListener('click', ()=> showDetails(id));
    resultsGrid.appendChild(el);
  });
}

/* search -> Gift search endpoint */
async function doSearch(query){
  try{
    showLoader();
    const res = await fetch(GIFT_SEARCH + encodeURIComponent(query));
    const j = await res.json();
    // some API variants return results in j.results or j.data
    const results = j.results || j.data || (Array.isArray(j) ? j : []);
    state.lastResults = results;
    state.page = 1;
    renderResults(results.slice(0, state.perPage));
    pageInfo.textContent = `Showing ${Math.min(results.length, state.perPage)} of ${results.length}`;
  }catch(e){
    console.error(e);
    resultsGrid.innerHTML = `<p class="muted">Search failed.</p>`;
  }finally{ hideLoader(); }
}

/* details -> getById */
async function showDetails(movieId){
  if(!movieId){
    alert('Missing id');
    return;
  }

  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';

  // reset UI
  modalPoster.src = '';
  modalTitle.textContent = 'Loading...';
  modalYear.textContent = '';
  playerWrap.innerHTML = 'Loading stream...';
  downloadList.innerHTML = 'Loading links...';
  subtitleList.innerHTML = 'Loading subtitles...';
  openInNewTab.href = '#';

  try{
    const r = await fetch(GIFT_GET + encodeURIComponent(movieId));
    const j = await r.json();

    // GiftedTech getById structure: contains results[] (sources) and subtitles[]
    // Some variants use fields: sources, results, tracks, etc. We handle a few possibilities.
    const sources = j.results || j.sources || j.data || [];
    const subs = j.subtitles || j.subs || [];

    // If the search result had poster/title, try show it (lookup in lastResults)
    const sr = state.lastResults.find(x => (x.movieid || x.id || x._id) == movieId);
    if(sr){
      modalPoster.src = sr.poster || sr.image || '';
      modalTitle.textContent = sr.title || sr.name || '';
      modalYear.textContent = sr.year || '';
    } else {
      modalPoster.src = j.poster || '';
      modalTitle.textContent = j.title || j.name || ('Movie ' + movieId);
      modalYear.textContent = j.year || '';
    }

    // normalize sources: earlier samples used objects with quality, download_url, stream_url, size
    const normalized = (sources || []).map(s => ({
      quality: s.quality || s.q || s.label || 'Link',
      download_url: s.download_url || s.download || s.url || s.link,
      stream_url: s.stream_url || s.stream || s.url || s.link,
      size: s.size || s.filesize || s.size_bytes || s.bytes,
      raw: s
    })).filter(x => x.download_url || x.stream_url);

    if(normalized.length === 0){
      playerWrap.innerHTML = '<p class="muted">No streams available.</p>';
      downloadList.innerHTML = '<p class="muted">No downloads available.</p>';
      subtitleList.innerHTML = '<p class="muted">No subtitles available.</p>';
      openInNewTab.href = '#';
      return;
    }

    // pick best stream: prefer 1080p, 720p, else first
    const best = normalized.find(s => (s.quality||'').includes('1080')) ||
                 normalized.find(s => (s.quality||'').includes('720')) ||
                 normalized[0];

    // build HTML5 video player; attempt to attach subtitles as <track>
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.style.width = '100%';
    video.style.borderRadius = '8px';
    video.setAttribute('playsinline', '');
    const src = document.createElement('source');
    src.src = best.stream_url || best.download_url;
    // no reliable type info — assume mp4
    src.type = 'video/mp4';
    video.appendChild(src);

    // attach subtitle tracks (if urls are direct .vtt/.srt; browsers prefer VTT)
    (subs || []).forEach(s => {
      if(!s.url) return;
      const tr = document.createElement('track');
      tr.kind = 'subtitles';
      tr.label = s.lanName || s.lan || 'Sub';
      tr.srclang = (s.lan && s.lan.split('_')[0]) || 'en';
      tr.src = s.url;
      video.appendChild(tr);
    });

    // handle playback error -> show fallback open link
    video.addEventListener('error', ()=> {
      playerWrap.innerHTML = `<p class="muted">Playback blocked or unsupported by this server. You can open the stream in a new tab.</p>
      <a class="btn outline" href="${best.stream_url||best.download_url}" target="_blank" rel="noopener">Open Stream</a>`;
      openInNewTab.href = best.stream_url || best.download_url || '#';
    });

    // replace playerWrap
    playerWrap.innerHTML = '';
    playerWrap.appendChild(video);
    openInNewTab.href = best.stream_url || best.download_url || '#';

    // downloads list
    downloadList.innerHTML = normalized.map(s => {
      const sizeText = s.size ? (isNaN(s.size) ? s.size : ((Number(s.size)/1024/1024).toFixed(1) + ' MB')) : 'Unknown size';
      return `<a class="btn" href="${s.download_url || s.stream_url}" target="_blank" rel="noopener">${s.quality} · ${sizeText}</a>`;
    }).join('');

    // subtitles
    subtitleList.innerHTML = (subs.length ? subs.map(sub => {
      const label = sub.lanName || sub.lan || 'Subtitle';
      return `<a class="btn outline" href="${sub.url}" target="_blank" rel="noopener">${label}</a>`;
    }).join('') : '<p class="muted">No subtitles found.</p>');

  }catch(err){
    console.error(err);
    playerWrap.innerHTML = '<p class="muted">Failed to load stream data.</p>';
    downloadList.innerHTML = '<p class="muted">Failed to load download links.</p>';
    subtitleList.innerHTML = '<p class="muted">Failed to load subtitles.</p>';
  }
}

/* modal close */
modalClose.addEventListener('click', ()=> {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
  playerWrap.innerHTML = '';
});
modal.addEventListener('click', e => { if(e.target === modal){ modal.classList.add('hidden'); document.body.style.overflow = ''; playerWrap.innerHTML = ''; } });

/* search handlers (debounced) */
let searchTimer = null;
searchInput.addEventListener('input', e => {
  const q = e.target.value.trim();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(()=> {
    if(!q) { resultsGrid.innerHTML = ''; pageInfo.textContent = ''; return; }
    doSearch(q);
  }, 300);
});
searchBtn?.addEventListener('click', ()=> {
  const q = searchInput.value.trim();
  if(q) doSearch(q);
});

async function doSearch(q){
  try{
    showLoader();
    const res = await fetch(GIFT_SEARCH + encodeURIComponent(q));
    const j = await res.json();
    const results = j.results || j.data || (Array.isArray(j) ? j : []);
    // keep results in state (for potential details)
    state.lastResults = results;
    renderResults(results);
    pageInfo.textContent = `Found ${results.length} results`;
  }catch(e){
    console.error(e);
    resultsGrid.innerHTML = '<p class="muted">Search failed.</p>';
  }finally{ hideLoader(); }
}

/* initial demo: optional popular list using "popular" keyword search */
doSearch('popular');