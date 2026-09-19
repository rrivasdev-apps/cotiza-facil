// En Vercel (Linux serverless) usa @sparticuz/chromium + puppeteer-core.
// En desarrollo local, ese binario de Chromium no corre en macOS/Windows,
// así que se usa el Chromium completo que trae "puppeteer" (devDependency,
// descargado en postinstall). Mismo motor (Chromium vía CDP) en ambos
// casos — solo cambia de dónde sale el ejecutable.
export async function htmlToPdf(html: string): Promise<Buffer> {
  const isProd = process.env.NODE_ENV === "production";

  let browser;
  if (isProd) {
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    const { default: puppeteer } = await import("puppeteer");
    browser = await puppeteer.launch({ headless: true });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      width: "8.5in",
      height: "11in",
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
