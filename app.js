const TMDB_KEY = "7cc9abef50e4c94689f48516718607be";
let currentSection = "popular";
let currentPage = 1;
const moviesGrid = document.getElementById("moviesGrid");
const loader = document.getElementById("loader");
const searchInput = document.getElementById("searchInput");

// Modal elements
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalPoster = document.getElementById("modalPoster");
const modalOverview = document.getElementById("modalOverview");
const modalCast = document.getElementById("modalCast");
const modalVideos = document.getElementById("modalVideos");
const modalPlayerWrap = document.getElementById("modalPlayerWrap");
const modalSub = document.getElementById("modalSub");

// Close modal
document.getElementById("modalClose").onclick = () => {
  modal.classList.add("hidden");
  modalPlayerWrap.innerHTML = "";
};

// Fetch TMDB movies
async function loadMovies() {
  loader.classList.remove("hidden");
  moviesGrid.innerHTML = "";

  let url = `https://api.themoviedb.org/3/movie/${currentSection}?api_key=${TMDB_KEY}&page=${currentPage}`;

  let res = await fetch(url);
  let data = await res.json();

  data.results.forEach(m => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="https://image.tmdb.org/t/p/w500${m.poster_path}">
      <div class="card-body">${m.title}</div>
    `;
    card.onclick = () => openModal(m.id);
    moviesGrid.appendChild(card);
  });

  loader.classList.add("hidden");
}

loadMovies();

// Section buttons
document.querySelectorAll(".sec-btn").forEach(btn => {
  btn.onclick = () => {
    currentSection = btn.dataset.section;
    currentPage = 1;
    loadMovies();
  };
});

// Search
searchInput.onkeyup = async (e) => {
  if (e.key === "Enter") {
    let q = searchInput.value.trim();
    if (!q) return;

    let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${q}`;
    let res = await fetch(url);
    let data = await res.json();

    moviesGrid.innerHTML = "";
    data.results.forEach(m => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w500${m.poster_path}">
        <div class="card-body">${m.title}</div>
      `;
      card.onclick = () => openModal(m.id);
      moviesGrid.appendChild(card);
    });
  }
};

// Modal open
async function openModal(id) {
  modal.classList.remove("hidden");

  // Movie details
  let res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&append_to_response=videos,credits`);
  let m = await res.json();

  modalTitle.textContent = m.title;
  modalPoster.src = `https://image.tmdb.org/t/p/w500${m.poster_path}`;
  modalOverview.textContent = m.overview;

  // Cast
  modalCast.innerHTML = m.credits.cast.slice(0, 6).map(c => c.name).join(", ");

  // Trailer
  let yt = m.videos.results.find(v => v.type === "Trailer" && v.site === "YouTube");
  modalVideos.innerHTML = yt ?
    `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${yt.key}" frameborder="0" allowfullscreen></iframe>`
    : "No trailer available";

  // GiftedTech streaming
  loadGiftedTech(id);
}

// GiftedTech API
async function loadGiftedTech(tmdbId) {
  modalPlayerWrap.innerHTML = "Loading sources...";
  modalSub.innerHTML = "";

  try {
    let res = await fetch(`https://movieapi.giftedtech.co.ke/api/movie/${tmdbId}`);
    let data = await res.json();

    modalPlayerWrap.innerHTML = "";

    data.sources.forEach(src => {
      let btn = document.createElement("button");
      btn.className = "stream-btn";
      btn.textContent = src.quality + " Stream";
      btn.onclick = () => playStream(src.url);
      modalPlayerWrap.appendChild(btn);
    });

    data.downloads.forEach(dl => {
      let a = document.createElement("a");
      a.href = dl.url;
      a.className = "download-btn";
      a.textContent = dl.quality + " Download";
      a.target = "_blank";
      modalSub.appendChild(a);
    });
  } catch {
    modalPlayerWrap.innerHTML = "No streaming available";
  }
}

// Play video in modal
function playStream(url) {
  modalPlayerWrap.innerHTML = `
    <video width="100%" controls autoplay>
      <source src="${url}">
    </video>
  `;
}