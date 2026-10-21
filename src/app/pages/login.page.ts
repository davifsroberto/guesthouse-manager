import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { mensagemErro } from '../core/supabase.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  template: `
    <div class="login cartao">
      <div class="logo" aria-hidden="true">🏡</div>
      <h1>Pousada Pouso no Curral</h1>
      <p class="texto-suave">Sistema de gestão de reservas</p>

      <form (ngSubmit)="entrar()">
        <div class="campo">
          <label for="email">E-mail</label>
          <input id="email" name="email" type="email" autocomplete="username" [(ngModel)]="email" required />
        </div>
        <div class="campo">
          <label for="senha">Senha</label>
          <input id="senha" name="senha" type="password" autocomplete="current-password" [(ngModel)]="senha" required />
        </div>

        @if (erro()) {
          <div class="aviso aviso-erro">{{ erro() }}</div>
        }

        <button type="submit" class="largo" [disabled]="enviando() || !email || !senha">
          {{ enviando() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>

      @if (temDemo) {
        <div class="demo">
          <p class="texto-suave">Só quer conhecer o sistema?</p>
          <button type="button" class="btn-secundario largo" [disabled]="enviando()" (click)="entrarDemo()">
            🔑 Entrar como demonstração
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .login { max-width: 440px; margin: 3rem auto; text-align: center; }
    .logo { font-size: 3rem; }
    form { text-align: left; margin-top: 1.5rem; }
    .largo { width: 100%; }
    .demo { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected senha = '';
  protected readonly erro = signal('');
  protected readonly enviando = signal(false);

  protected readonly temDemo = !!environment.demoEmail && !!environment.demoPassword;

  protected async entrarDemo(): Promise<void> {
    this.email = environment.demoEmail;
    this.senha = environment.demoPassword;
    await this.entrar();
  }

  protected async entrar(): Promise<void> {
    this.erro.set('');
    this.enviando.set(true);
    try {
      await this.auth.entrar(this.email.trim(), this.senha);
      await this.router.navigateByUrl('/calendario');
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
