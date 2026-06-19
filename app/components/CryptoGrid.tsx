import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableCryptoCard } from "~/components/SortableCryptoCard";
import { useDisplaySettings } from "~/hooks/settings-context";
import type { CryptoRate } from "~/types/crypto";

interface CryptoGridProps {
  cryptos: CryptoRate[];
  /** Called with (activeSymbol, overSymbol) when a drag completes. */
  onReorder: (activeSymbol: string, overSymbol: string) => void;
  /** Opens the detail modal for a coin. */
  onOpen?: (symbol: string) => void;
  /** Toggles a coin's watchlist membership. */
  onToggleWatch?: (symbol: string) => void;
  /** Removes a user-added (tracked) coin. Only offered for such coins. */
  onUntrack?: (symbol: string) => void;
  /** When true, drag is disabled (e.g. while filtering). */
  dragDisabled?: boolean;
}

/**
 * Responsive grid of crypto cards. dnd-kit owns drag/reorder motion (smooth
 * spring transitions); cards fade in on mount via `.animate-rise`. Pointer +
 * keyboard sensors keep reordering accessible. Dragging is disabled while
 * filtering, since a filtered subset doesn't map onto the persisted full order.
 */
export function CryptoGrid({
  cryptos,
  onReorder,
  onOpen,
  onToggleWatch,
  onUntrack,
  dragDisabled = false,
}: CryptoGridProps) {
  const { layout, density, watchlist } = useDisplaySettings();
  const watchSet = new Set(watchlist);
  const gridCols =
    layout === "list"
      ? "grid-cols-1"
      : density === "compact"
        ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

  const grid = (
    <ul className={`grid list-none gap-4 p-0 ${gridCols}`}>
      {cryptos.map((crypto, i) => (
        <li
          key={crypto.symbol}
          className="animate-rise"
          style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
        >
          <SortableCryptoCard
            crypto={crypto}
            rank={i + 1}
            onOpen={onOpen}
            watched={watchSet.has(crypto.symbol)}
            onToggleWatch={onToggleWatch}
            onUntrack={onUntrack}
          />
        </li>
      ))}
    </ul>
  );

  if (dragDisabled) return grid;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={cryptos.map((c) => c.symbol)}
        strategy={rectSortingStrategy}
      >
        {grid}
      </SortableContext>
    </DndContext>
  );
}
