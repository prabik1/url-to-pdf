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

function normalizeUrl(value) {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function isSameOrigin(urlA, urlB) {
  try {
    const a = new URL(urlA);
    const b = new URL(urlB);

    return (
      a.protocol === b.protocol &&
      a.hostname === b.hostname &&
      a.port === b.port
    );
  } catch {
    return false;
  }
}

function isChallengePage(title, text) {
  const content = `${title} ${text}`.toLowerCase();

  const challengeWords = [
    "please wait while your request is being verified",
    "please wait",
    "checking your browser",
    "verify you are human",
    "verifying you are human",
    "security check",
    "security verification",
    "just a moment",
    "checking your connection",
    "enable javascript and cookies",
    "ddos protection",
    "captcha",
  ];

  return challengeWords.some((word) => content.includes(word));
}

function isCookieStatementPage(title, text) {
  const content = `${title} ${text}`.toLowerCase();

  return (
    content.includes("wikimedia cookie statement") ||
    content.includes("cookie statement") &&
    content.includes("wikimedia foundation")
  );
}

async function getPageInfo(page) {
  try {
    const title = await page.title();

    const text = await page.evaluate(() => {
      return (document.body?.innerText || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 12000);
    });

    return {
      title,
      text,
      url: page.url(),
    };
  } catch {
    return {
      title: "",
      text: "",
      url: page.url(),
    };
  }
}

async function removeConsentOverlay(page) {
  try {
    await page.evaluate(() => {
      // Only target actual consent/overlay elements.
      // Avoid hiding normal article content containing
      // words such as "cookie" or "consent".

      const selectors = [
        // Common consent frameworks
        "#onetrust-banner-sdk",
        "#onetrust-consent-sdk",
        ".onetrust-pc-dark-filter",
        ".onetrust-pc-dark-filter",
        "#CybotCookiebotDialog",
        "#CybotCookiebotDialogBodyUnderlay",
        ".cky-consent-container",
        ".cky-overlay",
        ".qc-cmp2-container",
        ".qc-cmp2-main",
        ".fc-consent-root",
        ".fc-dialog-overlay",
        ".fc-consent-root",
        "[data-testid='cookie-banner']",

        // Wikimedia-specific/common notice containers
        ".mw-cookiewarning-container",
        ".mw-cookiewarning-banner",
        ".mw-cookie-warning",
        "#cookieWarning",
      ];

      document
        .querySelectorAll(selectors.join(","))
        .forEach((element) => {
          element.remove();
        });

      // Remove obvious fixed consent overlays only when
      // they contain consent-related text.
      const candidates = Array.from(
        document.querySelectorAll(
          "body *"
        )
      );

      candidates.forEach((element) => {
        const style = window.getComputedStyle(element);

        if (
          (style.position === "fixed" ||
            style.position === "sticky") &&
          Number.parseInt(style.zIndex || "0", 10) >= 1000
        ) {
          const text = (
            element.innerText ||
            element.getAttribute("aria-label") ||
            ""
          )
            .trim()
            .toLowerCase();

          const consentWords = [
            "cookie",
            "cookies",
            "consent",
            "privacy preferences",
            "accept all",
            "allow cookies",
          ];

          if (
            consentWords.some((word) => text.includes(word))
          ) {
            element.remove();
          }
        }
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
    // Consent cleanup is optional.
  }
}

async function clickConsentButton(page) {
  try {
    return await page.evaluate(() => {
      const allowedTexts = [
        "accept all",
        "accept cookies",
        "allow all",
        "allow cookies",
        "i agree",
        "agree",
        "got it",
      ];

      const elements = Array.from(
        document.querySelectorAll(
          "button, input[type='button'], input[type='submit']"
        )
      );

      for (const element of elements) {
        const text = (
          element.innerText ||
          element.value ||
          element.getAttribute("aria-label") ||
          ""
        )
          .trim()
          .toLowerCase();

        if (
          allowedTexts.some(
            (allowed) => text === allowed
          )
        ) {
          try {
            element.click();
            return true;
          } catch {
            return false;
          }
        }
      }

      return false;
    });
  } catch {
    return false;
  }
}

async function waitForUsefulPage(page) {
  // First check the document state.
  if (page.url().startsWith("http")) {
    try {
      await page.waitForFunction(
        () =>
          document.readyState === "interactive" ||
          document.readyState === "complete",
        {
          timeout: 10000,
        }
      );
    } catch {
      // Do not fail only because readyState took too long.
    }
  }

  // Only wait for the full "complete" state if the
  // page is still loading.
  try {
    const state = await page.evaluate(
      () => document.readyState
    );

    if (state !== "complete") {
      await page.waitForFunction(
        () => document.readyState === "complete",
        {
          timeout: 8000,
        }
      );
    }
  } catch {
    // Continue. Some sites never reach complete normally.
  }

  // Wait for fonts only when available.
  try {
    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) =>
            setTimeout(resolve, 3000)
          ),
        ]);
      }
    });
  } catch {
    // Fonts are not critical enough to fail conversion.
  }

  // Only wait for images that are actually present.
  try {
    await page.evaluate(async () => {
      const images = Array.from(document.images);

      if (!images.length) {
        return;
      }

      const importantImages = images.filter((img) => {
        const rect = img.getBoundingClientRect();

        return (
          rect.width > 0 &&
          rect.height > 0
        );
      });

      if (!importantImages.length) {
        return;
      }

      await Promise.race([
        Promise.all(
          importantImages.map((img) => {
            if (img.complete) {
              return Promise.resolve();
            }

            return new Promise((resolve) => {
              img.addEventListener(
                "load",
                resolve,
                { once: true }
              );

              img.addEventListener(
                "error",
                resolve,
                { once: true }
              );
            });
          })
        ),
        new Promise((resolve) =>
          setTimeout(resolve, 5000)
        ),
      ]);
    });
  } catch {
    // Broken images should not prevent PDF generation.
  }
}

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);

    if (
      requestUrl.pathname === "/convert" &&
      request.method === "POST"
    ) {
      let browser;

      try {
        const data = await request.json();

        if (!data.url && !data.html) {
          return new Response(
            "Please provide a URL or HTML.",
            {
              status: 400,
            }
          );
        }

        // --------------------------------------------------
        // BROWSER
        // --------------------------------------------------

        browser = await puppeteer.launch(env.BROWSER);

        const page = await browser.newPage();

        await page.setViewport({
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
        });

        await page.emulateMediaType("screen");

        // --------------------------------------------------
        // URL CONVERSION
        // --------------------------------------------------

        let requestedUrl = "";

        if (data.url) {
          requestedUrl = normalizeUrl(data.url);

          if (!requestedUrl) {
            return new Response(
              "Invalid URL.",
              {
                status: 400,
              }
            );
          }

          // IMPORTANT:
          // Navigate to the exact submitted URL.
          await page.goto(requestedUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
        }

        // --------------------------------------------------
        // HTML CONVERSION
        // --------------------------------------------------

        else {
          await page.setContent(data.html, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
        }

        // --------------------------------------------------
        // PAGE LOADING
        // --------------------------------------------------

        await waitForUsefulPage(page);

        // --------------------------------------------------
        // CHECK FOR CHALLENGE / VERIFICATION PAGE
        // --------------------------------------------------

        let pageInfo = await getPageInfo(page);

        if (
          data.url &&
          isChallengePage(
            pageInfo.title,
            pageInfo.text
          )
        ) {
          return new Response(
            "The target website returned a verification or security page instead of the requested page. PDF generation was stopped to prevent creating an incorrect PDF.",
            {
              status: 422,
            }
          );
        }

        // --------------------------------------------------
        // WIKIMEDIA COOKIE EXCEPTION
        // --------------------------------------------------

        if (
          data.url &&
          isCookieStatementPage(
            pageInfo.title,
            pageInfo.text
          )
        ) {
          // Try returning to the EXACT requested URL.
          // We do not use the domain homepage.
          await page.goto(requestedUrl, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });

          await waitForUsefulPage(page);

          pageInfo = await getPageInfo(page);

          // If it is still the cookie statement,
          // do NOT create the wrong PDF.
          if (
            isCookieStatementPage(
              pageInfo.title,
              pageInfo.text
            )
          ) {
            return new Response(
              "The requested page was replaced by a Wikimedia cookie/consent page. PDF generation was stopped because the requested page could not be verified.",
              {
                status: 422,
              }
            );
          }

          if (
            isChallengePage(
              pageInfo.title,
              pageInfo.text
            )
          ) {
            return new Response(
              "The target website returned a verification or security page instead of the requested page. PDF generation was stopped.",
              {
                status: 422,
              }
            );
          }
        }

        // --------------------------------------------------
        // CONSENT HANDLING
        // --------------------------------------------------

        const consentClicked =
          await clickConsentButton(page);

        if (consentClicked) {
          // Give the page only a short opportunity to
          // update after consent.
          await new Promise((resolve) =>
            setTimeout(resolve, 400)
          );

          await removeConsentOverlay(page);

          await waitForUsefulPage(page);
        } else {
          await removeConsentOverlay(page);
        }

        // --------------------------------------------------
        // FINAL PAGE VALIDATION
        // --------------------------------------------------

        if (data.url) {
          pageInfo = await getPageInfo(page);

          // Never generate a verification page.
          if (
            isChallengePage(
              pageInfo.title,
              pageInfo.text
            )
          ) {
            return new Response(
              "The target website is showing a verification/security page. The requested page was not converted.",
              {
                status: 422,
              }
            );
          }

          // Make sure navigation stayed on the same site.
          // Normal redirects within the same origin are allowed.
          if (
            pageInfo.url &&
            !isSameOrigin(
              requestedUrl,
              pageInfo.url
            )
          ) {
            return new Response(
              "The requested URL redirected to a different website. PDF generation was stopped to prevent converting an unintended page.",
              {
                status: 422,
              }
            );
          }
        }

        // --------------------------------------------------
        // FILENAME
        // --------------------------------------------------

        let filename = "converted-document";

        if (data.url) {
          try {
            const parsed = new URL(requestedUrl);
            const title = await page.title();

            if (title && title.trim()) {
              filename = safeFilename(title);
            } else {
              const host = parsed.hostname.replace(
                /^www\./,
                ""
              );

              const path = parsed.pathname
                .replace(/^\/+|\/+$/g, "")
                .replace(/[^\w-]+/g, "-");

              filename = safeFilename(
                path
                  ? `${host}-${path}`
                  : host
              );
            }
          } catch {
            filename = "converted-document";
          }
        } else {
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
        // PDF
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
            "Content-Disposition":
              `attachment; filename="${filename}.pdf"`,
          },
        });

      } catch (error) {
        console.error(
          "PDF generation error:",
          error
        );

        return new Response(
          "PDF generation failed: " +
            (error?.message || "Unknown error"),
          {
            status: 500,
          }
        );
      } finally {
        if (browser) {
          try {
            await browser.close();
          } catch {
            // Browser already closed.
          }
        }
      }
    }

    return env.ASSETS.fetch(request);
  },
};