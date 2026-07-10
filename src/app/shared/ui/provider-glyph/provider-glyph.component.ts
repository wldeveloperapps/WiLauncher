import { Component, input } from '@angular/core';

import { Provider, providerInitial, providerLabel } from '../../../core/models/machine.model';

@Component({
  selector: 'app-provider-glyph',
  template: `
    <span
      class="provider-glyph"
      [class]="'provider-glyph--' + provider()"
      [attr.title]="providerLabel(provider())"
    >
      {{ providerInitial(provider()) }}
    </span>
  `,
  styles: `
    .provider-glyph {
      align-items: center;
      border-radius: var(--radius-sm);
      color: var(--color-white);
      display: inline-flex;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      height: 28px;
      justify-content: center;
      width: 28px;
    }

    .provider-glyph--aws {
      background: var(--color-aws);
    }

    .provider-glyph--azure {
      background: var(--color-azure);
    }

    .provider-glyph--gcp {
      background: var(--color-gcp);
    }

    .provider-glyph--oci {
      background: var(--color-oci);
    }
  `,
})
export class ProviderGlyphComponent {
  readonly provider = input.required<Provider>();

  protected providerLabel = providerLabel;
  protected providerInitial = providerInitial;
}
