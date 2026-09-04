import { useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Clock, PackageCheck, Plus, RefreshCw } from 'lucide-react';
import { Button, Card, SectionTitle } from './ui';
import type { PenStock } from '../lib/types';
import { cn } from '../utils/cn';

interface Props {
  brand: string;
  stock?: PenStock | null;
  onUpdateStock: (stock: PenStock | null) => void;
}

export default function PenStockCard({ brand, stock, onUpdateStock }: Props) {
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
    });
    setShowConfig(false);
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
          title="Caneta em Uso"
          subtitle="Controle de validade e doses restantes"
        />
        <button
          onClick={() => setShowConfig((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {stock ? 'Nova Caneta' : 'Cadastrar Caneta'}
        </button>
      </div>

      {showConfig && (
        <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 animate-fade-in dark:border-brand-900/40 dark:bg-brand-950/20">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Iniciar acompanhamento de uma nova caneta:
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

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowConfig(false)} className="!py-1.5 !text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSaveNewPen} className="!py-1.5 !text-xs">
              Salvar Caneta
            </Button>
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

          {/* Avisos */}
          {dosesLeft <= 1 && dosesLeft > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              Resta apenas 1 dose nesta caneta! Lembre-se de providenciar a próxima caixa.
            </div>
          )}

          {dosesLeft === 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              Esta caneta chegou ao fim de todas as doses. Cadastre a nova caneta acima.
            </div>
          )}

          {expiredByDate && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              Atenção: Caneta ultrapassou os {stock.expiryDays} dias recomendados de abertura pela bula.
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">
          Nenhuma caneta registrada no momento. Clique em &quot;Cadastrar Caneta&quot; para acompanhar as doses restantes e o prazo de validade após a abertura.
        </p>
      )}
    </Card>
  );
}
