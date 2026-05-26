document.addEventListener('DOMContentLoaded', async () => {
    await AdminStore.waitUntilReady?.();
    if (!AdminStore.hasAdminSession?.()) return;

    const elements = {
        tableBody: document.getElementById('reportTableBody'),
        revenueTotal: document.getElementById('reportRevenueTotal'),
        transactionCount: document.getElementById('reportTransactionCount'),
        averageTransaction: document.getElementById('reportAverageTransaction'),
        monthFilter: document.getElementById('reportMonthFilter'),
        exportButton: document.getElementById('reportExportButton'),
        periodCard: document.getElementById('reportPeriodCard'),
        detailModal: document.getElementById('reportDetailModal'),
        detailCloseButton: document.getElementById('reportDetailCloseButton'),
        detailTitle: document.getElementById('reportDetailTitle'),
        detailSubtitle: document.getElementById('reportDetailSubtitle'),
        detailGrid: document.getElementById('reportDetailGrid'),
        detailItems: document.getElementById('reportDetailItems'),
        detailNote: document.getElementById('reportDetailNote'),
    };

    if (!elements.tableBody || !elements.monthFilter) return;

    try {
        const allTransactions = await AdminStore.api.fetchReportTransactions();
        const monthOptions = getMonthOptions(allTransactions);
        const defaultMonth = monthOptions[0]?.value || getMonthValue(new Date().toISOString().slice(0, 10));

        populateMonthFilter(elements.monthFilter, monthOptions, defaultMonth);
        await renderCurrentMonth(elements, defaultMonth);

        elements.monthFilter.addEventListener('change', async (event) => {
            await renderCurrentMonth(elements, event.target.value);
        });

        elements.exportButton?.addEventListener('click', () => {
            void (async () => {
                const selectedMonth = elements.monthFilter.value;
                const filteredTransactions = await AdminStore.api.fetchReportTransactions(selectedMonth);
                exportTransactionsToCsv(filteredTransactions, selectedMonth);
            })();
        });

        elements.tableBody.addEventListener('click', (event) => {
            const detailButton = event.target.closest('[data-report-detail-id]');
            if (!detailButton) return;

            const transactionId = Number(detailButton.dataset.reportDetailId);
            const transaction = elements.currentTransactions?.find((item) => item.id === transactionId);
            if (!transaction) return;

            openDetailModal(elements, transaction);
        });

        elements.detailCloseButton?.addEventListener('click', () => closeDetailModal(elements));
        elements.detailModal?.addEventListener('click', (event) => {
            if (event.target === elements.detailModal) {
                closeDetailModal(elements);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !elements.detailModal?.classList.contains('is-hidden')) {
                closeDetailModal(elements);
            }
        });


    } catch (error) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="admin-empty-state">
                        <strong>Gagal memuat laporan</strong>
                        <p>${escapeHtml(error.message || 'Periksa koneksi API dan database.')}</p>
                    </div>
                </td>
            </tr>
        `;
    }
});

async function renderCurrentMonth(elements, monthValue) {
    const [filteredTransactions, summary] = await Promise.all([
        AdminStore.api.fetchReportTransactions(monthValue),
        AdminStore.api.fetchReportSummary(monthValue),
    ]);

    elements.currentTransactions = filteredTransactions;
    updateSummaryCards(elements, summary);
    renderPeriodCard(elements.periodCard, monthValue, summary);
    renderTransactionTable(elements.tableBody, filteredTransactions);
    renderRevenueChart(filteredTransactions, monthValue);
}

let revenueChartInstance = null;

function renderRevenueChart(transactions, monthValue) {
    const container = document.getElementById('revenueChart');
    if (!container) return;

    // Group transactions by date
    const dailyMap = new Map();
    transactions.forEach((tx) => {
        const dateStr = tx.date || tx.createdAt?.slice(0, 10);
        if (!dateStr) return;
        const total = Number(tx.total || 0);
        dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + total);
    });

    // Sort dates chronologically
    const sortedDates = Array.from(dailyMap.keys()).sort();
    
    // Map dates to localized category labels (e.g., "25 Mei")
    const categories = sortedDates.map((dateStr) => {
        const d = new Date(`${dateStr}T00:00`);
        return Number.isNaN(d.getTime()) 
            ? dateStr.slice(8, 10) 
            : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(d);
    });
    
    const seriesData = sortedDates.map((dateStr) => dailyMap.get(dateStr));

    const accentColor = '#34d399'; // Green accents for report
    const gridColor = 'rgba(255, 255, 255, 0.06)';
    const textColor = '#8a8a8a';

    const options = {
        series: [{
            name: 'Pemasukan',
            data: seriesData
        }],
        chart: {
            type: 'area',
            height: 310,
            toolbar: { show: false },
            zoom: { enabled: false },
            background: 'transparent',
            fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 600,
                animateGradually: { enabled: true, delay: 100 },
                dynamicAnimation: { enabled: true, speed: 250 }
            }
        },
        colors: [accentColor],
        stroke: {
            curve: 'smooth',
            width: 3.5,
            lineCap: 'round'
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.45,
                opacityTo: 0.01,
                stops: [0, 95]
            }
        },
        grid: {
            borderColor: gridColor,
            strokeDashArray: 5,
            padding: { top: 10, bottom: 0, left: 18, right: 18 }
        },
        xaxis: {
            categories: categories,
            labels: {
                style: {
                    colors: textColor,
                    fontSize: '11px',
                    fontWeight: 600
                }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                formatter: (val) => AdminStore.formatAdminCurrency(val),
                style: {
                    colors: textColor,
                    fontSize: '11px',
                    fontWeight: 600
                }
            }
        },
        tooltip: {
            theme: 'dark',
            x: { show: true },
            y: {
                formatter: (val) => AdminStore.formatAdminCurrency(val)
            }
        },
        dataLabels: { enabled: false }
    };

    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }

    // Initialize ApexCharts instance
    revenueChartInstance = new ApexCharts(container, options);
    revenueChartInstance.render();
}

function updateSummaryCards(elements, summary) {
    if (elements.revenueTotal) {
        elements.revenueTotal.textContent = AdminStore.formatAdminCurrency(summary.totalRevenue);
    }

    if (elements.transactionCount) {
        elements.transactionCount.textContent = String(summary.transactionCount);
    }

    if (elements.averageTransaction) {
        elements.averageTransaction.textContent = AdminStore.formatAdminCurrency(summary.averageRevenue);
    }
}

function renderPeriodCard(container, monthValue, summary) {
    if (!container) return;

    container.innerHTML = `
        <article class="admin-report-period-item">
            <span>Periode Aktif</span>
            <strong>${escapeHtml(formatMonthLabel(monthValue))}</strong>
        </article>
        <article class="admin-report-period-item">
            <span>Transaksi Bulan Ini</span>
            <strong>${summary.transactionCount} transaksi</strong>
        </article>
        <article class="admin-report-period-item">
            <span>Nilai Tertinggi</span>
            <strong>${AdminStore.formatAdminCurrency(summary.highestRevenue)}</strong>
        </article>
    `;
}

function renderTransactionTable(tableBody, transactions) {
    if (!transactions.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="admin-empty-state">
                        <strong>Belum ada transaksi pada periode ini</strong>
                        <p>Coba pilih bulan lain atau tunggu data transaksi berikutnya.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = transactions.map((transaction) => `
        <tr>
            <td class="admin-table-title">${escapeHtml(transaction.code || '-')}</td>
            <td>${escapeHtml(formatDateTime(transaction.date, transaction.time))}</td>
            <td>${escapeHtml(transaction.customer || '-')}</td>
            <td>${AdminStore.formatAdminCurrency(transaction.total)}</td>
            <td>
                <button type="button" class="admin-table-button" data-report-detail-id="${transaction.id}">
                    Detail
                </button>
            </td>
        </tr>
    `).join('');
}

function populateMonthFilter(select, options, selectedValue) {
    const finalOptions = options.length
        ? options
        : [{ value: selectedValue, label: formatMonthLabel(selectedValue) }];

    select.innerHTML = finalOptions.map((option) => `
        <option value="${escapeHtml(option.value)}"${option.value === selectedValue ? ' selected' : ''}>
            ${escapeHtml(option.label)}
        </option>
    `).join('');
}

function getMonthOptions(transactions) {
    const monthMap = new Map();

    transactions.forEach((transaction) => {
        const monthValue = getMonthValue(transaction.date);
        if (!monthMap.has(monthValue)) {
            monthMap.set(monthValue, formatMonthLabel(monthValue));
        }
    });

    return Array.from(monthMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([value, label]) => ({ value, label }));
}

async function openDetailModal(elements, transaction) {
    if (!elements.detailModal) return;

    let detail = transaction;

    try {
        detail = await AdminStore.api.fetchOrderDetail(transaction.code);
    } catch (error) {
        detail = transaction;
    }

    if (elements.detailTitle) {
        elements.detailTitle.textContent = `Detail ${detail.code || detail.orderNumber || 'Transaksi'}`;
    }

    if (elements.detailSubtitle) {
        const detailDate = detail.date || detail.createdAt?.slice(0, 10);
        const detailTime = detail.time || detail.createdAt?.slice(11, 16);
        elements.detailSubtitle.textContent = `${formatDateTime(detailDate, detailTime)} | ${detail.status || '-'}`;
    }

    if (elements.detailGrid) {
        elements.detailGrid.innerHTML = [
            ['Pelanggan', detail.customer || detail.customerName],
            ['Meja / Tipe', detail.table || detail.tableName || detail.tableNumber],
            ['Pembayaran', detail.payment || detail.paymentMethod],
            ['Status', detail.status],
            ['Total', AdminStore.formatAdminCurrency(Number(detail.total || 0))],
            ['Kode Transaksi', detail.code || detail.orderNumber],
        ].map(([label, value]) => {
            const isTable = label === 'Meja / Tipe';
            const valueContent = isTable 
                ? `<span class="admin-table-badge">${escapeHtml(value || '-')}</span>`
                : escapeHtml(value || '-');

            return `
                <div class="admin-report-detail-item">
                    <span>${escapeHtml(label)}</span>
                    <strong>${valueContent}</strong>
                </div>
            `;
        }).join('');
    }

    if (elements.detailItems) {
        const items = Array.isArray(detail.items) && detail.items.length
            ? detail.items.map((item) => {
                if (typeof item === 'string') {
                    return item;
                }

                return item.menuName || item.name || '-';
            })
            : ['-'];
        elements.detailItems.innerHTML = items
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join('');
    }

    if (elements.detailNote) {
        const extraNote = buildTransactionExtraNote(detail);

        if (extraNote) {
            elements.detailNote.innerHTML = `<strong>⚠ PENTING (Catatan):</strong> ${escapeHtml(extraNote)}`;
            elements.detailNote.classList.add('has-active-note');
            elements.detailNote.hidden = false;
        } else {
            elements.detailNote.innerHTML = '';
            elements.detailNote.classList.remove('has-active-note');
            elements.detailNote.hidden = true;
        }
    }

    elements.detailModal.classList.remove('is-hidden');
    elements.detailModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-modal-open');
}

function closeDetailModal(elements) {
    if (!elements.detailModal) return;

    elements.detailModal.classList.add('is-hidden');
    elements.detailModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-modal-open');
}

function exportTransactionsToCsv(transactions, monthValue) {
    const rows = [
        ['Kode', 'Tanggal', 'Waktu', 'Pelanggan', 'Meja', 'Pembayaran', 'Status', 'Item', 'Catatan', 'Total'],
        ...transactions.map((transaction) => [
            transaction.code || '-',
            transaction.date || '-',
            transaction.time || '-',
            transaction.customer || '-',
            transaction.table || '-',
            transaction.payment || '-',
            transaction.status || '-',
            Array.isArray(transaction.items) ? transaction.items.join(', ') : '-',
            buildTransactionNote(transaction),
            Number(transaction.total || 0),
        ]),
    ];

    const csvContent = rows
        .map((row) => row.map(toCsvCell).join(','))
        .join('\r\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fileMonth = monthValue || getMonthValue(new Date().toISOString().slice(0, 10));

    link.href = URL.createObjectURL(blob);
    link.download = `laporan-transaksi-${fileMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function toCsvCell(value) {
    const safeValue = String(value ?? '').replaceAll('"', '""');
    return `"${safeValue}"`;
}

function getMonthValue(dateValue) {
    return String(dateValue || '').slice(0, 7);
}

function formatMonthLabel(monthValue) {
    if (!monthValue || !monthValue.includes('-')) return 'Periode tidak diketahui';

    const [year, month] = monthValue.split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, 1);

    return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatDateTime(dateValue, timeValue) {
    if (!dateValue) return '-';

    const date = new Date(`${dateValue}T00:00`);
    const formattedDate = Number.isNaN(date.getTime())
        ? dateValue
        : new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(date);

    return timeValue && timeValue !== '-' ? `${formattedDate} | ${timeValue}` : formattedDate;
}

function buildTransactionNote(transaction) {
    const notes = collectTransactionNotes(transaction, { includeItemNames: true });

    return notes.length ? notes.join(' | ') : 'Tidak ada catatan tambahan.';
}

function buildTransactionExtraNote(transaction) {
    const uniqueNotes = [...new Set(collectTransactionNotes(transaction))];
    return uniqueNotes.length ? uniqueNotes.join(' | ') : '';
}

function collectTransactionNotes(transaction, { includeItemNames = false } = {}) {
    const itemNotes = Array.isArray(transaction.items)
        ? transaction.items
            .map((item) => {
                if (typeof item === 'string') {
                    return '';
                }

                const note = String(item?.note || '').trim();
                if (!note) {
                    return '';
                }

                if (!includeItemNames) {
                    return note;
                }

                const itemName = String(item?.menuName || item?.name || '').trim();
                return itemName ? `${itemName}: ${note}` : note;
            })
            .filter(Boolean)
        : [];

    return [
        transaction.note,
        transaction.baristaNote,
        transaction.itemNotes,
        ...itemNotes,
    ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
