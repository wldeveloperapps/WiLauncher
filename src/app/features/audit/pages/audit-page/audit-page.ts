import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuditLogEntry } from '../../../../core/models/audit-log.model';
import { roleLabel } from '../../../../core/models/role.model';
import { AuditService } from '../../../../core/services/audit.service';
import { EnvChip } from '../../../../shared/ui/env-chip/env-chip';
import { ProviderGlyph } from '../../../../shared/ui/provider-glyph/provider-glyph';

@Component({
  selector: 'app-audit-page',
  imports: [EnvChip, ProviderGlyph, TranslocoPipe],
  templateUrl: './audit-page.html',
  styleUrl: './audit-page.scss',
})
export class AuditPage {
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
