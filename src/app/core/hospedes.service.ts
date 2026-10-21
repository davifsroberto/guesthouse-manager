import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Hospede } from './models';

export type NovoHospede = Omit<Hospede, 'id' | 'created_at'>;

@Injectable({ providedIn: 'root' })
export class HospedesService {
  private readonly sb = inject(SupabaseService).client;

  async listar(busca = ''): Promise<Hospede[]> {
    let q = this.sb.from('hospedes').select('*').order('nome').limit(200);
    const termo = busca.trim().replace(/[%,()]/g, '');
    if (termo) {
      q = q.or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%,documento.ilike.%${termo}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data as Hospede[];
  }

  async obter(id: number): Promise<Hospede> {
    const { data, error } = await this.sb.from('hospedes').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Hospede;
  }

  async criar(h: NovoHospede): Promise<Hospede> {
    const { data, error } = await this.sb.from('hospedes').insert(h).select().single();
    if (error) throw error;
    return data as Hospede;
  }

  async atualizar(id: number, h: NovoHospede): Promise<void> {
    const { error } = await this.sb.from('hospedes').update(h).eq('id', id);
    if (error) throw error;
  }
}
