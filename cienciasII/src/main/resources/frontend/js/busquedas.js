/**
 * busquedas.js
 *
 * Lógica interactiva de la página /busquedas:
 *   - Generación de bloques de datos (aleatoria o manual).
 *   - Visualización del bloque como arreglo indexado.
 *   - Organización de los datos: orden original vs. ordenado.
 *   - Búsqueda secuencial (paso a paso y automática).
 *   - Búsqueda binaria (paso a paso y automática), solo sobre datos ordenados.
 *   - Guardado / carga / eliminación de bloques usando localStorage.
 *
 * BACKEND TODO:
 * Toda la persistencia de bloques usa actualmente localStorage. Cuando
 * exista backend, sustituir por llamadas fetch() a:
 *   POST   /api/busquedas/bloques
 *   GET    /api/busquedas/bloques
 *   DELETE /api/busquedas/bloques/{id}
 * Y los algoritmos podrían recalcularse en el servidor mediante:
 *   POST /api/busquedas/secuencial
 *   POST /api/busquedas/binaria
 * reutilizando la misma lógica ya implementada en BusquedaService.java.
 */

// ---------------------------------------------------------------------
// Estado del módulo (en memoria, se pierde al recargar la página salvo
// que el bloque haya sido guardado con el botón "Guardar bloque").
// ---------------------------------------------------------------------
var estadoBusquedas = {
    clavesOriginales: [],   // arreglo tal como fue creado (orden original)
    clavesActuales: [],     // arreglo mostrado actualmente (original u ordenado)
    ordenado: false,        // true si "clavesActuales" está ordenado ascendentemente
    m: 0                    // longitud fija de cada clave
};

var LIMITE_MAXIMO_N = 200; // límite razonable para evitar bloques absurdamente grandes
var LIMITE_MAXIMO_M = 20;
var CLAVE_LOCALSTORAGE = "bloquesBusqueda"; // BACKEND TODO: sustituir por API REST

document.addEventListener("DOMContentLoaded", function () {
    inicializarFormularioBloque();
    inicializarBotonesPersistencia();
    inicializarBotonesOrganizacion();
    inicializarBusquedaSecuencial();
    inicializarBusquedaBinaria();
});

// =====================================================================
// 1. GENERACIÓN DE BLOQUES
// =====================================================================

function inicializarFormularioBloque() {
    var form = document.getElementById("formBloque");
    var radiosGeneracion = document.querySelectorAll('input[name="tipoGeneracion"]');
    var contenedorManual = document.getElementById("contenedorManual");

    radiosGeneracion.forEach(function (radio) {
        radio.addEventListener("change", function () {
            if (radio.value === "manual" && radio.checked) {
                renderizarCamposManuales();
            } else if (radio.checked) {
                contenedorManual.innerHTML = "";
            }
        });
    });

    form.addEventListener("submit", function (evento) {
        evento.preventDefault();
        procesarCreacionBloque();
    });
}

/**
 * Genera dinámicamente un campo de texto por cada clave a introducir
 * manualmente, según el valor actual de "n".
 */
function renderizarCamposManuales() {
    var n = parseInt(document.getElementById("inputN").value, 10);
    var contenedor = document.getElementById("contenedorManual");
    contenedor.innerHTML = "";

    if (isNaN(n) || n <= 0) {
        return;
    }

    n = Math.min(n, LIMITE_MAXIMO_N);

    for (var i = 0; i < n; i++) {
        var grupo = document.createElement("div");
        grupo.className = "form-grupo";

        var label = document.createElement("label");
        label.textContent = "Clave " + (i + 1);

        var input = document.createElement("input");
        input.type = "text";
        input.className = "input-clave-manual";
        input.dataset.indice = i;

        grupo.appendChild(label);
        grupo.appendChild(input);
        contenedor.appendChild(grupo);
    }
}

/**
 * Valida los datos del formulario y crea el bloque de claves, ya sea
 * generándolas aleatoriamente o leyéndolas de los campos manuales.
 */
function procesarCreacionBloque() {
    var n = parseInt(document.getElementById("inputN").value, 10);
    var m = parseInt(document.getElementById("inputM").value, 10);
    var tipoGeneracion = document.querySelector('input[name="tipoGeneracion"]:checked').value;

    var errores = validarParametrosBloque(n, m);
    if (errores.length > 0) {
        mostrarMensaje("mensajeBloque", errores.join(" "), "error");
        return;
    }

    var claves;
    if (tipoGeneracion === "aleatoria") {
        claves = generarClavesAleatorias(n, m);
    } else {
        var resultado = leerClavesManuales(n, m);
        if (resultado.errores.length > 0) {
            mostrarMensaje("mensajeBloque", resultado.errores.join(" "), "error");
            return;
        }
        claves = resultado.claves;
    }

    establecerBloqueActual(claves, m);
    mostrarMensaje("mensajeBloque", "Bloque creado correctamente (n=" + n + ", m=" + m + ").", "exito");
}

/**
 * Valida n y m según las reglas del proyecto:
 *  - deben ser números positivos.
 *  - no deben superar los límites razonables definidos.
 */
function validarParametrosBloque(n, m) {
    var errores = [];

    if (isNaN(n) || n <= 0) {
        errores.push("El número de claves (n) debe ser un entero positivo.");
    } else if (n > LIMITE_MAXIMO_N) {
        errores.push("El número de claves (n) no puede superar " + LIMITE_MAXIMO_N + ".");
    }

    if (isNaN(m) || m <= 0) {
        errores.push("El tamaño de cada clave (m) debe ser un entero positivo.");
    } else if (m > LIMITE_MAXIMO_M) {
        errores.push("El tamaño de cada clave (m) no puede superar " + LIMITE_MAXIMO_M + ".");
    }

    return errores;
}

/** Genera "n" claves alfanuméricas aleatorias, cada una de longitud exacta "m". */
function generarClavesAleatorias(n, m) {
    var caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var claves = [];

    for (var i = 0; i < n; i++) {
        var clave = "";
        for (var j = 0; j < m; j++) {
            clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        claves.push(clave);
    }
    return claves;
}

/** Lee y valida las claves introducidas manualmente por el usuario. */
function leerClavesManuales(n, m) {
    var inputs = document.querySelectorAll(".input-clave-manual");
    var claves = [];
    var errores = [];

    if (inputs.length !== n) {
        errores.push("Debe completar los " + n + " campos de claves.");
        return { claves: claves, errores: errores };
    }

    inputs.forEach(function (input, indice) {
        var valor = input.value.trim();
        if (valor.length !== m) {
            errores.push("La clave " + (indice + 1) + " debe tener exactamente " + m + " caracteres.");
        } else {
            claves.push(valor);
        }
    });

    return { claves: claves, errores: errores };
}

/** Actualiza el estado del módulo con un nuevo bloque y refresca la interfaz. */
function establecerBloqueActual(claves, m) {
    estadoBusquedas.clavesOriginales = claves.slice();
    estadoBusquedas.clavesActuales = claves.slice();
    estadoBusquedas.ordenado = false;
    estadoBusquedas.m = m;

    document.getElementById("panelBloque").style.display = "block";
    document.getElementById("panelSecuencial").style.display = "block";
    document.getElementById("panelBinaria").style.display = "block";
    document.getElementById("estadoOrden").textContent = "Estado actual: orden original";

    renderizarBloqueVisual(estadoBusquedas.clavesActuales);
    limpiarResultadosBusqueda();
}

// =====================================================================
// 2. VISUALIZACIÓN DEL BLOQUE
// =====================================================================

/**
 * Dibuja el bloque de claves como una fila de celdas índice/clave.
 * @param {string[]} claves arreglo a mostrar
 * @param {Object} resaltado opcional: { comparando: idx, encontrada: idx, descartadas: [idx,...] }
 */
function renderizarBloqueVisual(claves, resaltado) {
    resaltado = resaltado || {};
    var contenedor = document.getElementById("bloqueVisual");
    contenedor.innerHTML = "";

    claves.forEach(function (clave, indice) {
        var celda = document.createElement("div");
        celda.className = "bloque-visual__celda";

        if (resaltado.descartadas && resaltado.descartadas.indexOf(indice) !== -1) {
            celda.className += " bloque-visual__celda--descartada";
        }
        if (resaltado.comparando === indice) {
            celda.className += " bloque-visual__celda--comparando";
        }
        if (resaltado.encontrada === indice) {
            celda.className += " bloque-visual__celda--encontrada";
        }

        var divClave = document.createElement("div");
        divClave.className = "bloque-visual__clave";
        divClave.textContent = clave;

        var divIndice = document.createElement("div");
        divIndice.className = "bloque-visual__indice";
        divIndice.textContent = indice;

        celda.appendChild(divClave);
        celda.appendChild(divIndice);
        contenedor.appendChild(celda);
    });
}

// =====================================================================
// 3. ORGANIZACIÓN: ORDEN ORIGINAL vs ORDENADO
//    (ver distinción conceptual en el contexto del proyecto, sección 13:
//    la búsqueda binaria es un algoritmo, no una forma de almacenamiento)
// =====================================================================

function inicializarBotonesOrganizacion() {
    document.getElementById("btnOrdenOriginal").addEventListener("click", function () {
        estadoBusquedas.clavesActuales = estadoBusquedas.clavesOriginales.slice();
        estadoBusquedas.ordenado = false;
        document.getElementById("estadoOrden").textContent = "Estado actual: orden original";
        renderizarBloqueVisual(estadoBusquedas.clavesActuales);
        limpiarResultadosBusqueda();
    });

    document.getElementById("btnOrdenar").addEventListener("click", function () {
        estadoBusquedas.clavesActuales = estadoBusquedas.clavesOriginales.slice().sort();
        estadoBusquedas.ordenado = true;
        document.getElementById("estadoOrden").textContent = "Estado actual: ordenado ascendentemente";
        renderizarBloqueVisual(estadoBusquedas.clavesActuales);
        limpiarResultadosBusqueda();
    });
}

function limpiarResultadosBusqueda() {
    ["mensajeSecuencial", "mensajeBinaria"].forEach(function (id) {
        document.getElementById(id).innerHTML = "";
    });
    ["logSecuencial", "logBinaria"].forEach(function (id) {
        var log = document.getElementById(id);
        log.innerHTML = "";
        log.style.display = "none";
    });
}

// =====================================================================
// 4. BÚSQUEDA SECUENCIAL
// =====================================================================

function inicializarBusquedaSecuencial() {
    document.getElementById("btnSecuencialPaso").addEventListener("click", function () {
        ejecutarBusquedaSecuencial(true);
    });
    document.getElementById("btnSecuencialAuto").addEventListener("click", function () {
        ejecutarBusquedaSecuencial(false);
    });
}

/**
 * Ejecuta la búsqueda secuencial sobre estadoBusquedas.clavesActuales.
 * @param {boolean} pasoAPaso si es true, cada comparación se muestra con una pequeña
 *        pausa animada; si es false, se muestra el resultado completo de inmediato.
 */
function ejecutarBusquedaSecuencial(pasoAPaso) {
    var claveBuscada = document.getElementById("inputClaveSecuencial").value.trim();
    if (!claveBuscada) {
        mostrarMensaje("mensajeSecuencial", "Ingrese una clave para buscar.", "error");
        return;
    }

    var claves = estadoBusquedas.clavesActuales;
    var log = document.getElementById("logSecuencial");
    log.style.display = "block";
    log.innerHTML = "";
    document.getElementById("mensajeSecuencial").innerHTML = "";

    var comparaciones = 0;
    var indiceEncontrado = -1;
    var pasos = [];

    for (var i = 0; i < claves.length; i++) {
        comparaciones++;
        var coincide = claves[i] === claveBuscada;
        pasos.push({ indice: i, comparaciones: comparaciones, coincide: coincide });
        if (coincide) {
            indiceEncontrado = i;
            break;
        }
    }

    if (pasoAPaso) {
        animarPasosSecuencial(pasos, claves, indiceEncontrado, comparaciones);
    } else {
        pasos.forEach(function (paso) {
            agregarLineaLog(log, "Comparación " + paso.comparaciones + " -> índice " + paso.indice +
                " (" + claves[paso.indice] + ")" + (paso.coincide ? " -> ENCONTRADA" : ""), paso.coincide);
        });
        finalizarBusquedaSecuencial(indiceEncontrado, comparaciones, claves);
    }
}

/** Anima la búsqueda secuencial mostrando un paso cada cierto intervalo de tiempo. */
function animarPasosSecuencial(pasos, claves, indiceEncontrado, comparaciones) {
    var log = document.getElementById("logSecuencial");
    var i = 0;

    var intervalo = setInterval(function () {
        if (i >= pasos.length) {
            clearInterval(intervalo);
            finalizarBusquedaSecuencial(indiceEncontrado, comparaciones, claves);
            return;
        }
        var paso = pasos[i];
        renderizarBloqueVisual(claves, { comparando: paso.coincide ? undefined : paso.indice, encontrada: paso.coincide ? paso.indice : undefined });
        agregarLineaLog(log, "Comparación " + paso.comparaciones + " -> índice " + paso.indice +
            " (" + claves[paso.indice] + ")" + (paso.coincide ? " -> ENCONTRADA" : ""), paso.coincide);
        i++;
    }, 450);
}

function finalizarBusquedaSecuencial(indiceEncontrado, comparaciones, claves) {
    renderizarBloqueVisual(claves, indiceEncontrado !== -1 ? { encontrada: indiceEncontrado } : {});
    var tipo = indiceEncontrado !== -1 ? "exito" : "advertencia";
    var texto = indiceEncontrado !== -1
        ? "Clave encontrada en el índice " + indiceEncontrado + ". Comparaciones realizadas: " + comparaciones + "."
        : "Clave no encontrada. Comparaciones realizadas: " + comparaciones + ".";
    mostrarMensaje("mensajeSecuencial", texto, tipo);
}

// =====================================================================
// 5. BÚSQUEDA BINARIA (requiere datos ordenados)
// =====================================================================

function inicializarBusquedaBinaria() {
    document.getElementById("btnBinariaPaso").addEventListener("click", function () {
        ejecutarBusquedaBinaria(true);
    });
    document.getElementById("btnBinariaAuto").addEventListener("click", function () {
        ejecutarBusquedaBinaria(false);
    });
}

function ejecutarBusquedaBinaria(pasoAPaso) {
    if (!estadoBusquedas.ordenado) {
        mostrarMensaje("mensajeBinaria",
            "Las claves deben estar ordenadas. Use el botón \"Ordenar\" antes de buscar.", "error");
        return;
    }

    var claveBuscada = document.getElementById("inputClaveBinaria").value.trim();
    if (!claveBuscada) {
        mostrarMensaje("mensajeBinaria", "Ingrese una clave para buscar.", "error");
        return;
    }

    var claves = estadoBusquedas.clavesActuales;
    var log = document.getElementById("logBinaria");
    log.style.display = "block";
    log.innerHTML = "";
    document.getElementById("mensajeBinaria").innerHTML = "";

    var izquierda = 0;
    var derecha = claves.length - 1;
    var comparaciones = 0;
    var indiceEncontrado = -1;
    var pasos = [];

    while (izquierda <= derecha) {
        var medio = Math.floor((izquierda + derecha) / 2);
        comparaciones++;
        var coincide = claves[medio] === claveBuscada;

        pasos.push({
            comparaciones: comparaciones, izquierda: izquierda, derecha: derecha,
            medio: medio, coincide: coincide
        });

        if (coincide) {
            indiceEncontrado = medio;
            break;
        } else if (claveBuscada < claves[medio]) {
            derecha = medio - 1;
        } else {
            izquierda = medio + 1;
        }
    }

    if (pasoAPaso) {
        animarPasosBinaria(pasos, claves, indiceEncontrado, comparaciones);
    } else {
        pasos.forEach(function (paso) {
            agregarLineaLog(log, formatearPasoBinario(paso, claves), paso.coincide);
        });
        finalizarBusquedaBinaria(indiceEncontrado, comparaciones, claves);
    }
}

function formatearPasoBinario(paso, claves) {
    return "Inicio=" + paso.izquierda + " Fin=" + paso.derecha + " Medio=" + paso.medio +
        " -> comparando con \"" + claves[paso.medio] + "\"" + (paso.coincide ? " -> ENCONTRADA" : "");
}

function animarPasosBinaria(pasos, claves, indiceEncontrado, comparaciones) {
    var log = document.getElementById("logBinaria");
    var i = 0;

    var intervalo = setInterval(function () {
        if (i >= pasos.length) {
            clearInterval(intervalo);
            finalizarBusquedaBinaria(indiceEncontrado, comparaciones, claves);
            return;
        }
        var paso = pasos[i];
        // Se resaltan como "descartadas" las posiciones fuera del rango [izquierda, derecha] actual.
        var descartadas = [];
        for (var idx = 0; idx < claves.length; idx++) {
            if (idx < paso.izquierda || idx > paso.derecha) {
                descartadas.push(idx);
            }
        }
        renderizarBloqueVisual(claves, {
            comparando: paso.coincide ? undefined : paso.medio,
            encontrada: paso.coincide ? paso.medio : undefined,
            descartadas: descartadas
        });
        agregarLineaLog(log, formatearPasoBinario(paso, claves), paso.coincide);
        i++;
    }, 550);
}

function finalizarBusquedaBinaria(indiceEncontrado, comparaciones, claves) {
    renderizarBloqueVisual(claves, indiceEncontrado !== -1 ? { encontrada: indiceEncontrado } : {});
    var tipo = indiceEncontrado !== -1 ? "exito" : "advertencia";
    var texto = indiceEncontrado !== -1
        ? "Clave encontrada en el índice " + indiceEncontrado + ". Comparaciones realizadas: " + comparaciones + "."
        : "Clave no encontrada. Comparaciones realizadas: " + comparaciones + ".";
    mostrarMensaje("mensajeBinaria", texto, tipo);
}

// =====================================================================
// 6. GUARDAR / CARGAR / ELIMINAR BLOQUE (localStorage)
// =====================================================================

function inicializarBotonesPersistencia() {
    document.getElementById("btnGuardarBloque").addEventListener("click", guardarBloqueActual);
    document.getElementById("btnCargarBloque").addEventListener("click", cargarUltimoBloque);
    document.getElementById("btnEliminarBloque").addEventListener("click", eliminarBloqueGuardado);
}

/**
 * Guarda el bloque actual en localStorage.
 *
 * BACKEND TODO: sustituir por POST /api/busquedas/bloques y guardar el
 * "id" devuelto por el servidor en lugar de usar localStorage.
 */
function guardarBloqueActual() {
    if (estadoBusquedas.clavesOriginales.length === 0) {
        mostrarMensaje("mensajeBloque", "No hay ningún bloque creado para guardar.", "error");
        return;
    }

    var bloque = {
        nombre: "Bloque " + new Date().toLocaleString(),
        n: estadoBusquedas.clavesOriginales.length,
        m: estadoBusquedas.m,
        claves: estadoBusquedas.clavesOriginales,
        metodo: "SECUENCIAL"
    };

    localStorage.setItem(CLAVE_LOCALSTORAGE, JSON.stringify(bloque));
    mostrarMensaje("mensajeBloque", "Bloque guardado localmente.", "exito");
}

/**
 * BACKEND TODO: sustituir por GET /api/busquedas/bloques/{id}.
 */
function cargarUltimoBloque() {
    var datos = localStorage.getItem(CLAVE_LOCALSTORAGE);
    if (!datos) {
        mostrarMensaje("mensajeBloque", "No hay ningún bloque guardado.", "error");
        return;
    }

    try {
        var bloque = JSON.parse(datos);
        establecerBloqueActual(bloque.claves, bloque.m);
        document.getElementById("inputN").value = bloque.n;
        document.getElementById("inputM").value = bloque.m;
        mostrarMensaje("mensajeBloque", "Bloque cargado: " + bloque.nombre, "exito");
    } catch (error) {
        mostrarMensaje("mensajeBloque", "El bloque guardado está corrupto y no pudo cargarse.", "error");
    }
}

/**
 * BACKEND TODO: sustituir por DELETE /api/busquedas/bloques/{id}.
 */
function eliminarBloqueGuardado() {
    localStorage.removeItem(CLAVE_LOCALSTORAGE);
    mostrarMensaje("mensajeBloque", "Bloque guardado eliminado.", "info");
}

// =====================================================================
// UTILIDADES COMUNES
// =====================================================================

/** Agrega una línea de texto al log de pasos (búsqueda secuencial/binaria). */
function agregarLineaLog(contenedorLog, texto, esEncontrado) {
    var linea = document.createElement("div");
    if (esEncontrado) {
        linea.className = "log-encontrado";
    }
    linea.textContent = texto;
    contenedorLog.appendChild(linea);
    contenedorLog.scrollTop = contenedorLog.scrollHeight;
}

/** Muestra un mensaje de estado (error, éxito, advertencia o info) en el contenedor indicado. */
function mostrarMensaje(idContenedor, texto, tipo) {
    var contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = '<div class="mensaje mensaje--' + tipo + '">' + texto + '</div>';
}
