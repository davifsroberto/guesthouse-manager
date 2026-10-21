import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReservasService } from '../core/reservas.service';
import { mensagemErro } from '../core/supabase.service';
import { Reserva, saldo, STATUS_LABEL, StatusReserva } from '../core/models';
import { diffDias, isoParaBR } from '../core/datas';

@Component({
  selector: 'app-reservas-page',
  imports: [RouterLink, CurrencyPipe],
  template: `
    <div class="barra-acoes">
      <h1>📋 Reservas</h1>
      <span class="espaco"></span>
      <a routerLink="/reservas/nova" class="btn">➕ Nova reserva</a>
    </div>

    <div class="barra-acoes cartao">
      <div class="campo-filtro">
        <label for="busca">Buscar por hóspede ou acomodação</label>
        <input id="busca" type="search" placeholder="Digite um nome…" [value]="busca()" (input)="busca.set($any($event.target).value)" />
      </div>
      <div>
        <label for="status">Situação</label>
        <select id="status" [value]="status()" (change)="mudarStatus($any($event.target).value)">
          <option value="">Todas</option>
          <option value="reservada">Reservadas</option>
          <option value="hospedado">Hospedados</option>
          <option value="finalizada">Finalizadas</option>
          <option value="cancelada">Canceladas</option>
        </select>
      </div>
    </div>

    @if (erro()) {
      <div class="aviso aviso-erro">{{ erro() }}</div>
    }

    @if (carregando()) {
      <p class="carregando">Carregando…</p>
    } @else if (!filtradas().length) {
      <p class="aviso aviso-info">Nenhuma reserva encontrada.</p>
    } @else {
      <div class="tabela-wrap cartao">
        <table class="tabela">
          <thead>
            <tr>
              <th>Hóspede</th>
              <th>Acomodação</th>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Diárias</th>
              <th>Valor</th>
              <th>Pagamento</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of filtradas(); track r.id) {
              <tr>
                <td><strong>{{ r.hospede?.nome }}</strong></td>
                <td>{{ r.acomodacao?.nome }}</td>
                <td>{{ br(r.data_entrada) }}</td>
                <td>{{ br(r.data_saida) }}</td>
                <td>{{ diarias(r) }}</td>
                <td>{{ r.valor_total | currency: 'BRL' }}</td>
                <td>
                  @if (saldoDe(r) > 0) {
                    <span class="selo pendente">Falta {{ saldoDe(r) | currency: 'BRL' }}</span>
                  } @else {
                    <span class="selo pago">✓ Pago</span>
                  }
                </td>
                <td><span class="selo" [class]="r.status">{{ rotulo[r.status] }}</span></td>
                <td><a [routerLink]="['/reservas', r.id]" class="btn btn-pequeno btn-secundario">Abrir</a></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `.campo-filtro { flex: 1; min-width: 240px; } .barra-acoes.cartao { margin-bottom: 1rem; } h1 { margin: 0; }`,
})
export class ReservasPage implements OnInit {
  private readonly srv = inject(ReservasService);

  protected readonly rotulo = STATUS_LABEL;
  protected readonly reservas = signal<Reserva[]>([]);
  protected readonly busca = signal('');
  protected readonly status = signal<StatusReserva | ''>('');
  protected readonly carregando = signal(true);
  protected readonly erro = signal('');

  protected readonly filtradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.reservas();
    return this.reservas().filter(
      (r) => r.hospede?.nome.toLowerCase().includes(termo) || r.acomodacao?.nome.toLowerCase().includes(termo)
    );
  });

  ngOnInit(): void {
    this.carregar();
  }

  protected mudarStatus(s: StatusReserva | ''): void {
    this.status.set(s);
    this.carregar();
  }

  protected br = isoParaBR;
  protected saldoDe = saldo;
  protected diarias(r: Reserva): number {
    return diffDias(r.data_entrada, r.data_saida);
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set('');
    try {
      this.reservas.set(await this.srv.listar(this.status()));
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.carregando.set(false);
    }
  }
}
