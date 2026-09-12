document.addEventListener('DOMContentLoaded', function () {

    // PDF Size selector highlight
    document.querySelectorAll('.size-option input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.querySelectorAll('.size-card').forEach(card => {
                card.classList.remove('selected');
            });

            if (this.checked) {
                this.closest('.size-option')
                    .querySelector('.size-card')
                    .classList.add('selected');
            }
        });

        if (radio.checked) {
            radio.closest('.size-option')
                .querySelector('.size-card')
                .classList.add('selected');
        }
    });

    // Loader + Cloudflare Worker PDF conversion
    const loader = document.getElementById('loader');
    const form = document.getElementById('html-to-pdf-form');

    if (!form) return;

    form.addEventListener('submit', async function (event) {
        event.preventDefault();

        loader.classList.add('active');

        const url = form.querySelector('[name="html_url"]').value.trim();
        const html = form.querySelector('[name="html_text"]').value.trim();
        const pageSize = form.querySelector('[name="pdf_size"]:checked').value;

        try {
            const response = await fetch(
                'https://url-to-pdf.prabikdhungana13.workers.dev/',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        url: url,
                        html: html,
                        pageSize: pageSize
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }

            const pdfBlob = await response.blob();
            const downloadUrl = URL.createObjectURL(pdfBlob);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = 'converted.pdf';
            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(downloadUrl);

        } catch (error) {
            alert('PDF generation failed: ' + error.message);
        } finally {
            loader.classList.remove('active');
        }
    });
});