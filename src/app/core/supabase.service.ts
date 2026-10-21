import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly configurado = !!environment.supabaseUrl && !!environment.supabaseAnonKey;

  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl || 'http://localhost',
    environment.supabaseAnonKey || 'nao-configurado'
  );
}

/** Converte erros do Supabase/Postgres em mensagens em português simples. */
export function mensagemErro(erro: unknown): string {
  const e = erro as { code?: string; message?: string } | null;
  if (!e) return 'Erro desconhecido.';
  if (e.code === '23P01') return 'Esta acomodação já está reservada nesse período. Escolha outras datas ou outra acomodação.';
  if (e.code === '23514') return 'Algum valor está inválido. Confira as datas (a saída deve ser depois da entrada) e os valores.';
  if (e.code === '23503') return 'Este registro está ligado a outros dados e não pode ser removido.';
  if (e.message?.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (e.message?.includes('Failed to fetch')) return 'Sem conexão com o servidor. Verifique a internet.';
  return e.message ?? 'Erro desconhecido.';
}
