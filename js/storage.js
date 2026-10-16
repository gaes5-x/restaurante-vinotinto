(function () {
  "use strict";

  function redirectToErrorPage(error) {
    console.error("No fue posible acceder a localStorage.", error);
    window.location.replace(new URL("500.html", document.baseURI).href);
  }

  function get(key) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? null : JSON.parse(value);
    } catch (error) {
      redirectToErrorPage(error);
      return null;
    }
  }

  function set(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      if (typeof serializedValue !== "string") {
        throw new TypeError("El valor no se puede guardar en localStorage.");
      }
      window.localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      redirectToErrorPage(error);
      return false;
    }
  }

  function remove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      redirectToErrorPage(error);
      return false;
    }
  }

  window.vinotintoStorage = Object.freeze({ get, set, remove });
})();
