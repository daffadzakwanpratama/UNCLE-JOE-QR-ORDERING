const ADMIN_STORAGE_KEYS = {
    session: 'qr-admin-session',
    rememberedUsername: 'qr-admin-remembered-username',
};

let resolveAdminGuardsReady = null;
const adminGuardsReady = new Promise((resolve) => {
    resolveAdminGuardsReady = resolve;
});

function readLocalStorage(key) {
    try {
        return window.localStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

function writeLocalStorage(key, value) {
    try {
        window.localStorage.setItem(key, value);
        return true;
    } catch (error) {
        return false;
    }
}

function removeLocalStorage(key) {
    try {
        window.localStorage.removeItem(key);
        return true;
    } catch (error) {
        return false;
    }
}

function normalizeAdminSession(session) {
    const username = String(session?.username || '').trim();

    if (!username) {
        return null;
    }

    const normalizedId = Number(session?.id);

    return {
        id: Number.isFinite(normalizedId) ? normalizedId : null,
        username,
        fullName: String(session?.fullName || username).trim() || username,
        role: String(session?.role || 'admin').trim() || 'admin',
        loggedInAt: String(session?.loggedInAt || '').trim() || new Date().toISOString(),
    };
}

function formatAdminCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
}

function getAdminSession() {
    try {
        const raw = readLocalStorage(ADMIN_STORAGE_KEYS.session);
        const session = raw ? JSON.parse(raw) : null;
        return normalizeAdminSession(session);
    } catch (error) {
        return null;
    }
}

function hasAdminSession() {
    return Boolean(getAdminSession()?.username);
}

function saveAdminSession(session) {
    const normalizedSession = normalizeAdminSession(session);

    if (!normalizedSession) {
        clearAdminSession();
        return null;
    }

    writeLocalStorage(ADMIN_STORAGE_KEYS.session, JSON.stringify(normalizedSession));
    return normalizedSession;
}

function clearAdminSession() {
    removeLocalStorage(ADMIN_STORAGE_KEYS.session);
}

function getRememberedUsername() {
    return readLocalStorage(ADMIN_STORAGE_KEYS.rememberedUsername) || '';
}

function saveRememberedUsername(username) {
    if (!username) {
        removeLocalStorage(ADMIN_STORAGE_KEYS.rememberedUsername);
        return;
    }

    writeLocalStorage(ADMIN_STORAGE_KEYS.rememberedUsername, username);
}

function getMenuPlaceholder(label = 'Menu') {
    const safeLabel = String(label).slice(0, 2).toUpperCase() || 'MN';

    // Distinguish Menu (Amber/Orange) from Banner (Bronze #A77F60) color science
    const isBanner = safeLabel === 'BN';
    const startColor = isBanner ? '#855b3c' : '#d97706';
    const stopColor = isBanner ? '#A77F60' : '#fbbf24';

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
            <defs>
                <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop stop-color="${startColor}" offset="0"/>
                    <stop stop-color="${stopColor}" offset="1"/>
                </linearGradient>
            </defs>
            <rect width="120" height="120" rx="24" fill="url(#g)"/>
            <text x="60" y="69" text-anchor="middle" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="34" font-weight="800" fill="white">${safeLabel}</text>
        </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function redirectToLogin() {
    window.location.href = './login.html';
}

function clearAdminSessionAndRedirect() {
    clearAdminSession();
    redirectToLogin();
}

function requireAdminSession() {
    if (!hasAdminSession()) {
        clearAdminSessionAndRedirect();
        return false;
    }

    return true;
}

async function syncAdminSession() {
    if (!window.AdminApi?.fetchAdminSession) {
        return null;
    }

    const admin = await window.AdminApi.fetchAdminSession();
    const currentSession = getAdminSession() || {};

    return saveAdminSession({
        ...currentSession,
        id: admin?.id,
        username: admin?.username || currentSession.username || '',
        fullName: admin?.fullName || currentSession.fullName || '',
        role: admin?.role || currentSession.role || 'admin',
    });
}

function logoutAdmin() {
    const logoutRequest = window.AdminApi?.logoutAdmin?.();

    Promise.resolve(logoutRequest)
        .catch(() => null)
        .finally(() => {
            clearAdminSession();
            redirectToLogin();
        });
}

async function hasValidAdminServerSession() {
    if (!hasAdminSession()) {
        return false;
    }

    try {
        await syncAdminSession();
        return true;
    } catch (error) {
        clearAdminSession();
        return false;
    }
}

function bindLogoutLinks() {
    document.querySelectorAll('.admin-logout-link').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            logoutAdmin();
        });
    });
}

function initAdminLayout(currentPage = '') {
    window.AdminUi?.renderAdminSidebar?.(currentPage);
    window.AdminUi?.renderAdminPageHeader?.(currentPage);
    window.AdminUi?.renderAdminSummaryCards?.(currentPage);
    window.AdminUi?.renderAdminPanelHead?.(currentPage);
    window.AdminUi?.initAdminIcons?.();
    // Render top bar after icons so avatar initial can be set
    window.AdminUi?.renderAdminTopBar?.(currentPage);
}

async function initAdminGuards() {
    const body = document.body;
    if (!body) {
        return;
    }

    initAdminLayout(body.dataset.adminPage || '');

    if (!body.classList.contains('admin-protected-page')) {
        return;
    }

    const hasSession = requireAdminSession();
    if (!hasSession) {
        return;
    }

    await syncAdminSession();
    bindLogoutLinks();
}

document.addEventListener('DOMContentLoaded', () => {
    void initAdminGuards()
        .catch(() => {
            if (document.body?.classList.contains('admin-protected-page')) {
                clearAdminSessionAndRedirect();
            }
        })
        .finally(() => {
            resolveAdminGuardsReady?.();
        });
});

window.AdminStore = {
    formatAdminCurrency,
    getAdminSession,
    hasAdminSession,
    saveAdminSession,
    clearAdminSession,
    getRememberedUsername,
    saveRememberedUsername,
    requireAdminSession,
    syncAdminSession,
    hasValidAdminServerSession,
    logoutAdmin,
    waitUntilReady: () => adminGuardsReady,
    getMenuPlaceholder,
    api: {
        baseUrl: window.AdminApiClient?.baseUrl || '',
        request: window.AdminApiClient?.request,
        loginAdmin: window.AdminApi?.loginAdmin,
        fetchAdminSession: window.AdminApi?.fetchAdminSession,
        logoutAdmin: window.AdminApi?.logoutAdmin,
        fetchCategories: window.AdminApi?.fetchCategories,
        createCategory: window.AdminApi?.createCategory,
        updateCategory: window.AdminApi?.updateCategory,
        deleteCategory: window.AdminApi?.deleteCategory,
        fetchMenus: window.AdminApi?.fetchMenus,
        createMenu: window.AdminApi?.createMenu,
        updateMenu: window.AdminApi?.updateMenu,
        deleteMenu: window.AdminApi?.deleteMenu,
        fetchOrders: window.AdminApi?.fetchOrders,
        fetchOrderDetail: window.AdminApi?.fetchOrderDetail,
        advanceOrderStatus: window.AdminApi?.advanceOrderStatus,
        fetchBanners: window.AdminApi?.fetchBanners,
        createBanner: window.AdminApi?.createBanner,
        updateBanner: window.AdminApi?.updateBanner,
        deleteBanner: window.AdminApi?.deleteBanner,
        fetchDiscounts: window.AdminApi?.fetchDiscounts,
        createDiscount: window.AdminApi?.createDiscount,
        updateDiscount: window.AdminApi?.updateDiscount,
        deleteDiscount: window.AdminApi?.deleteDiscount,
        fetchReportSummary: window.AdminApi?.fetchReportSummary,
        fetchReportTransactions: window.AdminApi?.fetchReportTransactions,
        updateOrderPaymentStatus: window.AdminApi?.updateOrderPaymentStatus,
        clearOrders: window.AdminApi?.clearOrders,
        fetchSettings: window.AdminApi?.fetchSettings,
        updateSettings: window.AdminApi?.updateSettings,
    },
};

function showAdminConfirm(title, message) {
    return new Promise((resolve) => {
        const escape = (str) => String(str || '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));

        const overlay = document.createElement('div');
        overlay.className = 'custom-admin-dialog-overlay';
        overlay.innerHTML = `
            <div class="custom-admin-dialog-box">
                <h3 class="custom-admin-dialog-title">${escape(title)}</h3>
                <p class="custom-admin-dialog-message">${escape(message)}</p>
                <div class="custom-admin-dialog-actions">
                    <button class="custom-admin-dialog-btn btn-cancel" id="adminDialogCancelBtn">Batal</button>
                    <button class="custom-admin-dialog-btn btn-confirm" id="adminDialogConfirmBtn">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('is-visible');
        });

        const cleanup = (result) => {
            overlay.classList.remove('is-visible');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 250);
        };

        overlay.querySelector('#adminDialogCancelBtn').addEventListener('click', () => cleanup(false));
        overlay.querySelector('#adminDialogConfirmBtn').addEventListener('click', () => cleanup(true));
    });
}

function showAdminAlert(title, message) {
    return new Promise((resolve) => {
        const escape = (str) => String(str || '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));

        const overlay = document.createElement('div');
        overlay.className = 'custom-admin-dialog-overlay';
        overlay.innerHTML = `
            <div class="custom-admin-dialog-box">
                <h3 class="custom-admin-dialog-title">${escape(title)}</h3>
                <p class="custom-admin-dialog-message">${escape(message)}</p>
                <div class="custom-admin-dialog-actions">
                    <button class="custom-admin-dialog-btn btn-confirm" id="adminDialogOkBtn" style="width: 100%;">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('is-visible');
        });

        const cleanup = () => {
            overlay.classList.remove('is-visible');
            setTimeout(() => {
                overlay.remove();
                resolve();
            }, 250);
        };

        overlay.querySelector('#adminDialogOkBtn').addEventListener('click', cleanup);
    });
}

window.showAdminConfirm = showAdminConfirm;
window.showAdminAlert = showAdminAlert;
