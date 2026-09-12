import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // PDF conversion API
    if (url.pathname === "/convert" && request.method === "POST") {
      try {
        const data = await request.json();

        const browser = await puppeteer.launch(env.BROWSER);
        const page = await browser.newPage();

        if (data.url) {
          await page.goto(data.url, {
            waitUntil: "networkidle0",
            timeout: 60000,
          });
        } else if (data.html) {
          await page.setContent(data.html, {
            waitUntil: "networkidle0",
          });
        } else {
          await browser.close();

          return new Response("Please provide a URL or HTML.", {
            status: 400,
          });
        }

        const pdf = await page.pdf({
          format: data.pageSize || "A4",
          printBackground: true,
          margin: {
            top: "20px",
            right: "20px",
            bottom: "20px",
            left: "20px",
          },
        });

        await browser.close();

        return new Response(pdf, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="converted.pdf"',
          },
        });
      } catch (error) {
        return new Response(
          "PDF generation failed: " + error.message,
          {
            status: 500,
          }
        );
      }
    }

    // Frontend / static assets
    return env.ASSETS.fetch(request);
  },
};