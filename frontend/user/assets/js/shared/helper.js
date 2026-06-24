let promoCatalog = [];
let storefrontSettings = {
  tax_percent: 10,
  service_fee: 2000
};

function readJsonStorage(key, fallbackValue) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function writeJsonStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[character]));
}

function escapeAttribute(value = "") {
  return escapeHTML(value);
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value).replace("Rp", "Rp ");
}

function getActiveOrder() {
  return readJsonStorage(STORAGE_KEYS.activeOrder, null);
}

function saveActiveOrder(order) {
  writeJsonStorage(STORAGE_KEYS.activeOrder, order);
}

function clearActiveOrder() {
  window.localStorage.removeItem(STORAGE_KEYS.activeOrder);
}

function normalizeTableNumber(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 30);
}

function getActiveTableNumber() {
  return normalizeTableNumber(window.localStorage.getItem(STORAGE_KEYS.activeTable));
}

function saveActiveTableNumber(tableNumber) {
  const normalizedTableNumber = normalizeTableNumber(tableNumber);

  if (!normalizedTableNumber) {
    window.localStorage.removeItem(STORAGE_KEYS.activeTable);
    return "";
  }

  window.localStorage.setItem(STORAGE_KEYS.activeTable, normalizedTableNumber);
  return normalizedTableNumber;
}

function syncActiveTableFromLocation() {
  const searchParams = new URLSearchParams(window.location.search);
  const tableNumberFromUrl = normalizeTableNumber(searchParams.get("table"));

  if (tableNumberFromUrl) {
    return saveActiveTableNumber(tableNumberFromUrl);
  }

  return getActiveTableNumber();
}

function getCartItems() {
  const items = readJsonStorage(STORAGE_KEYS.cart, []);
  return Array.isArray(items) ? items : [];
}

function saveCartItems(items) {
  writeJsonStorage(STORAGE_KEYS.cart, items);
}

function clearCartItems() {
  window.localStorage.removeItem(STORAGE_KEYS.cart);
  clearActivePromoCode();
}

function getStoredFeedback() {
  const items = readJsonStorage(STORAGE_KEYS.feedback, []);
  return Array.isArray(items) ? items : [];
}

function saveStoredFeedback(items) {
  writeJsonStorage(STORAGE_KEYS.feedback, items);
}


function getCartCount(items = getCartItems()) {
  return items.reduce((total, item) => total + Number(item.qty || 0), 0);
}

function getSubtotal(items) {
  return items.reduce((total, item) => total + Number(item.price || 0) * Number(item.qty || 0), 0);
}

function getServiceFee(subtotal) {
  return subtotal > 0 ? storefrontSettings.service_fee : 0;
}

function getTax(subtotal) {
  return subtotal > 0 ? Math.round(subtotal * (storefrontSettings.tax_percent / 100)) : 0;
}

function normalizePromoCode(code) {
  return String(code || "").trim().toUpperCase();
}

function getActivePromoCode() {
  return normalizePromoCode(window.localStorage.getItem(STORAGE_KEYS.activePromo));
}

function saveActivePromoCode(code) {
  const normalizedCode = normalizePromoCode(code);

  if (!normalizedCode) {
    clearActivePromoCode();
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.activePromo, normalizedCode);
}

function clearActivePromoCode() {
  window.localStorage.removeItem(STORAGE_KEYS.activePromo);
}

function isPromoCodeValid(code) {
  return Boolean(findPromoByCode(code));
}

function getPromoDiscount(code, subtotal) {
  const promo = findPromoByCode(code);

  if (!promo || subtotal <= 0) {
    return 0;
  }

  if (Number(subtotal) < Number(promo.minPurchase || 0)) {
    return 0;
  }

  if (promo.discountType === "percent") {
    const rawDiscount = Math.round((subtotal * Number(promo.discountValue || 0)) / 100);
    const maxDiscount = Number(promo.maxDiscount || 0);
    const finalDiscount = maxDiscount > 0 ? Math.min(rawDiscount, maxDiscount) : rawDiscount;
    return Math.min(finalDiscount, subtotal);
  }

  return Math.min(Number(promo.discountValue || 0), subtotal);
}

function calculateOrderTotals(items, promoCode = getActivePromoCode()) {
  const subtotal = getSubtotal(items);
  const serviceFee = getServiceFee(subtotal);
  const tax = getTax(subtotal);
  const normalizedPromoCode = normalizePromoCode(promoCode);
  const promoDiscount = getPromoDiscount(normalizedPromoCode, subtotal);
  const total = Math.max(0, subtotal + serviceFee + tax - promoDiscount);

  return {
    subtotal,
    serviceFee,
    tax,
    promoCode: promoDiscount ? normalizedPromoCode : "",
    promoDiscount,
    total,
  };
}

function updateCartBadge(items = getCartItems()) {
  const count = getCartCount(items);

  document.querySelectorAll(".badge-count").forEach((badge) => {
    badge.textContent = String(count);
    badge.classList.toggle("is-empty", count <= 0);
  });
}

function showToastMessage({
  stackId,
  title,
  message = "",
  actionLabel = "",
  actionHref = "#",
  success = false,
  duration = 2200,
  useExistingStack = false,
  stackClassName = "toast-stack toast-stack-top",
}) {
  let stack = document.getElementById(stackId);

  if (!useExistingStack && stack) {
    stack.remove();
    stack = null;
  }

  if (!stack && !useExistingStack) {
    stack = document.createElement("div");
    stack.className = stackClassName;
    stack.id = stackId;
    document.body.appendChild(stack);
  }

  if (!stack) {
    return;
  }

  const safeTitle = escapeHTML(title);
  const safeMessage = escapeHTML(message);
  const safeActionLabel = escapeHTML(actionLabel);
  const safeActionHref = escapeAttribute(actionHref);
  const toast = document.createElement("div");
  toast.className = `toast-message${success ? " is-success" : ""}`;
  toast.innerHTML = `
    ${success ? `<div class="toast-icon" aria-hidden="true">&#10003;</div>` : `<div class="toast-accent" aria-hidden="true"></div>`}
    <div class="toast-body">
      <strong>${safeTitle}</strong>
      ${message ? `<p>${safeMessage}</p>` : ""}
    </div>
    ${actionLabel ? `<a class="toast-action" href="${safeActionHref}">${safeActionLabel}</a>` : ""}
  `;

  stack.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("is-visible");
  });

  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => {
      if (useExistingStack) {
        toast.remove();
        return;
      }

      stack.remove();
    }, 260);
  }, duration);
}

async function fetchMenuCatalog() {
  if (!window.UserApi?.fetchMenuCatalog) {
    throw new Error("User API belum siap.");
  }

  return window.UserApi.fetchMenuCatalog();
}

function mapDiscountItem(item) {
  return {
    id: Number(item.id),
    code: normalizePromoCode(item.code),
    name: item.name || "",
    type: item.type || "voucher",
    discountType: item.discountType || "fixed",
    discountValue: Number(item.discountValue || 0),
    minPurchase: Number(item.minPurchase || 0),
    maxDiscount: Number(item.maxDiscount || 0),
    usageLimit: Number(item.usageLimit || 0),
    usedCount: Number(item.usedCount || 0),
    startDate: item.startDate || "",
    endDate: item.endDate || "",
    isActive: Boolean(Number(item.isActive) || item.isActive),
  };
}

function isDiscountCurrentlyValid(discount) {
  const today = new Date().toISOString().slice(0, 10);
  const startDate = String(discount.startDate || "").slice(0, 10);
  const endDate = String(discount.endDate || "").slice(0, 10);
  const hasStarted = !startDate || startDate <= today;
  const hasNotEnded = !endDate || endDate >= today;
  const hasQuota = !discount.usageLimit || discount.usedCount < discount.usageLimit;

  return Boolean(discount.isActive && hasStarted && hasNotEnded && hasQuota);
}

function findPromoByCode(code) {
  const normalizedCode = normalizePromoCode(code);
  if (!normalizedCode) {
    return null;
  }

  return promoCatalog.find((promo) => promo.code === normalizedCode && isDiscountCurrentlyValid(promo)) || null;
}

async function loadPromoCatalog() {
  if (!window.UserApi?.fetchDiscountCatalog) {
    throw new Error("User API belum siap.");
  }

  const items = await window.UserApi.fetchDiscountCatalog();
  promoCatalog = items.map(mapDiscountItem);
  return promoCatalog;
}

async function loadStorefrontSettings() {
  if (!window.UserApi?.fetchSettings) {
    return storefrontSettings;
  }
  try {
    const data = await window.UserApi.fetchSettings();
    if (data) {
      storefrontSettings.tax_percent = Number(data.tax_percent ?? 10);
      storefrontSettings.service_fee = Number(data.service_fee ?? 2000);
    }
  } catch (error) {
    console.warn("Gagal memuat pengaturan toko dari API, menggunakan default:", error);
  }
  return storefrontSettings;
}

async function validatePromoCodeViaApi(code) {
  const normalizedCode = normalizePromoCode(code);
  if (!normalizedCode) {
    throw new Error("Masukkan kode promo dulu.");
  }

  if (!window.UserApi?.validateDiscountCode) {
    throw new Error("User API belum siap.");
  }

  const payload = await window.UserApi.validateDiscountCode(normalizedCode);
  const discount = mapDiscountItem(payload);
  promoCatalog = [
    ...promoCatalog.filter((item) => item.code !== discount.code),
    discount,
  ];

  return {
    ...discount,
    isValid: Boolean(payload?.isValid),
  };
}

async function createOrderViaApi(orderPayload) {
  if (!window.UserApi?.createOrder) {
    throw new Error("User API belum siap.");
  }

  return window.UserApi.createOrder(orderPayload);
}

async function fetchOrderByNumber(orderNumber) {
  if (!window.UserApi?.fetchOrderByNumber) {
    throw new Error("User API belum siap.");
  }

  return window.UserApi.fetchOrderByNumber(orderNumber);
}

function showCustomConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "custom-dialog-overlay";
    overlay.innerHTML = `
      <div class="custom-dialog-box">
        <h3 class="custom-dialog-title">${escapeHTML(title)}</h3>
        <p class="custom-dialog-message">${escapeHTML(message)}</p>
        <div class="custom-dialog-actions">
          <button class="custom-dialog-btn btn-cancel" id="customDialogCancelBtn">Batal</button>
          <button class="custom-dialog-btn btn-confirm" id="customDialogConfirmBtn">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add("is-visible");
    });

    const cleanup = (result) => {
      overlay.classList.remove("is-visible");
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 250);
    };

    overlay.querySelector("#customDialogCancelBtn").addEventListener("click", () => cleanup(false));
    overlay.querySelector("#customDialogConfirmBtn").addEventListener("click", () => cleanup(true));
  });
}

function showCustomAlert(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "custom-dialog-overlay";
    overlay.innerHTML = `
      <div class="custom-dialog-box">
        <h3 class="custom-dialog-title">${escapeHTML(title)}</h3>
        <p class="custom-dialog-message">${escapeHTML(message)}</p>
        <div class="custom-dialog-actions">
          <button class="custom-dialog-btn btn-confirm" id="customDialogOkBtn" style="width: 100%;">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add("is-visible");
    });

    const cleanup = () => {
      overlay.classList.remove("is-visible");
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 250);
    };

    overlay.querySelector("#customDialogOkBtn").addEventListener("click", cleanup);
  });
}

window.showCustomConfirm = showCustomConfirm;
window.showCustomAlert = showCustomAlert;
window.loadStorefrontSettings = loadStorefrontSettings;

syncActiveTableFromLocation();
