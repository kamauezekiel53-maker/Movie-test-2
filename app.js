const GRID = document.getElementById("moviesGrid");
const LOADER = document.getElementById("loader");
const SEARCH = document.getElementById("searchInput");

const MODAL = document.getElementById("modal");
const CLOSE = document.getElementById("modalClose");

const POSTER = document.getElementById("modalPoster");
const TITLE = document.getElementById("modalTitle");
const YEAR = document.getElementById("modalYear");
const STREAM = document.getElementById("modalStream");
const DOWNLOAD = document.getElementById("modalDownload");
const SUBS = document.getElementById("modalSubs");

// Show loader
function showLoader() { LOADER.classList.remove("hidden"); }
function hideLoader() { LOADER.classList.add("hidden"); }

// Render cards
function renderMovies(list) {
    GRID.innerHTML = "";
    if (!list || list.length === 0) {
        GRID.innerHTML = "<p>No results.</p>";
        return;
    }

    list.forEach(m => {
        GRID.innerHTML += `
            <div class="card" data-id="${m.movieid}">
                <img src="${m.poster}">
                <h4>${m.title}</h4>
                <p>${m.year}</p>
            </div>
        `;
    });
}

// Search
async function searchMovies(q) {
    showLoader();
    const r = await fetch(`https://movieapi.giftedtech.co.ke/api/searchMovie?query=${encodeURIComponent(q)}`);
    const data = await r.json();
    hideLoader();
    renderMovies(data.results);
}

// Open modal
async function openMovie(id) {
    MODAL.classList.remove("hidden");

    // Fetch movie info
    const info = await fetch(`https://movieapi.giftedtech.co.ke/api/getMovie?id=${id}`).then(r => r.json());
    
    POSTER.src = info.poster;
    TITLE.textContent = info.title;
    YEAR.textContent = info.year;

    // Fetch sources
    const src = await fetch(`https://movieapi.giftedtech.co.ke/api/getSources?movieid=${id}`).then(r => r.json());

    STREAM.innerHTML = `
        <video controls width="100%" src="${src.results[0].stream_url}" style="border-radius:10px;"></video>
    `;

    DOWNLOAD.innerHTML = src.results.map(v => `
        <a class="btn" href="${v.download_url}" target="_blank">${v.quality}</a>
    `).join("");

    SUBS.innerHTML = src.subtitles.map(s => `
        <a class="btn" href="${s.url}" target="_blank">${s.lanName}</a>
    `).join("");
}

// Click movie
GRID.addEventListener("click", e => {
    const card = e.target.closest(".card");
    if (card) openMovie(card.dataset.id);
});

// Close modal
CLOSE.onclick = () => MODAL.classList.add("hidden");

// Search typing
SEARCH.oninput = () => {
    if (SEARCH.value.trim() === "") {
        GRID.innerHTML = "";
        return;
    }
    searchMovies(SEARCH.value.trim());
};