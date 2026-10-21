export type TipoAcomodacao = 'chale' | 'suite';
export type StatusReserva = 'reservada' | 'hospedado' | 'finalizada' | 'cancelada';
export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao' | 'transferencia';
export type TipoPagamento = 'sinal' | 'parcela' | 'saldo';

export interface Acomodacao {
  id: number;
  codigo: string;
  nome: string;
  tipo: TipoAcomodacao;
  capacidade: number;
  diaria: number;
  ativo: boolean;
}

export interface Hospede {
  id: number;
  nome: string;
  telefone: string | null;
  documento: string | null;
  email: string | null;
  cidade: string | null;
  created_at?: string;
}

export interface Pagamento {
  id: number;
  reserva_id: number;
  valor: number;
  data: string; // yyyy-mm-dd
  forma: FormaPagamento;
  tipo: TipoPagamento;
  observacao: string | null;
}

export interface Reserva {
  id: number;
  hospede_id: number;
  acomodacao_id: number;
  data_entrada: string; // yyyy-mm-dd
  data_saida: string; // yyyy-mm-dd
  num_hospedes: number;
  valor_total: number;
  status: StatusReserva;
  observacoes: string | null;
  checkin_em: string | null;
  checkout_em: string | null;
  // relacionamentos (vindos do select do Supabase)
  hospede?: Hospede;
  acomodacao?: Acomodacao;
  pagamentos?: Pagamento[];
}

export const STATUS_LABEL: Record<StatusReserva, string> = {
  reservada: 'Reservada',
  hospedado: 'Hospedado',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

export const FORMA_LABEL: Record<FormaPagamento, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  transferencia: 'Transferência',
};

export const TIPO_PAGAMENTO_LABEL: Record<TipoPagamento, string> = {
  sinal: 'Sinal (entrada)',
  parcela: 'Parcela',
  saldo: 'Saldo final',
};

export function totalPago(r: Reserva): number {
  return (r.pagamentos ?? []).reduce((s, p) => s + Number(p.valor), 0);
}

export function saldo(r: Reserva): number {
  return Math.max(0, Number(r.valor_total) - totalPago(r));
}
