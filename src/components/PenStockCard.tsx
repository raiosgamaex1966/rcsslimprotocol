import { useState } from 'react';
import { AlertCircle, PackageCheck, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Button, Card, SectionTitle } from './ui';
import type { PenStock } from '../lib/types';
import { cn } from '../utils/cn';

interface Props {
  brand: string;
  stock?: PenStock | null;
  onUpdateStock: (stock: PenStock | null) => void;
  onStartNewCycle?: () => void;
}

export default function PenStockCard({ brand, stock, onUpdateStock, onStartNewCycle }: Props) {
  const [showConfig, setShowConfig] = useState(false);
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().slice(0, 10));
  const [totalDoses, setTotalDoses] = useState(4);
  const [expiryDays, setExpiryDays] = useState(
    brand.toLowerCase().includes('saxenda') || brand.toLowerCase().includes('mounjaro')
      ? 30
      : 56,
  );

  function handleSaveNewPen() {
    onUpdateStock({
      brand,
      openedAt,
      totalDoses,
      dosesUsed: 0,
      expiryDays,
      cycleNumber: (stock?.cycleNumber || 0) + 1,
    });
    setShowConfig(false);
  }

  function handleTriggerNewPen() {
    setShowConfig((v) => !v);
  }

  // Cálculos se já tem caneta cadastrada
  let daysOpened = 0;
  let daysRemaining = 0;
  let expiredByDate = false;
  let dosesLeft = 0;

  if (stock) {
    const opened = new Date(stock.openedAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - opened.getTime());
    daysOpened = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    daysRemaining = Math.max(0, stock.expiryDays - daysOpened);
    expiredByDate = daysRemaining <= 0;
    dosesLeft = Math.max(0, stock.totalDoses - stock.dosesUsed);
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <SectionTitle
          icon={<PackageCheck className="h-4 w-4 text-brand-600" />}
          title={`Caneta em Uso ${stock?.cycleNumber ? `· Ciclo #${stock.cycleNumber}` : ''}`}
          subtitle="Controle de validade e doses restantes"
        />
        <div className="flex items-center gap-2">
          {stock && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Deseja excluir o registro da caneta atual em uso? O histórico de doses já aplicadas continuará preservado.')) {
                  onUpdateStock(null);
                }
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 transition-colors"
              title="Excluir / Limpar registro desta caneta"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleTriggerNewPen}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {stock ? 'Nova Caneta' : 'Cadastrar Caneta'}
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 animate-fade-in dark:border-brand-900/40 dark:bg-brand-950/20">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {stock ? 'Iniciar acompanhamento de uma nova caneta:' : 'Cadastrar caneta em uso:'}
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Data de Abertura</label>
              <input
                type="date"
                value={openedAt}
                onChange={(e) => setOpenedAt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Total de Doses</label>
              <input
                type="number"
                min={1}
                max={30}
                value={totalDoses}
                onChange={(e) => setTotalDoses(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500">Validade após aberta</label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <option value={56}>56 dias (Ozempic / Wegovy)</option>
                <option value={30}>30 dias (Saxenda / Mounjaro)</option>
                <option value={42}>42 dias</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-brand-200/60 pt-3 dark:border-brand-900/40">
            {onStartNewCycle && (
              <button
                type="button"
                onClick={() => {
                  setShowConfig(false);
                  onStartNewCycle();
                }}
                className="text-[11px] font-bold text-brand-700 hover:underline dark:text-brand-300"
              >
                📄 Trocar medicação ou cadastrar via receita com IA →
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="secondary" onClick={() => setShowConfig(false)} className="!py-1.5 !text-xs">
                Cancelar
              </Button>
              <Button onClick={handleSaveNewPen} className="!py-1.5 !text-xs">
                Salvar Caneta
              </Button>
            </div>
          </div>
        </div>
      )}

      {stock ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Doses Restantes */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Doses Restantes
              </span>
              <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                {dosesLeft}{' '}
                <span className="text-xs font-medium text-slate-400">/ {stock.totalDoses}</span>
              </p>
            </div>

            {/* Validade Aberta */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Dias de Validade
              </span>
              <p
                className={cn(
                  'mt-1 text-2xl font-extrabold',
                  expiredByDate
                    ? 'text-rose-600 dark:text-rose-400'
                    : daysRemaining <= 10
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {expiredByDate ? 'Expirada' : `${daysRemaining} d`}
              </p>
            </div>

            {/* Aberta há */}
            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Aberta em
              </span>
              <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                {new Date(stock.openedAt).toLocaleDateString('pt-BR')} ({daysOpened} dias atrás)
              </p>
            </div>
          </div>

          {/* Barra de Progresso de Doses Usadas */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Uso da caneta</span>
              <span>
                {stock.dosesUsed} de {stock.totalDoses} doses aplicadas (
                {Math.round((stock.dosesUsed / stock.totalDoses) * 100)}%)
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  dosesLeft <= 0 ? 'bg-amber-500' : 'bg-brand-500',
                )}
                style={{ width: `${Math.min(100, (stock.dosesUsed / stock.totalDoses) * 100)}%` }}
              />
            </div>
          </div>

          {/* Avisos */}
          {expiredByDate && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <strong>Atenção:</strong> Esta caneta ultrapassou o prazo de validade ({stock.expiryDays} dias após aberta). Descarte-a e inicie uma nova com segurança.
              </div>
            </div>
          )}

          {dosesLeft <= 0 && !expiredByDate && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <strong>Caneta finalizada!</strong> Todas as {stock.totalDoses} doses foram aplicadas.
                </div>
              </div>
              <button
                type="button"
                onClick={handleTriggerNewPen}
                className="ml-2 shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
              >
                + Nova Caneta
              </button>
            </div>
          )}
        </div>
      ) : !showConfig ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-center dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nenhuma caneta cadastrada em acompanhamento de estoque.
          </p>
          <button
            onClick={() => setShowConfig(true)}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Cadastrar minha primeira caneta
          </button>
        </div>
      ) : null}
    </Card>
  );
}
