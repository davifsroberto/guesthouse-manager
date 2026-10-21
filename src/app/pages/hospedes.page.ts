import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HospedesService, NovoHospede } from '../core/hospedes.service';
import { ReservasService } from '../core/reservas.service';
import { mensagemErro } from '../core/supabase.service';
import { Hospede, Reserva, STATUS_LABEL } from '../core/models';
import { isoParaBR } from '../core/datas';

@Component({
  selector: 'app-hospedes-page',
  imports: [FormsModule, RouterLink, CurrencyPipe],
  template: `
    <div class="barra-acoes">
      <h1>👤 Hóspedes</h1>
      <span class="espaco"></span>
      <button (click)="novo()">➕ Novo hóspede</button>
    </div>

    @if (mensagem()) { <div class="aviso aviso-ok">{{ mensagem() }}</div> }
    @if (erro()) { <div class="aviso aviso-erro">{{ erro() }}</div> }

    @if (editando()) {
      <form class="cartao" (ngSubmit)="salvar()">
        <h2>{{ editando() === 'novo' ? 'Novo hóspede' : 'Editar hóspede' }}</h2>
        <div class="grade-form">
          <div class="campo"><label for="hNome">Nome completo *</label><input id="hNome" name="nome" [(ngModel)]="form.nome" required /></div>
          <div class="campo"><label for="hTel">Telefone / WhatsApp</label><input id="hTel" name="telefone" type="tel" [(ngModel)]="form.telefone" /></div>
          <div class="campo"><label for="hDoc">Documento (CPF ou RG)</label><input id="hDoc" name="documento" [(ngModel)]="form.documento" /></div>
          <div class="campo"><label for="hEmail">E-mail</label><input id="hEmail" name="email" type="email" [(ngModel)]="form.email" /></div>
          <div class="campo"><label for="hCidade">Cidade</label><input id="hCidade" name="cidade" [(ngModel)]="form.cidade" /></div>
        </div>
        <div class="barra-acoes">
          <button type="submit" [disabled]="salvando()">💾 Salvar</button>
          <button type="button" class="btn-secundario" (click)="editando.set(null)">Cancelar</button>
        </div>
      </form>
    }

    <div class="cartao">
      <label for="buscaH">Buscar por nome, telefone ou documento</label>
      <input id="buscaH" type="search" placeholder="Digite para buscar…" [value]="busca()" (input)="buscar($any($event.target).value)" />
    </div>

    @if (carregando()) {
      <p class="carregando">Carregando…</p>
    } @else if (!hospedes().length) {
      <p class="aviso aviso-info">Nenhum hóspede encontrado.</p>
    } @else {
      <div class="tabela-wrap cartao">
        <table class="tabela">
          <thead><tr><th>Nome</th><th>Telefone</th><th>Cidade</th><th></th></tr></thead>
          <tbody>
            @for (h of hospedes(); track h.id) {
              <tr [class.selecionado]="selecionado()?.id === h.id">
                <td><strong>{{ h.nome }}</strong></td>
                <td>{{ h.telefone }}</td>
                <td>{{ h.cidade }}</td>
                <td class="acoes-linha">
                  <button class="btn-pequeno btn-secundario" (click)="verHistorico(h)">Histórico</button>
                  <button class="btn-pequeno btn-secundario" (click)="editar(h)">Editar</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (selecionado(); as h) {
      <section class="cartao">
        <h2>Histórico de estadias — {{ h.nome }}</h2>
        @if (historico().length) {
          <p>
            <strong>{{ estadias() }}</strong> estadia(s) concluída(s) ·
            <a routerLink="/reservas/nova" [queryParams]="{ hospede: h.id }" class="btn btn-pequeno">➕ Nova reserva</a>
          </p>
          <div class="tabela-wrap">
            <table class="tabela">
              <thead><tr><th>Acomodação</th><th>Entrada</th><th>Saída</th><th>Valor</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                @for (r of historico(); track r.id) {
                  <tr>
                    <td>{{ r.acomodacao?.nome }}</td>
                    <td>{{ br(r.data_entrada) }}</td>
                    <td>{{ br(r.data_saida) }}</td>
                    <td>{{ r.valor_total | currency: 'BRL' }}</td>
                    <td><span class="selo" [class]="r.status">{{ rotulo[r.status] }}</span></td>
                    <td><a [routerLink]="['/reservas', r.id]" class="btn btn-pequeno btn-secundario">Abrir</a></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="texto-suave">Este hóspede ainda não tem reservas.</p>
        }
      </section>
    }
  `,
  styles: `
    h1 { margin: 0; }
    .acoes-linha { display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; }
    tr.selecionado { background: var(--verde-claro); }
  `,
})
export class HospedesPage implements OnInit {
  private readonly srv = inject(HospedesService);
  private readonly reservasSrv = inject(ReservasService);

  protected readonly rotulo = STATUS_LABEL;
  protected readonly hospedes = signal<Hospede[]>([]);
  protected readonly busca = signal('');
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly erro = signal('');
  protected readonly mensagem = signal('');
  protected readonly editando = signal<'novo' | number | null>(null);
  protected readonly selecionado = signal<Hospede | null>(null);
  protected readonly historico = signal<Reserva[]>([]);

  protected form: NovoHospede = this.vazio();
  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.carregar();
  }

  protected br = isoParaBR;
  protected estadias(): number {
    return this.historico().filter((r) => r.status === 'finalizada').length;
  }

  protected buscar(termo: string): void {
    this.busca.set(termo);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.carregar(), 300);
  }

  protected novo(): void {
    this.form = this.vazio();
    this.editando.set('novo');
  }

  protected editar(h: Hospede): void {
    this.form = { nome: h.nome, telefone: h.telefone, documento: h.documento, email: h.email, cidade: h.cidade };
    this.editando.set(h.id);
  }

  protected async verHistorico(h: Hospede): Promise<void> {
    this.selecionado.set(h);
    try {
      this.historico.set(await this.reservasSrv.doHospede(h.id));
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }

  protected async salvar(): Promise<void> {
    this.erro.set('');
    this.mensagem.set('');
    if (!this.form.nome?.trim()) {
      this.erro.set('Informe o nome do hóspede.');
      return;
    }
    const dados: NovoHospede = {
      nome: this.form.nome.trim(),
      telefone: this.form.telefone?.trim() || null,
      documento: this.form.documento?.trim() || null,
      email: this.form.email?.trim() || null,
      cidade: this.form.cidade?.trim() || null,
    };
    this.salvando.set(true);
    try {
      const alvo = this.editando();
      if (alvo === 'novo') await this.srv.criar(dados);
      else if (typeof alvo === 'number') await this.srv.atualizar(alvo, dados);
      this.editando.set(null);
      this.mensagem.set('✓ Hóspede salvo!');
      await this.carregar();
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.salvando.set(false);
    }
  }

  private vazio(): NovoHospede {
    return { nome: '', telefone: '', documento: '', email: '', cidade: '' };
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      this.hospedes.set(await this.srv.listar(this.busca()));
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.carregando.set(false);
    }
  }
}
