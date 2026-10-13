/**
 * Small UI kit for the admin dashboard — flat white surfaces, hairline borders and the
 * green accent, mirroring the mobile app's design rules (no shadows, 8px rhythm).
 */
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, Info, Loader2, Search, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { HoldToConfirm } from './HoldToConfirm';
import type { LucideIcon } from 'lucide-react';

// ---------- formatting helpers -------------------------------------------------------
export const formatInr = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ---------- Button --------------------------------------------------------------------
type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'dark';

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading,
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: LucideIcon;
  loading?: boolean;
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors select-none disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink';
  // Small buttons keep a 40px touch target on phones and tighten up from md (32px) on desktop.
  const sizes = { sm: 'h-10 px-3 text-[13px] md:h-8', md: 'h-10 px-4 text-sm' };
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand text-on-brand hover:bg-brand-pressed',
    dark: 'bg-ink text-white hover:bg-ink/85',
    outline: 'border border-line bg-surface text-ink hover:bg-surface-alt',
    ghost: 'text-muted hover:bg-ink/5 hover:text-ink',
    danger: 'bg-error text-white hover:bg-error/90',
  };
  return (
    <button type="button" className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : Icon ? <Icon size={size === 'sm' ? 14 : 16} /> : null}
      {children}
    </button>
  );
}

// ---------- Card ------------------------------------------------------------------------
export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------- Badge --------------------------------------------------------------------------
export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'brand' | 'success' | 'error' | 'info' | 'outline';
  children: React.ReactNode;
}) {
  const tones = {
    neutral: 'bg-ink/6 text-muted',
    brand: 'bg-brand-soft text-brand-ink',
    success: 'bg-success-soft text-success',
    error: 'bg-error-soft text-error',
    info: 'bg-info-soft text-info',
    outline: 'border border-line text-muted',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

// ---------- form fields ----------------------------------------------------------------------
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-subtle">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-error">{error}</span>}
    </label>
  );
}

const inputClass =
  'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />;
}

/** Password field with a show/hide eye. The eye is a real 36px target and says whether the password is visible. */
export function PasswordInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${inputClass} pr-11 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-1/2 flex h-8 w-9 -translate-y-1/2 items-center justify-center rounded-md text-subtle transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

/** Input with a fixed prefix inside the field, e.g. the ₹ sign on money fields. */
export function PrefixInput({ prefix, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { prefix: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-subtle">{prefix}</span>
      <input {...props} className={`${inputClass} pl-8 ${className}`} />
    </div>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} h-auto min-h-20 py-2.5 ${props.className || ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} appearance-none pr-8 ${props.className || ''}`} />;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pl-9`}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40 ${
        checked ? 'bg-brand' : 'bg-ink/15'
      }`}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
        }`}
        style={{ height: 18, width: 18 }}
      />
    </button>
  );
}

// ---------- Modal / Drawer -------------------------------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className={`relative w-full ${width} max-h-[88vh] overflow-auto rounded-xl border border-line bg-surface`}>
        <div className="sticky top-0 flex items-center justify-between border-b border-line-soft bg-surface px-5 py-4">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line-soft px-6 py-4">
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line-soft px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Confirm dialog -------------------------------------------------------------------
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  holdToConfirm = true,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  /** Destructive confirms are press-and-hold so a stray tap cannot delete. Pass false for harmless confirms. */
  holdToConfirm?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width="max-w-md">
      <p className="text-sm leading-relaxed text-muted">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {holdToConfirm ? (
          <HoldToConfirm label={`Hold to ${confirmLabel.toLowerCase()}`} onConfirm={onConfirm} />
        ) : (
          <Button variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ---------- Stars -------------------------------------------------------------------------------
export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#2F6B47' : '#DCE7DF'}>
          <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2z" />
        </svg>
      ))}
    </span>
  );
}

// ---------- Table primitives ---------------------------------------------------------------------
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`whitespace-nowrap border-b border-line px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-subtle ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`border-b border-line-soft px-4 py-3 align-middle ${className}`}>{children}</td>;
}

// ---------- Pagination ------------------------------------------------------------------------------
/**
 * Client-side paging for a list that is already loaded. Returns the current page's rows.
 * `resetKey` (e.g. the search + filter values) jumps back to page 1 whenever it changes.
 */
export function usePagination<T>(items: T[] | null, pageSize = 10, resetKey = '') {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [resetKey]);
  const list = items ?? [];
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const current = Math.min(page, pageCount);
  return {
    page: current,
    setPage,
    pageCount,
    pageSize,
    total: list.length,
    rows: list.slice((current - 1) * pageSize, current * pageSize),
  };
}

export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const navButton =
    'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line-soft px-4 py-3 text-[13px] text-muted sm:flex-row">
      <p>
        Showing <span className="font-semibold text-ink">{start}–{end}</span> of{' '}
        <span className="font-semibold text-ink">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button aria-label="Previous page" className={navButton} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-16 px-2 text-center font-semibold tabular-nums text-ink">
          {page} / {pageCount}
        </span>
        <button aria-label="Next page" className={navButton} disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ---------- Empty & loading states ----------------------------------------------------------------
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt">
        <Icon size={22} className="text-brand-ink" />
      </div>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-16 text-muted">
      <Loader2 size={17} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <Loader2 size={26} className="animate-spin text-brand-ink" />
    </div>
  );
}

// ---------- Toasts -----------------------------------------------------------------------------------
type Toast = { id: number; kind: 'success' | 'error' | 'info'; message: string };
const ToastContext = createContext<{ push: (kind: Toast['kind'], message: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: Toast['kind'], message: string) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-surface px-4 py-3"
          >
            {toast.kind === 'success' && <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-success" />}
            {toast.kind === 'error' && <AlertTriangle size={17} className="mt-0.5 shrink-0 text-error" />}
            {toast.kind === 'info' && <Info size={17} className="mt-0.5 shrink-0 text-info" />}
            <p className="text-[13px] font-medium leading-snug">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx.push;
}

// ---------- course cover placeholder --------------------------------------------------------------
export function CourseCover({
  title,
  coverUrl,
  className = 'h-10 w-14',
}: {
  title: string;
  coverUrl?: string;
  className?: string;
}) {
  if (coverUrl) {
    return <img src={coverUrl} alt="" className={`${className} shrink-0 rounded-md border border-line-soft object-cover`} />;
  }
  // Same brand-mark.png the learner app shows when a course has no image.
  return (
    <img
      src="/brand-mark.png"
      alt={title}
      className={`${className} shrink-0 rounded-md border border-line-soft object-contain`}
      style={{ background: '#FBF6E3' }}
    />
  );
}
