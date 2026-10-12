import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from './ui';

export type StatusOption<T extends string> = {
  value: T;
  label: string;
  /** One line under the label in the menu, saying what choosing it does. */
  hint: string;
  tone: 'neutral' | 'brand' | 'success' | 'error';
};

/**
 * A status picker: the current status shows as a badge; opening it lists every status with what
 * each one means. Replaces the cramped native select, which was hard to read in a table row.
 */
export function StatusMenu<T extends string>({
  value,
  options,
  disabled = false,
  onChange,
  label,
}: {
  value: T;
  options: StatusOption<T>[];
  disabled?: boolean;
  onChange: (next: T) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 transition-colors hover:bg-ink/5 disabled:opacity-50"
      >
        <Badge tone={current.tone}>{current.label}</Badge>
        <ChevronDown size={14} className={`text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-xl"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  if (!active) onChange(option.value);
                }}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active ? 'bg-surface-alt' : 'hover:bg-ink/5'
                }`}
              >
                <span className="mt-0.5">
                  <Badge tone={option.tone}>{option.label}</Badge>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] leading-snug text-muted">{option.hint}</span>
                </span>
                {active && <Check size={15} className="mt-0.5 shrink-0 text-brand-ink" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
