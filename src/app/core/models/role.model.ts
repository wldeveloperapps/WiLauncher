export const ROLES = ['viewer', 'operator', 'admin'] as const;

export type UserRole = (typeof ROLES)[number];

export function canOperate(role: UserRole): boolean {
  return role === 'operator' || role === 'admin';
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'operator':
      return 'Operator';
    default:
      return 'Viewer';
  }
}
