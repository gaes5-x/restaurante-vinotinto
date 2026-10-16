(function () {
  "use strict";

  const SESSION_KEY = "vinotinto_session";
  const USERS = Object.freeze({
    admin: Object.freeze({ password: "admin123", rol: "Administrador" }),
    mesero: Object.freeze({ password: "mesero123", rol: "Mesero" }),
    chef: Object.freeze({ password: "chef123", rol: "Chef" })
  });

  function isValidSession(session) {
    return session !== null
      && typeof session === "object"
      && typeof session.usuario === "string"
      && Object.prototype.hasOwnProperty.call(USERS, session.usuario)
      && USERS[session.usuario].rol === session.rol
      && typeof session.fechaHoraIngreso === "string"
      && !Number.isNaN(Date.parse(session.fechaHoraIngreso));
  }

  function initializeLogin() {
    const storedSession = window.vinotintoStorage.get(SESSION_KEY);
    if (isValidSession(storedSession)) {
      window.location.replace("dashboard.html");
      return;
    }

    if (storedSession !== null) {
      window.vinotintoStorage.remove(SESSION_KEY);
    }

    const form = document.getElementById("login-form");
    const usernameInput = document.getElementById("usuario");
    const passwordInput = document.getElementById("contrasena");
    const errorMessage = document.getElementById("login-error");
    const visibilityButton = document.getElementById("mostrar-contrasena");

    function showError(message) {
      errorMessage.textContent = message;
      errorMessage.hidden = false;
      form.classList.add("login__formulario--error");
    }

    function clearError() {
      errorMessage.textContent = "";
      errorMessage.hidden = true;
      form.classList.remove("login__formulario--error");
    }

    visibilityButton.addEventListener("click", function () {
      const showPassword = passwordInput.type === "password";
      passwordInput.type = showPassword ? "text" : "password";
      visibilityButton.setAttribute("aria-pressed", String(showPassword));
      visibilityButton.setAttribute(
        "aria-label",
        showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
      );
      visibilityButton.querySelector("span").textContent = showPassword ? "Ocultar" : "Mostrar";
      passwordInput.focus();
    });

    form.addEventListener("input", clearError);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearError();

      const username = usernameInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      const user = USERS[username];

      if (!user || user.password !== password) {
        showError("Usuario o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.");
        (user ? passwordInput : usernameInput).focus();
        return;
      }

      const session = {
        usuario: username,
        rol: user.rol,
        fechaHoraIngreso: new Date().toISOString()
      };

      if (window.vinotintoStorage.set(SESSION_KEY, session)) {
        window.location.assign("dashboard.html");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initializeLogin);
})();
