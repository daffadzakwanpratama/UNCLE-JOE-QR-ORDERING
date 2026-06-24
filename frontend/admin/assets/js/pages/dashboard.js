const DASHBOARD_CLEARED_ORDERS_KEY = 'qr-admin-dashboard-cleared-orders';
const DASHBOARD_SOUND_MUTED_KEY = 'qr-admin-dashboard-sound-muted';
let searchQuery = '';
const newOrderNumbers = new Set();
let isMuted = false;

try {
    isMuted = window.localStorage.getItem(DASHBOARD_SOUND_MUTED_KEY) === 'true';
} catch (e) {
    isMuted = false;
}

function playNotificationSound() {
    if (isMuted) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const playChime = (frequency, startTime, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(frequency, startTime);
            
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        };
        
        const now = ctx.currentTime;
        playChime(1318.51, now, 0.4);
        playChime(1760.00, now + 0.12, 0.6);
    } catch (e) {
        console.warn("Gagal memutar notifikasi suara pesanan baru:", e);
    }
}

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
    const searchInput = document.getElementById('dashboardOrderSearchInput');
    const muteButton = document.getElementById('dashboardMuteButton');
    const muteIcon = document.getElementById('dashboardMuteIcon');
    const muteText = document.getElementById('dashboardMuteText');

    function updateMuteButtonUi() {
        if (muteIcon) muteIcon.textContent = isMuted ? '🔇' : '🔊';
        if (muteText) muteText.textContent = isMuted ? 'Suara Senyap' : 'Suara Aktif';
        if (muteButton) {
            if (isMuted) {
                muteButton.style.opacity = '0.65';
            } else {
                muteButton.style.opacity = '1';
            }
        }
    }

    if (muteButton) {
        updateMuteButtonUi();
        muteButton.addEventListener('click', () => {
            isMuted = !isMuted;
            try {
                window.localStorage.setItem(DASHBOARD_SOUND_MUTED_KEY, String(isMuted));
            } catch (e) {}
            updateMuteButtonUi();
            if (!isMuted) {
                playNotificationSound();
            }
        });
    }

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
            const printButton = event.target.closest('[data-order-print]');
            if (printButton) {
                const orderNumber = printButton.dataset.orderPrint || '';
                if (!orderNumber) {
                    return;
                }

                const originalLabel = printButton.textContent;
                printButton.disabled = true;
                printButton.textContent = 'Memuat...';

                try {
                    const fullOrder = await AdminStore.api.fetchOrderDetail(orderNumber);
                    AdminUi.printReceipt(fullOrder);
                } catch (error) {
                    await showAdminAlert('Rincian Pesanan', error.message || 'Gagal mengambil rincian pesanan untuk dicetak.');
                } finally {
                    printButton.disabled = false;
                    printButton.textContent = originalLabel;
                }
                return;
            }

            const payButton = event.target.closest('[data-order-pay]');
            if (payButton) {
                const orderNumber = payButton.dataset.orderPay || '';
                if (!orderNumber) return;

                const confirmed = await showAdminConfirm(
                    'Konfirmasi Pelunasan',
                    `Konfirmasi pembayaran lunas untuk pesanan ${orderNumber}?`
                );
                if (!confirmed) return;

                const originalLabel = payButton.textContent;
                payButton.disabled = true;
                payButton.textContent = 'Memproses...';

                try {
                    await AdminStore.api.updateOrderPaymentStatus(orderNumber, 'paid');
                    const order = orders.find((item) => item.orderNumber === orderNumber);
                    if (order) {
                        order.paymentStatus = 'paid';
                    }
                    renderTransactionList(transactionList, orders);
                } catch (error) {
                    payButton.disabled = false;
                    payButton.textContent = originalLabel;
                    await showAdminAlert('Gagal Memperbarui', error.message || 'Gagal memperbarui status pembayaran.');
                }
                return;
            }

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

        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                searchQuery = String(event.target.value || '').trim().toUpperCase();
                renderTransactionList(transactionList, orders);
            });
        }

        clearButton?.addEventListener('click', async () => {
            const activeOrders = orders.filter((transaction) => {
                const status = String(transaction.status || 'received').toLowerCase();
                return status !== 'done' && status !== 'cancelled';
            });

            if (!activeOrders.length) {
                return;
            }

            const confirmed = await showAdminConfirm(
                'Bersihkan Dashboard',
                `Clear transaksi akan mengosongkan seluruh (${activeOrders.length}) daftar transaksi aktif di dashboard untuk SEMUA perangkat. Lanjutkan?`
            );
            if (!confirmed) {
                return;
            }

            const orderNumbers = activeOrders
                .map((order) => order?.orderNumber)
                .filter(Boolean);

            if (!orderNumbers.length) {
                return;
            }

            const originalText = clearButton.textContent;
            clearButton.disabled = true;
            clearButton.textContent = 'Membersihkan...';

            try {
                await AdminStore.api.clearOrders(orderNumbers);
                orderNumbers.forEach((orderNumber) => {
                    const order = orders.find((o) => o.orderNumber === orderNumber);
                    if (order) {
                        order.status = 'done';
                    }
                });
                renderTransactionList(transactionList, orders);
                syncClearButtonState(clearButton, orders);
            } catch (error) {
                await showAdminAlert('Gagal Membersihkan', error.message || 'Gagal membersihkan transaksi di database.');
            } finally {
                clearButton.disabled = false;
                clearButton.textContent = originalText;
            }
        });

        // Set up auto-polling every 5 seconds to load new orders/status updates
        const pollInterval = window.setInterval(async () => {
            try {
                const freshOrders = await AdminStore.api.fetchOrders();
                
                // Check if any genuinely new orders have arrived since last load
                const oldOrderNumbers = new Set(orders.map(o => o.orderNumber));
                const newlyAddedOrders = freshOrders.filter(o => o?.orderNumber && !oldOrderNumbers.has(o.orderNumber));
                
                if (newlyAddedOrders.length > 0) {
                    newlyAddedOrders.forEach(o => {
                        newOrderNumbers.add(o.orderNumber);
                        window.setTimeout(() => {
                            newOrderNumbers.delete(o.orderNumber);
                            const el = document.querySelector(`[data-order-card="${o.orderNumber}"]`);
                            if (el) {
                                el.classList.remove('is-new');
                            }
                        }, 8000);
                    });
                    
                    playNotificationSound();
                }
                
                // Check if any order's status, paymentStatus, or orderNumber has changed
                const hasChanged = freshOrders.length !== orders.length || freshOrders.some((newOrder, index) => {
                    const oldOrder = orders[index];
                    return !oldOrder || 
                           newOrder.status !== oldOrder.status || 
                           newOrder.paymentStatus !== oldOrder.paymentStatus ||
                           newOrder.orderNumber !== oldOrder.orderNumber;
                });

                if (hasChanged) {
                    orders.length = 0;
                    orders.push(...freshOrders);
                    renderTransactionList(transactionList, orders);
                    syncClearButtonState(clearButton, orders);
                }
            } catch (pollError) {
                console.error("Gagal memperbarui pesanan secara berkala:", pollError);
            }
        }, 5000);

        window.addEventListener('beforeunload', () => {
            window.clearInterval(pollInterval);
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
    const isSearchResult = typeof searchQuery !== 'undefined' && searchQuery;

    if (!visibleOrders.length) {
        container.innerHTML = `
            <div class="admin-empty-state">
                <strong>${isSearchResult ? 'Pesanan tidak ditemukan' : 'Dashboard transaksi kosong'}</strong>
                <p>${isSearchResult ? 'Periksa kembali kode pesanan atau nama pelanggan yang Anda cari.' : 'Daftar transaksi di dashboard sudah dibersihkan. Data lengkapnya tetap ada di halaman laporan.'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = visibleOrders.map((transaction) => {
        const transactionNote = buildTransactionNote(transaction);
        const hasNote = transactionNote !== '-' && transactionNote.trim() !== 'Tidak ada catatan tambahan.';
        const transactionItemsMarkup = renderTransactionItems(transaction);

        const paymentMethodLabel = String(transaction.paymentMethod || 'cash').toUpperCase();
        let paymentStatusLabel = '';
        let paymentStatusClass = '';
        
        if (paymentMethodLabel === 'QRIS') {
            const status = String(transaction.paymentStatus || 'pending').toLowerCase();
            if (status === 'paid') {
                paymentStatusLabel = 'Sudah Bayar';
                paymentStatusClass = 'payment-status-paid';
            } else if (status === 'failed') {
                paymentStatusLabel = 'Gagal';
                paymentStatusClass = 'payment-status-failed';
            } else {
                paymentStatusLabel = 'Belum Bayar';
                paymentStatusClass = 'payment-status-pending';
            }
        } else {
            // Cash payment
            const status = String(transaction.paymentStatus || 'pending').toLowerCase();
            if (status === 'paid') {
                paymentStatusLabel = 'Lunas (Tunai)';
                paymentStatusClass = 'payment-status-paid';
            } else {
                paymentStatusLabel = 'Belum Lunas';
                paymentStatusClass = 'payment-status-pending';
            }
        }

        const isNewClass = newOrderNumbers.has(transaction.orderNumber) ? ' is-new' : '';
        return `
            <article class="admin-transaction-card${isNewClass}" data-order-card="${transaction.orderNumber}">
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
                    <p>
                        <strong>${escapeHtml(paymentMethodLabel)}</strong>
                        <span class="admin-payment-status-badge ${paymentStatusClass}">${escapeHtml(paymentStatusLabel)}</span>
                    </p>
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
    const activeOrders = orders.filter((transaction) => {
        const status = String(transaction.status || 'received').toLowerCase();
        return status !== 'done' && status !== 'cancelled';
    });

    if (typeof searchQuery !== 'undefined' && searchQuery) {
        return activeOrders.filter((transaction) => 
            String(transaction.orderNumber || '').toUpperCase().includes(searchQuery) ||
            String(transaction.customerName || '').toUpperCase().includes(searchQuery)
        );
    }

    const hiddenOrderNumbers = new Set(getClearedDashboardOrderNumbers());
    return activeOrders
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
    const paymentStatus = String(transaction.paymentStatus || 'pending').toLowerCase();
    const orderNumber = escapeHtml(transaction.orderNumber || '');

    let statusButton = '';
    if (status === 'received') {
        statusButton = `<button type="button" class="admin-transaction-action is-accept" data-order-action="advance" data-order-number="${orderNumber}">Proses</button>`;
    } else if (status === 'preparing') {
        statusButton = `<button type="button" class="admin-transaction-action is-accept" data-order-action="advance" data-order-number="${orderNumber}">Siap Diambil</button>`;
    } else if (status === 'ready') {
        statusButton = `<button type="button" class="admin-transaction-action is-accept" data-order-action="advance" data-order-number="${orderNumber}">Selesai</button>`;
    }

    let payButton = '';
    if (paymentStatus !== 'paid' && status !== 'cancelled') {
        payButton = `<button type="button" class="admin-transaction-action is-pay" data-order-pay="${orderNumber}">Selesai Bayar</button>`;
    }

    return `
        <div class="admin-transaction-action-group">
            <button type="button" class="admin-transaction-action is-print" data-order-print="${orderNumber}">Cetak Struk</button>
            ${payButton}
            ${statusButton}
        </div>
    `;
}
