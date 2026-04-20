function toggleEdit() {
  editMode = !editMode;
  document.body.classList.toggle("edit-mode", editMode);
  var eb = document.getElementById("editBtn");
  eb.textContent = editMode ? "Готово" : "Правка";
  eb.classList.toggle("active", editMode);
  var rollBtnEl = document.getElementById("rollBtn");
  if (rollBtnEl) rollBtnEl.disabled = editMode;
  
  renderStats(); 
  renderEquip(); 
  renderBag(); 
  renderIdentity(curChar);
  
  // При выходе из edit mode - пересчет выдержки и обновление интерфейса
  if (!editMode) {
    setTimeout(function() {
      renderBag();  // Повторная перерисовка мешка с актуальными проверками выдержки
      var enduranceModal = document.getElementById("enduranceModal");
      if (enduranceModal && enduranceModal.classList.contains("open")) {
        renderEndurance();
      }
    }, 50);
  }
}

function rollNew() {
  if (editMode) return;
  var btn = document.getElementById("rollBtn") || document.querySelector('[id="rollBtn"]');
  var menuBtn = document.querySelector('.menu-btn.roll-btn');
  if (!btn) return;
  
  // Увеличиваем счетчик нажатий
  rollClickCount++;
  
  // Если нажали менее 4 раз - трясем кнопку и обновляем стиль
  if (rollClickCount < 4) {
    btn.classList.add('unlock-shake');
    setTimeout(function() { btn.classList.remove('unlock-shake'); }, 200);
    
    // Обновляем класс для grayscale: click 1 = unlock-2, click 2 = unlock-1, click 3 = готова
    btn.classList.remove('unlock-0', 'unlock-1', 'unlock-2', 'unlock-3');
    if (rollClickCount === 1) {
      btn.classList.add('unlock-2');
    } else if (rollClickCount === 2) {
      btn.classList.add('unlock-1');
    }
    // При rollClickCount === 3 никаких классов - полностью живая
    
    if (menuBtn) {
      menuBtn.classList.remove('unlock-0', 'unlock-1', 'unlock-2', 'unlock-3');
      if (rollClickCount === 1) {
        menuBtn.classList.add('unlock-2');
      } else if (rollClickCount === 2) {
        menuBtn.classList.add('unlock-1');
      }
      menuBtn.classList.add('unlock-shake');
      setTimeout(function() { menuBtn.classList.remove('unlock-shake'); }, 200);
    }
    return;
  }
  
  // После 4 нажатий генерируем нового персонажа
  btn.disabled = true; 
  btn.textContent = "Бросаем...";
  btn.classList.remove('unlock-0', 'unlock-1', 'unlock-2');
  
  if (menuBtn) {
    menuBtn.disabled = true;
    menuBtn.textContent = "Бросаем...";
    menuBtn.classList.remove('unlock-0', 'unlock-1', 'unlock-2');
  }
  
  fetch("/roll").then(function(r){ return r.json(); })
    .then(function(c){
      initFromChar(c); renderAll();
      rollClickCount = 0; // Сбрасываем счетчик
      btn.disabled = false; 
      btn.textContent = "Ещё раз";
      btn.classList.remove('unlock-0', 'unlock-1', 'unlock-2', 'unlock-3');
      btn.classList.add('unlock-3'); // Снова очень серая
      
      if (menuBtn) {
        menuBtn.disabled = false;
        menuBtn.textContent = "Ещё раз";
        menuBtn.classList.remove('unlock-0', 'unlock-1', 'unlock-2', 'unlock-3');
        menuBtn.classList.add('unlock-3');
      }
      
      // Закрываем меню только после успешной генерации
      if (document.querySelector('.menu-panel.active')) {
        toggleMenu();
      }
    }).catch(function(){ location.reload(); });
}

// ── Boot ──────────────────────────────────────────────────────────────────
// Сохранение / Загрузка
function buildSaveState() {
  var ni = document.querySelector(".char-name-input");
  if (ni) curChar.name = ni.value;
  var pi = document.querySelector(".pips-input");
  if (pi) curChar.pips = parseInt(pi.value) || 0;
  return {
    v: 1,
    meta: {
      name:            curChar.name            || "",
      background:      curChar.background      || "",
      birthsign:       curChar.birthsign       || "",
      disposition:     curChar.disposition     || "",
      coat:            curChar.coat            || "",
      physical_detail: curChar.physical_detail || "",
      pips:            curChar.pips            || 0
    },
    statMax: statMax,
    statCur: statCur,
    cardMap: cardMap,
    usage:   usage
  };
}

function exportChar() {
  var json = JSON.stringify(buildSaveState(), null, 2);
  var blob = new Blob([json], {type: "application/json"});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement("a");
  a.href     = url;
  a.download = (curChar.name || "мышь") + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showSaveNotice(message, isError) {
  var notice = document.getElementById("saveNotice");
  if (!notice) return;
  notice.textContent = message;
  notice.classList.toggle("error", !!isError);
  clearTimeout(showSaveNotice._timer);
  showSaveNotice._timer = setTimeout(function() {
    notice.textContent = "";
    notice.classList.remove("error");
  }, 2200);
}

function saveChar() {
  if (window.APP_CONFIG && APP_CONFIG.canPersist && APP_CONFIG.saveUrl) {
    fetch(APP_CONFIG.saveUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(buildSaveState())
    })
      .then(function(r) {
        if (!r.ok) throw new Error("save_failed");
        return r.json();
      })
      .then(function() {
        showSaveNotice("Сохранено");
      })
      .catch(function() {
        showSaveNotice("Не удалось сохранить", true);
      });
    return;
  }
  exportChar();
}

var fileInput = document.getElementById("fileIn");
if (fileInput) fileInput.addEventListener("change", function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var s = JSON.parse(ev.target.result);
      if (!s.v || !s.meta || !s.statMax || !s.cardMap)
        throw new Error("Неверный формат файла");
      curChar          = Object.assign({}, curChar || {}, s.meta);
      curChar.str_val  = s.statMax.str;
      curChar.dex_val  = s.statMax.dex;
      curChar.wil_val  = s.statMax.wil;
      curChar.hp       = s.statMax.hp;
      statMax  = s.statMax;
      statCur  = s.statCur;
      cardMap  = s.cardMap;
      usage    = s.usage || {};
      _tapLock = {};
      if (editMode) {
        editMode = false;
        document.body.classList.remove("edit-mode");
        var eb = document.getElementById("editBtn");
        eb.textContent = "Правка";
        eb.classList.remove("active");
        var rollBtnEl = document.getElementById("rollBtn");
        if (rollBtnEl) rollBtnEl.disabled = false;
      }
      renderAll();
    } catch(err) {
      alert("Ошибка загрузки: " + err.message);
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

// ── V5: Add Card Modal ───────────────────────────────────────────────────
