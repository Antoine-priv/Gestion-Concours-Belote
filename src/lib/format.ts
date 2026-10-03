export function dateFr(iso: string): string {
  if (!iso) return '';
  const [a, m, j] = iso.split('-');
  return `${j}/${m}/${a}`;
}

export function aujourdhui(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function nb(n: number): string {
  return n.toLocaleString('fr-FR');
}

export function rangTexte(r: number): string {
  return r === 1 ? '1er' : `${r}e`;
}

/** Champ CSV compatible Excel (séparateur « ; »). */
export function csv(lignes: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + lignes.map((l) => l.map(cell).join(';')).join('\r\n');
}
