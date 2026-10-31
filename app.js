"use strict";
const CLAVE = "subastas_estado_v1";
const $ = (s) => document.querySelector(s);
let datos = [], vista = "todas";

// Estado del usuario (interesante / seguimiento / descartada + notas): solo en este móvil.
function leer() { try { return JSON.parse(localStorage.getItem(CLAVE) || "{}"); } catch { return {}; } }
function guardar(e) { try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch {} }
let usuario = leer();
const est = (id) => usuario[id] || {};
function poner(id, cambios) { usuario[id] = Object.assign({}, usuario[id], cambios); guardar(usuario); pintar(); }

const eur = (x) => (x ? Math.round(x).toLocaleString("es-ES") + " €" : "—");
const ICONO = { verde: "🟢", ambar: "🟡", rojo: "🔴" };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function restante(fin) {
  if (!fin) return { txt: "sin fecha de cierre", urg: false, cerrada: false };
  const ms = new Date(fin) - new Date();
  if (ms < 0) return { txt: "cerrada", urg: false, cerrada: true };
  const h = ms / 36e5, d = Math.floor(h / 24);
  return { txt: d >= 1 ? `cierra en ${d} d` : `cierra en ${Math.floor(h)} h`, urg: h < 72, cerrada: false };
}
const fechaCorta = (f) => (f ? new Date(f).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

function visible(s) {
  const u = est(s.id), r = restante(s.fin);
  if (u.estado === "descartada") return false;
  if (vista === "interesantes") return u.estado === "interesante";
  if (vista === "seguimiento") return u.estado === "seguimiento";
  if (r.cerrada) return false;
  if (vista === "nuevas" && !(s.visto && Date.now() - new Date(s.visto) < 3 * 864e5)) return false;
  const p = $("#f-perfil").value, m = $("#f-sem").value;
  if (p && s.perfil !== p) return false;
  if (m === "verde" && s.semaforo !== "verde") return false;
  if (m === "ambar" && s.semaforo === "rojo") return false;
  return true;
}

function pintar() {
  const o = $("#f-orden").value;
  const l = datos.filter(visible).sort((a, b) =>
    o === "fin" ? (a.fin || "9") .localeCompare(b.fin || "9") : o === "valor" ? (a.valor || 1e12) - (b.valor || 1e12) : b.score - a.score);
  $("#lista").innerHTML = l.length ? l.map(tarjeta).join("") : '<p class="vacio">Nada que mostrar con estos filtros.</p>';
  document.querySelectorAll(".card").forEach((c) => (c.onclick = () => abrir(c.dataset.id)));
}

function tarjeta(s) {
  const u = est(s.id), r = restante(s.fin);
  const nueva = s.visto && Date.now() - new Date(s.visto) < 3 * 864e5;
  return `<div class="card ${s.semaforo}" data-id="${esc(s.id)}">
    <div class="fila"><span class="tit">${esc(s.municipio)} · ${esc(s.tipo_bien)}</span><span class="score">${ICONO[s.semaforo]} ${s.score}</span></div>
    <div class="mut">${esc(s.titulo)}</div>
    <div class="fila"><b>${eur(s.valor)}</b><span class="mut">${r.txt}</span></div>
    <div>${nueva ? '<span class="pill nueva">nueva</span>' : ""}${r.urg ? '<span class="pill urg">cierra pronto</span>' : ""}
    ${s.con_pujas ? '<span class="pill puj">con pujas</span>' : ""}${u.estado ? `<span class="pill">${esc(u.estado)}</span>` : ""}</div></div>`;
}

function abrir(id) {
  const s = datos.find((x) => x.id === id), u = est(id), r = restante(s.fin);
  const f = (k, e) => (s[k] || s[k] === 0 ? `<tr><td>${e}</td><td>${s[k]}</td></tr>` : "");
  $("#hoja").hidden = false;
  $("#hoja").innerHTML = `<div class="cerrar"><button class="b" id="x">← Volver</button></div>
  <h2>${ICONO[s.semaforo]} ${s.score} · ${esc(s.municipio)} (${esc(s.provincia)})</h2>
  <p>${esc(s.titulo)}</p>
  <div>
    <button class="b ${u.estado === "interesante" ? "on" : ""}" data-e="interesante">⭐ Interesante</button>
    <button class="b ${u.estado === "seguimiento" ? "on" : ""}" data-e="seguimiento">👁 Seguimiento</button>
    <button class="b ${u.estado === "descartada" ? "on" : ""}" data-e="descartada">🗑 Descartar</button>
  </div>
  <table>
    <tr><td>Valor de subasta</td><td><b>${eur(s.valor)}</b></td></tr>
    <tr><td>Tasación</td><td>${eur(s.tasacion)}</td></tr>
    <tr><td>Depósito</td><td>${eur(s.deposito)}</td></tr>
    <tr><td>Cierre</td><td>${fechaCorta(s.fin)} (${r.txt})</td></tr>
    <tr><td>Pujas</td><td>${s.con_pujas ? "ha recibido pujas (el importe exige sesión en el portal)" : "sin dato"}</td></tr>
    <tr><td>Procedimiento</td><td>${esc(s.procedimiento)} · ${esc(s.autoridad)}</td></tr>
    <tr><td>Posesión</td><td>${esc(s.posesion)}${s.visitable === 0 ? " · no visitable" : s.visitable === 1 ? " · visitable" : ""}</td></tr>
    ${s.vivienda_habitual === 1 ? "<tr><td>Vivienda habitual</td><td>Sí (del deudor)</td></tr>" : s.vivienda_habitual === 0 ? "<tr><td>Vivienda habitual</td><td>No</td></tr>" : ""}
    ${s.inscripcion ? `<tr><td>Registro</td><td>${esc(s.inscripcion)}</td></tr>` : ""}
    <tr><td>Cargas (público)</td><td>${esc(s.cargas) || "no figuran en la parte pública del portal"}</td></tr>
    ${s.m2 ? `<tr><td>Superficie / año</td><td>${s.m2} m² construidos${s.anio ? " · " + s.anio : ""}</td></tr>` : ""}
    ${s.km_costa != null ? `<tr><td>Costa</td><td>${s.km_costa} km</td></tr>` : ""}
    ${s.min_coche ? `<tr><td>Desde Madrid</td><td>${s.min_coche} min en coche</td></tr>` : ""}
  </table>
  <p>
    <a class="b pri" href="${esc(s.url)}" target="_blank" rel="noopener">Abrir la subasta</a>
    ${s.catastro ? `<a class="b" href="${esc(s.catastro)}" target="_blank" rel="noopener">🗺 Catastro</a>` : ""}
    ${s.ortofoto ? `<a class="b" href="${esc(s.ortofoto)}" target="_blank" rel="noopener">🛰 Ortofoto</a>` : ""}
    ${s.lat ? `<a class="b" href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}" target="_blank" rel="noopener">📍 Mapa</a>
    <a class="b" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${s.lat},${s.lon}" target="_blank" rel="noopener">🚶 Street View</a>` : ""}
  </p>
  ${s.banderas.length ? `<h2>⚠️ Ojo</h2><ul>${s.banderas.map((b) => `<li>${esc(b.texto)}</li>`).join("")}</ul>` : ""}
  <h2>Por qué este score</h2>
  <table>${s.desglose.map((d) => `<tr><td>${d.puntos > 0 ? "+" : ""}${d.puntos}</td><td>${esc(d.factor)}: ${esc(d.nota)}</td></tr>`).join("")}</table>
  <h2>Mis notas y comprobaciones</h2>
  <label>Antes de pujar, marca lo que ya has hecho:</label>
  <label>Cargas (míralas en el portal con tu sesión)</label><input id="n-cargas" value="${esc(u.cargas)}">
  <label>Puja actual</label><input id="n-puja" value="${esc(u.puja)}" inputmode="decimal">
  <label><input type="checkbox" id="c-nota" ${u.notaSimple ? "checked" : ""} style="width:auto"> Nota simple pedida</label>
  <label><input type="checkbox" id="c-edicto" ${u.edicto ? "checked" : ""} style="width:auto"> Edicto leído completo</label>
  <label><input type="checkbox" id="c-vis" ${u.visita ? "checked" : ""} style="width:auto"> Visitada o vista por fuera / Street View</label>
  <label><input type="checkbox" id="c-ocu" ${u.ocupacion ? "checked" : ""} style="width:auto"> Ocupación comprobada</label>
  <label><input type="checkbox" id="c-plan" ${u.planeamiento ? "checked" : ""} style="width:auto"> Planeamiento/uso del suelo mirado en el ayuntamiento</label>
  <label><input type="checkbox" id="c-costo" ${u.costes ? "checked" : ""} style="width:auto"> Calculados impuestos y gastos (ITP + registro + reforma)</label>
  <label><input type="checkbox" id="c-dep" ${u.deposito ? "checked" : ""} style="width:auto"> Depósito consignado</label>
  <label>Notas</label><textarea id="n-nota" rows="4">${esc(u.nota)}</textarea>
  <p class="mut">${esc(s.descripcion)}</p>
  <p class="aviso">Informa, no recomienda. Las cargas anteriores se mantienen tras la adjudicación; la ocupación es el riesgo más habitual.
  Para pujar hace falta registrarse en el portal (certificado o Cl@ve) y consignar el depósito: la puja la haces tú allí.</p>`;
  $("#x").onclick = () => { $("#hoja").hidden = true; pintar(); };
  document.querySelectorAll("[data-e]").forEach((b) => (b.onclick = () => { poner(id, { estado: u.estado === b.dataset.e ? "" : b.dataset.e }); abrir(id); }));
  const campo = (sel, k, c) => ($(sel).onchange = (e) => { usuario[id] = Object.assign({}, usuario[id], { [k]: c ? e.target.checked : e.target.value }); guardar(usuario); });
  campo("#n-cargas", "cargas"); campo("#n-puja", "puja"); campo("#n-nota", "nota");
  campo("#c-nota", "notaSimple", 1); campo("#c-edicto", "edicto", 1); campo("#c-dep", "deposito", 1);
  campo("#c-vis", "visita", 1); campo("#c-ocu", "ocupacion", 1); campo("#c-plan", "planeamiento", 1); campo("#c-costo", "costes", 1);
}

async function iniciar() {
  try {
    const r = await fetch("data.json?" + Date.now());
    const j = await r.json();
    datos = j.subastas;
    $("#generado").textContent = "actualizado " + new Date(j.generado).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { $("#lista").innerHTML = '<p class="vacio">No se pueden cargar los datos. Reintenta con conexión.</p>'; return; }
  const perfiles = [...new Set(datos.map((s) => s.perfil))].sort();
  $("#f-perfil").innerHTML += perfiles.map((p) => `<option value="${p}">${p.replace(/_/g, " ")}</option>`).join("");
  document.querySelectorAll("#tabs button").forEach((b) => (b.onclick = () => {
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); vista = b.dataset.v; pintar();
  }));
  ["#f-perfil", "#f-sem", "#f-orden"].forEach((s) => ($(s).onchange = pintar));
  pintar();
}
iniciar();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
