# Creci App — Frontend

Aplicación web de Creci App para la gestión de proyectos y tareas: login, dashboard con métricas, administración de proyectos, tareas y usuarios.

## Stack

- [Angular](https://angular.dev/) 22 (standalone components, sin NgModules)
- Angular Material + Angular CDK para UI
- Signals nativos de Angular para estado
- Chart.js para gráficos del dashboard
- SCSS para estilos
- pnpm como gestor de paquetes
- Vitest + Testing Library para tests

## Requisitos previos

- Node.js 20+
- pnpm 11 (`corepack enable` si no lo tenés instalado)
- El [backend](../backend/README.md) corriendo en `http://localhost:3000` (o la URL que configures)

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   pnpm install
   ```

2. Correr la aplicación en modo desarrollo:

   ```bash
   pnpm start
   ```

   Queda disponible en `http://localhost:4200`.

No usa archivos `.env`: la URL del backend se configura en `src/environments/environment.ts` (desarrollo) y `src/environments/environment.prod.ts` (producción), a través de la propiedad `apiUrl`.

## Scripts disponibles

| Script | Descripción |
|---|---|
| `pnpm start` | Levanta la app en modo desarrollo (`ng serve`) |
| `pnpm build` | Compila la app para producción |
| `pnpm watch` | Compila en modo watch con configuración de desarrollo |
| `pnpm test` | Corre los tests con Vitest |

## Estructura del proyecto

```
src/app/
├── core/            # Guards, interceptors, layout y servicios transversales (auth, shell)
├── features/        # Módulos de negocio, cada uno con rutas lazy-loaded
│   ├── auth/
│   ├── dashboard/
│   ├── projects/
│   ├── tasks/
│   └── users/
├── shared/ui/       # Componentes reutilizables
└── app.routes.ts    # Configuración de rutas raíz
```

## Autenticación y rutas

Las rutas de cada feature se cargan de forma lazy (`loadChildren`) y están protegidas con guards:

- `authGuard` — requiere sesión iniciada
- `noAuthGuard` — solo accesible sin sesión (login, registro)
- `adminGuard` — restringe acceso a usuarios admin

## Conexión con el backend

Todas las peticiones HTTP se hacen contra `environment.apiUrl` usando `HttpClient`. Si cambiás el puerto o la URL del backend, actualizá esa propiedad en `src/environments/environment.ts`.
