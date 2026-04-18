from flask import Flask, render_template, jsonify
import random

app = Flask(__name__)

GIVEN_NAMES = [
    "Агата","Агнес","Ада","Азалия","Алоэ","Амброзия","Беладонна","Берёза","Бикса","Бри",
    "Бринн","Вересковья","Ветла","Вишенка","Гвендолин","Грейс","Душица","Жемчужинка","Ирис","Календула",
    "Кальмия","Кассия","Кислица","Клара","Лаванда","Лещина","Лилия","Магнолия","Маковка","Мирта",
    "Одетта","Оливка","Ольха","Перчинка","Полынь","Расторопша","Розмари","Ромашка","Рута","Рябина",
    "Сьюзан","Сэнди","Фиалка","Хетта","Цветик","Шейл","Эйприл","Эльза","Эрин","Эсмеральда",
    "Август","Бадьян","Базилик","Берилл","Билл","Больдо","Боярышник","Вереск","Витакер","Георгин",
    "Гиацинт","Гораций","Деревей","Джаспер","Джек","Джил","Длинноух","Живокостур","Клайв","Колби",
    "Конрад","Лавр","Лозняк","Лопух","Лоренц","Маслён","Можжевельник","Мускат","Оливер","Опал",
    "Орин","Острогон","Падуб","Репешок","Саймон","Сассафрас","Сафлор","Стилтон","Стюарт","Укроп",
    "Уоррен","Фенхель","Фестус","Фрэнсис","Цикорий","Шафран","Щавель","Эдмунд","Эльмер","Эрнест"
]
SURNAMES = [
    "Бёрли","Блэк","Болтун","Вайт","Винтерхольм","Грант","Дразнилкер","Жукей",
    "Зёрн","Катрайзен","Мастакер","Облепих","Пухлинг","Рискер","Саммерхольм",
    "Самосей","Сноу","Туннелер","Халва","Шип"
]
BIRTHSIGNS = [
    ("Звезда",  "Храбрый / Безрассудный"),
    ("Колесо",  "Трудолюбивый / Приземлённый"),
    ("Жёлудь",  "Любознательный / Упрямый"),
    ("Буря",   "Благородный / Гневливый"),
    ("Луна",   "Мудрый / Таинственный"),
    ("Мать",   "Заботливый / Тревожный"),
]
COAT_COLORS   = ["Шоколадный","Чёрный","Белый","Коричневый","Серый","Голубой"]
COAT_PATTERNS = ["Однотонный","Пегий","Пятнистый","Полосатый","Мраморный","В крапинку"]
PHYSICAL_DETAILS = [
    "Шрамы","Упитанный","Тощий","Стройный","Крошечный","Крупный",
    "Боевой раскрас","Иноземная одежда","Изящная одежда","Залатанная одежда","Модная одежда","Нестираная одежда",
    "Нет уха","Бугристая мордочка","Красивая мордочка","Круглая мордочка","Изящная мордочка","Длинная мордочка",
    "Ухоженный мех","Свалявшиеся космы","Крашеный мех","Выбритый мех","Кудрявый мех","Шелковистый мех",
    "Чёрные как ночь глаза","Повязка на глазу","Кроваво-красные глаза","Мудрые глаза","Проницательные глаза","Сияющие глаза",
    "Обрезанный хвост","Хлыстообразный хвост","Хвост с пушком","Короткий хвост","Цепкий хвост","Хвост крючком",
]
BACKGROUNDS = [
    ["Подопытный",      "Повар",           "Житель клетки",    "Знахарь",              "Кожевенник",    "Уличный бандит"],
    ["Нищий священник","Пчелопас",       "Пивовар",              "Рыбак",                    "Кузнец",           "Проволочник"],
    ["Резчик по дереву",  "Сектант культа","Оловодобытчик",         "Мусорщик",               "Стенолаз",       "Торговец"],
    ["Матрос с плота",  "Погонщик червей","Воробьиный наездник",   "Проводник по канализации","Тюремный стражник","Фермер-грибник"],
    ["Строитель плотины","Картограф",     "Грабитель ловушек",   "Бродяга",                "Фермер-зерновод","Гонец"],
    ["Трубадур",        "Азартный игрок", "Добытчик сока",   "Пчеловод",              "Библиотекарь",   "Обнищавший дворянин"],
]
WEAPONS = [
    {"name":"Кинжал",       "dice":"d6",    "weight":"лёгкое",  "type":"weapon"},
    {"name":"Короткий меч",  "dice":"d6",    "weight":"лёгкое",  "type":"weapon"},
    {"name":"Дубина",       "dice":"d6",    "weight":"лёгкое",  "type":"weapon"},
    {"name":"Праща",        "dice":"d6",    "weight":"лёгкое",  "type":"weapon"},
    {"name":"Меч",          "dice":"d6/d8", "weight":"среднее", "type":"weapon"},
    {"name":"Топор",          "dice":"d6/d8", "weight":"среднее", "type":"weapon"},
    {"name":"Молот",         "dice":"d6/d8", "weight":"среднее", "type":"weapon"},
    {"name":"Булава",        "dice":"d6/d8", "weight":"среднее", "type":"weapon"},
    {"name":"Копьё",         "dice":"d10",   "weight":"тяжёлое", "type":"weapon"},
    {"name":"Лук",           "dice":"d8",    "weight":"тяжёлое", "type":"weapon"},
    {"name":"Арбалет",      "dice":"d8",    "weight":"тяжёлое", "type":"weapon"},
    {"name":"Подручное",    "dice":"d6",    "weight":None,     "type":"weapon"},
]
BGI = {
    (1,1):[("Маг. снаряд",None,None,"spell"),      ("Свинц. фартук",None,"тяжёлое","armour")],
    (1,2):[("Щит и куртка",None,"среднее","armour"),("Котелок",None,None,"item")],
    (1,3):[("Открытое сердце",None,None,"spell"),   ("Бутылка молока",None,None,"item")],
    (1,4):[("Исцеление",None,None,"spell"),       ("Арома. палочка",None,None,"item")],
    (1,5):[("Щит и куртка",None,"среднее","armour"),("Ножницы",None,None,"item")],
    (1,6):[("Кинжал","d6","лёгкое","weapon"),       ("Фляжка кофе",None,None,"item")],
    (2,1):[("Восстановление",None,None,"spell"),    ("Святой символ",None,None,"item")],
    (2,2):[("Верная пчела",None,None,"hireling"),   ("Шест, 6 дюймов",None,None,"item")],
    (2,3):[("Пьяный факел.",None,None,"hireling"),  ("Бочонок эля",None,None,"item")],
    (2,4):[("Сеть",None,None,"item"),               ("Игла","d6","лёгкое","weapon")],
    (2,5):[("Молот","d6/d8","среднее","weapon"),    ("Напильник",None,None,"item")],
    (2,6):[("Проволока, кат.",None,None,"item"),    ("Электролампа",None,None,"item")],
    (3,1):[("Топор","d6/d8","среднее","weapon"),    ("Верёвка, моток",None,None,"item")],
    (3,2):[("Тьма",None,None,"spell"),              ("Зубы лет. мышей",None,None,"item")],
    (3,3):[("Кирка","d6/d8","среднее","weapon"),    ("Лампа",None,None,"item")],
    (3,4):[("Мус. крюк","d10","тяжёлое","weapon"),("Зеркало",None,None,"item")],
    (3,5):[("Рыб. крючок",None,None,"item"),        ("Нить, катушка",None,None,"item")],
    (3,6):[("Вьючная крыса",None,None,"hireling"),  ("Вексель 20 з.",None,None,"item")],
    (4,1):[("Молот","d6/d8","среднее","weapon"),    ("Дерев. колья",None,None,"item")],
    (4,2):[("Шест, 6 дюймов",None,None,"item"),    ("Мыло",None,None,"item")],
    (4,3):[("Рыб. крючок",None,None,"item"),        ("Защитн. очки",None,None,"item")],
    (4,4):[("Напильник",None,None,"item"),          ("Нить, катушка",None,None,"item")],
    (4,5):[("Цепь, 6 дюймов",None,None,"item"),    ("Копьё","d10","тяжёлое","weapon")],
    (4,6):[("Сушёные грибы",None,None,"item"),      ("Маска от спор",None,None,"item")],
    (5,1):[("Лопата",None,None,"item"),             ("Дерев. колья",None,None,"item")],
    (5,2):[("Перо и чернила",None,None,"item"),     ("Компас",None,None,"item")],
    (5,3):[("Кусок сыра",None,None,"item"),         ("Клей",None,None,"item")],
    (5,4):[("Палатка",None,None,"item"),            ("Карта сокровищ",None,None,"item")],
    (5,5):[("Копьё","d10","тяжёлое","weapon"),      ("Свисток",None,None,"item")],
    (5,6):[("Спальный мешок",None,None,"item"),     ("Запеч. документы",None,None,"item")],
    (6,1):[("Муз. инструмент",None,None,"item"),    ("Грим. набор",None,None,"item")],
    (6,2):[("Шулерские кости",None,None,"item"),    ("Зеркало",None,None,"item")],
    (6,3):[("Ведро",None,None,"item"),               ("Дерев. колья",None,None,"item")],
    (6,4):[("Горшок с мёдом",None,None,"item"),     ("Сеть",None,None,"item")],
    (6,5):[("Обрывок книги",None,None,"item"),      ("Перо и чернила",None,None,"item")],
    (6,6):[("Фетровая шляпа",None,None,"item"),     ("Духи",None,None,"item")],
}

def roll_stat():
    d = [random.randint(1,6) for _ in range(3)]
    return sum(sorted(d)[1:])

def fi(t):
    return {"name":t[0],"dice":t[1],"weight":t[2],"type":t[3]}

def generate():
    sv = roll_stat(); dv = roll_stat(); wv = roll_stat()
    hp = random.randint(1,6); pips = random.randint(1,6)
    bg = BACKGROUNDS[hp-1][pips-1]
    a, b = BGI[(hp, pips)]
    bg_items = [fi(a), fi(b)]
    weapon = random.choice(WEAPONS).copy()
    equipped_armor = []; off_hand = None; bag_items = []
    for item in bg_items:
        if item["type"] == "armour" and len(equipped_armor) < 2:
            equipped_armor.append(item)
        elif item["type"] == "weapon" and off_hand is None:
            off_hand = item
        else:
            bag_items.append(item)
    bag_items.append({"name":"Связка факелов","dice":None,"weight":None,"type":"item"})
    bag_items.append({"name":"Пайки","dice":None,"weight":None,"type":"item"})
    mx = max(sv, dv, wv)
    if mx <= 9:
        ea, eb = BGI[(random.randint(1,6), random.randint(1,6))]
        extra = [fi(ea), fi(eb)] if mx <= 7 else [fi(random.choice([ea, eb]))]
        for item in extra:
            if item["type"] == "armour" and len(equipped_armor) < 2:
                equipped_armor.append(item)
            elif item["type"] == "weapon" and off_hand is None:
                off_hand = item
            else:
                bag_items.append(item)
    while len(equipped_armor) < 2:
        equipped_armor.append(None)
    bag_items = bag_items[:9]
    while len(bag_items) < 9:
        bag_items.append(None)
    bs, disp = BIRTHSIGNS[random.randint(0,5)]
    cc = COAT_COLORS[random.randint(0,5)]
    cp = COAT_PATTERNS[random.randint(0,5)]
    pd = PHYSICAL_DETAILS[random.randint(0,35)]
    name = random.choice(GIVEN_NAMES) + " " + random.choice(SURNAMES)
    return dict(
        name=name, background=bg, str_val=sv, dex_val=dv, wil_val=wv,
        hp=hp, pips=pips, birthsign=bs, disposition=disp,
        coat=f"{cc}, {cp.lower()}", physical_detail=pd,
        equipped={"main_hand":weapon,"off_hand":off_hand,
                  "armor1":equipped_armor[0],"armor2":equipped_armor[1]},
        bag=bag_items,
    )

@app.route("/")
def index():
    return render_template("index.html", character=generate())

@app.route("/roll")
def roll_route():
    return jsonify(generate())

@app.route("/spells")
def spells():
    return render_template("spells.html")

if __name__ == "__main__":
    print("Mausritter -> http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
