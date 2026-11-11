import { isSupabaseConfigured, supabase } from './supabase';
import { normalizeExerciseText } from './exercise';
import type { ExerciseVideo } from './types';

const LOCAL_KEY = 'minhacaneta_exercise_videos';
const CONFIG_ID = 'exercise_videos';

export const VIDEO_SUITABILITY = [
  ['geral', 'Público geral'],
  ['joelho', 'Problemas nos joelhos'],
  ['coluna', 'Limitação de coluna/lombar'],
  ['ombro', 'Limitação nos ombros'],
  ['quadril', 'Limitação de quadril'],
  ['equilibrio', 'Equilíbrio reduzido'],
  ['cadeira', 'Exercícios na cadeira'],
  ['mobilidade_reduzida', 'Mobilidade reduzida'],
  ['sedentario', 'Pessoa sedentária'],
];

function localVideos(): ExerciseVideo[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as ExerciseVideo[]) : [];
  } catch {
    return [];
  }
}

export async function loadExerciseVideos(): Promise<ExerciseVideo[]> {
  if (!isSupabaseConfigured) return localVideos();
  const { data, error } = await supabase!.from('app_config').select('config').eq('id', CONFIG_ID).maybeSingle();
  if (error) throw new Error(error.message);
  const config = data?.config as { videos?: ExerciseVideo[] } | null;
  return config?.videos ?? [];
}

export async function saveExerciseVideos(videos: ExerciseVideo[]): Promise<void> {
  if (!isSupabaseConfigured) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(videos));
    return;
  }
  const { error } = await supabase!
    .from('app_config')
    .upsert({ id: CONFIG_ID, config: { videos }, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Upload para bucket público no Supabase (até 50 MB); no demo usa data URL para arquivos pequenos. */
export async function uploadExerciseVideo(file: File): Promise<string> {
  const extMatch = file.name.toLowerCase().match(/\.(mp4|webm|mov|m4v)$/);
  const extMimeMap: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
  };
  const resolvedType = file.type || (extMatch ? extMimeMap[extMatch[1]] : '');
  const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
  if (!allowed.includes(resolvedType)) {
    throw new Error('Formato não aceito. Use MP4, WebM, M4V ou MOV.');
  }
  const maxBytes = 50 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      `O vídeo tem ${(file.size / (1024 * 1024)).toFixed(1)} MB e excede o limite de 50 MB do servidor. Comprima o MP4 ou use um link do YouTube/Vimeo.`,
    );
  }

  if (!isSupabaseConfigured) {
    if (file.size > 3 * 1024 * 1024) {
      throw new Error('No modo demonstração, use arquivo de até 3 MB ou cadastre um link. No Supabase o limite é 50 MB.');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase!.storage.from('exercise-videos').upload(path, file, {
    contentType: resolvedType,
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message);
  return supabase!.storage.from('exercise-videos').getPublicUrl(path).data.publicUrl;
}

const STORAGE_PUBLIC_PREFIX = '/storage/v1/object/public/exercise-videos/';

/** Extrai o caminho do objeto no bucket `exercise-videos` a partir da URL pública. */
export function extractExerciseStoragePath(publicUrl: string): string | null {
  if (!publicUrl || !publicUrl.includes(STORAGE_PUBLIC_PREFIX)) return null;
  const rawPath = publicUrl.split(STORAGE_PUBLIC_PREFIX)[1]?.split('?')[0]?.trim();
  if (!rawPath) return null;
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

/** Remove um vídeo ou miniatura enviada anteriormente para o bucket `exercise-videos`. */
export async function deleteExerciseStorageFile(publicUrl: string): Promise<boolean> {
  const objectPath = extractExerciseStoragePath(publicUrl);
  if (!objectPath) return false;
  if (!isSupabaseConfigured || !supabase) return true;
  try {
    const { error } = await supabase.storage.from('exercise-videos').remove([objectPath]);
    return !error;
  } catch {
    return false;
  }
}

/** Upload para imagem de capa (thumbnail) no Supabase storage */
export async function uploadExerciseThumbnail(file: File): Promise<string> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) throw new Error('Formato de capa inválido. Use JPG, PNG ou WEBP.');
  if (file.size > 10 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 10 MB.');

  if (!isSupabaseConfigured) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      reader.readAsDataURL(file);
    });
  }

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const path = `thumbnails/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase!.storage.from('exercise-videos').upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message);
  return supabase!.storage.from('exercise-videos').getPublicUrl(path).data.publicUrl;
}

export function videoThumbnailUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    }
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function videoEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname === 'youtu.be') return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    if (parsed.hostname.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function recommendedVideos(videos: ExerciseVideo[], limitations: string[], activityLevel: string, patientId?: string): ExerciseVideo[] {
  const tags = new Set(['geral', ...limitations]);
  if (limitations.includes('joelho') || limitations.includes('equilibrio')) {
    tags.add('cadeira');
    tags.add('mobilidade_reduzida');
  }
  if (activityLevel === 'sedentario') tags.add('sedentario');
  return videos
    .filter((video) => video.published)
    // biblioteca geral (sem atribuição) OU vídeo atribuído especificamente a este paciente pelo seu personal
    .filter((video) => !video.assignedPatientIds?.length || (patientId && video.assignedPatientIds.includes(patientId)))
    .sort((a, b) => {
      const score = (v: ExerciseVideo) => v.suitableFor.filter((tag) => tags.has(tag)).length + (v.assignedPatientIds?.includes(patientId ?? '') ? 10 : 0);
      return score(b) - score(a);
    });
}

/** Localiza o melhor vídeo publicado para um exercício específico (match em exerciseNames ou título). */
export function matchVideoForExercise(
  videos: ExerciseVideo[],
  exerciseName: string,
  patientId?: string,
): ExerciseVideo | undefined {
  const target = normalizeExerciseText(exerciseName);
  if (!target) return undefined;

  const eligible = videos
    .filter((v) => v.published)
    .filter((v) => !v.assignedPatientIds?.length || (patientId && v.assignedPatientIds.includes(patientId)));

  let best: { video: ExerciseVideo; score: number } | undefined;
  for (const video of eligible) {
    let score = 0;
    const assignedBonus = patientId && video.assignedPatientIds?.includes(patientId) ? 50 : 0;

    for (const linked of video.exerciseNames ?? []) {
      const cand = normalizeExerciseText(linked);
      if (!cand) continue;
      if (cand === target) score = Math.max(score, 100 + assignedBonus);
      else if (target.includes(cand) || cand.includes(target)) score = Math.max(score, 60 + assignedBonus);
    }

    if (score === 0) {
      const titleNorm = normalizeExerciseText(video.title);
      if (titleNorm && (titleNorm === target || titleNorm.includes(target) || target.includes(titleNorm))) {
        score = 30 + assignedBonus;
      }
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { video, score };
    }
  }
  return best?.video;
}
