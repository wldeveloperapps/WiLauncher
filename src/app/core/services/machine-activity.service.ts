import { Injectable } from '@angular/core';

import { getMockMachineActivity } from '../data/mock-machine-activity';
import { Machine } from '../models/machine.model';
import { MachineActivityLog } from '../models/machine-activity.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MachineActivityService {
  getActivity(machine: Machine): MachineActivityLog[] {
    if (!environment.useMockMachines) {
      return [];
    }

    const keys = [machine.machineId, machine.id].filter(Boolean) as string[];
    for (const key of keys) {
      const logs = getMockMachineActivity(key);
      if (logs.length > 0) {
        return logs;
      }
    }

    return getMockMachineActivity(machine.id);
  }
}
