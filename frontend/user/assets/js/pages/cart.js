const cartState = {
  promoCode: getActivePromoCode(),
  promoDiscount: 0,
};

function showCartToast(message) {
  showToastMessage({
    stackId: "cartToastStack",
    title: message,
    success: true,
    duration: 2000,
  });
}

function updateCartBadges(items) {
  updateCartBadge(items);

  const title = document.getElementById("cartTitle");
  if (title) {
    title.textContent = `Keranjang (${items.length})`;
  }
}

function createCartItemCard(item, index) {
  const itemName = escapeHTML(item.name);
  const itemImage = escapeAttribute(item.image);
  const itemNote = escapeHTML(item.note);
  const itemSize = escapeHTML(item.size || "M");
  const itemQty = Math.max(1, Number(item.qty || 1));

  return `
    <article class="cart-item-card">
      <img class="cart-item-thumb" src="${itemImage}" alt="${itemName}">
      <div class="cart-item-copy">
        <div class="cart-item-head">
          <div>
            <h2>${itemName}</h2>
            <p>Size: ${itemSize}</p>
            ${itemNote ? `<span class="cart-item-note">${itemNote}</span>` : ""}
            <strong>${formatRupiah(item.price)}</strong>
          </div>
          <button class="cart-delete-button" type="button" data-delete-index="${index}" aria-label="Hapus item">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M9 7V5h6v2m-5 4v6m4-6v6M7 7l1 12h8l1-12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="cart-qty-row">
          <button class="cart-qty-button" type="button" data-qty-change="${index}" data-delta="-1">&#8722;</button>
          <strong class="cart-qty-value">${itemQty}</strong>
          <button class="cart-qty-button" type="button" data-qty-change="${index}" data-delta="1">+</button>
        </div>
      </div>
    </article>
  `;
}

function createCartSummary(items) {
  const totals = calculateOrderTotals(items, cartState.promoCode);
  cartState.promoDiscount = totals.promoDiscount;

  return `
    <section class="cart-promo-card">
      <div class="cart-promo-header">
        <span class="cart-promo-icon" aria-hidden="true">&#127991;</span>
        <strong>Kode Promo</strong>
      </div>
      <div class="cart-promo-form">
        <input id="promoInput" type="text" placeholder="Masukkan kode promo" value="${escapeAttribute(cartState.promoCode)}">
        <button class="cart-promo-button" type="button" id="applyPromoButton">Pakai</button>
      </div>
      ${totals.promoDiscount ? `<p class="cart-promo-hint">Promo aktif: ${escapeHTML(totals.promoCode)} -${formatRupiah(totals.promoDiscount)}</p>` : ""}
    </section>

    <section class="cart-summary-card">
      <div class="cart-summary-row">
        <span>Subtotal</span>
        <strong>${formatRupiah(totals.subtotal)}</strong>
      </div>
      <div class="cart-summary-row">
        <span>Biaya Layanan</span>
        <strong>${formatRupiah(totals.serviceFee)}</strong>
      </div>
      <div class="cart-summary-row">
        <span>Pajak (10%)</span>
        <strong>${formatRupiah(totals.tax)}</strong>
      </div>
      ${totals.promoDiscount ? `
        <div class="cart-summary-row">
          <span>Diskon Promo</span>
          <strong class="cart-discount-value">-${formatRupiah(totals.promoDiscount)}</strong>
        </div>
      ` : ""}
      <div class="cart-summary-total">
        <span>Total</span>
        <strong>${formatRupiah(totals.total)}</strong>
      </div>
    </section>

    <section class="cart-checkout-bar">
      <a class="cart-checkout-button" href="./checkout.html">Lanjut ke Checkout</a>
    </section>
  `;
}

function bindCartActions() {
  document.querySelectorAll("[data-qty-change]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.qtyChange);
      const delta = Number(button.dataset.delta);
      const items = getCartItems();
      const target = items[index];

      if (!target) {
        return;
      }

      target.qty = Math.max(1, Number(target.qty || 1) + delta);
      saveCartItems(items);
      renderCartPage();
    });
  });

  document.querySelectorAll("[data-delete-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.deleteIndex);
      const items = getCartItems();
      items.splice(index, 1);
      saveCartItems(items);
      renderCartPage();
      showCartToast("Item dihapus dari keranjang.");
    });
  });

  document.getElementById("applyPromoButton")?.addEventListener("click", async () => {
    const promoInput = document.getElementById("promoInput");
    const code = normalizePromoCode(promoInput?.value);

    try {
      const promo = await validatePromoCodeViaApi(code);
      const items = getCartItems();
      const totals = calculateOrderTotals(items, promo.code);

      cartState.promoCode = promo.code;
      cartState.promoDiscount = totals.promoDiscount;

      if (promo.isValid && totals.promoDiscount > 0) {
        saveActivePromoCode(promo.code);
        showCartToast("Kode promo berhasil dipakai.");
      } else if (Number(totals.subtotal || 0) < Number(promo.minPurchase || 0)) {
        clearActivePromoCode();
        showCartToast(`Minimum pembelian ${formatRupiah(promo.minPurchase)} untuk promo ini.`);
      } else {
        clearActivePromoCode();
        showCartToast("Kode promo belum bisa digunakan.");
      }
    } catch (error) {
      clearActivePromoCode();
      cartState.promoCode = code;
      cartState.promoDiscount = 0;
      showCartToast(error.message || "Kode promo belum valid.");
    }

    renderCartPage();
  });
}

function renderCartPage() {
  const container = document.getElementById("cartPageContent");
  const items = getCartItems();

  updateCartBadges(items);

  if (!items.length) {
    clearActivePromoCode();
    cartState.promoCode = "";
    cartState.promoDiscount = 0;
    container.innerHTML = `
      <section class="empty-status-state">
        <div class="empty-status-illustration" aria-hidden="true">&#128717;</div>
        <h2>Keranjang masih kosong</h2>
        <p>Kamu belum menambahkan menu apa pun. Yuk pilih minuman favoritmu dulu.</p>
        <a class="order-button empty-status-action" href="./all-menu.html">Cari Menu</a>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section class="cart-item-list">
      ${items.map(createCartItemCard).join("")}
    </section>
    ${createCartSummary(items)}
  `;

  bindCartActions();
}

async function initCartPage() {
  try {
    await loadPromoCatalog();
  } catch (error) {
    promoCatalog = [];
  }

  renderCartPage();
}

initCartPage();
