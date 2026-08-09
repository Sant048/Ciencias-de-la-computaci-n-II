/**
 * frontend/js/main.js
 *
 * ============================================================
 * COPIA ADAPTADA — ver nota de sincronización al final del archivo
 * ============================================================
 * Misma responsabilidad que src/main/resources/static/js/main.js
 * (menú móvil + categorías expandibles del sidebar), pero con UN
 * único cambio necesario para funcionar en modo standalone:
 *
 *   En la versión Spring/Thymeleaf, el header y el sidebar YA están
 *   en el HTML cuando el navegador dispara "DOMContentLoaded" (los
 *   insertó el servidor antes de enviar la respuesta).
 *
 *   En este modo standalone, el header/sidebar se insertan DESPUÉS,
 *   de forma asíncrona, mediante fetch (ver incluir-partials.js). Por
 *   eso aquí escuchamos el evento personalizado "partials:listas" en
 *   lugar de "DOMContentLoaded" para inicializar el menú.
 *
 * El resto de la lógica es idéntica a la versión Spring.
 */
document.addEventListener("partials:listas", function () {
    inicializarMenuMovil();
    inicializarCategoriasExpandibles();
});

/**
 * Permite mostrar/ocultar el menú lateral (sidebar) en pantallas
 * pequeñas mediante el botón de hamburguesa del encabezado.
 */
function inicializarMenuMovil() {
    var boton = document.getElementById("btnMenuMovil");
    var sidebar = document.getElementById("sidebar");

    if (!boton || !sidebar) {
        return;
    }

    boton.addEventListener("click", function () {
        sidebar.classList.toggle("abierto");
    });

    sidebar.querySelectorAll("a").forEach(function (enlace) {
        enlace.addEventListener("click", function () {
            sidebar.classList.remove("abierto");
        });
    });
}

/**
 * Permite expandir o contraer cada categoría del menú lateral
 * (por ejemplo, "Algoritmos de búsqueda") al hacer clic sobre su título.
 */
function inicializarCategoriasExpandibles() {
    var botones = document.querySelectorAll(".sidebar__categoria-toggle");

    botones.forEach(function (boton) {
        var idSubmenu = boton.getAttribute("data-target");
        var submenu = document.getElementById(idSubmenu);

        if (!submenu) {
            return;
        }

        boton.setAttribute("aria-expanded", "true");

        boton.addEventListener("click", function () {
            var expandidoActualmente = boton.getAttribute("aria-expanded") === "true";
            boton.setAttribute("aria-expanded", String(!expandidoActualmente));
            submenu.style.display = expandidoActualmente ? "none" : "flex";
        });
    });
}

/*
 * ============================================================
 * SINCRONIZACIÓN CON LA VERSIÓN SPRING BOOT
 * ============================================================
 * Si se modifica inicializarMenuMovil() o inicializarCategoriasExpandibles()
 * aquí (por ejemplo, para cambiar el comportamiento del menú), replicar el
 * mismo cambio en:
 *     src/main/resources/static/js/main.js
 * La ÚNICA diferencia intencional entre ambos archivos debe ser el evento
 * que dispara la inicialización (DOMContentLoaded vs partials:listas).
 * ============================================================
 */
