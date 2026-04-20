var INIT = window.INIT;

var cardMap  = {};
var usage    = {};
var statMax  = {};
var statCur  = {};
var editMode = false;
var curChar  = null;
var _tapLock = {};  // ghost-click guard: id → timestamp of last valid tap
var rollClickCount = 0;  // для отслеживания нажатий на кнопку "Ещё раз"
var selectedStatusToAdd = null;  // для отслеживания выбранного состояния
var weaponMode = {};  // {eq_main: 1 или 2} - отслеживание, в скольких лапах оружие среднего веса
var slotMultimap = {};  // отслеживание многоячеечных предметов (тяжелое оружие в мешке занимает 2 ячейки)

var STATUSES = [
  {id: "exhausted", name: "Изнурён", effect: "", cure: "Длительный отдых"},
  {id: "scared", name: "Испуган", effect: "Спасбросок воли, когда персонаж приближается к источнику страха.", cure: "Передышка"},
  {id: "hungry", name: "Голоден", effect: "", cure: "Приём пищи"},
  {id: "wounded", name: "Ранен", effect: "Помеха к спасброскам силы и ловкости.", cure: "Полный отдых"},
  {id: "depleted", name: "Опустошён", effect: "Помеха к спасброскам воли.", cure: "Полный отдых"}
];

var SPELLS = [
  {name: "Огненный шар", effect: "Стреляет огненным шаром на расстояние до 24 дюймов. Наносит [сум] + [мощь] урона всем существам в радиусе 6 дюймов", recharge: "Закаливать в самом сердце бушующего пламени три дня и три ночи"},
  {name: "Исцеление", effect: "Лечит [сум] урона по силе и убирает карточку состояния «Ранен» с существа", recharge: "Нанести себе порез и окропить табличку кровью. Заклинатель получает d6 урона, который снижает значение силы, минуя общую защиту"},
  {name: "Магический снаряд", effect: "Наносит [сум] + [мощь] урона существу в пределах видимости", recharge: "Бросить табличку с заклинанием с высоты не менее 30 футов и коснуться её в течение одного хода"},
  {name: "Страх", effect: "[мощь] существ получают состояние «Испуган»", recharge: "Получить состояние «Испуган» от враждебного существа, удерживая заклинание в лапах"},
  {name: "Тьма", effect: "Создаёт сферу абсолютной тьмы диаметром [сум]х2 дюйма на [мощь] ходов", recharge: "На три дня оставить непокрытым в месте, куда не попадает свет"},
  {name: "Восстановление", effect: "Убирает карточку состояния «Изнурён» или «Испуган» с [мощь]+1 существ", recharge: "Закопать на три дня на спокойном лугу или берегу реки"},
  {name: "Открытое сердце", effect: "Делает намерения заклинателя понятными для [мощь] существ других видов на [мощь] ходов", recharge: "Добровольно подарить существу другого вида"},
  {name: "Жук-призрак", effect: "Создаёт призрачного жука, который может нести 6 ячеек снаряжения на [мощь]х6 ходов", recharge: "Закопать на кладбище жуков на три ночи"},
  {name: "Свет", effect: "Заставляет [мощь] существ сделать спасбросок воли — в случае неудачи они окажутся ошеломлены. Либо создаёт свет с яркостью лампы на [сум] ходов", recharge: "Ловить табличкой с заклинанием первый луч на рассвете и последний на закате в течение трёх дней"},
  {name: "Невидимое кольцо", effect: "Создаёт силовое поле в форме кольца с радиусом [мощь]x6 дюймов. Оно невидимое и недвижимое. Длится [мощь] ходов", recharge: "Соорудить железное кольцо того же размера, что и при последнем чтении заклинания. Пропустить сквозь него заклинание и расплавить кольцо"},
  {name: "Взлом", effect: "Открывает дверь или ящик, как если бы мышь сделала успешный спасбросок силы со значением 10+[мощь]х4", recharge: "Положить заклинание в закрытую коробку, поместить её внутрь закрытой коробки, последнюю также поместить в закрытую коробку. Оставить на три дня"},
  {name: "Скольжение", effect: "Покрывает пространство [мощь]х6 дюймов скользкой горючей жидкостью. Существа в этой области должны сделать спасбросок ловкости, чтобы не упасть", recharge: "Целиком покрыть заклинание животным жиром. Оставить, пока тот не сгниёт полностью"},
  {name: "Рост", effect: "Увеличивает существо в [мощь]+1 раз относительно его изначального размера на 1 ход", recharge: "Оставить на верхней ветке высокого дерева на три дня"},
  {name: "Невидимость", effect: "Делает существо невидимым на [мощь] ходов. Любое перемещение снижает длительность на 1 ход", recharge: "Провести день, ни разу не открыв глаз и удерживая заклинание"},
  {name: "Кошачья мята", effect: "Превращает объект в приманку, перед которой не устоит ни одна кошка. Длится [мощь] ходов", recharge: "Подарить кошке то, чего она по-настоящему хочет"}
];

var EQUIP_IDS    = ["eq_main","eq_off","eq_arm1","eq_arm2"];
var EQUIP_LABELS = ["Осн. лапа","Вторая лапа","Броня","Аммуниция"];

function initFromSavedState(state) {
  var meta = state.meta || {};
  curChar = {
    name: meta.name || "",
    background: meta.background || "",
    birthsign: meta.birthsign || "",
    disposition: meta.disposition || "",
    coat: meta.coat || "",
    physical_detail: meta.physical_detail || "",
    pips: meta.pips || 0,
    str_val: (state.statMax || {}).str || 0,
    dex_val: (state.statMax || {}).dex || 0,
    wil_val: (state.statMax || {}).wil || 0,
    hp: (state.statMax || {}).hp || 0,
    endurance_max: (state.statMax || {}).end || 0
  };
  cardMap = state.cardMap || {};
  usage = state.usage || {};
  statMax = state.statMax || {str: 0, dex: 0, wil: 0, hp: 0, end: 0};
  statCur = state.statCur || {str: 0, dex: 0, wil: 0, hp: 0, end: 0};
  weaponMode = {};
  if (cardMap.eq_main && cardMap.eq_main.type === "weapon") {
    weaponMode.eq_main = (cardMap.eq_main.weight === "тяжёлое" || (cardMap.eq_off && cardMap.eq_off.placeholder && cardMap.eq_off.linkedTo === "eq_main")) ? 2 : 1;
    // Если тяжёлое оружие в основной лапе, но нет плейсхолдера во второй - создать его
    if (cardMap.eq_main.weight === "тяжёлое" && !cardMap.eq_off) {
      cardMap.eq_off = {placeholder: true, linkedTo: "eq_main"};
    }
  }
}

function initFromChar(c) {
  if (c && c.v && c.meta && c.cardMap) {
    initFromSavedState(c);
    return;
  }
  curChar = c;
  var eq = c.equipped || {};
  cardMap = {
    eq_main: eq.main_hand || null,
    eq_off:  eq.off_hand  || null,
    eq_arm1: eq.armor1    || null,
    eq_arm2: eq.armor2    || null
  };
  var bag = c.bag || [];
  for (var i = 0; i < 9; i++) cardMap["b" + i] = bag[i] || null;
  // Инициализация слотов выдержки (максимум 6)
  for (var i = 0; i < 6; i++) cardMap["en" + i] = null;
  usage = {};
  Object.keys(cardMap).forEach(function(id){ usage[id] = 0; });
  
  // Обработка тяжелого оружия в мешке — добавить placeholder для второй ячейки
  for (var i = 0; i < 8; i++) {
    var item = cardMap["b" + i];
    if (item && item.type === "weapon" && item.weight === "тяжёлое") {
      var nextSlot = "b" + (i + 1);
      // Если следующая ячейка свободна, создать placeholder
      if (!cardMap[nextSlot]) {
        cardMap[nextSlot] = {placeholder: true, linkedTo: "b" + i};
      }
    } else if (item && item.type === "armour" && item.weight === "тяжёлое") {
      var nextSlot = "b" + (i + 1);
      // Тяжелая броня в мешке тоже займет две ячейки
      if (!cardMap[nextSlot]) {
        cardMap[nextSlot] = {placeholder: true, linkedTo: "b" + i};
      }
    }
  }
  
  // Инициализация режима оружия
  weaponMode = {};
  if (cardMap.eq_main && cardMap.eq_main.type === "weapon") {
    weaponMode.eq_main = (cardMap.eq_main.weight === "тяжёлое") ? 2 : 1;
  }
  
  // Если тяжелое оружие в основной лапе и вторая лапа свободна, создать placeholder
  if (cardMap.eq_main && cardMap.eq_main.type === "weapon" && cardMap.eq_main.weight === "тяжёлое") {
    if (!cardMap.eq_off) {
      cardMap.eq_off = {placeholder: true, linkedTo: "eq_main"};
    }
  }
  
  // Если тяжелая броня в первом слоте, создать placeholder во втором
  if (cardMap.eq_arm1 && !cardMap.eq_arm1.armor_placeholder && cardMap.eq_arm1.weight === "тяжёлое") {
    if (!cardMap.eq_arm2) {
      cardMap.eq_arm2 = {armor_placeholder: true, linkedTo: "eq_arm1"};
    }
  }
  
  // Если "Щит и куртка" в броне, создать щит во вторую лапу если его там нет
  if (cardMap.eq_arm1 && cardMap.eq_arm1.name === "Щит и куртка") {
    // Если оружие в основной лапе, убрать его в мешок
    if (cardMap["eq_main"] && cardMap["eq_main"].type === "weapon") {
      var weapon = cardMap["eq_main"];
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
        usage[freeSlot] = usage["eq_main"] || 0;
        
        // Если тяжелое, создать плейсхолдер
        if (weapon.weight === "тяжёлое") {
          var nextSlot = "b" + (parseInt(freeSlot.substring(1)) + 1);
          cardMap[nextSlot] = {placeholder: true, linkedTo: freeSlot};
        }
      }
      
      cardMap["eq_main"] = null;
      delete usage["eq_main"];
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
      
      cardMap["eq_off"] = null;
      delete usage["eq_off"];
    }
    
    // Экипировать щит во вторую лапу
    cardMap.eq_off = {name: "Щит (щит и куртка)", def: 1, type: "shield"};
    usage["eq_off"] = 0;
  }
  
  statMax = {str: c.str_val, dex: c.dex_val, wil: c.wil_val, hp: c.hp, end: c.endurance_max || 0};
  statCur = {str: c.str_val, dex: c.dex_val, wil: c.wil_val, hp: c.hp, end: 0};
}
