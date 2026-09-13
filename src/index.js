import puppeteer from "@cloudflare/puppeteer";

function safeFilename(name) {
  return name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100) || "converted-document";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/convert" && request.method === "POST") {
      let browser;

      try {
        const data = await request.json();

        browser = await puppeteer.launch(env.BROWSER);
        const page = await browser.newPage();

        // Better page loading
        await page.setViewport({
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
        });

        await page.emulateMediaType("screen");

        if (data.url) {
          await page.goto(data.url, {
            waitUntil: "networkidle2",
            timeout: 120000,
          });
        } else if (data.html) {
          await page.setContent(data.html, {
            waitUntil: "networkidle2",
            timeout: 120000,
          });
        } else {
          return new Response("Please provide a URL or HTML.", {
            status: 400,
          });
        }

        // Give JavaScript-heavy pages time to finish rendering
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Wait for fonts
        await page.evaluate(async () => {
          if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
          }
        });

        // Try to close common cookie/consent popups
        await page.evaluate(() => {
          const cookieButtonTexts = [
            "accept",
            "accept all",
            "allow all",
            "agree",
            "i agree",
            "got it",
            "ok",
            "okay",
            "continue",
            "consent",
            "allow cookies",
            "accept cookies"
          ];

          const elements = Array.from(
            document.querySelectorAll("button, a, input[type='button'], input[type='submit']")
          );

          elements.forEach(el => {
            const text = (
              el.innerText ||
              el.value ||
              el.getAttribute("aria-label") ||
              ""
            ).trim().toLowerCase();

            if (
              cookieButtonTexts.some(
                keyword =>
                  text === keyword ||
                  text.includes(keyword)
              )
            ) {
              try {
                el.click();
              } catch {}
            }
          });
        });

        // Give the page time after cookie popup interaction
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Hide common cookie/consent overlays and loading screens
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

            ".cookie",
            ".cookies",
            ".cookie-banner",
            ".cookie-popup",
            ".cookie-consent",
            ".cookie-notice",
            ".consent",
            ".consent-banner",
            ".consent-popup",
            "#cookie-banner",
            "#cookie-consent",
            "#cookie-notice",
            "#consent-banner",

            "[class*='loader']",
            "[class*='loading']",
            "[class*='cookie']",
            "[class*='consent']",
            "[id*='loader']",
            "[id*='loading']",
            "[id*='cookie']",
            "[id*='consent']"
          ];

          document.querySelectorAll(selectors.join(",")).forEach(el => {
            el.style.setProperty("display", "none", "important");
            el.style.setProperty("visibility", "hidden", "important");
            el.style.setProperty("opacity", "0", "important");
            el.style.setProperty("pointer-events", "none", "important");
          });

          document.body.style.setProperty(
            "overflow",
            "visible",
            "important"
          );
        });

        // Allow final repaint
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get a useful filename
        let filename = "converted-document";

        if (data.url) {
          try {
            const parsed = new URL(data.url);

            // Prefer page title
            const title = await page.title();

            if (title && title.trim()) {
              filename = safeFilename(title);
            } else {
              // Fallback: hostname + path
              const host = parsed.hostname
                .replace(/^www\./, "");

              const path = parsed.pathname
                .replace(/^\/+|\/+$/g, "")
                .replace(/[^\w-]+/g, "-");

              filename = safeFilename(
                path ? `${host}-${path}` : host
              );
            }
          } catch {
            filename = "converted-document";
          }
        } else if (data.html) {
          const title = await page.title();

          if (title && title.trim()) {
            filename = safeFilename(title);
          }
        }

        const pdf = await page.pdf({
          format: data.pageSize || "A4",
          printBackground: true,
          preferCSSPageSize: false,
          margin: {
            top: "20px",
            right: "20px",
            bottom: "20px",
            left: "20px",
          },
        });

        return new Response(pdf, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}.pdf"`,
          },
        });

      } catch (error) {
        return new Response(
          "PDF generation failed: " + error.message,
          { status: 500 }
        );

      } finally {
        if (browser) {
          try {
            await browser.close();
          } catch {}
        }
      }
    }

    return env.ASSETS.fetch(request);
  },
};
```
