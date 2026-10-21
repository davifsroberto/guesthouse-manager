import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { SupabaseService } from './core/supabase.service';

const TAMANHOS = [100, 115, 130, 150];
const CHAVE_FONTE = 'gm-tamanho-fonte';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly configurado = inject(SupabaseService).configurado;
  private readonly router = inject(Router);

  protected readonly fonte = signal(this.lerFonte());
  protected readonly menuAberto = signal(false);

  constructor() {
    this.aplicarFonte(this.fonte());
  }

  /** Botão "A+" (acessibilidade): aumenta a letra até 150%. */
  protected alternarFonte(): void {
    const i = TAMANHOS.indexOf(this.fonte());
    const proximo = TAMANHOS[(i + 1) % TAMANHOS.length];
    this.fonte.set(proximo);
    this.aplicarFonte(proximo);
    try {
      localStorage.setItem(CHAVE_FONTE, String(proximo));
    } catch {
      /* navegador sem armazenamento: ignora */
    }
  }

  protected async sair(): Promise<void> {
    await this.auth.sair();
    this.router.navigateByUrl('/login');
  }

  private aplicarFonte(pct: number): void {
    document.documentElement.style.fontSize = `${pct}%`;
  }

  private lerFonte(): number {
    try {
      const v = Number(localStorage.getItem(CHAVE_FONTE));
      return TAMANHOS.includes(v) ? v : 100;
    } catch {
      return 100;
    }
  }
}
