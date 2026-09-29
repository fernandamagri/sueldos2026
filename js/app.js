"use strict";

const STORAGE_KEY = "sueldos2026.comercio-categoria-a";

const DEFAULT_STATE = {
  empleado: { nombre: "", categoria: "Comercio — Categoría A", ingreso: "" },
  config: {
    antiguedadPct: 1,
    presentismoPct: 8.33,
    jubilacionPct: 11,
    ley19032Pct: 3,
    obraSocialPct: 3,
    sindicatoActivo: false,
    sindicatoPct: 2.5,
  },
  pagos: [], // { id, periodo, basico, antiguedadAnios, antiguedadMonto, presentismoMonto, bruto, descJubilacion, descLey19032, descObraSocial, descSindicato, totalDescuentos, noRemunerativo, neto, registradoEn }
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
    };
  } catch (e) {
    console.warn("No se pudo leer el estado guardado, se usa uno nuevo.", e);
    return structuredClone(DEFAULT_STATE);
  }
}

function guardarEstado() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

let estado = cargarEstado();

const $ = (id) => document.getElementById(id);

const fmtMoneda = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n || 0);

function calcularAniosAntiguedad(fechaIngreso, periodoAAAAMM) {
  if (!fechaIngreso || !periodoAAAAMM) return 0;
  const ingreso = new Date(fechaIngreso + "T00:00:00");
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
  $("emp-nombre").value = estado.empleado.nombre;
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
  const anios = calcularAniosAntiguedad(estado.empleado.ingreso, $("pago-periodo").value);
  $("pago-antiguedad-anios").value = anios;
}

function guardarDatosEmpleado() {
  estado.empleado.nombre = $("emp-nombre").value.trim();
  estado.empleado.ingreso = $("emp-ingreso").value;
  guardarEstado();
  actualizarAniosAntiguedad();
  alert("Datos del empleado guardados.");
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
  alert("Parámetros guardados.");
}

function calcularLiquidacion() {
  const periodo = $("pago-periodo").value;
  const basico = parseFloat($("pago-basico").value) || 0;
  const cobraPresentismo = $("pago-presentismo").checked;
  const noRemunerativo = parseFloat($("pago-noremun").value) || 0;

  if (!periodo) {
    alert("Elegí el período a liquidar.");
    return null;
  }
  if (basico <= 0) {
    alert("Ingresá el sueldo básico vigente para la categoría A.");
    return null;
  }

  const antiguedadAnios = calcularAniosAntiguedad(estado.empleado.ingreso, periodo);
  const antiguedadMonto = basico * (estado.config.antiguedadPct / 100) * antiguedadAnios;
  const baseParaPresentismo = basico + antiguedadMonto;
  const presentismoMonto = cobraPresentismo ? baseParaPresentismo * (estado.config.presentismoPct / 100) : 0;

  const bruto = basico + antiguedadMonto + presentismoMonto;

  const descJubilacion = bruto * (estado.config.jubilacionPct / 100);
  const descLey19032 = bruto * (estado.config.ley19032Pct / 100);
  const descObraSocial = bruto * (estado.config.obraSocialPct / 100);
  const descSindicato = estado.config.sindicatoActivo ? bruto * (estado.config.sindicatoPct / 100) : 0;
  const totalDescuentos = descJubilacion + descLey19032 + descObraSocial + descSindicato;

  const neto = bruto - totalDescuentos + noRemunerativo;

  return {
    periodo,
    basico,
    antiguedadAnios,
    antiguedadMonto,
    presentismoMonto,
    bruto,
    descJubilacion,
    descLey19032,
    descObraSocial,
    descSindicato,
    totalDescuentos,
    noRemunerativo,
    neto,
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
  $("res-bruto").textContent = fmtMoneda(r.bruto);
  $("res-desc-jubilacion").textContent = fmtMoneda(r.descJubilacion);
  $("res-desc-ley").textContent = fmtMoneda(r.descLey19032);
  $("res-desc-os").textContent = fmtMoneda(r.descObraSocial);
  $("fila-desc-sindicato").style.display = estado.config.sindicatoActivo ? "" : "none";
  $("res-desc-sindicato").textContent = fmtMoneda(r.descSindicato);
  $("res-total-desc").textContent = fmtMoneda(r.totalDescuentos);
  $("res-noremun").textContent = fmtMoneda(r.noRemunerativo);
  $("res-neto").textContent = fmtMoneda(r.neto);

  $("resultado").classList.remove("oculto");
}

function onRegistrarPago() {
  if (!ultimoCalculo) return;

  const existente = estado.pagos.find((p) => p.periodo === ultimoCalculo.periodo);
  if (existente) {
    const confirmar = confirm(`Ya existe un pago registrado para ${ultimoCalculo.periodo}. ¿Querés reemplazarlo?`);
    if (!confirmar) return;
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
  alert(`Pago de ${ultimoCalculo.periodo} registrado.`);
}

function eliminarPago(id) {
  const pago = estado.pagos.find((p) => p.id === id);
  if (!pago) return;
  if (!confirm(`¿Eliminar el pago registrado de ${pago.periodo}?`)) return;
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
      <td>${fmtMoneda(p.bruto)}</td>
      <td>${fmtMoneda(p.totalDescuentos)}</td>
      <td>${fmtMoneda(p.neto)}</td>
      <td>${registrado.toLocaleDateString("es-AR")}</td>
      <td><button class="link-borrar" data-id="${p.id}">Eliminar</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll(".link-borrar").forEach((btn) => {
    btn.addEventListener("click", () => eliminarPago(btn.dataset.id));
  });
}

function exportarCSV() {
  if (estado.pagos.length === 0) {
    alert("No hay pagos registrados para exportar.");
    return;
  }
  const encabezados = [
    "periodo", "basico", "antiguedad_anios", "antiguedad_monto", "presentismo_monto",
    "bruto", "desc_jubilacion", "desc_ley19032", "desc_obra_social", "desc_sindicato",
    "total_descuentos", "no_remunerativo", "neto", "registrado_en",
  ];
  const filas = estado.pagos.map((p) =>
    [
      p.periodo, p.basico, p.antiguedadAnios, p.antiguedadMonto, p.presentismoMonto,
      p.bruto, p.descJubilacion, p.descLey19032, p.descObraSocial, p.descSindicato,
      p.totalDescuentos, p.noRemunerativo, p.neto, p.registradoEn,
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
  if (!confirm("Esto va a borrar todos los pagos registrados. ¿Continuar?")) return;
  estado.pagos = [];
  guardarEstado();
  renderTablaPagos();
}

function init() {
  poblarFormulario();
  renderTablaPagos();

  $("btn-guardar-empleado").addEventListener("click", guardarDatosEmpleado);
  $("btn-guardar-config").addEventListener("click", guardarConfig);
  $("btn-calcular").addEventListener("click", onCalcular);
  $("btn-registrar-pago").addEventListener("click", onRegistrarPago);
  $("btn-exportar").addEventListener("click", exportarCSV);
  $("btn-borrar-todo").addEventListener("click", borrarTodoElRegistro);
  $("pago-periodo").addEventListener("change", actualizarAniosAntiguedad);
}

document.addEventListener("DOMContentLoaded", init);
