/**
 * HALAMAN PENCARIAN & DETAIL MENU (menu.js) - Klien / Frontend
 * -------------------------------------------------------------
 * Tugas utama:
 * 1. Mengelola pencarian menu kopi/makanan secara real-time.
 * 2. Mengatur filter menu berdasarkan kategori (Coffee, Non Coffee, dll.).
 * 3. Mengatur halaman detail menu saat user mengklik menu tertentu.
 * 4. Menyediakan pilihan varian (Hot / Ice) dan jumlah (quantity) untuk dimasukkan ke keranjang belanja.
 */

// State untuk halaman pencarian menu
const searchState = {
  activeCategory: "Semua", // Kategori pencarian yang sedang aktif
};

// State untuk halaman detail menu (ketika memilih item yang akan dipesan)
const detailState = {
  quantity: 1,  // Jumlah porsi item (default: 1)
  size: null,   // Varian ukuran/suhu (Hot / Ice)
};

// Array global penampung daftar menu dari API
let currentMenuItems = [];

/**
 * Menampilkan pesan popup sukses (Toast) setelah sukses menambahkan ke keranjang belanja.
 */
function showDetailToast(message) {
  showToastMessage({
    stackId: "detailToastStack",
    title: message,
    success: true,
    useExistingStack: true,
  });
}

/**
 * Mengambil kata kunci yang diketik user pada kolom pencarian (input id: menuSearch).
 */
function getSearchKeyword() {
  return document.getElementById("menuSearch")?.value.trim().toLowerCase() || "";
}

/**
 * Mengumpulkan semua kategori unik dari daftar menu untuk dijadikan tab filter.
 */
function getSearchCategories() {
  const categories = Array.from(new Set(
    currentMenuItems
      .map((item) => String(item.category || "").trim())
      .filter(Boolean)
  ));

  return ["Semua", ...categories]; // Gabungkan dengan tab "Semua" di awal
}

/**
 * Menggambar pil tombol kategori pencarian ke layar (Coffee, Non Coffee, Snack, dll.).
 */
function renderSearchCategories() {
  const row = document.getElementById("searchCategoryRow");
  const activeLabel = document.getElementById("activeCategoryLabel");

  if (!row) {
    return;
  }

  const categories = getSearchCategories();

  // Buat element HTML tombol pil untuk masing-masing kategori
  row.innerHTML = categories.map((category) => `
    <button
      type="button"
      class="search-category-pill ${category === searchState.activeCategory ? "is-active" : ""}"
      data-search-category="${escapeAttribute(category)}"
    >
      ${escapeHTML(category)}
    </button>
  `).join("");

  // Perbarui label teks penunjuk kategori aktif di atas daftar menu
  if (activeLabel) {
    activeLabel.textContent = searchState.activeCategory === "Semua"
      ? "Semua menu"
      : searchState.activeCategory;
  }

  // Beri event listener klik pada masing-masing pil kategori
  row.querySelectorAll("[data-search-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedCategory = button.dataset.searchCategory || "Semua";
      searchState.activeCategory = selectedCategory;
      renderSearchCategories(); // Gambar ulang tombol kategori untuk memperbarui tombol yang aktif
      renderSearchMenu();       // Saring dan gambar ulang daftar menunya
    });
  });
}

/**
 * Menyaring (filter) menu berdasarkan kategori aktif dan kata kunci pencarian.
 */
function getFilteredSearchItems() {
  const keyword = getSearchKeyword();

  return currentMenuItems
    .filter((item) => searchState.activeCategory === "Semua" || item.category === searchState.activeCategory)
    .filter((item) => {
      if (!keyword) {
        return true; // Jika tidak mengetik apa-apa, lolos saringan
      }
      // Cari kecocokan kata kunci pada Nama Menu atau Deskripsi Menu
      return item.name.toLowerCase().includes(keyword) || item.description.toLowerCase().includes(keyword);
    });
}

/**
 * Mengatur pengurutan daftar menu. 
 * Saat ini data diurutkan secara bawaan/alfabetis dari database.
 */
function sortSearchItems(items) {
  return items;
}

/**
 * Membuat kartu HTML (Card) menu untuk baris hasil pencarian.
 */
function createSearchCard(item) {
  const itemId = encodeURIComponent(item.id);
  const itemImage = escapeAttribute(item.image);
  const itemName = escapeHTML(item.name);
  const displayBadge = item.badge === "Habis" ? "Habis" : item.category;
  const escapedBadge = escapeHTML(displayBadge);
  const itemPromo = escapeHTML(item.promo);

  return `
    <article class="search-menu-card">
      <div class="search-menu-media">
        <img src="${itemImage}" alt="${itemName}" loading="lazy">
        <div class="card-badge-row search-badge-row">
          ${escapedBadge ? `<span class="card-badge">${escapedBadge}</span>` : "<span></span>"}
          ${itemPromo ? `<span class="card-badge">${itemPromo}</span>` : ""}
        </div>
      </div>
      <div class="search-menu-body">
        <div class="search-menu-copy">
          <h3>${itemName}</h3>
        </div>
        <div class="search-menu-footer">
          <span class="search-price">${item.priceType === 'hot_ice' ? `Mulai ${formatRupiah(Math.min(item.priceHot, item.priceIce))}` : formatRupiah(item.price)}</span>
          <a class="order-button search-action-button" href="./menu.html?id=${itemId}">Pesan</a>
        </div>
      </div>
    </article>
  `;
}

/**
 * Merender daftar menu hasil pencarian ke layar.
 */
function renderSearchMenu() {
  const resultCount = document.getElementById("resultCount");
  const list = document.getElementById("searchMenuList");
  if (!resultCount || !list) {
    return;
  }
  const items = sortSearchItems(getFilteredSearchItems());

  resultCount.textContent = `${items.length} menu ditemukan`;
  list.innerHTML = items.length
    ? items.map(createSearchCard).join("")
    : `<article class="search-menu-card empty-search-card"><div class="search-menu-body"><div class="search-menu-copy"><h3>Menu tidak ditemukan</h3><p>Coba gunakan kata kunci lain atau pilih kategori yang berbeda.</p></div></div></article>`;
}

/**
 * Menghubungkan input pencarian dengan fungsi penyaring agar pencarian berjalan otomatis saat mengetik.
 */
function bindSearchInput() {
  const searchInput = document.getElementById("menuSearch");
  const searchWrapper = document.querySelector("[data-search-focus]");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", renderSearchMenu);

  searchWrapper?.addEventListener("click", () => {
    searchInput.focus();
  });
}

/**
 * Membaca ID menu dari parameter URL (misal: menu.html?id=2)
 * dan mencocokkannya dengan data menu katalog.
 */
function getSelectedMenuItem() {
  const params = new URLSearchParams(window.location.search);
  const menuId = Number(params.get("id"));
  return currentMenuItems.find((item) => item.id === menuId) || currentMenuItems[0];
}

/**
 * Menghitung harga total untuk item di detail page (Harga x Quantity).
 */
function getDetailPrice(item) {
  if (item.priceType === 'hot_ice') {
    if (detailState.size === 'Hot') return item.priceHot * detailState.quantity;
    if (detailState.size === 'Ice') return item.priceIce * detailState.quantity;
    return 0;
  }
  return item.price * detailState.quantity;
}

/**
 * Merender halaman detail menu (Gambar besar, deskripsi lengkap, pilihan Hot/Ice, tombol tambah keranjang).
 */
function renderDetailPage() {
  const container = document.getElementById("detailPageContent");
  if (!container) {
    return;
  }

  const item = getSelectedMenuItem();
  if (!item) {
    container.innerHTML = `
      <section class="empty-status-state">
        <div class="empty-status-illustration" aria-hidden="true">&#9749;</div>
        <h2>Menu belum tersedia</h2>
        <p>Tambahkan menu dari database agar detail bisa ditampilkan.</p>
        <a class="order-button empty-status-action" href="./all-menu.html">Kembali ke daftar menu</a>
      </section>
    `;
    return;
  }

  const itemImage = escapeAttribute(item.image);
  const itemName = escapeHTML(item.name);
  const itemDescription = escapeHTML(item.description);

  let priceText = '';
  if (item.priceType === 'hot_ice') {
    if (detailState.size === 'Hot') {
      priceText = formatRupiah(item.priceHot);
    } else if (detailState.size === 'Ice') {
      priceText = formatRupiah(item.priceIce);
    } else {
      priceText = `${formatRupiah(item.priceHot)} - ${formatRupiah(item.priceIce)}`;
    }
  } else {
    priceText = formatRupiah(item.price || 0);
  }

  let optionsPanelHtml = '';
  // Jika menu memiliki tipe harga varian (hot_ice), buat tombol pilihan Hot / Ice
  if (item.priceType === 'hot_ice') {
    optionsPanelHtml += `
      <div class="detail-option-group">
        <h3>Pilih Varian</h3>
        <div class="size-grid">
          <button type="button" class="size-chip ${detailState.size === "Hot" ? "is-active" : ""}" data-size="Hot">Hot</button>
          <button type="button" class="size-chip ${detailState.size === "Ice" ? "is-active" : ""}" data-size="Ice">Ice</button>
        </div>
      </div>
    `;
  }

  optionsPanelHtml += `
    <div class="detail-option-group">
      <h3>Jumlah</h3>
      <div class="quantity-row">
        <button type="button" class="quantity-button" id="decreaseQty">&#8722;</button>
        <strong class="quantity-value" id="quantityValue">${detailState.quantity}</strong>
        <button type="button" class="quantity-button" id="increaseQty">+</button>
      </div>
    </div>

    <div class="detail-option-group">
      <h3>Catatan Khusus (Opsional)</h3>
      <textarea class="detail-note-box" id="detailNote" placeholder="Contoh: Gula setengah, tanpa es..."></textarea>
    </div>
  `;

  const dynamicDetailPrice = getDetailPrice(item);
  const priceTextButton = dynamicDetailPrice > 0 
    ? ` - ${formatRupiah(dynamicDetailPrice)}`
    : '';

  container.innerHTML = `
    <section class="detail-media">
      <img src="${itemImage}" alt="${itemName}">
    </section>

    <section class="detail-panel">
      <h2>${itemName}</h2>
      <p class="detail-description">${itemDescription}</p>
      <div class="detail-price-box" id="detailPriceBox">${priceText}</div>
    </section>

    <section class="detail-panel detail-options-panel">
      ${optionsPanelHtml}
    </section>

    <section class="detail-action-bar">
      <button class="detail-add-button" type="button" id="addToCartButton">
        <span>Tambah ke Keranjang${priceTextButton}</span>
      </button>
    </section>
  `;

  bindDetailActions(item); // Hubungkan tombol tambah/kurang kuantiti dan tambah keranjang
  updateCartBadge();
}

/**
 * Memperbarui teks harga dinamis di dalam tombol "Tambah ke Keranjang"
 * saat quantity bertambah/berkurang atau varian suhu dipilih.
 */
function refreshDetailActionPrice(item) {
  const button = document.getElementById("addToCartButton");
  const quantityValue = document.getElementById("quantityValue");
  const detailPriceBox = document.getElementById("detailPriceBox");
  if (!button || !quantityValue) {
    return;
  }

  quantityValue.textContent = String(detailState.quantity);

  if (detailPriceBox) {
    if (item.priceType === 'hot_ice') {
      if (detailState.size === 'Hot') {
        detailPriceBox.textContent = formatRupiah(item.priceHot);
      } else if (detailState.size === 'Ice') {
        detailPriceBox.textContent = formatRupiah(item.priceIce);
      } else {
        detailPriceBox.textContent = `${formatRupiah(item.priceHot)} - ${formatRupiah(item.priceIce)}`;
      }
    } else {
      detailPriceBox.textContent = formatRupiah(item.price);
    }
  }

  const dynamicDetailPrice = getDetailPrice(item);
  const priceTextButton = dynamicDetailPrice > 0 
    ? ` - ${formatRupiah(dynamicDetailPrice)}`
    : '';

  button.innerHTML = `
    <span>Tambah ke Keranjang${priceTextButton}</span>
  `;
}

/**
 * Menghubungkan fungsi aksi (klik varian Hot/Ice, tambah kuantiti, kurangi kuantiti, tambah keranjang)
 * ke element HTML di detail page.
 */
function bindDetailActions(item) {
  // Pilihan varian Hot / Ice
  document.querySelectorAll("[data-size]").forEach((button) => {
    button.addEventListener("click", () => {
      detailState.size = button.dataset.size;
      document.querySelectorAll("[data-size]").forEach((chip) => {
        chip.classList.toggle("is-active", chip.dataset.size === detailState.size);
      });
      refreshDetailActionPrice(item);
    });
  });

  // Tombol kurangi porsi pesanan
  document.getElementById("decreaseQty")?.addEventListener("click", () => {
    detailState.quantity = Math.max(1, detailState.quantity - 1);
    refreshDetailActionPrice(item);
  });

  // Tombol tambahkan porsi pesanan
  document.getElementById("increaseQty")?.addEventListener("click", () => {
    detailState.quantity += 1;
    refreshDetailActionPrice(item);
  });

  // Tombol klik Tambah ke Keranjang
  document.getElementById("addToCartButton")?.addEventListener("click", () => {
    // Validasi: Varian Hot/Ice harus dipilih jika menu bertipe hot_ice
    if (item.priceType === 'hot_ice' && !detailState.size) {
      showToastMessage({
        stackId: "detailToastStack",
        title: "Varian belum dipilih",
        message: "Pilih varian Hot atau Ice terlebih dahulu.",
        useExistingStack: false,
      });
      return;
    }

    const note = document.getElementById("detailNote")?.value.trim() || "";
    const cartItems = getCartItems();
    const finalPrice = item.priceType === 'hot_ice' 
      ? (detailState.size === 'Hot' ? item.priceHot : item.priceIce)
      : item.price;

    // Masukkan data pesanan ke array keranjang
    cartItems.push({
      id: item.id,
      name: item.name,
      image: item.image,
      price: finalPrice,
      qty: detailState.quantity,
      size: detailState.size || null,
      note,
    });

    // Simpan data keranjang belanja ke localStorage browser agar tidak hilang saat refresh
    saveCartItems(cartItems);
    updateCartBadge();
    showDetailToast("Berhasil ditambahkan ke keranjang!");
  });
}

/**
 * Mengubah data API database ke bentuk camelCase frontend.
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
    description: item.description || "",
    image: item.imageUrl || "",
  };
}

/**
 * INISIALISASI HALAMAN
 */
async function initMenuPage() {
  try {
    const catalog = await fetchMenuCatalog();
    currentMenuItems = catalog.menus.map(mapApiMenuItem);
  } catch (error) {
    currentMenuItems = [];
  }

  // Jika element pencarian terdeteksi di HTML, aktifkan pencarian menu
  if (document.getElementById("menuSearch")) {
    renderSearchCategories();
    renderSearchMenu();
    bindSearchInput();
    updateCartBadge();
  }

  // Jika element detail page terdeteksi di HTML, aktifkan halaman detail menu
  if (document.getElementById("detailPageContent")) {
    renderDetailPage();
  }
}

// Jalankan inisialisasi halaman
initMenuPage();
