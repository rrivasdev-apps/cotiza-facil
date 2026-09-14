# Consola de Presupuestos

Ver [CLAUDE.md](./CLAUDE.md) para el brief completo del proyecto (modelo de datos, stack, orden de implementación).

## Desarrollo

```bash
npm install
npm run dev
```

Copiar `.env.local.example` a `.env.local` y completar con las credenciales del proyecto Supabase.

## Base de datos

El esquema vive en [schema.sql](./schema.sql) y está espejado como migración en `supabase/migrations/`. Correrlo contra el proyecto Supabase (SQL editor o `supabase db push`) y confirmar el aislamiento de RLS entre cuentas antes de avanzar al paso 2.
