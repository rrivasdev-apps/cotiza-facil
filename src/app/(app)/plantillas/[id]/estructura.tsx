"use client";

import { useRef, useState, useTransition } from "react";
import {
  addCompositeLine,
  addPage,
  addSection,
  addSectionField,
  createCatalogField,
  deletePage,
  deleteSection,
  removeSectionField,
  renamePage,
  renameSection,
  reorderPages,
  reorderSectionFields,
  reorderSections,
  updateCompositeLine,
  updatePageSettings,
  updateSectionField,
  updateSectionMargins,
  updateTemplateFooter,
  updateTemplateHeader,
  updateTemplateTotalField,
} from "@/lib/templates/actions";
import { displayToTemplate, templateToDisplay } from "@/lib/composite-template";
import { collectSectionTotalFields } from "@/lib/presupuesto-items";
import {
  ALIGN_H_OPTIONS,
  ALIGN_V_OPTIONS,
  DATA_TYPES,
  getSectionMargins,
  HEADER_FOOTER_ELEMENT_TYPES,
  SECTION_TYPES,
  THEME_FONTS,
  type AlignH,
  type AlignV,
  type DataType,
  type FieldCatalogEntry,
  type FieldStyle,
  type HeaderFooterConfig,
  type HeaderFooterElement,
  type PageWithSections,
  type SectionMargins,
  type SectionType,
  type SectionWithFields,
  type Template,
  type TemplateSectionField,
  type ThemeFont,
} from "@/lib/types";

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--sh-soft)",
  padding: "1.1rem 1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const chipStyle: React.CSSProperties = {
  background: "var(--accent-soft)",
  color: "var(--accent-hover)",
  borderRadius: 999,
  padding: "0.3rem 0.75rem",
  fontSize: "0.85rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
};

const iconButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ink-dim)",
  cursor: "pointer",
  font: "inherit",
};

const selectStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.4rem 0.6rem",
  font: "inherit",
  fontSize: "0.85rem",
};

// Fondo/letra correctos en los dos temas para un botón que usa el
// acento como fondo (--btn-primary-fg es blanco en claro y casi negro
// en oscuro, porque el verde vivo de oscuro no contrasta con blanco).
const accentButtonStyle: React.CSSProperties = {
  background: "var(--btn-primary-bg)",
  color: "var(--btn-primary-fg)",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "0.4rem 0.9rem",
  font: "inherit",
  fontWeight: 700,
  cursor: "pointer",
};

type Runner = (fn: () => Promise<unknown>) => void;

function isRegularField(
  sf: SectionWithFields["fields"][number],
): sf is TemplateSectionField & { field: FieldCatalogEntry } {
  return sf.field !== null;
}

export function Estructura({
  template,
  pages,
  catalog,
}: {
  template: Template;
  pages: PageWithSections[];
  catalog: FieldCatalogEntry[];
}) {
  const [, startTransition] = useTransition();
  const [newPageTitle, setNewPageTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run: Runner = (fn) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ocurrió un error.");
      }
    });
  };

  const movePage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    const ids = pages.map((p) => p.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderPages(template.id, ids));
  };

  // El Total General de cada sección "tabla_items" se puede referenciar
  // igual que un campo moneda real (para un "valor en letras", una
  // fórmula de impuesto, o una línea combinada) — ver
  // sectionTotalField en presupuesto-items.ts.
  const sectionTotalFieldsList = collectSectionTotalFields(pages.flatMap((p) => p.sections));

  // Campos tipo "moneda" ya usados en algún lado de la plantilla — son
  // los únicos elegibles como fuente de un campo "valor en letras",
  // porque solo esos van a tener un valor numérico guardado en el
  // presupuesto para convertir.
  const moneyFields = new Map<string, FieldCatalogEntry>();
  for (const page of pages) {
    for (const section of page.sections) {
      for (const sf of section.fields) {
        if (sf.field && sf.field.data_type === "moneda") moneyFields.set(sf.field.id, sf.field);
      }
    }
  }
  const moneyFieldsList = [...Array.from(moneyFields.values()), ...sectionTotalFieldsList];

  // Todos los campos ya usados en algún lado de la plantilla — son los
  // únicos que una "línea combinada" puede referenciar, por la misma
  // razón: solo esos van a tener un valor cargado en el presupuesto.
  const allFields = new Map<string, FieldCatalogEntry>();
  for (const page of pages) {
    for (const section of page.sections) {
      for (const sf of section.fields) {
        if (sf.field) allFields.set(sf.field.id, sf.field);
      }
    }
  }
  const allFieldsList = [...Array.from(allFields.values()), ...sectionTotalFieldsList];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      <TotalFieldSelector template={template} candidates={moneyFieldsList} run={run} />

      <HeaderFooterEditor kind="header" templateId={template.id} config={template.header} run={run} />
      <HeaderFooterEditor kind="footer" templateId={template.id} config={template.footer} run={run} />

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {pages.map((page, index) => (
          <PageCard
            key={page.id}
            template={template}
            page={page}
            catalog={catalog}
            moneyFields={moneyFieldsList}
            allFields={allFieldsList}
            onMoveUp={index > 0 ? () => movePage(index, -1) : undefined}
            onMoveDown={index < pages.length - 1 ? () => movePage(index, 1) : undefined}
            onDelete={() => run(() => deletePage(template.id, page.id))}
            onRename={(title) => run(() => renamePage(template.id, page.id, title))}
            run={run}
          />
        ))}
        {pages.length === 0 && (
          <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem" }}>Todavía no hay páginas.</p>
        )}

        <form
          style={{ ...cardStyle, flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!newPageTitle.trim()) return;
            run(() => addPage(template.id, newPageTitle.trim()));
            setNewPageTitle("");
          }}
        >
          <input
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
            placeholder={`Título de la página (ej. "Página ${pages.length + 1}")`}
            required
            style={{
              flex: 1,
              minWidth: 0,
              background: "var(--bg)",
              border: "none",
              borderRadius: 8,
              padding: "0.5rem 0.75rem",
              font: "inherit",
            }}
          />
          <button
            type="submit"
            style={{
              background: "var(--btn-primary-bg)",
              color: "var(--btn-primary-fg)",
              border: "none",
              borderRadius: 8,
              padding: "0.5rem 1rem",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Agregar página
          </button>
        </form>
      </div>
    </div>
  );
}

function TotalFieldSelector({
  template,
  candidates,
  run,
}: {
  template: Template;
  candidates: FieldCatalogEntry[];
  run: Runner;
}) {
  return (
    <div style={cardStyle}>
      <span style={{ fontWeight: 600 }}>Campo total de la plantilla</span>
      <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
        Cuál campo representa el monto total de un presupuesto hecho con esta plantilla — se guarda aparte para
        poder sumar y agrupar presupuestos más adelante (reportes), sin cambiar nada de lo que se imprime.
      </span>
      <select
        value={template.total_field_id ?? ""}
        onChange={(e) => run(() => updateTemplateTotalField(template.id, e.target.value || null))}
        style={{ ...selectStyle, width: "fit-content" }}
      >
        <option value="">Ninguno</option>
        {candidates.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function HeaderFooterEditor({
  kind,
  templateId,
  config,
  run,
}: {
  kind: "header" | "footer";
  templateId: string;
  config: HeaderFooterConfig;
  run: Runner;
}) {
  const [newElementType, setNewElementType] = useState<HeaderFooterElement["type"]>("texto");
  const [newElementText, setNewElementText] = useState("");

  const label = kind === "header" ? "Encabezado" : "Pie de página";

  const save = (next: HeaderFooterConfig) => {
    run(() => (kind === "header" ? updateTemplateHeader(templateId, next) : updateTemplateFooter(templateId, next)));
  };

  const removeElement = (index: number) => {
    save({ ...config, elements: config.elements.filter((_, i) => i !== index) });
  };

  const moveElement = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.elements.length) return;
    const elements = [...config.elements];
    [elements[index], elements[target]] = [elements[target], elements[index]];
    save({ ...config, elements });
  };

  const addElement = () => {
    const element: HeaderFooterElement =
      newElementType === "texto" ? { type: "texto", text: newElementText.trim() } : { type: newElementType };
    if (element.type === "texto" && !element.text) return;
    save({ ...config, elements: [...config.elements, element] });
    setNewElementText("");
  };

  const editElement = (index: number, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const elements = [...config.elements];
    elements[index] = { type: "texto", text: trimmed };
    save({ ...config, elements });
  };

  return (
    <div style={cardStyle}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
        Se repite igual en todas las páginas — cada página elige si lo muestra o no.
      </span>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", fontSize: "0.85rem", flexWrap: "wrap" }}>
        <span style={{ color: "var(--ink-dim)" }}>Alineación:</span>
        <select value={config.alignH} onChange={(e) => save({ ...config, alignH: e.target.value as AlignH })} style={selectStyle}>
          {ALIGN_H_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={config.alignV} onChange={(e) => save({ ...config, alignV: e.target.value as AlignV })} style={selectStyle}>
          {ALIGN_V_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {config.elements.map((el, index) => (
          <HeaderFooterElementChip
            key={index}
            element={el}
            onEdit={el.type === "texto" ? (text) => editElement(index, text) : undefined}
            onMoveUp={() => moveElement(index, -1)}
            canMoveUp={index > 0}
            onMoveDown={() => moveElement(index, 1)}
            canMoveDown={index < config.elements.length - 1}
            onRemove={() => removeElement(index)}
          />
        ))}
        {config.elements.length === 0 && (
          <span style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>Sin elementos.</span>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={newElementType}
          onChange={(e) => setNewElementType(e.target.value as HeaderFooterElement["type"])}
          style={selectStyle}
        >
          {HEADER_FOOTER_ELEMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {newElementType === "texto" && (
          <input
            value={newElementText}
            onChange={(e) => setNewElementText(e.target.value)}
            placeholder="Texto"
            style={{ ...selectStyle, flex: 1, minWidth: 120 }}
          />
        )}
        <button
          type="button"
          onClick={addElement}
          style={accentButtonStyle}
        >
          + Agregar elemento
        </button>
      </div>
    </div>
  );
}

function HeaderFooterElementChip({
  element,
  onEdit,
  onMoveUp,
  canMoveUp,
  onMoveDown,
  canMoveDown,
  onRemove,
}: {
  element: HeaderFooterElement;
  onEdit?: (text: string) => void;
  onMoveUp: () => void;
  canMoveUp: boolean;
  onMoveDown: () => void;
  canMoveDown: boolean;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(element.type === "texto" ? element.text : "");

  const label = element.type === "logo" ? "Logo" : element.type === "page_number" ? "Número de página" : element.text;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <span style={chipStyle}>
        {label}
        {onEdit && (
          <button
            type="button"
            onClick={() => {
              setText(element.type === "texto" ? element.text : "");
              setEditing((v) => !v);
            }}
            style={{ ...iconButtonStyle, color: editing ? "var(--accent)" : "var(--ink-dim)", fontWeight: 600 }}
          >
            Editar
          </button>
        )}
        <button type="button" onClick={onMoveUp} disabled={!canMoveUp} style={{ ...iconButtonStyle, color: "var(--accent)" }}>
          ↑
        </button>
        <button type="button" onClick={onMoveDown} disabled={!canMoveDown} style={{ ...iconButtonStyle, color: "var(--accent)" }}>
          ↓
        </button>
        <button type="button" onClick={onRemove} style={{ ...iconButtonStyle, color: "var(--accent)" }}>
          ×
        </button>
      </span>

      {editing && onEdit && (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input value={text} onChange={(e) => setText(e.target.value)} style={{ ...selectStyle, flex: 1, minWidth: 120 }} />
          <button
            type="button"
            onClick={() => {
              onEdit(text);
              setEditing(false);
            }}
            style={accentButtonStyle}
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}

function PageCard({
  template,
  page,
  catalog,
  moneyFields,
  allFields,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRename,
  run,
}: {
  template: Template;
  page: PageWithSections;
  catalog: FieldCatalogEntry[];
  moneyFields: FieldCatalogEntry[];
  allFields: FieldCatalogEntry[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  run: Runner;
}) {
  const [title, setTitle] = useState(page.title);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionType, setNewSectionType] = useState<SectionType>("texto_libre");

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= page.sections.length) return;
    const ids = page.sections.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderSections(template.id, ids));
  };

  const updateSettings = (
    patch: Partial<{ showHeader: boolean; showFooter: boolean; bodyAlignH: AlignH; bodyAlignV: AlignV }>,
  ) => {
    run(() =>
      updatePageSettings(template.id, page.id, {
        showHeader: page.show_header,
        showFooter: page.show_footer,
        bodyAlignH: page.body_align_h,
        bodyAlignV: page.body_align_v,
        ...patch,
      }),
    );
  };

  return (
    <div style={{ ...cardStyle, gap: "1rem", border: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== page.title && onRename(title.trim())}
          style={{
            flex: 1,
            minWidth: 100,
            border: "none",
            background: "transparent",
            font: "inherit",
            fontWeight: 700,
            fontSize: "1rem",
          }}
        />
        <button type="button" style={iconButtonStyle} onClick={onMoveUp} disabled={!onMoveUp}>
          ↑
        </button>
        <button type="button" style={iconButtonStyle} onClick={onMoveDown} disabled={!onMoveDown}>
          ↓
        </button>
        <button type="button" style={iconButtonStyle} onClick={onDelete}>
          Eliminar página
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "center", fontSize: "0.85rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <input
            type="checkbox"
            checked={page.show_header}
            onChange={(e) => updateSettings({ showHeader: e.target.checked })}
          />
          Aplica encabezado
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <input
            type="checkbox"
            checked={page.show_footer}
            onChange={(e) => updateSettings({ showFooter: e.target.checked })}
          />
          Aplica pie de página
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{ color: "var(--ink-dim)" }}>Cuerpo:</span>
          <select
            value={page.body_align_h}
            onChange={(e) => updateSettings({ bodyAlignH: e.target.value as AlignH })}
            style={selectStyle}
          >
            {ALIGN_H_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={page.body_align_v}
            onChange={(e) => updateSettings({ bodyAlignV: e.target.value as AlignV })}
            style={selectStyle}
          >
            {ALIGN_V_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          paddingLeft: "0.75rem",
          borderLeft: "2px solid var(--line)",
        }}
      >
        {page.sections.map((section, index) => (
          <SectionCard
            key={section.id}
            template={template}
            section={section}
            catalog={catalog}
            moneyFields={moneyFields}
            allFields={allFields}
            onMoveUp={index > 0 ? () => moveSection(index, -1) : undefined}
            onMoveDown={index < page.sections.length - 1 ? () => moveSection(index, 1) : undefined}
            onDelete={() => run(() => deleteSection(template.id, section.id))}
            onRename={(title) => run(() => renameSection(template.id, section.id, title))}
            run={run}
          />
        ))}

        <form
          style={{ ...cardStyle, flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!newSectionTitle.trim()) return;
            run(() => addSection(template.id, page.id, newSectionType, newSectionTitle.trim()));
            setNewSectionTitle("");
          }}
        >
          <input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Título de la sección"
            required
            style={{
              flex: 1,
              minWidth: 0,
              background: "var(--bg)",
              border: "none",
              borderRadius: 8,
              padding: "0.5rem 0.75rem",
              font: "inherit",
            }}
          />
          <select
            value={newSectionType}
            onChange={(e) => setNewSectionType(e.target.value as SectionType)}
            style={{
              background: "var(--bg)",
              border: "none",
              borderRadius: 8,
              padding: "0.5rem 0.75rem",
              font: "inherit",
            }}
          >
            {SECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              ...accentButtonStyle,
              padding: "0.5rem 1rem",
            }}
          >
            Agregar sección
          </button>
        </form>
      </div>
    </div>
  );
}

function SectionCard({
  template,
  section,
  catalog,
  moneyFields,
  allFields,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRename,
  run,
}: {
  template: Template;
  section: SectionWithFields;
  catalog: FieldCatalogEntry[];
  moneyFields: FieldCatalogEntry[];
  allFields: FieldCatalogEntry[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  run: Runner;
}) {
  const [title, setTitle] = useState(section.title);
  const [addingField, setAddingField] = useState(false);
  const [addingComposite, setAddingComposite] = useState(false);

  const sectionTypeLabel = SECTION_TYPES.find((t) => t.value === section.type)?.label;
  const usedFieldIds = new Set(section.fields.map((f) => f.field_catalog_id));
  const availableFields = catalog.filter((f) => !usedFieldIds.has(f.id));

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= section.fields.length) return;
    const ids = section.fields.map((f) => f.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderSectionFields(template.id, ids));
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== section.title && onRename(title.trim())}
          style={{
            flex: 1,
            minWidth: 100,
            border: "none",
            background: "transparent",
            font: "inherit",
            fontWeight: 600,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
          }}
        >
          {sectionTypeLabel}
        </span>
        <button type="button" style={iconButtonStyle} onClick={onMoveUp} disabled={!onMoveUp}>
          ↑
        </button>
        <button type="button" style={iconButtonStyle} onClick={onMoveDown} disabled={!onMoveDown}>
          ↓
        </button>
        <button type="button" style={iconButtonStyle} onClick={onDelete}>
          Eliminar
        </button>
      </div>

      <MarginEditor
        margins={getSectionMargins(section.config)}
        onChange={(margins) => run(() => updateSectionMargins(template.id, section.id, margins))}
      />

      {section.type === "tabla_items" || section.type === "datos_cliente" ? (
        <p style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>
          {section.type === "tabla_items"
            ? "Los ítems (cantidad, precio unitario) se cargan al hacer cada presupuesto, no acá — esta sección no usa campos de la plantilla."
            : "Nombre del cliente, fecha y N° de presupuesto se completan solos al hacer cada presupuesto — esta sección no usa campos de la plantilla."}
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {section.fields.map((sf, index) =>
              isRegularField(sf) ? (
                <FieldRow
                  key={sf.id}
                  templateId={template.id}
                  field={sf}
                  moneyFields={moneyFields}
                  onMoveUp={index > 0 ? () => moveField(index, -1) : undefined}
                  onMoveDown={index < section.fields.length - 1 ? () => moveField(index, 1) : undefined}
                  onRemove={() => run(() => removeSectionField(template.id, sf.id))}
                  run={run}
                />
              ) : (
                <CompositeLineRow
                  key={sf.id}
                  templateId={template.id}
                  field={sf}
                  allFields={allFields}
                  onMoveUp={index > 0 ? () => moveField(index, -1) : undefined}
                  onMoveDown={index < section.fields.length - 1 ? () => moveField(index, 1) : undefined}
                  onRemove={() => run(() => removeSectionField(template.id, sf.id))}
                  run={run}
                />
              ),
            )}
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {addingField ? (
              <AddFieldForm
                templateId={template.id}
                sectionId={section.id}
                availableFields={availableFields}
                run={run}
                onDone={() => setAddingField(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingField(true)}
                style={{
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  font: "inherit",
                  fontWeight: 600,
                }}
              >
                + Agregar campo
              </button>
            )}

            {!addingField &&
              (addingComposite ? (
                <AddCompositeLineForm
                  templateId={template.id}
                  sectionId={section.id}
                  availableFields={allFields}
                  run={run}
                  onDone={() => setAddingComposite(false)}
                />
              ) : (
                allFields.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAddingComposite(true)}
                    style={{
                      alignSelf: "flex-start",
                      background: "transparent",
                      border: "none",
                      color: "var(--accent)",
                      cursor: "pointer",
                      font: "inherit",
                      fontWeight: 600,
                    }}
                  >
                    + Agregar línea combinada
                  </button>
                )
              ))}
          </div>
        </>
      )}
    </div>
  );
}

const MARGIN_FIELDS: { key: keyof SectionMargins; label: string }[] = [
  { key: "top", label: "Superior" },
  { key: "bottom", label: "Inferior" },
  { key: "left", label: "Izquierdo" },
  { key: "right", label: "Derecho" },
];

function MarginEditor({
  margins,
  onChange,
}: {
  margins: SectionMargins;
  onChange: (next: SectionMargins) => void;
}) {
  const [inputs, setInputs] = useState<Record<keyof SectionMargins, string>>({
    top: String(margins.top),
    bottom: String(margins.bottom),
    left: String(margins.left),
    right: String(margins.right),
  });

  const commit = (key: keyof SectionMargins) => {
    const trimmed = inputs[key].trim();
    const next = trimmed === "" ? 0 : Number(trimmed);
    if (!Number.isFinite(next) || next < 0) {
      setInputs((v) => ({ ...v, [key]: String(margins[key]) }));
      return;
    }
    if (next === margins[key]) return;
    onChange({ ...margins, [key]: next });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", fontSize: "0.85rem" }}>
      <span style={{ color: "var(--ink-faint)" }}>Márgenes (px):</span>
      {MARGIN_FIELDS.map(({ key, label }) => (
        <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--ink-dim)" }}>
          {label}
          <input
            type="number"
            min={0}
            value={inputs[key]}
            onChange={(e) => setInputs((v) => ({ ...v, [key]: e.target.value }))}
            onBlur={() => commit(key)}
            style={{ ...selectStyle, width: 56 }}
          />
        </label>
      ))}
    </div>
  );
}

const toggleButtonStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "var(--btn-primary-bg)" : "var(--card)",
  color: active ? "var(--btn-primary-fg)" : "var(--ink-dim)",
  border: active ? "none" : "1px solid var(--line)",
  borderRadius: 6,
  width: 26,
  height: 26,
  cursor: "pointer",
  fontWeight: 700,
});

function StyleEditor({
  label,
  style,
  onChange,
}: {
  label: string;
  style: FieldStyle;
  onChange: (next: FieldStyle) => void;
}) {
  const [sizeInput, setSizeInput] = useState(style.fontSize?.toString() ?? "");

  const commitSize = () => {
    const trimmed = sizeInput.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next === style.fontSize) return;
    if (next !== null && (!Number.isFinite(next) || next < 8 || next > 72)) {
      setSizeInput(style.fontSize?.toString() ?? "");
      return;
    }
    onChange({ ...style, fontSize: next });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink-dim)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
        <select
          value={style.fontFamily ?? ""}
          onChange={(e) =>
            onChange({ ...style, fontFamily: e.target.value === "" ? null : (e.target.value as ThemeFont) })
          }
          style={selectStyle}
        >
          <option value="">Heredar</option>
          {THEME_FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={8}
          max={72}
          placeholder="Auto"
          value={sizeInput}
          onChange={(e) => setSizeInput(e.target.value)}
          onBlur={commitSize}
          style={{ ...selectStyle, width: 60 }}
        />
        <button
          type="button"
          title="Negrita"
          onClick={() => onChange({ ...style, bold: !style.bold })}
          style={{ ...toggleButtonStyle(style.bold), fontStyle: "normal" }}
        >
          N
        </button>
        <button
          type="button"
          title="Cursiva"
          onClick={() => onChange({ ...style, italic: !style.italic })}
          style={{ ...toggleButtonStyle(style.italic), fontStyle: "italic" }}
        >
          C
        </button>
        <button
          type="button"
          title="Subrayado"
          onClick={() => onChange({ ...style, underline: !style.underline })}
          style={{ ...toggleButtonStyle(style.underline), textDecoration: "underline" }}
        >
          S
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  templateId,
  field: sf,
  moneyFields,
  onMoveUp,
  onMoveDown,
  onRemove,
  run,
}: {
  templateId: string;
  field: TemplateSectionField & { field: FieldCatalogEntry };
  moneyFields: FieldCatalogEntry[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  run: Runner;
}) {
  const [showStyle, setShowStyle] = useState(false);

  const isTextField = sf.field.data_type === "texto_corto" || sf.field.data_type === "texto_largo";
  const isMoneyField = sf.field.data_type === "moneda";
  const numberInWordsCandidates = moneyFields.filter((f) => f.id !== sf.field_catalog_id);
  const formulaCandidates = moneyFields.filter((f) => f.id !== sf.field_catalog_id);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        background: "var(--bg)",
        borderRadius: 8,
        padding: "0.4rem 0.6rem",
        fontSize: "0.85rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 100 }}>{sf.field.name}</span>

        <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--ink-dim)" }}>
          <input
            type="checkbox"
            checked={sf.required}
            onChange={(e) => run(() => updateSectionField(templateId, sf.id, { required: e.target.checked }))}
          />
          Obligatorio
        </label>

        <label
          title="Si se destilda, el campo se sigue pidiendo al cargar el presupuesto pero no se imprime en el documento."
          style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--ink-dim)" }}
        >
          <input
            type="checkbox"
            checked={sf.visible}
            onChange={(e) => run(() => updateSectionField(templateId, sf.id, { visible: e.target.checked }))}
          />
          Visible en el documento
        </label>

        <button
          type="button"
          onClick={() => setShowStyle((v) => !v)}
          style={{ ...iconButtonStyle, color: showStyle ? "var(--accent)" : "var(--ink-dim)", fontWeight: 600 }}
        >
          Estilo
        </button>

        <button type="button" onClick={onMoveUp} disabled={!onMoveUp} style={{ ...iconButtonStyle, color: "var(--accent)" }}>
          ↑
        </button>
        <button type="button" onClick={onMoveDown} disabled={!onMoveDown} style={{ ...iconButtonStyle, color: "var(--accent)" }}>
          ↓
        </button>
        <button type="button" onClick={onRemove} style={{ ...iconButtonStyle, color: "var(--accent)" }}>
          ×
        </button>
      </div>

      {isTextField && numberInWordsCandidates.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--ink-dim)" }}>
            <input
              type="checkbox"
              checked={sf.number_in_words_of !== null}
              onChange={(e) =>
                run(() =>
                  updateSectionField(templateId, sf.id, {
                    numberInWordsOf: e.target.checked ? numberInWordsCandidates[0].id : null,
                  }),
                )
              }
            />
            Valor número en letras
          </label>
          {sf.number_in_words_of !== null && (
            <select
              value={sf.number_in_words_of}
              onChange={(e) => run(() => updateSectionField(templateId, sf.id, { numberInWordsOf: e.target.value }))}
              style={selectStyle}
            >
              {numberInWordsCandidates.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {isMoneyField && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--ink-dim)" }}>
            <input
              type="checkbox"
              checked={sf.formula !== null}
              onChange={(e) =>
                run(() => updateSectionField(templateId, sf.id, { formula: e.target.checked ? "" : null }))
              }
            />
            Calcular con fórmula
          </label>
          {sf.formula !== null && (
            <FormulaBlock templateId={templateId} field={sf} candidates={formulaCandidates} run={run} />
          )}
        </div>
      )}

      {showStyle && (
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            flexWrap: "wrap",
            padding: "0.6rem",
            background: "var(--card)",
            borderRadius: 8,
          }}
        >
          <StyleEditor
            label="Etiqueta"
            style={sf.label_style}
            onChange={(next) => run(() => updateSectionField(templateId, sf.id, { labelStyle: next }))}
          />
          <StyleEditor
            label="Valor"
            style={sf.value_style}
            onChange={(next) => run(() => updateSectionField(templateId, sf.id, { valueStyle: next }))}
          />
        </div>
      )}
    </div>
  );
}

function FormulaBlock({
  templateId,
  field: sf,
  candidates,
  run,
}: {
  templateId: string;
  field: TemplateSectionField & { field: FieldCatalogEntry };
  candidates: FieldCatalogEntry[];
  run: Runner;
}) {
  const fieldsById = new Map(candidates.map((f) => [f.id, f]));
  const fieldsByName = new Map(candidates.map((f) => [f.name, f]));
  const displayText = templateToDisplay(sf.formula ?? "", fieldsById);

  // Si la fórmula todavía está vacía (recién tildado el checkbox), abre
  // el editor directo en vez de mostrar un valor vacío con un botón
  // "Editar" extra de por medio.
  const [editing, setEditing] = useState(sf.formula === "");
  const [text, setText] = useState(displayText);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const result = displayToTemplate(text, fieldsByName);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);
    run(() => updateSectionField(templateId, sf.id, { formula: result.template }));
    setEditing(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--ink-dim)", fontStyle: "italic" }}>
          {displayText || "(sin definir)"}
        </span>
        <button
          type="button"
          onClick={() => {
            setText(displayText);
            setError(null);
            setEditing((v) => !v);
          }}
          style={{ ...iconButtonStyle, color: editing ? "var(--accent)" : "var(--ink-dim)", fontWeight: 600 }}
        >
          Editar
        </button>
      </div>
      {editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.6rem", background: "var(--card)", borderRadius: 8 }}>
          <CompositeLineEditor value={text} onChange={setText} availableFields={candidates} />
          <p style={{ fontSize: "0.75rem", color: "var(--ink-faint)" }}>
            Operadores: + − × (*) ÷ (/) y paréntesis. Ej: {"{{Precio}} * {{Cantidad}}"}
          </p>
          {error && <p style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</p>}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={save}
              style={accentButtonStyle}
            >
              Guardar
            </button>
            <button type="button" onClick={() => setEditing(false)} style={iconButtonStyle}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddFieldForm({
  templateId,
  sectionId,
  availableFields,
  run,
  onDone,
}: {
  templateId: string;
  sectionId: string;
  availableFields: FieldCatalogEntry[];
  run: Runner;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">(
    availableFields.length > 0 ? "existing" : "new",
  );
  const [fieldId, setFieldId] = useState(availableFields[0]?.id ?? "");
  const [required, setRequired] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<DataType>("texto_corto");

  const submit = async () => {
    if (mode === "existing") {
      if (!fieldId) return;
      run(() => addSectionField(templateId, sectionId, fieldId, required));
    } else {
      if (!newName.trim()) return;
      run(async () => {
        const created = await createCatalogField(templateId, newName.trim(), newType);
        await addSectionField(templateId, sectionId, created.id, required);
      });
    }
    onDone();
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        alignItems: "center",
        background: "var(--bg)",
        borderRadius: 8,
        padding: "0.75rem",
      }}
    >
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setMode("existing")}
          disabled={availableFields.length === 0}
          style={{
            ...iconButtonStyle,
            fontWeight: mode === "existing" ? 700 : 400,
          }}
        >
          Del catálogo
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          style={{ ...iconButtonStyle, fontWeight: mode === "new" ? 700 : 400 }}
        >
          Campo nuevo
        </button>
      </div>

      {mode === "existing" ? (
        <select
          value={fieldId}
          onChange={(e) => setFieldId(e.target.value)}
          style={{ border: "none", borderRadius: 8, padding: "0.4rem 0.6rem", font: "inherit" }}
        >
          {availableFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      ) : (
        <>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del campo"
            style={{ border: "none", borderRadius: 8, padding: "0.4rem 0.6rem", font: "inherit" }}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as DataType)}
            style={{ border: "none", borderRadius: 8, padding: "0.4rem 0.6rem", font: "inherit" }}
          >
            {DATA_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}>
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
        />
        Obligatorio
      </label>

      <button
        type="button"
        onClick={submit}
        style={accentButtonStyle}
      >
        Agregar
      </button>
      <button type="button" onClick={onDone} style={iconButtonStyle}>
        Cancelar
      </button>
    </div>
  );
}

// Textarea + "insertar campo" compartido entre agregar y editar una
// línea combinada. El texto se edita con nombres de campo entre llaves
// ("{{Monto}}") — displayToTemplate los convierte a ids al guardar.
function CompositeLineEditor({
  value,
  onChange,
  availableFields,
}: {
  value: string;
  onChange: (next: string) => void;
  availableFields: FieldCatalogEntry[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [insertFieldId, setInsertFieldId] = useState(availableFields[0]?.id ?? "");

  const insertField = () => {
    const field = availableFields.find((f) => f.id === insertFieldId);
    if (!field) return;
    const token = `{{${field.name}}}`;
    const el = textareaRef.current;
    if (!el) {
      onChange(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='Ej: "Son: {{Monto en letras}} (Bs. {{Monto}})"'
        rows={2}
        style={{
          background: "var(--bg)",
          border: "none",
          borderRadius: 8,
          padding: "0.5rem 0.75rem",
          font: "inherit",
          resize: "vertical",
        }}
      />
      {availableFields.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <select value={insertFieldId} onChange={(e) => setInsertFieldId(e.target.value)} style={selectStyle}>
            {availableFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={insertField}
            style={{ ...iconButtonStyle, color: "var(--accent)", fontWeight: 600 }}
          >
            + Insertar campo
          </button>
        </div>
      )}
    </div>
  );
}

function CompositeLineRow({
  templateId,
  field: sf,
  allFields,
  onMoveUp,
  onMoveDown,
  onRemove,
  run,
}: {
  templateId: string;
  field: TemplateSectionField;
  allFields: FieldCatalogEntry[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  run: Runner;
}) {
  const fieldsById = new Map(allFields.map((f) => [f.id, f]));
  const fieldsByName = new Map(allFields.map((f) => [f.name, f]));
  const displayText = templateToDisplay(sf.composite_template ?? "", fieldsById);

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(displayText);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const result = displayToTemplate(text, fieldsByName);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);
    run(() => updateCompositeLine(templateId, sf.id, result.template));
    setEditing(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        background: "var(--bg)",
        borderRadius: 8,
        padding: "0.4rem 0.6rem",
        fontSize: "0.85rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 100, fontStyle: "italic", color: "var(--ink-dim)" }}>
          {displayText || "(línea vacía)"}
        </span>

        <label
          title="Si se destilda, la línea se sigue calculando pero no se imprime en el documento."
          style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", color: "var(--ink-dim)" }}
        >
          <input
            type="checkbox"
            checked={sf.visible}
            onChange={(e) => run(() => updateSectionField(templateId, sf.id, { visible: e.target.checked }))}
          />
          Visible en el documento
        </label>

        <button
          type="button"
          onClick={() => {
            setText(displayText);
            setError(null);
            setEditing((v) => !v);
          }}
          style={{ ...iconButtonStyle, color: editing ? "var(--accent)" : "var(--ink-dim)", fontWeight: 600 }}
        >
          Editar
        </button>

        <button type="button" onClick={onMoveUp} disabled={!onMoveUp} style={{ ...iconButtonStyle, color: "var(--accent)" }}>
          ↑
        </button>
        <button type="button" onClick={onMoveDown} disabled={!onMoveDown} style={{ ...iconButtonStyle, color: "var(--accent)" }}>
          ↓
        </button>
        <button type="button" onClick={onRemove} style={{ ...iconButtonStyle, color: "var(--accent)" }}>
          ×
        </button>
      </div>

      {editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.6rem", background: "var(--card)", borderRadius: 8 }}>
          <CompositeLineEditor value={text} onChange={setText} availableFields={allFields} />
          {error && <p style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</p>}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={save}
              style={accentButtonStyle}
            >
              Guardar
            </button>
            <button type="button" onClick={() => setEditing(false)} style={iconButtonStyle}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddCompositeLineForm({
  templateId,
  sectionId,
  availableFields,
  run,
  onDone,
}: {
  templateId: string;
  sectionId: string;
  availableFields: FieldCatalogEntry[];
  run: Runner;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fieldsByName = new Map(availableFields.map((f) => [f.name, f]));

  const submit = () => {
    if (!text.trim()) return;
    const result = displayToTemplate(text, fieldsByName);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);
    run(() => addCompositeLine(templateId, sectionId, result.template));
    onDone();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        background: "var(--bg)",
        borderRadius: 8,
        padding: "0.75rem",
        flex: 1,
        minWidth: 260,
      }}
    >
      <CompositeLineEditor value={text} onChange={setText} availableFields={availableFields} />
      {error && <p style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={submit}
          style={accentButtonStyle}
        >
          Agregar
        </button>
        <button type="button" onClick={onDone} style={iconButtonStyle}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
