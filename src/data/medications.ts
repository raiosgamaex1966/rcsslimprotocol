export type ActiveIngredient = 'Semaglutida' | 'Liraglutida' | 'Tirzepatida';
export type MedCategory = 'Referência' | 'Similar' | 'Genérico';
export type Presentation = 'Caneta injetora' | 'Comprimido oral';
export type Indication = 'Diabetes tipo 2' | 'Obesidade / sobrepeso' | 'Diabetes tipo 2 + obesidade';

export interface Medication {
  id: string;
  brand: string;
  activeIngredient: ActiveIngredient;
  category: MedCategory;
  manufacturer: string;
  presentation: Presentation;
  indication: Indication;
  frequency: 'semanal' | 'diaria';
  doses: number[]; // mg disponíveis
  defaultDose: number;
  priceRange: string;
  description: string;
  color: string; // tailwind classes p/ gradiente do card
  badge: string;
}

export const MEDICATIONS: Medication[] = [
  /* ---------------- SEMAGLUTIDA ---------------- */
  {
    id: 'ozempic',
    brand: 'Ozempic',
    activeIngredient: 'Semaglutida',
    category: 'Referência',
    manufacturer: 'Novo Nordisk',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1, 2],
    defaultDose: 0.5,
    priceRange: 'R$ 850 – 1.400 (estimativa)',
    description: 'Referência para diabetes tipo 2; amplamente usado off-label para perda de peso. Aplicação subcutânea 1x por semana, no mesmo dia.',
    color: 'from-teal-500 to-emerald-600',
    badge: 'bg-teal-100 text-teal-700',
  },
  {
    id: 'wegovy',
    brand: 'Wegovy',
    activeIngredient: 'Semaglutida',
    category: 'Referência',
    manufacturer: 'Novo Nordisk',
    presentation: 'Caneta injetora',
    indication: 'Obesidade / sobrepeso',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1, 1.7, 2.4],
    defaultDose: 0.5,
    priceRange: 'R$ 1.100 – 2.000 (estimativa)',
    description: 'Concentração mais alta de semaglutida, com indicação em bula específica para obesidade. Titulação gradual até 2,4 mg semanais.',
    color: 'from-emerald-500 to-teal-700',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'rybelsus',
    brand: 'Rybelsus',
    activeIngredient: 'Semaglutida',
    category: 'Referência',
    manufacturer: 'Novo Nordisk',
    presentation: 'Comprimido oral',
    indication: 'Diabetes tipo 2',
    frequency: 'diaria',
    doses: [3, 7, 14],
    defaultDose: 7,
    priceRange: 'R$ 300 – 700 (estimativa)',
    description: 'Versão em comprimidos da semaglutida, tomada em jejum. Não é caneta, mas faz parte da mesma classe terapêutica.',
    color: 'from-cyan-500 to-sky-600',
    badge: 'bg-cyan-100 text-cyan-700',
  },
  {
    id: 'poviztra',
    brand: 'Poviztra',
    activeIngredient: 'Semaglutida',
    category: 'Similar',
    manufacturer: 'Parceria com a fabricante original',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'Consulte a farmácia',
    description: 'Similar de semaglutida comercializado em parceria com a fabricante original.',
    color: 'from-teal-500 to-cyan-600',
    badge: 'bg-teal-100 text-teal-700',
  },
  {
    id: 'extensior',
    brand: 'Extensior',
    activeIngredient: 'Semaglutida',
    category: 'Similar',
    manufacturer: 'Parceria com a fabricante original',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'Consulte a farmácia',
    description: 'Similar de semaglutida em parceria com a fabricante original.',
    color: 'from-teal-500 to-emerald-500',
    badge: 'bg-teal-100 text-teal-700',
  },
  {
    id: 'semaglutida-ems',
    brand: 'Semaglutida EMS',
    activeIngredient: 'Semaglutida',
    category: 'Genérico',
    manufacturer: 'EMS (genérico)',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'R$ 500 – 900 (estimativa)',
    description: 'Primeiro genérico de semaglutida sintética aprovado pela Anvisa no Brasil.',
    color: 'from-slate-500 to-slate-700',
    badge: 'bg-slate-200 text-slate-700',
  },
  {
    id: 'semaclique',
    brand: 'Semaclique',
    activeIngredient: 'Semaglutida',
    category: 'Similar',
    manufacturer: 'Germed',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'R$ 550 – 1.000 (estimativa)',
    description: 'Versão similar registrada pelo laboratório Germed.',
    color: 'from-indigo-500 to-violet-600',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'owozy',
    brand: 'Owozy',
    activeIngredient: 'Semaglutida',
    category: 'Similar',
    manufacturer: 'Registro recente Anvisa',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'Consulte a farmácia',
    description: 'Registro recente aprovado pela Anvisa (similar).',
    color: 'from-rose-500 to-pink-600',
    badge: 'bg-rose-100 text-rose-700',
  },
  {
    id: 'seemasun',
    brand: 'Seemasun',
    activeIngredient: 'Semaglutida',
    category: 'Similar',
    manufacturer: 'Registro recente Anvisa',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'Consulte a farmácia',
    description: 'Registro recente aprovado pela Anvisa (similar).',
    color: 'from-sky-500 to-blue-600',
    badge: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'zempneo',
    brand: 'Zempneo',
    activeIngredient: 'Semaglutida',
    category: 'Similar',
    manufacturer: 'Registro recente Anvisa',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'Consulte a farmácia',
    description: 'Registro recente aprovado pela Anvisa (similar).',
    color: 'from-fuchsia-500 to-purple-600',
    badge: 'bg-fuchsia-100 text-fuchsia-700',
  },
  {
    id: 'semavy',
    brand: 'Semavy',
    activeIngredient: 'Semaglutida',
    category: 'Similar',
    manufacturer: 'Registro recente Anvisa',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'Consulte a farmácia',
    description: 'Registro recente aprovado pela Anvisa (similar).',
    color: 'from-lime-500 to-green-600',
    badge: 'bg-lime-100 text-lime-700',
  },
  {
    id: 'orsema',
    brand: 'Orsema',
    activeIngredient: 'Semaglutida',
    category: 'Similar',
    manufacturer: 'Registro recente Anvisa',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'Consulte a farmácia',
    description: 'Registro recente aprovado pela Anvisa (similar).',
    color: 'from-amber-500 to-orange-600',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'wi',
    brand: 'Wi',
    activeIngredient: 'Semaglutida',
    category: 'Similar',
    manufacturer: 'Registro recente Anvisa',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'Consulte a farmácia',
    description: 'Registro recente aprovado pela Anvisa (similar).',
    color: 'from-cyan-600 to-teal-500',
    badge: 'bg-cyan-100 text-cyan-700',
  },
  {
    id: 'ozivy',
    brand: 'Ozivy',
    activeIngredient: 'Semaglutida',
    category: 'Similar',
    manufacturer: 'Registro recente Anvisa',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'Consulte a farmácia',
    description: 'Similar de semaglutida com registro recente aprovado pela Anvisa.',
    color: 'from-green-500 to-emerald-700',
    badge: 'bg-green-100 text-green-700',
  },
  {
    id: 'semaan',
    brand: 'Semaan',
    activeIngredient: 'Semaglutida',
    category: 'Similar',
    manufacturer: 'Registro recente Anvisa',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [0.25, 0.5, 1],
    defaultDose: 0.5,
    priceRange: 'Consulte a farmácia',
    description: 'Registro recente aprovado pela Anvisa (similar).',
    color: 'from-teal-600 to-cyan-700',
    badge: 'bg-teal-100 text-teal-700',
  },

  /* ---------------- LIRAGLUTIDA ---------------- */
  {
    id: 'saxenda',
    brand: 'Saxenda',
    activeIngredient: 'Liraglutida',
    category: 'Referência',
    manufacturer: 'Novo Nordisk',
    presentation: 'Caneta injetora',
    indication: 'Obesidade / sobrepeso',
    frequency: 'diaria',
    doses: [0.6, 1.2, 1.8, 2.4, 3.0],
    defaultDose: 1.2,
    priceRange: 'R$ 700 – 1.300 (estimativa)',
    description: 'Aprovada especificamente para o tratamento da obesidade. Aplicação diária, com titulação gradual até 3 mg.',
    color: 'from-pink-500 to-rose-600',
    badge: 'bg-pink-100 text-pink-700',
  },
  {
    id: 'victoza',
    brand: 'Victoza',
    activeIngredient: 'Liraglutida',
    category: 'Referência',
    manufacturer: 'Novo Nordisk',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2',
    frequency: 'diaria',
    doses: [0.6, 1.2, 1.8],
    defaultDose: 1.2,
    priceRange: 'R$ 450 – 900 (estimativa)',
    description: 'Focada no tratamento do diabetes tipo 2, aplicação diária.',
    color: 'from-violet-500 to-purple-600',
    badge: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'lirux',
    brand: 'Lirux',
    activeIngredient: 'Liraglutida',
    category: 'Similar',
    manufacturer: 'EMS',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'diaria',
    doses: [0.6, 1.2, 1.8],
    defaultDose: 1.2,
    priceRange: 'R$ 400 – 800 (estimativa)',
    description: 'Opção similar de liraglutida fabricada pela EMS.',
    color: 'from-purple-500 to-indigo-600',
    badge: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'olire',
    brand: 'Olire',
    activeIngredient: 'Liraglutida',
    category: 'Similar',
    manufacturer: 'EMS',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'diaria',
    doses: [0.6, 1.2, 1.8],
    defaultDose: 1.2,
    priceRange: 'R$ 400 – 800 (estimativa)',
    description: 'Opção similar de liraglutida fabricada pela EMS.',
    color: 'from-indigo-500 to-blue-600',
    badge: 'bg-indigo-100 text-indigo-700',
  },

  /* ---------------- TIRZEPATIDA ---------------- */
  {
    id: 'mounjaro',
    brand: 'Mounjaro',
    activeIngredient: 'Tirzepatida',
    category: 'Referência',
    manufacturer: 'Eli Lilly',
    presentation: 'Caneta injetora',
    indication: 'Diabetes tipo 2 + obesidade',
    frequency: 'semanal',
    doses: [2.5, 5, 7.5, 10, 12.5, 15],
    defaultDose: 2.5,
    priceRange: 'R$ 1.300 – 2.500 (estimativa)',
    description: 'Dupla ação nos receptores GLP-1 e GIP, promovendo alta eficácia na perda de peso e no controle glicêmico. Aplicação semanal.',
    color: 'from-blue-500 to-indigo-700',
    badge: 'bg-blue-100 text-blue-700',
  },
];

export const ACTIVE_INGREDIENT_LABEL: Record<ActiveIngredient, string> = {
  Semaglutida: 'Semaglutida (GLP-1)',
  Liraglutida: 'Liraglutida (GLP-1)',
  Tirzepatida: 'Tirzepatida (GLP-1 + GIP)',
};

export function findMedication(id: string): Medication | undefined {
  return MEDICATIONS.find((m) => m.id === id);
}

/* ================= Esquemas de titulação de bula =================
 * Fases em semanas de tratamento (semana 1 = primeira aplicação).
 * endWeek = null significa "em diante".
 */

import type { DosePhase } from '../lib/types';

const TITRATION_BY_ID: Record<string, DosePhase[]> = {
  // Semaglutida (Novo Nordisk)
  ozempic: [
    { startWeek: 1, endWeek: 4, doseMg: 0.25 },
    { startWeek: 5, endWeek: 8, doseMg: 0.5 },
    { startWeek: 9, endWeek: null, doseMg: 1 },
  ],
  wegovy: [
    { startWeek: 1, endWeek: 4, doseMg: 0.25 },
    { startWeek: 5, endWeek: 8, doseMg: 0.5 },
    { startWeek: 9, endWeek: 12, doseMg: 1 },
    { startWeek: 13, endWeek: 16, doseMg: 1.7 },
    { startWeek: 17, endWeek: null, doseMg: 2.4 },
  ],
  rybelsus: [
    { startWeek: 1, endWeek: 4, doseMg: 3 },
    { startWeek: 5, endWeek: 8, doseMg: 7 },
    { startWeek: 9, endWeek: null, doseMg: 14 },
  ],
  // Liraglutida (diária)
  saxenda: [
    { startWeek: 1, endWeek: 1, doseMg: 0.6 },
    { startWeek: 2, endWeek: 2, doseMg: 1.2 },
    { startWeek: 3, endWeek: 3, doseMg: 1.8 },
    { startWeek: 4, endWeek: 4, doseMg: 2.4 },
    { startWeek: 5, endWeek: null, doseMg: 3 },
  ],
  victoza: [
    { startWeek: 1, endWeek: 1, doseMg: 0.6 },
    { startWeek: 2, endWeek: null, doseMg: 1.2 },
  ],
  lirux: [
    { startWeek: 1, endWeek: 1, doseMg: 0.6 },
    { startWeek: 2, endWeek: null, doseMg: 1.2 },
  ],
  olire: [
    { startWeek: 1, endWeek: 1, doseMg: 0.6 },
    { startWeek: 2, endWeek: null, doseMg: 1.2 },
  ],
  // Tirzepatida
  mounjaro: [
    { startWeek: 1, endWeek: 4, doseMg: 2.5 },
    { startWeek: 5, endWeek: 8, doseMg: 5 },
    { startWeek: 9, endWeek: 12, doseMg: 7.5 },
    { startWeek: 13, endWeek: 16, doseMg: 10 },
    { startWeek: 17, endWeek: 20, doseMg: 12.5 },
    { startWeek: 21, endWeek: null, doseMg: 15 },
  ],
};

/** Titulação padrão por princípio ativo (para similares/genericos sem protocolo próprio). */
const DEFAULT_TITRATION: Record<ActiveIngredient, DosePhase[]> = {
  Semaglutida: [
    { startWeek: 1, endWeek: 4, doseMg: 0.25 },
    { startWeek: 5, endWeek: 8, doseMg: 0.5 },
    { startWeek: 9, endWeek: null, doseMg: 1 },
  ],
  Liraglutida: [
    { startWeek: 1, endWeek: 1, doseMg: 0.6 },
    { startWeek: 2, endWeek: null, doseMg: 1.2 },
  ],
  Tirzepatida: [
    { startWeek: 1, endWeek: 4, doseMg: 2.5 },
    { startWeek: 5, endWeek: 8, doseMg: 5 },
    { startWeek: 9, endWeek: null, doseMg: 7.5 },
  ],
};

/** Esquema de titulação sugerido para o medicamento (referência de bula). */
export function getTitration(med: Medication): DosePhase[] {
  return TITRATION_BY_ID[med.id] ?? DEFAULT_TITRATION[med.activeIngredient];
}

/* ---------------- Efeitos colaterais (informativos) ---------------- */

export const COMMON_SIDE_EFFECTS = [
  { label: 'Náusea', note: 'mais comum no início da titulação' },
  { label: 'Vômito', note: 'geralmente transitório' },
  { label: 'Diarreia', note: 'pode alternar com constipação' },
  { label: 'Constipação', note: 'aumente a ingestão de água' },
  { label: 'Dor abdominal', note: 'avise seu médico se persistir' },
  { label: 'Redução do apetite', note: 'efeito esperado da classe' },
  { label: 'Cefaleia', note: 'pode ocorrer nas primeiras semanas' },
  { label: 'Fadiga', note: 'tende a melhorar com o tempo' },
  { label: 'Reação no local da injeção', note: 'vermelhidão, coceira ou inchaço' },
];

export const RED_FLAGS = [
  'Dor abdominal intensa que irradia para as costas (possível pancreatite)',
  'Vômitos persistentes com incapacidade de se hidratar',
  'Icterícia (pele ou olhos amarelados) ou urina escura',
  'Reação alérgica: inchaço no rosto, falta de ar, urticária',
  'Hipoglicemia (tremores, suor frio, confusão) — principalmente com insulina ou sulfonilureias',
  'Batimentos cardíacos acelerados ou palpitações frequentes',
];

export const DISCLAIMER =
  'Este aplicativo é apenas informativo e NÃO substitui consulta, diagnóstico ou orientação médica. Não inicie, altere ou interrompa qualquer tratamento sem falar com seu médico. Preços informados são estimativas médias de mercado e variam por região, farmácia e época. Respostas de IA podem conter erros.';
