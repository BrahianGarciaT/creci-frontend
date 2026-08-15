// Metadatos de paginación devueltos por el backend en los endpoints de listado
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Envelope de respuesta paginada — reemplaza el arreglo plano `T[]` en los
// endpoints de listado (GET /projects, /projects/mine, /tasks, /tasks/project/:id)
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}
