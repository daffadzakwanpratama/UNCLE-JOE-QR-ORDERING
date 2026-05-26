const ADMIN_ICONS = {
    dashboard: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M18.5 3.5h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2Z"></path>
            <path d="M7.5 3.5h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2Z"></path>
            <path d="M18.5 14.5h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2Z"></path>
            <path d="M7.5 14.5h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2Z"></path>
        </svg>
    `.trim(),
    menu: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" stroke="none" d="M5.6 1 4 9.8c-.24 1.32 2.85 1.94 2.8 3.28L6.4 23.4c-.06 1.6 1.6 1.6 1.6 1.6s1.66 0 1.6-1.6l-.4-10.32c-.05-1.31 2.77-1.89 2.8-3.28L10.4 1h-.8l.4 6.4-1.2.8-.4-7.2h-.8l-.4 7.2-1.2-.8.4-6.4h-.8Z"></path>
            <path fill="currentColor" stroke="none" d="M19.2 1c-1.18 0-3.14 1.05-3.93 2.62C14.62 4.8 14.4 7.43 14.4 9v4c0 1.31 1.75 1.6 2.4 1.6L16 23.4C15.85 25 17.6 25 17.6 25s1.6 0 1.6-1.6V1Z"></path>
        </svg>
    `.trim(),
    category: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" stroke="none" d="M20.25 16.61V13.5a1.5 1.5 0 0 0-1.5-1.5h-6v-3h1.5a1.5 1.5 0 0 0 1.5-1.5V3a1.5 1.5 0 0 0-1.5-1.5h-4.5A1.5 1.5 0 0 0 8.25 3v4.5A1.5 1.5 0 0 0 9.75 9h1.5v3h-6a1.5 1.5 0 0 0-1.5 1.5v3.11a3 3 0 1 0 1.5 0V13.5h6v3.11a3 3 0 1 0 1.5 0V13.5h6v3.11a3 3 0 1 0 1.5 0ZM9.75 3h4.5v4.5h-4.5ZM6 21a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 6 21Zm6 0a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 12 21Zm6 0a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 18 21Z"></path>
        </svg>
    `.trim(),
    report: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 14.6C4 14.04 4 13.76 4.11 13.55c.1-.19.25-.35.44-.44.21-.11.49-.11 1.05-.11h.8c.56 0 .84 0 1.05.11.19.09.34.25.44.44.11.21.11.49.11 1.05v4.8c0 .56 0 .84-.11 1.05-.1.19-.25.34-.44.44-.21.11-.49.11-1.05.11h-.8c-.56 0-.84 0-1.05-.11a1 1 0 0 1-.44-.44C4 20.24 4 19.96 4 19.4v-4.8Z"></path>
            <path d="M10 4.6c0-.56 0-.84.11-1.05.1-.19.25-.34.44-.44C10.76 3 11.04 3 11.6 3h.8c.56 0 .84 0 1.05.11.19.1.34.25.44.44.11.21.11.49.11 1.05v14.8c0 .56 0 .84-.11 1.05-.1.19-.25.34-.44.44-.21.11-.49.11-1.05.11h-.8c-.56 0-.84 0-1.05-.11a1 1 0 0 1-.44-.44C10 20.24 10 19.96 10 19.4V4.6Z"></path>
            <path d="M16 10.6c0-.56 0-.84.11-1.05.1-.19.25-.34.44-.44.21-.11.49-.11 1.05-.11h.8c.56 0 .84 0 1.05.11.19.1.34.25.44.44.11.21.11.49.11 1.05v8.8c0 .56 0 .84-.11 1.05-.1.19-.25.34-.44.44-.21.11-.49.11-1.05.11h-.8c-.56 0-.84 0-1.05-.11a1 1 0 0 1-.44-.44C16 20.24 16 19.96 16 19.4v-8.8Z"></path>
        </svg>
    `.trim(),
    logout: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M16 17 21 12M21 12l-5-5M21 12H9"></path>
            <path d="M12 17c0 .93 0 1.4-.1 1.78a3 3 0 0 1-2.12 2.12C9.4 21 8.93 21 8 21h-.5c-1.4 0-2.1 0-2.65-.23a3 3 0 0 1-1.62-1.62C3 18.6 3 17.9 3 16.5v-9c0-1.4 0-2.1.23-2.65a3 3 0 0 1 1.62-1.62C5.4 3 6.1 3 7.5 3H8c.93 0 1.4 0 1.78.1a3 3 0 0 1 2.12 2.12C12 5.6 12 6.07 12 7"></path>
        </svg>
    `.trim(),
    success: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M5 13l4 4L19 7"></path>
        </svg>
    `.trim(),
    warning: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 8v5"></path>
            <path d="M12 17h.01"></path>
            <path d="M10.3 4h3.4L20 17.5A1 1 0 0 1 19.1 19H4.9A1 1 0 0 1 4 17.5L10.3 4z"></path>
        </svg>
    `.trim(),
    transactions: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M8 4v16"></path>
            <path d="M16 4v16"></path>
            <path d="M4 9h16"></path>
            <path d="M4 15h16"></path>
        </svg>
    `.trim(),
    average: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 9c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2"></path>
            <path d="M4 15c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2"></path>
        </svg>
    `.trim(),
    banner: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" stroke="none" d="M11.26 5.87c-2.63 0-4.17 0-4.17 0v9.11s1.54 0 4.17 0c2.63 0 5.59 2.63 6.47 4.61V1.25c-.88 1.98-3.84 4.62-6.47 4.62Z"></path>
            <path fill="currentColor" stroke="none" d="M5.55 5.87H4.24A2.8 2.8 0 0 0 1.44 8.67v3.51a2.8 2.8 0 0 0 2.8 2.8h1.31V5.87Z"></path>
            <path fill="currentColor" stroke="none" d="M22.57 10.37a1.74 1.74 0 0 0-1.4-1.72V1.06a1.06 1.06 0 1 0-2.12 0v18.74a1.06 1.06 0 1 0 2.12 0v-7.8a1.74 1.74 0 0 0 1.4-1.63Z"></path>
            <path fill="currentColor" stroke="none" d="M9.13 22.36c-.5-.42.31-.72.2-1.36-.12-.64-.55-.56-.67-1.2-.12-.64.31-.72.2-1.36-.12-.64-.55-.45-.67-1.09-.12-.64.37-1.17-.1-1.31H4.58l.5 7.13c.03.5.44.89.93.89h3.4c.3 0 .6-.35.55-.73-.03-.3-.35-.73-.83-.97Z"></path>
        </svg>
    `.trim(),
    discount: `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" stroke="none" d="M12 2A10 10 0 1 0 22 12 10 10 0 0 0 12 2ZM8.5 6.5a2 2 0 1 1-2 2A2 2 0 0 1 8.5 6.5Zm.21 10.21A1 1 0 1 1 7.29 15.3l8-8a1 1 0 0 1 1.42 1.4ZM15.5 17.5a2 2 0 1 1 2-2A2 2 0 0 1 15.5 17.5Z"></path>
        </svg>
    `.trim(),
};

const ADMIN_NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', href: './dashboard.html', icon: 'dashboard', tone: 'violet' },
    { id: 'menu', label: 'Menu', href: './menu.html', icon: 'menu', tone: 'amber' },
    { id: 'category', label: 'Kategori', href: './category.html', icon: 'category', tone: 'blue' },
    { id: 'banner', label: 'Banner', href: './banner.html', icon: 'banner', tone: 'banner' },
    { id: 'discount', label: 'Diskon', href: './discount.html', icon: 'discount', tone: 'red' },
    { id: 'report', label: 'Laporan', href: './report.html', icon: 'report', tone: 'green' },
    { id: 'logout', label: 'Logout', href: './login.html', icon: 'logout', tone: 'gray', extraClass: 'admin-logout-link' },
];

const ADMIN_SUMMARY_CARDS = {
    dashboard: [
        { tone: 'primary', icon: 'menu', label: 'Total Menu', valueId: 'dashboardMenuCount', defaultValue: '0' },
        { tone: 'violet', icon: 'category', label: 'Total Kategori', valueId: 'dashboardCategoryCount', defaultValue: '0' },
        { tone: 'success', icon: 'success', label: 'Menu Tersedia', valueId: 'dashboardAvailableCount', defaultValue: '0' },
        { tone: 'warm', icon: 'warning', label: 'Menu Habis', valueId: 'dashboardUnavailableCount', defaultValue: '0' },
    ],
    menu: [
        { tone: 'primary', icon: 'menu', label: 'Total Menu', valueId: 'menuSummaryCount', defaultValue: '0' },
        { tone: 'success', icon: 'success', label: 'Menu Tersedia', valueId: 'menuAvailableCount', defaultValue: '0' },
        { tone: 'warm', icon: 'warning', label: 'Menu Habis', valueId: 'menuUnavailableCount', defaultValue: '0' },
        { tone: 'violet', icon: 'category', label: 'Total Kategori', valueId: 'menuCategoryCount', defaultValue: '0' },
    ],
    category: [
        { tone: 'violet', icon: 'category', label: 'Total Kategori', valueId: 'totalCategoryCount', defaultValue: '0' },
        { tone: 'primary', icon: 'menu', label: 'Total Menu Terhubung', valueId: 'linkedMenuCount', defaultValue: '0' },
    ],
    banner: [
        { tone: 'banner', icon: 'banner', label: 'Total Banner', valueId: 'bannerTotalCount', defaultValue: '0' },
        { tone: 'success', icon: 'success', label: 'Banner Aktif', valueId: 'bannerActiveCount', defaultValue: '0' },
        { tone: 'warm', icon: 'warning', label: 'Banner Nonaktif', valueId: 'bannerInactiveCount', defaultValue: '0' },
    ],
    discount: [
        { tone: 'warm', icon: 'discount', label: 'Total Kode', valueId: 'discountTotalCount', defaultValue: '0' },
        { tone: 'success', icon: 'success', label: 'Kode Aktif', valueId: 'discountActiveCount', defaultValue: '0' },
        { tone: 'violet', icon: 'transactions', label: 'Total Digunakan', valueId: 'discountUsedCount', defaultValue: '0' },
    ],
    report: [
        { tone: 'success', icon: 'report', label: 'Total Pemasukan', valueId: 'reportRevenueTotal', defaultValue: 'Rp0' },
        { tone: 'violet', icon: 'transactions', label: 'Total Transaksi', valueId: 'reportTransactionCount', defaultValue: '0' },
        { tone: 'primary', icon: 'average', label: 'Rata-rata Transaksi', valueId: 'reportAverageTransaction', defaultValue: 'Rp0' },
    ],
};

const ADMIN_PAGE_HEADERS = {
    dashboard: {
        kicker: 'Dashboard',
        title: 'Ringkasan Admin',
        subtitle: 'Lihat gambaran singkat menu dan kategori yang sedang aktif.',
        side: `
            <div class="admin-user-badge" id="adminUserBadgeDesktop" aria-label="Info admin">
                <span>Login sebagai</span>
                <div class="admin-user-badge-row">
                    <strong id="dashboardAdminUsername">admin</strong>
                    <small>Administrator</small>
                </div>
            </div>
        `.trim(),
    },
    menu: {
        kicker: 'Kelola Menu',
        title: 'Daftar Menu',
        subtitle: 'Tambah, edit, hapus, dan atur status ketersediaan menu.',
        side: '<button type="button" class="admin-primary-button" id="addMenuButton">Tambah Menu</button>',
    },
    category: {
        kicker: 'Kelola Kategori',
        title: 'Kategori Menu',
        subtitle: 'Atur kategori agar daftar menu lebih rapi dan mudah dikelola.',
        side: '<button type="button" class="admin-primary-button" id="addCategoryButton">Tambah Kategori</button>',
    },
    banner: {
        kicker: 'Kelola Banner',
        title: 'Banner Promo',
        subtitle: 'Atur banner promo atau pengumuman yang tampil di halaman user.',
        side: '<button type="button" class="admin-primary-button" id="addBannerButton">Tambah Banner</button>',
    },
    discount: {
        kicker: 'Kelola Diskon',
        title: 'Voucher & Referral',
        subtitle: 'Kelola kode promo, voucher diskon, dan referral untuk potongan harga user.',
        side: '<button type="button" class="admin-primary-button" id="addDiscountButton">Tambah Kode</button>',
    },
    report: {
        kicker: 'Laporan Transaksi',
        title: 'Ringkasan Keuangan',
        subtitle: 'Pantau pemasukan per bulan, buka detail transaksi, dan export laporan spreadsheet.',
    },
};

const ADMIN_PANEL_HEADS = {
    dashboard: {
        title: 'Transaksi Terbaru',
        description: 'Pantau pesanan terbaru lengkap dengan customer, meja, pembayaran, dan total transaksi.',
        side: '<button type="button" class="admin-secondary-button" id="clearDashboardTransactionsButton">Clear Transaksi</button>',
    },
    menu: {
        title: 'Manajemen Menu',
        description: 'Gunakan filter kategori untuk memudahkan pencarian.',
    },
    category: {
        title: 'Daftar Kategori',
        description: 'Kamu bisa tambah, edit, atau hapus kategori dari sini.',
    },
    banner: {
        title: 'Daftar Banner',
        description: 'Siapkan struktur banner promo lengkap dengan gambar, periode tayang, dan status publikasi.',
    },
    discount: {
        title: 'Daftar Voucher & Referral',
        description: 'Atur tipe diskon, masa berlaku, minimum belanja, dan batas penggunaan kode promo.',
    },
    report: {
        title: 'Laporan Transaksi',
        description: 'Filter laporan bulanan, cek detail transaksi satu per satu, lalu export ke spreadsheet.',
    },
};

function renderAdminTopBar(currentPage = '') {
    const content = document.querySelector('.admin-content');
    if (!content || content.querySelector('[data-admin-topbar]')) {
        return;
    }

    const session = window.AdminStore?.getAdminSession?.();
    const username = session?.username || 'Admin';
    const initial = username.charAt(0).toUpperCase();

    const bar = document.createElement('div');
    bar.setAttribute('data-admin-topbar', '');
    bar.className = 'admin-topbar';
    bar.innerHTML = `
        <button class="admin-topbar-menu-toggle" id="adminSidebarToggle" aria-label="Buka Menu" title="Buka Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        </button>
        <a class="admin-topbar-brand" href="./dashboard.html" aria-label="QR Ordering Admin Panel">
            <span class="admin-topbar-logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.8"/>
                    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.8"/>
                    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.8"/>
                    <rect x="14" y="14" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="18" y="14" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="14" y="18" width="3" height="3" rx="0.5" fill="currentColor"/>
                    <rect x="18" y="18" width="3" height="3" rx="0.5" fill="currentColor"/>
                </svg>
            </span>
            <span class="admin-topbar-brand-text">
                <strong>QR Ordering</strong>
                <small>Admin Panel</small>
            </span>
        </a>
    `.trim();

    content.insertBefore(bar, content.firstChild);

    // Wire sidebar drawer toggle
    const toggleBtn = bar.querySelector('#adminSidebarToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const sidebar = document.querySelector('[data-admin-sidebar]');
            if (sidebar) {
                sidebar.classList.add('is-sidebar-open');
                let backdrop = document.querySelector('.admin-sidebar-backdrop');
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.className = 'admin-sidebar-backdrop';
                    document.body.appendChild(backdrop);
                    
                    requestAnimationFrame(() => {
                        backdrop.classList.add('is-active');
                    });
                    
                    backdrop.addEventListener('click', () => {
                        sidebar.classList.remove('is-sidebar-open');
                        backdrop.classList.remove('is-active');
                        setTimeout(() => backdrop.remove(), 350);
                    });
                }
            }
        });
    }
}

function renderAdminSidebar(currentPage = '') {
    const sidebar = document.querySelector('[data-admin-sidebar]');
    if (!sidebar) {
        return;
    }

    const navMarkup = ADMIN_NAV_ITEMS.map((item) => {
        const classNames = ['admin-sidebar-link'];

        if (item.id === currentPage) {
            classNames.push('is-active');
        }

        if (item.extraClass) {
            classNames.push(item.extraClass);
        }

        if (item.tone) {
            classNames.push(`is-tone-${item.tone}`);
        }

        return `
            <a class="${classNames.join(' ')}" href="${item.href}">
                <span class="admin-sidebar-icon" data-admin-icon="${item.icon}" aria-hidden="true"></span>
                <span class="admin-sidebar-link-label">${item.label}</span>
            </a>
        `.trim();
    }).join('');

    sidebar.innerHTML = `
        <div class="admin-sidebar-head">
            <a class="admin-branding" href="./dashboard.html">
                <span>
                    <strong>QR Ordering</strong>
                    <small>Admin Panel</small>
                </span>
            </a>
            <button class="admin-sidebar-close" id="adminSidebarClose" aria-label="Tutup Menu" title="Tutup Menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div class="admin-sidebar-section">
            <p class="admin-sidebar-label">Navigation</p>
            <nav class="admin-sidebar-nav" aria-label="Navigasi admin">
                ${navMarkup}
            </nav>
        </div>
    `.trim();

    // Wire close button inside sidebar
    const closeBtn = sidebar.querySelector('#adminSidebarClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('is-sidebar-open');
            const backdrop = document.querySelector('.admin-sidebar-backdrop');
            if (backdrop) {
                backdrop.classList.remove('is-active');
                setTimeout(() => backdrop.remove(), 350);
            }
        });
    }
}

function renderAdminSummaryCards(currentPage = '') {
    const summaryGrid = document.querySelector('[data-admin-summary]');
    const cards = ADMIN_SUMMARY_CARDS[currentPage];

    if (!summaryGrid || !cards?.length) {
        return;
    }

    summaryGrid.innerHTML = cards.map((card) => `
        <article class="admin-summary-card is-highlight-${card.tone}">
            <div class="admin-summary-icon" data-admin-icon="${card.icon}" aria-hidden="true"></div>
            <span>${card.label}</span>
            <strong id="${card.valueId}">${card.defaultValue}</strong>
        </article>
    `.trim()).join('');
}

function renderAdminPageHeader(currentPage = '') {
    const header = document.querySelector('[data-admin-page-header]');
    const config = ADMIN_PAGE_HEADERS[currentPage];

    if (!header || !config) {
        return;
    }

    header.innerHTML = `
        <div class="admin-page-heading">
            <p class="admin-kicker">${config.kicker || ''}</p>
            <h1>${config.title}</h1>
            <p class="admin-page-subtitle">${config.subtitle}</p>
        </div>
        <div class="admin-page-side">${config.side || ''}</div>
    `.trim();
}

function renderAdminPanelHead(currentPage = '') {
    const panelHead = document.querySelector('[data-admin-panel-head]');
    const config = ADMIN_PANEL_HEADS[currentPage];

    if (!panelHead || !config) {
        return;
    }

    panelHead.innerHTML = `
        <div class="admin-panel-heading">
            <h2>${config.title}</h2>
            <p>${config.description}</p>
        </div>
        <div class="admin-panel-side">${config.side || ''}</div>
    `.trim();
}

function initAdminIcons() {
    document.querySelectorAll('[data-admin-icon]').forEach((element) => {
        const iconMarkup = ADMIN_ICONS[element.dataset.adminIcon];
        if (iconMarkup) {
            element.innerHTML = iconMarkup;
        }
    });
}

window.AdminUi = {
    renderAdminTopBar,
    renderAdminSidebar,
    renderAdminSummaryCards,
    renderAdminPageHeader,
    renderAdminPanelHead,
    initAdminIcons,
};
