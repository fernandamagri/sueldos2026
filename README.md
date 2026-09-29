# Sueldos 2026

Aplicaciones web simples (HTML/CSS/JS, sin backend) para calcular el sueldo
mensual de un empleado y llevar un registro histórico de los pagos
liquidados mes a mes. Incluye dos calculadoras independientes, con
navegación entre ellas desde el encabezado de cada página:

- **`index.html`** — Comercio (CCT 130/75), Categoría A.
- **`domestica.html`** — Personal de Casas Particulares (Ley 26.844), con
  retiro (sin cama adentro).

## Cómo usarla

No requiere instalación ni servidor: alcanza con abrir `index.html` o
`domestica.html` en el navegador. Todos los datos (empleado/a, parámetros y
pagos) se guardan en el `localStorage` del navegador, en claves separadas
por calculadora, así que quedan disponibles entre sesiones en el mismo
dispositivo/navegador.

Si preferís levantarla con un servidor local (por ejemplo para evitar
restricciones de `file://` en algunos navegadores):

```bash
python3 -m http.server 8000
# luego abrir http://localhost:8000
```

## Comercio — Categoría A (`index.html`)

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
5. **Adelantos (anticipos)**: una sección para cargar cada adelanto que le
   entregues al empleado durante el mes (período, fecha, monto y nota), para
   no perderlos de vista. Al liquidar el período, la app muestra el total de
   adelantos cargados y lo usa para comparar contra lo pagado.
6. **Sueldo pagado vs. sueldo según ley**: además del cálculo legal (ahora
   llamado "Sueldo según ley a pagar"), se puede cargar lo que efectivamente
   le pagaste ("Sueldo pagado"). La app muestra la diferencia entre lo
   pagado más los adelantos del período contra el sueldo según ley, e indica
   si falta pagar algo o si se pagó de más.
7. **Registro de pagos**: cada liquidación calculada se puede guardar como un
   pago del mes, incluyendo el sueldo según ley, los adelantos del período,
   lo pagado y la diferencia. Queda en una tabla histórica editable (se
   puede eliminar un registro) y exportable a CSV.

## Personal de Casas Particulares — con retiro (`domestica.html`)

Pensada para una empleada que trabaja por hora y no vive en el domicilio
(con retiro / sin cama adentro), por ejemplo 52 horas mensuales.

1. **Datos de la empleada**: nombre, categoría (tareas generales, tareas
   específicas, asistencia y cuidado de personas, caseros/as o supervisor/a)
   y fecha de ingreso.
2. **Parámetros**: % de antigüedad (1% por año, según Ley 26.844, calculado
   con antigüedad computable recién desde el 1/9/2020) y una casilla
   opcional para **retener el aporte jubilatorio personal** del sueldo.
   Por defecto la app **no** descuenta nada del sueldo de la empleada: el
   aporte y la contribución mensual que corresponde declarar y pagar a ARCA
   (jubilación + obra social + ART) es, salvo acuerdo en contrario, un costo
   a cargo del empleador, y se muestra aparte como referencia según las
   horas semanales contratadas — no se resta automáticamente del neto.
3. **Escala de referencia (valores hora sugeridos)**: tabla editable por
   categoría y vigencia, precargada con los valores "con retiro" de
   septiembre de 2026 relevados de fuentes públicas (iProfesional, CNTCP) el
   29/09/2026. **Hay que verificarlos contra la resolución oficial de la
   CNTCP** y agregar filas nuevas con cada actualización.
4. **Liquidación del período**: horas trabajadas en el mes (por defecto 52)
   × valor hora sugerido, más antigüedad y extra remunerativo (si
   corresponde), menos la retención opcional, más el adicional no
   remunerativo. También muestra, solo a modo informativo, el monto de
   referencia del aporte y contribución mensual a ARCA según el tramo de
   horas semanales contratadas (menos de 12, de 12 a 15, o 16 o más).
5. **Adelantos (anticipos)** y **sueldo pagado vs. sueldo según ley**: igual
   que en la calculadora de Comercio, para no olvidar los adelantos
   entregados durante el mes y comparar lo pagado contra lo que corresponde
   según ley.
6. **Registro de pagos**: igual que en la calculadora de Comercio, con
   exportación a CSV.

## Importante

Estas herramientas son una **ayuda de cálculo aproximada** y no reemplazan
el recibo de sueldo oficial ni el asesoramiento de un estudio
contable/laboral. Antes de liquidar cada período, actualizá los valores de
referencia (básico, valor hora, alícuotas y aportes) según la escala
vigente publicada por la fuente oficial correspondiente (FAECYS/CCT 130/75
para Comercio, CNTCP/ARCA para casas particulares).
