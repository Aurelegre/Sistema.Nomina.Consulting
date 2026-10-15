# Contexto para desarrollo y Codex

Esta carpeta centraliza las decisiones funcionales y técnicas del proyecto 2026.

## Documentos oficiales del proyecto

- `PROJECT_CONTEXT.md`: alcance general.
- `REQUIREMENTS_2026.md`: catálogo funcional fuente de verdad.
- `BUSINESS_RULES.md`: reglas de cálculo y comportamiento.
- `ARCHITECTURE.md`: arquitectura técnica.
- `AUTHORIZATION.md`: autenticación, roles y permisos.
- `UI_GUIDELINES.md`: estándar de interfaz.
- `GIT_WORKFLOW.md`: estrategia de ramas y merges.
- `CURRENT_STATUS.md`: estado actual y próximas features.

## Documentos internos

La carpeta `internal/` contiene únicamente información para acelerar el desarrollo usando el sistema ASP.NET Core 8 anterior como referencia.

No debe utilizarse como documentación académica entregable:

- `LEGACY_SYSTEM_REFERENCE.md`
- `LEGACY_DATABASE_MAPPING.md`
- `MIGRATION_DECISIONS.md`

## Jerarquía

Ante contradicciones:

1. REQUIREMENTS_2026
2. BUSINESS_RULES
3. ARCHITECTURE / AUTHORIZATION / UI_GUIDELINES
4. Documentos internos
5. Código legacy
