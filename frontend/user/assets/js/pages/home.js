const state = {
  heroIndex: 0,
  heroTouchStartX: 0,
  heroTouchDeltaX: 0,
};

let heroBanners = [];
let menuItems = [];

function shouldShowProductRating(item) {
  return false;
}

function showToast(message, actionLabel) {
  showToastMessage({
    stackId: "toastStack",
    title: "Belum ada pesanan",
    message,
    actionLabel,
    actionHref: "./all-menu.html",
    duration: 2800,
    useExistingStack: true,
  });
}

function renderHero() {
  const track = document.getElementById("heroTrack");
  const viewport = document.getElementById("heroViewport");
  const dots = document.getElementById("heroDots");

  if (!track || !dots) {
    return;
  }

  if (!heroBanners.length) {
    track.innerHTML = `
      <div class="hero-slide">
        <article class="hero-card is-placeholder">
          <div class="hero-copy">
            <h3>Belum ada banner</h3>
            <p>Tambahkan banner dari panel admin untuk menampilkan promo di sini.</p>
          </div>
        </article>
      </div>
    `;
    dots.innerHTML = "";
    return;
  }

  track.innerHTML = heroBanners.map((banner) => `
    <div class="hero-slide">
      <article class="hero-card" style="--hero-image:${escapeAttribute(banner.image)}">
        <div class="hero-copy">
          <h3>${escapeHTML(banner.title)}</h3>
          <p>${escapeHTML(banner.subtitle)}</p>
        </div>
      </article>
    </div>
  `).join("");

  dots.innerHTML = heroBanners.map((_, index) => `
    <button type="button" class="${index === state.heroIndex ? "is-active" : ""}" data-hero-dot="${index}" aria-label="Buka promo ${index + 1}"></button>
  `).join("");

  dots.querySelectorAll("[data-hero-dot]").forEach((button) => {
    button.addEventListener("click", () => scrollHeroTo(Number(button.dataset.heroDot)));
  });

  bindHeroSwipe(viewport);
  updateHeroPosition(false);
}

function scrollHeroTo(index) {
  if (index < 0 || index >= heroBanners.length) {
    return;
  }

  state.heroIndex = index;
  updateHeroPosition(true);
  paintHeroDots();
}

function updateHeroPosition(animate = true) {
  const track = document.getElementById("heroTrack");
  if (!track) {
    return;
  }

  track.classList.toggle("is-animated", animate);
  track.style.transform = `translateX(-${state.heroIndex * 100}%)`;
}

function bindHeroSwipe(viewport) {
  if (!viewport || viewport.dataset.bound === "true") {
    return;
  }

  viewport.dataset.bound = "true";

  viewport.addEventListener("touchstart", (event) => {
    state.heroTouchStartX = event.touches[0].clientX;
    state.heroTouchDeltaX = 0;
  }, { passive: true });

  viewport.addEventListener("touchmove", (event) => {
    state.heroTouchDeltaX = event.touches[0].clientX - state.heroTouchStartX;
  }, { passive: true });

  viewport.addEventListener("touchend", () => {
    finishHeroSwipe();
  });

  viewport.addEventListener("pointerdown", (event) => {
    state.heroTouchStartX = event.clientX;
    state.heroTouchDeltaX = 0;
  });

  viewport.addEventListener("pointerup", (event) => {
    state.heroTouchDeltaX = event.clientX - state.heroTouchStartX;
    finishHeroSwipe();
  });
}

function finishHeroSwipe() {
  const swipeThreshold = 48;

  if (state.heroTouchDeltaX <= -swipeThreshold) {
    scrollHeroTo(Math.min(heroBanners.length - 1, state.heroIndex + 1));
  } else if (state.heroTouchDeltaX >= swipeThreshold) {
    scrollHeroTo(Math.max(0, state.heroIndex - 1));
  } else {
    updateHeroPosition(true);
    paintHeroDots();
  }

  state.heroTouchStartX = 0;
  state.heroTouchDeltaX = 0;
}

function paintHeroDots() {
  document.querySelectorAll("[data-hero-dot]").forEach((dot) => {
    dot.classList.toggle("is-active", Number(dot.dataset.heroDot) === state.heroIndex);
  });
}

function createPopularCard(item) {
  const itemId = encodeURIComponent(item.id);
  const itemImage = escapeAttribute(item.image);
  const itemName = escapeHTML(item.name);
  const displayBadge = item.badge === "Habis" ? "Habis" : item.category;
  const escapedBadge = escapeHTML(displayBadge);
  const itemPromo = escapeHTML(item.promo);
  const showRating = shouldShowProductRating(item);

  return `
    <article class="popular-card">
      <div class="popular-media">
        <img src="${itemImage}" alt="${itemName}">
        <div class="card-badge-row">
          ${escapedBadge ? `<span class="card-badge">${escapedBadge}</span>` : "<span></span>"}
          ${itemPromo ? `<span class="card-badge">${itemPromo}</span>` : ""}
        </div>
      </div>
      <div class="popular-body">
        <h3>${itemName}</h3>
        ${showRating ? `
          <div class="rating-row">
            <span class="rating-star">&#9733;</span>
            <strong>${item.rating}</strong>
            <span>(${item.reviews})</span>
          </div>
        ` : ""}
        <div class="price-row">
          <div class="price-group">
            ${item.oldPrice ? `<span class="price-old">${formatRupiah(item.oldPrice)}</span>` : ""}
            <span class="price-current">${item.priceType === 'hot_ice' ? `Mulai ${formatRupiah(Math.min(item.priceHot, item.priceIce))}` : formatRupiah(item.price)}</span>
          </div>
          <a class="order-button" href="./menu.html?id=${itemId}">Pesan</a>
        </div>
      </div>
    </article>
  `;
}

function renderMenu() {
  const popularList = document.getElementById("popularList");
  const popularItems = [...menuItems]
    .filter((item) => item.isPopular)
    .slice(0, 6);

  popularList.innerHTML = popularItems.length
    ? popularItems.map(createPopularCard).join("")
    : `<article class="recommendation-card"><div class="recommendation-copy"><h3>Menu belum ditemukan</h3><div class="rating-row"><span>Coba kata kunci atau kategori lain.</span></div></div></article>`;
}

function bindStatusButton() {
  const button = document.getElementById("statusButton");
  if (!button) {
    return;
  }

  button.addEventListener("click", (event) => {
    if (getActiveOrder()) {
      return;
    }

    event.preventDefault();
    showToast("Kamu harus memesan dulu sebelum melihat status pesanan.", "Pesan Dulu");
  });
}

function mapApiMenuItem(item) {
  return {
    id: Number(item.id),
    name: item.name,
    category: item.categoryName || "Lainnya",
    rating: Number(item.rating || 0),
    reviews: Number(item.reviewsCount || 0),
    price: Number(item.price || 0),
    priceType: item.priceType || 'single',
    priceHot: Number(item.priceHot || 0),
    priceIce: Number(item.priceIce || 0),
    oldPrice: 0,
    badge: Boolean(Number(item.available) || item.available) ? "" : "Habis",
    promo: "",
    popularity: Number(item.popularityScore || 0),
    isPopular: Boolean(Number(item.isPopular) || item.isPopular),
    description: item.description || "",
    image: item.imageUrl || "",
  };
}

function mapApiBannerItem(item) {
  const imageValue = item.imageUrl
    ? `url("${item.imageUrl}")`
    : "linear-gradient(135deg, #2f4f39 0%, #9bc7a6 100%)";

  return {
    title: item.title || "Promo",
    subtitle: item.subtitle || "",
    image: imageValue,
  };
}

async function initHomePage() {
  try {
    const catalog = await fetchMenuCatalog();
    menuItems = catalog.menus
      .filter((item) => Boolean(Number(item.available) || item.available))
      .map(mapApiMenuItem);

    heroBanners = catalog.banners
      .filter((item) => Boolean(Number(item.isActive) || item.isActive))
      .map(mapApiBannerItem);
  } catch (error) {
    heroBanners = [];
    menuItems = [];
  }

  updateCartBadge();
  renderHero();
  renderMenu();
  bindStatusButton();
}
initHomePage();
