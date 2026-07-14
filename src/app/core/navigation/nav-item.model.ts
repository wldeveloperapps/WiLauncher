export type NavIcon = 'grid';

export interface NavItemConfig {
  labelKey: string;
  icon: NavIcon;
  order: number;
  hidden?: boolean;
}

export interface NavItem extends NavItemConfig {
  path: string;
  exact: boolean;
}
