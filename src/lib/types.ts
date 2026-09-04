export type Sexo = 'feminino' | 'masculino' | 'outro';

export type ProfessionalRole = 'medico' | 'nutricionista' | 'personal';

export const PROFESSIONAL_ROLE_LABEL: Record<ProfessionalRole, string> = {
  medico: 'Médico(a) / Endocrinologista',
  nutricionista: 'Nutricionista',
  personal: 'Profissional de Educação Física / Personal',
};

/** Presente apenas em contas de profissionais de saúde (não pacientes). */
export interface ProfessionalInfo {
  role: ProfessionalRole;
  credential: string; // CRM, CRN, CREF etc.
  bio?: string;
}

export interface Profile {
  name: string;
  sex: Sexo | '';
  birthDate: string; // yyyy-mm-dd
  email: string;
  phone: string;
  whatsapp: string;
  startWeightKg: number | null;
  heightCm: number | null;
  role?: 'admin' | 'patient'; // super admin do aplicativo
  patientCode?: string; // código curto para vincular profissionais
  professional?: ProfessionalInfo; // presente quando a conta é de um profissional
}

/** Registro diário de sintomas/efeitos colaterais — visível para o médico vinculado. */
export interface SymptomLog {
  id: string;
  date: string; // ISO
  symptoms: string[]; // rótulos livres (ex.: "Náusea", "Dor de cabeça")
  severity: 'leve' | 'moderada' | 'intensa';
  note: string;
}

export type LinkStatus = 'pendente' | 'aprovado' | 'recusado' | 'revogado';

/** Vínculo entre um paciente e um profissional, com escopo por papel. */
export interface PatientLink {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  professionalId: string;
  professionalName: string;
  professionalEmail: string;
  role: ProfessionalRole;
  status: LinkStatus;
  createdAt: string;
  respondedAt?: string;
}

/** Notas clínicas/profissionais deixadas para o paciente, por escopo. */
export interface ProfessionalNotes {
  medico?: { text: string; authorName: string; updatedAt: string };
  nutricionista?: { text: string; authorName: string; updatedAt: string };
  personal?: { text: string; authorName: string; updatedAt: string };
}

/** Ajustes manuais e dieta prescrita pelo nutricionista. */
export interface NutritionOverride {
  proteinG?: number;
  kcal?: number;
  fiberG?: number;
  note?: string;
  mealPlanTitle?: string;
  mealPlanText?: string;
  prescribedMeals?: {
    name: string;
    time?: string;
    description: string;
    proteinG?: number;
    fiberG?: number;
    kcal?: number;
  }[];
  authorName: string;
  updatedAt: string;
}

export type Frequency = 'semanal' | 'diaria';

/** Fase de um esquema progressivo de doses (titulação definida pelo médico).
 *  Ex.: semanas 1–4 → 0,25 mg; semanas 5–8 → 0,5 mg; semana 9+ → 1,0 mg. */
export interface DosePhase {
  startWeek: number; // 1 = semana da primeira aplicação
  endWeek: number | null; // null = "em diante" (apenas na última fase)
  doseMg: number;
}

export interface Treatment {
  medId: string;
  doseMg: number; // dose fixa OU dose inicial (fase 1) quando há esquema
  frequency: Frequency;
  weekday: number; // 0 (domingo) - 6 (sábado) — usado se semanal
  time: string; // "08:00"
  startDate: string; // yyyy-mm-dd
  phases?: DosePhase[]; // esquema progressivo opcional (definido pelo médico)
}

export type InjectionSite =
  | 'abdomen_superior_direito'
  | 'abdomen_superior_esquerdo'
  | 'abdomen_inferior_direito'
  | 'abdomen_inferior_esquerdo'
  | 'coxa_direita'
  | 'coxa_esquerda'
  | 'braco_direito'
  | 'braco_esquerdo';

export const INJECTION_SITE_LABELS: Record<InjectionSite, string> = {
  abdomen_superior_direito: 'Abdômen (superior direito)',
  abdomen_superior_esquerdo: 'Abdômen (superior esquerdo)',
  abdomen_inferior_direito: 'Abdômen (inferior direito)',
  abdomen_inferior_esquerdo: 'Abdômen (inferior esquerdo)',
  coxa_direita: 'Coxa (direita)',
  coxa_esquerda: 'Coxa (esquerda)',
  braco_direito: 'Braço (direito)',
  braco_esquerdo: 'Braço (esquerdo)',
};

export interface DoseLog {
  id: string;
  date: string; // ISO
  doseMg: number;
  medId: string;
  site?: InjectionSite;
  notes?: string;
}

export interface PenStock {
  openedAt: string; // yyyy-mm-dd
  totalDoses: number;
  dosesUsed: number;
  expiryDays: number; // 30 ou 56 dias
  brand: string;
}

export interface WaterLog {
  date: string; // yyyy-mm-dd
  ml: number;
}

export interface WeightEntry {
  date: string; // ISO
  kg: number;
}

/** Refeição livre/customizada que o paciente de fato comeu. */
export interface CustomMealLog {
  id: string;
  time: string; // "13:30"
  description: string; // Ex: "1 filé de frango com 3 colheres de arroz e salada"
  proteinG: number;
  fiberG?: number;
  kcal?: number;
  analyzedByAI?: boolean;
}

/** Registro de refeições consumidas em um dia (controle de proteína e fibras). */
export interface NutritionLog {
  date: string; // yyyy-mm-dd
  meals: string[]; // ids das refeições do cardápio padrão marcadas como consumidas
  customMeals?: CustomMealLog[]; // refeições livres inseridas pelo paciente
}

export type ActivityLevel = 'sedentario' | 'leve' | 'moderado' | 'ativo';
export type TrainingExperience = 'iniciante' | 'intermediario' | 'avancado';
export type TrainingLocation = 'casa' | 'academia' | 'ar_livre';

/** Triagem funcional informada pelo paciente. Não substitui avaliação profissional. */
export interface PhysicalAssessment {
  activityLevel: ActivityLevel;
  currentActivities: string;
  experience: TrainingExperience;
  daysPerWeek: number;
  minutesPerSession: number;
  location: TrainingLocation;
  equipment: string[];
  limitations: string[];
  limitationDetails: string;
  goals: string[];
  medicalConditions: string;
  hasWarningSymptoms: boolean;
  professionalClearance: boolean;
  updatedAt: string;
}

export interface WorkoutLog {
  date: string; // yyyy-mm-dd
  sessionId: string;
  completed: boolean;
}

export type ExerciseVideoCategory = 'forca' | 'caminhada' | 'mobilidade' | 'equilibrio' | 'tai_chi' | 'alongamento';

/** Vídeo publicado por um especialista para orientar a execução. */
export interface ExerciseVideo {
  id: string;
  title: string;
  specialistName: string;
  specialistCredential: string;
  description: string;
  category: ExerciseVideoCategory;
  exerciseNames: string[];
  suitableFor: string[];
  level: 'iniciante' | 'intermediario' | 'todos';
  durationMinutes: number;
  videoUrl: string;
  thumbnailUrl?: string;
  published: boolean;
  createdAt: string;
  /** Se vazio/ausente: vídeo público da biblioteca geral (Super Admin).
   *  Se preenchido: visível apenas para os pacientes listados (enviado pelo personal). */
  assignedPatientIds?: string[];
  uploadedByProfessionalId?: string;
  uploadedByProfessionalName?: string;
}

export interface PatientData {
  profile: Profile;
  treatment: Treatment | null;
  logs: DoseLog[];
  weights: WeightEntry[];
  nutritionLogs?: NutritionLog[];
  waterLogs?: WaterLog[];
  penStock?: PenStock | null;
  targetWeightKg?: number | null;
  physicalAssessment?: PhysicalAssessment;
  workoutLogs?: WorkoutLog[];
  symptomLogs?: SymptomLog[];
  professionalNotes?: ProfessionalNotes;
  nutritionOverride?: NutritionOverride;
  workoutOverride?: WorkoutPlanLike;
}

/** Representação leve de um plano de treino (evita import circular com lib/exercise). */
export interface WorkoutPlanLike {
  sessions: {
    id: string;
    dayIndex: number;
    dayName: string;
    title: string;
    focus: string;
    durationMinutes: number;
    intensity: string;
    exercises: { name: string; sets: number; reps: string; restSeconds: number; instructions: string; adaptation?: string }[];
  }[];
  weeklyMinutes: number;
  source: 'adaptativo' | 'ia';
  safetyNote: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  professional?: ProfessionalInfo;
  metadata?: Record<string, unknown>;
}

export interface SignUpPayload {
  name: string;
  sex: Sexo;
  birthDate: string;
  email: string;
  phone: string;
  whatsapp: string;
  startWeightKg: number | null;
  heightCm: number | null;
  password: string;
  professional?: ProfessionalInfo; // presente somente no cadastro de profissionais
}

export type FrequencyLabel = 'Semanal' | 'Diária';

export const SEXO_LABEL: Record<Sexo, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  outro: 'Outro / prefiro não informar',
};
