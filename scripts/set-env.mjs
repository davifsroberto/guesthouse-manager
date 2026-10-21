// Gera src/environments/environment.ts a partir do arquivo .env (local)
// ou das variáveis de ambiente (Vercel/Netlify). Assim as chaves não vão para o GitHub.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const env = { ...process.env };

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const url = env.SUPABASE_URL ?? '';
const key = env.SUPABASE_ANON_KEY ?? '';
const demoEmail = env.DEMO_EMAIL ?? '';
const demoPassword = env.DEMO_PASSWORD ?? '';

if (!url || !key) {
  console.warn(
    '\n⚠️  SUPABASE_URL e/ou SUPABASE_ANON_KEY não definidas.\n' +
      '   Copie .env.example para .env e preencha com os dados do seu projeto Supabase.\n'
  );
}

mkdirSync('src/environments', { recursive: true });
writeFileSync(
  'src/environments/environment.ts',
  `// Arquivo gerado automaticamente por scripts/set-env.mjs - não editar nem versionar.
export const environment = {
  supabaseUrl: ${JSON.stringify(url)},
  supabaseAnonKey: ${JSON.stringify(key)},
  // Login de demonstração (opcional). ATENÇÃO: fica visível no código do site publicado.
  demoEmail: ${JSON.stringify(demoEmail)},
  demoPassword: ${JSON.stringify(demoPassword)},
};
`
);
console.log('✔ src/environments/environment.ts gerado');
