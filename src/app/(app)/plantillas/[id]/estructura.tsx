"use client";

import { useState, useTransition } from "react";
import {
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
  updatePageSettings,
  updateSectionField,
  updateTemplateFooter,
  updateTemplateHeader,
} from "@/lib/templates/actions";
import {
  ALIGN_H_OPTIONS,
  ALIGN_V_OPTIONS,
  DATA_TYPES,
  HEADER_FOOTER_ELEMENT_TYPES,
  SECTION_TYPES,
  THEME_FONTS,
  type AlignH,
  type AlignV,
  type DataType,
  type FieldCatalogEntry,
  type HeaderFooterConfig,
  type HeaderFooterElement,
  type PageWithSections,
  type SectionType,
  type SectionWithFields,
  type Template,
  type ThemeFont,
} from "@/lib/types";

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  borderRadius: 12,
  boxShadow: "var(--sh-soft)",
  padding: "1rem 1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const chipStyle: React.CSSProperties = {
  background: "var(--bg)",
  color: "var(--accent)",
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
  border: "none",
  borderRadius: 8,
  padding: "0.4rem 0.6rem",
  font: "inherit",
  fontSize: "0.85rem",
};

type Runner = (fn: () => Promise<unknown>) => void;

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem" }}>{error}</p>}

      <HeaderFooterEditor kind="header" templateId={template.id} config={template.header} run={run} />
      <HeaderFooterEditor kind="footer" templateId={template.id} config={template.footer} run={run} />

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {pages.map((page, index) => (
          <PageCard
            key={page.id}
            template={template}
            page={page}
            catalog={catalog}
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
          style={{ ...cardStyle, flexDirection: "row", alignItems: "center" }}
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
              background: "var(--ink)",
              color: "#fff",
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
          <span key={index} style={chipStyle}>
            {el.type === "logo" ? "Logo" : el.type === "page_number" ? "Número de página" : el.text}
            <button
              type="button"
              onClick={() => moveElement(index, -1)}
              disabled={index === 0}
              style={{ ...iconButtonStyle, color: "var(--accent)" }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveElement(index, 1)}
              disabled={index === config.elements.length - 1}
              style={{ ...iconButtonStyle, color: "var(--accent)" }}
            >
              ↓
            </button>
            <button type="button" onClick={() => removeElement(index)} style={{ ...iconButtonStyle, color: "var(--accent)" }}>
              ×
            </button>
          </span>
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
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.4rem 0.9rem",
            font: "inherit",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Agregar elemento
        </button>
      </div>
    </div>
  );
}

function PageCard({
  template,
  page,
  catalog,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRename,
  run,
}: {
  template: Template;
  page: PageWithSections;
  catalog: FieldCatalogEntry[];
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== page.title && onRename(title.trim())}
          style={{ flex: 1, border: "none", background: "transparent", font: "inherit", fontWeight: 700, fontSize: "1rem" }}
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
            onMoveUp={index > 0 ? () => moveSection(index, -1) : undefined}
            onMoveDown={index < page.sections.length - 1 ? () => moveSection(index, 1) : undefined}
            onDelete={() => run(() => deleteSection(template.id, section.id))}
            onRename={(title) => run(() => renameSection(template.id, section.id, title))}
            run={run}
          />
        ))}

        <form
          style={{ ...cardStyle, flexDirection: "row", alignItems: "center" }}
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
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.5rem 1rem",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
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
  onMoveUp,
  onMoveDown,
  onDelete,
  onRename,
  run,
}: {
  template: Template;
  section: SectionWithFields;
  catalog: FieldCatalogEntry[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  run: Runner;
}) {
  const [title, setTitle] = useState(section.title);
  const [addingField, setAddingField] = useState(false);

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
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== section.title && onRename(title.trim())}
          style={{
            flex: 1,
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

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {section.fields.map((sf, index) => (
          <FieldRow
            key={sf.id}
            templateId={template.id}
            field={sf}
            onMoveUp={index > 0 ? () => moveField(index, -1) : undefined}
            onMoveDown={index < section.fields.length - 1 ? () => moveField(index, 1) : undefined}
            onRemove={() => run(() => removeSectionField(template.id, sf.id))}
            run={run}
          />
        ))}
      </div>

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
    </div>
  );
}

function FieldRow({
  templateId,
  field: sf,
  onMoveUp,
  onMoveDown,
  onRemove,
  run,
}: {
  templateId: string;
  field: SectionWithFields["fields"][number];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  run: Runner;
}) {
  const [sizeInput, setSizeInput] = useState(sf.font_size?.toString() ?? "");

  const commitSize = () => {
    const trimmed = sizeInput.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next === sf.font_size) return;
    if (next !== null && (!Number.isFinite(next) || next < 8 || next > 72)) {
      setSizeInput(sf.font_size?.toString() ?? "");
      return;
    }
    run(() => updateSectionField(templateId, sf.id, { fontSize: next }));
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        background: "var(--bg)",
        borderRadius: 8,
        padding: "0.4rem 0.6rem",
        fontSize: "0.85rem",
        flexWrap: "wrap",
      }}
    >
      <span style={{ flex: 1, minWidth: 100 }}>
        {sf.field.name}
        {sf.required && " *"}
      </span>

      <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--ink-dim)" }}>
        Fuente:
        <select
          value={sf.font_family ?? ""}
          onChange={(e) =>
            run(() =>
              updateSectionField(templateId, sf.id, {
                fontFamily: e.target.value === "" ? null : (e.target.value as ThemeFont),
              }),
            )
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
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--ink-dim)" }}>
        Tamaño:
        <input
          type="number"
          min={8}
          max={72}
          placeholder="Auto"
          value={sizeInput}
          onChange={(e) => setSizeInput(e.target.value)}
          onBlur={commitSize}
          style={{ ...selectStyle, width: 64 }}
        />
      </label>

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
  const [fontFamily, setFontFamily] = useState<ThemeFont | "">("");
  const [fontSize, setFontSize] = useState("");

  const submit = async () => {
    const family = fontFamily === "" ? null : fontFamily;
    const size = fontSize.trim() === "" ? null : Number(fontSize);

    if (mode === "existing") {
      if (!fieldId) return;
      run(() => addSectionField(templateId, sectionId, fieldId, required, family, size));
    } else {
      if (!newName.trim()) return;
      run(async () => {
        const created = await createCatalogField(templateId, newName.trim(), newType);
        await addSectionField(templateId, sectionId, created.id, required, family, size);
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

      <select
        value={fontFamily}
        onChange={(e) => setFontFamily(e.target.value as ThemeFont | "")}
        style={{ border: "none", borderRadius: 8, padding: "0.4rem 0.6rem", font: "inherit" }}
      >
        <option value="">Fuente: heredar</option>
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
        placeholder="Tamaño"
        value={fontSize}
        onChange={(e) => setFontSize(e.target.value)}
        style={{ border: "none", borderRadius: 8, padding: "0.4rem 0.6rem", font: "inherit", width: 90 }}
      />

      <button
        type="button"
        onClick={submit}
        style={{
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "0.4rem 0.9rem",
          font: "inherit",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Agregar
      </button>
      <button type="button" onClick={onDone} style={iconButtonStyle}>
        Cancelar
      </button>
    </div>
  );
}
