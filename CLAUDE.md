# Consola de Presupuestos — Brief del Proyecto

Este archivo es el punto de partida para trabajar en este repo con Claude Code. Resume todo lo que se decidió en la fase de diseño/planificación (hecha fuera de este entorno) para que el trabajo de código pueda arrancar directo en el paso 1, sin tener que re-explicar el contexto.

## Qué es esto

Una consola donde cualquier cuenta configura su propia plantilla de presupuesto (branding, secciones, campos) y genera presupuestos en PDF para sus clientes, con envío por correo y confirmación de aprobación. Nace del caso de uso real de Luis Rivas (DJ), pero el modelo de datos está pensado multi-cuenta desde el principio — no específico a Luis.

## Modelo conceptual — tres niveles

1. **Catálogo** — campos y tipos de sección disponibles. No es global: cada cuenta arma el suyo (empezando por los campos que ya usa Luis, más los que cree).
2. **Plantilla** — lo que arma una cuenta: qué secciones eligió y con qué campos (**Estructura**), más su logo/acento/degradado/tipografía (**Tema**).
3. **Presupuesto** — una Plantilla ya rellenada con los datos de un cliente real. Esto es lo que se exporta a PDF y se envía.

## Flujo funcional (ya bocetado, ver sección "Documentos de referencia")

Configurar plantilla → guardar → elegir plantilla + llenar datos de un cliente (nuevo presupuesto) → vista previa → **exportar PDF** (en el servidor, no en el navegador del cliente) → **enviar por correo** → *después*, por separado, el cliente **aprueba** (esto solo actualiza el estado guardado — no condiciona ni dispara el envío del correo, que ya ocurrió antes).

Fase 2, explícitamente fuera de esta etapa: reportes (presupuestos por período, cliente que más pide, cliente que más aprueba).

## Decisiones de stack

| Pieza | Elección | Notas |
|---|---|---|
| Frontend | **Next.js**, desplegado en **Vercel** | app de configuración + flujo de nuevo presupuesto |
| Datos + auth | **Supabase** (Postgres + Auth + Storage) | Row Level Security hace el aislamiento por cuenta — ver `schema.sql` |
| PDF | Función serverless **dentro del mismo proyecto Next.js**, con `@sparticuz/chromium` + `puppeteer-core` | decisión de la etapa de prueba: gratis en Vercel Hobby, sin servicio aparte. **Revisar antes de cobrar en serio**: el plan Hobby de Vercel está pensado para uso no comercial |
| Correo | **Resend**, llamado directo desde el server action de Next.js (sin n8n en el medio — ver nota abajo) | gratis: 3.000/mes, 100/día, hasta 3 dominios. Necesita un dominio propio verificado (SPF/DKIM) para enviar a destinatarios reales — en sandbox solo llega a la cuenta propia. El PDF va como adjunto del correo, no como link, para que no dependa de que la URL firmada siga viva cuando el cliente lo abre |

**Cambio respecto al documento original:** el plan inicial tenía a n8n como orquestador entre "presupuesto listo" y Resend. Se descartó al implementar el paso 4: n8n aporta valor cuando hay orquestación real (reintentos, recordatorios automáticos, multi-canal), y ninguna de esas necesidades existe todavía — sumarlo ahora es un servicio más para correr/mantener a cambio de nada. Si más adelante aparece esa necesidad, migrar de "Resend directo" a "n8n en el medio" es un cambio chico y aislado (una función, no una reescritura), así que no se está perdiendo nada por elegir simple ahora.

## Esquema de datos

Ver **`schema.sql`** — listo para correr en el SQL editor de Supabase o como migración. Siete tablas: `accounts`, `users`, `field_catalog`, `templates`, `template_sections`, `template_section_fields`, `presupuestos`.

**Ajuste respecto al documento original:** `template_sections` y `template_section_fields` llevan `account_id` directo (denormalizado), no solo el id de su padre. El documento de arquitectura las tenía sin esa columna; se agregó al escribir el SQL porque simplifica y agiliza las políticas de RLS (evita joins anidados en cada policy) sin cambiar el modelo conceptual — mismo dato, alcanzable antes solo por join.

Todas las tablas tienen RLS activado con una función `current_account_id()` que resuelve la cuenta del usuario autenticado; cada policy compara `account_id = current_account_id()`.

**Antes de dar por buena esta etapa**: crear dos cuentas de prueba y confirmar explícitamente que ninguna puede leer ni un dato de la otra — no basta con que las policies "se vean bien".

## Dirección visual — "D" (elegida)

Ver **`design-tokens.css`**. Resumen del lenguaje visual: base clara y directa (tipografía como protagonista, sin bordes duros entre secciones), con las tarjetas (secciones, chips, botones) ligeramente elevadas por una sola sombra suave — no el relieve fuerte de un neumorfismo clásico, solo lo justo para que se sientan "flotando". Paleta neutra (grises "plomo", nunca negro puro) con un verde vivo como único acento. Incluye also la variante oscura y un patrón de selector claro/oscuro para el header.

Tipografías: **Manrope** (UI) + **JetBrains Mono** (etiquetas/mono). Cargarlas vía Google Fonts o self-hosted.

## Orden de implementación sugerido

1. **Tablas y RLS** — correr `schema.sql`, probar aislamiento con dos cuentas de prueba.
2. **CRUD de plantillas** — la pantalla de Estructura + Tema, contra Supabase real.
3. **Nuevo presupuesto + vista previa** — elegir plantilla, llenar datos de cliente, ver resultado (sin exportar todavía).
4. **Exportar y enviar** — función serverless de PDF, guardado en Storage, envío directo por Resend. ✅ hecho.
5. **Aprobación del cliente** — enlace/botón que solo actualiza `status` y `approved_at`.

## Documentos de referencia (fase de diseño, fuera de este repo)

- **Plano de la Consola** — arquitectura conceptual, los tres niveles, el diagrama de ciclo de vida del presupuesto (configurar → PDF → correo → aprobación).
- **Editor de Plantilla** (canvas de diseño) — boceto funcional completo de "Estructura", "Agregar sección" y "Agregar campo" ya en la Dirección D, más las alternativas de estilo descartadas (A/B/C) para referencia.
- **Stack y Esquema de Datos** — el documento del que sale este brief, con el diagrama de componentes (fig. 3) y el detalle columna por columna de cada tabla.

Si hace falta releer el razonamiento detrás de alguna decisión (por qué RLS y no otra cosa, por qué el PDF se mueve al servidor, etc.), esos tres documentos tienen el detalle completo — este brief es el resumen operativo.

## Qué falta decidir / validar

- Confirmar que el plan Hobby de Vercel es aceptable para esta etapa (no comercial) y definir cuándo pasar a Pro.
- Verificar el dominio en Resend antes de que un presupuesto real necesite llegarle a un cliente.
- La prueba de aislamiento de RLS con dos cuentas (paso 1) no es opcional — es la pieza que reemplaza el aislamiento que faltaba cuando esto era un artifact de Claude.
