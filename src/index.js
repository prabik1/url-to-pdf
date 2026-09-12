import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/convert" && request.method === "POST") {
      try {
        const data = await request.json();

        const browser = await puppeteer.launch(env.BROWSER);
        const page = await browser.newPage();

        if (data.url) {
          await page.goto(data.url, {
            waitUntil: "networkidle2",
            timeout: 60000,
          });
        } else if (data.html) {
          await page.setContent(data.html, {
            waitUntil: "networkidle2",
          });
        } else {
          await browser.close();

          return new Response("Please provide a URL or HTML.", {
            status: 400,
          });
        }

        // Give JavaScript-rendered content time to finish
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Hide common loading screens/spinners before PDF generation
        await page.evaluate(() => {
          const selectors = [
            ".loader",
            ".loading",
            ".loading-screen",
            ".loading-overlay",
            ".spinner",
            ".preloader",
            "#loader",
            "#loading",
            "#loading-screen",
            "#loading-overlay",
            "[class*='loader']",
            "[class*='loading']",
            "[id*='loader']",
            "[id*='loading']"
          ];

          document.querySelectorAll(selectors.join(",")).forEach(el => {
            el.style.setProperty("display", "none", "important");
            el.style.setProperty("visibility", "hidden", "important");
            el.style.setProperty("opacity", "0", "important");
          });

          document.body.style.setProperty("overflow", "visible", "important");
        });

        // Allow the page to repaint after hiding loaders
        await new Promise(resolve => setTimeout(resolve, 500));

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
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};