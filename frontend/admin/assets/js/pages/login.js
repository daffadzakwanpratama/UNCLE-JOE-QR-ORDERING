class AdminLoginPage {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.rememberInput = document.getElementById('remember');
        this.errorElement = document.getElementById('loginFormError');
        this.submitButton = document.getElementById('loginSubmitButton');
    }

    init() {
        if (!this.form) return;

        void this.redirectIfLoggedIn();
        this.prefillRememberedUsername();
        this.bindEvents();
    }

    async redirectIfLoggedIn() {
        if (!window.AdminStore?.hasAdminSession?.()) return;

        const hasValidSession = await window.AdminStore?.hasValidAdminServerSession?.();
        if (!hasValidSession) return;

        window.location.href = './dashboard.html';
    }

    prefillRememberedUsername() {
        const rememberedUsername = window.AdminStore?.getRememberedUsername?.() || '';
        if (!rememberedUsername || !this.usernameInput) return;

        this.usernameInput.value = rememberedUsername;
        if (this.rememberInput) {
            this.rememberInput.checked = true;
        }
    }

    bindEvents() {
        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleSubmit();
        });
    }

    async handleSubmit() {
        this.clearError();

        const username = this.usernameInput?.value.trim() ?? '';
        const password = this.passwordInput?.value ?? '';
        const remember = Boolean(this.rememberInput?.checked);

        if (!username) {
            this.showError('Username wajib diisi.');
            return;
        }

        if (!password) {
            this.showError('Password wajib diisi.');
            return;
        }

        this.submitButton.disabled = true;
        this.submitButton.textContent = 'Memproses...';

        try {
            const admin = await window.AdminStore?.api?.loginAdmin?.(username, password);

            window.AdminStore?.saveAdminSession?.({
                id: admin?.id,
                username: admin?.username || username,
                fullName: admin?.fullName || username,
                role: admin?.role || 'admin',
                loggedInAt: new Date().toISOString(),
            });

            if (remember) {
                window.AdminStore?.saveRememberedUsername?.(username);
            } else {
                window.AdminStore?.saveRememberedUsername?.('');
            }

            window.location.href = './dashboard.html';
        } catch (error) {
            this.showError(this.getFriendlyErrorMessage(error));
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Masuk';
        }
    }

    getFriendlyErrorMessage(error) {
        const message = error?.message || 'Login gagal.';
        const errorCode = String(error?.code || '');

        if (errorCode === 'API_INVALID_RESPONSE' || errorCode === 'API_NETWORK_ERROR') {
            window.localStorage.removeItem('qr-admin-api-base-url');
        }

        if (errorCode === 'API_NETWORK_ERROR') {
            return `${message} Jika backend sudah berjalan, coba buka admin dari http://localhost:4000/admin.`;
        }

        if (errorCode === 'API_INVALID_RESPONSE') {
            return `${message} Coba akses ulang halaman admin dari backend aplikasi.`;
        }

        return message;
    }

    showError(message) {
        if (this.errorElement) {
            this.errorElement.textContent = message;
        }
    }

    clearError() {
        if (this.errorElement) {
            this.errorElement.textContent = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AdminLoginPage().init();
});
