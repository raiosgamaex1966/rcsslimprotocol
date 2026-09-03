# 💉 MinhaCaneta — Acompanhamento de Tratamento GLP-1/GIP

Aplicativo (protótipo funcional) para pacientes acompanharem o tratamento com canetas emagrecedoras e para diabetes
(semaglutida, liraglutida e tirzepatida — Ozempic, Wegovy, Saxenda, Mounjaro, similares e genéricos).

## Fluxo implementado

1. **Boas-vindas / Login** — e-mail + senha, com recuperação de senha
2. **Cadastro em 2 etapas** — dados pessoais (nome, sexo, nascimento, e-mail, telefone, WhatsApp) →
   peso atual, altura, senha + widget "Não sou um robô"
3. **Verificação de e-mail** — link enviado pelo Supabase Auth (simulável no modo demo)
4. **"Bem-vindo(a), [Nome]!"** + dashboard:
   - Configuração do tratamento: caneta + miligrama por dose + frequência (semanal/diária) + dia/horário
   - Próxima dose com contagem regressiva, anel de progresso do ciclo e dates futuras
   - Registrar dose aplicada (1 toque) + histórico com desfazer
   - Peso atual, IMC calculado, gráfico de evolução de peso, delta desde o início
   - Adesão (%) e total de doses aplicadas
   - Catálogo completo de medicamentos + efeitos colaterais comuns + sinais de alerta
   - Perfil com dados do cadastro e logout

## Modos de execução

| Modo | Quando | Onde ficam os dados |
|---|---|---|
| **Demo (padrão neste build)** | Sem variáveis de ambiente | `localStorage` do navegador (simula verificação de e-mail) |
| **Supabase** | Com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` | Auth do Supabase + tabela `patient_data` (RLS por usuário) |

## Conectando ao Supabase (produção)

1. Crie um projeto em https://supabase.com
2. Execute `supabase/schema.sql` no **SQL Editor**
3. Em **Authentication → Providers → Email**: ative **Confirm email**
4. Em **Authentication → URL Configuration**: Site URL = URL do app; Redirect URLs = URL do app
5. Crie um arquivo `.env` na raiz do projeto:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

6. Rode `npm run build` (as variáveis são lidas no build) e publique o `dist/`.

## 🥩 Controle nutricional (preservação de massa magra)

- Proteína, água e energia são recalculadas pelo **peso semanal mais recente** e nível de atividade; a dose entra como contexto de apetite/tolerância
- Cardápio diário e semanal (6 refeições), com registro do que foi consumido e progresso de proteína
- O **Super Admin** conecta uma LLM (OpenAI, Anthropic, Gemini ou endpoint compatível) que gera cardápios
  personalizados com base no medicamento, dose da semana, peso, altura e IMC
- Sem LLM configurada, o app usa um **cardápio padrão inteligente** (banco de alimentos brasileiro)

## Controle de exercícios

- Avaliação inicial: sedentarismo, atividade atual, experiência, disponibilidade, local, equipamentos, objetivos e limitações
- Limitações para joelho, coluna, ombro, quadril, punho, equilíbrio e respiração adaptam a seleção de exercícios
- Sintomas de alerta bloqueiam a geração automática e orientam avaliação profissional
- Plano semanal de força, caminhada, mobilidade e equilíbrio, com registro das sessões concluídas
- A mesma LLM pode gerar o plano em JSON com base na avaliação funcional, peso mais recente e contexto do tratamento
- Sem LLM, há um plano adaptativo conservador local
- Para limitações de joelho, equilíbrio ou mobilidade, o plano prioriza exercícios na cadeira e Tai Chi sentado sem impacto
- O Super Admin pode enviar MP4/WebM/MOV ao Supabase Storage ou cadastrar links do YouTube/Vimeo
- A videoteca registra especialista, credencial, categoria, nível, duração, limitações atendidas e exercícios relacionados
- O paciente recebe vídeos recomendados pela avaliação e pode abrir a demonstração diretamente em cada exercício compatível

### Conta Super Admin (modo demo)

```
E-mail: admin@minhacaneta.app  ·  Senha: admin123
```

Acesse o painel em `/#/admin`. Em produção, insira o usuário na tabela `super_admins` do Supabase.

## 🌗 Temas + 📱 PWA

- **Esquema de cores**: Claro · Sistema · Escuro — seletor no header do Paciente e no Perfil
- **PWA**: instalável no celular/desktop (manifest + service worker com cache offline), ícone próprio e prompt de instalação automático
- **Medicamentos**: 21 marcas (incluindo Ozivy e Poviztra) com catálogo completo e titulações de bula

## 🩺 Acesso multiprofissional (médico, nutricionista, personal)

- Cada paciente tem um **código de 6 caracteres** (Perfil → "Profissionais conectados") para compartilhar com sua equipe de saúde
- Profissionais se cadastram em `/#/profissional/cadastro` escolhendo sua área (Médico/Endocrinologista, Nutricionista ou
  Educador Físico/Personal) e registro profissional (CRM, CRN, CREF...)
- No **Portal do Profissional** (`/#/profissional`), eles solicitam acesso pelo código do paciente — o paciente precisa
  **aprovar** a solicitação antes de qualquer dado ser exibido
- **Cada profissional só vê o seu escopo:**
  - **Médico**: tratamento/dose atual, adesão, evolução de peso e o **diário de sintomas** que o paciente registra (náusea,
    dor de cabeça etc.) — pode deixar uma observação clínica visível ao paciente
  - **Nutricionista**: metas nutricionais calculadas, adesão à dieta, e pode **ajustar manualmente** proteína/kcal (substitui
    o cálculo automático) + deixar uma observação
  - **Personal/Educador Físico**: avaliação funcional, adesão ao treino, pode **criar um plano de exercícios personalizado**
    (substitui o gerado automaticamente) e **enviar vídeos exclusivos** para aquele paciente ou atribuir vídeos da biblioteca geral
- O paciente pode **revogar o acesso** a qualquer momento em "Profissionais conectados"

### Onde o paciente assiste aos vídeos de exercícios

Aba **Exercícios** → complete a avaliação de movimento → role até **"Vídeos para acompanhar"**. Lá aparecem tanto os vídeos
públicos publicados pelo Super Admin quanto os enviados especificamente pelo personal do paciente (destacados com a etiqueta
"Enviado pelo seu personal").

## Aviso de saúde

Este app é **apenas informativo**. Não substitui consulta, diagnóstico ou orientação médica.
Não inicie, altere ou interrompa tratamentos sem falar com um profissional.
Os cardápios e metas nutricionais são sugestões geradas automaticamente — consulte um nutricionista.
