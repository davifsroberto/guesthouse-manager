import { Injectable, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sb = inject(SupabaseService).client;

  readonly session = signal<Session | null>(null);
  private readonly pronto: Promise<void>;

  constructor() {
    this.pronto = this.sb.auth.getSession().then(({ data }) => this.session.set(data.session));
    this.sb.auth.onAuthStateChange((_evento, session) => this.session.set(session));
  }

  async estaLogado(): Promise<boolean> {
    await this.pronto;
    return !!this.session();
  }

  async entrar(email: string, senha: string): Promise<void> {
    const { error } = await this.sb.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  }

  async sair(): Promise<void> {
    await this.sb.auth.signOut();
  }
}
