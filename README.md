# Sueldos 2026 — Comercio Categoría A

Aplicación web simple (HTML/CSS/JS, sin backend) para calcular el sueldo mensual
de un empleado de Comercio (CCT 130/75) en la **Categoría A** y llevar un
registro histórico de los pagos liquidados mes a mes.

## Cómo usarla

No requiere instalación ni servidor: alcanza con abrir `index.html` en el
navegador. Todos los datos (empleado, parámetros y pagos) se guardan en el
`localStorage` del navegador, así que quedan disponibles entre sesiones en el
mismo dispositivo/navegador.

Si preferís levantarla con un servidor local (por ejemplo para evitar
restricciones de `file://` en algunos navegadores):

```bash
python3 -m http.server 8000
# luego abrir http://localhost:8000
```

## Qué calcula

1. **Datos del empleado**: nombre y fecha de ingreso (se usa para calcular la
   antigüedad automáticamente en cada período).
2. **Parámetros de liquidación**: porcentajes de antigüedad, presentismo,
   jubilación, ley 19.032, obra social y cuota sindical (opcional). Estos
   valores deben verificarse contra la escala salarial y las alícuotas
   vigentes publicadas por FAECYS / CCT 130/75, ya que se actualizan por
   paritaria.
3. **Escala de referencia (básicos sugeridos)**: una tabla editable de
   básicos por rama (Administrativo A, Maestranza A, Vendedor A) y fecha de
   vigencia. Viene precargada con los valores de septiembre de 2026
   relevados de fuentes públicas (Infobae, FAECYS, CalculAR) el 29/09/2026,
   pero **hay que verificarlos contra la circular oficial de FAECYS** y
   agregar una fila nueva cada vez que salga una actualización de paritaria
   para que la sugerencia se mantenga al día.
4. **Liquidación del período**: se elige el período y, con el botón
   "Sugerir básico actualizado", la app completa el básico y el adicional no
   remunerativo según la rama del empleado y la fila vigente más reciente de
   la escala de referencia (siempre editable a mano). Además del básico se
   puede cargar un **extra remunerativo** (comisión, premio, bono, etc.),
   que se suma a la remuneración bruta y sí tributa descuentos, a diferencia
   del adicional no remunerativo. Calcula antigüedad, presentismo,
   remuneración bruta, descuentos y el neto a cobrar.
5. **Registro de pagos**: cada liquidación calculada se puede guardar como un
   pago del mes. Queda en una tabla histórica editable (se puede eliminar un
   registro) y exportable a CSV.

## Importante

Esta herramienta es una **ayuda de cálculo aproximada** y no reemplaza el
recibo de sueldo oficial ni asesoramiento de un estudio contable/laboral.
Antes de liquidar cada período, actualizá el básico y las alícuotas según la
escala vigente.
