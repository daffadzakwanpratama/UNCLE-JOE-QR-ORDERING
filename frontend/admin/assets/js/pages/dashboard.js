const DASHBOARD_CLEARED_ORDERS_KEY = 'qr-admin-dashboard-cleared-orders';

document.addEventListener('DOMContentLoaded', async () => {
    await AdminStore.waitUntilReady?.();
    if (!AdminStore.hasAdminSession?.()) return;

    const session = AdminStore.getAdminSession();
    const menuCount = document.getElementById('dashboardMenuCount');
    const categoryCount = document.getElementById('dashboardCategoryCount');
    const availableCount = document.getElementById('dashboardAvailableCount');
    const unavailableCount = document.getElementById('dashboardUnavailableCount');
    const adminUsername = document.getElementById('dashboardAdminUsername');
    const transactionList = document.getElementById('dashboardTransactionList');
    const clearButton = document.getElementById('clearDashboardTransactionsButton');

    if (adminUsername && session?.username) adminUsername.textContent = session.username;

    try {
        const [menus, categories, orders] = await Promise.all([
            AdminStore.api.fetchMenus(),
            AdminStore.api.fetchCategories(),
            AdminStore.api.fetchOrders(),
        ]);

        const availableMenus = menus.filter((menu) => Boolean(Number(menu.available) || menu.available)).length;

        if (menuCount) menuCount.textContent = String(menus.length);
        if (categoryCount) categoryCount.textContent = String(categories.length);
        if (availableCount) availableCount.textContent = String(availableMenus);
        if (unavailableCount) unavailableCount.textContent = String(menus.length - availableMenus);

        if (!transactionList) return;

        renderTransactionList(transactionList, orders);
        syncClearButtonState(clearButton, orders);

        transactionList.addEventListener('click', async (event) => {
            const actionButton = event.target.closest('[data-order-action]');
            if (!actionButton) {
                return;
            }

            const orderNumber = actionButton.dataset.orderNumber || '';
            if (!orderNumber) {
                return;
            }

            const originalLabel = actionButton.textContent;
            actionButton.disabled = true;
            actionButton.textContent = 'Memproses...';

            try {
                const result = await AdminStore.api.advanceOrderStatus(orderNumber);
                const updatedStatus = result?.status || '';
                const order = orders.find((item) => item.orderNumber === orderNumber);

                if (order) {
                    order.status = updatedStatus;
                }

                renderTransactionList(transactionList, orders);
                syncClearButtonState(clearButton, orders);
            } catch (error) {
                actionButton.disabled = false;
                actionButton.textContent = originalLabel;
                window.alert(error.message || 'Gagal memperbarui status pesanan.');
            }
        });

        clearButton?.addEventListener('click', () => {
            const visibleOrders = getVisibleDashboardOrders(orders);
            if (!visibleOrders.length) {
                return;
            }

            const confirmed = window.confirm('Clear transaksi hanya akan mengosongkan daftar di dashboard. Data laporan tetap tersimpan. Lanjutkan?');
            if (!confirmed) {
                return;
            }

            const hiddenOrderNumbers = new Set(getClearedDashboardOrderNumbers());
            visibleOrders.forEach((order) => {
                if (order?.orderNumber) {
                    hiddenOrderNumbers.add(order.orderNumber);
                }
            });

            saveClearedDashboardOrderNumbers([...hiddenOrderNumbers]);
            renderTransactionList(transactionList, orders);
            syncClearButtonState(clearButton, orders);
        });
    } catch (error) {
        if (transactionList) {
            transactionList.innerHTML = `
                <div class="admin-empty-state">
                    <strong>Gagal memuat dashboard</strong>
                    <p>${escapeHtml(error.message || 'Periksa koneksi API dan database.')}</p>
                </div>
            `;
        }
    }
});

function renderTransactionList(container, orders) {
    const visibleOrders = getVisibleDashboardOrders(orders);

    if (!visibleOrders.length) {
        container.innerHTML = `
            <div class="admin-empty-state">
                <strong>Dashboard transaksi kosong</strong>
                <p>Daftar transaksi di dashboard sudah dibersihkan. Data lengkapnya tetap ada di halaman laporan.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = visibleOrders.map((transaction) => {
        const transactionNote = buildTransactionNote(transaction);
        const hasNote = transactionNote !== '-' && transactionNote.trim() !== 'Tidak ada catatan tambahan.';
        const transactionItemsMarkup = renderTransactionItems(transaction);

        return `
            <article class="admin-transaction-card">
                <div class="admin-transaction-top">
                    <strong>${escapeHtml(transaction.orderNumber)}</strong>
                    <span class="admin-transaction-badge ${getTransactionBadgeClass(transaction.status)}">${escapeHtml(transaction.status || 'received')}</span>
                </div>
                <div class="admin-transaction-meta">
                    <span>Time</span>
                    <p>${escapeHtml(formatTransactionDateTime(transaction))}</p>
                </div>
                <div class="admin-transaction-meta">
                    <span>Customer</span>
                    <p>${escapeHtml(transaction.customerName || '-')}</p>
                </div>
                <div class="admin-transaction-meta">
                    <span>Table</span>
                    <p class="admin-table-badge">${escapeHtml(transaction.tableNumber || '-')}</p>
                </div>
                <div class="admin-transaction-meta">
                    <span>Payment</span>
                    <p>${escapeHtml(transaction.paymentMethod || '-')}</p>
                </div>
                <div class="admin-transaction-items">
                    <span>Items</span>
                    ${transactionItemsMarkup}
                </div>
                <div class="admin-transaction-note ${hasNote ? 'has-active-note' : ''}">
                    <strong>${hasNote ? '⚠ PENTING (Catatan):' : 'Catatan:'}</strong> ${escapeHtml(transactionNote)}
                </div>
                <div class="admin-transaction-footer">
                    <strong>${AdminStore.formatAdminCurrency(Number(transaction.total || 0))}</strong>
                    ${renderTransactionActions(transaction)}
                </div>
            </article>
        `;
    }).join('');
}

function getVisibleDashboardOrders(orders) {
    const hiddenOrderNumbers = new Set(getClearedDashboardOrderNumbers());
    return orders
        .filter((transaction) => !hiddenOrderNumbers.has(transaction.orderNumber))
        .slice(0, 4);
}

function getClearedDashboardOrderNumbers() {
    try {
        const raw = window.localStorage.getItem(DASHBOARD_CLEARED_ORDERS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string' && value.trim()) : [];
    } catch (error) {
        return [];
    }
}

function saveClearedDashboardOrderNumbers(orderNumbers) {
    window.localStorage.setItem(DASHBOARD_CLEARED_ORDERS_KEY, JSON.stringify(orderNumbers));
}

function syncClearButtonState(button, orders) {
    if (!button) return;
    button.disabled = !getVisibleDashboardOrders(orders).length;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getTransactionBadgeClass(status) {
    switch (String(status || '').toLowerCase()) {
        case 'ready':
            return 'is-ready';
        case 'preparing':
            return 'is-preparing';
        default:
            return 'is-received';
    }
}

function formatTransactionDateTime(transaction) {
    if (transaction.createdAt) {
        const createdAt = new Date(transaction.createdAt);
        if (!Number.isNaN(createdAt.getTime())) {
            const formattedTime = new Intl.DateTimeFormat('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
            }).format(createdAt);
            const formattedDate = new Intl.DateTimeFormat('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }).format(createdAt);

            return `${formattedTime} | ${formattedDate}`;
        }
    }

    if (transaction.time && transaction.time !== '-') {
        const formattedDate = formatTransactionDateLabel(transaction.date);
        return `${transaction.time} | ${formattedDate}`;
    }

    return formatTransactionDateLabel(transaction.date);
}

function formatTransactionDateLabel(dateValue) {
    if (!dateValue || dateValue === '-') {
        return '-';
    }

    const date = new Date(`${dateValue}T00:00`);
    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function buildTransactionNote(transaction) {
    const notes = [
        transaction.baristaNote,
        transaction.itemNotes,
    ].filter((value) => String(value || '').trim());

    return notes.length ? notes.join(' | ') : '-';
}

function renderTransactionItems(transaction) {
    const items = getTransactionItems(transaction);
    if (!items.length) {
        return '<p>Item pesanan belum tersedia.</p>';
    }

    return `
        <ul>
            ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
    `;
}

function getTransactionItems(transaction) {
    if (Array.isArray(transaction?.items) && transaction.items.length) {
        return transaction.items
            .map((item) => {
                if (typeof item === 'string') {
                    return item.trim();
                }

                const qty = Number(item?.qty || 0);
                const name = String(item?.menuName || item?.name || '').trim();
                const sizeLabel = String(item?.sizeLabel || '').trim();
                if (!name) {
                    return '';
                }

                const qtyLabel = qty > 0 ? `${qty}x ` : '';
                const sizeSuffix = sizeLabel ? ` (${sizeLabel})` : '';
                return `${qtyLabel}${name}${sizeSuffix}`;
            })
            .filter(Boolean);
    }

    if (typeof transaction?.itemSummary === 'string' && transaction.itemSummary.trim()) {
        return transaction.itemSummary
            .split('|')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

function renderTransactionActions(transaction) {
    const status = String(transaction.status || 'received').toLowerCase();

    if (status === 'received') {
        return `
            <div class="admin-transaction-action-group">
                <button type="button" class="admin-transaction-action is-accept" data-order-action="advance" data-order-number="${escapeHtml(transaction.orderNumber || '')}">Proses</button>
            </div>
        `;
    }

    if (status === 'preparing') {
        return `
            <div class="admin-transaction-action-group">
                <button type="button" class="admin-transaction-action is-accept" data-order-action="advance" data-order-number="${escapeHtml(transaction.orderNumber || '')}">Siap Diambil</button>
            </div>
        `;
    }

    return '';
}
