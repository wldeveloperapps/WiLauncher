import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuditLogEntry } from '../../../../core/models/audit-log.model';
import { roleLabel } from '../../../../core/models/role.model';
import { AuditService } from '../../../../core/services/audit.service';
import { PageShellComponent } from '../../../../core/layouts/page-shell/page-shell.component';
import { EnvChipComponent } from '../../../../shared/ui/env-chip/env-chip.component';
import { ProviderGlyphComponent } from '../../../../shared/ui/provider-glyph/provider-glyph.component';

@Component({
  selector: 'app-audit-page',
  imports: [EnvChipComponent, PageShellComponent, ProviderGlyphComponent, TranslocoPipe],
  templateUrl: './audit-page.component.html',
  styleUrl: './audit-page.component.scss',
})
export class AuditPageComponent {
  protected readonly auditService = inject(AuditService);
  protected readonly roleLabel = roleLabel;

  protected formatTimestamp(date: Date | null): string {
    if (!date) return '—';
    return date.toISOString().replace('T', ' ').slice(0, 19) + 'Z';
  }

  protected actionLabel(action: AuditLogEntry['action']): string {
    return action === 'start_machine' ? 'audit.startAction' : 'audit.stopAction';
  }
}
