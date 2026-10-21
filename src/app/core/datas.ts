// Utilitários de data. No banco as datas ficam como 'yyyy-mm-dd';
// na tela o usuário digita e lê 'dd/mm/aaaa'.

export function hojeISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDias(iso: string, dias: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + dias);
  return toISO(d);
}

export function diffDias(inicioISO: string, fimISO: string): number {
  const ms = fromISO(fimISO).getTime() - fromISO(inicioISO).getTime();
  return Math.round(ms / 86_400_000);
}

/** 'yyyy-mm-dd' -> 'dd/mm/aaaa' */
export function isoParaBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** 'dd/mm/aaaa' -> 'yyyy-mm-dd' (ou null se inválida) */
export function brParaISO(br: string): string | null {
  const m = br.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m.map(Number);
  const data = new Date(y, mo - 1, d);
  if (data.getFullYear() !== y || data.getMonth() !== mo - 1 || data.getDate() !== d) return null;
  return toISO(data);
}

/** Formata enquanto o usuário digita: 25122026 -> 25/12/2026 */
export function mascaraData(valor: string): string {
  const n = valor.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export function diaSemana(iso: string): string {
  return DIAS_SEMANA[fromISO(iso).getDay()];
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
