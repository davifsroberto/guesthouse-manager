-- =====================================================================
-- Guesthouse Manager - Pousada Pouso no Curral
-- Script de criação do banco (cole no Supabase > SQL Editor > Run)
-- Pode ser executado mais de uma vez: ele apaga e recria as tabelas.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

drop table if exists pagamentos cascade;
drop table if exists reservas cascade;
drop table if exists hospedes cascade;
drop table if exists acomodacoes cascade;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table acomodacoes (
  id          bigint generated always as identity primary key,
  codigo      text not null unique,
  nome        text not null,
  tipo        text not null check (tipo in ('chale', 'suite')),
  capacidade  int  not null check (capacidade > 0),
  diaria      numeric(10,2) not null check (diaria >= 0),
  ativo       boolean not null default true
);

create table hospedes (
  id          bigint generated always as identity primary key,
  nome        text not null,
  telefone    text,
  documento   text,
  email       text,
  cidade      text,
  created_at  timestamptz not null default now()
);

create table reservas (
  id              bigint generated always as identity primary key,
  hospede_id      bigint not null references hospedes(id),
  acomodacao_id   bigint not null references acomodacoes(id),
  data_entrada    date not null,
  data_saida      date not null,
  num_hospedes    int  not null default 1 check (num_hospedes > 0),
  valor_total     numeric(10,2) not null default 0 check (valor_total >= 0),
  status          text not null default 'reservada'
                  check (status in ('reservada', 'hospedado', 'finalizada', 'cancelada')),
  observacoes     text,
  checkin_em      timestamptz,
  checkout_em     timestamptz,
  created_at      timestamptz not null default now(),
  constraint datas_validas check (data_saida > data_entrada),
  -- Garante no BANCO que nunca haverá dupla reserva da mesma acomodação
  -- (reservas canceladas não contam).
  constraint sem_dupla_reserva exclude using gist (
    acomodacao_id with =,
    daterange(data_entrada, data_saida, '[)') with &&
  ) where (status <> 'cancelada')
);

create table pagamentos (
  id          bigint generated always as identity primary key,
  reserva_id  bigint not null references reservas(id) on delete cascade,
  valor       numeric(10,2) not null check (valor > 0),
  data        date not null default current_date,
  forma       text not null check (forma in ('pix', 'dinheiro', 'cartao', 'transferencia')),
  tipo        text not null default 'parcela' check (tipo in ('sinal', 'parcela', 'saldo')),
  observacao  text,
  created_at  timestamptz not null default now()
);

create index on reservas (data_entrada, data_saida);
create index on reservas (hospede_id);
create index on pagamentos (reserva_id);

-- ---------------------------------------------------------------------
-- Segurança (Row Level Security): só usuários logados acessam os dados
-- ---------------------------------------------------------------------
alter table acomodacoes enable row level security;
alter table hospedes    enable row level security;
alter table reservas    enable row level security;
alter table pagamentos  enable row level security;

create policy "logados - acomodacoes" on acomodacoes for all to authenticated using (true) with check (true);
create policy "logados - hospedes"    on hospedes    for all to authenticated using (true) with check (true);
create policy "logados - reservas"    on reservas    for all to authenticated using (true) with check (true);
create policy "logados - pagamentos"  on pagamentos  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- Dados iniciais: 8 chalés + 4 suítes
-- ---------------------------------------------------------------------
insert into acomodacoes (codigo, nome, tipo, capacidade, diaria) values
  ('01', 'Chalé Araucária', 'chale', 4, 380),
  ('02', 'Chalé Jacarandá', 'chale', 4, 380),
  ('03', 'Chalé Ipê',       'chale', 5, 420),
  ('04', 'Chalé Quaresmeira','chale', 4, 380),
  ('05', 'Chalé Manacá',    'chale', 3, 340),
  ('06', 'Chalé Cedro',     'chale', 3, 340),
  ('07', 'Chalé Jequitibá', 'chale', 6, 480),
  ('08', 'Chalé Paineira',  'chale', 2, 300),
  ('S1', 'Suíte Mantiqueira','suite', 2, 260),
  ('S2', 'Suíte Cachoeira', 'suite', 2, 260),
  ('S3', 'Suíte Pomar',     'suite', 3, 290),
  ('S4', 'Suíte Horta',     'suite', 2, 240);

-- ---------------------------------------------------------------------
-- Dados de EXEMPLO (fictícios) para demonstração.
-- As datas são relativas a hoje, então o calendário sempre terá movimento.
-- Para começar com o banco vazio, apague daqui até o final antes de rodar.
-- ---------------------------------------------------------------------
insert into hospedes (nome, telefone, documento, email, cidade) values
  ('Ana Exemplo Silva',      '(11) 90000-0001', '000.000.000-01', 'ana@exemplo.com',     'São Paulo/SP'),
  ('Bruno Fictício Souza',   '(21) 90000-0002', '000.000.000-02', 'bruno@exemplo.com',   'Rio de Janeiro/RJ'),
  ('Carla Teste Oliveira',   '(31) 90000-0003', '000.000.000-03', 'carla@exemplo.com',   'Belo Horizonte/MG'),
  ('Diego Demo Santos',      '(12) 90000-0004', '000.000.000-04', 'diego@exemplo.com',   'São José dos Campos/SP'),
  ('Elisa Modelo Costa',     '(35) 90000-0005', '000.000.000-05', 'elisa@exemplo.com',   'Pouso Alegre/MG'),
  ('Fábio Amostra Lima',     '(19) 90000-0006', '000.000.000-06', 'fabio@exemplo.com',   'Campinas/SP');

insert into reservas (hospede_id, acomodacao_id, data_entrada, data_saida, num_hospedes, valor_total, status, observacoes, checkin_em) values
  (1, 3,  current_date - 1, current_date + 2, 4, 1260, 'hospedado',  'Família com criança pequena - berço no chalé', now() - interval '1 day'),
  (2, 1,  current_date,     current_date + 3, 2, 1140, 'reservada',  'Chegada prevista às 16h', null),
  (3, 9,  current_date - 2, current_date,     2, 520,  'hospedado',  null, now() - interval '2 days'),
  (4, 7,  current_date + 4, current_date + 7, 6, 1440, 'reservada',  'Grupo de amigos - pediram café da manhã reforçado', null),
  (5, 5,  current_date + 1, current_date + 3, 3, 680,  'reservada',  null, null),
  (6, 11, current_date + 8, current_date + 12,3, 1160, 'reservada',  'Hóspede recorrente', null),
  (1, 3,  current_date - 40, current_date - 37, 4, 1260, 'finalizada', 'Estadia anterior', now() - interval '40 days');

update reservas set checkout_em = now() - interval '37 days' where status = 'finalizada';

insert into pagamentos (reserva_id, valor, data, forma, tipo) values
  (1, 630,  current_date - 10, 'pix',      'sinal'),
  (2, 570,  current_date - 5,  'pix',      'sinal'),
  (3, 520,  current_date - 2,  'cartao',   'saldo'),
  (4, 400,  current_date - 1,  'transferencia', 'sinal'),
  (7, 630,  current_date - 50, 'pix',      'sinal'),
  (7, 630,  current_date - 37, 'dinheiro', 'saldo');
