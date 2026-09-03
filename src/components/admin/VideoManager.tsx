import { useEffect, useRef, useState } from 'react';
import { Check, Film, Link2, LoaderCircle, Play, Plus, Save, Trash2, Upload } from 'lucide-react';
import { Badge, Button, Card, Field, SectionTitle, SelectInput, TextInput } from '../ui';
import type { ExerciseVideo, ExerciseVideoCategory } from '../../lib/types';
import { loadExerciseVideos, saveExerciseVideos, uploadExerciseVideo, VIDEO_SUITABILITY, videoEmbedUrl } from '../../lib/videoLibrary';
import { cn } from '../../utils/cn';

const EMPTY: Omit<ExerciseVideo, 'id' | 'createdAt'> = {
  title: '', specialistName: '', specialistCredential: '', description: '', category: 'forca', exerciseNames: [],
  suitableFor: ['geral'], level: 'todos', durationMinutes: 10, videoUrl: '', published: true,
};

export default function VideoManager() {
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [exerciseText, setExerciseText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadExerciseVideos().then(setVideos).catch((e: Error) => setMessage(e.message));
  }, []);

  function patch(p: Partial<typeof form>) { setForm((old) => ({ ...old, ...p })); }
  function toggleTag(tag: string) {
    patch({ suitableFor: form.suitableFor.includes(tag) ? form.suitableFor.filter((x) => x !== tag) : [...form.suitableFor, tag] });
  }

  async function handleUpload(file?: File) {
    if (!file) return;
    setBusy(true); setMessage('Enviando vídeo...');
    try {
      const videoUrl = await uploadExerciseVideo(file);
      patch({ videoUrl });
      setMessage('Upload concluído. Preencha os dados e publique.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Falha no upload.'); }
    finally { setBusy(false); }
  }

  async function publish() {
    if (!form.title.trim() || !form.specialistName.trim() || !form.videoUrl.trim()) {
      setMessage('Informe título, especialista e vídeo/link.'); return;
    }
    const next: ExerciseVideo[] = [{
      ...form,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      exerciseNames: exerciseText.split(',').map((x) => x.trim()).filter(Boolean),
    }, ...videos];
    setBusy(true);
    try {
      await saveExerciseVideos(next); setVideos(next); setForm(EMPTY); setExerciseText(''); setMessage('Vídeo publicado na área do paciente.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Falha ao publicar.'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    const next = videos.filter((v) => v.id !== id);
    await saveExerciseVideos(next); setVideos(next);
  }

  return (
    <Card className="p-6">
      <SectionTitle icon={<Film className="h-4 w-4 text-cyan-600" />} title="Videoteca de especialistas" subtitle="Envie vídeos ou cadastre links do YouTube, Vimeo e arquivos MP4/WebM" />
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título do vídeo" required><TextInput value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Ex.: Tai Chi sentado para iniciantes" /></Field>
            <Field label="Especialista" required><TextInput value={form.specialistName} onChange={(e) => patch({ specialistName: e.target.value })} placeholder="Nome do personal trainer" /></Field>
            <Field label="Registro/formação"><TextInput value={form.specialistCredential} onChange={(e) => patch({ specialistCredential: e.target.value })} placeholder="Ex.: CREF 000000-G/SP" /></Field>
            <Field label="Categoria"><SelectInput value={form.category} onChange={(e) => patch({ category: e.target.value as ExerciseVideoCategory })}><option value="forca">Força</option><option value="caminhada">Caminhada</option><option value="mobilidade">Mobilidade</option><option value="equilibrio">Equilíbrio</option><option value="tai_chi">Tai Chi</option><option value="alongamento">Alongamento</option></SelectInput></Field>
            <Field label="Nível"><SelectInput value={form.level} onChange={(e) => patch({ level: e.target.value as ExerciseVideo['level'] })}><option value="todos">Todos</option><option value="iniciante">Iniciante</option><option value="intermediario">Intermediário</option></SelectInput></Field>
            <Field label="Duração (min)"><TextInput type="number" min="1" max="120" value={form.durationMinutes} onChange={(e) => patch({ durationMinutes: Number(e.target.value) })} /></Field>
          </div>
          <div className="mt-3"><Field label="Descrição"><TextInput value={form.description} onChange={(e) => patch({ description: e.target.value })} placeholder="Orientações e objetivo do vídeo" /></Field></div>
          <div className="mt-3"><Field label="Exercícios relacionados" hint="separe por vírgulas"><TextInput value={exerciseText} onChange={(e) => setExerciseText(e.target.value)} placeholder="Flexão na parede, Remada com elástico" /></Field></div>

          <p className="mt-4 text-xs font-extrabold text-slate-700 dark:text-slate-200">Indicado para</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{VIDEO_SUITABILITY.map(([tag, label]) => <button type="button" key={tag} onClick={() => toggleTag(tag)} className={cn('rounded-full border px-2.5 py-1.5 text-[10px] font-bold', form.suitableFor.includes(tag) ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}>{form.suitableFor.includes(tag) && <Check className="mr-1 inline h-3 w-3" />}{label}</button>)}</div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Link do vídeo"><div className="relative"><Link2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><TextInput value={form.videoUrl} onChange={(e) => patch({ videoUrl: e.target.value })} className="pl-10" placeholder="YouTube, Vimeo ou MP4" /></div></Field>
            <Field label="Ou envie um arquivo" hint="MP4/WebM/MOV"><input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => void handleUpload(e.target.files?.[0])} /><Button variant="secondary" full onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Selecionar e enviar</Button></Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={form.published} onChange={(e) => patch({ published: e.target.checked })} className="accent-brand-600" /> Publicar imediatamente para pacientes</label>
          {message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{message}</p>}
          <Button onClick={publish} disabled={busy} className="mt-4"><Plus className="h-4 w-4" />Adicionar à videoteca</Button>
        </div>

        <div className="border-t border-slate-200 pt-5 dark:border-slate-800 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Vídeos publicados ({videos.length})</p>
          <div className="mt-3 max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {!videos.length && <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-700">Nenhum vídeo cadastrado.</div>}
            {videos.map((v) => <div key={v.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"><Play className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">{v.title}</p><p className="text-[10px] text-slate-400">{v.specialistName} · {v.durationMinutes} min</p></div><button onClick={() => void remove(v.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></div>
              <div className="mt-2 flex flex-wrap gap-1"><Badge className="bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">{v.category}</Badge>{v.suitableFor.slice(0, 3).map((t) => <Badge key={t} className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{t}</Badge>)}</div>
              {videoEmbedUrl(v.videoUrl) && <p className="mt-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Link incorporável validado</p>}
            </div>)}
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"><Save className="mt-0.5 h-3.5 w-3.5 shrink-0" />Publique somente material autorizado pelo especialista, com credenciais verificadas e orientação de segurança. No modo demonstração, arquivos locais são limitados a 3 MB.</div>
    </Card>
  );
}