import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AcomodacoesService } from '../core/acomodacoes.service';
import { HospedesService } from '../core/hospedes.service';
import { ReservasService, DadosReserva } from '../core/reservas.service';
import { PagamentosService } from '../core/pagamentos.service';
import { mensagemErro } from '../core/supabase.service';
import { Acomodacao, FormaPagamento, Hospede } from '../core/models';
import { addDias, diffDias, hojeISO } from '../core/datas';
import { DateFieldComponent } from '../shared/date-field.component';

@Component({
  selector: 'app-reserva-form-page',
  imports: [FormsModule, RouterLink, CurrencyPipe, DateFieldComponent],
  templateUrl: './reserva-form.page.html',
  styles: `
    .lista-hospedes { list-style: none; padding: 0; margin: 0.5rem 0; border: 1px solid #e0e0e0; border-radius: var(--raio); max-height: 260px; overflow-y: auto; }
    .lista-hospedes li button { width: 100%; justify-content: flex-start; background: #fff; color: var(--texto); border-radius: 0; border-bottom: 1px solid #eee; min-height: 48px; text-align: left; }
    .lista-hospedes li button:hover { background: var(--verde-claro); }
    .hospede-escolhido { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; }
    .disponibilidade { font-weight: 700; padding: 0.6rem 1rem; border-radius: var(--raio); }
    .acoes-form { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    h1 { margin-top: 0; }
  `,
})
export class ReservaFormPage implements OnInit {
  // parâmetros de rota (withComponentInputBinding)
  readonly id = input<string>();
  readonly acomodacao = input<string>();
  readonly entrada = input<string>();
  readonly hospedeId = input<string>(undefined, { alias: 'hospede' });

  private readonly acomodacoesSrv = inject(AcomodacoesService);
  private readonly hospedesSrv = inject(HospedesService);
  private readonly reservasSrv = inject(ReservasService);
  private readonly pagamentosSrv = inject(PagamentosService);
  private readonly router = inject(Router);

  protected readonly acomodacoes = signal<Acomodacao[]>([]);
  protected readonly editando = computed(() => !!this.id());

  // hóspede
  protected readonly hospede = signal<Hospede | null>(null);
  protected readonly buscaHospede = signal('');
  protected readonly resultados = signal<Hospede[]>([]);
  protected readonly cadastrandoNovo = signal(false);
  protected novo = { nome: '', telefone: '', documento: '', email: '', cidade: '' };

  // reserva
  protected form = {
    acomodacao_id: 0,
    data_entrada: hojeISO(),
    data_saida: addDias(hojeISO(), 1),
    num_hospedes: 2,
    valor_total: 0,
    observacoes: '',
  };
  protected valorEditadoManualmente = false;

  // sinal (opcional, só na criação)
  protected sinal = { valor: 0, forma: 'pix' as FormaPagamento };

  protected readonly disponivel = signal<boolean | null>(null);
  protected readonly erro = signal('');
  protected readonly salvando = signal(false);
  protected readonly carregando = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      this.acomodacoes.set(await this.acomodacoesSrv.listar());

      const id = this.id();
      if (id) {
        const r = await this.reservasSrv.obter(Number(id));
        this.hospede.set(r.hospede ?? null);
        this.form = {
          acomodacao_id: r.acomodacao_id,
          data_entrada: r.data_entrada,
          data_saida: r.data_saida,
          num_hospedes: r.num_hospedes,
          valor_total: Number(r.valor_total),
          observacoes: r.observacoes ?? '',
        };
        this.valorEditadoManualmente = true;
      } else {
        if (this.acomodacao()) this.form.acomodacao_id = Number(this.acomodacao());
        if (this.entrada()) {
          this.form.data_entrada = this.entrada()!;
          this.form.data_saida = addDias(this.entrada()!, 1);
        }
        if (this.hospedeId()) this.hospede.set(await this.hospedesSrv.obter(Number(this.hospedeId())));
        if (!this.form.acomodacao_id && this.acomodacoes().length) this.form.acomodacao_id = this.acomodacoes()[0].id;
        this.recalcularValor();
      }
      await this.verificarDisponibilidade();
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.carregando.set(false);
    }
  }

  // ---------- Hóspede ----------
  protected async buscar(termo: string): Promise<void> {
    this.buscaHospede.set(termo);
    if (termo.trim().length < 2) {
      this.resultados.set([]);
      return;
    }
    try {
      this.resultados.set(await this.hospedesSrv.listar(termo));
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }

  protected escolherHospede(h: Hospede): void {
    this.hospede.set(h);
    this.resultados.set([]);
    this.buscaHospede.set('');
    this.cadastrandoNovo.set(false);
  }

  protected iniciarNovoHospede(): void {
    this.novo = { nome: this.buscaHospede(), telefone: '', documento: '', email: '', cidade: '' };
    this.cadastrandoNovo.set(true);
    this.resultados.set([]);
  }

  // ---------- Reserva ----------
  protected acomodacaoSelecionada(): Acomodacao | undefined {
    return this.acomodacoes().find((a) => a.id === Number(this.form.acomodacao_id));
  }

  protected diarias(): number {
    if (!this.form.data_entrada || !this.form.data_saida) return 0;
    return Math.max(0, diffDias(this.form.data_entrada, this.form.data_saida));
  }

  protected async aoMudarDatasOuAcomodacao(): Promise<void> {
    this.recalcularValor();
    await this.verificarDisponibilidade();
  }

  protected recalcularValor(forcar = false): void {
    if (this.valorEditadoManualmente && !forcar) return;
    const a = this.acomodacaoSelecionada();
    this.form.valor_total = a ? this.diarias() * Number(a.diaria) : 0;
    if (forcar) this.valorEditadoManualmente = false;
  }

  private async verificarDisponibilidade(): Promise<void> {
    const { acomodacao_id, data_entrada, data_saida } = this.form;
    if (!acomodacao_id || !data_entrada || !data_saida || data_saida <= data_entrada) {
      this.disponivel.set(null);
      return;
    }
    const id = this.id() ? Number(this.id()) : undefined;
    this.disponivel.set(!(await this.reservasSrv.temConflito(Number(acomodacao_id), data_entrada, data_saida, id)));
  }

  protected async salvar(): Promise<void> {
    this.erro.set('');
    const problema = this.validar();
    if (problema) {
      this.erro.set(problema);
      return;
    }

    this.salvando.set(true);
    try {
      await this.verificarDisponibilidade();
      if (this.disponivel() === false) {
        this.erro.set('Esta acomodação já está reservada nesse período. Escolha outras datas ou outra acomodação.');
        return;
      }

      let hospede = this.hospede();
      if (!hospede && this.cadastrandoNovo()) {
        hospede = await this.hospedesSrv.criar({
          nome: this.novo.nome.trim(),
          telefone: this.novo.telefone.trim() || null,
          documento: this.novo.documento.trim() || null,
          email: this.novo.email.trim() || null,
          cidade: this.novo.cidade.trim() || null,
        });
        this.hospede.set(hospede);
        this.cadastrandoNovo.set(false);
      }

      const dados: DadosReserva = {
        hospede_id: hospede!.id,
        acomodacao_id: Number(this.form.acomodacao_id),
        data_entrada: this.form.data_entrada,
        data_saida: this.form.data_saida,
        num_hospedes: Number(this.form.num_hospedes),
        valor_total: Number(this.form.valor_total),
        observacoes: this.form.observacoes.trim() || null,
      };

      let id: number;
      if (this.editando()) {
        id = Number(this.id());
        await this.reservasSrv.atualizar(id, dados);
      } else {
        id = await this.reservasSrv.criar(dados);
        if (Number(this.sinal.valor) > 0) {
          await this.pagamentosSrv.adicionar({
            reserva_id: id,
            valor: Number(this.sinal.valor),
            data: hojeISO(),
            forma: this.sinal.forma,
            tipo: 'sinal',
            observacao: null,
          });
        }
      }
      await this.router.navigate(['/reservas', id], { queryParams: { salvo: 1 } });
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.salvando.set(false);
    }
  }

  private validar(): string | null {
    if (!this.hospede() && !this.cadastrandoNovo()) return 'Escolha um hóspede ou cadastre um novo.';
    if (this.cadastrandoNovo() && !this.novo.nome.trim()) return 'Informe o nome do novo hóspede.';
    if (!this.form.acomodacao_id) return 'Escolha a acomodação.';
    if (!this.form.data_entrada) return 'Informe a data de entrada (dd/mm/aaaa).';
    if (!this.form.data_saida) return 'Informe a data de saída (dd/mm/aaaa).';
    if (this.form.data_saida <= this.form.data_entrada) return 'A data de saída deve ser depois da data de entrada.';
    if (Number(this.form.num_hospedes) < 1) return 'Informe o número de hóspedes.';
    if (Number(this.form.valor_total) < 0) return 'O valor não pode ser negativo.';
    if (Number(this.sinal.valor) > Number(this.form.valor_total)) return 'O sinal não pode ser maior que o valor total.';
    return null;
  }
}
