/* ============================================================
 * Banco de alimentos (valores aproximados por porção habitual)
 * Usado pelo gerador de cardápios (fallback) e pela LLM como
 * referência de alimentos brasileiros ricos em proteína.
 * ============================================================ */

export interface FoodItem {
  id: string;
  name: string;
  portion: string; // porção base
  portionBaseG: number; // gramas da porção base (para escalar)
  proteinG: number; // proteína na porção base
  kcal: number;
  group: 'proteina' | 'carboidrato' | 'legume' | 'fruta' | 'gordura';
}

export const FOODS: FoodItem[] = [
  // ---------------- Proteínas ----------------
  { id: 'ovo', name: 'Ovo cozido', portion: '2 unidades (100 g)', portionBaseG: 100, proteinG: 12, kcal: 140, group: 'proteina' },
  { id: 'frango', name: 'Peito de frango grelhado', portion: '100 g', portionBaseG: 100, proteinG: 31, kcal: 165, group: 'proteina' },
  { id: 'carne', name: 'Carne magra grelhada', portion: '100 g', portionBaseG: 100, proteinG: 32, kcal: 219, group: 'proteina' },
  { id: 'tilapia', name: 'Filé de tilápia assado', portion: '120 g', portionBaseG: 120, proteinG: 26, kcal: 150, group: 'proteina' },
  { id: 'salmao', name: 'Salmão grelhado', portion: '100 g', portionBaseG: 100, proteinG: 26, kcal: 208, group: 'proteina' },
  { id: 'iogurte_grego', name: 'Iogurte grego natural', portion: '170 g', portionBaseG: 170, proteinG: 15, kcal: 145, group: 'proteina' },
  { id: 'cottage', name: 'Queijo cottage', portion: '100 g', portionBaseG: 100, proteinG: 11, kcal: 98, group: 'proteina' },
  { id: 'whey', name: 'Whey protein (scoop)', portion: '30 g', portionBaseG: 30, proteinG: 24, kcal: 120, group: 'proteina' },
  { id: 'tofu', name: 'Tofu firme grelhado', portion: '150 g', portionBaseG: 150, proteinG: 18, kcal: 180, group: 'proteina' },
  { id: 'peru', name: 'Peito de peru light', portion: '80 g (4 fatias)', portionBaseG: 80, proteinG: 15, kcal: 80, group: 'proteina' },
  { id: 'minas', name: 'Queijo minas frescal', portion: '40 g', portionBaseG: 40, proteinG: 9, kcal: 110, group: 'proteina' },
  { id: 'feijao', name: 'Feijão carioca cozido', portion: '1 concha (130 g)', portionBaseG: 130, proteinG: 7, kcal: 90, group: 'proteina' },
  { id: 'lentilha', name: 'Lentilha cozida', portion: '130 g', portionBaseG: 130, proteinG: 9, kcal: 116, group: 'proteina' },
  { id: 'castanhas', name: 'Mix de castanhas', portion: '30 g', portionBaseG: 30, proteinG: 6, kcal: 200, group: 'proteina' },

  // ---------------- Carboidratos ----------------
  { id: 'arroz', name: 'Arroz integral cozido', portion: '4 col. sopa (100 g)', portionBaseG: 100, proteinG: 3, kcal: 124, group: 'carboidrato' },
  { id: 'batata_doce', name: 'Batata-doce assada', portion: '150 g', portionBaseG: 150, proteinG: 3, kcal: 130, group: 'carboidrato' },
  { id: 'mandioquinha', name: 'Mandioquinha cozida', portion: '150 g', portionBaseG: 150, proteinG: 2, kcal: 120, group: 'carboidrato' },
  { id: 'macarrao', name: 'Macarrão integral cozido', portion: '1 prato (100 g)', portionBaseG: 100, proteinG: 5, kcal: 124, group: 'carboidrato' },
  { id: 'pao_integral', name: 'Pão integral', portion: '2 fatias', portionBaseG: 50, proteinG: 6, kcal: 130, group: 'carboidrato' },
  { id: 'aveia', name: 'Aveia em flocos', portion: '30 g (3 col.)', portionBaseG: 30, proteinG: 4, kcal: 113, group: 'carboidrato' },
  { id: 'cuscuz', name: 'Cuscuz de milho', portion: '100 g', portionBaseG: 100, proteinG: 3, kcal: 110, group: 'carboidrato' },
  { id: 'tapioca', name: 'Tapioca', portion: '1 unidade (80 g)', portionBaseG: 80, proteinG: 1, kcal: 180, group: 'carboidrato' },

  // ---------------- Legumes / hortaliças ----------------
  { id: 'brocolis', name: 'Brócolis cozido', portion: '150 g', portionBaseG: 150, proteinG: 4, kcal: 50, group: 'legume' },
  { id: 'salada', name: 'Salada verde à vontade', portion: '1 prato', portionBaseG: 120, proteinG: 2, kcal: 25, group: 'legume' },
  { id: 'legumes_assados', name: 'Legumes assados', portion: '150 g', portionBaseG: 150, proteinG: 3, kcal: 90, group: 'legume' },
  { id: 'abobrinha', name: 'Abobrinha refogada', portion: '150 g', portionBaseG: 150, proteinG: 2, kcal: 60, group: 'legume' },
  { id: 'couve', name: 'Couve refogada', portion: '100 g', portionBaseG: 100, proteinG: 2, kcal: 70, group: 'legume' },

  // ---------------- Frutas ----------------
  { id: 'banana', name: 'Banana', portion: '1 unidade', portionBaseG: 100, proteinG: 1, kcal: 105, group: 'fruta' },
  { id: 'mamao', name: 'Mamão papaia', portion: '1 fatia', portionBaseG: 150, proteinG: 1, kcal: 60, group: 'fruta' },
  { id: 'maca', name: 'Maçã', portion: '1 unidade', portionBaseG: 130, proteinG: 1, kcal: 95, group: 'fruta' },
  { id: 'morango', name: 'Morangos', portion: '1 xícara (150 g)', portionBaseG: 150, proteinG: 1, kcal: 48, group: 'fruta' },
  { id: 'laranja', name: 'Laranja', portion: '1 unidade', portionBaseG: 130, proteinG: 2, kcal: 62, group: 'fruta' },
  { id: 'abacaxi', name: 'Abacaxi', portion: '1 fatia (100 g)', portionBaseG: 100, proteinG: 1, kcal: 55, group: 'fruta' },

  // ---------------- Gorduras boas ----------------
  { id: 'azeite', name: 'Azeite de oliva extravirgem', portion: '1 col. sopa', portionBaseG: 13, proteinG: 0, kcal: 119, group: 'gordura' },
  { id: 'abacate', name: 'Abacate', portion: '1/2 unidade', portionBaseG: 100, proteinG: 2, kcal: 160, group: 'gordura' },
  { id: 'pasta_amendoim', name: 'Pasta de amendoim integral', portion: '1 col. sopa', portionBaseG: 16, proteinG: 4, kcal: 95, group: 'gordura' },
  { id: 'chia', name: 'Chia', portion: '1 col. sopa', portionBaseG: 12, proteinG: 3, kcal: 58, group: 'gordura' },
];

export function food(id: string): FoodItem | undefined {
  return FOODS.find((f) => f.id === id);
}

/** Escala um alimento e devolve texto de porção amigável. */
export function scaledPortion(item: FoodItem, factor: number): string {
  if (factor <= 0.01) return item.portion;
  const g = Math.max(15, Math.round((item.portionBaseG * factor) / 5) * 5);
  // alimentos contados por unidade ganham nota
  if (item.id === 'ovo') return `${g} g (≈ ${Math.max(1, Math.round(g / 50))} un)`;
  if (item.id === 'banana' || item.id === 'maca') return `${g} g (≈ ${Math.max(1, Math.round(g / 120))} un)`;
  if (item.id === 'abacate') return `${g} g (≈ ${Math.max(1, Math.round(g / 200))}/2 un)`;
  if (item.id === 'whey') return `${g} g (≈ ${Math.max(1, Math.round(g / 30))} scoop)`;
  if (item.id === 'azeite') return `${Math.max(1, Math.round(g / 13))} col. sopa`;
  if (item.id === 'castanhas') return `${g} g`;
  if (item.id === 'chia' || item.id === 'pasta_amendoim') return `${g} g`;
  if (item.id === 'salada') return g > 150 ? '1 prato + porção extra' : '1 prato';
  return `${g} g`;
}
