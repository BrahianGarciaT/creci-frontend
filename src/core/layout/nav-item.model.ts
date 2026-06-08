export interface NavItem {
  label: string;
  icon: string;
  route: string;
  requiredRole?: 'admin' | 'developer';
  disabled?: boolean;
}
