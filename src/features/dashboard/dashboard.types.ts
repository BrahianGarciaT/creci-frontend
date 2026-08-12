// Tipos del frontend de dashboard — reflejan verbatim los DTOs del backend
// (ver `sdd/dashboard-backend-stats/design`). No hay re-agregación ni
// re-filtrado en el cliente: el backend ya entrega los datos con el scope
// y las zonas vacías/cero resueltas.

export type StatusCounts = Record<'todo' | 'in_progress' | 'done' | 'cancelled', number>;

export interface TrendPoint {
  date: string; // ISO 'YYYY-MM-DD'
  count: number;
}

export interface CompletionTrend {
  granularity: 'day';
  from: string;
  to: string;
  points: TrendPoint[];
}

export interface WorkloadEntry {
  userId: string;
  email: string;
  open: number;
  done: number;
  overdue: number;
}

export interface OverdueEntry {
  id: string;
  title: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  assigneeEmail: string | null;
}

export interface ProjectHealth {
  projectId: string;
  name: string;
  total: number;
  counts: StatusCounts;
  completionRate: number | null; // null cuando total === 0
}

export interface DashboardOverviewDto {
  scope: 'org' | 'participant';
  projects: ProjectHealth[];
  workload: WorkloadEntry[];
  overdue: OverdueEntry[];
  overdueCount: number;
  trend: CompletionTrend;
}

export interface ProjectDashboardDto {
  projectId: string;
  name: string;
  total: number;
  counts: StatusCounts;
  workload: WorkloadEntry[];
  overdue: OverdueEntry[];
  overdueCount: number;
  trend: CompletionTrend;
}
