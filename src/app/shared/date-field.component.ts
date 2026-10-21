import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { brParaISO, isoParaBR, mascaraData } from '../core/datas';

/**
 * Campo de data digitável (dd/mm/aaaa), pedido no piloto: a proprietária preferiu
 * digitar a data em vez de usar o calendário do navegador.
 * O valor do campo (ngModel) é sempre 'yyyy-mm-dd' ou '' quando inválido/vazio.
 */
@Component({
  selector: 'app-date-field',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateFieldComponent), multi: true }],
  template: `
    <input
      type="text"
      inputmode="numeric"
      placeholder="dd/mm/aaaa"
      maxlength="10"
      [id]="inputId()"
      [value]="texto()"
      [disabled]="desabilitado()"
      [class.invalido]="invalido()"
      (input)="aoDigitar($any($event.target))"
      (blur)="tocado()"
    />
    @if (invalido()) {
      <small class="erro-campo">Data inválida. Use o formato dd/mm/aaaa.</small>
    }
  `,
  styles: `:host { display: block; } input { width: 100%; }`,
})
export class DateFieldComponent implements ControlValueAccessor {
  readonly inputId = input<string>('');

  protected readonly texto = signal('');
  protected readonly invalido = signal(false);
  protected readonly desabilitado = signal(false);

  private onChange: (v: string) => void = () => {};
  protected tocado: () => void = () => {};

  writeValue(v: string | null): void {
    this.texto.set(isoParaBR(v));
    this.invalido.set(false);
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.tocado = fn;
  }
  setDisabledState(d: boolean): void {
    this.desabilitado.set(d);
  }

  protected aoDigitar(el: HTMLInputElement): void {
    const formatado = mascaraData(el.value);
    el.value = formatado;
    this.texto.set(formatado);
    const iso = formatado.length === 10 ? brParaISO(formatado) : null;
    this.invalido.set(formatado.length === 10 && !iso);
    this.onChange(iso ?? '');
  }
}
