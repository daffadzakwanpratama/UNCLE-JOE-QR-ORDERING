class MenuPage {
    constructor() {
        this.tableBody = document.getElementById('menuTableBody');
        this.categoryFilter = document.getElementById('menuCategoryFilter');
        this.summaryCount = document.getElementById('menuSummaryCount');
        this.availableCount = document.getElementById('menuAvailableCount');
        this.unavailableCount = document.getElementById('menuUnavailableCount');
        this.categoryCount = document.getElementById('menuCategoryCount');
        this.modal = document.getElementById('menuModal');
        this.modalTitle = document.getElementById('menuModalTitle');
        this.form = document.getElementById('menuForm');
        this.formError = document.getElementById('menuFormError');
        this.menuIdInput = document.getElementById('menuId');
        this.menuNameInput = document.getElementById('menuName');
        this.menuCategoryInput = document.getElementById('menuCategory');
        this.menuPriceTypeInput = document.getElementById('menuPriceType');
        this.menuPriceInput = document.getElementById('menuPrice');
        this.menuPriceHotInput = document.getElementById('menuPriceHot');
        this.menuPriceIceInput = document.getElementById('menuPriceIce');
        this.singlePriceField = document.getElementById('singlePriceField');
        this.hotIcePriceFields = document.getElementById('hotIcePriceFields');
        this.menuImageInput = document.getElementById('menuImage');
        this.menuImagePreview = document.getElementById('menuImagePreview');
        this.menuAvailableInput = document.getElementById('menuAvailable');
        this.menuPopularInput = document.getElementById('menuPopular');
        this.menus = [];
        this.categories = [];
        this.currentImageData = '';
    }

    async init() {
        await this.loadData();
        this.render();
        this.bindEvents();
    }

    async loadData() {
        const [menus, categories] = await Promise.all([
            AdminStore.api.fetchMenus(),
            AdminStore.api.fetchCategories(),
        ]);

        this.menus = menus;
        this.categories = categories;
    }

    bindEvents() {
        document.getElementById('addMenuButton')?.addEventListener('click', () => this.openModal());
        document.getElementById('closeMenuModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancelMenuButton')?.addEventListener('click', () => this.closeModal());
        this.categoryFilter?.addEventListener('change', () => this.renderTable());
        this.menuImageInput?.addEventListener('change', (event) => this.handleImageChange(event));
        this.menuPriceTypeInput?.addEventListener('change', () => this.togglePriceFields());

        this.modal?.addEventListener('click', (event) => {
            if (event.target === this.modal) this.closeModal();
        });

        this.form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveMenu();
        });

        this.tableBody?.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-action]');
            if (!actionButton) return;

            const menuId = Number(actionButton.dataset.id);
            const action = actionButton.dataset.action;

            if (action === 'edit') {
                this.openModal(menuId);
                return;
            }

            if (action === 'toggle') {
                this.toggleAvailability(menuId);
                return;
            }

            if (action === 'delete') {
                this.deleteMenu(menuId);
            }
        });

        this.tableBody?.addEventListener('change', (event) => {
            const popularSwitch = event.target.closest('.popular-switch');
            if (!popularSwitch) return;

            const menuId = Number(popularSwitch.dataset.id);
            const isPopular = popularSwitch.checked;
            this.togglePopularity(menuId, isPopular);
        });
    }

    togglePriceFields() {
        const type = this.menuPriceTypeInput?.value || 'single';
        if (type === 'hot_ice') {
            if (this.singlePriceField) this.singlePriceField.style.display = 'none';
            if (this.hotIcePriceFields) this.hotIcePriceFields.style.display = 'grid';
        } else {
            if (this.singlePriceField) this.singlePriceField.style.display = 'grid';
            if (this.hotIcePriceFields) this.hotIcePriceFields.style.display = 'none';
        }
    }

    render() {
        this.renderSummary();
        this.renderCategoryOptions();
        this.renderTable();
    }

    renderSummary() {
        const availableMenus = this.menus.filter((menu) => Boolean(Number(menu.available) || menu.available)).length;
        if (this.summaryCount) this.summaryCount.textContent = String(this.menus.length);
        if (this.availableCount) this.availableCount.textContent = String(availableMenus);
        if (this.unavailableCount) this.unavailableCount.textContent = String(this.menus.length - availableMenus);
        if (this.categoryCount) this.categoryCount.textContent = String(this.categories.length);
    }

    renderCategoryOptions() {
        const options = ['<option value="all">Semua kategori</option>']
            .concat(this.categories.map((category) => (
                `<option value="${category.id}">${this.escapeHtml(category.name)}</option>`
            )));

        if (this.categoryFilter) {
            const currentValue = this.categoryFilter.value || 'all';
            this.categoryFilter.innerHTML = options.join('');
            this.categoryFilter.value = currentValue;
        }

        if (this.menuCategoryInput) {
            this.menuCategoryInput.innerHTML = this.categories.map((category) => (
                `<option value="${category.id}">${this.escapeHtml(category.name)}</option>`
            )).join('');
        }
    }

    renderTable() {
        if (!this.tableBody) return;

        const selectedCategory = this.categoryFilter?.value || 'all';
        const filteredMenus = selectedCategory === 'all'
            ? this.menus
            : this.menus.filter((menu) => String(menu.categoryId) === selectedCategory);

        if (!filteredMenus.length) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="admin-empty-state">
                            <strong>Belum ada menu</strong>
                            <p>Tambahkan menu baru atau ubah filter kategori.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.tableBody.innerHTML = filteredMenus.map((menu) => {
            const categoryName = this.getCategoryName(menu.categoryId);
            const isAvailable = Boolean(Number(menu.available) || menu.available);
            const availabilityClass = isAvailable ? 'is-success' : 'is-muted';
            const availabilityLabel = isAvailable ? 'Tersedia' : 'Habis';
            const toggleLabel = isAvailable ? 'Tandai Habis' : 'Tandai Tersedia';
            const isPopular = Boolean(Number(menu.isPopular) || menu.isPopular);

            let priceDisplay = '';
            if (menu.priceType === 'hot_ice') {
                priceDisplay = `Hot: ${AdminStore.formatAdminCurrency(Number(menu.priceHot || 0))}<br>Ice: ${AdminStore.formatAdminCurrency(Number(menu.priceIce || 0))}`;
            } else {
                priceDisplay = AdminStore.formatAdminCurrency(Number(menu.price || 0));
            }

            return `
                <tr>
                    <td><img class="admin-table-thumb" src="${this.getMenuImage(menu)}" alt="${this.escapeHtml(menu.name)}"></td>
                    <td class="admin-table-title">${this.escapeHtml(menu.name)}</td>
                    <td>${this.escapeHtml(categoryName)}</td>
                    <td>${priceDisplay}</td>
                    <td><span class="admin-status-badge ${availabilityClass}">${availabilityLabel}</span></td>
                    <td>
                        <label class="admin-switch">
                            <input type="checkbox" class="popular-switch" data-id="${menu.id}" ${isPopular ? 'checked' : ''}>
                            <span class="admin-slider"></span>
                        </label>
                    </td>
                    <td>
                        <div class="admin-action-group">
                            <button type="button" class="admin-table-button" data-action="edit" data-id="${menu.id}">Edit</button>
                            <button type="button" class="admin-table-button" data-action="toggle" data-id="${menu.id}">${toggleLabel}</button>
                            <button type="button" class="admin-table-button is-danger" data-action="delete" data-id="${menu.id}">Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    openModal(menuId = null) {
        this.form?.reset();
        this.formError.textContent = '';
        this.menuIdInput.value = '';
        this.currentImageData = '';

        if (!this.categories.length) {
            window.alert('Tambahkan kategori dulu sebelum membuat menu.');
            return;
        }

        this.renderCategoryOptions();

        if (menuId) {
            const menu = this.menus.find((item) => item.id === menuId);
            if (!menu) return;

            this.modalTitle.textContent = 'Edit Menu';
            this.menuIdInput.value = String(menu.id);
            this.menuNameInput.value = menu.name;
            this.menuCategoryInput.value = String(menu.categoryId);
            if (this.menuPriceTypeInput) this.menuPriceTypeInput.value = menu.priceType || 'single';
            this.menuPriceInput.value = String(Number(menu.price || 0));
            if (this.menuPriceHotInput) this.menuPriceHotInput.value = String(Number(menu.priceHot || 0));
            if (this.menuPriceIceInput) this.menuPriceIceInput.value = String(Number(menu.priceIce || 0));
            this.menuAvailableInput.checked = Boolean(Number(menu.available) || menu.available);
            this.menuPopularInput.checked = Boolean(Number(menu.isPopular) || menu.isPopular);
            this.currentImageData = menu.imageUrl || menu.image || '';
        } else {
            this.modalTitle.textContent = 'Tambah Menu';
            if (this.menuCategoryInput.options.length) {
                this.menuCategoryInput.value = this.menuCategoryInput.options[0].value;
            }
            if (this.menuPriceTypeInput) this.menuPriceTypeInput.value = 'single';
            this.menuPriceInput.value = '';
            if (this.menuPriceHotInput) this.menuPriceHotInput.value = '';
            if (this.menuPriceIceInput) this.menuPriceIceInput.value = '';
            this.menuAvailableInput.checked = true;
            this.menuPopularInput.checked = false;
            this.currentImageData = '';
        }

        this.togglePriceFields();
        this.renderImagePreview();
        this.modal?.classList.remove('is-hidden');
        document.body.classList.add('admin-modal-open');
        this.menuNameInput?.focus();
    }

    closeModal() {
        this.modal?.classList.add('is-hidden');
        document.body.classList.remove('admin-modal-open');
    }

    async saveMenu() {
        const id = Number(this.menuIdInput.value);
        const name = this.menuNameInput.value.trim();
        const categoryId = Number(this.menuCategoryInput.value);
        const priceType = this.menuPriceTypeInput?.value || 'single';
        const price = Number(this.menuPriceInput.value || 0);
        const priceHot = Number(this.menuPriceHotInput?.value || 0);
        const priceIce = Number(this.menuPriceIceInput?.value || 0);
        const available = this.menuAvailableInput.checked;
        const isPopular = this.menuPopularInput.checked;
        const imageUrl = this.currentImageData;

        if (!name) {
            this.formError.textContent = 'Nama menu wajib diisi.';
            return;
        }

        if (!categoryId) {
            this.formError.textContent = 'Kategori wajib dipilih.';
            return;
        }

        if (priceType === 'single') {
            if (price < 0) {
                this.formError.textContent = 'Harga menu wajib diisi dengan benar.';
                return;
            }
        } else if (priceType === 'hot_ice') {
            if (priceHot < 0 || priceIce < 0) {
                this.formError.textContent = 'Harga Hot dan Ice wajib diisi dengan benar.';
                return;
            }
        }

        const duplicatedMenu = this.menus.find((menu) => (
            menu.name.toLowerCase() === name.toLowerCase() && menu.id !== id
        ));

        if (duplicatedMenu) {
            this.formError.textContent = 'Nama menu sudah digunakan.';
            return;
        }

        try {
            this.formError.textContent = '';

            const payload = {
                name,
                categoryId,
                priceType,
                price,
                priceHot,
                priceIce,
                available,
                isPopular,
                imageUrl,
            };

            if (id) {
                await AdminStore.api.updateMenu(id, payload);
            } else {
                await AdminStore.api.createMenu(payload);
            }

            await this.loadData();
            this.render();
            this.closeModal();
        } catch (error) {
            this.formError.textContent = error.message || 'Gagal menyimpan menu.';
        }
    }

    async toggleAvailability(menuId) {
        const menu = this.menus.find((item) => item.id === menuId);
        if (!menu) return;

        await AdminStore.api.updateMenu(menuId, {
            name: menu.name,
            categoryId: menu.categoryId,
            priceType: menu.priceType || 'single',
            price: Number(menu.price || 0),
            priceHot: Number(menu.priceHot || 0),
            priceIce: Number(menu.priceIce || 0),
            available: !(Number(menu.available) || menu.available),
            isPopular: Boolean(Number(menu.isPopular) || menu.isPopular),
            imageUrl: menu.imageUrl || menu.image || '',
        });

        await this.loadData();
        this.render();
    }

    async togglePopularity(menuId, isPopular) {
        const menu = this.menus.find((item) => item.id === menuId);
        if (!menu) return;

        try {
            await AdminStore.api.updateMenu(menuId, {
                name: menu.name,
                categoryId: menu.categoryId,
                priceType: menu.priceType || 'single',
                price: Number(menu.price || 0),
                priceHot: Number(menu.priceHot || 0),
                priceIce: Number(menu.priceIce || 0),
                available: Boolean(Number(menu.available) || menu.available),
                isPopular: isPopular,
                imageUrl: menu.imageUrl || menu.image || '',
            });

            await this.loadData();
            this.render();
        } catch (error) {
            window.alert(error.message || 'Gagal mengubah status popularitas menu.');
            this.render();
        }
    }

    async deleteMenu(menuId) {
        const confirmed = window.confirm('Hapus menu ini?');
        if (!confirmed) return;

        await AdminStore.api.deleteMenu(menuId);
        await this.loadData();
        this.render();
    }

    getCategoryName(categoryId) {
        const category = this.categories.find((item) => item.id === categoryId);
        return category ? category.name : '-';
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

        if (file.size > 2 * 1024 * 1024) {
            this.formError.textContent = 'Ukuran gambar maksimal 2MB.';
            event.target.value = '';
            return;
        }

        this.formError.textContent = '';
        const reader = new FileReader();
        reader.onload = () => {
            this.currentImageData = typeof reader.result === 'string' ? reader.result : '';
            this.renderImagePreview();
        };
        reader.readAsDataURL(file);
    }

    renderImagePreview() {
        if (!this.menuImagePreview) return;
        this.menuImagePreview.src = this.currentImageData || AdminStore.getMenuPlaceholder(this.menuNameInput?.value || 'MN');
    }

    getMenuImage(menu) {
        return menu.imageUrl || menu.image || AdminStore.getMenuPlaceholder(menu.name);
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

        return new MenuPage().init();
    })().catch((error) => {
        const tableBody = document.getElementById('menuTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="admin-empty-state">
                        <strong>Gagal memuat menu</strong>
                        <p>${error.message || 'Periksa koneksi API dan database.'}</p>
                    </div>
                </td>
            </tr>
        `;
    });
});
