import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

export interface SelectOption {
  value: string;
  label?: string;
  labelKey?: string;
}

let selectInstanceCounter = 0;

@Component({
  selector: 'app-select',
  host: {
    class: 'select-host',
    '(keydown)': 'onHostKeydown($event)',
  },
  imports: [TranslocoPipe],
  template: `
    <div class="select-field">
      @if (label()) {
        <span class="select-field__label" [id]="labelId">{{ label() }}</span>
      }

      <button
        type="button"
        class="select-field__trigger"
        role="combobox"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-controls]="listboxId"
        [attr.aria-labelledby]="label() ? labelId : null"
        [attr.aria-activedescendant]="activeOptionId()"
        (click)="toggle($event)"
      >
        <span class="select-field__value">
          @if (selectedOption(); as selected) {
            @if (selected.labelKey) {
              {{ selected.labelKey | transloco }}
            } @else {
              {{ selected.label }}
            }
          }
        </span>
        <svg class="select-field__chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M5 8l5 5 5-5"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
          />
        </svg>
      </button>

      @if (isOpen()) {
        <ul
          class="select-field__listbox"
          role="listbox"
          [id]="listboxId"
          [attr.aria-labelledby]="label() ? labelId : null"
        >
          @for (option of options(); track option.value; let index = $index) {
            <li
              class="select-field__option"
              role="option"
              [id]="optionId(index)"
              [class.select-field__option--selected]="option.value === value()"
              [class.select-field__option--active]="index === activeIndex()"
              [attr.aria-selected]="option.value === value()"
              (click)="selectOption(option.value, $event)"
              (mouseenter)="activeIndex.set(index)"
            >
              @if (option.labelKey) {
                {{ option.labelKey | transloco }}
              } @else {
                {{ option.label }}
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
    }

    .select-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
    }

    .select-field__label {
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .select-field__trigger {
      align-items: center;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      font-family: var(--font-ui);
      font-size: 14px;
      gap: var(--space-1);
      justify-content: space-between;
      padding: 8px 12px;
      text-align: left;
      transition: border-color var(--motion-fast);
      width: 100%;
    }

    .select-field__trigger:hover {
      border-color: var(--text-secondary);
    }

    .select-field__trigger:focus-visible {
      border-color: var(--accent-primary);
      outline: none;
    }

    .select-field__value {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .select-field__chevron {
      flex-shrink: 0;
      height: 16px;
      transition: transform var(--motion-fast);
      width: 16px;
    }

    .select-host:has(.select-field__trigger[aria-expanded='true']) .select-field__chevron {
      transform: rotate(180deg);
    }

    .select-field__listbox {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-md);
      left: 0;
      list-style: none;
      margin: 4px 0 0;
      max-height: 240px;
      overflow-y: auto;
      padding: 4px;
      position: absolute;
      right: 0;
      top: 100%;
      z-index: 20;
    }

    .select-field__option {
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 14px;
      padding: 8px 12px;
      transition:
        background-color var(--motion-fast),
        color var(--motion-fast);
    }

    .select-field__option:hover,
    .select-field__option--active {
      background: var(--color-neutral-100);
      color: var(--text-primary);
    }

    .select-field__option--selected {
      font-weight: 600;
    }

    :host-context(.wiloc-dark) .select-field__option:hover,
    :host-context(.wiloc-dark) .select-field__option--active {
      background: var(--color-neutral-700);
      color: var(--text-primary);
    }
  `,
})
export class SelectComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly instanceId = ++selectInstanceCounter;

  readonly label = input<string>('');
  readonly labelKey = input<string | undefined>(undefined);
  readonly value = input.required<string>();
  readonly options = input.required<SelectOption[]>();
  readonly valueChange = output<string>();

  protected readonly isOpen = signal(false);
  protected readonly activeIndex = signal(0);

  protected readonly labelId = `select-label-${this.instanceId}`;
  protected readonly listboxId = `select-listbox-${this.instanceId}`;

  protected readonly selectedOption = computed(
    () => this.options().find((option) => option.value === this.value()) ?? null,
  );

  constructor() {
    const onDocumentClick = (event: MouseEvent): void => {
      if (!this.isOpen()) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
        this.close();
      }
    };

    document.addEventListener('click', onDocumentClick);
    this.destroyRef.onDestroy(() => document.removeEventListener('click', onDocumentClick));
  }

  protected optionId(index: number): string {
    return `select-option-${this.instanceId}-${index}`;
  }

  protected activeOptionId(): string | null {
    if (!this.isOpen()) {
      return null;
    }

    const options = this.options();
    const index = this.activeIndex();
    if (index < 0 || index >= options.length) {
      return null;
    }

    return this.optionId(index);
  }

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();

    if (this.isOpen()) {
      this.close();
      return;
    }

    this.open();
  }

  protected selectOption(value: string, event: MouseEvent): void {
    event.stopPropagation();
    this.valueChange.emit(value);
    this.close();
  }

  protected onHostKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.open();
      }
      return;
    }

    const options = this.options();
    const lastIndex = options.length - 1;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.update((index) => Math.min(index + 1, lastIndex));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.update((index) => Math.max(index - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        {
          const option = options[this.activeIndex()];
          if (option) {
            this.valueChange.emit(option.value);
            this.close();
          }
        }
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(0);
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(lastIndex);
        break;
    }
  }

  private open(): void {
    const selectedIndex = this.options().findIndex((option) => option.value === this.value());
    this.activeIndex.set(selectedIndex >= 0 ? selectedIndex : 0);
    this.isOpen.set(true);
  }

  private close(): void {
    this.isOpen.set(false);
  }
}
