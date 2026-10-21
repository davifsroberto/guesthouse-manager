import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Pagamento } from './models';

export type NovoPagamento = Omit<Pagamento, 'id'>;

@Injectable({ providedIn: 'root' })
export class PagamentosService {
  private readonly sb = inject(SupabaseService).client;

  async adicionar(p: NovoPagamento): Promise<void> {
    const { error } = await this.sb.from('pagamentos').insert(p);
    if (error) throw error;
  }

  async remover(id: number): Promise<void> {
    const { error } = await this.sb.from('pagamentos').delete().eq('id', id);
    if (error) throw error;
  }

  /** Pagamentos recebidos num período (para o resumo financeiro). */
  async recebidosNoPeriodo(inicio: string, fim: string): Promise<Pagamento[]> {
    const { data, error } = await this.sb
      .from('pagamentos')
      .select('*')
      .gte('data', inicio)
      .lt('data', fim)
      .order('data', { ascending: false });
    if (error) throw error;
    return data as Pagamento[];
  }
}
