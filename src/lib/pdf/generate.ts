import { PDFDocument } from "pdf-lib";
import { PAGE_WIDTH, PAGE_HEIGHT } from "./render-document";

// En Vercel (Linux serverless) usa @sparticuz/chromium + puppeteer-core.
// En desarrollo local, ese binario de Chromium no corre en macOS/Windows,
// así que se usa el Chromium completo que trae "puppeteer" (devDependency,
// descargado en postinstall). Mismo motor (Chromium vía CDP) en ambos
// casos — solo cambia de dónde sale el ejecutable.
async function launchBrowser() {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const { default: puppeteer } = await import("puppeteer");
  return puppeteer.launch({ headless: true });
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // Las medidas de abajo dependen de la tipografía final.
    await page.evaluate(() => document.fonts.ready);

    // Un elemento "page_number" cuenta hojas físicas reales, no páginas
    // de plantilla — una sola página de plantilla puede desbordar a
    // varias hojas (ver renderPresupuestoPdfHtml). No hay forma de
    // saber eso de antemano al armar el HTML: cuánto mide una página
    // renderizada depende del navegador (ajuste de texto, fuentes,
    // etc.), así que se mide ACÁ, recién cargado el documento — cada
    // ".page" puede ocupar 1 o más hojas de 1056px — y recién ahí se
    // completa el texto de los marcadores que dejó
    // renderHeaderFooterElement (ver su nota en render-document.ts). El
    // mismo número le toca a cada hoja física de una página de
    // plantilla que se desborda (la banda de encabezado/pie es un
    // único elemento position:fixed que se repite igual en cada una —
    // no hay forma de darle a cada repetición un número distinto sin
    // partir manualmente el contenido en hojas separadas).
    await page.evaluate(() => {
      const PAGE_HEIGHT = 1056;
      const pageEls = Array.from(document.querySelectorAll<HTMLElement>(".page"));
      const spans = pageEls.map((el) => Math.max(1, Math.ceil((el.getBoundingClientRect().height - 1) / PAGE_HEIGHT)));
      const totalPhysicalPages = spans.reduce((a, b) => a + b, 0);
      let running = 1;
      const startByIndex: Record<number, number> = {};
      pageEls.forEach((el, i) => {
        const pageIndex = Number(el.dataset.pageIndex ?? i);
        startByIndex[pageIndex] = running;
        running += spans[i];
      });
      document.querySelectorAll<HTMLElement>("[data-page-number-for]").forEach((el) => {
        const pageIndex = Number(el.dataset.pageNumberFor);
        const start = startByIndex[pageIndex] ?? pageIndex + 1;
        el.textContent = `Página ${start} de ${totalPhysicalPages}`;
      });
    });

    const pageCount = await page.evaluate(() => document.querySelectorAll(".page").length);
    const pdfOptions = { width: "8.5in", height: "11in", printBackground: true } as const;
    if (pageCount <= 1) return Buffer.from(await page.pdf(pdfOptions));

    // Fondo y encabezado/pie son position:fixed, que Chromium repite en
    // TODAS las hojas del documento con el contenido de la última .page:
    // el degradado alternado de las páginas pares no se veía y los
    // pies "Página 1 de 2" / "Página 2 de 2" salían uno encima del otro.
    // Por eso cada .page se imprime sola (las demás ocultas) y los PDF
    // se unen después: así lo fixed solo se repite dentro de su página.
    // El display original de cada .page es inline (flex, para centrar el
    // cuerpo) — hay que restaurarlo tal cual, no vaciarlo.
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>(".page").forEach((el) => {
        el.dataset.originalDisplay = el.style.display;
      });
    });
    const merged = await PDFDocument.create();
    for (let index = 0; index < pageCount; index++) {
      await page.evaluate((visibleIndex) => {
        document.querySelectorAll<HTMLElement>(".page").forEach((el, i) => {
          el.style.display = i === visibleIndex ? (el.dataset.originalDisplay ?? "") : "none";
        });
      }, index);
      const partial = await PDFDocument.load(await page.pdf(pdfOptions));
      const copied = await merged.copyPages(partial, partial.getPageIndices());
      copied.forEach((sheet) => merged.addPage(sheet));
    }
    return Buffer.from(await merged.save());
  } finally {
    await browser.close();
  }
}

// PNG de la primera hoja, tal cual se ve (sin paginar) — usado para la
// tarjeta de la galería de una plantilla convertida desde una cuenta
// real (ver gallery-admin.ts), donde no hay un archivo de diseño a
// mano como en public/gallery/*.png.
export async function htmlToPreviewPng(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: PAGE_WIDTH, height: PAGE_HEIGHT, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT },
    });
    return Buffer.from(png);
  } finally {
    await browser.close();
  }
}
