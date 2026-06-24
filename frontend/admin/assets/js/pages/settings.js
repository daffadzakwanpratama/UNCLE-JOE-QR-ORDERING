class SettingsPage {
    constructor() {
        this.form = document.getElementById('settingsForm');
        this.taxInput = document.getElementById('settingsTaxPercent');
        this.serviceFeeInput = document.getElementById('settingsServiceFee');
        this.formError = document.getElementById('settingsFormError');
        this.saveButton = document.getElementById('saveSettingsButton');
    }

    async init() {
        await this.loadSettings();
        this.bindEvents();
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

    bindEvents() {
        this.form?.addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveSettings();
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
