import type { ListFilter, QueueItem } from "../types";
import QueryItem from "./QueryItem";

interface Props {
  items: QueueItem[];
  filter: ListFilter;
  onFilterChange: (f: ListFilter) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  flashId?: number | null;
}

const FILTERS: { key: ListFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "pending", label: "Pending" },
];

export default function QueryList({
  items,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
  flashId,
}: Props) {
  const maxDuration = Math.max(...items.map((i) => i.duration_ms), 1);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-white">Slow query queue</h2>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filter === f.key
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "border-gray-800 text-gray-400 hover:border-gray-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No slow queries yet. Run a demo query to capture one.
          </p>
        ) : (
          items.map((item) => (
            <QueryItem
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              maxDuration={maxDuration}
              onSelect={() => onSelect(item.id)}
              flash={flashId === item.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
