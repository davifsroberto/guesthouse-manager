import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage), title: 'Entrar' },
  { path: 'ajuda', loadComponent: () => import('./pages/ajuda.page').then((m) => m.AjudaPage), title: 'Ajuda' },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'calendario' },
      {
        path: 'calendario',
        loadComponent: () => import('./pages/calendario.page').then((m) => m.CalendarioPage),
        title: 'Calendário de ocupação',
      },
      {
        path: 'reservas',
        loadComponent: () => import('./pages/reservas.page').then((m) => m.ReservasPage),
        title: 'Reservas',
      },
      {
        path: 'reservas/nova',
        loadComponent: () => import('./pages/reserva-form.page').then((m) => m.ReservaFormPage),
        title: 'Nova reserva',
      },
      {
        path: 'reservas/:id/editar',
        loadComponent: () => import('./pages/reserva-form.page').then((m) => m.ReservaFormPage),
        title: 'Editar reserva',
      },
      {
        path: 'reservas/:id',
        loadComponent: () => import('./pages/reserva-detalhe.page').then((m) => m.ReservaDetalhePage),
        title: 'Reserva',
      },
      {
        path: 'hospedes',
        loadComponent: () => import('./pages/hospedes.page').then((m) => m.HospedesPage),
        title: 'Hóspedes',
      },
      {
        path: 'financeiro',
        loadComponent: () => import('./pages/financeiro.page').then((m) => m.FinanceiroPage),
        title: 'Financeiro',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
