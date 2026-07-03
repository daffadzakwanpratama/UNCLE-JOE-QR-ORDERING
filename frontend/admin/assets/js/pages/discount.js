class DiscountPage {
    constructor() {
        this.tableBody = document.getElementById('discountTableBody');
        this.typeFilter = document.getElementById('discountTypeFilter');
        this.statusFilter = document.getElementById('discountStatusFilter');
        this.totalCount = document.getElementById('discountTotalCount');
        this.activeCount = document.getElementById('discountActiveCount');
        this.usedCount = document.getElementById('discountUsedCount');
        this.modal = document.getElementById('discountModal');
        this.modalTitle = document.getElementById('discountModalTitle');
        this.form = document.getElementById('discountForm');
        this.formError = document.getElementById('discountFormError');
        this.discounts = [];
    }

    async init() {
        await this.loadData();
        this.cacheInputs();
        this.render();
        this.bindEvents();
    }

    cacheInputs() {
        this.discountIdInput = document.getElementById('discountId');
        this.discountNameInput = document.getElementById('discountName');
        this.discountCodeInput = document.getElementById('discountCode');
        this.discountTypeInput = document.getElementById('discountType');
        this.discountValueTypeInput = document.getElementById('discountValueType');
        this.discountValueInput = document.getElementById('discountValue');
        this.discountMinPurchaseInput = document.getElementById('discountMinPurchase');
        this.discountMaxDiscountInput = document.getElementById('discountMaxDiscount');
        this.discountUsageLimitInput = document.getElementById('discountUsageLimit');
        this.discountStartDateInput = document.getElementById('discountStartDate');
        this.discountEndDateInput = document.getElementById('discountEndDate');
        this.discountDescriptionInput = document.getElementById('discountDescription');
        this.discountActiveInput = document.getElementById('discountActive');
    }

    async loadData() {
        this.discounts = await AdminStore.api.fetchDiscounts();
    }

    bindEvents() {
        document.getElementById('addDiscountButton')?.addEventListener('click', () => this.openModal());
        document.getElementById('closeDiscountModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancelDiscountButton')?.addEventListener('click', () => this.closeModal());
        this.typeFilter?.addEventListener('change', () => this.renderTable());
        this.statusFilter?.addEventListener('change', () => this.renderTable());

        this.modal?.addEventListener('click', (event) => {
            if (event.target === this.modal) this.closeModal();
        });

        this.form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveDiscount();
        });

        this.tableBody?.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-action]');
            if (!actionButton) return;

            const discountId = Number(actionButton.dataset.id);
            const action = actionButton.dataset.action;

            if (action === 'edit') {
                this.openModal(discountId);
                return;
            }

            if (action === 'delete') {
                this.deleteDiscount(discountId);
            }
        });
    }

    render() {
        this.renderSummary();
        this.renderTable();
    }

    renderSummary() {
        const today = this.getLocalDateString(new Date());
        const activeDiscounts = this.discounts.filter((discount) => {
            const startDateOnly = discount.startDate ? this.getLocalDateString(discount.startDate) : null;
            const endDateOnly = discount.endDate ? this.getLocalDateString(discount.endDate) : null;

            const isActive = Boolean(Number(discount.isActive) || discount.isActive);
            const isExpired = endDateOnly && endDateOnly < today;
            const isNotStarted = startDateOnly && startDateOnly > today;
            const isQuotaFull = Number(discount.usageLimit || 0) > 0 && Number(discount.usedCount || 0) >= Number(discount.usageLimit || 0);

            return isActive && !isExpired && !isNotStarted && !isQuotaFull;
        }).length;

        const totalUsed = this.discounts.reduce((sum, discount) => sum + Number(discount.usedCount || 0), 0);
        if (this.totalCount) this.totalCount.textContent = String(this.discounts.length);
        if (this.activeCount) this.activeCount.textContent = String(activeDiscounts);
        if (this.usedCount) this.usedCount.textContent = String(totalUsed);
    }

    getFilteredDiscounts() {
        const type = this.typeFilter?.value || 'all';
        const status = this.statusFilter?.value || 'all';
        const today = this.getLocalDateString(new Date());

        return this.discounts.filter((discount) => {
            const startDateOnly = discount.startDate ? this.getLocalDateString(discount.startDate) : null;
            const endDateOnly = discount.endDate ? this.getLocalDateString(discount.endDate) : null;

            const isActive = Boolean(Number(discount.isActive) || discount.isActive);
            const isExpired = endDateOnly && endDateOnly < today;
            const isNotStarted = startDateOnly && startDateOnly > today;
            const isQuotaFull = Number(discount.usageLimit || 0) > 0 && Number(discount.usedCount || 0) >= Number(discount.usageLimit || 0);

            const isReallyActive = isActive && !isExpired && !isNotStarted && !isQuotaFull;

            if (type !== 'all' && discount.type !== type) return false;
            
            if (status === 'active' && !isReallyActive) return false;
            if (status === 'inactive' && isActive) return false;
            if (status === 'expired' && !isExpired) return false;
            return true;
        });
    }

    renderTable() {
        if (!this.tableBody) return;

        const discounts = this.getFilteredDiscounts();
        if (!discounts.length) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="admin-empty-state">
                            <strong>Belum ada kode promo</strong>
                            <p>Tambahkan promo baru atau ubah filter.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const today = this.getLocalDateString(new Date());

        this.tableBody.innerHTML = discounts.map((discount) => {
            const startDateOnly = discount.startDate ? this.getLocalDateString(discount.startDate) : null;
            const endDateOnly = discount.endDate ? this.getLocalDateString(discount.endDate) : null;

            const isActive = Boolean(Number(discount.isActive) || discount.isActive);
            const isExpired = endDateOnly && endDateOnly < today;
            const isNotStarted = startDateOnly && startDateOnly > today;
            const isQuotaFull = Number(discount.usageLimit || 0) > 0 && Number(discount.usedCount || 0) >= Number(discount.usageLimit || 0);

            let statusLabel = 'Aktif';
            let statusClass = 'is-success';

            if (!isActive) {
                statusLabel = 'Nonaktif';
                statusClass = 'is-muted';
            } else if (isNotStarted) {
                statusLabel = 'Terjadwal';
                statusClass = 'is-warning';
            } else if (isExpired) {
                statusLabel = 'Kedaluwarsa';
                statusClass = 'is-muted';
            } else if (isQuotaFull) {
                statusLabel = 'Habis';
                statusClass = 'is-muted';
            }

            return `
                <tr>
                    <td class="admin-table-title">${escapeHtml(discount.code)}</td>
                    <td>${escapeHtml(discount.name)}</td>
                    <td>${escapeHtml(discount.type)}</td>
                    <td>${escapeHtml(this.formatDiscountValue(discount))}</td>
                    <td>${escapeHtml(this.formatPeriod(discount.startDate, discount.endDate))}</td>
                    <td>${Number(discount.usedCount || 0)} / ${Number(discount.usageLimit || 0)}</td>
                    <td><span class="admin-status-badge ${statusClass}">${statusLabel}</span></td>
                    <td>
                        <div class="admin-action-group">
                            <button type="button" class="admin-table-button" data-action="edit" data-id="${discount.id}">Edit</button>
                            <button type="button" class="admin-table-button is-danger" data-action="delete" data-id="${discount.id}">Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    openModal(discountId = null) {
        this.form?.reset();
        this.formError.textContent = '';
        this.discountIdInput.value = '';

        if (discountId) {
            const discount = this.discounts.find((item) => item.id === discountId);
            if (!discount) return;

            this.modalTitle.textContent = 'Edit Kode Diskon';
            this.discountIdInput.value = String(discount.id);
            this.discountNameInput.value = discount.name || '';
            this.discountCodeInput.value = discount.code || '';
            this.discountTypeInput.value = discount.type || 'voucher';
            this.discountValueTypeInput.value = discount.discountType || 'fixed';
            this.discountValueInput.value = String(Number(discount.discountValue || 0));
            this.discountMinPurchaseInput.value = String(Number(discount.minPurchase || 0));
            this.discountMaxDiscountInput.value = String(Number(discount.maxDiscount || 0));
            this.discountUsageLimitInput.value = String(Number(discount.usageLimit || 0));
            this.discountStartDateInput.value = discount.startDate ? this.getLocalDateString(discount.startDate) : '';
            this.discountEndDateInput.value = discount.endDate ? this.getLocalDateString(discount.endDate) : '';
            this.discountDescriptionInput.value = discount.description || '';
            this.discountActiveInput.checked = Boolean(Number(discount.isActive) || discount.isActive);
        } else {
            this.modalTitle.textContent = 'Tambah Kode Diskon';
            this.discountActiveInput.checked = true;
        }

        this.modal?.classList.remove('is-hidden');
        document.body.classList.add('admin-modal-open');
        this.discountNameInput?.focus();
    }

    closeModal() {
        this.modal?.classList.add('is-hidden');
        document.body.classList.remove('admin-modal-open');
    }

    async saveDiscount() {
        const id = Number(this.discountIdInput.value);
        const payload = {
            name: this.discountNameInput.value.trim(),
            code: this.discountCodeInput.value.trim().toUpperCase(),
            type: this.discountTypeInput.value,
            discountType: this.discountValueTypeInput.value,
            discountValue: Number(this.discountValueInput.value || 0),
            minPurchase: Number(this.discountMinPurchaseInput.value || 0),
            maxDiscount: Number(this.discountMaxDiscountInput.value || 0),
            usageLimit: Number(this.discountUsageLimitInput.value || 0),
            usedCount: 0,
            startDate: this.discountStartDateInput.value || null,
            endDate: this.discountEndDateInput.value || null,
            description: this.discountDescriptionInput.value.trim(),
            isActive: this.discountActiveInput.checked,
        };

        if (!payload.name || !payload.code) {
            this.formError.textContent = 'Nama dan kode promo wajib diisi.';
            return;
        }

        if (id) {
            const existing = this.discounts.find((item) => item.id === id);
            payload.usedCount = Number(existing?.usedCount || 0);
        }

        try {
            if (id) {
                await AdminStore.api.updateDiscount(id, payload);
            } else {
                await AdminStore.api.createDiscount(payload);
            }

            await this.loadData();
            this.render();
            this.closeModal();
        } catch (error) {
            this.formError.textContent = error.message || 'Gagal menyimpan diskon.';
        }
    }

    async deleteDiscount(discountId) {
        const confirmed = window.confirm('Hapus kode promo ini?');
        if (!confirmed) return;

        await AdminStore.api.deleteDiscount(discountId);
        await this.loadData();
        this.render();
    }

    formatDiscountValue(discount) {
        if (discount.discountType === 'percent') {
            return `${Number(discount.discountValue || 0)}%`;
        }

        return AdminStore.formatAdminCurrency(Number(discount.discountValue || 0));
    }

    getLocalDateString(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatDateFriendly(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = d.getDate();
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
            'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
        ];
        const monthLabel = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${monthLabel} ${year}`;
    }

    formatPeriod(startDate, endDate) {
        if (!startDate && !endDate) return '-';
        const startFormatted = startDate ? this.formatDateFriendly(startDate) : '-';
        const endFormatted = endDate ? this.formatDateFriendly(endDate) : '-';
        return `${startFormatted} s/d ${endFormatted}`;
    }

}

document.addEventListener('DOMContentLoaded', () => {
    void (async () => {
        await AdminStore.waitUntilReady?.();
        if (!AdminStore.hasAdminSession?.()) return;

        return new DiscountPage().init();
    })().catch((error) => {
        const tableBody = document.getElementById('discountTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="admin-empty-state">
                        <strong>Gagal memuat diskon</strong>
                        <p>${error.message || 'Periksa koneksi API dan database.'}</p>
                    </div>
                </td>
            </tr>
        `;
    });
});
