import { useState } from 'react';
import { Calendar, FlaskConical, Plus, Trash2, X } from 'lucide-react';
import { Button } from './ui';
import type { LabExam } from '../lib/types';

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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fastingGlucose, setFastingGlucose] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [insulin, setInsulin] = useState('');
  const [totalCholesterol, setTotalCholesterol] = useState('');
  const [ldl, setLdl] = useState('');
  const [hdl, setHdl] = useState('');
  const [triglycerides, setTriglycerides] = useState('');
  const [tgo, setTgo] = useState('');
  const [tgp, setTgp] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [urea, setUrea] = useState('');
  const [tsh, setTsh] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  function handleAddExam() {
    const newExam: LabExam = {
      id: uid(),
      date,
      fastingGlucoseMgDl: fastingGlucose ? parseFloat(fastingGlucose) : undefined,
      hba1cPercent: hba1c ? parseFloat(hba1c.replace(',', '.')) : undefined,
      insulinUuMl: insulin ? parseFloat(insulin.replace(',', '.')) : undefined,
      totalCholesterolMgDl: totalCholesterol ? parseFloat(totalCholesterol) : undefined,
      ldlCholesterolMgDl: ldl ? parseFloat(ldl) : undefined,
      hdlCholesterolMgDl: hdl ? parseFloat(hdl) : undefined,
      triglyceridesMgDl: triglycerides ? parseFloat(triglycerides) : undefined,
      tgoUl: tgo ? parseFloat(tgo) : undefined,
      tgpUl: tgp ? parseFloat(tgp) : undefined,
      creatinineMgDl: creatinine ? parseFloat(creatinine.replace(',', '.')) : undefined,
      ureaMgDl: urea ? parseFloat(urea) : undefined,
      tshUiuMl: tsh ? parseFloat(tsh.replace(',', '.')) : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
    };

    const next = [...exams, newExam].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    onSaveExams(next);
    setShowAddForm(false);
    // Reset
    setFastingGlucose('');
    setHba1c('');
    setInsulin('');
    setTotalCholesterol('');
    setLdl('');
    setHdl('');
    setTriglycerides('');
    setTgo('');
    setTgp('');
    setCreatinine('');
    setUrea('');
    setTsh('');
    setNotes('');
  }

  function handleDeleteExam(id: string) {
    if (window.confirm('Excluir este exame laboratorial?')) {
      onSaveExams(exams.filter((e) => e.id !== id));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          title="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
          <FlaskConical className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Acompanhamento Clínico</span>
        </div>

        <div className="flex items-center justify-between mt-1">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Exames Laboratoriais
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registre seus exames de sangue para inclusão no relatório e acompanhamento médico.
            </p>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="!py-1.5 !px-3 text-xs">
              <Plus className="h-3.5 w-3.5" /> Novo Exame
            </Button>
          )}
        </div>

        {/* Formulário de Adicionar Exame */}
        {showAddForm && (
          <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/50 dark:bg-teal-950/30 animate-fade-in">
            <h4 className="text-xs font-extrabold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Cadastrar Novo Resultado de Exame
            </h4>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Data da Coleta</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Glicemia (mg/dL)</label>
                <input
                  type="number"
                  placeholder="Ex: 92"
                  value={fastingGlucose}
                  onChange={(e) => setFastingGlucose(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">HbA1c Glicada (%)</label>
                <input
                  type="text"
                  placeholder="Ex: 5,4"
                  value={hba1c}
                  onChange={(e) => setHba1c(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Insulina (µUI/mL)</label>
                <input
                  type="text"
                  placeholder="Ex: 7,2"
                  value={insulin}
                  onChange={(e) => setInsulin(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Colesterol Total (mg/dL)</label>
                <input
                  type="number"
                  placeholder="Ex: 180"
                  value={totalCholesterol}
                  onChange={(e) => setTotalCholesterol(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">LDL (mg/dL)</label>
                <input
                  type="number"
                  placeholder="Ex: 95"
                  value={ldl}
                  onChange={(e) => setLdl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">HDL (mg/dL)</label>
                <input
                  type="number"
                  placeholder="Ex: 48"
                  value={hdl}
                  onChange={(e) => setHdl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Triglicerídeos (mg/dL)</label>
                <input
                  type="number"
                  placeholder="Ex: 120"
                  value={triglycerides}
                  onChange={(e) => setTriglycerides(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">TGO / AST (U/L)</label>
                <input
                  type="number"
                  placeholder="Ex: 22"
                  value={tgo}
                  onChange={(e) => setTgo(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">TGP / ALT (U/L)</label>
                <input
                  type="number"
                  placeholder="Ex: 26"
                  value={tgp}
                  onChange={(e) => setTgp(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Creatinina (mg/dL)</label>
                <input
                  type="text"
                  placeholder="Ex: 0,9"
                  value={creatinine}
                  onChange={(e) => setCreatinine(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">TSH (µUI/mL)</label>
                <input
                  type="text"
                  placeholder="Ex: 1,8"
                  value={tsh}
                  onChange={(e) => setTsh(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-[10px] font-bold uppercase text-slate-500">Notas / Laboratório (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Exames periódicos de controle, laboratório Fleury..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowAddForm(false)} className="!py-1.5 !text-xs">
                Cancelar
              </Button>
              <Button onClick={handleAddExam} className="!py-1.5 !text-xs">
                Salvar Exame
              </Button>
            </div>
          </div>
        )}

        {/* Lista de Exames Cadastrados */}
        <div className="mt-4 space-y-3">
          {exams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
              <FlaskConical className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-xs text-slate-500">Nenhum exame cadastrado ainda.</p>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-xs font-bold text-teal-600 hover:underline"
              >
                + Adicionar primeiro exame
              </button>
            </div>
          ) : (
            exams.map((exam) => (
              <div
                key={exam.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-teal-600" />
                    Coleta em: {new Date(exam.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                    title="Excluir exame"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                  {exam.fastingGlucoseMgDl != null && (
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">Glicemia</span>
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
                      <span className="text-[10px] text-slate-400 block font-semibold">Insulina</span>
                      <strong className="text-slate-800 dark:text-slate-100">{exam.insulinUuMl} µUI/mL</strong>
                    </div>
                  )}
                  {exam.totalCholesterolMgDl != null && (
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">Colesterol Total</span>
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
                  {exam.creatinineMgDl != null && (
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">Creatinina</span>
                      <strong className="text-slate-800 dark:text-slate-100">{exam.creatinineMgDl} mg/dL</strong>
                    </div>
                  )}
                  {exam.tshUiuMl != null && (
                    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">TSH</span>
                      <strong className="text-slate-800 dark:text-slate-100">{exam.tshUiuMl} µUI/mL</strong>
                    </div>
                  )}
                </div>

                {exam.notes && (
                  <p className="mt-2 text-[11px] italic text-slate-500">"{exam.notes}"</p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} className="!py-2 !px-5 text-xs">
            Concluído
          </Button>
        </div>
      </div>
    </div>
  );
}
