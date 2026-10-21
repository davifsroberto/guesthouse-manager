# Guesthouse Manager — Pousada Pouso no Curral

Sistema web de gestão para pousada rural: **reservas, calendário de ocupação, check-in/check-out e controle de pagamentos**.

Desenvolvido como parte do **Projeto de Extensão VI — Ciência da Computação** (Centro Universitário União das Américas Descomplica).

## Funcionalidades

| Módulo | O que faz |
|---|---|
| 📅 **Calendário de ocupação** | Grade acomodações × dias do mês, com cor **e** ícone (livre ✓, ocupado ●, entrada hoje ⬇, saída hoje ⬆). Mostra o resumo do dia: chegadas, saídas, hospedados e acomodações livres. Clicar num dia livre abre uma nova reserva já preenchida. |
| 📋 **Reservas** | Criar, editar e cancelar reservas. Verifica a disponibilidade em tempo real, calcula o valor pelas diárias e tem campo de observações. **Dupla reserva é impossível**: há uma restrição no próprio banco de dados. |
| ⬇️⬆️ **Check-in (Entrada) / Check-out (Saída)** | Um clique registra a entrada ou a saída, com data e hora. Avisa se ainda há saldo a receber. |
| 💰 **Pagamentos** | Registro de sinal, parcelas e saldo (PIX, dinheiro, cartão, transferência), com total recebido e valor que falta em cada reserva. |
| 👤 **Hóspedes** | Cadastro com busca por nome, telefone ou documento, e histórico de estadias (identifica hóspedes recorrentes). |
| 📊 **Financeiro** | Recebido no mês, recebido por forma de pagamento e lista de reservas com valor a receber. |
| ♿ **Acessibilidade** | Fonte base de 18px, botão **A+** (até 150%), alto contraste, datas digitáveis (dd/mm/aaaa), termos em português e confirmação antes de ações críticas. |

## Arquitetura

```
┌──────────────────────┐        HTTPS         ┌──────────────────────────┐
│  Angular 21 (SPA)    │  ─────────────────►  │  Supabase                │
│  hospedado na Vercel │   supabase-js        │  • PostgreSQL            │
│                      │                      │  • Auth (login)          │
└──────────────────────┘                      │  • RLS (segurança)       │
                                              └──────────────────────────┘
```

- **Frontend:** Angular 21 (standalone components, signals), sem bibliotecas de UI, com CSS próprio focado em acessibilidade.
- **Backend:** Supabase (BaaS): banco PostgreSQL + autenticação, sem API própria para manter.
- **Segurança:** Row Level Security em todas as tabelas (só usuários logados acessam). As chaves ficam em `.env` (fora do Git).
- **Custo:** R$ 0 (planos gratuitos de Vercel e Supabase).

### Estrutura do código

```
supabase/schema.sql          → tabelas, regras, segurança e dados de exemplo
scripts/set-env.mjs          → gera o environment.ts a partir do .env
src/app/core/                → modelos, serviços (Supabase, auth, reservas, hóspedes, pagamentos)
src/app/shared/              → campo de data digitável
src/app/pages/               → telas (login, calendário, reservas, hóspedes, financeiro)
```

### Modelo de dados

```
hospedes 1───N reservas N───1 acomodacoes
                  │
                  1
                  │
                  N
              pagamentos
```

---

## Como rodar (passo a passo)

### 1. Pré-requisitos

- **Node.js 22 LTS** (ou 20.19+): <https://nodejs.org>. Confira com `node -v`.
- Uma conta gratuita no **Supabase**: <https://supabase.com>
- (Para publicar) contas gratuitas no **GitHub** e na **Vercel**.

### 2. Criar o banco no Supabase

1. Entre em <https://supabase.com/dashboard> → **New project**. Dê um nome, crie uma senha de banco e escolha a região **South America (São Paulo)**.
2. Quando o projeto estiver pronto, vá em **SQL Editor** → **New query**.
3. Copie todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql), cole e clique em **Run**.
   - Isso cria as tabelas, as regras de segurança, os 8 chalés e as 4 suítes, além de **dados de exemplo fictícios**.
   - Para começar com o banco vazio, apague o bloco "Dados de EXEMPLO" no final do arquivo antes de rodar.
4. Crie o usuário que vai entrar no sistema. Escolha **uma** das opções:
   - **Pelo SQL (mais rápido):** abra uma nova query, cole o conteúdo de [`supabase/usuario-demo.sql`](supabase/usuario-demo.sql), **troque a senha no editor** e clique em **Run**. O login fica `demo@pousocurral.com` com a senha que você escolheu, já confirmado. Se esquecer a senha, rode de novo com outra.
   - **Pelo painel:** **Authentication** → **Users** → **Add user** → **Create new user**. Informe o e-mail e a senha e marque **Auto Confirm User**.

### 3. Configurar as chaves

1. No Supabase, vá em **Project Settings** → **API** (ou **API Keys**).
2. Copie a **Project URL** e a chave pública: **anon public** ou **publishable**.
   > ⚠️ **Nunca** use a chave `service_role` / `secret` no frontend.
3. Na pasta do projeto, copie o arquivo de exemplo e preencha:

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...   # ou sb_publishable_...
```

#### Login de demonstração (opcional)

Para ter um botão **"Entrar como demonstração"** na tela de login:

1. Crie o usuário com [`supabase/usuario-demo.sql`](supabase/usuario-demo.sql), trocando a senha no SQL Editor.
2. Coloque o mesmo e-mail e a mesma senha no `.env` (e nas variáveis da Vercel):

```env
DEMO_EMAIL=demo@pousocurral.com
DEMO_PASSWORD=a-senha-que-voce-escolheu
```

> ⚠️ Esses valores ficam **visíveis no código do site publicado**: qualquer pessoa com o link consegue entrar. Use só enquanto o banco tiver **dados fictícios**. Para uso real, remova `DEMO_EMAIL`/`DEMO_PASSWORD` e troque a senha desse usuário.

### 4. Rodar localmente

```bash
npm install
npm start
```

Abra <http://localhost:4207> e entre com o usuário criado no passo 2.4.

---

## Publicar gratuitamente (GitHub + Vercel)

### 1. Subir para o GitHub

Crie um repositório vazio chamado `guesthouse-manager` em <https://github.com/new> e rode:

```bash
git init
git add .
git commit -m "Sistema de gestão da Pousada Pouso no Curral"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/guesthouse-manager.git
git push -u origin main
```

> O `.env` **não** vai para o GitHub (está no `.gitignore`).

### 2. Publicar na Vercel

1. Entre em <https://vercel.com> com a conta do GitHub → **Add New…** → **Project** → importe `guesthouse-manager`.
2. Em **Environment Variables**, adicione `SUPABASE_URL` e `SUPABASE_ANON_KEY` (os mesmos valores do `.env`).
3. Clique em **Deploy**. O build e a pasta de saída já estão configurados no `vercel.json`.
4. Pronto: o sistema fica em `https://guesthouse-manager-xxxx.vercel.app`. A cada `git push`, a Vercel publica a nova versão automaticamente.

> Alternativa: **Netlify** também funciona (o arquivo `public/_redirects` já está incluído). Use o build command `npm run build` e o publish directory `dist/guesthouse-manager/browser`.

### ⚠️ Observação sobre o plano gratuito do Supabase

Projetos gratuitos são **pausados após cerca de 7 dias sem uso**. Antes de uma apresentação, entre no painel do Supabase e clique em **Restore project** (leva cerca de 1 minuto).

---

## Decisões técnicas e adaptações em relação ao plano (PEX V)

| Planejado no PEX V | Executado | Motivo |
|---|---|---|
| API própria em Node.js + Express | **Supabase** (BaaS) | Menos infraestrutura para manter, custo zero e autenticação e segurança (RLS) prontas. |
| Hospedagem em Heroku / ElephantSQL | **Vercel + Supabase** | O Heroku encerrou o plano gratuito e o ElephantSQL foi descontinuado. |
| Validação de dupla reserva na aplicação | **Restrição no banco** (`EXCLUDE USING gist`) + verificação na tela | Garantia de integridade mesmo com dois usuários ao mesmo tempo. |
| Date picker | **Campo de data digitável** (dd/mm/aaaa) | Pedido da proprietária no piloto. |

## Melhorias futuras

- Relatórios em PDF e exportação para planilha.
- Notificações de chegadas do dia (WhatsApp/e-mail).
- Perfis de acesso (proprietário × recepção).
- Gráficos de ocupação e sazonalidade.
- Modo offline.

## Privacidade (LGPD)

O sistema guarda dados pessoais de hóspedes (nome, telefone, documento). Por isso:

- o acesso exige login, e o banco bloqueia leitura anônima (RLS);
- devem ser cadastrados só os dados necessários para a hospedagem;
- os dados de exemplo do `schema.sql` são **fictícios**. Não use dados reais de hóspedes em demonstrações, prints ou no relatório.

---

Desenvolvido por **Davi Roberto Santos Freire**: Ciência da Computação, Descomplica.
