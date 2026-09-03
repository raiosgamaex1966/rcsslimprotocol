import { isSupabaseConfigured, supabase } from './supabase';
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

/** Upload para bucket público no Supabase; no demo usa data URL para arquivos pequenos. */
export async function uploadExerciseVideo(file: File): Promise<string> {
  const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (!allowed.includes(file.type)) throw new Error('Formato não aceito. Use MP4, WebM ou MOV.');
  if (file.size > 150 * 1024 * 1024) throw new Error('O vídeo deve ter no máximo 150 MB.');

  if (!isSupabaseConfigured) {
    if (file.size > 3 * 1024 * 1024) {
      throw new Error('No modo demonstração, use arquivo de até 3 MB ou cadastre um link. No Supabase o limite é 150 MB.');
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
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message);
  return supabase!.storage.from('exercise-videos').getPublicUrl(path).data.publicUrl;
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