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

        // Browser viewport
        await page.setViewport({
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
        });

        await page.emulateMediaType("screen");

        // --------------------------------------------------
        // LOAD PAGE
        // --------------------------------------------------

        if (data.url) {
          await page.goto(data.url, {
            // DOM is usually available much faster than
            // networkidle2 on modern websites.
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
        } else if (data.html) {
          await page.setContent(data.html, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
        } else {
          return new Response("Please provide a URL or HTML.", {
            status: 400,
          });
        }

        // --------------------------------------------------
        // WAIT FOR PAGE TO FINISH LOADING
        // --------------------------------------------------

        // Wait for document.readyState to become "complete".
        // Maximum wait: 15 seconds.
        try {
          await page.waitForFunction(
            () => document.readyState === "complete",
            {
              timeout: 15000,
            }
          );
        } catch {
          // Continue even if the page never reports complete.
        }

        // --------------------------------------------------
        // WAIT FOR IMAGES
        // --------------------------------------------------

        // Images can continue loading after the document is ready.
        // Wait for them, but never wait forever.
        try {
          await page.evaluate(async () => {
            const images = Array.from(document.images);

            if (!images.length) {
              return;
            }

            await Promise.race([
              Promise.all(
                images.map((img) => {
                  if (img.complete) {
                    return Promise.resolve();
                  }

                  return new Promise((resolve) => {
                    img.addEventListener("load", resolve, {
                      once: true,
                    });

                    img.addEventListener("error", resolve, {
                      once: true,
                    });
                  });
                })
              ),

              new Promise((resolve) => {
                setTimeout(resolve, 10000);
              }),
            ]);
          });
        } catch {
          // Continue if image detection fails.
        }

        // --------------------------------------------------
        // WAIT FOR FONTS
        // --------------------------------------------------

        try {
          await page.evaluate(async () => {
            if (document.fonts && document.fonts.ready) {
              await Promise.race([
                document.fonts.ready,
                new Promise((resolve) => {
                  setTimeout(resolve, 5000);
                }),
              ]);
            }
          });
        } catch {
          // Continue if font detection fails.
        }

        // --------------------------------------------------
        // TRY TO CLOSE COOKIE / CONSENT POPUPS
        // --------------------------------------------------

        try {
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
              "accept cookies",
            ];

            const elements = Array.from(
              document.querySelectorAll(
                "button, a, input[type='button'], input[type='submit']"
              )
            );

            elements.forEach((el) => {
              const text = (
                el.innerText ||
                el.value ||
                el.getAttribute("aria-label") ||
                ""
              )
                .trim()
                .toLowerCase();

              if (
                cookieButtonTexts.some(
                  (keyword) =>
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
        } catch {
          // Continue if popup detection fails.
        }

        // Small delay only after popup interaction.
        // This is much shorter than the previous 1.5 second wait.
        await new Promise((resolve) => setTimeout(resolve, 500));

        // --------------------------------------------------
        // HIDE COMMON LOADERS / COOKIE OVERLAYS
        // --------------------------------------------------

        try {
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
              "[id*='consent']",
            ];

            document
              .querySelectorAll(selectors.join(","))
              .forEach((el) => {
                el.style.setProperty(
                  "display",
                  "none",
                  "important"
                );

                el.style.setProperty(
                  "visibility",
                  "hidden",
                  "important"
                );

                el.style.setProperty(
                  "opacity",
                  "0",
                  "important"
                );

                el.style.setProperty(
                  "pointer-events",
                  "none",
                  "important"
                );
              });

            if (document.body) {
              document.body.style.setProperty(
                "overflow",
                "visible",
                "important"
              );
            }
          });
        } catch {
          // Continue if cleanup fails.
        }

        // --------------------------------------------------
        // FINAL SHORT RENDER DELAY
        // --------------------------------------------------

        // Allows the browser to paint any final changes.
        // Only 300ms instead of the previous 1 second.
        await new Promise((resolve) => setTimeout(resolve, 300));

        // --------------------------------------------------
        // GET USEFUL FILENAME
        // --------------------------------------------------

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
              const host = parsed.hostname.replace(
                /^www\./,
                ""
              );

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
          try {
            const title = await page.title();

            if (title && title.trim()) {
              filename = safeFilename(title);
            }
          } catch {
            filename = "converted-document";
          }
        }

        // --------------------------------------------------
        // GENERATE PDF
        // --------------------------------------------------

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
          {
            status: 500,
          }
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