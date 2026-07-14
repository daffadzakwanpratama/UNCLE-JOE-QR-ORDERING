/**
 * HALAMAN UTAMA (home.js) - Klien / Frontend
 * -------------------------------------------------------------
 * Tugas utama:
 * 1. Mengambil data catalog menu dan banner dari server (API).
 * 2. Menampilkan banner promo berputar (carousel/hero banner) di bagian atas.
 * 3. Menampilkan menu terpopuler / unggulan (isPopular = true) sebanyak maks 6 item.
 * 4. Mengarahkan pengguna ke halaman detail menu atau keranjang belanja.
 */

// State untuk menyimpan posisi slide banner/carousel (indeks aktif, koordinat usap/touch)
const state = {
  heroIndex: 0,         // Menunjukkan slide banner ke-berapa yang sedang tampil (dimulai dari 0)
  heroTouchStartX: 0,   // Koordinat X awal saat layar mulai disentuh (untuk fitur geser banner)
  heroTouchDeltaX: 0,   // Selisih jarak geser jari di layar
};

// Variabel penampung data yang didapat dari server API
let heroBanners = [];   // Menyimpan daftar banner promo
let menuItems = [];     // Menyimpan daftar menu makanan/minuman

/**
 * Menampilkan pesan popup kecil (Toast) di layar bawah.
 * Digunakan jika user menekan tombol status pesanan namun keranjang/pesanan masih kosong.
 */
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

/**
 * Merender (menggambar) slide banner / carousel promo ke HTML.
 * Menggunakan element 'heroTrack' untuk slide gambar dan 'heroDots' untuk titik navigasi bawah.
 */
function renderHero() {
  const track = document.getElementById("heroTrack");
  const viewport = document.getElementById("heroViewport");
  const dots = document.getElementById("heroDots");

  if (!track || !dots) {
    return;
  }

  // Jika tidak ada data banner dari admin panel, tampilkan pesan placeholder bawaan
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

  // Isi slide banner dengan gambar, judul, dan sub-judul dari database
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

  // Buat tombol indikator titik (dots) di bawah banner sesuai jumlah banner yang ada
  dots.innerHTML = heroBanners.map((_, index) => `
    <button type="button" class="${index === state.heroIndex ? "is-active" : ""}" data-hero-dot="${index}" aria-label="Buka promo ${index + 1}"></button>
  `).join("");

  // Berikan efek klik pada setiap titik navigasi untuk menggeser banner ke halaman tersebut
  dots.querySelectorAll("[data-hero-dot]").forEach((button) => {
    button.addEventListener("click", () => scrollHeroTo(Number(button.dataset.heroDot)));
  });

  // Hubungkan event sentuhan / geser layar (swipe) agar banner bisa digeser menggunakan jari
  bindHeroSwipe(viewport);
  updateHeroPosition(false);
}

/**
 * Menggeser tampilan carousel banner ke indeks slide tertentu (0, 1, 2...)
 */
function scrollHeroTo(index) {
  if (index < 0 || index >= heroBanners.length) {
    return; // Cegah geser jika melebihi batas jumlah banner
  }

  state.heroIndex = index;
  updateHeroPosition(true); // Geser dengan animasi transisi halus
  paintHeroDots();          // Perbarui indikator titik aktif di bawahnya
}

/**
 * Mengubah posisi CSS transform (translateX) pada track banner untuk memberikan efek pergeseran.
 */
function updateHeroPosition(animate = true) {
  const track = document.getElementById("heroTrack");
  if (!track) {
    return;
  }

  track.classList.toggle("is-animated", animate);
  track.style.transform = `translateX(-${state.heroIndex * 100}%)`;
}

/**
 * Mengatur event handler untuk mendeteksi gesekan jari (touch/swipe) pada perangkat mobile.
 */
function bindHeroSwipe(viewport) {
  if (!viewport || viewport.dataset.bound === "true") {
    return;
  }

  viewport.dataset.bound = "true"; // Tandai agar event listener tidak dipasang berulang kali

  // Saat jari pertama kali menyentuh layar
  viewport.addEventListener("touchstart", (event) => {
    state.heroTouchStartX = event.touches[0].clientX;
    state.heroTouchDeltaX = 0;
  }, { passive: true });

  // Saat jari digeser di layar
  viewport.addEventListener("touchmove", (event) => {
    state.heroTouchDeltaX = event.touches[0].clientX - state.heroTouchStartX;
  }, { passive: true });

  // Saat jari diangkat dari layar
  viewport.addEventListener("touchend", () => {
    finishHeroSwipe();
  });

  // Untuk perangkat desktop (menggunakan mouse/pointer)
  viewport.addEventListener("pointerdown", (event) => {
    state.heroTouchStartX = event.clientX;
    state.heroTouchDeltaX = 0;
  });

  viewport.addEventListener("pointerup", (event) => {
    state.heroTouchDeltaX = event.clientX - state.heroTouchStartX;
    finishHeroSwipe();
  });
}

/**
 * Menghitung dan memutuskan apakah gesekan layar cukup kuat untuk berpindah ke slide berikutnya.
 */
function finishHeroSwipe() {
  const swipeThreshold = 48; // Jarak minimal dalam pixel untuk dianggap melakukan gesekan/swipe

  if (state.heroTouchDeltaX <= -swipeThreshold) {
    // Geser ke kanan (slide berikutnya)
    scrollHeroTo(Math.min(heroBanners.length - 1, state.heroIndex + 1));
  } else if (state.heroTouchDeltaX >= swipeThreshold) {
    // Geser ke kiri (slide sebelumnya)
    scrollHeroTo(Math.max(0, state.heroIndex - 1));
  } else {
    // Geser tidak cukup jauh, kembalikan banner ke posisi semula
    updateHeroPosition(true);
    paintHeroDots();
  }

  // Reset koordinat sentuhan
  state.heroTouchStartX = 0;
  state.heroTouchDeltaX = 0;
}

/**
 * Memperbarui kelas warna pada indikator titik aktif (dots) di bawah banner.
 */
function paintHeroDots() {
  document.querySelectorAll("[data-hero-dot]").forEach((dot) => {
    dot.classList.toggle("is-active", Number(dot.dataset.heroDot) === state.heroIndex);
  });
}

/**
 * Membuat struktur kartu HTML (Card) untuk menu unggulan terpopuler.
 */
function createPopularCard(item) {
  const itemId = encodeURIComponent(item.id);
  const itemImage = escapeAttribute(item.image);
  const itemName = escapeHTML(item.name);
  const displayBadge = item.badge === "Habis" ? "Habis" : item.category;
  const escapedBadge = escapeHTML(displayBadge);
  const itemPromo = escapeHTML(item.promo);

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

/**
 * Memfilter menu yang ditandai sebagai 'isPopular' oleh Admin dan menggambarnya di beranda.
 */
function renderMenu() {
  const popularList = document.getElementById("popularList");
  
  // Ambil menu yang populer dan ambil maksimal 6 item saja
  const popularItems = [...menuItems]
    .filter((item) => item.isPopular)
    .slice(0, 6);

  popularList.innerHTML = popularItems.length
    ? popularItems.map(createPopularCard).join("")
    : `<article class="recommendation-card"><div class="recommendation-copy"><h3>Menu belum ditemukan</h3><div class="rating-row"><span>Coba kata kunci atau kategori lain.</span></div></div></article>`;
}

/**
 * Menghubungkan tombol "Lihat Status Pesanan" di pojok navigasi.
 * Jika belum ada transaksi aktif di browser, user akan dipaksa memesan menu terlebih dahulu.
 */
function bindStatusButton() {
  const button = document.getElementById("statusButton");
  if (!button) {
    return;
  }

  button.addEventListener("click", (event) => {
    if (getActiveOrder()) {
      return; // Izinkan masuk ke halaman status jika ada pesanan aktif
    }

    event.preventDefault(); // Cegah masuk halaman status
    showToast("Kamu harus memesan dulu sebelum melihat status pesanan.", "Pesan Dulu");
  });
}

/**
 * Mengubah format objek menu mentah dari API database (snake_case)
 * ke format camelCase yang digunakan oleh halaman frontend ini.
 */
function mapApiMenuItem(item) {
  return {
    id: Number(item.id),
    name: item.name,
    category: item.categoryName || "Lainnya",
    price: Number(item.price || 0),
    priceType: item.priceType || 'single',
    priceHot: Number(item.priceHot || 0),
    priceIce: Number(item.priceIce || 0),
    oldPrice: 0,
    badge: Boolean(Number(item.available) || item.available) ? "" : "Habis",
    promo: "",
    isPopular: Boolean(Number(item.isPopular) || item.isPopular),
    description: item.description || "",
    image: item.imageUrl || "",
  };
}

/**
 * Mengubah format banner mentah dari database untuk siap ditampilkan di latar belakang carousel.
 */
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

/**
 * FUNGSI INISIALISASI UTAMA
 * Dijalankan otomatis saat browser selesai memuat file javascript ini.
 */
async function initHomePage() {
  try {
    // 1. Ambil katalog menu dan banner dari backend API
    const catalog = await fetchMenuCatalog();
    
    // 2. Petakan data menu yang berstatus tersedia (available = true)
    menuItems = catalog.menus
      .filter((item) => Boolean(Number(item.available) || item.available))
      .map(mapApiMenuItem);

    // 3. Petakan data banner promo yang berstatus aktif (isActive = true)
    heroBanners = catalog.banners
      .filter((item) => Boolean(Number(item.isActive) || item.isActive))
      .map(mapApiBannerItem);
  } catch (error) {
    // Jika API gagal atau offline, gunakan array kosong agar website tidak macet (crash)
    heroBanners = [];
    menuItems = [];
  }

  // 4. Render elemen halaman beranda ke layar
  updateCartBadge();       // Tampilkan jumlah item di keranjang belanja (badge merah)
  renderHero();            // Gambar banner promo
  renderMenu();            // Gambar daftar menu populer
  bindStatusButton();      // Hubungkan tombol cek status
}

// Jalankan fungsi inisialisasi di atas
initHomePage();
