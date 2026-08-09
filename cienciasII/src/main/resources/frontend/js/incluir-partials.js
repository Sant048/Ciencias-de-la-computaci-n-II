/**
 * frontend/js/incluir-partials.js
 *
 * ============================================================
 * ARCHIVO TEMPORAL — SOLO PARA DESARROLLO FRONTEND STANDALONE
 * ============================================================
 * Este archivo NO existe en la versión Spring Boot / Thymeleaf del
 * proyecto (src/main/resources/...). Su única razón de ser es permitir
 * probar el frontend con un servidor HTTP estático (python -m http.server,
 * Live Server, etc.), donde no hay motor de plantillas en el servidor.
 *
 * Reemplaza, en el navegador, lo que en Thymeleaf hacen:
 *   th:replace="~{fragments/header :: header}"
 *   th:replace="~{fragments/sidebar :: sidebar}"  th:with="paginaActiva='...'"
 *
 * Funcionamiento:
 *   1. Descarga partials/header.html y partials/sidebar.html vía fetch().
 *   2. Los inyecta dentro de los contenedores #contenedorHeader / #contenedorSidebar
 *      que cada página estática debe declarar en su <body>.
 *   3. Marca como "activo" el enlace del sidebar cuya "data-pagina" coincide
 *      con la página actual (usando <body data-pagina-actual="..."> como
 *      equivalente estático de la variable paginaActiva de Thymeleaf).
 *   4. Dispara un evento personalizado "partials:listas" en document,
 *      para que otros scripts (ver js/main.js) puedan inicializar el
 *      comportamiento del menú (hamburguesa, categorías expandibles)
 *      una vez que el header/sidebar YA existen en el DOM.
 *
 * IMPORTANTE: requiere que la página se sirva por HTTP (fetch falla con
 * file://). Por eso el enunciado pide "python -m http.server" o Live Server.
 *
 * SINCRONIZACIÓN FUTURA: cuando el frontend definitivo se sirva desde
 * Spring Boot, este archivo se elimina y las páginas vuelven a usar
 * directamente los fragments de Thymeleaf (que ya existen y no se
 * tocaron en este cambio).
 */
document.addEventListener("DOMContentLoaded", function () {
    var contenedorHeader = document.getElementById("contenedorHeader");
    var contenedorSidebar = document.getElementById("contenedorSidebar");

    if (!contenedorHeader || !contenedorSidebar) {
        // La página no usa el layout compartido (poco probable en este proyecto,
        // pero se evita romper si faltan los contenedores).
        document.dispatchEvent(new CustomEvent("partials:listas"));
        return;
    }

    Promise.all([
        fetch("partials/header.html").then(function (respuesta) { return respuesta.text(); }),
        fetch("partials/sidebar.html").then(function (respuesta) { return respuesta.text(); })
    ])
        .then(function (resultados) {
            contenedorHeader.innerHTML = resultados[0];
            contenedorSidebar.innerHTML = resultados[1];
            marcarPaginaActiva();
            // Notifica a main.js (y a cualquier otro script) que el header/sidebar
            // ya están en el DOM y pueden inicializarse con seguridad.
            document.dispatchEvent(new CustomEvent("partials:listas"));
        })
        .catch(function (error) {
            console.error("No se pudieron cargar header/sidebar. ¿Se está sirviendo la página por HTTP " +
                "(python -m http.server / Live Server) y no abriendo el archivo directamente?", error);
        });
});

/**
 * Resalta el enlace del sidebar correspondiente a la página actual,
 * equivalente estático de th:classappend en fragments/sidebar.html.
 * La página actual se declara en <body data-pagina-actual="...">.
 */
function marcarPaginaActiva() {
    var paginaActual = document.body.getAttribute("data-pagina-actual");
    if (!paginaActual) {
        return; // p.ej. index.html no resalta ninguna opción del submenú
    }

    var enlace = document.querySelector('.sidebar__submenu a[data-pagina="' + paginaActual + '"]');
    if (enlace) {
        enlace.classList.add("activo");
    }
}
