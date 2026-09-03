import type { DoseLog, DosePhase, Treatment, WeightEntry } from './types';

const DAY_MS = 86_400_000;

export function intervalDays(t: Treatment): number {
  return t.frequency === 'semanal' ? 7 : 1;
}

export function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((dateOnly(b).getTime() - dateOnly(a).getTime()) / DAY_MS);
}

export function lastAppliedDate(t: Treatment, logs: DoseLog[]): Date | null {
  const relevant = logs.filter((l) => l.medId === t.medId && new Date(l.date) <= new Date());
  if (relevant.length === 0) return null;
  return new Date(relevant.sort((a, b) => b.date.localeCompare(a.date))[0].date);
}

const DAY_NAMES = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const WEEKDAY_NAMES = DAY_NAMES;

export function weekdayLabel(w: number): string {
  return DAY_NAMES[w] ?? '';
}

/** Próxima dose programada (conta dose de hoje se ainda não aplicada). */
export function nextDoseDate(t: Treatment, logs: DoseLog[], now: Date = new Date()): Date {
  const interval = intervalDays(t);
  const last = lastAppliedDate(t, logs);
  let next: Date;
  if (last) {
    next = addDays(last, interval);
  } else {
    const start = parseLocalDate(t.startDate);
    next = addDays(start, interval);
  }
  // se já passou, rola para frente mantendo o dia da semana
  const today = dateOnly(now);
  while (dateOnly(next) < today) {
    next = addDays(next, interval);
  }
  return next;
}

/** Próximas N datas de dose a partir de hoje. */
export function upcomingDates(t: Treatment, logs: DoseLog[], n: number, now: Date = new Date()): Date[] {
  const interval = intervalDays(t);
  const first = nextDoseDate(t, logs, now);
  const out: Date[] = [];
  for (let i = 0; i < n; i++) out.push(addDays(first, interval * i));
  return out;
}

export interface DoseStatusInfo {
  status: 'hoje' | 'futuro' | 'atrasada';
  daysLeft: number; // negativo se atrasada / 0 hoje
}

export function doseStatus(t: Treatment, logs: DoseLog[], now: Date = new Date()): DoseStatusInfo {
  const next = nextDoseDate(t, logs, now);
  const diff = daysBetween(dateOnly(now), next);
  if (diff === 0) return { status: 'hoje', daysLeft: 0 };
  if (diff < 0) return { status: 'atrasada', daysLeft: diff };
  return { status: 'futuro', daysLeft: diff };
}

/** Progresso 0..1 do ciclo atual (0 = dose aplicada, 1 = próxima dose). */
export function cycleProgress(t: Treatment, logs: DoseLog[], now: Date = new Date()): number {
  const interval = intervalDays(t);
  const last = lastAppliedDate(t, logs);
  const start = last ?? parseLocalDate(t.startDate);
  const elapsed = Math.min(interval, Math.max(0, daysBetween(start, now)));
  return elapsed / interval;
}

/** Taxa de adesão: doses aplicadas / doses programadas desde o início. */
export function adherenceRate(t: Treatment, logs: DoseLog[], now: Date = new Date()): number {
  const interval = intervalDays(t);
  const start = parseLocalDate(t.startDate);
  const applied = logs.filter((l) => l.medId === t.medId && new Date(l.date) >= start).length;
  const elapsed = Math.max(0, daysBetween(start, now));
  const scheduled = Math.floor(elapsed / interval) + 1;
  if (scheduled === 0) return 100;
  return Math.min(100, Math.round((applied / scheduled) * 100));
}

/* ---------------- formatação ---------------- */

export function fmtMg(n: number): string {
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} mg`;
}

export function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateLong(d: Date): string {
  const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtDateMedium(d: Date): string {
  const s = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  return s.replace('.', '');
}

export function relativeDays(next: Date, now: Date = new Date()): string {
  const diff = daysBetween(dateOnly(now), next);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  if (diff < 0) return `Atrasada há ${Math.abs(diff)} dias`;
  return `Faltam ${diff} dias`;
}

export function imcInfo(weightKg: number | null, heightCm: number | null): { imc: number; label: string; color: string } | null {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  const imc = weightKg / (h * h);
  const r = Math.round(imc * 10) / 10;
  if (r < 18.5) return { imc: r, label: 'Abaixo do peso', color: 'text-sky-600' };
  if (r < 25) return { imc: r, label: 'Peso adequado', color: 'text-emerald-600' };
  if (r < 30) return { imc: r, label: 'Sobrepeso', color: 'text-amber-600' };
  if (r < 35) return { imc: r, label: 'Obesidade grau I', color: 'text-orange-600' };
  if (r < 40) return { imc: r, label: 'Obesidade grau II', color: 'text-rose-600' };
  return { imc: r, label: 'Obesidade grau III', color: 'text-rose-700' };
}

export function ageFromBirth(birthDate: string): number | null {
  if (!birthDate) return null;
  const b = parseLocalDate(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

/** Variação média semanal entre os dois últimos registros de peso. */
export function weeklyWeightTrend(entries: WeightEntry[]): { kgPerWeek: number; percentPerWeek: number } | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const previous = sorted[sorted.length - 2];
  const current = sorted[sorted.length - 1];
  const elapsedDays = Math.max(1, (new Date(current.date).getTime() - new Date(previous.date).getTime()) / DAY_MS);
  const kgPerWeek = ((current.kg - previous.kg) / elapsedDays) * 7;
  const percentPerWeek = previous.kg > 0 ? (kgPerWeek / previous.kg) * 100 : 0;
  return {
    kgPerWeek: Math.round(kgPerWeek * 100) / 100,
    percentPerWeek: Math.round(percentPerWeek * 100) / 100,
  };
}

/* ================= Esquema progressivo de doses (titulação) ================= */

/** Semana corrente do tratamento (1 = semana da primeira aplicação). */
export function treatmentWeek(t: Treatment, date: Date = new Date()): number {
  const start = parseLocalDate(t.startDate);
  return Math.max(1, Math.floor(daysBetween(start, date) / 7) + 1);
}

/** Dose vigente em uma determinada semana de tratamento. */
export function doseAtWeek(t: Treatment, week: number): number {
  const phases = t.phases ?? [];
  if (phases.length === 0) return t.doseMg;
  let dose = t.doseMg;
  for (const p of phases) {
    if (week >= p.startWeek && (p.endWeek == null || week <= p.endWeek)) dose = p.doseMg;
  }
  return dose;
}

/** Dose vigente em uma determinada data. */
export function doseAtDate(t: Treatment, date: Date = new Date()): number {
  return doseAtWeek(t, treatmentWeek(t, date));
}

export interface ActivePhaseInfo {
  index: number;
  startWeek: number;
  endWeek: number | null;
  doseMg: number;
  week: number;
}

export function activePhase(t: Treatment, now: Date = new Date()): ActivePhaseInfo | null {
  const phases = sortedPhases(t);
  if (phases.length === 0) return null;
  const week = treatmentWeek(t, now);
  const idx = phases.findIndex((p) => week >= p.startWeek && (p.endWeek == null || week <= p.endWeek));
  if (idx === -1) return null;
  const p = phases[idx];
  return { index: idx, startWeek: p.startWeek, endWeek: p.endWeek, doseMg: p.doseMg, week };
}

export interface NextPhaseInfo {
  startWeek: number;
  doseMg: number;
  weeksUntil: number;
}

/** Próxima fase do esquema que ainda não começou. */
export function nextPhase(t: Treatment, now: Date = new Date()): NextPhaseInfo | null {
  const phases = sortedPhases(t);
  if (phases.length === 0) return null;
  const week = treatmentWeek(t, now);
  const upcoming = phases.find((p) => p.startWeek > week);
  if (!upcoming) return null;
  return { startWeek: upcoming.startWeek, doseMg: upcoming.doseMg, weeksUntil: upcoming.startWeek - week };
}

export function sortedPhases(t: Treatment): DosePhase[] {
  return [...(t.phases ?? [])].sort((a, b) => a.startWeek - b.startWeek);
}

export function hasSchedule(t: Treatment): boolean {
  return (t.phases ?? []).length > 0;
}
