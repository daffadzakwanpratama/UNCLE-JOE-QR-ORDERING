class CategoryPage {
    constructor() {
        this.tableBody = document.getElementById('categoryTableBody');
        this.totalCategoryCount = document.getElementById('totalCategoryCount');
        this.linkedMenuCount = document.getElementById('linkedMenuCount');
        this.modal = document.getElementById('categoryModal');
        this.modalTitle = document.getElementById('categoryModalTitle');
        this.form = document.getElementById('categoryForm');
        this.formError = document.getElementById('categoryFormError');
        this.categoryIdInput = document.getElementById('categoryId');
        this.categoryNameInput = document.getElementById('categoryName');
        this.categoryDescriptionInput = document.getElementById('categoryDescription');
        this.categories = [];
        this.menus = [];
    }

    async init() {
        await this.loadData();
        this.render();
        this.bindEvents();
    }

    async loadData() {
        const [categories, menus] = await Promise.all([
            AdminStore.api.fetchCategories(),
            AdminStore.api.fetchMenus(),
        ]);

        this.categories = categories;
        this.menus = menus;
    }

    bindEvents() {
        document.getElementById('addCategoryButton')?.addEventListener('click', () => this.openModal());
        document.getElementById('closeCategoryModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancelCategoryButton')?.addEventListener('click', () => this.closeModal());

        this.modal?.addEventListener('click', (event) => {
            if (event.target === this.modal) this.closeModal();
        });

        this.form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveCategory();
        });

        this.tableBody?.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-action]');
            if (!actionButton) return;

            const categoryId = Number(actionButton.dataset.id);
            const action = actionButton.dataset.action;

            if (action === 'edit') {
                this.openModal(categoryId);
                return;
            }

            if (action === 'delete') {
                this.deleteCategory(categoryId);
            }
        });
    }

    render() {
        this.renderSummary();
        this.renderTable();
    }

    renderSummary() {
        if (this.totalCategoryCount) {
            this.totalCategoryCount.textContent = String(this.categories.length);
        }

        if (this.linkedMenuCount) {
            this.linkedMenuCount.textContent = String(this.menus.length);
        }
    }

    renderTable() {
        if (!this.tableBody) return;

        if (!this.categories.length) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="4">
                        <div class="admin-empty-state">
                            <strong>Belum ada kategori</strong>
                            <p>Mulai dengan menambahkan kategori pertama untuk menu kamu.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.tableBody.innerHTML = this.categories.map((category) => {
            const menuCount = this.menus.filter((menu) => menu.categoryId === category.id).length;

            return `
                <tr>
                    <td class="admin-table-title">${escapeHtml(category.name)}</td>
                    <td>${escapeHtml(category.description || '-')}</td>
                    <td>${menuCount} menu</td>
                    <td>
                        <div class="admin-action-group">
                            <button type="button" class="admin-table-button" data-action="edit" data-id="${category.id}">Edit</button>
                            <button type="button" class="admin-table-button is-danger" data-action="delete" data-id="${category.id}">Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    openModal(categoryId = null) {
        this.form?.reset();
        this.formError.textContent = '';
        this.categoryIdInput.value = '';

        if (categoryId) {
            const category = this.categories.find((item) => item.id === categoryId);
            if (!category) return;

            this.modalTitle.textContent = 'Edit Kategori';
            this.categoryIdInput.value = String(category.id);
            this.categoryNameInput.value = category.name;
            this.categoryDescriptionInput.value = category.description || '';
        } else {
            this.modalTitle.textContent = 'Tambah Kategori';
        }

        this.modal?.classList.remove('is-hidden');
        document.body.classList.add('admin-modal-open');
        this.categoryNameInput?.focus();
    }

    closeModal() {
        this.modal?.classList.add('is-hidden');
        document.body.classList.remove('admin-modal-open');
    }

    async saveCategory() {
        const id = Number(this.categoryIdInput.value);
        const name = this.categoryNameInput.value.trim();
        const description = this.categoryDescriptionInput.value.trim();

        if (!name) {
            this.formError.textContent = 'Nama kategori wajib diisi.';
            return;
        }

        const duplicatedCategory = this.categories.find((category) => (
            category.name.toLowerCase() === name.toLowerCase() && category.id !== id
        ));

        if (duplicatedCategory) {
            this.formError.textContent = 'Nama kategori sudah digunakan.';
            return;
        }

        try {
            this.formError.textContent = '';

            if (id) {
                await AdminStore.api.updateCategory(id, { name, description });
            } else {
                await AdminStore.api.createCategory({ name, description });
            }

            await this.loadData();
            this.render();
            this.closeModal();
        } catch (error) {
            this.formError.textContent = error.message || 'Gagal menyimpan kategori.';
        }
    }

    async deleteCategory(categoryId) {
        const usedByMenu = this.menus.some((menu) => menu.categoryId === categoryId);
        if (usedByMenu) {
            await showAdminAlert('Kategori Dipakai', 'Kategori ini masih dipakai oleh menu. Hapus atau pindahkan menunya dulu.');
            return;
        }

        const confirmed = await showAdminConfirm('Hapus Kategori', 'Apakah Anda yakin ingin menghapus kategori ini?');
        if (!confirmed) return;

        await AdminStore.api.deleteCategory(categoryId);
        await this.loadData();
        this.render();
    }


}

document.addEventListener('DOMContentLoaded', () => {
    void (async () => {
        await AdminStore.waitUntilReady?.();
        if (!AdminStore.hasAdminSession?.()) return;

        return new CategoryPage().init();
    })().catch((error) => {
        const tableBody = document.getElementById('categoryTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="admin-empty-state">
                        <strong>Gagal memuat kategori</strong>
                        <p>${error.message || 'Periksa koneksi API dan database.'}</p>
                    </div>
                </td>
            </tr>
        `;
    });
});
