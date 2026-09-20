/**
 * talent-page.js
 * ------------------------------------------------------------------
 * Da includere in OGNI pagina singola dei talent (es. Shizen.html,
 * Bugalalla.html, ecc.). Legge l'attributo data-creator sull'elemento
 * ".talent-info__container" e popola automaticamente le "platform card"
 * (Instagram / YouTube / TikTok / Twitch) con i follower presi dal
 * Google Sheet, mostrando solo le piattaforme che hanno un valore.
 *
 * Nell'HTML della pagina talent serve solo:
 *   <div class="talent-info__container" data-creator="Shizen">
 *
 * e i due script, nell'ordine:
 *   <script src="../../assets/js/creators-data.js"></script>
 *   <script src="../../assets/js/talent-page.js"></script>
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  // Percorso icone relativo alla cartella pages/talents/
  var PLATFORM_ICONS = {
    INSTAGRAM: '../../images/elements/Insta.png',
    YOUTUBE: '../../images/elements/Youtube.png',
    TIKTOK: '../../images/elements/TikTok.png',
    TWITCH: '../../images/elements/Twitch.png'
  };

  // Ordine di visualizzazione delle card
  var PLATFORM_ORDER = ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'TWITCH'];

  document.addEventListener('DOMContentLoaded', function () {
    var container = document.querySelector('[data-creator]');
    var platformContainer = document.querySelector('.platform__container');
    if (!container || !platformContainer || !window.CreatorsData) return;

    var creatorName = container.getAttribute('data-creator');

    CreatorsData.getCreatorsData().then(function (data) {
      var row = CreatorsData.findCreator(data, creatorName);

      if (!row) {
        console.warn(
          'Nessun dato trovato nel Google Sheet per il creator:',
          creatorName,
          '- lascio le card esistenti invariate.'
        );
        return;
      }

      // Svuota le card statiche nell'HTML e le ricrea in base al foglio
      platformContainer.innerHTML = '';

      PLATFORM_ORDER.forEach(function (key) {
        var raw = row[key];
        var n = CreatorsData.parseFollowers(raw);
        if (!raw || n <= 0) return; // niente card se il creator non è su quella piattaforma

        var card = document.createElement('div');
        card.className = 'platform__card';
        card.innerHTML =
          '<img src="' + PLATFORM_ICONS[key] + '" alt="">' +
          '<p class="card__text">' + CreatorsData.formatFollowers(n) + ' <br>Followers</p>';
        platformContainer.appendChild(card);
      });
    });
  });
})();
