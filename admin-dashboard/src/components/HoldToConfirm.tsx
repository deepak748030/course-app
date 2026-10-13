import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Press and hold to confirm a destructive action. A red fill sweeps across the button while it is held;
 * releasing early cancels, holding to the end fires `onConfirm`. Keyboard works too: hold Space or Enter.
 * Adapted from the MIT-licensed "Hold to Delete" component on opensourceui.in, restyled to the admin's tokens.
 */
export function HoldToConfirm({
  label,
  holdMs = 1000,
  onConfirm,
  disabled = false,
}: {
  label: string;
  holdMs?: number;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const start = () => {
    if (disabled || timer.current !== null) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      confirmRef.current();
    }, holdMs);
  };

  const cancel = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setHolding(false);
  };

  // The fill is the same label drawn in white, revealed by a clip that grows while held and shrinks on release.
  const reveal = holding ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)';

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(event) => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault();
          start();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') cancel();
      }}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={label}
      className="relative inline-flex h-10 min-w-[9.5rem] touch-none select-none items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-lg border border-error bg-surface px-4 text-sm font-semibold text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:pointer-events-none disabled:opacity-45"
    >
      <Trash2 size={16} aria-hidden />
      {label}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 bg-error text-white"
        style={{
          clipPath: reveal,
          transition: holding ? `clip-path ${holdMs}ms linear` : 'clip-path 200ms ease-out',
        }}
      >
        <Trash2 size={16} />
        {label}
      </span>
    </button>
  );
}
