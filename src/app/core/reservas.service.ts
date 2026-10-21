import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Reserva, StatusReserva } from './models';

const SELECT_COMPLETO = '*, hospede:hospedes(*), acomodacao:acomodacoes(*), pagamentos(*)';

export interface DadosReserva {
  hospede_id: number;
  acomodacao_id: number;
  data_entrada: string;
  data_saida: string;
  num_hospedes: number;
  valor_total: number;
  observacoes: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private readonly sb = inject(SupabaseService).client;

  /** Reservas ativas que ocupam algum dia entre inicio (inclusive) e fim (exclusive). */
  async listarPeriodo(inicio: string, fim: string): Promise<Reserva[]> {
    const { data, error } = await this.sb
      .from('reservas')
      .select(SELECT_COMPLETO)
      .neq('status', 'cancelada')
      .lt('data_entrada', fim)
      .gt('data_saida', inicio);
    if (error) throw error;
    return data as Reserva[];
  }

  async listar(status?: StatusReserva | ''): Promise<Reserva[]> {
    let q = this.sb.from('reservas').select(SELECT_COMPLETO).order('data_entrada', { ascending: false }).limit(300);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return data as Reserva[];
  }

  async doHospede(hospedeId: number): Promise<Reserva[]> {
    const { data, error } = await this.sb
      .from('reservas')
      .select(SELECT_COMPLETO)
      .eq('hospede_id', hospedeId)
      .order('data_entrada', { ascending: false });
    if (error) throw error;
    return data as Reserva[];
  }

  async obter(id: number): Promise<Reserva> {
    const { data, error } = await this.sb.from('reservas').select(SELECT_COMPLETO).eq('id', id).single();
    if (error) throw error;
    return data as Reserva;
  }

  /** Verifica antes de salvar se a acomodação está livre (o banco também garante isso). */
  async temConflito(acomodacaoId: number, entrada: string, saida: string, ignorarId?: number): Promise<boolean> {
    let q = this.sb
      .from('reservas')
      .select('id')
      .eq('acomodacao_id', acomodacaoId)
      .neq('status', 'cancelada')
      .lt('data_entrada', saida)
      .gt('data_saida', entrada);
    if (ignorarId) q = q.neq('id', ignorarId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).length > 0;
  }

  async criar(dados: DadosReserva): Promise<number> {
    const { data, error } = await this.sb.from('reservas').insert(dados).select('id').single();
    if (error) throw error;
    return (data as { id: number }).id;
  }

  async atualizar(id: number, dados: DadosReserva): Promise<void> {
    const { error } = await this.sb.from('reservas').update(dados).eq('id', id);
    if (error) throw error;
  }

  async fazerCheckin(id: number): Promise<void> {
    await this.mudarStatus(id, { status: 'hospedado', checkin_em: new Date().toISOString() });
  }

  async fazerCheckout(id: number): Promise<void> {
    await this.mudarStatus(id, { status: 'finalizada', checkout_em: new Date().toISOString() });
  }

  async cancelar(id: number): Promise<void> {
    await this.mudarStatus(id, { status: 'cancelada' });
  }

  private async mudarStatus(id: number, campos: Partial<Reserva>): Promise<void> {
    const { error } = await this.sb.from('reservas').update(campos).eq('id', id);
    if (error) throw error;
  }
}
