/**
 * transformacion-claves.js
 *
 * Lógica interactiva de la página /transformacion-claves:
 *   - Cálculo de funciones hash: Módulo, Cuadrado (mid-square),
 *     Truncamiento y Plegamiento, mostrando el procedimiento completo.
 *   - Tabla hash interactiva con inserción de claves y resolución de
 *     colisiones mediante: Lineal, Cuadrática, Doble Hash, Anidados y
 *     Encadenamiento.
 *
 * CONVENCIONES (deben coincidir exactamente con las documentadas en
 * HashService.java y CollisionService.java, para que el comportamiento
 * del frontend sea idéntico al de la futura API REST):
 *
 *  - Cuadrado: se extraen del centro del cuadrado de la clave tantos
 *    dígitos como los necesarios para representar (tamanoTabla - 1).
 *  - Plegamiento: los grupos se forman de derecha a izquierda y se SUMAN.
 *  - Cuadrática: h(k,i) = (h(k) + c1*i + c2*i^2) mod m, con c1 = c2 = 1.
 *  - Doble Hash: h(k,i) = (h1(k) + i*h2(k)) mod m, con
 *    h2(k) = 1 + (k mod (m - 1)).
 *  - Anidados: cada posición admite hasta 2 claves antes de recurrir a
 *    sondeo lineal como desbordamiento (ver CAPACIDAD_ANIDADO).
 *
 * BACKEND TODO: sustituir estos cálculos por llamadas a
 *   POST /api/hash/calcular
 *   POST /api/hash/insertar
 * reutilizando HashService y CollisionService del backend.
 */

var CAPACIDAD_ANIDADO = 2;

// Estado de la tabla hash interactiva.
// Cada posición es SIEMPRE una lista (array) de claves, para poder
// representar de manera uniforme tanto "vacío" ([]) como encadenamiento
// o anidados (varias claves en la misma posición).
var estadoTablaHash = {
    tabla: [],       // Array<Array<string>>
    metodo: "lineal"
};

document.addEventListener("DOMContentLoaded", function () {
    inicializarSelectorFuncionHash();
    document.getElementById("btnCalcularHash").addEventListener("click", calcularFuncionHash);
    document.getElementById("btnCrearTabla").addEventListener("click", crearTablaHash);
    document.getElementById("btnInsertarClave").addEventListener("click", insertarClaveEnTabla);
});

// =====================================================================
// 1. CÁLCULO DE FUNCIONES HASH
// =====================================================================

/** Muestra/oculta los campos adicionales según la función hash seleccionada. */
function inicializarSelectorFuncionHash() {
    var select = document.getElementById("selectFuncionHash");
    select.addEventListener("change", actualizarCamposFuncionHash);
    actualizarCamposFuncionHash();
}

function actualizarCamposFuncionHash() {
    var funcion = document.getElementById("selectFuncionHash").value;
    document.getElementById("grupoPosicionesTruncamiento").style.display = funcion === "truncamiento" ? "block" : "none";
    document.getElementById("grupoTamanoGrupo").style.display = funcion === "plegamiento" ? "block" : "none";
}

function calcularFuncionHash() {
    var funcion = document.getElementById("selectFuncionHash").value;
    var claveTexto = document.getElementById("inputClaveHash").value.trim();
    var tamanoTabla = parseInt(document.getElementById("inputTamanoTabla").value, 10);

    if (!/^\d+$/.test(claveTexto)) {
        mostrarMensaje("mensajeHash", "La clave debe ser un número entero no negativo.", "error");
        return;
    }
    if (isNaN(tamanoTabla) || tamanoTabla <= 1) {
        mostrarMensaje("mensajeHash", "El tamaño de la tabla debe ser mayor que 1.", "error");
        return;
    }

    var clave = parseInt(claveTexto, 10);
    var resultado;

    try {
        if (funcion === "mod") {
            resultado = calcularHashMod(clave, tamanoTabla);
        } else if (funcion === "cuadrado") {
            resultado = calcularHashCuadrado(clave, tamanoTabla);
        } else if (funcion === "truncamiento") {
            var posiciones = document.getElementById("inputPosiciones").value
                .split(",").map(function (p) { return parseInt(p.trim(), 10); });
            resultado = calcularHashTruncamiento(claveTexto, posiciones, tamanoTabla);
        } else if (funcion === "plegamiento") {
            var tamanoGrupo = parseInt(document.getElementById("inputTamanoGrupo").value, 10);
            resultado = calcularHashPlegamiento(claveTexto, tamanoGrupo, tamanoTabla);
        }
    } catch (error) {
        mostrarMensaje("mensajeHash", error.message, "error");
        return;
    }

    document.getElementById("mensajeHash").innerHTML = "";
    var contenedor = document.getElementById("resultadoHash");
    contenedor.style.display = "block";
    contenedor.innerHTML =
        "Clave: " + claveTexto + "\n" +
        "Función: " + resultado.nombreFuncion + "\n" +
        "Cálculo: " + resultado.procedimiento + "\n" +
        "Índice obtenido: " + resultado.indice;
    contenedor.style.whiteSpace = "pre-line";
}

/** h(k) = k mod m */
function calcularHashMod(clave, m) {
    var indice = clave % m;
    return {
        nombreFuncion: "Hash Mod",
        procedimiento: clave + " mod " + m + " = " + indice,
        indice: indice
    };
}

/** Método del cuadrado / mid-square (ver convención documentada arriba). */
function calcularHashCuadrado(clave, m) {
    var cuadrado = clave * clave;
    var digitosNecesarios = String(m - 1).length;

    var textoCuadrado = String(cuadrado);
    if (textoCuadrado.length < digitosNecesarios) {
        textoCuadrado = "0".repeat(digitosNecesarios - textoCuadrado.length) + textoCuadrado;
    }

    var inicio = Math.floor((textoCuadrado.length - digitosNecesarios) / 2);
    var digitosCentrales = textoCuadrado.substring(inicio, inicio + digitosNecesarios);
    var valorExtraido = parseInt(digitosCentrales, 10);
    var indice = valorExtraido % m;

    return {
        nombreFuncion: "Cuadrado",
        procedimiento: clave + "^2 = " + cuadrado + " | dígitos centrales(" + digitosNecesarios + ") = \"" +
            digitosCentrales + "\" -> " + valorExtraido + " mod " + m + " = " + indice,
        indice: indice
    };
}

/** Truncamiento: concatena los dígitos en las posiciones indicadas. */
function calcularHashTruncamiento(claveTexto, posiciones, m) {
    if (!posiciones || posiciones.length === 0 || posiciones.some(isNaN)) {
        throw new Error("Debe indicar al menos una posición válida para truncar.");
    }

    var digitosSeleccionados = "";
    posiciones.forEach(function (posicion) {
        if (posicion < 0 || posicion >= claveTexto.length) {
            throw new Error("La posición " + posicion + " está fuera de rango para la clave " + claveTexto + ".");
        }
        digitosSeleccionados += claveTexto.charAt(posicion);
    });

    var valorExtraido = parseInt(digitosSeleccionados, 10);
    var indice = valorExtraido % m;

    return {
        nombreFuncion: "Truncamiento",
        procedimiento: "posiciones " + JSON.stringify(posiciones) + " -> dígitos = \"" + digitosSeleccionados +
            "\" -> " + valorExtraido + " mod " + m + " = " + indice,
        indice: indice
    };
}

/** Plegamiento (folding) por suma de grupos, formados de derecha a izquierda. */
function calcularHashPlegamiento(claveTexto, tamanoGrupo, m) {
    if (isNaN(tamanoGrupo) || tamanoGrupo <= 0) {
        throw new Error("El tamaño de grupo debe ser un entero positivo.");
    }

    var grupos = [];
    var fin = claveTexto.length;
    while (fin > 0) {
        var inicio = Math.max(0, fin - tamanoGrupo);
        grupos.unshift(claveTexto.substring(inicio, fin));
        fin = inicio;
    }

    var suma = grupos.reduce(function (acumulado, grupo) { return acumulado + parseInt(grupo, 10); }, 0);
    var indice = suma % m;

    return {
        nombreFuncion: "Plegamiento",
        procedimiento: "grupos de " + tamanoGrupo + " dígito(s) = " + JSON.stringify(grupos) +
            " -> suma = " + suma + " -> " + suma + " mod " + m + " = " + indice,
        indice: indice
    };
}

// =====================================================================
// 2. TABLA HASH INTERACTIVA
// =====================================================================

function crearTablaHash() {
    var tamano = parseInt(document.getElementById("inputTamanoTablaInteractiva").value, 10);
    if (isNaN(tamano) || tamano <= 1) {
        mostrarMensaje("mensajeTabla", "El tamaño de la tabla debe ser mayor que 1.", "error");
        return;
    }

    estadoTablaHash.tabla = [];
    for (var i = 0; i < tamano; i++) {
        estadoTablaHash.tabla.push([]);
    }
    estadoTablaHash.metodo = document.getElementById("selectMetodoColision").value;

    document.getElementById("colisionDetectada").style.display = "none";
    mostrarMensaje("mensajeTabla", "Tabla hash creada con tamaño " + tamano + ".", "exito");
    renderizarTablaHash();
}

function insertarClaveEnTabla() {
    if (estadoTablaHash.tabla.length === 0) {
        mostrarMensaje("mensajeTabla", "Primero debe crear la tabla hash.", "error");
        return;
    }

    var claveTexto = document.getElementById("inputClaveInsertar").value.trim();
    if (!/^\d+$/.test(claveTexto)) {
        mostrarMensaje("mensajeTabla", "La clave debe ser un número entero no negativo.", "error");
        return;
    }

    var clave = parseInt(claveTexto, 10);
    var m = estadoTablaHash.tabla.length;
    var indiceInicial = clave % m;
    var metodo = document.getElementById("selectMetodoColision").value;
    estadoTablaHash.metodo = metodo;

    var resultado = insertarSegunMetodo(claveTexto, indiceInicial, m, metodo);

    renderizarTablaHash();
    mostrarResultadoInsercion(claveTexto, resultado);
    document.getElementById("inputClaveInsertar").value = "";
}

/** Despacha la inserción al algoritmo correspondiente según el método elegido. */
function insertarSegunMetodo(claveTexto, indiceInicial, m, metodo) {
    switch (metodo) {
        case "lineal":
            return insertarConSondeo(claveTexto, indiceInicial, m, "Lineal", function (i) { return i; });
        case "cuadratica":
            return insertarConSondeo(claveTexto, indiceInicial, m, "Cuadrática", function (i) { return i + i * i; }); // c1=c2=1
        case "dobleHash":
            var h2 = 1 + (parseInt(claveTexto, 10) % (m - 1)); // convención documentada: h2(k) = 1 + (k mod (m-1))
            return insertarConSondeo(claveTexto, indiceInicial, m, "Doble Hash", function (i) { return i * h2; });
        case "anidados":
            return insertarAnidados(claveTexto, indiceInicial, m);
        case "encadenamiento":
            return insertarEncadenamiento(claveTexto, indiceInicial);
        default:
            throw new Error("Método de colisión no reconocido: " + metodo);
    }
}

/** Lógica genérica de sondeo (usada por Lineal, Cuadrática y Doble Hash). */
function insertarConSondeo(claveTexto, indiceInicial, m, nombreMetodo, funcionDesplazamiento) {
    var tabla = estadoTablaHash.tabla;
    var huboColision = tabla[indiceInicial].length > 0;

    if (!huboColision) {
        tabla[indiceInicial].push(claveTexto);
        return { huboColision: false, indiceInicial: indiceInicial, indiceFinal: indiceInicial, intentos: [], metodo: nombreMetodo, exito: true };
    }

    var intentos = [];
    for (var i = 1; i <= m; i++) {
        var indiceCandidato = ((indiceInicial + funcionDesplazamiento(i)) % m + m) % m;
        var disponible = tabla[indiceCandidato].length === 0;
        intentos.push({ intento: i, indice: indiceCandidato, disponible: disponible });

        if (disponible) {
            tabla[indiceCandidato].push(claveTexto);
            return { huboColision: true, indiceInicial: indiceInicial, indiceFinal: indiceCandidato, intentos: intentos, metodo: nombreMetodo, exito: true };
        }
    }

    return { huboColision: true, indiceInicial: indiceInicial, indiceFinal: -1, intentos: intentos, metodo: nombreMetodo, exito: false };
}

/** Encadenamiento: siempre hay espacio, se agrega a la lista de la posición. */
function insertarEncadenamiento(claveTexto, indiceInicial) {
    var bucket = estadoTablaHash.tabla[indiceInicial];
    var huboColision = bucket.length > 0;
    bucket.push(claveTexto);
    return { huboColision: huboColision, indiceInicial: indiceInicial, indiceFinal: indiceInicial, intentos: [], metodo: "Encadenamiento", exito: true };
}

/** Anidados: hasta CAPACIDAD_ANIDADO claves por posición; si se llena, sondeo lineal de desbordamiento. */
function insertarAnidados(claveTexto, indiceInicial, m) {
    var tabla = estadoTablaHash.tabla;
    var bucket = tabla[indiceInicial];
    var huboColision = bucket.length > 0;

    if (bucket.length < CAPACIDAD_ANIDADO) {
        bucket.push(claveTexto);
        return { huboColision: huboColision, indiceInicial: indiceInicial, indiceFinal: indiceInicial, intentos: [], metodo: "Anidados", exito: true };
    }

    var intentos = [];
    for (var i = 1; i <= m; i++) {
        var indiceCandidato = (indiceInicial + i) % m;
        var candidato = tabla[indiceCandidato];
        var disponible = candidato.length < CAPACIDAD_ANIDADO;
        intentos.push({ intento: i, indice: indiceCandidato, disponible: disponible });

        if (disponible) {
            candidato.push(claveTexto);
            return { huboColision: true, indiceInicial: indiceInicial, indiceFinal: indiceCandidato, intentos: intentos, metodo: "Anidados", exito: true };
        }
    }

    return { huboColision: true, indiceInicial: indiceInicial, indiceFinal: -1, intentos: intentos, metodo: "Anidados", exito: false };
}

/** Muestra en pantalla el detalle de la inserción (incluyendo colisión y método usado, si aplica). */
function mostrarResultadoInsercion(claveTexto, resultado) {
    if (!resultado.huboColision) {
        mostrarMensaje("mensajeTabla",
            "Clave " + claveTexto + " insertada sin colisión en el índice " + resultado.indiceInicial + ".", "exito");
        document.getElementById("colisionDetectada").style.display = "none";
        return;
    }

    var lineas = [
        "Colisión detectada",
        "Clave: " + claveTexto,
        "Índice inicial: " + resultado.indiceInicial,
        "Método: " + resultado.metodo
    ];

    resultado.intentos.forEach(function (intento) {
        lineas.push("Intento " + intento.intento + " -> índice " + intento.indice + (intento.disponible ? " (disponible)" : " (ocupado)"));
    });

    if (resultado.exito) {
        lineas.push("Posición encontrada -> " + resultado.indiceFinal);
        mostrarMensaje("mensajeTabla", "Clave " + claveTexto + " insertada en el índice " + resultado.indiceFinal + " tras resolver la colisión.", "exito");
    } else {
        lineas.push("No se encontró posición disponible: la tabla está llena.");
        mostrarMensaje("mensajeTabla", "No fue posible insertar la clave " + claveTexto + ": la tabla está llena.", "error");
    }

    var contenedorColision = document.getElementById("colisionDetectada");
    contenedorColision.style.display = "block";
    contenedorColision.style.whiteSpace = "pre-line";
    contenedorColision.textContent = lineas.join("\n");
}

/** Redibuja la tabla hash como una tabla HTML índice -> valor(es). */
function renderizarTablaHash() {
    var cuerpo = document.getElementById("cuerpoTablaHash");
    cuerpo.innerHTML = "";

    estadoTablaHash.tabla.forEach(function (bucket, indice) {
        var fila = document.createElement("tr");

        var celdaIndice = document.createElement("td");
        celdaIndice.textContent = indice;

        var celdaValor = document.createElement("td");
        if (bucket.length === 0) {
            celdaValor.textContent = "-";
        } else {
            celdaValor.textContent = bucket.join(", ");
            celdaValor.className = "ocupado";
        }

        fila.appendChild(celdaIndice);
        fila.appendChild(celdaValor);
        cuerpo.appendChild(fila);
    });
}

// =====================================================================
// UTILIDAD COMÚN
// =====================================================================

function mostrarMensaje(idContenedor, texto, tipo) {
    var contenedor = document.getElementById(idContenedor);
    contenedor.innerHTML = '<div class="mensaje mensaje--' + tipo + '">' + texto + '</div>';
}
