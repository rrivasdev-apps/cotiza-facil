"use client";

import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export type SortOption<T> = {
  key: string;
  label: string;
  // Dirección con la que arranca al elegir este criterio (fecha: más nuevo
  // primero; nombre: A→Z).
  defaultDir: SortDir;
  compare: (a: T, b: T) => number;
};

const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });
export const compareText = (a: string, b: string) => collator.compare(a, b);

type Options<T> = {
  items: T[];
  searchText: (item: T) => string;
  sortOptions: SortOption<T>[];
  statusOf?: (item: T) => string;
};

export function useListControls<T>({ items, searchText, sortOptions, statusOf }: Options<T>) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState(sortOptions[0].key);
  const [dir, setDir] = useState<SortDir>(sortOptions[0].defaultDir);

  const visible = useMemo(() => {
    // Sin acentos ni mayúsculas, para que "jose" encuentre "José".
    const normalize = (text: string) =>
      text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const needle = normalize(search.trim());
    const active = sortOptions.find((option) => option.key === sortKey) ?? sortOptions[0];
    const filtered = items.filter(
      (item) =>
        (!needle || normalize(searchText(item)).includes(needle)) &&
        (!status || !statusOf || statusOf(item) === status),
    );
    const sign = dir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => sign * active.compare(a, b));
  }, [items, search, status, sortKey, dir, sortOptions, searchText, statusOf]);

  const pickSort = (key: string) => {
    const option = sortOptions.find((candidate) => candidate.key === key);
    if (!option) return;
    setSortKey(key);
    setDir(option.defaultDir);
  };

  return {
    visible,
    filtering: Boolean(search.trim() || status),
    toolbarProps: {
      search,
      onSearch: setSearch,
      status,
      onStatus: setStatus,
      sortKey,
      onSortKey: pickSort,
      dir,
      onToggleDir: () => setDir((current) => (current === "asc" ? "desc" : "asc")),
      sortOptions: sortOptions.map(({ key, label }) => ({ key, label })),
    },
  };
}

const controlStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-md)",
  padding: "0.5rem 0.75rem",
  font: "inherit",
  fontSize: "0.85rem",
  color: "var(--ink)",
};

type ToolbarProps = ReturnType<typeof useListControls>["toolbarProps"] & {
  searchPlaceholder: string;
  statusOptions?: { value: string; label: string }[];
  // El filtro sirve para estatus, tipo, etc.; cada lista nombra el suyo.
  statusLabel?: string;
};

export function ListToolbar({
  search,
  onSearch,
  status,
  onStatus,
  sortKey,
  onSortKey,
  dir,
  onToggleDir,
  sortOptions,
  searchPlaceholder,
  statusOptions,
  statusLabel = "estatus",
}: ToolbarProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
      <input
        type="search"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        style={{ ...controlStyle, flex: "1 1 200px", minWidth: 0 }}
      />
      {statusOptions && (
        <select
          value={status}
          onChange={(event) => onStatus(event.target.value)}
          aria-label={`Filtrar por ${statusLabel}`}
          style={controlStyle}
        >
          <option value="">Todos los {statusLabel === "estatus" ? "estatus" : `${statusLabel}s`}</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      <select
        value={sortKey}
        onChange={(event) => onSortKey(event.target.value)}
        aria-label="Ordenar por"
        style={controlStyle}
      >
        {sortOptions.map((option) => (
          <option key={option.key} value={option.key}>
            Ordenar: {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onToggleDir}
        aria-label={dir === "asc" ? "Orden ascendente, cambiar a descendente" : "Orden descendente, cambiar a ascendente"}
        title={dir === "asc" ? "Ascendente (menor a mayor)" : "Descendente (mayor a menor)"}
        style={{ ...controlStyle, cursor: "pointer", fontWeight: 700 }}
      >
        {dir === "asc" ? "↑" : "↓"}
      </button>
    </div>
  );
}
