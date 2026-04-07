(function () {
  if (window.pannellum && window.pannellum.viewer) {
    return;
  }

  window.pannellum = {
    viewer: function (container, config) {
      var element =
        typeof container === "string"
          ? document.getElementById(container)
          : container;
      if (!element) return;

      var panorama = config && config.panorama ? config.panorama : "";
      element.innerHTML = "";
      element.classList.add("pannellum-fallback");

      var image = document.createElement("img");
      image.src = panorama;
      image.alt = "Visite 360";
      image.className = "pannellum-fallback__image";

      var label = document.createElement("div");
      label.className = "pannellum-fallback__label";
      label.textContent = "Apercu 360 (mode local)";

      element.appendChild(image);
      element.appendChild(label);
    },
  };
})();
