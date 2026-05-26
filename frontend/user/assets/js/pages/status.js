function getOrderTotals(order) {
  const storedTotals = order?.meta?.totals;

  if (storedTotals && Number.isFinite(Number(storedTotals.total))) {
    return {
      subtotal: Number(storedTotals.subtotal || 0),
      serviceFee: Number(storedTotals.serviceFee || 0),
      tax: Number(storedTotals.tax || 0),
      promoCode: storedTotals.promoCode || order?.meta?.promoCode || "",
      promoDiscount: Number(storedTotals.promoDiscount || 0),
      total: Number(storedTotals.total || 0),
    };
  }

  return calculateOrderTotals(order?.items || [], order?.meta?.promoCode || "");
}

function mapOrderStatusToStep(status) {
  switch (String(status || "").toLowerCase()) {
    case "received":
      return "received";
    case "preparing":
      return "brewing";
    case "ready":
      return "pickup";
    case "done":
      return "done";
    default:
      return "brewing";
  }
}

function createStatusDetailRows(order) {
  return (order.items || []).map((item) => {
    const qty = Number(item.qty || 0);
    const name = escapeHTML(item.name || item.menuName || "");
    const note = escapeHTML(item.note);
    const unitPrice = Number(item.price ?? item.unitPrice ?? 0);

    return `
      <div class="status-detail-row">
        <span>${qty}x ${name}${note ? ` (${note})` : ""}</span>
        <strong>${formatRupiah(qty * unitPrice)}</strong>
      </div>
    `;
  }).join("");
}

function createStatusCostRows(totals) {
  return `
    <div class="status-detail-row">
      <span>Subtotal</span>
      <strong>${formatRupiah(totals.subtotal)}</strong>
    </div>
    <div class="status-detail-row">
      <span>Biaya Layanan</span>
      <strong>${formatRupiah(totals.serviceFee)}</strong>
    </div>
    <div class="status-detail-row">
      <span>Pajak (10%)</span>
      <strong>${formatRupiah(totals.tax)}</strong>
    </div>
    ${totals.promoDiscount ? `
      <div class="status-detail-row">
        <span>Diskon Promo (${escapeHTML(totals.promoCode)})</span>
        <strong class="cart-discount-value">-${formatRupiah(totals.promoDiscount)}</strong>
      </div>
    ` : ""}
  `;
}

function getStatusAnimationContent(order) {
  const currentStep = order.currentStep === "pickup"
    ? "Pesanan siap diambil"
    : order.currentStep === "done"
      ? "Pesanan selesai"
      : "Kopi sedang dibuat";

  const subtitle = order.currentStep === "pickup"
    ? "Pesananmu sudah hampir selesai. Silakan bersiap mengambilnya."
    : order.currentStep === "done"
      ? "Pesananmu sudah selesai diproses."
      : "Barista menyiapkan pesananmu...";

  return `
    <div class="status-brew-card">
      <section class="status-brew-scene" aria-label="Animasi kopi turun ke dalam gelas kosong">
        <div class="status-brew-machine">
          <div class="status-brew-machine-top"></div>
          <div class="status-brew-machine-filter"></div>
        </div>

        <div class="status-brew-drop one"></div>
        <div class="status-brew-drop two"></div>
        <div class="status-brew-drop three"></div>

        <div class="status-brew-line">
          <div class="status-brew-stream"></div>
        </div>

        <div class="status-brew-cup-wrap">
          <div class="status-brew-cup-shadow"></div>
          <div class="status-brew-handle"></div>
          <div class="status-brew-cup">
            <div class="status-brew-fill"></div>
          </div>
          <div class="status-brew-mouth"></div>
          <span class="status-brew-splash a"></span>
          <span class="status-brew-splash b"></span>
          <span class="status-brew-splash c"></span>
        </div>
      </section>

      <h3 class="status-brew-title">${currentStep}</h3>
      <p class="status-brew-subtitle">${subtitle}</p>

      <div class="status-brew-loader" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
}

function renderStatusPage() {
  const container = document.getElementById("statusPageContent");
  const order = getActiveOrder();

  if (!order) {
    container.innerHTML = `
      <section class="empty-status-state">
        <div class="empty-status-illustration" aria-hidden="true">&#9749;</div>
        <h2>Belum ada pesanan aktif</h2>
        <p>Kamu belum melakukan pemesanan. Yuk pilih menu favoritmu dulu.</p>
        <a class="order-button empty-status-action" href="./all-menu.html">Pesan Sekarang</a>
      </section>
    `;
    return;
  }

  const totals = getOrderTotals(order);

  container.innerHTML = `
    <section class="status-hero-card">
      <div class="status-hero-main">
        <div>
          <p class="status-hero-label">Nomor Pesanan</p>
          <h2>${escapeHTML(order.orderNumber)}</h2>
        </div>
        <div class="status-time-chip">
          <span>Waktu Pesan</span>
          <strong>${escapeHTML(order.orderTime)}</strong>
        </div>
      </div>
      <div class="status-estimate-card">
        <div class="status-estimate-icon" aria-hidden="true">&#9716;</div>
        <div>
          <span>Estimasi Waktu</span>
          <strong>${escapeHTML(order.estimate)}</strong>
        </div>
      </div>
    </section>

    <section class="status-panel">
      <h2>Status Pesanan</h2>
      <div class="status-animation-slot" id="statusAnimationSlot">
        ${getStatusAnimationContent(order)}
      </div>
    </section>

    <section class="status-panel">
      <h2>Detail Pesanan</h2>
      <div class="status-detail-list">
        ${createStatusDetailRows(order)}
        ${createStatusCostRows(totals)}
      </div>
      <div class="status-total-row">
        <span>Total</span>
        <strong>${formatRupiah(totals.total)}</strong>
      </div>
    </section>

    <section class="status-action-area">
      <button class="status-complete-button" type="button" id="completeOrderButton">Pesanan Telah Diterima</button>
    </section>
  `;

  document.getElementById("completeOrderButton").addEventListener("click", () => {
    clearActiveOrder();
    window.location.href = "./index.html";
  });
}

async function initStatusPage() {
  const localOrder = getActiveOrder();

  if (localOrder?.orderNumber) {
    try {
      const remoteOrder = await fetchOrderByNumber(localOrder.orderNumber);
      saveActiveOrder({
        ...localOrder,
        currentStep: mapOrderStatusToStep(remoteOrder.status),
        items: Array.isArray(remoteOrder.items) && remoteOrder.items.length
          ? remoteOrder.items.map((item) => ({
            ...item,
            name: item.menuName || item.name || "",
            price: Number(item.unitPrice ?? item.price ?? 0),
          }))
          : (localOrder.items || []),
        meta: {
          ...(localOrder.meta || {}),
          customerName: remoteOrder.customerName || localOrder.meta?.customerName || "",
          phoneNumber: remoteOrder.phoneNumber || localOrder.meta?.phoneNumber || "",
          tableNumber: remoteOrder.tableNumber || localOrder.meta?.tableNumber || "",
          paymentMethod: remoteOrder.paymentMethod || localOrder.meta?.paymentMethod || "",
          baristaNote: remoteOrder.baristaNote || localOrder.meta?.baristaNote || "",
          promoCode: remoteOrder.promoCode || localOrder.meta?.promoCode || "",
          totals: {
            subtotal: Number(remoteOrder.subtotal || localOrder.meta?.totals?.subtotal || 0),
            serviceFee: Number(remoteOrder.serviceFee || localOrder.meta?.totals?.serviceFee || 0),
            tax: Number(remoteOrder.taxAmount || localOrder.meta?.totals?.tax || 0),
            promoCode: remoteOrder.promoCode || localOrder.meta?.totals?.promoCode || "",
            promoDiscount: Number(remoteOrder.discountAmount || localOrder.meta?.totals?.promoDiscount || 0),
            total: Number(remoteOrder.total || localOrder.meta?.totals?.total || 0),
          },
          total: Number(remoteOrder.total || localOrder.meta?.total || 0),
        },
      });
    } catch (error) {
      // Keep local order data when the API is unavailable.
    }
  }

  updateCartBadge();
  renderStatusPage();
}

initStatusPage();
