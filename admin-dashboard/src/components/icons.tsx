import {
  CakeSlice,
  Flame,
  IceCream,
  Leaf,
  Milk,
  Package,
  Shapes,
  Soup,
  Store,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Lucide icons the app's categories can reference (kept in sync with the catalog). */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Milk,
  Package,
  Flame,
  Soup,
  CakeSlice,
  IceCream,
  Leaf,
  Store,
  Shapes,
};

export function CategoryIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = CATEGORY_ICONS[name] || Shapes;
  return <Icon size={size} className={className} />;
}

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);
