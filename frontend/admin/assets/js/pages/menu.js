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
        this.menuPriceInput = document.getElementById('menuPrice');
        this.menuImageInput = document.getElementById('menuImage');
        this.menuImagePreview = document.getElementById('menuImagePreview');
        this.menuAvailableInput = document.getElementById('menuAvailable');
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
                    <td colspan="6">
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

            return `
                <tr>
                    <td><img class="admin-table-thumb" src="${this.getMenuImage(menu)}" alt="${this.escapeHtml(menu.name)}"></td>
                    <td class="admin-table-title">${this.escapeHtml(menu.name)}</td>
                    <td>${this.escapeHtml(categoryName)}</td>
                    <td>${AdminStore.formatAdminCurrency(Number(menu.price || 0))}</td>
                    <td><span class="admin-status-badge ${availabilityClass}">${availabilityLabel}</span></td>
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
            this.menuPriceInput.value = String(Number(menu.price || 0));
            this.menuAvailableInput.checked = Boolean(Number(menu.available) || menu.available);
            this.currentImageData = menu.imageUrl || menu.image || '';
        } else {
            this.modalTitle.textContent = 'Tambah Menu';
            if (this.menuCategoryInput.options.length) {
                this.menuCategoryInput.value = this.menuCategoryInput.options[0].value;
            }
            this.menuAvailableInput.checked = true;
            this.currentImageData = '';
        }

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
        const price = Number(this.menuPriceInput.value);
        const available = this.menuAvailableInput.checked;
        const imageUrl = this.currentImageData;

        if (!name) {
            this.formError.textContent = 'Nama menu wajib diisi.';
            return;
        }

        if (!categoryId) {
            this.formError.textContent = 'Kategori wajib dipilih.';
            return;
        }

        if (!price || price < 0) {
            this.formError.textContent = 'Harga menu wajib diisi dengan benar.';
            return;
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
                price,
                available,
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
            price: Number(menu.price || 0),
            available: !(Number(menu.available) || menu.available),
            imageUrl: menu.imageUrl || menu.image || '',
        });

        await this.loadData();
        this.render();
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
