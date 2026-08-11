import { segButton, segGroup } from '../lib/ui';

export interface SegmentedItem<T extends string> {
  id: T;
  label: string;
}

/** Grupul de comutare cu două-trei opțiuni folosit în antetul cardurilor. */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div style={segGroup} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          style={segButton(value === item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
