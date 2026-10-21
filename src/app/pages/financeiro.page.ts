import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReservasService } from '../core/reservas.service';
import { PagamentosService } from '../core/pagamentos.service';
import { mensagemErro } from '../core/supabase.service';
import { FORMA_LABEL, FormaPagamento, Pagamento, Reserva, saldo, STATUS_LABEL } from '../core/models';
import { isoParaBR, MESES, toISO } from '../core/datas';

@Component({
  selector: 'app-financeiro-page',
  imports: [CurrencyPipe, RouterLink],
  template: `
    <h1>💰 Financeiro</h1>

    @if (erro()) { <div class="aviso aviso-erro">{{ erro() }}</div> }

    <div class="barra-acoes navegacao">
      <button class="btn-secundario" (click)="mudarMes(-1)">◀ Anterior</button>
      <h2 class="titulo-mes">{{ tituloMes() }}</h2>
      <button class="btn-secundario" (click)="mudarMes(1)">Próximo ▶</button>
    </div>

    <section class="indicadores">
      <div class="cartao"><span class="texto-suave">Recebido no mês</span><span class="valor-destaque verde">{{ totalMes() | currency: 'BRL' }}</span></div>
      <div class="cartao"><span class="texto-suave">Pagamentos no mês</span><span class="valor-destaque">{{ pagamentos().length }}</span></div>
      <div class="cartao"><span class="texto-suave">A receber (todas as reservas)</span><span class="valor-destaque vermelho">{{ totalPendente() | currency: 'BRL' }}</span></div>
    </section>

    @if (porForma().length) {
      <section class="cartao">
        <h2>Recebido por forma de pagamento</h2>
        <ul class="por-forma">
          @for (f of porForma(); track f.forma) {
            <li><span>{{ rotuloForma[f.forma] }}</span><strong>{{ f.total | currency: 'BRL' }}</strong></li>
          }
        </ul>
      </section>
    }

    <section class="cartao">
      <h2>⚠️ Reservas com valor a receber</h2>
      @if (carregando()) {
        <p class="carregando">Carregando…</p>
      } @else if (!pendentes().length) {
        <p class="aviso aviso-ok">✓ Nenhuma pendência. Todas as reservas estão pagas.</p>
      } @else {
        <div class="tabela-wrap">
          <table class="tabela">
            <thead><tr><th>Hóspede</th><th>Acomodação</th><th>Entrada</th><th>Situação</th><th>Total</th><th>Falta</th><th></th></tr></thead>
            <tbody>
              @for (r of pendentes(); track r.id) {
                <tr>
                  <td><strong>{{ r.hospede?.nome }}</strong></td>
                  <td>{{ r.acomodacao?.nome }}</td>
                  <td>{{ br(r.data_entrada) }}</td>
                  <td><span class="selo" [class]="r.status">{{ rotuloStatus[r.status] }}</span></td>
                  <td>{{ r.valor_total | currency: 'BRL' }}</td>
                  <td><strong class="vermelho">{{ saldoDe(r) | currency: 'BRL' }}</strong></td>
                  <td><a [routerLink]="['/reservas', r.id]" class="btn btn-pequeno btn-secundario">Receber</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .navegacao { align-items: center; }
    .titulo-mes { margin: 0; min-width: 220px; text-align: center; }
    .indicadores { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .indicadores .cartao { display: flex; flex-direction: column; }
    .verde { color: var(--verde); }
    .vermelho { color: var(--vermelho); }
    .por-forma { list-style: none; padding: 0; margin: 0; }
    .por-forma li { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee; }
  `,
})
export class FinanceiroPage implements OnInit {
  private readonly reservasSrv = inject(ReservasService);
  private readonly pagamentosSrv = inject(PagamentosService);

  protected readonly rotuloForma = FORMA_LABEL;
  protected readonly rotuloStatus = STATUS_LABEL;
  protected readonly ano = signal(new Date().getFullYear());
  protected readonly mes = signal(new Date().getMonth());
  protected readonly pagamentos = signal<Pagamento[]>([]);
  protected readonly reservas = signal<Reserva[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal('');

  protected readonly tituloMes = computed(() => `${MESES[this.mes()]} de ${this.ano()}`);
  protected readonly totalMes = computed(() => this.pagamentos().reduce((s, p) => s + Number(p.valor), 0));
  protected readonly porForma = computed(() => {
    const mapa = new Map<FormaPagamento, number>();
    for (const p of this.pagamentos()) mapa.set(p.forma, (mapa.get(p.forma) ?? 0) + Number(p.valor));
    return [...mapa.entries()].map(([forma, total]) => ({ forma, total })).sort((a, b) => b.total - a.total);
  });
  protected readonly pendentes = computed(() =>
    this.reservas()
      .filter((r) => r.status !== 'cancelada' && saldo(r) > 0)
      .sort((a, b) => a.data_entrada.localeCompare(b.data_entrada))
  );
  protected readonly totalPendente = computed(() => this.pendentes().reduce((s, r) => s + saldo(r), 0));

  ngOnInit(): void {
    this.carregarPendencias();
    this.carregarMes();
  }

  protected br = isoParaBR;
  protected saldoDe = saldo;

  protected mudarMes(delta: number): void {
    const d = new Date(this.ano(), this.mes() + delta, 1);
    this.ano.set(d.getFullYear());
    this.mes.set(d.getMonth());
    this.carregarMes();
  }

  private async carregarMes(): Promise<void> {
    try {
      const inicio = toISO(new Date(this.ano(), this.mes(), 1));
      const fim = toISO(new Date(this.ano(), this.mes() + 1, 1));
      this.pagamentos.set(await this.pagamentosSrv.recebidosNoPeriodo(inicio, fim));
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }

  private async carregarPendencias(): Promise<void> {
    try {
      this.reservas.set(await this.reservasSrv.listar());
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.carregando.set(false);
    }
  }
}
