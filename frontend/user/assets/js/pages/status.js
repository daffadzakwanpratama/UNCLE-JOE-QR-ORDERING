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
  const paymentMethodLower = String(order.meta?.paymentMethod || "").toLowerCase();
  const isQris = paymentMethodLower === "qris";
  const isPaid = String(order.paymentStatus || "").toLowerCase() === "paid";
  
  let paymentBadgeColor = "status-badge-pending";
  let paymentBadgeText = "Menunggu Pembayaran";
  
  if (isPaid) {
    paymentBadgeColor = "status-badge-paid";
    paymentBadgeText = isQris ? "Pembayaran Berhasil" : "Lunas (Sudah Dibayar)";
  } else if (order.paymentStatus === "failed") {
    paymentBadgeColor = "status-badge-failed";
    paymentBadgeText = "Pembayaran Gagal";
  } else {
    // Masih pending
    if (paymentMethodLower === "cash") {
      paymentBadgeColor = "status-badge-cash";
      paymentBadgeText = "Tunai (Bayar di Kasir)";
    } else {
      paymentBadgeColor = "status-badge-pending";
      paymentBadgeText = "Menunggu Pembayaran (Non-Tunai)";
    }
  }

  const showCashTicket = (paymentMethodLower === "cash" && !isPaid);
  const cashTicketMarkup = showCashTicket ? `
    <section class="status-cash-ticket">
      <h3>🎟️ Tiket Pembayaran Kasir</h3>
      <p>Tunjukkan QR Code dinamis atau sampaikan Nomor Pesanan di bawah ini kepada kasir di meja pembayaran untuk melunasi pesanan Anda secara tunai.</p>
      
      <div class="status-cash-qr-container">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(order.orderNumber)}&color=5b4636" alt="QR Code Nomor Pesanan" />
      </div>

      <div class="status-cash-ticket-divider"></div>
      
      <p>Nomor Pesanan Anda</p>
      <strong class="status-cash-ticket-code">${escapeHTML(order.orderNumber)}</strong>
    </section>
  ` : '';

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
      <div class="status-estimate-card status-payment-status-card">
        <div class="status-estimate-icon" aria-hidden="true">&#128179;</div>
        <div>
          <span>Status Pembayaran</span>
          <div class="status-payment-badge-row">
            <strong class="status-payment-badge ${paymentBadgeColor}">${paymentBadgeText}</strong>
          </div>
        </div>
      </div>
    </section>

    ${cashTicketMarkup}

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
      ${isQris && !isPaid
        ? `<button class="status-complete-button" type="button" id="payNowPrimaryButton">Bayar Sekarang</button>
           <button class="status-secondary-button" type="button" id="switchPayCashButton">Bayar di Kasir (Tunai)</button>`
        : `<button class="status-complete-button" type="button" id="completeOrderButton">Pesanan Telah Diterima</button>`
      }
    </section>
  `;

  function triggerMidtransSnap() {
    if (!order.paymentToken) return;
    window.snap.pay(order.paymentToken, {
      onSuccess: function (result) {
        window.location.reload();
      },
      onPending: function (result) {
        window.location.reload();
      },
      onError: function (result) {
        alert("Pembayaran gagal!");
      },
      onClose: function () {
        // Popup ditutup oleh pengguna
      }
    });
  }

  if (isQris && !isPaid) {
    document.getElementById("payNowPrimaryButton")?.addEventListener("click", triggerMidtransSnap);
    document.getElementById("switchPayCashButton")?.addEventListener("click", async () => {
      const confirmed = window.confirm("Apakah Anda yakin ingin mengubah metode pembayaran ke Kasir? Anda harus melunasi pesanan secara tunai langsung ke meja kasir.");
      if (!confirmed) return;

      try {
        await window.UserApi.changeOrderPaymentMethod(order.orderNumber, "cash");
        const activeOrder = getActiveOrder();
        if (activeOrder) {
          if (!activeOrder.meta) {
            activeOrder.meta = {};
          }
          activeOrder.meta.paymentMethod = "cash";
          saveActiveOrder(activeOrder);
        }
        window.location.reload();
      } catch (err) {
        alert(err.message || "Gagal mengubah metode pembayaran.");
      }
    });
  } else {
    document.getElementById("completeOrderButton")?.addEventListener("click", () => {
      clearActiveOrder();
      window.location.href = "./index.html";
    });
  }
}

async function initStatusPage() {
  const localOrder = getActiveOrder();

  if (localOrder?.orderNumber) {
    try {
      const remoteOrder = await fetchOrderByNumber(localOrder.orderNumber);
      saveActiveOrder({
        ...localOrder,
        currentStep: mapOrderStatusToStep(remoteOrder.status),
        paymentToken: remoteOrder.paymentToken || localOrder.paymentToken || null,
        paymentStatus: remoteOrder.paymentStatus || localOrder.paymentStatus || "pending",
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

  // Auto-polling status pembayaran jika pesanan belum lunas (berlaku untuk Cash & QRIS)
  const activeOrder = getActiveOrder();
  const isPaid = String(activeOrder?.paymentStatus || "").toLowerCase() === "paid";

  if (!isPaid && activeOrder?.orderNumber) {
    const statusInterval = window.setInterval(async () => {
      try {
        const remoteOrder = await fetchOrderByNumber(activeOrder.orderNumber);
        if (remoteOrder && String(remoteOrder.paymentStatus || "").toLowerCase() === "paid") {
          window.clearInterval(statusInterval);
          window.location.reload(); // Reload untuk memperbarui tampilan menjadi Lunas/Pembayaran Berhasil
        }
      } catch (pollError) {
        // Abaikan error koneksi saat polling
      }
    }, 4000); // Poll setiap 4 detik
  }
}

initStatusPage();
