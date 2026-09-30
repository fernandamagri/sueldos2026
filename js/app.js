"use strict";

const STORAGE_KEY = "sueldos2026.comercio-categoria-a";

const RAMAS = {
  administrativo: "Administrativo A",
  maestranza: "Maestranza A",
  vendedor: "Vendedor A",
};

const EMAIL_CONTROL_PAGOS = "fernandamagri@hotmail.com";
const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// Básicos de referencia cargados desde fuentes públicas (Infobae, FAECYS, CalculAR)
// el 29/09/2026, correspondientes a la escala CCT 130/75 vigente en septiembre 2026
// (tercera cuota del acuerdo julio-septiembre 2026, +5,7% acumulado). Son un punto de
// partida: agregá o corregí filas acá a medida que salgan nuevas circulares de FAECYS.
const ESCALA_REFERENCIA_SEED = [
  {
    id: "seed-administrativo-2026-09",
    rama: "administrativo",
    vigenciaDesde: "2026-09",
    basico: 1196632,
    noRemunerativo: 120000,
    fuente: "Infobae / FAECYS (CCT 130/75, set-2026)",
  },
  {
    id: "seed-maestranza-2026-09",
    rama: "maestranza",
    vigenciaDesde: "2026-09",
    basico: 1183900,
    noRemunerativo: 120000,
    fuente: "CalculAR (CCT 130/75, set-2026)",
  },
  {
    id: "seed-vendedor-2026-09",
    rama: "vendedor",
    vigenciaDesde: "2026-09",
    basico: 1200875,
    noRemunerativo: 120000,
    fuente: "Búsqueda pública (CCT 130/75, set-2026)",
  },
];

const DEFAULT_STATE = {
  empleado: { nombre: "", categoria: "Comercio — Categoría A", rama: "administrativo", ingreso: "" },
  config: {
    antiguedadPct: 1,
    presentismoPct: 8.33,
    jubilacionPct: 11,
    ley19032Pct: 3,
    obraSocialPct: 3,
    sindicatoActivo: false,
    sindicatoPct: 2.5,
  },
  pagos: [], // { id, periodo, basico, antiguedadAnios, antiguedadMonto, presentismoMonto, bruto, descJubilacion, descLey19032, descObraSocial, descSindicato, totalDescuentos, noRemunerativo, neto, adelantosPeriodo, sueldoPagado, diferencia, registradoEn }
  escalaReferencia: ESCALA_REFERENCIA_SEED, // básicos sugeridos por rama y período de vigencia
  adelantos: [], // { id, periodo, fecha, monto, nota }
};

function cargarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      empleado: { ...DEFAULT_STATE.empleado, ...(parsed.empleado || {}) },
      config: { ...DEFAULT_STATE.config, ...(parsed.config || {}) },
      pagos: Array.isArray(parsed.pagos) ? parsed.pagos : [],
      escalaReferencia: Array.isArray(parsed.escalaReferencia)
        ? parsed.escalaReferencia
        : structuredClone(ESCALA_REFERENCIA_SEED),
      adelantos: Array.isArray(parsed.adelantos) ? parsed.adelantos : [],
    };
  } catch (e) {
    console.warn("No se pudo leer el estado guardado, se usa uno nuevo.", e);
    return structuredClone(DEFAULT_STATE);
  }
}

function guardarEstado() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch (e) {
    console.warn("No se pudo guardar el estado (almacenamiento no disponible).", e);
  }
}

let estado = cargarEstado();

const $ = (id) => document.getElementById(id);

const fmtMoneda = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n || 0);

let toastTimeout = null;
function mostrarMensaje(texto) {
  const toast = $("app-toast");
  toast.textContent = texto;
  toast.classList.remove("oculto");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add("oculto"), 3500);
}

// Confirmación en dos pasos dentro de la propia página (no usamos confirm()/alert()
// del navegador porque algunos visores, como el de vista previa de artifacts, no los
// muestran y devuelven siempre "cancelar" sin avisar).
function iniciarConfirmacion(btn, textoConfirmar) {
  if (!btn.dataset.textoOriginal) btn.dataset.textoOriginal = btn.textContent;
  btn.dataset.confirmando = "1";
  btn.textContent = textoConfirmar;
  btn.classList.add("btn-confirmando");
  clearTimeout(btn._confirmTimeout);
  btn._confirmTimeout = setTimeout(() => finalizarConfirmacion(btn), 4000);
}

function finalizarConfirmacion(btn) {
  clearTimeout(btn._confirmTimeout);
  btn.dataset.confirmando = "0";
  if (btn.dataset.textoOriginal) btn.textContent = btn.dataset.textoOriginal;
  btn.classList.remove("btn-confirmando");
}

function manejarClickConfirmable(btn, textoConfirmar, alConfirmar) {
  if (btn.dataset.confirmando === "1") {
    finalizarConfirmacion(btn);
    alConfirmar();
  } else {
    iniciarConfirmacion(btn, textoConfirmar);
  }
}

function calcularAniosAntiguedad(fechaIngreso, periodoAAAAMM) {
  if (!fechaIngreso || !periodoAAAAMM) return 0;
  // Comparación por mes, no por día: el período a liquidar es un mes completo, así que si
  // ingresó en septiembre, el período de septiembre de un año posterior ya cuenta el año
  // cumplido, sin importar el día exacto de ingreso dentro de ese mes.
  const [anioIngreso, mesIngreso] = fechaIngreso.split("-").map(Number);
  const [anioPeriodo, mesPeriodo] = periodoAAAAMM.split("-").map(Number);
  let anios = anioPeriodo - anioIngreso;
  if (mesPeriodo < mesIngreso) anios -= 1;
  return Math.max(0, anios);
}

function poblarFormulario() {
  $("emp-nombre").value = estado.empleado.nombre;
  $("emp-rama").value = estado.empleado.rama;
  $("emp-ingreso").value = estado.empleado.ingreso;

  $("cfg-antiguedad").value = estado.config.antiguedadPct;
  $("cfg-presentismo").value = estado.config.presentismoPct;
  $("cfg-jubilacion").value = estado.config.jubilacionPct;
  $("cfg-ley19032").value = estado.config.ley19032Pct;
  $("cfg-obrasocial").value = estado.config.obraSocialPct;
  $("cfg-sindicato-activo").checked = estado.config.sindicatoActivo;
  $("cfg-sindicato").value = estado.config.sindicatoPct;

  const hoy = new Date();
  const periodoActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  $("pago-periodo").value = periodoActual;
  actualizarAniosAntiguedad();
}

function actualizarAniosAntiguedad() {
  const anios = calcularAniosAntiguedad($("emp-ingreso").value, $("pago-periodo").value);
  $("pago-antiguedad-anios").value = anios;
}

function sumaAdelantosPeriodo(periodo) {
  return estado.adelantos
    .filter((a) => a.periodo === periodo)
    .reduce((total, a) => total + a.monto, 0);
}

function actualizarInfoAdelantosPeriodo() {
  const periodo = $("pago-periodo").value;
  const info = $("adelantos-periodo-info");
  if (!periodo) {
    info.textContent = "";
    return;
  }
  const total = sumaAdelantosPeriodo(periodo);
  info.textContent =
    total > 0
      ? `Adelantos ya cargados para ${periodo}: ${fmtMoneda(total)}.`
      : `No hay adelantos cargados para ${periodo}.`;
}

function guardarDatosEmpleado() {
  estado.empleado.nombre = $("emp-nombre").value.trim();
  estado.empleado.rama = $("emp-rama").value;
  estado.empleado.ingreso = $("emp-ingreso").value;
  guardarEstado();
  actualizarAniosAntiguedad();
  mostrarMensaje("Datos del empleado guardados.");
}

function guardarConfig() {
  estado.config.antiguedadPct = parseFloat($("cfg-antiguedad").value) || 0;
  estado.config.presentismoPct = parseFloat($("cfg-presentismo").value) || 0;
  estado.config.jubilacionPct = parseFloat($("cfg-jubilacion").value) || 0;
  estado.config.ley19032Pct = parseFloat($("cfg-ley19032").value) || 0;
  estado.config.obraSocialPct = parseFloat($("cfg-obrasocial").value) || 0;
  estado.config.sindicatoActivo = $("cfg-sindicato-activo").checked;
  estado.config.sindicatoPct = parseFloat($("cfg-sindicato").value) || 0;
  guardarEstado();
  mostrarMensaje("Parámetros guardados.");
}

function calcularLiquidacion() {
  const periodo = $("pago-periodo").value;
  const basico = parseFloat($("pago-basico").value) || 0;
  const cobraPresentismo = $("pago-presentismo").checked;
  const noRemunerativo = parseFloat($("pago-noremun").value) || 0;
  const extraRemunerativo = parseFloat($("pago-extra").value) || 0;
  const sueldoPagado = parseFloat($("pago-sueldopagado").value) || 0;

  if (!periodo) {
    mostrarMensaje("Elegí el período a liquidar.");
    return null;
  }
  if (basico <= 0) {
    mostrarMensaje("Ingresá el sueldo básico vigente para la categoría A.");
    return null;
  }

  const antiguedadAnios = calcularAniosAntiguedad($("emp-ingreso").value, periodo);
  const antiguedadMonto = basico * (estado.config.antiguedadPct / 100) * antiguedadAnios;
  const baseParaPresentismo = basico + antiguedadMonto;
  const presentismoMonto = cobraPresentismo ? baseParaPresentismo * (estado.config.presentismoPct / 100) : 0;

  const bruto = basico + antiguedadMonto + presentismoMonto + extraRemunerativo;

  const descJubilacion = bruto * (estado.config.jubilacionPct / 100);
  const descLey19032 = bruto * (estado.config.ley19032Pct / 100);
  const descObraSocial = bruto * (estado.config.obraSocialPct / 100);
  const descSindicato = estado.config.sindicatoActivo ? bruto * (estado.config.sindicatoPct / 100) : 0;
  const totalDescuentos = descJubilacion + descLey19032 + descObraSocial + descSindicato;

  const neto = bruto - totalDescuentos + noRemunerativo;

  const adelantosPeriodo = sumaAdelantosPeriodo(periodo);
  const saldoAPagar = neto - adelantosPeriodo;
  const diferencia = sueldoPagado - saldoAPagar;

  return {
    periodo,
    basico,
    antiguedadAnios,
    antiguedadMonto,
    presentismoMonto,
    extraRemunerativo,
    bruto,
    descJubilacion,
    descLey19032,
    descObraSocial,
    descSindicato,
    totalDescuentos,
    noRemunerativo,
    neto,
    adelantosPeriodo,
    saldoAPagar,
    sueldoPagado,
    diferencia,
  };
}

let ultimoCalculo = null;

function onCalcular() {
  const r = calcularLiquidacion();
  if (!r) return;
  ultimoCalculo = r;

  $("res-basico").textContent = fmtMoneda(r.basico);
  $("res-anios").textContent = r.antiguedadAnios;
  $("res-antiguedad").textContent = fmtMoneda(r.antiguedadMonto);
  $("res-presentismo").textContent = fmtMoneda(r.presentismoMonto);
  $("res-extra").textContent = fmtMoneda(r.extraRemunerativo);
  $("res-bruto").textContent = fmtMoneda(r.bruto);
  $("res-desc-jubilacion").textContent = fmtMoneda(r.descJubilacion);
  $("res-desc-ley").textContent = fmtMoneda(r.descLey19032);
  $("res-desc-os").textContent = fmtMoneda(r.descObraSocial);
  $("fila-desc-sindicato").style.display = estado.config.sindicatoActivo ? "" : "none";
  $("res-desc-sindicato").textContent = fmtMoneda(r.descSindicato);
  $("res-total-desc").textContent = fmtMoneda(r.totalDescuentos);
  $("res-noremun").textContent = fmtMoneda(r.noRemunerativo);
  $("res-neto").textContent = fmtMoneda(r.neto);
  $("res-adelantos-periodo").textContent = fmtMoneda(r.adelantosPeriodo);
  $("res-saldo-a-pagar").textContent = fmtMoneda(r.saldoAPagar);
  $("res-pagado").textContent = fmtMoneda(r.sueldoPagado);
  $("res-diferencia").textContent = fmtMoneda(r.diferencia);

  const infoDif = $("diferencia-info");
  if (Math.abs(r.diferencia) < 0.01) {
    infoDif.textContent = "Está al día: el sueldo pagado coincide con el saldo a pagar (sueldo según ley menos los adelantos).";
  } else if (r.diferencia < 0) {
    infoDif.textContent = `Todavía falta pagar ${fmtMoneda(-r.diferencia)} de este período (sobre el saldo, ya descontados los adelantos).`;
  } else {
    infoDif.textContent = `Se pagó ${fmtMoneda(r.diferencia)} de más respecto del saldo a pagar.`;
  }

  $("resultado").classList.remove("oculto");
}

function nombreMesAnio(periodoAAAAMM) {
  const [anio, mes] = periodoAAAAMM.split("-").map(Number);
  const nombre = NOMBRES_MES[mes - 1] || "";
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

function construirDetallePago(p) {
  const periodoTexto = nombreMesAnio(p.periodo);
  const asunto = `Registro Pago Sueldos ${periodoTexto}`;
  const cuerpo = [
    `Empleado: ${estado.empleado.nombre || "(sin nombre cargado)"}`,
    `Categoría: ${RAMAS[estado.empleado.rama] || estado.empleado.rama}`,
    `Período: ${periodoTexto}`,
    "",
    `Sueldo básico: ${fmtMoneda(p.basico)}`,
    `Antigüedad (${p.antiguedadAnios} años): ${fmtMoneda(p.antiguedadMonto)}`,
    `Presentismo: ${fmtMoneda(p.presentismoMonto)}`,
    `Extra remunerativo: ${fmtMoneda(p.extraRemunerativo)}`,
    `Remuneración bruta: ${fmtMoneda(p.bruto)}`,
    "",
    `Descuento jubilación: ${fmtMoneda(p.descJubilacion)}`,
    `Descuento ley 19.032: ${fmtMoneda(p.descLey19032)}`,
    `Descuento obra social: ${fmtMoneda(p.descObraSocial)}`,
    `Cuota sindical: ${fmtMoneda(p.descSindicato)}`,
    `Total descuentos: ${fmtMoneda(p.totalDescuentos)}`,
    "",
    `Adicional no remunerativo: ${fmtMoneda(p.noRemunerativo)}`,
    `Sueldo según ley a pagar: ${fmtMoneda(p.neto)}`,
    "",
    `Adelantos del período: ${fmtMoneda(p.adelantosPeriodo)}`,
    `Saldo a pagar (ley − adelantos): ${fmtMoneda(p.saldoAPagar)}`,
    `Sueldo pagado: ${fmtMoneda(p.sueldoPagado)}`,
    `Diferencia (pagado − saldo a pagar): ${fmtMoneda(p.diferencia)}`,
    "",
    `Registrado el: ${new Date(p.registradoEn).toLocaleString("es-AR")}`,
  ].join("\r\n");
  return { asunto, cuerpo };
}

function construirMailtoPago(p) {
  const { asunto, cuerpo } = construirDetallePago(p);
  return `mailto:${EMAIL_CONTROL_PAGOS}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}

// Intenta abrir el cliente de correo y, además, copia el mail al portapapeles: algunos
// navegadores o visores embebidos (como una vista previa) bloquean los enlaces mailto: por
// seguridad y no hay forma de saber si funcionó, así que el portapapeles queda como respaldo.
async function intentarAbrirMail(p) {
  const { asunto, cuerpo } = construirDetallePago(p);
  const textoParaCopiar = `Para: ${EMAIL_CONTROL_PAGOS}\nAsunto: ${asunto}\n\n${cuerpo}`;

  let copiado = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textoParaCopiar);
      copiado = true;
    }
  } catch (e) {
    copiado = false;
  }

  try {
    window.location.href = construirMailtoPago(p);
  } catch (e) {
    // algunos visores embebidos bloquean mailto:; seguimos con el respaldo del portapapeles.
  }

  return copiado;
}

async function abrirMailPago(p) {
  const copiado = await intentarAbrirMail(p);
  mostrarMensaje(
    copiado
      ? `Se intentó abrir tu correo para ${EMAIL_CONTROL_PAGOS} y se copió el mail al portapapeles por las dudas (pegalo en un mail nuevo si no se abrió solo).`
      : `Se intentó abrir tu correo para ${EMAIL_CONTROL_PAGOS}. Si no pasó nada, tu navegador bloqueó el enlace; usá el botón "Mail" de la fila para reintentarlo.`
  );
}

async function onRegistrarPago() {
  if (!ultimoCalculo) return;
  const btn = $("btn-registrar-pago");

  const existente = estado.pagos.find((p) => p.periodo === ultimoCalculo.periodo);
  if (existente && btn.dataset.confirmando !== "1") {
    iniciarConfirmacion(btn, "Ya existe un pago este período. ¿Reemplazar?");
    return;
  }
  if (btn.dataset.confirmando === "1") finalizarConfirmacion(btn);

  if (existente) {
    estado.pagos = estado.pagos.filter((p) => p.periodo !== ultimoCalculo.periodo);
  }

  const nuevoPago = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    ...ultimoCalculo,
    registradoEn: new Date().toISOString(),
  };
  estado.pagos.push(nuevoPago);

  estado.pagos.sort((a, b) => a.periodo.localeCompare(b.periodo));
  guardarEstado();
  renderTablaPagos();

  const copiado = await intentarAbrirMail(nuevoPago);
  mostrarMensaje(
    `Pago de ${ultimoCalculo.periodo} registrado. ` +
      (copiado
        ? `Se intentó abrir tu correo y se copió el mail al portapapeles por las dudas.`
        : `Se intentó abrir tu correo de control (${EMAIL_CONTROL_PAGOS}).`)
  );
}

function eliminarPago(id) {
  estado.pagos = estado.pagos.filter((p) => p.id !== id);
  guardarEstado();
  renderTablaPagos();
}

function renderTablaPagos() {
  const tbody = $("tbody-pagos");
  tbody.innerHTML = "";

  $("sin-pagos").style.display = estado.pagos.length === 0 ? "" : "none";

  for (const p of estado.pagos) {
    const tr = document.createElement("tr");
    const registrado = new Date(p.registradoEn);
    tr.innerHTML = `
      <td>${p.periodo}</td>
      <td>${fmtMoneda(p.basico)}</td>
      <td>${fmtMoneda(p.antiguedadMonto)}</td>
      <td>${fmtMoneda(p.extraRemunerativo)}</td>
      <td>${fmtMoneda(p.bruto)}</td>
      <td>${fmtMoneda(p.totalDescuentos)}</td>
      <td>${fmtMoneda(p.neto)}</td>
      <td>${fmtMoneda(p.adelantosPeriodo)}</td>
      <td>${fmtMoneda(p.saldoAPagar)}</td>
      <td>${fmtMoneda(p.sueldoPagado)}</td>
      <td>${fmtMoneda(p.diferencia)}</td>
      <td>${registrado.toLocaleDateString("es-AR")}</td>
      <td>
        <div class="acciones-fila">
          <button class="link-mail" data-id="${p.id}">Mail</button>
          <button class="link-borrar" data-id="${p.id}">Eliminar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".link-mail").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pago = estado.pagos.find((p) => p.id === btn.dataset.id);
      if (pago) abrirMailPago(pago);
    });
  });

  tbody.querySelectorAll(".link-borrar").forEach((btn) => {
    btn.addEventListener("click", () =>
      manejarClickConfirmable(btn, "¿Confirmar?", () => eliminarPago(btn.dataset.id))
    );
  });
}

function exportarCSV() {
  if (estado.pagos.length === 0) {
    mostrarMensaje("No hay pagos registrados para exportar.");
    return;
  }
  const encabezados = [
    "periodo", "basico", "antiguedad_anios", "antiguedad_monto", "presentismo_monto", "extra_remunerativo",
    "bruto", "desc_jubilacion", "desc_ley19032", "desc_obra_social", "desc_sindicato",
    "total_descuentos", "no_remunerativo", "neto_ley", "adelantos_periodo", "saldo_a_pagar", "sueldo_pagado",
    "diferencia", "registrado_en",
  ];
  const filas = estado.pagos.map((p) =>
    [
      p.periodo, p.basico, p.antiguedadAnios, p.antiguedadMonto, p.presentismoMonto, p.extraRemunerativo,
      p.bruto, p.descJubilacion, p.descLey19032, p.descObraSocial, p.descSindicato,
      p.totalDescuentos, p.noRemunerativo, p.neto, p.adelantosPeriodo, p.saldoAPagar, p.sueldoPagado,
      p.diferencia, p.registradoEn,
    ].join(",")
  );
  const csv = [encabezados.join(","), ...filas].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "registro-pagos-comercio-categoria-a.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function borrarTodoElRegistro() {
  estado.pagos = [];
  guardarEstado();
  renderTablaPagos();
  mostrarMensaje("Se borró todo el registro de pagos.");
}

function buscarBasicoSugerido(rama, periodo) {
  return estado.escalaReferencia
    .filter((e) => e.rama === rama && e.vigenciaDesde <= periodo)
    .sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde))[0] || null;
}

function onSugerirBasico() {
  const rama = $("emp-rama").value;
  const periodo = $("pago-periodo").value;
  const info = $("sugerencia-basico-info");

  if (!periodo) {
    mostrarMensaje("Elegí primero el período a liquidar.");
    return;
  }

  const sugerido = buscarBasicoSugerido(rama, periodo);
  if (!sugerido) {
    info.textContent = `No hay un básico de referencia cargado para ${RAMAS[rama]} en ${periodo}. Agregá una fila en "Escala de referencia" o ingresá el básico manualmente.`;
    info.classList.remove("oculto");
    return;
  }

  $("pago-basico").value = sugerido.basico;
  $("pago-noremun").value = sugerido.noRemunerativo;
  info.textContent = `Sugerido para ${RAMAS[rama]}: básico ${fmtMoneda(sugerido.basico)} + no remunerativo ${fmtMoneda(sugerido.noRemunerativo)}, vigente desde ${sugerido.vigenciaDesde} (fuente: ${sugerido.fuente}). Verificalo contra la circular oficial de FAECYS antes de liquidar.`;
  info.classList.remove("oculto");
}

function renderTablaEscala() {
  const tbody = $("tbody-escala");
  tbody.innerHTML = "";

  const filas = [...estado.escalaReferencia].sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde));

  for (const e of filas) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${RAMAS[e.rama] || e.rama}</td>
      <td>${e.vigenciaDesde}</td>
      <td>${fmtMoneda(e.basico)}</td>
      <td>${fmtMoneda(e.noRemunerativo)}</td>
      <td>${e.fuente}</td>
      <td><button class="link-borrar" data-id="${e.id}">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".link-borrar").forEach((btn) => {
    btn.addEventListener("click", () =>
      manejarClickConfirmable(btn, "¿Confirmar?", () => eliminarEscala(btn.dataset.id))
    );
  });
}

function eliminarEscala(id) {
  estado.escalaReferencia = estado.escalaReferencia.filter((e) => e.id !== id);
  guardarEstado();
  renderTablaEscala();
}

function onAgregarEscala() {
  const rama = $("escala-rama").value;
  const vigenciaDesde = $("escala-vigencia").value;
  const basico = parseFloat($("escala-basico").value) || 0;
  const noRemunerativo = parseFloat($("escala-noremun").value) || 0;
  const fuente = $("escala-fuente").value.trim() || "Ingresado manualmente";

  if (!vigenciaDesde || basico <= 0) {
    mostrarMensaje("Completá al menos la vigencia y el básico.");
    return;
  }

  estado.escalaReferencia.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    rama,
    vigenciaDesde,
    basico,
    noRemunerativo,
    fuente,
  });
  guardarEstado();
  renderTablaEscala();

  $("escala-basico").value = "";
  $("escala-noremun").value = "";
  $("escala-fuente").value = "";
}

function renderTablaAdelantos() {
  const tbody = $("tbody-adelantos");
  tbody.innerHTML = "";

  $("sin-adelantos").style.display = estado.adelantos.length === 0 ? "" : "none";

  const filas = [...estado.adelantos].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  for (const a of filas) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.periodo}</td>
      <td>${a.fecha || "—"}</td>
      <td>${fmtMoneda(a.monto)}</td>
      <td>${a.nota || ""}</td>
      <td><button class="link-borrar" data-id="${a.id}">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".link-borrar").forEach((btn) => {
    btn.addEventListener("click", () =>
      manejarClickConfirmable(btn, "¿Confirmar?", () => eliminarAdelanto(btn.dataset.id))
    );
  });
}

function eliminarAdelanto(id) {
  estado.adelantos = estado.adelantos.filter((a) => a.id !== id);
  guardarEstado();
  renderTablaAdelantos();
  actualizarInfoAdelantosPeriodo();
}

function onAgregarAdelanto() {
  const periodo = $("adelanto-periodo").value;
  const fecha = $("adelanto-fecha").value;
  const monto = parseFloat($("adelanto-monto").value) || 0;
  const nota = $("adelanto-nota").value.trim();

  if (!periodo || monto <= 0) {
    mostrarMensaje("Completá al menos el período y el monto del adelanto.");
    return;
  }

  estado.adelantos.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    periodo,
    fecha,
    monto,
    nota,
  });
  guardarEstado();
  renderTablaAdelantos();
  actualizarInfoAdelantosPeriodo();

  $("adelanto-monto").value = "";
  $("adelanto-nota").value = "";
}

function init() {
  poblarFormulario();
  renderTablaPagos();
  renderTablaEscala();
  renderTablaAdelantos();
  actualizarInfoAdelantosPeriodo();

  $("btn-guardar-empleado").addEventListener("click", guardarDatosEmpleado);
  $("btn-guardar-config").addEventListener("click", guardarConfig);
  $("btn-sugerir-basico").addEventListener("click", onSugerirBasico);
  $("btn-calcular").addEventListener("click", onCalcular);
  $("btn-registrar-pago").addEventListener("click", onRegistrarPago);
  $("btn-exportar").addEventListener("click", exportarCSV);
  $("btn-borrar-todo").addEventListener("click", () =>
    manejarClickConfirmable($("btn-borrar-todo"), "¿Seguro? Confirmar borrado", borrarTodoElRegistro)
  );
  $("btn-agregar-escala").addEventListener("click", onAgregarEscala);
  $("btn-agregar-adelanto").addEventListener("click", onAgregarAdelanto);
  $("pago-periodo").addEventListener("change", () => {
    actualizarAniosAntiguedad();
    actualizarInfoAdelantosPeriodo();
  });
  $("emp-ingreso").addEventListener("change", actualizarAniosAntiguedad);
}

document.addEventListener("DOMContentLoaded", init);
