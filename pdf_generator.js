const puppeteer = require('puppeteer');
const fs = require('fs');

async function generatePdf() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error("Usage: node pdf_generator.js <type> <input> <output> [size]");
        process.exit(1);
    }

    const type       = args[0]; // 'url' or 'html'
    const input      = args[1]; // url string or path to html file
    const outputPath = args[2];
    const pageSize   = args[3] || 'A4'; // A4, A3, Letter, Legal

    const allowedSizes = ['A4', 'A3', 'Letter', 'Legal'];
    const format = allowedSizes.includes(pageSize) ? pageSize : 'A4';

    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();

        await page.emulateMediaType('screen');

        if (type === 'url') {
            await page.goto(input, { waitUntil: 'networkidle0', timeout: 60000 });
        } else if (type === 'html') {
            // Use file URI so that relative assets (CSS, images) load correctly
            const fileUrl = 'file:///' + input.replace(/\\/g, '/');
            await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });
        }

        await page.pdf({
            path: outputPath,
            format: format,
            printBackground: true,
            margin: { top: '15px', right: '15px', bottom: '15px', left: '15px' }
        });

        const title = await page.title();
        await browser.close();
        console.log("TITLE:" + title);
        console.log("SUCCESS");
    } catch (error) {
        console.error("ERROR:", error.message);
        process.exit(1);
    }
}

generatePdf();
