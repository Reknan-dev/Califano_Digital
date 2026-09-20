/**
 * players-filters.js
 * ------------------------------------------------------------------
 * Collega i filtri della pagina "players.html" ai dati del Google Sheet
 * (numero di follower per piattaforma) e mostra/nasconde le card dei
 * creator in base ai filtri attivi.
 *
 * IMPORTANTE: ogni card ".player__wrapper" deve avere un attributo
 * data-creator="NomeEsattoNelFoglio" che corrisponde al valore della
 * colonna CREATOR nel Google Sheet. Vedi players.html per l'esempio.
 *
 * Richiede che creators-data.js sia incluso PRIMA di questo file.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var wrappers = Array.prototype.slice.call(
      document.querySelectorAll(".player__wrapper"),
    );
    if (wrappers.length === 0 || !window.CreatorsData) return;

    CreatorsData.getCreatorsData().then(function (data) {
      wrappers.forEach(function (wrapper) {
        var nameEl = wrapper.querySelector(".player__name");
        var creatorName =
          wrapper.getAttribute("data-creator") ||
          (nameEl ? nameEl.textContent.trim() : "");

        var row = CreatorsData.findCreator(data, creatorName);

        var yt = row ? CreatorsData.parseFollowers(row.YOUTUBE) : 0;
        var ig = row ? CreatorsData.parseFollowers(row.INSTAGRAM) : 0;
        var tt = row ? CreatorsData.parseFollowers(row.TIKTOK) : 0;
        var tw = row ? CreatorsData.parseFollowers(row.TWITCH) : 0;

        wrapper.dataset.ytFollowers = yt;
        wrapper.dataset.igFollowers = ig;
        wrapper.dataset.tiktokFollowers = tt;
        wrapper.dataset.twitchFollowers = tw;
        wrapper.dataset.totalFollowers = yt + ig + tt + tw;

        if (!row) {
          console.warn(
            "Nessun dato trovato nel Google Sheet per il creator:",
            creatorName,
            "- controlla che il nome in data-creator corrisponda esattamente alla colonna CREATOR del foglio.",
          );
        }
      });

      initFilters(wrappers);
    });

    function getSelectedSocialKey() {
      // Ogni piattaforma social corrisponde al campo dataset popolato sopra.
      // "Facebook" non è presente nel foglio: se selezionato non filtra sui follower.
      var map = {
        TikTok: "tiktokFollowers",
        Youtube: "ytFollowers",
        Instagram: "igFollowers",
        Twitch: "twitchFollowers",
      };
      var ids = Object.keys(map);
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el && el.checked) return map[ids[i]];
      }
      return null;
    }

    

    function applyFilters() {
      var socialKey = getSelectedSocialKey();

      var minSelect = document.getElementById("min");
      var maxSelect = document.getElementById("max");
      var min =
        minSelect && minSelect.value !== "" ? parseFloat(minSelect.value) : 0;
      var max =
        maxSelect && maxSelect.value !== ""
          ? parseFloat(maxSelect.value)
          : Infinity;
      if (maxSelect && maxSelect.value === "Infinity") max = Infinity;

      wrappers.forEach(function (wrapper) {
        var visible = true;

        // Filtro per piattaforma social: mostra solo chi ha follower > 0 su quella piattaforma
        if (socialKey) {
          var socialValue = parseInt(wrapper.dataset[socialKey] || "0", 10);
          if (!socialValue || socialValue <= 0) visible = false;
        }

        // Filtro per numero di follower: se una piattaforma è selezionata
        // si confronta il valore su quella piattaforma, altrimenti il totale.
        var followerValue = socialKey
          ? parseInt(wrapper.dataset[socialKey] || "0", 10)
          : parseInt(wrapper.dataset.totalFollowers || "0", 10);

        if (visible && (followerValue < min || followerValue > max)) {
          visible = false;
        }

        wrapper.style.display = visible ? "" : "none";
      });
    }

    // I filtri "radio" hanno già una logica di toggle-on/off nello script
    // inline della pagina: aspettiamo un istante prima di ri-applicare i filtri
    // in modo da leggere lo stato corretto dopo quel toggle.
    document
      .querySelectorAll('.filter-box input[type="radio"]')
      .forEach(function (radio) {
        radio.addEventListener("click", function () {
          setTimeout(applyFilters, 0);
        });
      });

    var minEl = document.getElementById("min");
    var maxEl = document.getElementById("max");
    if (minEl) minEl.addEventListener("change", applyFilters);
    if (maxEl) maxEl.addEventListener("change", applyFilters);

    document
      .querySelectorAll('.filter-box input[type="radio"]')
      .forEach((radio) => {
        radio.addEventListener("click", function () {
          if (this._wasChecked) {
            this.checked = false;
            this._wasChecked = false;
          } else {
            document
              .querySelectorAll(`input[name="${this.name}"]`)
              .forEach((r) => (r._wasChecked = false));
            this._wasChecked = true;
          }
        });
      });
  });
})();
