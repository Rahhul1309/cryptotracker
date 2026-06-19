import {
  useSortable,
  defaultAnimateLayoutChanges,
  type AnimateLayoutChanges,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CryptoCard } from "~/components/CryptoCard";
import type { CryptoRate } from "~/types/crypto";

/**
 * Adapts a CryptoCard into a dnd-kit sortable item. The card's identity is its
 * symbol. Drag listeners attach only to the handle button (passed down as
 * `dragHandleProps`) so text inside the card stays selectable.
 *
 * Smoothness: we let dnd-kit own ALL drag/reorder motion via its built-in
 * transform + transition (and force layout animation on even when items mount,
 * so neighbours glide as one is dropped). Motion's `layout` is intentionally
 * NOT used on draggable items — two systems transforming the same node fought
 * each other and caused the jank. `CSS.Transform.toString` + dnd-kit's spring
 * transition gives the buttery reorder.
 */
const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export function SortableCryptoCard({
  crypto,
  rank,
  onOpen,
  watched,
  onToggleWatch,
  onUntrack,
}: {
  crypto: CryptoRate;
  rank: number;
  onOpen?: (symbol: string) => void;
  watched?: boolean;
  onToggleWatch?: (symbol: string) => void;
  onUntrack?: (symbol: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: crypto.symbol, animateLayoutChanges });

  return (
    <CryptoCard
      ref={setNodeRef}
      crypto={crypto}
      rank={rank}
      isDragging={isDragging}
      onOpen={onOpen}
      watched={watched}
      onToggleWatch={onToggleWatch}
      onUntrack={onUntrack}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
        zIndex: isDragging ? 50 : undefined,
        // Lift the dragged card cleanly without a competing layout animation.
        opacity: isDragging ? 0.85 : undefined,
      }}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}
