class SettingsPage {
    constructor() {
        this.form = document.getElementById('settingsForm');
        this.taxInput = document.getElementById('settingsTaxPercent');
        this.serviceFeeInput = document.getElementById('settingsServiceFee');
        this.formError = document.getElementById('settingsFormError');
        this.saveButton = document.getElementById('saveSettingsButton');

        // User management elements
        this.usersSection = document.getElementById('adminUsersSection');
        this.usersTableBody = document.getElementById('adminUsersTableBody');
        this.addUserBtn = document.getElementById('addAdminUserButton');

        // Add user modal
        this.userModal = document.getElementById('adminUserModal');
        this.userForm = document.getElementById('adminUserForm');
        this.closeUserModalBtn = document.getElementById('closeAdminUserModal');
        this.cancelUserBtn = document.getElementById('cancelAdminUserButton');
        this.userFormError = document.getElementById('adminUserFormError');

        // Change password modal
        this.passwordModal = document.getElementById('changePasswordModal');
        this.passwordForm = document.getElementById('changePasswordForm');
        this.closePasswordModalBtn = document.getElementById('closeChangePasswordModal');
        this.cancelPasswordBtn = document.getElementById('cancelChangePasswordButton');
        this.passwordFormError = document.getElementById('changePasswordFormError');
        this.passwordInput = document.getElementById('changePasswordInput');
        this.passwordUserIdInput = document.getElementById('changePasswordUserId');

        // Change role modal
        this.roleModal = document.getElementById('changeRoleModal');
        this.roleForm = document.getElementById('changeRoleForm');
        this.closeRoleModalBtn = document.getElementById('closeChangeRoleModal');
        this.cancelRoleBtn = document.getElementById('cancelChangeRoleButton');
        this.roleFormError = document.getElementById('changeRoleFormError');
        this.roleInput = document.getElementById('changeRoleInput');
        this.roleUserIdInput = document.getElementById('changeRoleUserId');
    }

    async init() {
        await this.loadSettings();
        this.bindEvents();

        const session = AdminStore.getAdminSession();
        if (session && session.role === 'admin') {
            this.usersSection?.classList.remove('is-hidden');
            await this.loadAdmins();
        }
    }

    async loadSettings() {
        try {
            const settings = await AdminStore.api.fetchSettings();
            if (settings) {
                if (this.taxInput) this.taxInput.value = String(Number(settings.tax_percent ?? 10));
                if (this.serviceFeeInput) this.serviceFeeInput.value = String(Number(settings.service_fee ?? 2000));
            }
        } catch (error) {
            if (this.formError) {
                this.formError.textContent = error.message || 'Gagal memuat pengaturan dari server.';
            }
        }
    }

    async loadAdmins() {
        if (!this.usersTableBody) return;

        try {
            const users = await AdminStore.api.fetchAdmins();
            const currentSession = AdminStore.getAdminSession();
            
            this.usersTableBody.innerHTML = users.map(user => {
                const isSelf = currentSession && Number(currentSession.id) === Number(user.id);
                const roleLabels = {
                    admin: 'Administrator',
                    cashier: 'Kasir',
                    barista: 'Barista'
                };
                const roleLabel = roleLabels[user.role] || user.role;

                return `
                    <tr>
                        <td><strong>${this.escapeHtml(user.username)}</strong>${isSelf ? ' <small style="color:var(--text-muted);">(Anda)</small>' : ''}</td>
                        <td>${this.escapeHtml(user.fullName)}</td>
                        <td><span class="admin-badge is-badge-${user.role === 'admin' ? 'violet' : 'gray'}">${this.escapeHtml(roleLabel)}</span></td>
                        <td>
                            <div style="display: flex; gap: 8px;">
                                <button type="button" class="admin-secondary-button size-small" data-action="password" data-id="${user.id}">Sandi</button>
                                ${!isSelf ? `
                                    <button type="button" class="admin-secondary-button size-small" data-action="role" data-id="${user.id}" data-role="${user.role}">Role</button>
                                    <button type="button" class="admin-secondary-button size-small is-destructive" data-action="delete" data-id="${user.id}" data-username="${user.username}">Hapus</button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Gagal memuat daftar admin:', error);
        }
    }

    bindEvents() {
        this.form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveSettings();
        });

        // Add user modal actions
        this.addUserBtn?.addEventListener('click', () => {
            if (this.userForm) this.userForm.reset();
            if (this.userFormError) this.userFormError.textContent = '';
            this.userModal?.classList.remove('is-hidden');
        });

        const closeUserModal = () => {
            this.userModal?.classList.add('is-hidden');
        };
        this.closeUserModalBtn?.addEventListener('click', closeUserModal);
        this.cancelUserBtn?.addEventListener('click', closeUserModal);

        this.userForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.userFormError) this.userFormError.textContent = '';

            const username = document.getElementById('adminUserUsername')?.value.trim();
            const fullName = document.getElementById('adminUserFullName')?.value.trim();
            const password = document.getElementById('adminUserPassword')?.value.trim();
            const role = document.getElementById('adminUserRole')?.value;

            if (!username || !fullName || !password || !role) {
                if (this.userFormError) this.userFormError.textContent = 'Semua kolom wajib diisi.';
                return;
            }

            if (password.length < 6) {
                if (this.userFormError) this.userFormError.textContent = 'Password minimal harus 6 karakter.';
                return;
            }

            try {
                await AdminStore.api.createAdminUser({ username, fullName, password, role });
                closeUserModal();
                await this.loadAdmins();
                await showAdminAlert('Pengguna Ditambahkan', `Akun admin @${username} berhasil dibuat.`);
            } catch (error) {
                if (this.userFormError) this.userFormError.textContent = error.message || 'Gagal menambahkan pengguna.';
            }
        });

        // Change password modal actions
        const closePasswordModal = () => {
            this.passwordModal?.classList.add('is-hidden');
        };
        this.closePasswordModalBtn?.addEventListener('click', closePasswordModal);
        this.cancelPasswordBtn?.addEventListener('click', closePasswordModal);

        this.passwordForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.passwordFormError) this.passwordFormError.textContent = '';

            const userId = this.passwordUserIdInput?.value;
            const password = this.passwordInput?.value.trim();

            if (!password) {
                if (this.passwordFormError) this.passwordFormError.textContent = 'Password baru wajib diisi.';
                return;
            }

            if (password.length < 6) {
                if (this.passwordFormError) this.passwordFormError.textContent = 'Password minimal harus 6 karakter.';
                return;
            }

            try {
                await AdminStore.api.updateAdminPassword(userId, password);
                closePasswordModal();
                await showAdminAlert('Password Diubah', 'Password pengguna berhasil diperbarui.');
            } catch (error) {
                if (this.passwordFormError) this.passwordFormError.textContent = error.message || 'Gagal mengubah password.';
            }
        });

        // Change role modal actions
        const closeRoleModal = () => {
            this.roleModal?.classList.add('is-hidden');
        };
        this.closeRoleModalBtn?.addEventListener('click', closeRoleModal);
        this.cancelRoleBtn?.addEventListener('click', closeRoleModal);

        this.roleForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.roleFormError) this.roleFormError.textContent = '';

            const userId = this.roleUserIdInput?.value;
            const role = this.roleInput?.value;

            if (!role) {
                if (this.roleFormError) this.roleFormError.textContent = 'Role wajib dipilih.';
                return;
            }

            try {
                await AdminStore.api.updateAdminRole(userId, role);
                closeRoleModal();
                await this.loadAdmins();
                await showAdminAlert('Role Diperbarui', 'Role pengguna berhasil diperbarui.');
            } catch (error) {
                if (this.roleFormError) this.roleFormError.textContent = error.message || 'Gagal memperbarui role.';
            }
        });

        // Delegate actions on user table (buttons)
        this.usersTableBody?.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = btn.dataset.id;

            if (action === 'password') {
                if (this.passwordForm) this.passwordForm.reset();
                if (this.passwordFormError) this.passwordFormError.textContent = '';
                if (this.passwordUserIdInput) this.passwordUserIdInput.value = id;
                this.passwordModal?.classList.remove('is-hidden');
            } else if (action === 'role') {
                if (this.roleFormError) this.roleFormError.textContent = '';
                if (this.roleUserIdInput) this.roleUserIdInput.value = id;
                if (this.roleInput) this.roleInput.value = btn.dataset.role || 'cashier';
                this.roleModal?.classList.remove('is-hidden');
            } else if (action === 'delete') {
                const username = btn.dataset.username;
                const confirmed = await showAdminConfirm('Hapus Pengguna', `Apakah Anda yakin ingin menghapus akun @${username}? Akun ini tidak akan dapat login lagi.`);
                if (!confirmed) return;

                try {
                    await AdminStore.api.deleteAdminUser(id);
                    await this.loadAdmins();
                    await showAdminAlert('Pengguna Dihapus', `Akun admin @${username} berhasil dihapus.`);
                } catch (error) {
                    await showAdminAlert('Gagal Menghapus', error.message || 'Gagal menghapus pengguna.');
                }
            }
        });
    }

    async saveSettings() {
        if (!this.form || !this.taxInput || !this.serviceFeeInput) return;

        this.formError.textContent = '';
        const taxVal = Number(this.taxInput.value);
        const serviceFeeVal = Number(this.serviceFeeInput.value);

        if (isNaN(taxVal) || taxVal < 0 || taxVal > 100) {
            this.formError.textContent = 'Pajak belanja harus bernilai antara 0% dan 100%.';
            return;
        }

        if (isNaN(serviceFeeVal) || serviceFeeVal < 0) {
            this.formError.textContent = 'Biaya layanan harus bernilai 0 atau positif.';
            return;
        }

        const originalText = this.saveButton.textContent;
        this.saveButton.disabled = true;
        this.saveButton.textContent = 'Menyimpan...';

        try {
            await AdminStore.api.updateSettings({
                tax_percent: taxVal,
                service_fee: serviceFeeVal
            });
            await showAdminAlert('Pengaturan Disimpan', 'Pengaturan pajak dan biaya layanan berhasil diperbarui.');
        } catch (error) {
            this.formError.textContent = error.message || 'Gagal menyimpan pengaturan.';
        } finally {
            this.saveButton.disabled = false;
            this.saveButton.textContent = originalText;
        }
    }

    escapeHtml(value = '') {
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

        return new SettingsPage().init();
    })().catch((error) => {
        console.error("Gagal memulai halaman pengaturan:", error);
    });
});
