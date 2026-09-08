# Reglas de Negocio

## RN-001 — Anticipo
El anticipo mensual corresponde al 50% del salario base.

```text
Anticipo = SalarioBase × 0.50
```

Se entrega el día 15.

## RN-002 — Aplicación del anticipo
El anticipo es un pago ya efectuado, no un descuento legal.

```text
SalarioLiquido = TotalIngresos - TotalEgresos
PagoFinal = SalarioLiquido - Anticipo
```

## RN-003 — Valor hora ordinaria
Por consistencia con la implementación anterior, el valor de hora puede calcularse con base mensual de 30 días y 8 horas diarias:

```text
ValorHora = SalarioBase / 240
```

Si el análisis académico define posteriormente otra base, esta regla debe actualizarse.

## RN-004 — Hora extra
```text
HoraExtra = ValorHora × 1.5
```

## RN-005 — Hora doble
```text
HoraDoble = ValorHora × 2
```

Domingos y días festivos se consideran tiempo doble.

## RN-006 — Bonificación Decreto
Monto mensual fijo:

```text
Q250.00
```

## RN-007 — Producción
```text
BonificacionProduccion = Piezas × Q0.01
```

El usuario registra piezas, no el monto final.

## RN-008 — Departamento con comisión
Solo empleados de Mercadeo aplican al esquema de comisiones definido.

## RN-009 — Comisión 0%
Ventas de Q0 a Q100,000:

```text
0%
```

## RN-010 — Comisión 2.5%
Ventas de Q100,001 a Q200,000:

```text
2.5%
```

## RN-011 — Comisión 3.5%
Ventas de Q200,001 a Q400,000:

```text
3.5%
```

## RN-012 — Comisión 4.5%
Ventas desde Q400,001:

```text
4.5%
```

## RN-013 — Cálculo de comisión
```text
Comision = TotalVentas × PorcentajeRango
```

## RN-014 — IGSS laboral
```text
IGSSLaboral = BaseSujetaIGSS × 4.83%
```

Se descuenta al empleado.

## RN-015 — IGSS patronal
```text
IGSSPatronal = BaseSujetaIGSS × 10.67%
```

Lo asume Consulting, S.A. y no reduce el pago al empleado.

## RN-016 — ISR
Calcular mediante proyección anual conforme al régimen aplicable a rentas del trabajo en relación de dependencia en Guatemala.

No reutilizar ciegamente umbrales del sistema legacy.

## RN-017 — Ahorro Solidarista
```text
AhorroSolidarista = SalarioBase × 3%
```

## RN-018 — Compra Solidarista
Una compra puede ser:
- contado;
- financiada.

## RN-019 — Plazo máximo de compra
El financiamiento no puede superar 6 meses.

## RN-020 — Cuota de compra
La cuota correspondiente al período se descuenta automáticamente de nómina.

## RN-021 — Ausencia
Una ausencia solo afecta salario si fue:
1. aprobada por el jefe correspondiente;
2. marcada a cuenta de salario.

## RN-022 — Período único
Solo puede existir un período por combinación mes + año.

## RN-023 — Estado del período
Estados:
- ABIERTO
- CERRADO

## RN-024 — Período abierto
Permite registrar y procesar información operativa.

## RN-025 — Período cerrado
No permite modificaciones ordinarias y se conserva para consulta/reportes.

## RN-026 — Anticipo y fin de mes
Ambos pertenecen al mismo período mensual.

## RN-027 — Histórico
Los valores de una nómina cerrada no deben cambiar automáticamente si después se modifican parámetros.

## RN-028 — Autorización
Una acción solo puede ejecutarse si el usuario posee el permiso correspondiente en backend.
