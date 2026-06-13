class BannerPage {
    constructor() {
        this.tableBody = document.getElementById('bannerTableBody');
        this.statusFilter = document.getElementById('bannerStatusFilter');
        this.totalCount = document.getElementById('bannerTotalCount');
        this.activeCount = document.getElementById('bannerActiveCount');
        this.inactiveCount = document.getElementById('bannerInactiveCount');
        this.modal = document.getElementById('bannerModal');
        this.modalTitle = document.getElementById('bannerModalTitle');
        this.form = document.getElementById('bannerForm');
        this.formError = document.getElementById('bannerFormError');
        this.bannerIdInput = document.getElementById('bannerId');
        this.bannerTitleInput = document.getElementById('bannerTitle');
        this.bannerSubtitleInput = document.getElementById('bannerSubtitle');
        this.bannerLinkInput = document.getElementById('bannerLink');
        this.bannerImageInput = document.getElementById('bannerImage');
        this.bannerImagePreview = document.getElementById('bannerImagePreview');
        this.bannerStartDateInput = document.getElementById('bannerStartDate');
        this.bannerEndDateInput = document.getElementById('bannerEndDate');
        this.bannerSortOrderInput = document.getElementById('bannerSortOrder');
        this.bannerActiveInput = document.getElementById('bannerActive');
        this.banners = [];
        this.currentImageData = '';
    }

    async init() {
        await this.loadData();
        this.render();
        this.bindEvents();
    }

    async loadData() {
        this.banners = await AdminStore.api.fetchBanners();
    }

    bindEvents() {
        document.getElementById('addBannerButton')?.addEventListener('click', () => this.openModal());
        document.getElementById('closeBannerModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBannerButton')?.addEventListener('click', () => this.closeModal());
        this.statusFilter?.addEventListener('change', () => this.renderTable());
        this.bannerImageInput?.addEventListener('change', (event) => this.handleImageChange(event));

        this.modal?.addEventListener('click', (event) => {
            if (event.target === this.modal) this.closeModal();
        });

        this.form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveBanner();
        });

        this.tableBody?.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-action]');
            if (!actionButton) return;

            const bannerId = Number(actionButton.dataset.id);
            const action = actionButton.dataset.action;

            if (action === 'edit') {
                this.openModal(bannerId);
                return;
            }

            if (action === 'delete') {
                this.deleteBanner(bannerId);
            }
        });
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

    getBannerStatus(banner) {
        const isActive = Boolean(Number(banner.isActive) || banner.isActive);
        if (!isActive) return 'inactive';

        const todayStr = this.getLocalDateString(new Date());
        const startDateStr = banner.startDate ? this.getLocalDateString(banner.startDate) : null;
        const endDateStr = banner.endDate ? this.getLocalDateString(banner.endDate) : null;

        if (startDateStr && startDateStr > todayStr) {
            return 'scheduled';
        }
        if (endDateStr && endDateStr < todayStr) {
            return 'inactive';
        }
        return 'active';
    }

    render() {
        this.renderSummary();
        this.renderTable();
    }

    renderSummary() {
        const activeBanners = this.banners.filter((banner) => this.getBannerStatus(banner) === 'active').length;
        if (this.totalCount) this.totalCount.textContent = String(this.banners.length);
        if (this.activeCount) this.activeCount.textContent = String(activeBanners);
        if (this.inactiveCount) this.inactiveCount.textContent = String(this.banners.length - activeBanners);
    }

    getFilteredBanners() {
        const selectedStatus = this.statusFilter?.value || 'all';

        return this.banners.filter((banner) => {
            const status = this.getBannerStatus(banner);

            if (selectedStatus === 'active') return status === 'active';
            if (selectedStatus === 'inactive') return status === 'inactive';
            if (selectedStatus === 'scheduled') return status === 'scheduled';
            return true;
        });
    }

    renderTable() {
        if (!this.tableBody) return;

        const banners = this.getFilteredBanners();
        if (!banners.length) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="admin-empty-state">
                            <strong>Belum ada banner</strong>
                            <p>Tambahkan banner baru atau ubah filter status.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.tableBody.innerHTML = banners.map((banner) => {
            const status = this.getBannerStatus(banner);
            let statusLabel = 'Aktif';
            let statusClass = 'is-success';

            if (status === 'inactive') {
                statusLabel = 'Nonaktif';
                statusClass = 'is-muted';
            } else if (status === 'scheduled') {
                statusLabel = 'Terjadwal';
                statusClass = 'is-warning';
            }

            return `
                <tr>
                    <td><img class="admin-table-thumb" src="${banner.imageUrl || AdminStore.getMenuPlaceholder('BN')}" alt="${this.escapeHtml(banner.title)}"></td>
                    <td class="admin-table-title">${this.escapeHtml(banner.title)}</td>
                    <td>${this.escapeHtml(banner.subtitle || '-')}</td>
                    <td>${this.escapeHtml(this.formatPeriod(banner.startDate, banner.endDate))}</td>
                    <td><span class="admin-status-badge ${statusClass}">${statusLabel}</span></td>
                    <td>
                        <div class="admin-action-group">
                            <button type="button" class="admin-table-button" data-action="edit" data-id="${banner.id}">Edit</button>
                            <button type="button" class="admin-table-button is-danger" data-action="delete" data-id="${banner.id}">Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    openModal(bannerId = null) {
        this.form?.reset();
        this.formError.textContent = '';
        this.bannerIdInput.value = '';
        this.currentImageData = '';

        if (bannerId) {
            const banner = this.banners.find((item) => item.id === bannerId);
            if (!banner) return;

            this.modalTitle.textContent = 'Edit Banner';
            this.bannerIdInput.value = String(banner.id);
            this.bannerTitleInput.value = banner.title || '';
            this.bannerSubtitleInput.value = banner.subtitle || '';
            this.bannerLinkInput.value = banner.linkUrl || '';
            this.bannerStartDateInput.value = banner.startDate || '';
            this.bannerEndDateInput.value = banner.endDate || '';
            this.bannerSortOrderInput.value = String(Number(banner.sortOrder || 1));
            this.bannerActiveInput.checked = Boolean(Number(banner.isActive) || banner.isActive);
            this.currentImageData = banner.imageUrl || '';
        } else {
            this.modalTitle.textContent = 'Tambah Banner';
            this.bannerSortOrderInput.value = '1';
            this.bannerActiveInput.checked = true;
        }

        this.renderImagePreview();
        this.modal?.classList.remove('is-hidden');
        document.body.classList.add('admin-modal-open');
        this.bannerTitleInput?.focus();
    }

    closeModal() {
        this.modal?.classList.add('is-hidden');
        document.body.classList.remove('admin-modal-open');
    }

    async saveBanner() {
        const id = Number(this.bannerIdInput.value);
        const payload = {
            title: this.bannerTitleInput.value.trim(),
            subtitle: this.bannerSubtitleInput.value.trim(),
            linkUrl: this.bannerLinkInput.value.trim(),
            imageUrl: this.currentImageData,
            startDate: this.bannerStartDateInput.value || null,
            endDate: this.bannerEndDateInput.value || null,
            sortOrder: Number(this.bannerSortOrderInput.value || 1),
            isActive: this.bannerActiveInput.checked,
        };

        if (!payload.title) {
            this.formError.textContent = 'Judul banner wajib diisi.';
            return;
        }

        try {
            if (id) {
                await AdminStore.api.updateBanner(id, payload);
            } else {
                await AdminStore.api.createBanner(payload);
            }

            await this.loadData();
            this.render();
            this.closeModal();
        } catch (error) {
            this.formError.textContent = error.message || 'Gagal menyimpan banner.';
        }
    }

    async deleteBanner(bannerId) {
        const confirmed = window.confirm('Hapus banner ini?');
        if (!confirmed) return;

        await AdminStore.api.deleteBanner(bannerId);
        await this.loadData();
        this.render();
    }

    handleImageChange(event) {
        const file = event.target.files?.[0];
        if (!file) {
            this.currentImageData = '';
            this.renderImagePreview();
            return;
        }

        if (!file.type.startsWith('image/')) {
            this.formError.textContent = 'File gambar harus berupa image.';
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            this.currentImageData = typeof reader.result === 'string' ? reader.result : '';
            this.renderImagePreview();
        };
        reader.readAsDataURL(file);
    }

    renderImagePreview() {
        if (!this.bannerImagePreview) return;
        this.bannerImagePreview.src = this.currentImageData || AdminStore.getMenuPlaceholder('BN');
    }

    formatPeriod(startDate, endDate) {
        if (!startDate && !endDate) return '-';
        return `${startDate || '-'} s/d ${endDate || '-'}`;
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    void (async () => {
        await AdminStore.waitUntilReady?.();
        if (!AdminStore.hasAdminSession?.()) return;

        return new BannerPage().init();
    })().catch((error) => {
        const tableBody = document.getElementById('bannerTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="admin-empty-state">
                        <strong>Gagal memuat banner</strong>
                        <p>${error.message || 'Periksa koneksi API dan database.'}</p>
                    </div>
                </td>
            </tr>
        `;
    });
});
