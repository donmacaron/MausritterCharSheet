initFromChar(INIT);
renderAll();

var saveButton = document.querySelector('.menu-btn[onclick*="saveChar"]');
if (saveButton && window.APP_CONFIG && APP_CONFIG.saveLabel) {
  saveButton.textContent = APP_CONFIG.saveLabel;
  saveButton.title = APP_CONFIG.saveLabel;
}

if (window.APP_CONFIG && !APP_CONFIG.isGuest) {
  var loadButton = document.querySelector('.menu-btn[onclick*="fileIn"]');
  if (loadButton) loadButton.style.display = "none";
  var fileInput = document.getElementById("fileIn");
  if (fileInput) fileInput.style.display = "none";
  var rollMenuButton = document.querySelector('.menu-btn.roll-btn');
  if (rollMenuButton) rollMenuButton.style.display = "none";
  
  // Показать кнопку портрета в account режиме
  var portraitBtn = document.getElementById("portraitBtn");
  if (portraitBtn) {
    portraitBtn.style.display = "block";
  }
}

// Инициализируем кнопку "Ещё раз" в очень сером состоянии
var rollBtn = document.getElementById("rollBtn");
if (rollBtn) rollBtn.classList.add('unlock-3');
var menuRollBtn = document.querySelector('.menu-btn.roll-btn');
if (menuRollBtn) menuRollBtn.classList.add('unlock-3');

var preloader = document.getElementById("preloader");
if (preloader) {
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      preloader.classList.add("is-hidden");
    });
  });
}
