import { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle,
  FlaskConical,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Button } from './ui';
import type { LabExam } from '../lib/types';
import { extractLabExamFromImages } from '../lib/llm';
import { cn } from '../utils/cn';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  exams: LabExam[];
  onSaveExams: (updated: LabExam[]) => void;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function LabExamModal({ isOpen, onClose, exams, onSaveExams }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);

  // Upload e IA
  const [uploadedImages, setUploadedImages] = useState<Array<{ id: string; name: string; dataUrl: string; mimeType: string }>>([]);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);

  // Dados do formulário
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Glicemia & Insulina
  const [fastingGlucose, setFastingGlucose] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [insulin, setInsulin] = useState('');

  // Renal & Eletrólitos
  const [creatinine, setCreatinine] = useState('');
  const [urea, setUrea] = useState('');
  const [sodium, setSodium] = useState('');
  const [potassium, setPotassium] = useState('');

  // Fígado, Pâncreas & Vesícula
  const [tgo, setTgo] = useState('');
  const [tgp, setTgp] = useState('');
  const [gamaGt, setGamaGt] = useState('');
  const [alkalinePhosphatase, setAlkalinePhosphatase] = useState('');
  const [totalBilirubin, setTotalBilirubin] = useState('');
  const [amylase, setAmylase] = useState('');
  const [lipase, setLipase] = useState('');

  // Perfil Lipídico
  const [totalCholesterol, setTotalCholesterol] = useState('');
  const [ldl, setLdl] = useState('');
  const [hdl, setHdl] = useState('');
  const [triglycerides, setTriglycerides] = useState('');

  // Tireoide & Segurança
  const [tsh, setTsh] = useState('');
  const [t4Free, setT4Free] = useState('');
  const [calcitonin, setCalcitonin] = useState('');

  // Nutricional & Massa Magra
  const [albumin, setAlbumin] = useState('');
  const [uricAcid, setUricAcid] = useState('');
  const [vitaminD, setVitaminD] = useState('');
  const [vitaminB12, setVitaminB12] = useState('');
  const [ferritin, setFerritin] = useState('');

  // Outros Exames (não listados nas caixas padrão, ex: Hemograma, PCR, etc.)
  const [otherResults, setOtherResults] = useState('');

  // Ultrassom & Notas
  const [ultrasoundNotes, setUltrasoundNotes] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  // Cálculo automático do HOMA-IR em tempo real se glicemia e insulina informados
  const gNum = parseFloat(fastingGlucose.replace(',', '.'));
  const iNum = parseFloat(insulin.replace(',', '.'));
  const homaIr = gNum > 0 && iNum > 0 ? Math.round(((gNum * iNum) / 405) * 100) / 100 : null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAiError(null);
    setAiSuccess(null);

    const readPromises = Array.from(files).map((file) => {
      return new Promise<{ id: string; name: string; dataUrl: string; mimeType: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            id: uid(),
            name: file.name,
            dataUrl: reader.result as string,
            mimeType: file.type || 'image/jpeg',
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then((newImgs) => {
      setUploadedImages((prev) => [...prev, ...newImgs]);
      e.target.value = '';
    });
  }

  function handleRemoveImage(id: string) {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  }

  async function handleScanWithAI() {
    if (uploadedImages.length === 0) {
      setAiError('Adicione ao menos uma foto ou página do laudo para a IA analisar.');
      return;
    }
    setAiScanning(true);
    setAiError(null);
    setAiSuccess(null);

    const payload = uploadedImages.map((img) => ({
      data: img.dataUrl,
      mimeType: img.mimeType,
    }));

    const res = await extractLabExamFromImages(payload);
    setAiScanning(false);

    if (!res.success || !res.data) {
      setAiError(res.error || 'Não foi possível interpretar o laudo.');
      return;
    }

    const d = res.data;
    let foundCount = 0;

    if (d.date) { setDate(d.date); foundCount++; }
    if (d.fastingGlucoseMgDl != null) { setFastingGlucose(String(d.fastingGlucoseMgDl)); foundCount++; }
    if (d.hba1cPercent != null) { setHba1c(String(d.hba1cPercent)); foundCount++; }
    if (d.insulinUuMl != null) { setInsulin(String(d.insulinUuMl)); foundCount++; }
    if (d.totalCholesterolMgDl != null) { setTotalCholesterol(String(d.totalCholesterolMgDl)); foundCount++; }
    if (d.ldlCholesterolMgDl != null) { setLdl(String(d.ldlCholesterolMgDl)); foundCount++; }
    if (d.hdlCholesterolMgDl != null) { setHdl(String(d.hdlCholesterolMgDl)); foundCount++; }
    if (d.triglyceridesMgDl != null) { setTriglycerides(String(d.triglyceridesMgDl)); foundCount++; }
    if (d.tgoUl != null) { setTgo(String(d.tgoUl)); foundCount++; }
    if (d.tgpUl != null) { setTgp(String(d.tgpUl)); foundCount++; }
    if (d.gamaGtUl != null) { setGamaGt(String(d.gamaGtUl)); foundCount++; }
    if (d.alkalinePhosphataseUl != null) { setAlkalinePhosphatase(String(d.alkalinePhosphataseUl)); foundCount++; }
    if (d.totalBilirubinMgDl != null) { setTotalBilirubin(String(d.totalBilirubinMgDl)); foundCount++; }
    if (d.amylaseUl != null) { setAmylase(String(d.amylaseUl)); foundCount++; }
    if (d.lipaseUl != null) { setLipase(String(d.lipaseUl)); foundCount++; }
    if (d.creatinineMgDl != null) { setCreatinine(String(d.creatinineMgDl)); foundCount++; }
    if (d.ureaMgDl != null) { setUrea(String(d.ureaMgDl)); foundCount++; }
    if (d.sodiumMEqL != null) { setSodium(String(d.sodiumMEqL)); foundCount++; }
    if (d.potassiumMEqL != null) { setPotassium(String(d.potassiumMEqL)); foundCount++; }
    if (d.tshUiuMl != null) { setTsh(String(d.tshUiuMl)); foundCount++; }
    if (d.t4FreeNgDl != null) { setT4Free(String(d.t4FreeNgDl)); foundCount++; }
    if (d.calcitoninPgMl != null) { setCalcitonin(String(d.calcitoninPgMl)); foundCount++; }
    if (d.albuminGDl != null) { setAlbumin(String(d.albuminGDl)); foundCount++; }
    if (d.uricAcidMgDl != null) { setUricAcid(String(d.uricAcidMgDl)); foundCount++; }
    if (d.vitaminDNgMl != null) { setVitaminD(String(d.vitaminDNgMl)); foundCount++; }
    if (d.vitaminB12PgMl != null) { setVitaminB12(String(d.vitaminB12PgMl)); foundCount++; }
    if (d.ferritinNgMl != null) { setFerritin(String(d.ferritinNgMl)); foundCount++; }
    if (d.otherResults) { setOtherResults(d.otherResults); foundCount++; }
    if (d.ultrasoundNotes) { setUltrasoundNotes(d.ultrasoundNotes); foundCount++; }
    if (d.notes) { setNotes(d.notes); }

    setAiSuccess(`Laudo analisado com sucesso! ${foundCount} parâmetro(s) identificados e preenchidos automaticamente. Confira os valores abaixo.`);
  }

  function handleAddExam() {
    const parseNum = (v: string) => {
      const clean = v.trim().replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? undefined : num;
    };

    const newExam: LabExam = {
      id: uid(),
      date,
      fastingGlucoseMgDl: parseNum(fastingGlucose),
      hba1cPercent: parseNum(hba1c),
      insulinUuMl: parseNum(insulin),
      totalCholesterolMgDl: parseNum(totalCholesterol),
      ldlCholesterolMgDl: parseNum(ldl),
      hdlCholesterolMgDl: parseNum(hdl),
      triglyceridesMgDl: parseNum(triglycerides),
      tgoUl: parseNum(tgo),
      tgpUl: parseNum(tgp),
      gamaGtUl: parseNum(gamaGt),
      alkalinePhosphataseUl: parseNum(alkalinePhosphatase),
      totalBilirubinMgDl: parseNum(totalBilirubin),
      amylaseUl: parseNum(amylase),
      lipaseUl: parseNum(lipase),
      creatinineMgDl: parseNum(creatinine),
      ureaMgDl: parseNum(urea),
      sodiumMEqL: parseNum(sodium),
      potassiumMEqL: parseNum(potassium),
      tshUiuMl: parseNum(tsh),
      t4FreeNgDl: parseNum(t4Free),
      calcitoninPgMl: parseNum(calcitonin),
      albuminGDl: parseNum(albumin),
      uricAcidMgDl: parseNum(uricAcid),
      vitaminDNgMl: parseNum(vitaminD),
      vitaminB12PgMl: parseNum(vitaminB12),
      ferritinNgMl: parseNum(ferritin),
      otherResults: otherResults.trim() ? otherResults.trim() : undefined,
      ultrasoundNotes: ultrasoundNotes.trim() ? ultrasoundNotes.trim() : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
    };

    const next = [...exams, newExam].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    onSaveExams(next);
    setShowAddForm(false);

    // Limpa campos
    setFastingGlucose('');
    setHba1c('');
    setInsulin('');
    setTotalCholesterol('');
    setLdl('');
    setHdl('');
    setTriglycerides('');
    setTgo('');
    setTgp('');
    setGamaGt('');
    setAlkalinePhosphatase('');
    setTotalBilirubin('');
    setAmylase('');
    setLipase('');
    setCreatinine('');
    setUrea('');
    setSodium('');
    setPotassium('');
    setTsh('');
    setT4Free('');
    setCalcitonin('');
    setAlbumin('');
    setUricAcid('');
    setVitaminD('');
    setVitaminB12('');
    setFerritin('');
    setOtherResults('');
    setUltrasoundNotes('');
    setNotes('');
    setUploadedImages([]);
    setAiError(null);
    setAiSuccess(null);
  }

  function handleDeleteExam(id: string) {
    if (window.confirm('Excluir este registro de exame laboratorial?')) {
      onSaveExams(exams.filter((e) => e.id !== id));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7 max-h-[94vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          title="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
          <FlaskConical className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Acompanhamento Clínico & Laboratorial</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Exames Laboratoriais
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Painel completo indicado pelas diretrizes médicas (SBEM/ABESO) para acompanhamento seguro de GLP-1/GIP.
            </p>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="!py-1.5 !px-3 text-xs shrink-0 self-start sm:self-auto bg-teal-600 hover:bg-teal-700">
              <Plus className="h-3.5 w-3.5" /> Novo Exame
            </Button>
          )}
        </div>

        {/* Formulário de Adicionar Exame */}
        {showAddForm && (
          <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/40 p-3.5 sm:p-5 dark:border-teal-900/50 dark:bg-teal-950/30 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/70 pb-3 dark:border-teal-800/70">
              <h4 className="text-xs font-extrabold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Cadastrar Novo Resultado de Coleta
              </h4>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-500">Data:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            {/* SEÇÃO NOVO: Upload e Leitura com IA */}
            <div className="mt-3.5 rounded-2xl border-2 border-dashed border-teal-300 bg-gradient-to-br from-teal-50 via-white to-emerald-50/60 p-4 dark:border-teal-700/60 dark:from-teal-950/40 dark:via-slate-900 dark:to-teal-950/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/30">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      Leitura Automática de Laudo com IA
                      <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[9px] font-bold text-white">IA OCR</span>
                    </h5>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      Tire fotos de cada página pelo celular ou suba arquivos do computador. A IA lê e preenche todos os dados!
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-3 py-2 text-xs font-bold text-teal-700 shadow-xs transition hover:bg-teal-50 dark:border-teal-700 dark:bg-slate-800 dark:text-teal-300">
                    <Upload className="h-3.5 w-3.5" /> Subir Fotos / PDF
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-3 py-2 text-xs font-bold text-teal-700 shadow-xs transition hover:bg-teal-50 dark:border-teal-700 dark:bg-slate-800 dark:text-teal-300">
                    <Camera className="h-3.5 w-3.5" /> Tirar Foto
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
              </div>

              {/* Miniaturas das fotos enviadas */}
              {uploadedImages.length > 0 && (
                <div className="mt-4 pt-3 border-t border-teal-200/70 dark:border-teal-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Páginas prontas para leitura ({uploadedImages.length}):
                    </span>
                    <label className="text-xs font-bold text-teal-600 hover:underline cursor-pointer flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Adicionar mais página
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {uploadedImages.map((img, idx) => (
                      <div key={img.id} className="relative group rounded-xl border border-slate-200 bg-white p-1 shadow-xs dark:border-slate-700 dark:bg-slate-800">
                        <img src={img.dataUrl} alt={img.name} className="h-16 w-16 object-cover rounded-lg" />
                        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/75 px-1 text-[9px] font-bold text-white">
                          Pág. {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose-600 text-white shadow-xs hover:bg-rose-700"
                          title="Remover esta página"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleScanWithAI}
                      disabled={aiScanning}
                      className="!py-2 !px-4 text-xs font-extrabold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20"
                    >
                      {aiScanning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {aiScanning ? 'Analisando páginas do laudo com IA...' : 'Preencher Campos com Inteligência Artificial'}
                    </Button>
                  </div>
                </div>
              )}

              {aiError && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {aiError}
                </div>
              )}

              {aiSuccess && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                  {aiSuccess}
                </div>
              )}
            </div>

            <p className="mt-3.5 text-[11px] text-slate-500 dark:text-slate-400">
              Ou preencha/ajuste manualmente os exames que realizou (não é obrigatório preencher todos):
            </p>

            <div className="mt-3 space-y-4">
              {/* 1. CONTROLE GLICÊMICO & INSULINA */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    🩸 Metabolismo Glicêmico & Insulina
                  </span>
                  {homaIr !== null && (
                    <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-full", homaIr <= 2.7 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>
                      HOMA-IR: {homaIr} ({homaIr <= 2.7 ? 'Normal' : 'Resistência Insulínica'})
                    </span>
                  )}
                </div>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Glicemia de Jejum (mg/dL)</label>
                    <input
                      type="number"
                      placeholder="Ex: 92 (Ref: 70-99)"
                      value={fastingGlucose}
                      onChange={(e) => setFastingGlucose(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Hemoglobina Glicada - HbA1c (%)</label>
                    <input
                      type="text"
                      placeholder="Ex: 5,4 (Ref: < 5,7%)"
                      value={hba1c}
                      onChange={(e) => setHba1c(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Insulina Basal (µUI/mL)</label>
                    <input
                      type="text"
                      placeholder="Ex: 7,5 (Ref: 2,6-24,9)"
                      value={insulin}
                      onChange={(e) => setInsulin(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 2. FUNÇÃO RENAL & ELETRÓLITOS */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  💧 Função Renal & Eletrólitos
                </span>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Creatinina (mg/dL)</label>
                    <input
                      type="text"
                      placeholder="Ex: 0,9 (Ref: 0,7-1,3)"
                      value={creatinine}
                      onChange={(e) => setCreatinine(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Ureia (mg/dL)</label>
                    <input
                      type="number"
                      placeholder="Ex: 32 (Ref: 15-45)"
                      value={urea}
                      onChange={(e) => setUrea(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Sódio - Na (mEq/L)</label>
                    <input
                      type="number"
                      placeholder="Ex: 140 (Ref: 135-145)"
                      value={sodium}
                      onChange={(e) => setSodium(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Potássio - K (mEq/L)</label>
                    <input
                      type="text"
                      placeholder="Ex: 4,2 (Ref: 3,5-5,1)"
                      value={potassium}
                      onChange={(e) => setPotassium(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 3. FÍGADO, PÂNCREAS & VIAS BILIARES */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  🛡️ Fígado, Pâncreas & Vias Biliares
                </span>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">TGO / AST (U/L)</label>
                    <input
                      type="number"
                      placeholder="Ex: 22 (Ref: < 35)"
                      value={tgo}
                      onChange={(e) => setTgo(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">TGP / ALT (U/L)</label>
                    <input
                      type="number"
                      placeholder="Ex: 26 (Ref: < 35)"
                      value={tgp}
                      onChange={(e) => setTgp(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Gama-GT (U/L)</label>
                    <input
                      type="number"
                      placeholder="Ex: 25 (Ref: < 40)"
                      value={gamaGt}
                      onChange={(e) => setGamaGt(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Fosfatase Alcalina (U/L)</label>
                    <input
                      type="number"
                      placeholder="Ex: 65 (Ref: 40-120)"
                      value={alkalinePhosphatase}
                      onChange={(e) => setAlkalinePhosphatase(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Bilirrubina Total (mg/dL)</label>
                    <input
                      type="text"
                      placeholder="Ex: 0,8 (Ref: < 1,2)"
                      value={totalBilirubin}
                      onChange={(e) => setTotalBilirubin(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Amilase (U/L)</label>
                    <input
                      type="number"
                      placeholder="Ex: 55 (Ref: 28-100)"
                      value={amylase}
                      onChange={(e) => setAmylase(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Lipase (U/L)</label>
                    <input
                      type="number"
                      placeholder="Ex: 32 (Ref: 13-60)"
                      value={lipase}
                      onChange={(e) => setLipase(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 4. PERFIL LIPÍDICO */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  🫀 Perfil Lipídico & Risco Cardiovascular
                </span>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Colesterol Total (mg/dL)</label>
                    <input
                      type="number"
                      placeholder="Ex: 175 (Ref: < 190)"
                      value={totalCholesterol}
                      onChange={(e) => setTotalCholesterol(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">LDL (mg/dL)</label>
                    <input
                      type="number"
                      placeholder="Ex: 95 (Ref: < 100)"
                      value={ldl}
                      onChange={(e) => setLdl(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">HDL (mg/dL)</label>
                    <input
                      type="number"
                      placeholder="Ex: 48 (Ref: > 40)"
                      value={hdl}
                      onChange={(e) => setHdl(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Triglicerídeos (mg/dL)</label>
                    <input
                      type="number"
                      placeholder="Ex: 120 (Ref: < 150)"
                      value={triglycerides}
                      onChange={(e) => setTriglycerides(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 5. TIREOIDE & SEGURANÇA */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  🦋 Tireoide & Triagem de Segurança
                </span>
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">TSH (µUI/mL)</label>
                    <input
                      type="text"
                      placeholder="Ex: 1,8 (Ref: 0,4-4,5)"
                      value={tsh}
                      onChange={(e) => setTsh(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">T4 Livre (ng/dL)</label>
                    <input
                      type="text"
                      placeholder="Ex: 1,1 (Ref: 0,8-1,8)"
                      value={t4Free}
                      onChange={(e) => setT4Free(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Calcitonina (pg/mL)</label>
                    <input
                      type="text"
                      placeholder="Ex: < 2 (Ref: < 10)"
                      value={calcitonin}
                      onChange={(e) => setCalcitonin(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* 6. NUTRIÇÃO & MASSA MAGRA */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  🥗 Nutrição, Vitaminas & Massa Magra
                </span>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Albumina (g/dL)</label>
                    <input
                      type="text"
                      placeholder="Ex: 4,2 (Ref: 3,5-5,0)"
                      value={albumin}
                      onChange={(e) => setAlbumin(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Ácido Úrico (mg/dL)</label>
                    <input
                      type="text"
                      placeholder="Ex: 5,1 (Ref: 2,5-7,0)"
                      value={uricAcid}
                      onChange={(e) => setUricAcid(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Vitamina D (ng/mL)</label>
                    <input
                      type="number"
                      placeholder="Ex: 36 (Ref: > 30)"
                      value={vitaminD}
                      onChange={(e) => setVitaminD(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Vitamina B12 (pg/mL)</label>
                    <input
                      type="number"
                      placeholder="Ex: 450 (Ref: 200-900)"
                      value={vitaminB12}
                      onChange={(e) => setVitaminB12(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Ferritina (ng/mL)</label>
                    <input
                      type="number"
                      placeholder="Ex: 110 (Ref: 30-300)"
                      value={ferritin}
                      onChange={(e) => setFerritin(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO NOVO: OUTROS EXAMES DO LAUDO (Hemograma, PCR, Hormônios adicionais, etc.) */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  🧪 Outros Exames & Resultados (Hemograma, PCR, Cortisol, etc.)
                </span>
                <p className="mt-1 text-[10px] text-slate-400">
                  Exames presentes no laudo que não constam nas caixas padronizadas acima (preenchido automaticamente pela IA ou manualmente):
                </p>
                <textarea
                  rows={4}
                  placeholder="Exemplo:
• Hemograma: Hemácias 4.8 mi/mm³, Hemoglobina 14.2 g/dL, Leucócitos 6.400 /mm³, Plaquetas 245.000 /mm³
• PCR Ultra-sensível: 0.5 mg/L
• Cortisol basal: 12.0 mcg/dL
• EAS / Urina: Normal"
                  value={otherResults}
                  onChange={(e) => setOtherResults(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              {/* 7. ULTRASSOM & LAUDOS */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-850">
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  📋 Ultrassonografia & Observações do Laudo
                </span>
                <div className="mt-2.5 space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Ultrassom de Abdômen Total (Laudo / Fígado / Vesícula):</label>
                    <input
                      type="text"
                      placeholder="Ex: Fígado sem esteatose / Vesícula biliar alitiásica (sem cálculos)"
                      value={ultrasoundNotes}
                      onChange={(e) => setUltrasoundNotes(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block">Laboratório / Observações adicionais do médico:</label>
                    <input
                      type="text"
                      placeholder="Ex: Exames realizados em jejum de 12 horas no laboratório..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-teal-200/60 pt-3 dark:border-teal-800/60">
              <Button variant="secondary" onClick={() => setShowAddForm(false)} className="!py-1.5 !text-xs">
                Cancelar
              </Button>
              <Button onClick={handleAddExam} className="!py-1.5 !text-xs font-bold bg-teal-600 hover:bg-teal-700">
                Salvar Resultados
              </Button>
            </div>
          </div>
        )}

        {/* Lista de Exames Anteriores */}
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Histórico de Exames ({exams.length})
          </h4>

          {exams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-slate-800">
              Nenhum exame cadastrado ainda. Clique em <strong>Novo Exame</strong> para adicionar resultados manualmente ou fazer upload do laudo com Inteligência Artificial.
            </div>
          ) : (
            exams.map((exam) => {
              const g = exam.fastingGlucoseMgDl;
              const i = exam.insulinUuMl;
              const h = g && i ? Math.round(((g * i) / 405) * 100) / 100 : null;

              return (
                <div
                  key={exam.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-850 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-teal-600" /> Coleta: {new Date(exam.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="text-slate-400 hover:text-rose-600 transition"
                      title="Excluir este exame"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {exam.fastingGlucoseMgDl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Glicemia Jejum</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.fastingGlucoseMgDl} mg/dL</strong>
                      </div>
                    )}
                    {exam.hba1cPercent != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">HbA1c</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.hba1cPercent}%</strong>
                      </div>
                    )}
                    {exam.insulinUuMl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Insulina Basal</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.insulinUuMl} µUI/mL</strong>
                      </div>
                    )}
                    {h !== null && (
                      <div className="rounded-xl bg-teal-50/50 p-2 dark:bg-teal-950/20">
                        <span className="text-[10px] text-teal-600 block font-semibold">HOMA-IR</span>
                        <strong className="text-teal-900 dark:text-teal-200">{h}</strong>
                      </div>
                    )}
                    {exam.creatinineMgDl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Creatinina</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.creatinineMgDl} mg/dL</strong>
                      </div>
                    )}
                    {exam.ureaMgDl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Ureia</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.ureaMgDl} mg/dL</strong>
                      </div>
                    )}
                    {exam.totalCholesterolMgDl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Colest. Total</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.totalCholesterolMgDl} mg/dL</strong>
                      </div>
                    )}
                    {exam.ldlCholesterolMgDl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">LDL</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.ldlCholesterolMgDl} mg/dL</strong>
                      </div>
                    )}
                    {exam.hdlCholesterolMgDl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">HDL</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.hdlCholesterolMgDl} mg/dL</strong>
                      </div>
                    )}
                    {exam.triglyceridesMgDl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Triglicerídeos</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.triglyceridesMgDl} mg/dL</strong>
                      </div>
                    )}
                    {exam.tgpUl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">TGP (Fígado)</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.tgpUl} U/L</strong>
                      </div>
                    )}
                    {exam.tgoUl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">TGO</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.tgoUl} U/L</strong>
                      </div>
                    )}
                    {exam.gamaGtUl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Gama-GT</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.gamaGtUl} U/L</strong>
                      </div>
                    )}
                    {exam.amylaseUl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Amilase</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.amylaseUl} U/L</strong>
                      </div>
                    )}
                    {exam.lipaseUl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Lipase</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.lipaseUl} U/L</strong>
                      </div>
                    )}
                    {exam.tshUiuMl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">TSH</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.tshUiuMl} µUI/mL</strong>
                      </div>
                    )}
                    {exam.t4FreeNgDl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">T4 Livre</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.t4FreeNgDl} ng/dL</strong>
                      </div>
                    )}
                    {exam.calcitoninPgMl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Calcitonina</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.calcitoninPgMl} pg/mL</strong>
                      </div>
                    )}
                    {exam.albuminGDl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Albumina</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.albuminGDl} g/dL</strong>
                      </div>
                    )}
                    {exam.uricAcidMgDl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Ácido Úrico</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.uricAcidMgDl} mg/dL</strong>
                      </div>
                    )}
                    {exam.vitaminDNgMl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Vitamina D</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.vitaminDNgMl} ng/mL</strong>
                      </div>
                    )}
                    {exam.vitaminB12PgMl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Vitamina B12</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.vitaminB12PgMl} pg/mL</strong>
                      </div>
                    )}
                    {exam.ferritinNgMl != null && (
                      <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Ferritina</span>
                        <strong className="text-slate-800 dark:text-slate-100">{exam.ferritinNgMl} ng/mL</strong>
                      </div>
                    )}
                  </div>

                  {exam.otherResults && (
                    <div className="mt-2.5 rounded-xl border border-teal-200 bg-teal-50/60 p-2.5 text-xs text-slate-800 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-slate-200">
                      <span className="font-bold text-teal-800 dark:text-teal-300 block mb-0.5">Outros Exames do Laudo:</span>
                      <p className="whitespace-pre-line font-mono text-[11px] leading-relaxed">{exam.otherResults}</p>
                    </div>
                  )}

                  {exam.ultrasoundNotes && (
                    <div className="mt-2.5 rounded-xl border border-teal-100 bg-teal-50/50 p-2.5 text-xs text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-200">
                      <strong>Ultrassom de Abdômen:</strong> {exam.ultrasoundNotes}
                    </div>
                  )}

                  {exam.notes && (
                    <div className="mt-1 text-[11px] text-slate-500 italic">
                      Obs: {exam.notes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
