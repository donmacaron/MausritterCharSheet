var _mType    = "item";
var _mWeight  = "";
var _mDice    = "d6";
var _mDef     = 1;
var _mEffect  = "";
var _mCure    = "";
var _mRecharge = "";

function openModal() {
  // reset form
  _mType = "item"; _mWeight = ""; _mDice = "d6"; _mDef = 1; _mEffect = ""; _mCure = ""; _mRecharge = "";
  selBtn("segType",   "item");
  selBtn("segWeight", "");
  selBtn("segDice",   "d6");
  document.getElementById("cardName").value = "";
  document.getElementById("cardDef").value = "1";
  document.getElementById("cardEffect").value = "";
  document.getElementById("cardCure").value = "";
  document.getElementById("cardRecharge").value = "";
  document.getElementById("modalErr").textContent = "";
  document.getElementById("diceRow").style.display = "none";
  document.getElementById("defRow").style.display  = "none";
  document.getElementById("statusRow").style.display = "none";
  document.getElementById("statusCureRow").style.display = "none";
  document.getElementById("spellRow").style.display = "none";
  document.getElementById("spellRechargeRow").style.display = "none";
  document.getElementById("segWeight").parentElement.style.display = "";
  document.getElementById("modalOverlay").classList.add("open");
  setTimeout(function(){ document.getElementById("cardName").focus(); }, 80);
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

function overlayClick(e) {
  if (e.target === document.getElementById("modalOverlay")) closeModal();
}

function selBtn(groupId, val) {
  var btns = document.getElementById(groupId).querySelectorAll("button");
  btns.forEach(function(b){ b.classList.toggle("sel", b.getAttribute("data-val") === val); });
}

function pick(kind, btn) {
  var val = btn.getAttribute("data-val");
  if (kind === "type") {
    _mType = val;
    selBtn("segType", val);
    document.getElementById("diceRow").style.display = (val === "weapon") ? "" : "none";
    document.getElementById("defRow").style.display  = (val === "armour" || val === "shield") ? "" : "none";
    document.getElementById("statusRow").style.display = (val === "status") ? "" : "none";
    document.getElementById("statusCureRow").style.display = (val === "status") ? "" : "none";
    document.getElementById("spellRow").style.display = (val === "spell") ? "" : "none";
    document.getElementById("spellRechargeRow").style.display = (val === "spell") ? "" : "none";
    document.getElementById("segWeight").parentElement.style.display = (val === "shield" || val === "ammo") ? "none" : "";
  } else if (kind === "weight") {
    _mWeight = val;
    selBtn("segWeight", val);
  } else if (kind === "dice") {
    _mDice = val;
    selBtn("segDice", val);
  } else if (kind === "def") {
    _mDef = parseInt(val);
    selBtn("segDef", val);
  }
}

function addCard() {
  var name = document.getElementById("cardName").value.trim();
  var err  = document.getElementById("modalErr");
  err.textContent = "";

  if (!name) { err.textContent = "Укажите название."; return; }

  // Читаем def из input поля для armor и shield
  var defVal = null;
  if (_mType === "armour" || _mType === "shield") {
    var defInput = document.getElementById("cardDef").value.trim();
    defVal = defInput ? parseInt(defInput) : null;
  }

  var newCard = {
    name:   name,
    type:   _mType,
    weight: (_mType === "shield" || _mType === "ammo") ? null : (_mWeight || null),
    dice:   (_mType === "weapon") ? _mDice : null,
    def:    (_mType === "armour" || _mType === "shield") ? defVal : null,
    effect: (_mType === "status" || _mType === "spell") ? document.getElementById("cardEffect").value.trim() : null,
    cure:   (_mType === "status") ? document.getElementById("cardCure").value.trim() : null,
    recharge: (_mType === "spell") ? document.getElementById("cardRecharge").value.trim() : null
  };

  // Специальный случай: "Щит и куртка" - добавить броню и щит
  console.log("DEBUG addCard: _mType=" + _mType + ", name=" + name);
  if (_mType === "armour" && name === "Щит и куртка") {
    console.log("DEBUG: Специальный случай Щит и куртка активирован!");
    // Экипировать броню в eq_arm1
    if (!cardMap["eq_arm1"]) {
      cardMap["eq_arm1"] = newCard;
      usage["eq_arm1"] = 0;
    } else {
      err.textContent = "Слот для брони занят!";
      return;
    }
    
    // Если оружие во второй лапе, убрать его в мешок
    if (cardMap["eq_off"] && cardMap["eq_off"].type === "weapon") {
      var weapon = cardMap["eq_off"];
      var freeSlot = null;
      
      // Если тяжелое оружие - ищем две подряд ячейки
      if (weapon.weight === "тяжёлое") {
        for (var i = 0; i < 8; i++) {
          if (!cardMap["b" + i] && !cardMap["b" + (i + 1)]) {
            freeSlot = "b" + i;
            break;
          }
        }
      } else {
        // Обычное оружие - одна ячейка
        for (var i = 0; i < 9; i++) {
          if (!cardMap["b" + i]) {
            freeSlot = "b" + i;
            break;
          }
        }
      }
      
      if (freeSlot) {
        cardMap[freeSlot] = weapon;
        usage[freeSlot] = usage["eq_off"] || 0;
        
        // Если тяжелое, создать плейсхолдер
        if (weapon.weight === "тяжёлое") {
          var nextSlot = "b" + (parseInt(freeSlot.substring(1)) + 1);
          cardMap[nextSlot] = {placeholder: true, linkedTo: freeSlot};
        }
      }
      
      // Очистить плейсхолдер со второй лапы
      if (cardMap["eq_off"] && cardMap["eq_off"].placeholder) {
        cardMap["eq_off"] = null;
      }
    }
    
    // Экипировать щит во вторую лапу
    var shield = {name: "Щит", def: 1, type: "shield"};
    cardMap["eq_off"] = shield;
    usage["eq_off"] = 0;
    
    renderBag();
    renderEquip();
    closeModal();
    return;
  }

  // Find first empty bag slot(s)
  var placed = false;
  
  // Любой предмет с весовым классом "тяжёлое" занимает две ячейки в мешке
  if (_mWeight === "тяжёлое") {
    for (var i = 0; i < 8; i++) {
      if (!cardMap["b" + i] && !cardMap["b" + (i + 1)]) {
        cardMap["b" + i] = newCard;
        usage["b" + i] = 0;
        cardMap["b" + (i + 1)] = {placeholder: true, linkedTo: "b" + i};
        placed = true;
        break;
      }
    }
  } else {
    // Обычное оружие, предметы, щит и аммуниция занимают одну ячейку
    for (var i = 0; i < 9; i++) {
      if (!cardMap["b" + i]) {
        cardMap["b" + i] = newCard;
        usage["b" + i]   = 0;
        placed = true;
        break;
      }
    }
  }

  // Bag full — try equip slots
  if (!placed) {
    var equipSlots = (_mType === "weapon")
      ? ["eq_main", "eq_off"]
      : (_mType === "armour")
        ? ["eq_arm1", "eq_arm2"]
        : (_mType === "ammo")
          ? ["eq_arm2"]
          : [];
    for (var j = 0; j < equipSlots.length; j++) {
      var sid = equipSlots[j];
      if (!cardMap[sid]) {
        cardMap[sid] = newCard;
        usage[sid]   = 0;
        placed = true;
        break;
      }
    }
  }

  if (!placed) {
    err.textContent = "Инвентарь полон. Удалите что-нибудь перед добавлением.";
    return;
  }

  renderBag();
  renderEquip();
  closeModal();
}

// ── Menu Toggle ───────────────────────────────────────────────────────────
function toggleMenu() {
  var menuPanel = document.getElementById("menuPanel");
  var menuOverlay = document.getElementById("menuOverlay");
  menuPanel.classList.toggle("open");
  menuOverlay.classList.toggle("open");
}

// ── Spells Modal ──────────────────────────────────────────────────────────
function openSpells() {
  document.getElementById("spellsModal").classList.add("open");
}

function closeSpells() {
  document.getElementById("spellsModal").classList.remove("open");
}

function openMagic() {
  document.getElementById("magicModal").classList.add("open");
}

function closeMagic() {
  document.getElementById("magicModal").classList.remove("open");
}

function showStatusDetails(statusId) {
  var status = STATUSES.find(function(s){ return s.id === statusId; });
  if (!status) return;
  
  document.getElementById("detailsTitle").textContent = status.name;
  var content = "<div style='margin:16px 0'>";
  if (status.effect) {
    content += "<div style='margin-bottom:12px'><strong>Эффект:</strong><br>" + esc(status.effect) + "</div>";
  }
  content += "<div><strong>Избавиться:</strong><br>" + esc(status.cure) + "</div>";
  content += "</div>";
  document.getElementById("detailsContent").innerHTML = content;
  document.getElementById("detailsModal").classList.add("open");
}

function showSpellDetails(spellName) {
  var spell = SPELLS.find(function(s){ return s.name === spellName; });
  if (!spell) return;
  
  document.getElementById("detailsTitle").textContent = spell.name;
  var content = "<div style='margin:16px 0'>";
  content += "<div style='margin-bottom:12px'><strong>Эффект:</strong><br>" + esc(spell.effect) + "</div>";
  content += "<div><strong>Перезарядка:</strong><br>" + esc(spell.recharge) + "</div>";
  content += "</div>";
  document.getElementById("detailsContent").innerHTML = content;
  document.getElementById("detailsModal").classList.add("open");
}

function closeDetails() {
  document.getElementById("detailsModal").classList.remove("open");
}

function addSpellToInventory(spellName) {
  // Проверяем свободные слоты в мешке
  var freeBagSlot = null;
  for (var i = 0; i < 9; i++) {
    if (!cardMap["b" + i]) {
      freeBagSlot = i;
      break;
    }
  }
  
  if (freeBagSlot !== null) {
    // Есть свободное место - добавляем заклинание
    var spellCard = {type: "spell", name: spellName};
    cardMap["b" + freeBagSlot] = spellCard;
    usage["b" + freeBagSlot] = 0;
    renderBag();
    closeSpells();
  } else {
    // Нет свободного места - показываем ошибку
    var errDiv = document.getElementById("errorOverlay");
    document.getElementById("errorMsg").textContent = "Мешок полон! Удалите что-нибудь перед добавлением.";
    errDiv.classList.add("open");
  }
}

function openStatus() {
  var grid = document.getElementById("statusGrid");
  grid.innerHTML = "";
  STATUSES.forEach(function(status) {
    var card = document.createElement("div");
    card.className = "status-card";
    card.innerHTML = '<div class="status-card-name">' + status.name + '</div>';
    if (status.effect) {
      card.innerHTML += '<div class="status-card-effect">' + status.effect + '</div>';
    }
    card.innerHTML += '<div class="status-card-cure"><strong>Избавиться:</strong> ' + status.cure + '</div>';
    card.onclick = function() { addStatusToInventory(status); };
    grid.appendChild(card);
  });
  document.getElementById("statusModal").classList.add("open");
}

function closeStatus() {
  document.getElementById("statusModal").classList.remove("open");
}

function openRest() {
  document.getElementById("restModal").classList.add("open");
}

function closeRest() {
  document.getElementById("restModal").classList.remove("open");
}

function openDevelopment() {
  document.getElementById("developmentModal").classList.add("open");
}

function closeDevelopment() {
  document.getElementById("developmentModal").classList.remove("open");
}

function openEndurance() {
  renderEndurance();
  document.getElementById("enduranceModal").classList.add("open");
}

function closeEndurance() {
  document.getElementById("enduranceModal").classList.remove("open");
}

function renderEndurance() {
  var grid = document.getElementById("enduranceGrid");
  if (!grid) return;
  grid.innerHTML = "";
  
  var maxEnd = statMax.end || 0;
  var curEnd = statCur.end || 0;
  
  for (var i = 0; i < 6; i++) {
    var slotId = "en" + i;
    var card = cardMap[slotId];
    var isActive = i < maxEnd;  // Активный слот = если номер < максимальному значению ВЫД
    var slot = document.createElement("div");
    slot.style.position = "relative";
    
    if (isActive && card) {
      // Активный слот с карточкой - показать карточку и кнопку удаления
      slot.innerHTML = cardHTML(slotId, true) + 
        '<button class="del-btn" data-del-from-endurance="' + slotId + '" title="Удалить">×</button>';
    } else if (isActive) {
      // Активный пустой слот
      slot.innerHTML = '<div class="card empty">&mdash;</div>';
    } else {
      // Неактивный слот (серый, отключен)
      slot.innerHTML = '<div class="card empty disabled" style="opacity:0.3">&mdash;</div>';
    }
    
    grid.appendChild(slot);
  }
}

function addStatusToInventory(status) {
  // Проверяем свободные слоты в мешке
  var freeBagSlot = null;
  for (var i = 0; i < 9; i++) {
    if (!cardMap["b" + i]) {
      freeBagSlot = i;
      break;
    }
  }
  
  if (freeBagSlot !== null) {
    // Есть свободное место - добавляем состояние
    var statusCard = {type: "status", name: status.name, id: status.id};
    cardMap["b" + freeBagSlot] = statusCard;
    renderBag();
    closeStatus();
  } else {
    // Нет свободного места - показываем список для удаления
    selectedStatusToAdd = status;
    showSelectModal();
  }
}

function showSelectModal() {
  var list = document.getElementById("selectList");
  list.innerHTML = "";
  var hasItems = false;
  
  // Показываем все предметы в мешке и руках (которые можно удалить)
  for (var i = 0; i < 9; i++) {
    var item = cardMap["b" + i];
    if (item) {
      hasItems = true;
      createSelectItem(item, "b" + i, list);
    }
  }
  
  if (!hasItems) {
    list.innerHTML = '<div style="padding:10px;text-align:center;color:var(--muted)">Нечего удалять!</div>';
  }
  
  document.getElementById("selectModal").classList.add("open");
}

function createSelectItem(item, slotId, container) {
  var itemDiv = document.createElement("div");
  itemDiv.className = "select-item";
  var name = item.name || (item.type === "status" ? item.name : item.type);
  itemDiv.innerHTML = '<div class="select-item-name">' + name + '</div>';
  itemDiv.onclick = function() {
    deleteItemAndAddStatus(slotId);
  };
  container.appendChild(itemDiv);
}

function deleteItemAndAddStatus(slotId) {
  // Удаляем предмет
  cardMap[slotId] = null;
  
  // Добавляем состояние на его место
  cardMap[slotId] = {type: "status", name: selectedStatusToAdd.name, id: selectedStatusToAdd.id};
  selectedStatusToAdd = null;
  
  renderBag();
  closeSelectModal();
  closeStatus();
}

function closeSelectModal() {
  document.getElementById("selectModal").classList.remove("open");
  selectedStatusToAdd = null;
}

document.addEventListener("click", function(e) {
  var spellsModal = document.getElementById("spellsModal");
  if (e.target === spellsModal) closeSpells();
  var magicModal = document.getElementById("magicModal");
  if (e.target === magicModal) closeMagic();
  var statusModal = document.getElementById("statusModal");
  if (e.target === statusModal) closeStatus();
  var restModal = document.getElementById("restModal");
  if (e.target === restModal) closeRest();
  var developmentModal = document.getElementById("developmentModal");
  if (e.target === developmentModal) closeDevelopment();
  var enduranceModal = document.getElementById("enduranceModal");
  if (e.target === enduranceModal) closeEndurance();
});
