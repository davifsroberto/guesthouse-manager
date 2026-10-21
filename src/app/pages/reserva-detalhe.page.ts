import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReservasService } from '../core/reservas.service';
import { PagamentosService } from '../core/pagamentos.service';
import { mensagemErro } from '../core/supabase.service';
import {
  FORMA_LABEL,
  FormaPagamento,
  Reserva,
  saldo,
  STATUS_LABEL,
  TIPO_PAGAMENTO_LABEL,
  TipoPagamento,
  totalPago,
} from '../core/models';
import { diffDias, hojeISO, isoParaBR } from '../core/datas';
import { DateFieldComponent } from '../shared/date-field.component';

@Component({
  selector: 'app-reserva-detalhe-page',
  imports: [RouterLink, CurrencyPipe, DatePipe, FormsModule, DateFieldComponent],
  templateUrl: './reserva-detalhe.page.html',
  styles: `
    .cabecalho { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
    .cabecalho h1 { margin: 0; }
    .dados { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem 1.5rem; }
    .dados dt { font-weight: 700; color: var(--texto-suave); font-size: 0.95rem; }
    .dados dd { margin: 0 0 0.5rem; }
    .acoes { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
    .grande { font-size: 1.25rem; min-height: 60px; padding: 0.8rem 1.6rem; }
    .totais { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .totais div { display: flex; flex-direction: column; }
    .saldo-aberto { color: var(--vermelho); }
    .saldo-ok { color: var(--verde); }
    .confirmar { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
  `,
})
export class ReservaDetalhePage implements OnInit {
  readonly id = input.required<string>();
  readonly salvo = input<string>();

  private readonly reservasSrv = inject(ReservasService);
  private readonly pagamentosSrv = inject(PagamentosService);

  protected readonly rotuloStatus = STATUS_LABEL;
  protected readonly rotuloForma = FORMA_LABEL;
  protected readonly rotuloTipo = TIPO_PAGAMENTO_LABEL;

  protected readonly reserva = signal<Reserva | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal('');
  protected readonly mensagem = signal('');
  protected readonly ocupado = signal(false);
  protected readonly confirmandoCancelamento = signal(false);
  protected readonly confirmandoRemocao = signal<number | null>(null);

  protected readonly pago = computed(() => (this.reserva() ? totalPago(this.reserva()!) : 0));
  protected readonly saldo = computed(() => (this.reserva() ? saldo(this.reserva()!) : 0));
  protected readonly diarias = computed(() =>
    this.reserva() ? diffDias(this.reserva()!.data_entrada, this.reserva()!.data_saida) : 0
  );
  protected readonly pagamentosOrdenados = computed(() =>
    [...(this.reserva()?.pagamentos ?? [])].sort((a, b) => a.data.localeCompare(b.data))
  );

  protected novoPagamento = { valor: 0, data: hojeISO(), forma: 'pix' as FormaPagamento, tipo: 'saldo' as TipoPagamento, observacao: '' };

  async ngOnInit(): Promise<void> {
    if (this.salvo()) this.mensagem.set('✓ Reserva salva com sucesso!');
    await this.carregar();
  }

  protected br = isoParaBR;

  protected async checkin(): Promise<void> {
    await this.executar(() => this.reservasSrv.fazerCheckin(this.reserva()!.id), '✓ Check-in (Entrada) registrado!');
  }

  protected async checkout(): Promise<void> {
    await this.executar(() => this.reservasSrv.fazerCheckout(this.reserva()!.id), '✓ Check-out (Saída) registrado!');
  }

  protected async cancelar(): Promise<void> {
    this.confirmandoCancelamento.set(false);
    await this.executar(() => this.reservasSrv.cancelar(this.reserva()!.id), 'Reserva cancelada.');
  }

  protected async adicionarPagamento(): Promise<void> {
    const p = this.novoPagamento;
    if (!(Number(p.valor) > 0)) {
      this.erro.set('Informe um valor maior que zero.');
      return;
    }
    if (!p.data) {
      this.erro.set('Informe a data do pagamento (dd/mm/aaaa).');
      return;
    }
    await this.executar(
      () =>
        this.pagamentosSrv.adicionar({
          reserva_id: this.reserva()!.id,
          valor: Number(p.valor),
          data: p.data,
          forma: p.forma,
          tipo: p.tipo,
          observacao: p.observacao.trim() || null,
        }),
      '✓ Pagamento registrado!'
    );
  }

  protected async removerPagamento(id: number): Promise<void> {
    this.confirmandoRemocao.set(null);
    await this.executar(() => this.pagamentosSrv.remover(id), 'Pagamento removido.');
  }

  private async executar(acao: () => Promise<void>, sucesso: string): Promise<void> {
    this.erro.set('');
    this.mensagem.set('');
    this.ocupado.set(true);
    try {
      await acao();
      this.mensagem.set(sucesso);
      await this.carregar();
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  private async carregar(): Promise<void> {
    try {
      const r = await this.reservasSrv.obter(Number(this.id()));
      this.reserva.set(r);
      const falta = saldo(r);
      this.novoPagamento = {
        valor: falta,
        data: hojeISO(),
        forma: 'pix',
        tipo: totalPago(r) === 0 ? 'sinal' : 'saldo',
        observacao: '',
      };
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.carregando.set(false);
    }
  }
}
