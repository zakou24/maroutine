import { CalendarRange, Dumbbell, Ellipsis, PencilLine, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; covers: string[] };

// `covers` : les pages rattachées à l'onglet (le calendrier vit sous « Plus », une séance passée sous « Semaine »).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Semaine", icon: CalendarRange, covers: ["/seances"] },
  { href: "/saisie", label: "Séance", icon: PencilLine, covers: [] },
  { href: "/exercices", label: "Exercices", icon: Dumbbell, covers: [] },
  { href: "/plus", label: "Plus", icon: Ellipsis, covers: ["/calendrier"] },
];

function under(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/" ? pathname === "/" : under(pathname, item.href)) return true;
  return item.covers.some((prefix) => under(pathname, prefix));
}
