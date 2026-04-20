function $t(id, v){ var e = document.getElementById(id); if (e) e.textContent = v; }

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getDef(item) {
  if (item.def != null) return item.def;
  if (item.weight === "тяжёлое") return 2;
  if (item.weight === "среднее") return 1;
  return 0;
}

function dotsStr(n) {
  // n = 0..3 filled dots; returns plain Unicode (safe in textContent and innerHTML)
  var FILL = "\u25CF", OPEN = "\u25CB";
  return (n > 0 ? FILL : OPEN) + (n > 1 ? FILL : OPEN) + (n > 2 ? FILL : OPEN);
}

function footer(item) {
  if (!item) return "";
  if (item.type === "armour")   return "Броня";
  if (item.type === "shield")   return "Щит";
  if (item.type === "ammo")     return "Аммуниция";
  if (item.type === "spell")    return "Заклинание";
  if (item.type === "hireling") return "Наёмник";
  if (item.weight) return item.weight[0].toUpperCase() + item.weight.slice(1);
  return "";
}

function cardHTML(id, small) {
  var item = cardMap[id];
  var nc = small ? "iname-sm" : "iname";
  var uc = small ? "uses-sm"  : "uses";

  if (!item)
    return '<div class="card empty" data-id="' + id + '">&mdash;</div>';

  // Обработка armor_placeholder для брони в двух слотах
  if (item.armor_placeholder && item.linkedTo) {
    var mainArmor = cardMap[item.linkedTo];
    if (mainArmor) {
      return '<div class="card armour placeholder-linked" data-id="' + id + '">'
        + '<div style="padding:8px;text-align:center;opacity:0.6">'
        + '<div class="' + nc + '">' + esc(mainArmor.name || "") + '</div>'
        + '</div>'
        + '</div>';
    }
  }

  // Обработка placeholder для второй лапы (оружие в двух лапах)
  if (item.placeholder && item.linkedTo) {
    var mainWeapon = cardMap[item.linkedTo];
    if (mainWeapon) {
      return '<div class="card weapon placeholder-linked" data-id="' + id + '">'
        + '<div style="padding:8px;text-align:center;opacity:0.6">'
        + '<div class="' + nc + '">' + esc(mainWeapon.name || "") + '</div>'
        + '</div>'
        + '</div>';
    }
  }

  // Обработка щитов
  if (item.type === "shield") {
    var isInBag = id.charAt(0) === 'b';
    var isInHand = id === "eq_off";
    var moveBtn = "";
    if (isInBag) {
      moveBtn = '<button class="move-btn" data-move="equip-shield" data-id="' + id + '" title="Надеть на руку">↑</button>';
    } else if (isInHand) {
      moveBtn = '<button class="move-btn" data-move="unequip-shield" data-id="' + id + '" title="Положить в мешок">↓</button>';
    }
    var def = getDef(item);
    var dc = def > 0 ? '<div class="def" title="Броня">def ' + def + '</div>' : '';
    return '<div class="card shield" data-id="' + id + '">'
      + '<div><div class="nrow">'
      + '<div class="' + nc + '">' + esc(item.name || "") + '</div>'
      + dc
      + '</div>'
      + '<div class="' + uc + '" id="u_' + id + '">' + dotsStr(usage[id]||0) + '</div>'
      + (moveBtn ? '<div style="text-align:center;margin-top:2px">' + moveBtn + '</div>' : '')
      + '</div>'
      + '</div>';
  }

  // Обработка аммуниции
  if (item.type === "ammo") {
    var isInBag = id.charAt(0) === 'b';
    var isInArmorSlot = id === "eq_arm2";
    var moveBtn = "";
    if (isInBag) {
      moveBtn = '<button class="move-btn" data-move="equip-ammo" data-id="' + id + '" title="Надеть">↑</button>';
    } else if (isInArmorSlot) {
      moveBtn = '<button class="move-btn" data-move="unequip-ammo" data-id="' + id + '" title="Положить в мешок">↓</button>';
    }
    return '<div class="card ammo" data-id="' + id + '">'
      + '<div><div class="nrow">'
      + '<div class="' + nc + '">' + esc(item.name || "") + '</div>'
      + '</div>'
      + '<div class="' + uc + '" id="u_' + id + '">' + dotsStr(usage[id]||0) + '</div>'
      + (moveBtn ? '<div style="text-align:center;margin-top:2px">' + moveBtn + '</div>' : '')
      + '</div>'
      + '</div>';
  }

  // Обработка состояний
  if (item.type === "status") {
    var cls = "card status";
    if (editMode) {
      return '<div class="' + cls + '" data-id="' + id + '">'
        + '<button class="del-btn" data-del="' + id + '" title="Удалить">&times;</button>'
        + '<div><div class="nrow">'
        + '<input class="name-input" type="text" value="' + esc(item.name || "") + '" data-nameid="' + id + '">'
        + '</div></div>'
        + '</div>';
    }
    
    // Состояние в выдержке (en0-en5)
    var isInEndurance = id.charAt(0) === 'e' && id.charAt(1) === 'n';
    if (isInEndurance) {
      var infoBtn = '<button class="info-btn" onclick="event.stopPropagation(); showStatusDetails(\'' + (item.id || '') + '\');" title="Подробнее" style="border:1px solid #5a7a9a;padding:3px 8px;border-radius:3px">ℹ</button>';
      return '<div class="' + cls + '" data-id="' + id + '">'
        + '<div><div class="nrow">'
        + '<div class="' + nc + '">' + esc(item.name || "") + '</div>'
        + '</div>'
        + '<div style="text-align:center;margin-top:6px">'
        + infoBtn
        + '</div>'
        + '</div>'
        + '</div>';
    }
    
    // Состояние в мешке (b0-b8) - можно отправить в выдержку
    var isInBag = id.charAt(0) === 'b';
    var moveBtn = "";
    if (isInBag && !editMode) {
      var hasActiveEnduranceSlot = (statCur.end || 0) > 0;
      if (hasActiveEnduranceSlot) {
        moveBtn = '<button class="move-btn" data-move="send-to-endurance" data-id="' + id + '" title="Отправить в выдержку">↑</button>';
      }
    }
    
    return '<div class="' + cls + '" data-id="' + id + '">'
      + '<div><div class="nrow">'
      + '<div class="' + nc + '">' + esc(item.name || "") + '</div>'
      + '</div>'
      + '<div style="text-align:center;margin-top:6px">'
      + (moveBtn ? moveBtn + ' ' : '')
      + '<button class="info-btn" onclick="event.stopPropagation(); showStatusDetails(\'' + (item.id || '') + '\');" title="Подробнее" style="border:1px solid #5a7a9a;padding:3px 8px;border-radius:3px">ℹ</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  // Обработка заклинаний
  if (item.type === "spell") {
    var cls = "card spell";
    if (editMode) {
      return '<div class="' + cls + '" data-id="' + id + '">'
        + '<button class="del-btn" data-del="' + id + '" title="Удалить">&times;</button>'
        + '<div><div class="nrow">'
        + '<input class="name-input" type="text" value="' + esc(item.name || "") + '" data-nameid="' + id + '">'
        + '</div></div>'
        + '</div>';
    }
    return '<div class="' + cls + '" data-id="' + id + '">'
      + '<div><div class="nrow">'
      + '<div class="' + nc + '">' + esc(item.name || "") + '</div>'
      + '</div>'
      + '<div class="' + uc + '" id="u_' + id + '">' + dotsStr(usage[id]||0) + '</div>'
      + '<div style="text-align:center;margin-top:6px">'
      + '<button class="info-btn" onclick="event.stopPropagation(); showSpellDetails(\'' + (item.name || '').replace(/'/g, "\\'") + '\');" title="Подробнее" style="border:1px solid #5a7a9a;padding:3px 8px;border-radius:3px">ℹ</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  var w   = item.weight || "";
  var t   = item.type   || "";
  var cls = "card" + (w ? " " + w : "") + " " + t;
  var ft  = footer(item);
  var dc  = item.dice
    ? '<span class="idice">' + esc(item.dice) + '</span>'
    : (item.type === 'armour')
      ? '<span class="idef">def ' + getDef(item) + '</span>'
      : "";

  if (editMode) {
    return '<div class="' + cls + '" data-id="' + id + '">'
      + '<button class="del-btn" data-del="' + id + '" title="Удалить">&times;</button>'
      + '<div><div class="nrow">'
      + '<input class="name-input" type="text" value="' + esc(item.name || "") + '" data-nameid="' + id + '">'
      + dc
      + '</div></div>'
      + '<div class="ifoot">' + ft + '</div>'
      + '</div>';
  }

  // Кнопка переноса для оружия и брони
  var moveBtn = "";
  var modeBtn = "";
  if (item.type === "weapon") {
    var isInBag = id.charAt(0) === 'b';
    var isInHand = id === "eq_main" || id === "eq_off";
    if (isInBag) {
      moveBtn = '<button class="move-btn" data-move="equip-weapon" data-id="' + id + '" title="Взять в лапки">↑</button>';
    } else if (isInHand) {
      moveBtn = '<button class="move-btn" data-move="unequip-weapon" data-id="' + id + '" title="Положить в мешок">↓</button>';
      
      // Для среднего оружия в руках показываем переключатель режима
      if (item.weight === "среднее") {
        var hands = weaponMode[id] || 1;
        var modeLabel = (hands === 1) ? "1 лапа" : "2 лапы";
        modeBtn = '<button class="mode-btn" onclick="toggleWeaponMode(\'' + id + '\');" title="Переключить режим">' + modeLabel + '</button>';
      }
    }
  } else if (item.type === "armour") {
    var isInBag = id.charAt(0) === 'b';
    var isInArmour = id === "eq_arm1" || id === "eq_arm2";
    if (isInBag) {
      moveBtn = '<button class="move-btn" data-move="equip-armour" data-id="' + id + '" title="Надеть">↑</button>';
    } else if (isInArmour) {
      moveBtn = '<button class="move-btn" data-move="unequip-armour" data-id="' + id + '" title="Снять">↓</button>';
    }
  }

  return '<div class="' + cls + '" data-id="' + id + '">'
    + '<div><div class="nrow">'
    + '<div class="' + nc + '">' + esc(item.name || "") + '</div>'
    + dc
    + '</div>'
    + '<div class="' + uc + '" id="u_' + id + '">' + dotsStr(usage[id]||0) + '</div>'
    + (moveBtn || modeBtn ? '<div style="text-align:center;margin-top:2px;display:flex;gap:4px;justify-content:center">' + moveBtn + modeBtn + '</div>' : '')
    + '</div>'
    + '<div class="ifoot">' + ft + '</div>'
    + '</div>';
}

// ── Event delegation — the only place interactions are wired ──────────────
document.addEventListener("click", function(e) {
  // Move button (equip/unequip weapon or armour)
  var moveBtn = e.target.closest("[data-move]");
  if (moveBtn) {
    e.stopPropagation();
    var action = moveBtn.getAttribute("data-move");
    var cardId = moveBtn.getAttribute("data-id");
    if (action === "equip-weapon") {
      handleEquipWeapon(cardId);
    } else if (action === "unequip-weapon") {
      handleUnequipWeapon(cardId);
    } else if (action === "equip-armour") {
      handleEquipArmour(cardId);
    } else if (action === "unequip-armour") {
      handleUnequipArmour(cardId);
    } else if (action === "equip-shield") {
      handleEquipShield(cardId);
    } else if (action === "unequip-shield") {
      handleUnequipShield(cardId);
    } else if (action === "equip-ammo") {
      handleEquipAmmo(cardId);
    } else if (action === "unequip-ammo") {
      handleUnequipAmmo(cardId);
    } else if (action === "send-to-endurance") {
      handleSendToEndurance(cardId);
    }
    return;
  }
  // Delete from endurance button
  var delFromEndurance = e.target.closest("[data-del-from-endurance]");
  if (delFromEndurance) {
    e.stopPropagation();
    var enduranceId = delFromEndurance.getAttribute("data-del-from-endurance");
    handleDeleteFromEndurance(enduranceId);
    return;
  }
  // Delete button (must check before card tap)
  var delEl = e.target.closest("[data-del]");
  if (delEl) {
    var did = delEl.getAttribute("data-del");
    cardMap[did] = null;
    if (EQUIP_IDS.indexOf(did) >= 0) renderEquip(); else renderBag();
    return;
  }
  // Card tap: cycle usage dots (view mode only)
  if (!editMode) {
    var card = e.target.closest("[data-id]");
    if (card && !card.classList.contains("empty")) {
      // Не трекируем использование, если клик был на кнопке переключения режима или информации
      if (e.target.closest(".mode-btn") || e.target.closest(".info-btn")) {
        return;
      }
      var id = card.getAttribute("data-id");
      // Guard against ghost-clicks (mobile fires touchend + synthetic click)
      var now = Date.now();
      if (_tapLock[id] && now - _tapLock[id] < 350) return;
      _tapLock[id] = now;
      // Increment usage 0→1→2→3→0 looped
      usage[id] = ((usage[id] || 0) + 1) % 4;
      var el = document.getElementById("u_" + id);
      // textContent avoids innerHTML re-parse which can trigger ghost click
      if (el) el.textContent = dotsStr(usage[id]);
    }
  }
});

document.addEventListener("input", function(e) {
  if (e.target.getAttribute("data-charname")) {
    curChar.name = e.target.value;
    return;
  }
  if (e.target.getAttribute("data-pips")) {
    curChar.pips = parseInt(e.target.value) || 0;
    return;
  }
  if (e.target.classList.contains("name-input")) {
    var id = e.target.getAttribute("data-nameid");
    if (cardMap[id]) cardMap[id] = Object.assign({}, cardMap[id], {name: e.target.value});
  }
  if (e.target.classList.contains("stat-input")) {
    var k = e.target.getAttribute("data-key");
    var w = e.target.getAttribute("data-which");
    var v = parseInt(e.target.value) || 0;
    if (w === "max") statMax[k] = Math.max(1, v);
    else             statCur[k] = Math.max(0, v);
  }
});

// ── Render ────────────────────────────────────────────────────────────────
function renderStats() {
  var L = ["СИЛ","ЛОВ","ВОЛ","ОЗ","ВЫД"], K = ["str","dex","wil","hp","end"];
  var h = '<div class="stat-headers"><div></div><div>Макс</div><div>Тек.</div></div>';
  for (var i = 0; i < 5; i++) {
    var k = K[i], mx = statMax[k] || 0, cur = statCur[k] || 0;
    var labelHtml = L[i];
    if (!editMode && k === "end") {
      labelHtml = '<button style="background:none;border:none;cursor:pointer;font-family:var(--gothic);font-size:1.35rem;color:var(--brd);padding:0" onclick="openEndurance()">' + L[i] + '</button>';
    }
    if (editMode) {
      h += '<div class="stat-row">'
        + '<div class="stat-label">' + labelHtml + '</div>'
        + '<div class="stat-val"><input class="stat-input" type="number" min="1" max="20"'
        + ' value="' + mx + '" data-key="' + k + '" data-which="max"></div>'
        + '<div class="stat-val"><input class="stat-input" type="number" min="0" max="20"'
        + ' value="' + cur + '" data-key="' + k + '" data-which="cur"></div>'
        + '</div>';
    } else {
      h += '<div class="stat-row">'
        + '<div class="stat-label">' + labelHtml + '</div>'
        + '<div class="stat-val">' + mx + '</div>'
        + '<div class="stat-val">' + cur + '</div>'
        + '</div>';
    }
  }
  document.getElementById("statsArea").innerHTML = h;
}

function renderEquip() {
  var h = "";
  for (var i = 0; i < 4; i++)
    h += '<div class="equip-slot"><div class="slot-lbl">' + EQUIP_LABELS[i] + '</div>'
       + cardHTML(EQUIP_IDS[i], false) + '</div>';
  document.getElementById("equipGrid").innerHTML = h;
}

function renderBag() {
  var h = "";
  for (var i = 0; i < 9; i++)
    h += '<div class="bag-slot">' + cardHTML("b" + i, true) + '</div>';
  document.getElementById("bagGrid").innerHTML = h;
}

function renderIdentity(c) {
  if (editMode) {
    var _ne = document.getElementById("cName");
    if (_ne) _ne.innerHTML =
      '<input class="char-name-input" type="text"'
      + ' value="' + esc(c.name || "") + '"'
      + ' data-charname="1">';
    var _pe = document.getElementById("cPips");
    if (_pe) _pe.innerHTML =
      '<input class="pips-input" type="number" min="0" max="999"'
      + ' value="' + (c.pips || 0) + '"'
      + ' data-pips="1">';
  } else {
    $t("cName", c.name || "");
    $t("cPips", c.pips || "");
  }
  $t("cBg",   c.background || "");
  $t("cSign", c.birthsign || ""); $t("cDisp", c.disposition || "");
  $t("cCoat", c.coat || "");      $t("cPhys", c.physical_detail || "");
}

function renderAll() {
  renderIdentity(curChar);
  renderStats();
  renderEquip();
  renderBag();
}

// ── Weapon transfer ───────────────────────────────────────────────────────
