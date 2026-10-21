import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Acomodacao } from './models';

@Injectable({ providedIn: 'root' })
export class AcomodacoesService {
  private readonly sb = inject(SupabaseService).client;
  private cache: Acomodacao[] | null = null;

  async listar(): Promise<Acomodacao[]> {
    if (this.cache) return this.cache;
    const { data, error } = await this.sb
      .from('acomodacoes')
      .select('*')
      .eq('ativo', true)
      .order('tipo')
      .order('codigo');
    if (error) throw error;
    this.cache = data as Acomodacao[];
    return this.cache;
  }
}
