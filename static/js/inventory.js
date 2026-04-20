function showError(msg) {
  document.getElementById("errorMsg").textContent = msg;
  document.getElementById("errorOverlay").classList.add("open");
}

function handleEquipWeapon(bagId) {
  var item = cardMap[bagId];
  if (!item || item.placeholder) return;
  
  // Тяжелое оружие требует две свободные лапы
  if (item.weight === "тяжёлое") {
    if (cardMap["eq_main"] || cardMap["eq_off"]) {
      showError("Для тяжелого оружия нужны обе свободные лапы!");
      return;
    }
    
    // Движем оружие на основную лапу
    cardMap["eq_main"] = item;
    usage["eq_main"] = usage[bagId] || 0;
    weaponMode["eq_main"] = 2;
    
    // Создаем placeholder на вторую лапу
    cardMap["eq_off"] = {placeholder: true, linkedTo: "eq_main"};
    
    // Освобождаем мешок (удаляем обе ячейки)
    var otherBagId = null;
    if (bagId.charAt(0) === 'b') {
      var bagIndex = parseInt(bagId.substring(1));
      // Ищем связанный placeholder
      for (var i = 0; i < 9; i++) {
        var checkId = "b" + i;
        if (cardMap[checkId] && cardMap[checkId].placeholder && cardMap[checkId].linkedTo === bagId) {
          otherBagId = checkId;
          break;
        }
      }
    }
    
    cardMap[bagId] = null;
    delete usage[bagId];
    if (otherBagId) {
      cardMap[otherBagId] = null;
    }
  } else {
    // Среднее или легкое оружие - требует одна свободная лапа
    var freeSlot = null;
    if (!cardMap["eq_main"]) freeSlot = "eq_main";
    else if (!cardMap["eq_off"]) freeSlot = "eq_off";
    
    if (!freeSlot) {
      showError("Нет свободных лап! Положите оружие из лап в мешок.");
      return;
    }
    
    // Move weapon
    cardMap[freeSlot] = item;
    usage[freeSlot] = usage[bagId] || 0;
    cardMap[bagId] = null;
    delete usage[bagId];
    
    // Инициализировать режим оружия (среднее может быть 1 или 2 лапы)
    weaponMode[freeSlot] = (item.weight === "среднее") ? 1 : 1;
  }
  
  renderBag();
  renderEquip();
}

function toggleWeaponMode(handId) {
  var item = cardMap[handId];
  if (!item || item.type !== "weapon") return;
  
  // Тяжелое оружие всегда в двух лапах, нельзя переключать
  if (item.weight === "тяжёлое") return;
  
  // Среднее оружие может быть в 1 или 2 лапах
  if (item.weight !== "среднее") return;
  
  weaponMode[handId] = (weaponMode[handId] === 1) ? 2 : 1;
  
  // Если переключаемся на 2 лапы, убедимся что вторая лапа свободна
  if (weaponMode[handId] === 2) {
    var otherHand = (handId === "eq_main") ? "eq_off" : "eq_main";
    if (cardMap[otherHand]) {
      showError("Вторая лапа занята! Положите оружие в мешок, чтобы взять предмет двумя лапами.");
      weaponMode[handId] = 1;
      return;
    }
    // Занимаем вторую лапу
    cardMap[otherHand] = {placeholder: true, linkedTo: handId};
  } else {
    // Если переключаемся на 1 лапу, освобождаем вторую
    var otherHand = (handId === "eq_main") ? "eq_off" : "eq_main";
    if (cardMap[otherHand] && cardMap[otherHand].placeholder && cardMap[otherHand].linkedTo === handId) {
      cardMap[otherHand] = null;
    }
  }
  
  renderEquip();
}

function handleUnequipWeapon(handId) {
  var item = cardMap[handId];
  if (!item || item.placeholder) return;
  
  // Find free bag slot(s)
  var freeSlot = null;
  
  // Тяжелое оружие требует две свободные подряд ячейки в мешке
  if (item.weight === "тяжёлое") {
    for (var i = 0; i < 8; i++) {
      if (!cardMap["b" + i] && !cardMap["b" + (i + 1)]) {
        freeSlot = "b" + i;
        break;
      }
    }
  } else {
    // Обычное оружие требует одну ячейку
    for (var i = 0; i < 9; i++) {
      if (!cardMap["b" + i]) {
        freeSlot = "b" + i;
        break;
      }
    }
  }
  
  if (!freeSlot) {
    if (item.weight === "тяжёлое") {
      showError("Нет двух подряд свободных ячеек в мешке!");
    } else {
      showError("Нет места в мешке! Выбросьте что-нибудь, чтобы освободить место.");
    }
    return;
  }
  
  // Move weapon
  cardMap[freeSlot] = item;
  usage[freeSlot] = usage[handId] || 0;
  cardMap[handId] = null;
  delete usage[handId];
  
  // Если тяжелое оружие, создаем placeholder на вторую ячейку
  if (item.weight === "тяжёлое") {
    var nextSlot = "b" + (parseInt(freeSlot.substring(1)) + 1);
    cardMap[nextSlot] = {placeholder: true, linkedTo: freeSlot};
  }
  
  // Освобождаем вторую лапу, если оружие было в режиме двух лап
  if (weaponMode[handId] === 2) {
    var otherHand = (handId === "eq_main") ? "eq_off" : "eq_main";
    if (cardMap[otherHand] && cardMap[otherHand].placeholder && cardMap[otherHand].linkedTo === handId) {
      cardMap[otherHand] = null;
    }
    delete weaponMode[handId];
  }
  
  renderBag();
  renderEquip();
}

function handleEquipArmour(bagId) {
  var item = cardMap[bagId];
  if (!item || item.placeholder) return;
  
  // Специальный случай: "Щит и куртка" - экипировать оба элемента
  if (item.name === "Щит и куртка") {
    // Проверить место для брони
    if (cardMap["eq_arm1"]) {
      showError("Слот для брони занят!");
      return;
    }
    
    // Сначала удалить щит из мешка если он есть
    for (var i = 0; i < 9; i++) {
      var bagItem = cardMap["b" + i];
      if (bagItem && bagItem.type === "shield" && bagItem.name === "Щит") {
        cardMap["b" + i] = null;
        delete usage["b" + i];
        break;
      }
    }
    
    // Если оружие во второй лапе, убрать его в мешок
    if (cardMap["eq_off"] && cardMap["eq_off"].type === "weapon") {
      var weapon = cardMap["eq_off"];
      var freeSlot = null;
      
      if (weapon.weight === "тяжёлое") {
        for (var i = 0; i < 8; i++) {
          if (!cardMap["b" + i] && !cardMap["b" + (i + 1)]) {
            freeSlot = "b" + i;
            break;
          }
        }
      } else {
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
        if (weapon.weight === "тяжёлое") {
          var nextSlot = "b" + (parseInt(freeSlot.substring(1)) + 1);
          cardMap[nextSlot] = {placeholder: true, linkedTo: freeSlot};
        }
      }
    }
    
    // Экипировать броню и щит
    cardMap["eq_arm1"] = item;
    usage["eq_arm1"] = usage[bagId] || 0;
    cardMap["eq_off"] = {name: "Щит", def: 1, type: "shield"};
    usage["eq_off"] = 0;
    cardMap[bagId] = null;
    delete usage[bagId];
    
    renderBag();
    renderEquip();
    return;
  }
  
  // Find free armour slot(s)
  var freeSlot = null;
  if (item.weight === "тяжёлое") {
    // Тяжелая броня требует оба слота
    if (!cardMap["eq_arm1"] && !cardMap["eq_arm2"]) {
      freeSlot = "eq_arm1";
    }
  } else {
    // Обычная броня - один слот
    if (!cardMap["eq_arm1"]) freeSlot = "eq_arm1";
    else if (!cardMap["eq_arm2"]) freeSlot = "eq_arm2";
  }
  
  if (!freeSlot) {
    if (item.weight === "тяжёлое") {
      showError("Оба слота брони заняты! Снимите броню, чтобы надеть тяжелую.");
    } else {
      showError("Нет свободных мест для брони! Снимите броню, чтобы надеть новую.");
    }
    return;
  }
  
  // Move armour
  cardMap[freeSlot] = item;
  usage[freeSlot] = usage[bagId] || 0;
  cardMap[bagId] = null;
  delete usage[bagId];
  
  // Если тяжелая броня, создать placeholder на второй слот
  if (item.weight === "тяжёлое") {
    cardMap["eq_arm2"] = {armor_placeholder: true, linkedTo: "eq_arm1"};
    // Очистить плейсхолдер на вторую ячейку в мешке если броня была там
    var nextBagSlot = "b" + (parseInt(bagId.substring(1)) + 1);
    if (cardMap[nextBagSlot] && cardMap[nextBagSlot].placeholder && cardMap[nextBagSlot].linkedTo === bagId) {
      cardMap[nextBagSlot] = null;
    }
  }
  
  renderBag();
  renderEquip();
}

function handleUnequipArmour(armourId) {
  var item = cardMap[armourId];
  if (!item || item.armor_placeholder) return;
  
  // Специальный случай: "Щит и куртка" - снять обе части
  if (item.name === "Щит и куртка") {
    // Найти место для брони
    var armourSlot = null;
    for (var i = 0; i < 9; i++) {
      if (!cardMap["b" + i]) {
        armourSlot = "b" + i;
        break;
      }
    }
    
    if (!armourSlot) {
      showError("Нет места в мешке! Выбросьте что-нибудь.");
      return;
    }
    
    // Найти место для щита
    var shieldSlot = null;
    for (var i = 0; i < 9; i++) {
      if (!cardMap["b" + i] && i !== parseInt(armourSlot.substring(1))) {
        shieldSlot = "b" + i;
        break;
      }
    }
    
    if (!shieldSlot) {
      showError("Нет места для щита в мешке! Выбросьте что-нибудь.");
      return;
    }
    
    // Положить броню и щит в мешок
    cardMap[armourSlot] = item;
    usage[armourSlot] = usage[armourId] || 0;
    
    // Использовать существующий щит из eq_off, а не создавать новый
    var shield = cardMap["eq_off"];
    if (shield && shield.type === "shield") {
      cardMap[shieldSlot] = shield;
      usage[shieldSlot] = usage["eq_off"] || 0;
    }
    
    // Очистить слоты
    cardMap[armourId] = null;
    delete usage[armourId];
    cardMap["eq_off"] = null;
    delete usage["eq_off"];
    
    // Очистить плейсхолдер брони если есть
    if (cardMap["eq_arm2"] && cardMap["eq_arm2"].armor_placeholder) {
      cardMap["eq_arm2"] = null;
    }
    
    renderBag();
    renderEquip();
    return;
  }
  
  // Find free bag slot(s)
  var freeSlot = null;
  if (item.weight === "тяжёлое") {
    // Тяжелая броня требует две подряд свободные ячейки
    for (var i = 0; i < 8; i++) {
      if (!cardMap["b" + i] && !cardMap["b" + (i + 1)]) {
        freeSlot = "b" + i;
        break;
      }
    }
  } else {
    // Обычная броня - одна ячейка
    for (var i = 0; i < 9; i++) {
      if (!cardMap["b" + i]) {
        freeSlot = "b" + i;
        break;
      }
    }
  }
  
  if (!freeSlot) {
    if (item.weight === "тяжёлое") {
      showError("Нет двух подряд свободных ячеек в мешке!");
    } else {
      showError("Нет места в мешке! Выбросьте что-нибудь, чтобы освободить место.");
    }
    return;
  }
  
  // Move armour
  cardMap[freeSlot] = item;
  usage[freeSlot] = usage[armourId] || 0;
  cardMap[armourId] = null;
  delete usage[armourId];
  
  // Если тяжелая броня, создать placeholder на вторую ячейку и очистить eq_arm2
  if (item.weight === "тяжёлое") {
    cardMap["b" + (parseInt(freeSlot.substring(1)) + 1)] = {placeholder: true, linkedTo: freeSlot};
    if (cardMap["eq_arm2"] && cardMap["eq_arm2"].armor_placeholder) {
      cardMap["eq_arm2"] = null;
    }
  }
  
  renderBag();
  renderEquip();
}

function handleEquipShield(bagId) {
  var item = cardMap[bagId];
  if (!item || item.type !== "shield") return;
  
  if (cardMap["eq_off"]) {
    showError("Вторая лапа занята! Положите оружие в мешок.");
    return;
  }
  
  cardMap["eq_off"] = item;
  usage["eq_off"] = usage[bagId] || 0;
  cardMap[bagId] = null;
  delete usage[bagId];
  
  renderBag();
  renderEquip();
}

function handleUnequipShield(handId) {
  var item = cardMap[handId];
  if (!item || item.type !== "shield") return;
  
  // Проверить, это щит от "Щит и куртка" ли?
  var armour = cardMap["eq_arm1"];
  if (armour && armour.name === "Щит и куртка") {
    // Это часть "Щит и куртка" - снять обе части
    
    // Найти место для брони
    var armourSlot = null;
    for (var i = 0; i < 9; i++) {
      if (!cardMap["b" + i]) {
        armourSlot = "b" + i;
        break;
      }
    }
    
    if (!armourSlot) {
      showError("Нет места в мешке! Выбросьте что-нибудь.");
      return;
    }
    
    // Найти место для щита
    var shieldSlot = null;
    for (var i = 0; i < 9; i++) {
      if (!cardMap["b" + i] && i !== parseInt(armourSlot.substring(1))) {
        shieldSlot = "b" + i;
        break;
      }
    }
    
    if (!shieldSlot) {
      showError("Нет места для щита в мешке! Выбросьте что-нибудь.");
      return;
    }
    
    // Положить броню и щит в мешок
    cardMap[armourSlot] = armour;
    usage[armourSlot] = usage["eq_arm1"] || 0;
    
    // Использовать существующий щит item вместо создания нового
    cardMap[shieldSlot] = item;
    usage[shieldSlot] = usage[handId] || 0;
    
    // Очистить слоты
    cardMap["eq_arm1"] = null;
    delete usage["eq_arm1"];
    cardMap[handId] = null;
    delete usage[handId];
    
    // Очистить плейсхолдер брони если есть
    if (cardMap["eq_arm2"] && cardMap["eq_arm2"].armor_placeholder) {
      cardMap["eq_arm2"] = null;
    }
    
    renderBag();
    renderEquip();
    return;
  }
  
  // Обычный щит - снять как обычно
  // Find free bag slot
  var freeSlot = null;
  for (var i = 0; i < 9; i++) {
    if (!cardMap["b" + i]) {
      freeSlot = "b" + i;
      break;
    }
  }
  
  if (!freeSlot) {
    showError("Нет места в мешке! Выбросьте что-нибудь, чтобы освободить место.");
    return;
  }
  
  cardMap[freeSlot] = item;
  usage[freeSlot] = usage[handId] || 0;
  cardMap[handId] = null;
  delete usage[handId];
  
  renderBag();
  renderEquip();
}

function handleEquipAmmo(bagId) {
  var item = cardMap[bagId];
  if (!item || item.type !== "ammo") return;
  
  if (cardMap["eq_arm2"]) {
    showError("Слот для аммуниции занят!");
    return;
  }
  
  cardMap["eq_arm2"] = item;
  usage["eq_arm2"] = usage[bagId] || 0;
  cardMap[bagId] = null;
  delete usage[bagId];
  
  renderBag();
  renderEquip();
}

function handleUnequipAmmo(armorId) {
  var item = cardMap[armorId];
  if (!item || item.type !== "ammo") return;
  
  // Найти свободный слот в мешке
  var freeSlot = null;
  for (var i = 0; i < 9; i++) {
    if (!cardMap["b" + i]) {
      freeSlot = "b" + i;
      break;
    }
  }
  
  if (!freeSlot) {
    showError("Нет места в мешке! Выбросьте что-нибудь, чтобы освободить место.");
    return;
  }
  
  cardMap[freeSlot] = item;
  usage[freeSlot] = usage[armorId] || 0;
  cardMap[armorId] = null;
  delete usage[armorId];
  
  renderBag();
  renderEquip();
}

function handleSendToEndurance(bagId) {
  var item = cardMap[bagId];
  if (!item || item.type !== "status") return;
  
  var curEnd = statCur.end || 0;
  
  // Проверить, есть ли активные слоты (текущее значение ВЫД > 0)
  if (curEnd <= 0) {
    showError("Нет активных слотов в выдержке!");
    return;
  }
  
  // Найти первый свободный слот в выдержке
  var freeSlot = null;
  for (var i = 0; i < 6; i++) {
    if (!cardMap["en" + i]) {
      freeSlot = "en" + i;
      break;
    }
  }
  
  if (!freeSlot) {
    showError("Нет свободных слотов в выдержке.");
    return;
  }
  
  // Переместить состояние в выдержку
  cardMap[freeSlot] = item;
  usage[freeSlot] = 0;
  cardMap[bagId] = null;
  delete usage[bagId];
  
  // Уменьшить текущее значение выдержки (потратить один слот)
  // Но не меньше 0
  statCur.end = Math.max(0, (statCur.end || 0) - 1);
  
  renderBag();
  renderStats();
  renderEndurance();
}

function handleDeleteFromEndurance(enduranceId) {
  var item = cardMap[enduranceId];
  if (!item || item.type !== "status") return;
  
  // Удалить состояние совсем
  cardMap[enduranceId] = null;
  delete usage[enduranceId];
  
  // Увеличить текущее значение выдержки (восстановить слот)
  // Но не больше максимума
  statCur.end = Math.min(statMax.end || 0, (statCur.end || 0) + 1);
  
  renderBag();  // Обновить мешок, чтобы кнопки ↑ появились если есть место
  renderStats();
  renderEndurance();
}

// ── Controls ──────────────────────────────────────────────────────────────
