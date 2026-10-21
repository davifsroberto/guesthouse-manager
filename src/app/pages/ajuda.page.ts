import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface Video {
  arquivo: string;
  titulo: string;
  descricao: string;
}

/** Página pública de ajuda: manual do usuário e vídeos tutoriais (arquivos em public/material). */
@Component({
  selector: 'app-ajuda-page',
  imports: [RouterLink],
  template: `
    @if (!auth.session()) {
      <a routerLink="/login" class="texto-suave">◀ Ir para o login</a>
    }
    <h1>❓ Ajuda</h1>
    <p class="texto-suave">Manual e vídeos curtos mostrando como usar cada parte do sistema. Os dados que aparecem são fictícios.</p>

    <section class="cartao manual">
      <div>
        <h2>📘 Manual do usuário</h2>
        <p>Passo a passo ilustrado de todas as telas, com dúvidas comuns (PDF, 8 páginas).</p>
      </div>
      <a class="btn" href="/material/manual-do-usuario.pdf" target="_blank" rel="noopener">Abrir o manual (PDF)</a>
    </section>

    <h2>🎬 Vídeos tutoriais</h2>
    <div class="videos">
      @for (v of videos; track v.arquivo; let i = $index) {
        <article class="cartao video">
          <h3>{{ i + 1 }}. {{ v.titulo }}</h3>
          <video controls preload="metadata" [poster]="'/material/videos/' + v.arquivo + '.jpg'" [attr.aria-label]="v.titulo">
            <source [src]="'/material/videos/' + v.arquivo + '.mp4'" type="video/mp4" />
            <source [src]="'/material/videos/' + v.arquivo + '.webm'" type="video/webm" />
          </video>
          <p class="texto-suave">{{ v.descricao }}</p>
          <a [href]="'/material/videos/' + v.arquivo + '.mp4'" target="_blank" rel="noopener">Abrir em tela cheia</a>
        </article>
      }
    </div>
  `,
  styles: `
    h1 { margin-top: 0.5rem; }
    .manual { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; }
    .manual h2 { margin-top: 0; }
    .videos { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1rem; }
    .video h3 { margin: 0 0 0.75rem; font-size: 1.15rem; }
    .video video { width: 100%; border-radius: 8px; background: #000; aspect-ratio: 1280 / 760; }
    .video p { margin: 0.5rem 0; }
  `,
})
export class AjudaPage {
  protected readonly auth = inject(AuthService);

  protected readonly videos: Video[] = [
    { arquivo: '01-Calendario-de-ocupacao', titulo: 'Calendário de ocupação', descricao: 'Como ler as cores, trocar de mês, filtrar e aumentar a letra.' },
    { arquivo: '02-Fazer-uma-reserva', titulo: 'Fazer uma reserva', descricao: 'Do dia livre no calendário até salvar a reserva com sinal.' },
    { arquivo: '03-Check-in', titulo: 'Check-in (Entrada)', descricao: 'Registrar a chegada do hóspede a partir das chegadas do dia.' },
    { arquivo: '04-Pagamento-e-check-out', titulo: 'Pagamento e Check-out (Saída)', descricao: 'Registrar o saldo e finalizar a hospedagem.' },
    { arquivo: '05-Financeiro-e-hospedes', titulo: 'Financeiro e hóspedes', descricao: 'Recebido no mês, pendências e histórico de estadias.' },
  ];
}
