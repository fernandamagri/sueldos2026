"use strict";

const STORAGE_KEY = "sueldos2026.casas-particulares";

const CATEGORIAS = {
  generales: "Personal para tareas generales",
  especificas: "Personal para tareas específicas",
  cuidado: "Asistencia y cuidado de personas",
  caseros: "Caseros/as",
  supervisor: "Supervisor/a de personal",
};

const BRACKETS_APORTE = {
  menos12: "Menos de 12 hs/semana",
  "12a15": "De 12 a 15 hs/semana",
  "16omas": "16 hs/semana o más",
};

// Antigüedad computable recién desde el 1/9/2020, por Ley 26.844 (adicional vigente desde set-2021).
const ANTIGUEDAD_FECHA_ANCLA = "2020-09-01";

// Valores hora "con retiro" cargados el 29/09/2026 desde fuentes públicas (iProfesional / CNTCP),
// escala vigente en septiembre de 2026. Agregá filas nuevas cuando salga una nueva resolución.
const ESCALA_REFERENCIA_SEED = [
  { id: "seed-generales-2026-09", categoria: "generales", vigenciaDesde: "2026-09", valorHora: 3914.64, fuente: "iProfesional (CNTCP, set-2026)" },
  { id: "seed-especificas-2026-09", categoria: "especificas", vigenciaDesde: "2026-09", valorHora: 4422.54, fuente: "iProfesional (CNTCP, set-2026)" },
  { id: "seed-cuidado-2026-09", categoria: "cuidado", vigenciaDesde: "2026-09", valorHora: 4185.94, fuente: "iProfesional (CNTCP, set-2026)" },
  { id: "seed-caseros-2026-09", categoria: "caseros", vigenciaDesde: "2026-09", valorHora: 4185.94, fuente: "iProfesional (CNTCP, set-2026)" },
  { id: "seed-supervisor-2026-09", categoria: "supervisor", vigenciaDesde: "2026-09", valorHora: 4645.33, fuente: "iProfesional (CNTCP, set-2026)" },
];

// Aporte y contribución mensual total (jubilación + obra social + ART), a cargo del empleador,
// según horas semanales contratadas. Vencimiento septiembre 2026 (período agosto), fuente iProfesional/ARCA.
const APORTES_REFERENCIA_SEED = [
  { id: "seed-aporte-menos12-2026-09", bracket: "menos12", vigenciaDesde: "2026-09", monto: 10352.01, fuente: "iProfesional / ARCA (venc. set-2026)" },
  { id: "seed-aporte-12a15-2026-09", bracket: "12a15", vigenciaDesde: "2026-09", monto: 16279.36, fuente: "iProfesional / ARCA (venc. set-2026)" },
  { id: "seed-aporte-16omas-2026-09", bracket: "16omas", vigenciaDesde: "2026-09", monto: 43733.0, fuente: "iProfesional / ARCA (venc. set-2026)" },
];

const DEFAULT_STATE = {
  empleada: { nombre: "", categoria: "generales", ingreso: "" },
  config: { antiguedadPct: 1, jubilacionPct: 11, retenerJubilacion: false },
  pagos: [],
  escalaReferencia: ESCALA_REFERENCIA_SEED,
  aportesReferencia: APORTES_REFERENCIA_SEED,
  adelantos: [], // { id, periodo, fecha, monto, nota }
};

function cargarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      empleada: { ...DEFAULT_STATE.empleada, ...(parsed.empleada || {}) },
      config: { ...DEFAULT_STATE.config, ...(parsed.config || {}) },
      pagos: Array.isArray(parsed.pagos) ? parsed.pagos : [],
      escalaReferencia: Array.isArray(parsed.escalaReferencia)
        ? parsed.escalaReferencia
        : structuredClone(ESCALA_REFERENCIA_SEED),
      aportesReferencia: Array.isArray(parsed.aportesReferencia)
        ? parsed.aportesReferencia
        : structuredClone(APORTES_REFERENCIA_SEED),
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
  const anclaIngreso = fechaIngreso < ANTIGUEDAD_FECHA_ANCLA ? ANTIGUEDAD_FECHA_ANCLA : fechaIngreso;
  const ingreso = new Date(anclaIngreso + "T00:00:00");
  const [anio, mes] = periodoAAAAMM.split("-").map(Number);
  const finPeriodo = new Date(anio, mes - 1, 1);
  let anios = finPeriodo.getFullYear() - ingreso.getFullYear();
  const aunNoLlegoElMes =
    finPeriodo.getMonth() < ingreso.getMonth() ||
    (finPeriodo.getMonth() === ingreso.getMonth() && finPeriodo.getDate() < ingreso.getDate());
  if (aunNoLlegoElMes) anios -= 1;
  return Math.max(0, anios);
}

function poblarFormulario() {
  $("emp-nombre").value = estado.empleada.nombre;
  $("emp-categoria").value = estado.empleada.categoria;
  $("emp-ingreso").value = estado.empleada.ingreso;

  $("cfg-antiguedad").value = estado.config.antiguedadPct;
  $("cfg-jubilacion").value = estado.config.jubilacionPct;
  $("cfg-retener-jubilacion").checked = estado.config.retenerJubilacion;

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

function guardarDatosEmpleada() {
  estado.empleada.nombre = $("emp-nombre").value.trim();
  estado.empleada.categoria = $("emp-categoria").value;
  estado.empleada.ingreso = $("emp-ingreso").value;
  guardarEstado();
  actualizarAniosAntiguedad();
  mostrarMensaje("Datos de la empleada guardados.");
}

function guardarConfig() {
  estado.config.antiguedadPct = parseFloat($("cfg-antiguedad").value) || 0;
  estado.config.jubilacionPct = parseFloat($("cfg-jubilacion").value) || 0;
  estado.config.retenerJubilacion = $("cfg-retener-jubilacion").checked;
  guardarEstado();
  mostrarMensaje("Parámetros guardados.");
}

function buscarValorHoraSugerido(categoria, periodo) {
  return estado.escalaReferencia
    .filter((e) => e.categoria === categoria && e.vigenciaDesde <= periodo)
    .sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde))[0] || null;
}

function onSugerirValorHora() {
  const categoria = $("emp-categoria").value;
  const periodo = $("pago-periodo").value;
  const info = $("sugerencia-valorhora-info");

  if (!periodo) {
    mostrarMensaje("Elegí primero el período a liquidar.");
    return;
  }

  const sugerido = buscarValorHoraSugerido(categoria, periodo);
  if (!sugerido) {
    info.textContent = `No hay un valor hora de referencia cargado para ${CATEGORIAS[categoria]} en ${periodo}. Agregá una fila en "Escala de referencia" o ingresalo manualmente.`;
    info.classList.remove("oculto");
    return;
  }

  $("pago-valorhora").value = sugerido.valorHora;
  info.textContent = `Sugerido para ${CATEGORIAS[categoria]}: valor hora ${fmtMoneda(sugerido.valorHora)}, vigente desde ${sugerido.vigenciaDesde} (fuente: ${sugerido.fuente}). Verificalo contra la resolución oficial de la CNTCP antes de liquidar.`;
  info.classList.remove("oculto");
}

function buscarAporteReferencia(bracket, periodo) {
  return estado.aportesReferencia
    .filter((a) => a.bracket === bracket && a.vigenciaDesde <= periodo)
    .sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde))[0] || null;
}

function calcularLiquidacion() {
  const periodo = $("pago-periodo").value;
  const valorHora = parseFloat($("pago-valorhora").value) || 0;
  const horas = parseFloat($("pago-horas").value) || 0;
  const extraRemunerativo = parseFloat($("pago-extra").value) || 0;
  const noRemunerativo = parseFloat($("pago-noremun").value) || 0;
  const bracket = $("pago-bracket-horas").value;
  const sueldoPagado = parseFloat($("pago-sueldopagado").value) || 0;

  if (!periodo) {
    mostrarMensaje("Elegí el período a liquidar.");
    return null;
  }
  if (valorHora <= 0) {
    mostrarMensaje("Ingresá el valor hora vigente.");
    return null;
  }
  if (horas <= 0) {
    mostrarMensaje("Ingresá las horas trabajadas en el mes.");
    return null;
  }

  const remuneracion = valorHora * horas;
  const antiguedadAnios = calcularAniosAntiguedad($("emp-ingreso").value, periodo);
  const antiguedadMonto = remuneracion * (estado.config.antiguedadPct / 100) * antiguedadAnios;

  const bruto = remuneracion + antiguedadMonto + extraRemunerativo;

  const descJubilacion = estado.config.retenerJubilacion ? bruto * (estado.config.jubilacionPct / 100) : 0;

  const neto = bruto - descJubilacion + noRemunerativo;

  const aporteArca = buscarAporteReferencia(bracket, periodo);

  const adelantosPeriodo = sumaAdelantosPeriodo(periodo);
  const saldoAPagar = neto - adelantosPeriodo;
  const diferencia = sueldoPagado - saldoAPagar;

  return {
    periodo,
    valorHora,
    horas,
    remuneracion,
    antiguedadAnios,
    antiguedadMonto,
    extraRemunerativo,
    bruto,
    descJubilacion,
    noRemunerativo,
    neto,
    bracket,
    aporteArcaMonto: aporteArca ? aporteArca.monto : null,
    aporteArcaFuente: aporteArca ? `${aporteArca.vigenciaDesde} · ${aporteArca.fuente}` : null,
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

  $("res-remuneracion").textContent = fmtMoneda(r.remuneracion);
  $("res-anios").textContent = r.antiguedadAnios;
  $("res-antiguedad").textContent = fmtMoneda(r.antiguedadMonto);
  $("res-extra").textContent = fmtMoneda(r.extraRemunerativo);
  $("res-bruto").textContent = fmtMoneda(r.bruto);
  $("fila-desc-jubilacion").style.display = estado.config.retenerJubilacion ? "" : "none";
  $("res-desc-jubilacion").textContent = fmtMoneda(r.descJubilacion);
  $("res-noremun").textContent = fmtMoneda(r.noRemunerativo);
  $("res-neto").textContent = fmtMoneda(r.neto);

  $("res-aporte-arca").textContent = r.aporteArcaMonto != null ? fmtMoneda(r.aporteArcaMonto) : "sin dato cargado";
  $("res-aporte-arca-info").textContent = r.aporteArcaFuente ? ` (${r.aporteArcaFuente})` : "";

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

function onRegistrarPago() {
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

  estado.pagos.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    ...ultimoCalculo,
    registradoEn: new Date().toISOString(),
  });

  estado.pagos.sort((a, b) => a.periodo.localeCompare(b.periodo));
  guardarEstado();
  renderTablaPagos();
  mostrarMensaje(`Pago de ${ultimoCalculo.periodo} registrado.`);
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
      <td>${p.horas}</td>
      <td>${fmtMoneda(p.valorHora)}</td>
      <td>${fmtMoneda(p.antiguedadMonto)}</td>
      <td>${fmtMoneda(p.bruto)}</td>
      <td>${fmtMoneda(p.descJubilacion)}</td>
      <td>${fmtMoneda(p.neto)}</td>
      <td>${fmtMoneda(p.adelantosPeriodo)}</td>
      <td>${fmtMoneda(p.saldoAPagar)}</td>
      <td>${fmtMoneda(p.sueldoPagado)}</td>
      <td>${fmtMoneda(p.diferencia)}</td>
      <td>${registrado.toLocaleDateString("es-AR")}</td>
      <td><button class="link-borrar" data-id="${p.id}">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
  }

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
    "periodo", "horas", "valor_hora", "remuneracion", "antiguedad_anios", "antiguedad_monto",
    "extra_remunerativo", "bruto", "desc_jubilacion", "no_remunerativo", "neto_ley",
    "bracket_horas_aporte", "aporte_arca_referencia", "adelantos_periodo", "saldo_a_pagar", "sueldo_pagado",
    "diferencia", "registrado_en",
  ];
  const filas = estado.pagos.map((p) =>
    [
      p.periodo, p.horas, p.valorHora, p.remuneracion, p.antiguedadAnios, p.antiguedadMonto,
      p.extraRemunerativo, p.bruto, p.descJubilacion, p.noRemunerativo, p.neto,
      p.bracket, p.aporteArcaMonto ?? "", p.adelantosPeriodo, p.saldoAPagar, p.sueldoPagado, p.diferencia,
      p.registradoEn,
    ].join(",")
  );
  const csv = [encabezados.join(","), ...filas].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "registro-pagos-casas-particulares.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function borrarTodoElRegistro() {
  estado.pagos = [];
  guardarEstado();
  renderTablaPagos();
  mostrarMensaje("Se borró todo el registro de pagos.");
}

function renderTablaEscala() {
  const tbody = $("tbody-escala");
  tbody.innerHTML = "";

  const filas = [...estado.escalaReferencia].sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde));

  for (const e of filas) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${CATEGORIAS[e.categoria] || e.categoria}</td>
      <td>${e.vigenciaDesde}</td>
      <td>${fmtMoneda(e.valorHora)}</td>
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
  const categoria = $("escala-categoria").value;
  const vigenciaDesde = $("escala-vigencia").value;
  const valorHora = parseFloat($("escala-valorhora").value) || 0;
  const fuente = $("escala-fuente").value.trim() || "Ingresado manualmente";

  if (!vigenciaDesde || valorHora <= 0) {
    mostrarMensaje("Completá al menos la vigencia y el valor hora.");
    return;
  }

  estado.escalaReferencia.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    categoria,
    vigenciaDesde,
    valorHora,
    fuente,
  });
  guardarEstado();
  renderTablaEscala();

  $("escala-valorhora").value = "";
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

  $("btn-guardar-empleada").addEventListener("click", guardarDatosEmpleada);
  $("btn-guardar-config").addEventListener("click", guardarConfig);
  $("btn-sugerir-valorhora").addEventListener("click", onSugerirValorHora);
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
