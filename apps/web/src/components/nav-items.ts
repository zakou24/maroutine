import { Apple, CalendarRange, Ellipsis, PencilLine, Scale, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; covers: string[] };

// `covers` : les pages rattachées à l'onglet (le calendrier et les exercices vivent sous « Plus »,
// une séance passée sous « Accueil »).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: CalendarRange, covers: ["/seances"] },
  { href: "/saisie", label: "Séance", icon: PencilLine, covers: [] },
  // « Repas » plutôt qu'« Alimentation » : cinq onglets de 75 px à 375 px de large (D24).
  { href: "/alimentation", label: "Repas", icon: Apple, covers: [] },
  // Le poids se note chaque matin : il prend la place des exercices, qu'on règle rarement (D30).
  { href: "/poids", label: "Poids", icon: Scale, covers: [] },
  {
    href: "/plus",
    label: "Plus",
    icon: Ellipsis,
    covers: ["/calendrier", "/exercices", "/objectifs", "/aliments"],
  },
];

function under(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/" ? pathname === "/" : under(pathname, item.href)) return true;
  return item.covers.some((prefix) => under(pathname, prefix));
}
