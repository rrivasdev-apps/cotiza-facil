// Graba, con Playwright, un video tutorial de "cómo crear una plantilla
// de presupuesto con ítems" — crea una cuenta de prueba desechable,
// arma una plantilla completa a mano (Estructura + Tema), carga un
// presupuesto de ejemplo con ella y exporta el PDF. Al final borra la
// cuenta de prueba: el video queda, los datos no.
//
// Uso:
//   node --env-file=.env.local scripts/record-tutorial.mjs
//
// Requiere que el servidor de desarrollo ya esté corriendo en
// http://localhost:3000 (npm run dev) y que el navegador de Playwright
// esté instalado (npx playwright install chromium).

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { mkdirSync, renameSync, readdirSync, rmSync } from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = path.resolve("tutorial-output");
const VIDEO_SIZE = { width: 1920, height: 1080 };

const ACCOUNT_NAME = "Andes Consultores";
const DEMO_EMAIL = `demo.andesconsultores.${Date.now()}@example.com`;

// ---------------------------------------------------------------
// Cuenta de prueba desechable (mismo mecanismo que scripts/seed-account.mjs)
// ---------------------------------------------------------------

function generatePassword() {
  return randomBytes(18).toString("base64url");
}

async function createDemoAccount(admin) {
  const password = generatePassword();

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .insert({ name: ACCOUNT_NAME })
    .select()
    .single();
  if (accountError) throw new Error(`No se pudo crear la cuenta: ${accountError.message}`);

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password,
    email_confirm: true,
  });
  if (authError) throw new Error(`No se pudo crear el usuario: ${authError.message}`);

  const { error: userError } = await admin.from("users").insert({
    id: authUser.user.id,
    account_id: account.id,
    email: DEMO_EMAIL,
  });
  if (userError) throw new Error(`No se pudo vincular el usuario a la cuenta: ${userError.message}`);

  return { accountId: account.id, userId: authUser.user.id, email: DEMO_EMAIL, password };
}

async function deleteDemoAccount(admin, { accountId, userId }) {
  // Best-effort: borra cualquier PDF que haya quedado en Storage bajo
  // el prefijo de esta cuenta antes de borrar la cuenta en sí (Storage
  // no cascada con la fila de Postgres).
  try {
    const { data: files } = await admin.storage.from("presupuestos-pdf").list(accountId);
    if (files && files.length > 0) {
      await admin.storage
        .from("presupuestos-pdf")
        .remove(files.map((f) => `${accountId}/${f.name}`));
    }
  } catch {
    // No crítico — si falla, el archivo queda huérfano, no bloquea el resto del cleanup.
  }

  await admin.auth.admin.deleteUser(userId);
  await admin.from("accounts").delete().eq("id", accountId);
}

// ---------------------------------------------------------------
// Helpers de grabación: cursor visible + movimientos/typing a ritmo
// humano, para que el video se vea como una demo guiada y no un
// script corriendo a toda velocidad.
// ---------------------------------------------------------------

async function injectCursor(page) {
  await page.addInitScript(() => {
    const setup = () => {
      const style = document.createElement("style");
      style.textContent = `
        #__rec_cursor {
          position: fixed; width: 22px; height: 22px; border-radius: 50%;
          background: rgba(47,111,237,0.30); border: 2px solid rgba(47,111,237,0.95);
          pointer-events: none; z-index: 2147483647; transform: translate(-50%,-50%);
          left: -100px; top: -100px; box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        }
        .__rec_ripple {
          position: fixed; width: 14px; height: 14px; border-radius: 50%;
          background: rgba(47,111,237,0.55); pointer-events: none; z-index: 2147483647;
          transform: translate(-50%,-50%); opacity: 0.6;
        }
      `;
      document.head.appendChild(style);
      const dot = document.createElement("div");
      dot.id = "__rec_cursor";
      document.body.appendChild(dot);
      window.addEventListener("mousemove", (e) => {
        dot.style.left = e.clientX + "px";
        dot.style.top = e.clientY + "px";
      });
      window.addEventListener("mousedown", (e) => {
        const r = document.createElement("div");
        r.className = "__rec_ripple";
        r.style.left = e.clientX + "px";
        r.style.top = e.clientY + "px";
        document.body.appendChild(r);
        r.animate(
          [
            { transform: "translate(-50%,-50%) scale(1)", opacity: 0.6 },
            { transform: "translate(-50%,-50%) scale(4)", opacity: 0 },
          ],
          { duration: 450, easing: "ease-out" },
        ).onfinish = () => r.remove();
      });
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setup);
    } else {
      setup();
    }
  });
}

async function moveTo(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("No se pudo ubicar el elemento en pantalla.");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 30 });
}

async function clickSmooth(page, locator, { before = 350, after = 600 } = {}) {
  await moveTo(page, locator);
  await page.waitForTimeout(before);
  await locator.click();
  await page.waitForTimeout(after);
}

async function typeSmooth(page, locator, text, { before = 300, after = 500, delay = 42 } = {}) {
  await moveTo(page, locator);
  await page.waitForTimeout(before);
  await locator.click();
  await locator.pressSequentially(text, { delay });
  await page.waitForTimeout(after);
}

async function selectSmooth(page, locator, label, { before = 300, after = 600 } = {}) {
  await moveTo(page, locator);
  await page.waitForTimeout(before);
  await locator.selectOption({ label });
  await page.waitForTimeout(after);
}

async function setColor(page, locator, hex, { before = 300, after = 600 } = {}) {
  await moveTo(page, locator);
  await page.waitForTimeout(before);
  // React pisa el setter de .value de un input controlado para poder
  // distinguir un cambio "real" de uno programático — asignar
  // el.value = x a secas queda invisible para su tracking interno, así
  // que el onChange nunca dispara. Hay que pasar por el setter nativo
  // de HTMLInputElement (mismo truco que usa @testing-library/react).
  await locator.evaluate((el, value) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeSetter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, hex);
  await page.waitForTimeout(after);
  const applied = await locator.inputValue();
  if (applied.toLowerCase() !== hex.toLowerCase()) {
    throw new Error(`El color no se aplicó: se esperaba ${hex}, quedó ${applied}`);
  }
}

async function smoothScrollBy(page, deltaY, { steps = 10, stepDelay = 60 } = {}) {
  const perStep = deltaY / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, perStep);
    await page.waitForTimeout(stepDelay);
  }
}

// ---------------------------------------------------------------
// Guión de la grabación
// ---------------------------------------------------------------

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.");
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const admin = createClient(url, serviceKey);
  console.log("Creando cuenta de prueba desechable...");
  const demo = await createDemoAccount(admin);
  console.log(`Cuenta creada: ${demo.email}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIDEO_SIZE,
    recordVideo: { dir: OUTPUT_DIR, size: VIDEO_SIZE },
  });
  const page = await context.newPage();
  const mainVideo = page.video();
  await injectCursor(page);

  // Cualquier pestaña nueva que abra la app (ej. el PDF exportado) se
  // cierra enseguida — cada pestaña de un contexto graba su propio
  // video por separado, y el cierre final tiene que quedar en la
  // pestaña principal para que todo viva en un solo archivo.
  context.on("page", (popup) => {
    popup.waitForLoadState().then(() => popup.close()).catch(() => {});
  });

  let presupuestoId = null;

  try {
    // 1. Login ----------------------------------------------------
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1500);
    await typeSmooth(page, page.getByRole("textbox", { name: "Email" }), demo.email);
    await typeSmooth(page, page.getByRole("textbox", { name: "Contraseña" }), demo.password);
    await clickSmooth(page, page.getByRole("button", { name: "Ingresar" }), { after: 1200 });
    await page.waitForURL(/\/plantillas$/);
    await page.waitForTimeout(1000);

    // 2. Crear plantilla desde cero --------------------------------
    await clickSmooth(page, page.getByRole("button", { name: "Crear plantilla" }), { after: 800 });
    await typeSmooth(
      page,
      page.getByPlaceholder("Nombre de la plantilla"),
      "Propuesta de Servicios",
    );
    await clickSmooth(page, page.getByRole("button", { name: "Nueva plantilla" }), { after: 1200 });
    await page.waitForURL(/\/plantillas\/[0-9a-f-]+$/);
    await page.waitForTimeout(1200);

    // 3. Agregar la primera página ----------------------------------
    await typeSmooth(page, page.getByPlaceholder(/Título de la página/), "Página 1");
    await clickSmooth(page, page.getByRole("button", { name: "+ Agregar página" }), { after: 1000 });

    // 4. Agregar las secciones, una por una --------------------------
    // El título de cada sección vive como VALUE de un <input> (se
    // puede renombrar ahí mismo), no como texto plano — por eso no se
    // puede ubicar cada tarjeta por su título con getByText. En vez de
    // eso, cada acción posterior (agregar campo / línea combinada) se
    // ubica por posición (nth), que es estable: las tarjetas quedan en
    // el mismo orden en que se crean las secciones.
    const sectionTypeSelect = () =>
      page.locator("form", { has: page.getByRole("button", { name: "Agregar sección" }) }).getByRole("combobox");
    const sectionTitleInput = () => page.getByPlaceholder("Título de la sección");

    const addSectionTyped = async (title, typeLabel) => {
      await typeSmooth(page, sectionTitleInput(), title);
      await selectSmooth(page, sectionTypeSelect(), typeLabel);
      await clickSmooth(page, page.getByRole("button", { name: "Agregar sección" }), { after: 1100 });
    };

    await addSectionTyped("Portada", "Portada");
    await addSectionTyped("Datos del Cliente", "Datos del cliente (fecha, N° presupuesto)");
    await addSectionTyped("Detalle del Proyecto", "Tabla de datos"); // tarjeta genérica #0
    await addSectionTyped("Presupuesto", "Ítems (cant. × precio)");
    await addSectionTyped("Condiciones", "Cláusulas"); // tarjeta genérica #1
    await addSectionTyped("Cierre", "Cierre"); // tarjeta genérica #2

    // 5. Campos de "Detalle del Proyecto" (tarjeta genérica #0) -------
    const addFieldAt = async (cardIndex, name) => {
      await clickSmooth(page, page.getByRole("button", { name: "+ Agregar campo" }).nth(cardIndex), { after: 500 });
      await clickSmooth(page, page.getByRole("button", { name: "Campo nuevo" }), { after: 300 });
      await typeSmooth(page, page.getByPlaceholder("Nombre del campo"), name);
      await clickSmooth(page, page.getByRole("button", { name: "Agregar", exact: true }), { after: 900 });
    };
    await addFieldAt(0, "Proyecto");
    await addFieldAt(0, "Plazo de Entrega");

    // 6. Cláusulas (tarjeta genérica #1): dos líneas combinadas -------
    // "+ Agregar línea combinada" solo aparece una vez que existe al
    // menos un campo en el catálogo de la cuenta — por eso va después
    // del paso 5, nunca antes.
    const addCompositeLineAt = async (cardIndex, text) => {
      await clickSmooth(page, page.getByRole("button", { name: "+ Agregar línea combinada" }).nth(cardIndex), { after: 500 });
      await typeSmooth(page, page.getByPlaceholder(/Ej: "Son:/), text, { delay: 28 });
      await clickSmooth(page, page.getByRole("button", { name: "Agregar", exact: true }), { after: 900 });
    };
    await addCompositeLineAt(1, "Validez de esta propuesta: 15 días desde la fecha de emisión.");
    await addCompositeLineAt(1, "Forma de pago: 50% al inicio, 50% contra entrega.");

    // 7. Cierre (tarjeta genérica #2): una línea combinada ------------
    await addCompositeLineAt(2, "Gracias por confiar en nosotros.");

    // 8. Campo total de la plantilla -----------------------------------
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await page.waitForTimeout(900);
    const totalFieldSelect = page.locator("select").first();
    await selectSmooth(page, totalFieldSelect, "Presupuesto — Total General", { after: 1200 });

    // 9. Tema: acento de color -------------------------------------------
    await clickSmooth(page, page.getByRole("button", { name: "tema" }), { after: 900 });
    await setColor(page, page.locator('input[type="color"]').first(), "#2f6fed", { after: 900 });
    await clickSmooth(page, page.getByRole("button", { name: "Guardar" }), { after: 1200 });

    // 10. Ir a Presupuestos → Nuevo presupuesto ---------------------------
    await clickSmooth(page, page.getByRole("link", { name: "Presupuestos" }), { after: 900 });
    await page.waitForURL(/\/presupuestos$/);
    await clickSmooth(page, page.getByRole("link", { name: "Nuevo presupuesto" }).first(), { after: 900 });
    await page.waitForURL(/\/presupuestos\/new$/);
    await page.waitForTimeout(800);

    await selectSmooth(page, page.getByLabel("Plantilla"), "Propuesta de Servicios", { after: 800 });
    await typeSmooth(page, page.getByLabel("Nombre del cliente"), "Jardines Verde S.A.");
    await typeSmooth(page, page.getByLabel("Correo del cliente"), "contacto@jardinesverde.com");
    await typeSmooth(page, page.getByLabel("Proyecto"), "Diseño de Jardín Corporativo");
    await typeSmooth(page, page.getByLabel("Plazo de Entrega"), "3 semanas");

    // Ítems: primera fila ya viene en blanco, se llena directo.
    await typeSmooth(page, page.getByRole("textbox", { name: "Concepto" }).first(), "Diseño de identidad visual del jardín", { delay: 28 });
    await typeSmooth(page, page.getByLabel("Cantidad").first(), "1");
    await typeSmooth(page, page.getByLabel("Precio unitario").first(), "1200");

    await clickSmooth(page, page.getByRole("button", { name: "Agregar ítem" }), { after: 700 });
    await typeSmooth(page, page.getByRole("textbox", { name: "Concepto" }).nth(1), "Mantenimiento mensual del jardín", { delay: 28 });
    await typeSmooth(page, page.getByLabel("Cantidad").nth(1), "3");
    await typeSmooth(page, page.getByLabel("Precio unitario").nth(1), "150");

    await page.waitForTimeout(800);
    await clickSmooth(page, page.getByRole("button", { name: "Guardar y ver vista previa" }), { after: 1500 });
    await page.waitForURL(/\/presupuestos\/[0-9a-f-]+$/);
    presupuestoId = page.url().split("/presupuestos/")[1]?.split(/[/?#]/)[0] ?? null;
    await page.waitForTimeout(1200);

    // 11. Mostrar la vista previa completa, con scroll lento ---------------
    await smoothScrollBy(page, 1400, { steps: 18, stepDelay: 90 });
    await page.waitForTimeout(1200);

    // 12. Exportar PDF -----------------------------------------------------
    await clickSmooth(page, page.getByRole("button", { name: "Exportar PDF" }), { before: 400, after: 3500 });
    await page.waitForTimeout(1500);
  } finally {
    await context.close();
    await browser.close();

    console.log("Borrando la cuenta de prueba...");
    await deleteDemoAccount(admin, demo);
    console.log("Cuenta de prueba borrada.");

    // Cada pestaña del contexto graba su propio .webm — incluida
    // cualquier pestaña del PDF que se haya abierto y cerrado sola.
    // page.video() identifica el archivo exacto de la pestaña
    // principal (la única que importa); el resto se borra.
    const finalName = "plantilla-con-items-tutorial.webm";
    const to = path.join(OUTPUT_DIR, finalName);
    try {
      const mainVideoPath = await mainVideo.path();
      renameSync(mainVideoPath, to);
      console.log(`\nVideo listo: ${to}`);
    } catch (e) {
      console.warn("No se pudo resolver el video principal:", e.message);
    }

    for (const f of readdirSync(OUTPUT_DIR)) {
      if (f.endsWith(".webm") && f !== finalName) {
        try {
          rmSync(path.join(OUTPUT_DIR, f));
        } catch {
          // No crítico.
        }
      }
    }

    if (presupuestoId) {
      console.log(`(Presupuesto de ejemplo usado: ${presupuestoId} — ya borrado junto con la cuenta)`);
    }
  }
}

run().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
