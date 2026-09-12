document.addEventListener('DOMContentLoaded', function () {

    // ── File upload drag-and-drop + display ──────────────────────────────────
    const setupFileUpload = (uploadAreaId, inputId, displayId) => {
        const uploadArea = document.getElementById(uploadAreaId);
        const fileInput  = document.getElementById(inputId);
        const fileDisplay = document.getElementById(displayId);

        if (!uploadArea || !fileInput) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
            uploadArea.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); }, false);
        });

        ['dragenter', 'dragover'].forEach(evt => {
            uploadArea.addEventListener(evt, () => uploadArea.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(evt => {
            uploadArea.addEventListener(evt, () => uploadArea.classList.remove('dragover'), false);
        });

        uploadArea.addEventListener('drop', e => {
            const files = e.dataTransfer.files;
            fileInput.files = files;
            updateDisplay(files[0]);
        }, false);

        fileInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                updateDisplay(this.files[0]);
            }
        });

        function updateDisplay(file) {
            if (fileDisplay) {
                fileDisplay.innerHTML = `<i class="fas fa-check-circle me-2 text-success"></i>Selected: <strong>${file.name}</strong>`;
            }
        }

        // Expose a reset method so we can clear after conversion
        uploadArea._resetDisplay = () => {
            if (fileDisplay) fileDisplay.innerHTML = '';
            fileInput.value = '';
        };
    };

    setupFileUpload('html-upload-area', 'html_file', 'html-file-name');
    setupFileUpload('pdf-upload-area',  'pdf_file',  'pdf-file-name');

    // ── PDF Size selector highlight ──────────────────────────────────────────
    document.querySelectorAll('.size-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.querySelectorAll('.size-card').forEach(card => card.classList.remove('selected'));
            if (this.checked) {
                this.closest('.size-option').querySelector('.size-card').classList.add('selected');
            }
        });
        // Init highlight on page load for the default checked option
        if (radio.checked) {
            radio.closest('.size-option').querySelector('.size-card').classList.add('selected');
        }
    });

    // ── Loader + form reset after download ───────────────────────────────────
    const loader = document.getElementById('loader');

    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function () {
            loader.classList.add('active');

            // After the browser triggers the file download the page stays loaded.
            // Hide the loader and reset the file-input display after a safe delay.
            setTimeout(() => {
                loader.classList.remove('active');

                // Reset file displays so "Selected: …" text clears
                ['html-upload-area', 'pdf-upload-area'].forEach(id => {
                    const area = document.getElementById(id);
                    if (area && area._resetDisplay) area._resetDisplay();
                });
            }, 6000);
        });
    });
});
