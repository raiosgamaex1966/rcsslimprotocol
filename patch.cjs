const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminPanel.tsx', 'utf8');

const replacement = `
        <Card className="p-6">
          <SectionTitle icon={<Bot className="h-4 w-4 text-brand-600" />} title="Configuração da IA" subtitle="Segurança Ativada" />
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-900/20">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" /> Inteligência Artificial no Backend
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
              A arquitetura SaaS foi ativada. As chaves da OpenAI/Groq não são mais inseridas no navegador do usuário. 
              Elas agora são gerenciadas com máxima segurança <b>diretamente nas variáveis de ambiente da Vercel</b>.
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-xs font-mono text-emerald-700 dark:text-emerald-400">
              <li>LLM_PROVIDER (ex: groq)</li>
              <li>LLM_MODEL (ex: llama-3.1-8b-instant)</li>
              <li>LLM_API_KEY (gsk_...)</li>
            </ul>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">
              Acesse o painel da Vercel &gt; Settings &gt; Environment Variables para editar.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-2.5">
            <Button variant="secondary" onClick={handleTest} disabled={testBusy}>
              {testBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
              Testar conexão com a Vercel
            </Button>
          </div>
          {testResult && (
            <div className={'mt-3 rounded-xl border px-4 py-2.5 text-xs font-semibold ' + (testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200')}>
              {testResult.msg}
            </div>
          )}
        </Card>

        <div className="space-y-5">`;

code = code.replace(/<Card className=\"p-6\">\s*<SectionTitle icon=\{<Bot className=\"h-4 w-4 text-brand-600\" \/>\} title=\"Conectar provedor\"[\s\S]*?<div className=\"space-y-5\">/, replacement);

fs.writeFileSync('src/pages/admin/AdminPanel.tsx', code);
console.log('AdminPanel patched');
