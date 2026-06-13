const paymentMethods = [
  { key: "qris", title: "Non-Tunai (Cashless)", subtitle: "QRIS, E-Wallet & Transfer Bank", icon: "&#128179;" },
  { key: "cash", title: "Tunai", subtitle: "Bayar di kasir", icon: "&#128181;" },
];

const checkoutState = {
  paymentMethod: "",
  tableNumber: getActiveTableNumber(),
  customerName: "",
  phoneNumber: "",
  baristaNote: "",
};

function isCheckoutFormValid() {
  return Boolean(
    checkoutState.tableNumber.trim() &&
    checkoutState.customerName.trim() &&
    checkoutState.paymentMethod
  );
}

function showCheckoutToast(message) {
  showToastMessage({
    stackId: "checkoutToastStack",
    title: "Form belum lengkap",
    message,
  });
}

function getCurrentTimeLabel() {
  const now = new Date();
  return now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(".", ":");
}

function createCheckoutSummaryText(items) {
  return items
    .map((item) => `${Number(item.qty || 0)}x ${escapeHTML(item.name)} (${escapeHTML(item.size || "M")})`)
    .join(", ");
}

function renderCheckoutPage() {
  const container = document.getElementById("checkoutPageContent");
  const items = getCartItems();
  const totals = calculateOrderTotals(items, getActivePromoCode());
  const selectedPaymentMethod = paymentMethods.find((method) => method.key === checkoutState.paymentMethod);

  updateCartBadge(items);

  if (!items.length) {
    container.innerHTML = `
      <section class="empty-status-state">
        <div class="empty-status-illustration" aria-hidden="true">&#128717;</div>
        <h2>Belum ada item untuk checkout</h2>
        <p>Tambahkan menu ke keranjang dulu sebelum melanjutkan checkout.</p>
        <a class="order-button empty-status-action" href="./all-menu.html">Cari Menu</a>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section class="checkout-summary-card">
      <h2>Ringkasan Pesanan</h2>
      <div class="checkout-summary-row">
        <span>${createCheckoutSummaryText(items)}</span>
        <strong>${formatRupiah(totals.subtotal)}</strong>
      </div>
    </section>

    <section class="checkout-form-section">
      <div class="checkout-field">
        <label for="tableNumber">Nomor Meja / Kursi</label>
        <input id="tableNumber" type="text" placeholder="Contoh: A12" value="${escapeAttribute(checkoutState.tableNumber)}">
        ${checkoutState.tableNumber ? `<small class="checkout-table-hint">Nomor meja terdeteksi dari QR meja dan masih bisa kamu ubah bila perlu.</small>` : ""}
      </div>

      <div class="checkout-field">
        <label for="customerName">Nama</label>
        <input id="customerName" type="text" placeholder="Nama lengkap" value="${escapeAttribute(checkoutState.customerName)}">
      </div>

      <div class="checkout-field">
        <label for="phoneNumber">Nomor Telepon</label>
        <input id="phoneNumber" type="tel" placeholder="08xxxxxxxxxx" value="${escapeAttribute(checkoutState.phoneNumber)}">
      </div>

      <div class="checkout-field">
        <label>Metode Pembayaran</label>
        <button class="checkout-method-trigger" type="button" id="methodTrigger">
          <span>${selectedPaymentMethod ? escapeHTML(selectedPaymentMethod.title) : "Pilih metode pembayaran"}</span>
          <span aria-hidden="true">&#8250;</span>
        </button>
      </div>

      <div class="checkout-method-list" id="methodList">
        ${paymentMethods.map((method) => `
          <button class="checkout-method-item ${checkoutState.paymentMethod === method.key ? "is-active" : ""}" type="button" data-method="${escapeAttribute(method.key)}">
            <span class="checkout-method-icon" aria-hidden="true">${method.icon}</span>
            <span class="checkout-method-copy">
              <strong>${escapeHTML(method.title)}</strong>
              <small>${escapeHTML(method.subtitle)}</small>
            </span>
          </button>
        `).join("")}
      </div>

      <div class="checkout-field">
        <label for="baristaNote">Catatan untuk Barista (Opsional)</label>
        <textarea id="baristaNote" placeholder="Tambahkan catatan khusus...">${escapeHTML(checkoutState.baristaNote)}</textarea>
      </div>
    </section>

    <section class="cart-summary-card checkout-total-card">
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
          <span>Diskon Promo (${escapeHTML(totals.promoCode)})</span>
          <strong class="cart-discount-value">-${formatRupiah(totals.promoDiscount)}</strong>
        </div>
      ` : ""}
      <div class="cart-summary-total">
        <span>Total Pembayaran</span>
        <strong>${formatRupiah(totals.total)}</strong>
      </div>
    </section>

    <section class="checkout-action-bar">
      <button class="checkout-confirm-button ${isCheckoutFormValid() ? "is-ready" : "is-disabled"}" type="button" id="confirmOrderButton" ${isCheckoutFormValid() ? "" : "disabled"}>
        Konfirmasi Pesanan
      </button>
    </section>
  `;

  bindCheckoutActions(items, totals);
}

function bindCheckoutActions(items, totals) {
  document.getElementById("tableNumber")?.addEventListener("input", (event) => {
    checkoutState.tableNumber = event.target.value;
    saveActiveTableNumber(event.target.value);
    updateCheckoutButtonState();
  });

  document.getElementById("customerName")?.addEventListener("input", (event) => {
    checkoutState.customerName = event.target.value;
    updateCheckoutButtonState();
  });

  document.getElementById("phoneNumber")?.addEventListener("input", (event) => {
    checkoutState.phoneNumber = event.target.value;
    updateCheckoutButtonState();
  });

  document.getElementById("baristaNote")?.addEventListener("input", (event) => {
    checkoutState.baristaNote = event.target.value;
  });

  document.getElementById("methodTrigger")?.addEventListener("click", () => {
    document.getElementById("methodList")?.classList.toggle("is-open");
  });

  document.querySelectorAll("[data-method]").forEach((button) => {
    button.addEventListener("click", () => {
      checkoutState.paymentMethod = button.dataset.method;
      renderCheckoutPage();
    });
  });

  document.getElementById("confirmOrderButton")?.addEventListener("click", async () => {
    if (!isCheckoutFormValid()) {
      showCheckoutToast("Lengkapi semua data wajib terlebih dahulu.");
      return;
    }

    if (!checkoutState.tableNumber.trim()) {
      showCheckoutToast("Masukkan nomor meja atau kursi terlebih dahulu.");
      return;
    }

    if (!checkoutState.customerName.trim()) {
      showCheckoutToast("Nama pemesan masih kosong.");
      return;
    }


    if (!checkoutState.paymentMethod) {
      showCheckoutToast("Pilih metode pembayaran dulu.");
      return;
    }

    const order = {
      orderNumber: "",
      orderTime: getCurrentTimeLabel(),
      estimate: "10 menit",
      currentStep: "brewing",
      steps: [
        { key: "received", label: "Pesanan Diterima", icon: "&#10003;" },
        { key: "brewing", label: "Sedang Diproses", icon: "&#9749;" },
        { key: "pickup", label: "Siap Diambil", icon: "&#9633;" },
        { key: "done", label: "Selesai", icon: "&#10003;" },
      ],
      items: items.map((item) => ({
        menuId: item.id,
        name: item.name,
        qty: Number(item.qty || 0),
        price: Number(item.price || 0),
        size: item.size || "M",
        note: `${item.size || "M"}${item.note ? `, ${item.note}` : ""}`,
      })),
      meta: {
        tableNumber: checkoutState.tableNumber.trim(),
        customerName: checkoutState.customerName.trim(),
        phoneNumber: checkoutState.phoneNumber.trim(),
        paymentMethod: checkoutState.paymentMethod,
        baristaNote: checkoutState.baristaNote.trim(),
        promoCode: totals.promoCode,
        totals,
        total: totals.total,
      },
    };

    const apiOrderPayload = {
      customerName: order.meta.customerName,
      phoneNumber: order.meta.phoneNumber,
      tableNumber: order.meta.tableNumber,
      paymentMethod: order.meta.paymentMethod,
      subtotal: totals.subtotal,
      serviceFee: totals.serviceFee,
      taxAmount: totals.tax,
      discountAmount: totals.promoDiscount,
      total: totals.total,
      promoCode: totals.promoCode,
      baristaNote: order.meta.baristaNote,
      items: items.map((item) => ({
        menuId: item.id,
        menuName: item.name,
        qty: Number(item.qty || 0),
        size: item.size || "M",
        note: item.note || "",
        price: Number(item.price || 0),
      })),
    };

    try {
      const createdOrder = await createOrderViaApi(apiOrderPayload);
      const serverTotals = createdOrder?.totals || null;

      if (serverTotals) {
        order.meta.promoCode = serverTotals.promoCode || "";
        order.meta.totals = {
          subtotal: Number(serverTotals.subtotal || 0),
          serviceFee: Number(serverTotals.serviceFee || 0),
          tax: Number(serverTotals.taxAmount || 0),
          promoCode: serverTotals.promoCode || "",
          promoDiscount: Number(serverTotals.discountAmount || 0),
          total: Number(serverTotals.total || 0),
        };
        order.meta.total = Number(serverTotals.total || 0);
      }

      order.orderNumber = createdOrder?.orderNumber || "";
      if (!order.orderNumber) {
        throw new Error("Server belum mengembalikan kode pesanan.");
      }

      order.paymentToken = createdOrder?.paymentToken || null;
      order.paymentStatus = "pending";

      saveActiveOrder(order);
      saveActiveTableNumber(order.meta.tableNumber);
      clearCartItems();
      clearActivePromoCode();

      if (createdOrder?.paymentToken) {
        window.snap.pay(createdOrder.paymentToken, {
          onSuccess: function (result) {
            window.location.href = "./status.html";
          },
          onPending: function (result) {
            window.location.href = "./status.html";
          },
          onError: function (result) {
            window.location.href = "./status.html";
          },
          onClose: function () {
            window.location.href = "./status.html";
          }
        });
      } else {
        window.location.href = "./status.html";
      }
    } catch (error) {
      showCheckoutToast(error.message || "Pesanan gagal dikirim ke server.");
    }
  });
}

function updateCheckoutButtonState() {
  const button = document.getElementById("confirmOrderButton");
  if (!button) {
    return;
  }

  const isValid = isCheckoutFormValid();
  button.disabled = !isValid;
  button.classList.toggle("is-ready", isValid);
  button.classList.toggle("is-disabled", !isValid);
}

async function loadMidtransSnapScript() {
  try {
    const config = await window.UserApi.fetchMidtransConfig();
    if (config) {
      const { clientKey, isProduction } = config;
      const snapUrl = isProduction
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";

      return new Promise((resolve, reject) => {
        if (window.snap) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = snapUrl;
        script.setAttribute("data-client-key", clientKey);
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Gagal memuat SDK pembayaran Midtrans."));
        document.head.appendChild(script);
      });
    }
  } catch (err) {
    console.error("Gagal memuat konfigurasi Midtrans:", err);
  }
}

async function initCheckoutPage() {
  try {
    await loadPromoCatalog();
  } catch (error) {
    promoCatalog = [];
  }

  try {
    await loadMidtransSnapScript();
  } catch (error) {
    console.error("Gagal memuat pembayaran Midtrans:", error);
  }

  renderCheckoutPage();
}

initCheckoutPage();
