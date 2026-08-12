import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import StopCard from './StopCard';

/**
 * Drag-reorder wrapper around StopCard. Keeps StopCard itself dnd-agnostic —
 * this component owns the dnd-kit hook and hands the grip-handle listeners
 * down as a prop.
 */
const SortableStopCard = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StopCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
};

export default SortableStopCard;
