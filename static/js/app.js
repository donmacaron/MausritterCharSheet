initFromChar(INIT);
renderAll();

// Инициализируем кнопку "Ещё раз" в очень сером состоянии
var rollBtn = document.getElementById("rollBtn");
if (rollBtn) rollBtn.classList.add('unlock-3');
var menuRollBtn = document.querySelector('.menu-btn.roll-btn');
if (menuRollBtn) menuRollBtn.classList.add('unlock-3');
