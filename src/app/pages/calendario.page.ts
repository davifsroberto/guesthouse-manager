import { Component, computed, ElementRef, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AcomodacoesService } from '../core/acomodacoes.service';
import { ReservasService } from '../core/reservas.service';
import { mensagemErro } from '../core/supabase.service';
import { Acomodacao, Reserva } from '../core/models';
import { addDias, diaSemana, hojeISO, MESES, toISO } from '../core/datas';

type EstadoCelula = 'livre' | 'ocupado' | 'entrada-hoje' | 'saida-hoje';

interface Celula {
  dia: string;
  estado: EstadoCelula;
  reserva?: Reserva;
  inicio: boolean; // primeiro dia da reserva (mostra o nome)
}

@Component({
  selector: 'app-calendario-page',
  imports: [RouterLink],
  templateUrl: './calendario.page.html',
  styleUrl: './calendario.page.scss',
})
export class CalendarioPage implements OnInit {
  private readonly acomodacoesSrv = inject(AcomodacoesService);
  private readonly reservasSrv = inject(ReservasService);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef<HTMLElement>);

  protected readonly hoje = hojeISO();
  protected readonly ano = signal(new Date().getFullYear());
  protected readonly mes = signal(new Date().getMonth()); // 0-11
  protected readonly filtroTipo = signal<'' | 'chale' | 'suite'>('');

  protected readonly acomodacoes = signal<Acomodacao[]>([]);
  protected readonly reservas = signal<Reserva[]>([]);
  protected readonly reservasHoje = signal<Reserva[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal('');

  protected readonly tituloMes = computed(() => `${MESES[this.mes()]} de ${this.ano()}`);

  protected readonly dias = computed(() => {
    const inicio = toISO(new Date(this.ano(), this.mes(), 1));
    const total = new Date(this.ano(), this.mes() + 1, 0).getDate();
    return Array.from({ length: total }, (_, i) => {
      const iso = addDias(inicio, i);
      return { iso, numero: i + 1, semana: diaSemana(iso), fimDeSemana: [0, 6].includes(new Date(iso + 'T00:00').getDay()) };
    });
  });

  protected readonly acomodacoesFiltradas = computed(() =>
    this.acomodacoes().filter((a) => !this.filtroTipo() || a.tipo === this.filtroTipo())
  );

  /** Matriz acomodação × dia com o estado de cada célula. */
  protected readonly grade = computed(() => {
    const porAcomodacao = new Map<number, Reserva[]>();
    for (const r of this.reservas()) {
      const lista = porAcomodacao.get(r.acomodacao_id) ?? [];
      lista.push(r);
      porAcomodacao.set(r.acomodacao_id, lista);
    }
    return this.acomodacoesFiltradas().map((a) => {
      const lista = porAcomodacao.get(a.id) ?? [];
      const celulas: Celula[] = this.dias().map(({ iso }) => {
        const r = lista.find((x) => x.data_entrada <= iso && iso < x.data_saida);
        if (r) {
          const estado: EstadoCelula = iso === this.hoje && r.data_entrada === iso && r.status === 'reservada' ? 'entrada-hoje' : 'ocupado';
          return { dia: iso, estado, reserva: r, inicio: r.data_entrada === iso || iso === this.dias()[0].iso };
        }
        const saindo = lista.find((x) => x.data_saida === iso && iso === this.hoje && x.status === 'hospedado');
        if (saindo) return { dia: iso, estado: 'saida-hoje', reserva: saindo, inicio: false };
        return { dia: iso, estado: 'livre', inicio: false };
      });
      return { acomodacao: a, celulas };
    });
  });

  // Resumo do dia
  protected readonly chegadasHoje = computed(() =>
    this.reservasHoje().filter((r) => r.data_entrada === this.hoje && r.status === 'reservada')
  );
  protected readonly saidasHoje = computed(() =>
    this.reservasHoje().filter((r) => r.data_saida === this.hoje && r.status === 'hospedado')
  );
  protected readonly hospedadosAgora = computed(() => this.reservasHoje().filter((r) => r.status === 'hospedado').length);
  protected readonly livresHoje = computed(() => {
    const ocupadas = new Set(
      this.reservasHoje()
        .filter((r) => r.data_entrada <= this.hoje && this.hoje < r.data_saida)
        .map((r) => r.acomodacao_id)
    );
    return this.acomodacoes().filter((a) => !ocupadas.has(a.id)).length;
  });

  async ngOnInit(): Promise<void> {
    try {
      this.acomodacoes.set(await this.acomodacoesSrv.listar());
      await this.carregar();
    } catch (e) {
      this.erro.set(mensagemErro(e));
      this.carregando.set(false);
    }
  }

  protected async mudarMes(delta: number): Promise<void> {
    const d = new Date(this.ano(), this.mes() + delta, 1);
    this.ano.set(d.getFullYear());
    this.mes.set(d.getMonth());
    await this.carregar();
  }

  protected async irParaHoje(): Promise<void> {
    const d = new Date();
    this.ano.set(d.getFullYear());
    this.mes.set(d.getMonth());
    await this.carregar();
  }

  protected clicarCelula(acomodacao: Acomodacao, c: Celula): void {
    if (c.reserva && c.estado !== 'saida-hoje') {
      this.router.navigate(['/reservas', c.reserva.id]);
    } else if (c.dia >= this.hoje) {
      this.router.navigate(['/reservas/nova'], { queryParams: { acomodacao: acomodacao.id, entrada: c.dia } });
    } else if (c.reserva) {
      this.router.navigate(['/reservas', c.reserva.id]);
    }
  }

  protected descricao(a: Acomodacao, c: Celula): string {
    const data = c.dia.split('-').reverse().join('/');
    if (c.estado === 'livre') return `${a.nome} - ${data}: livre`;
    const nome = c.reserva?.hospede?.nome ?? '';
    if (c.estado === 'saida-hoje') return `${a.nome} - ${data}: saída hoje (${nome})`;
    if (c.estado === 'entrada-hoje') return `${a.nome} - ${data}: entrada hoje (${nome})`;
    return `${a.nome} - ${data}: ocupado por ${nome}`;
  }

  protected primeiroNome(r?: Reserva): string {
    return r?.hospede?.nome.split(' ')[0] ?? '';
  }

  private async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set('');
    try {
      const inicio = toISO(new Date(this.ano(), this.mes(), 1));
      const fim = toISO(new Date(this.ano(), this.mes() + 1, 1));
      // "deHoje" inclui quem está hospedado hoje e também quem sai hoje (data_saida = hoje)
      const [doMes, deHoje] = await Promise.all([
        this.reservasSrv.listarPeriodo(inicio, fim),
        this.reservasSrv.listarPeriodo(addDias(this.hoje, -1), addDias(this.hoje, 1)),
      ]);
      this.reservas.set([...doMes, ...deHoje.filter((h) => !doMes.some((r) => r.id === h.id))]);
      this.reservasHoje.set(deHoje);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.carregando.set(false);
      setTimeout(() => this.rolarParaHoje());
    }
  }

  /** Em telas menores, rola a grade horizontalmente até o dia de hoje. */
  private rolarParaHoje(): void {
    const wrap = this.el.nativeElement.querySelector('.grade-wrap') as HTMLElement | null;
    const th = wrap?.querySelector('thead th.hoje') as HTMLElement | null;
    if (wrap && th) wrap.scrollLeft = Math.max(0, th.offsetLeft - 260);
  }
}
