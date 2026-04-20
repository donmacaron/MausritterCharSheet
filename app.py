import json
import random
import sqlite3
from datetime import datetime
from functools import wraps
from pathlib import Path
import os
import shutil

from PIL import Image
from flask import (
    Flask,
    flash,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
    send_from_directory,
)
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
# Использовать /app/data для persisting данных при docker rebuild
DATA_DIR = Path("/app/data") if os.path.exists("/app") else Path(app.root_path)
DATA_DIR.mkdir(parents=True, exist_ok=True)
app.config["DATABASE"] = str(DATA_DIR / "mausritter.db")
app.config["SECRET_KEY"] = "mausritter-dev-secret-change-me"

# Портреты: конфигурация
UPLOAD_DIR = Path(app.root_path) / "static" / "uploads" / "portraits"
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
DISPLAY_WIDTH = 2000
THUMB_WIDTH = 80

MOUSE_EMOJIS = ["🐭", "🐁", "🐀"]

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

def add_to_bag(bag_items, item):
    """Добавить предмет в мешок, учитывая, что тяжелое оружие занимает 2 ячейки"""
    if item["type"] == "weapon" and item["weight"] == "тяжёлое":
        # Найти 2 подряд свободные ячейки
        for i in range(8):  # 0-7, чтобы было место для второй ячейки
            if i < len(bag_items):
                free_slots = sum(1 for j in range(i, min(i+2, len(bag_items))) if bag_items[j] is None)
            else:
                free_slots = 2 - i
            
            if free_slots >= 2 and i + 1 < len(bag_items):
                if bag_items[i] is None and bag_items[i+1] is None:
                    bag_items[i] = item
                    bag_items[i+1] = None  # Placeholder будет добавлен на JavaScript стороне
                    return
    
    # Для обычного оружия и других предметов
    for i in range(len(bag_items)):
        if bag_items[i] is None:
            bag_items[i] = item
            return

def generate():
    sv = roll_stat(); dv = roll_stat(); wv = roll_stat()
    hp = random.randint(1,6); pips = random.randint(1,6)
    bg = BACKGROUNDS[hp-1][pips-1]
    a, b = BGI[(hp, pips)]
    bg_items = [fi(a), fi(b)]
    weapon = random.choice(WEAPONS).copy()
    equipped_armor = []; off_hand = None; bag_items = [None]*9  # Инициализировать как 9 None
    for item in bg_items:
        if item["type"] == "armour" and len(equipped_armor) < 2:
            equipped_armor.append(item)
        elif item["type"] == "weapon" and off_hand is None:
            off_hand = item
        else:
            add_to_bag(bag_items, item)
    add_to_bag(bag_items, {"name":"Связка факелов","dice":None,"weight":None,"type":"item"})
    add_to_bag(bag_items, {"name":"Пайки","dice":None,"weight":None,"type":"item"})
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
                add_to_bag(bag_items, item)
    while len(equipped_armor) < 2:
        equipped_armor.append(None)
    
    # Если два оружия - убедиться что тяжелое в main_hand
    if off_hand and weapon:
        main_is_heavy = weapon.get("weight") == "тяжёлое"
        off_is_heavy = off_hand.get("weight") == "тяжёлое"
        
        if off_is_heavy and not main_is_heavy:
            # Если тяжелое во второй руке, а главное нет - поменять их местами
            add_to_bag(bag_items, weapon)
            weapon = off_hand
            off_hand = None
        elif main_is_heavy and not off_is_heavy:
            # Если главное оружие тяжелое, а второе нет - убрать второе в мешок
            add_to_bag(bag_items, off_hand)
            off_hand = None
        elif off_is_heavy and main_is_heavy:
            # Оба тяжелые - одно в мешок
            add_to_bag(bag_items, off_hand)
            off_hand = None
        # Если оба легкие/средние - оставить как есть
    
    # Проверить, есть ли оружие для дальнего боя (Праща, Лук, Арбалет)
    ranged_weapons = {"Праща": "Мешочек с камнями", "Лук": "Стрелы", "Арбалет": "Болты"}
    ammo_name = None
    if weapon and weapon.get("name") in ranged_weapons:
        ammo_name = ranged_weapons[weapon.get("name")]
    if off_hand and off_hand.get("name") in ranged_weapons:
        ammo_name = ranged_weapons[off_hand.get("name")]
    
    # Если есть оружие для дальнего боя - добавить Аммуницию в мешок
    if ammo_name:
        add_to_bag(bag_items, {"name":ammo_name,"dice":None,"weight":None,"type":"ammo"})
    
    # bag_items уже инициализирован как [None]*9, просто убедиться что все ячейки заполнены
    bs, disp = BIRTHSIGNS[random.randint(0,5)]
    cc = COAT_COLORS[random.randint(0,5)]
    cp = COAT_PATTERNS[random.randint(0,5)]
    pd = PHYSICAL_DETAILS[random.randint(0,35)]
    name = random.choice(GIVEN_NAMES) + " " + random.choice(SURNAMES)
    return dict(
        name=name, background=bg, str_val=sv, dex_val=dv, wil_val=wv,
        hp=hp, pips=pips, birthsign=bs, disposition=disp,
        coat=f"{cc}, {cp.lower()}", physical_detail=pd,
        endurance_max=0,
        equipped={"main_hand":weapon,"off_hand":off_hand,
                  "armor1":equipped_armor[0],"armor2":equipped_armor[1]},
        bag=bag_items,
    )

def utcnow():
    return datetime.utcnow().isoformat(timespec="seconds")


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_error):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(app.config["DATABASE"])
    try:
        db.execute("PRAGMA foreign_keys = ON")
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                is_superuser INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                background TEXT NOT NULL,
                emoji TEXT NOT NULL,
                character_json TEXT NOT NULL,
                portrait_filename TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        # Проверить, есть ли колонка portrait_filename, если нет - добавить
        try:
            db.execute("ALTER TABLE characters ADD COLUMN portrait_filename TEXT;")
        except:
            pass  # Колонка уже существует
        db.commit()
        
        # Проверить и создать условия для admin пользователя
        admin_exists = db.execute(
            "SELECT id FROM users WHERE username = ?", ("admin",)
        ).fetchone()
        if not admin_exists:
            now = utcnow()
            db.execute(
                """
                INSERT INTO users (username, password_hash, is_superuser, created_at, updated_at)
                VALUES (?, ?, 1, ?, ?)
                """,
                ("admin", generate_password_hash("FUCK"), now, now),
            )
        db.commit()
    finally:
        db.close()


def query_one(sql, params=()):
    return get_db().execute(sql, params).fetchone()


def query_all(sql, params=()):
    return get_db().execute(sql, params).fetchall()


def execute(sql, params=()):
    db = get_db()
    cur = db.execute(sql, params)
    db.commit()
    return cur


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return query_one(
        "SELECT id, username, is_superuser, created_at, updated_at FROM users WHERE id = ?",
        (user_id,),
    )


@app.context_processor
def inject_user():
    return {"current_user": current_user()}


def login_user(user_row):
    session.clear()
    session["user_id"] = user_row["id"]
    session["is_superuser"] = int(user_row["is_superuser"])


def logout_user():
    session.clear()


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_user():
            flash("Сначала войдите в аккаунт.", "error")
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped


def superuser_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = current_user()
        if not user:
            flash("Сначала войдите в аккаунт.", "error")
            return redirect(url_for("login"))
        if not user["is_superuser"]:
            flash("У вас нет доступа к этой странице.", "error")
            return redirect(url_for("account"))
        return view(*args, **kwargs)

    return wrapped


def redirect_authenticated_user():
    if current_user():
        return redirect(url_for("account"))
    return None


def build_initial_state(character):
    state = {
        "v": 1,
        "meta": {
            "name": character.get("name", ""),
            "background": character.get("background", ""),
            "birthsign": character.get("birthsign", ""),
            "disposition": character.get("disposition", ""),
            "coat": character.get("coat", ""),
            "physical_detail": character.get("physical_detail", ""),
            "pips": character.get("pips", 0),
        },
        "statMax": {
            "str": character.get("str_val", 0),
            "dex": character.get("dex_val", 0),
            "wil": character.get("wil_val", 0),
            "hp": character.get("hp", 0),
            "end": character.get("endurance_max", 0),
        },
        "statCur": {
            "str": character.get("str_val", 0),
            "dex": character.get("dex_val", 0),
            "wil": character.get("wil_val", 0),
            "hp": character.get("hp", 0),
            "end": 0,
        },
        "cardMap": {
            "eq_main": (character.get("equipped") or {}).get("main_hand"),
            "eq_off": (character.get("equipped") or {}).get("off_hand"),
            "eq_arm1": (character.get("equipped") or {}).get("armor1"),
            "eq_arm2": (character.get("equipped") or {}).get("armor2"),
        },
        "usage": {},
    }
    bag = character.get("bag") or []
    for index in range(9):
        state["cardMap"][f"b{index}"] = bag[index] if index < len(bag) else None
    for index in range(6):
        state["cardMap"][f"en{index}"] = None
    for key in state["cardMap"]:
        state["usage"][key] = 0
    return state


def create_character_for_user(user_id):
    character = generate()
    state = build_initial_state(character)
    now = utcnow()
    cur = execute(
        """
        INSERT INTO characters (user_id, name, background, emoji, character_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            state["meta"]["name"],
            state["meta"]["background"],
            random.choice(MOUSE_EMOJIS),
            json.dumps(state, ensure_ascii=False),
            now,
            now,
        ),
    )
    return cur.lastrowid


def process_portrait(image_file, character_id):
    """
    Обработать загруженный портрет: создать display (до 2000px) и thumbnail (80px).
    Возвращает (display_filename, thumb_filename) или (None, None) при ошибке.
    """
    try:
        # Валидация расширения
        if "." not in image_file.filename:
            return None, None
        ext = image_file.filename.rsplit(".", 1)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return None, None
        
        # Создать папку для персонажа
        char_dir = UPLOAD_DIR / f"char_{character_id}"
        char_dir.mkdir(parents=True, exist_ok=True)
        
        # Удалить старые файлы если есть
        for f in char_dir.glob("*"):
            f.unlink()
        
        # Открыть изображение
        img = Image.open(image_file)
        
        # Если формат имеет прозрачность, конвертировать в RGB
        if img.mode in ("RGBA", "LA", "P"):
            rgb_img = Image.new("RGB", img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = rgb_img
        elif img.mode != "RGB":
            img = img.convert("RGB")
        
        # Сохранить оригинал
        original_path = char_dir / "original.jpg"
        img.save(original_path, "JPEG", quality=95)
        
        # Создать display версию (до 2000px по широкой стороне)
        display_img = img.copy()
        max_size = max(display_img.size)
        if max_size > DISPLAY_WIDTH:
            ratio = DISPLAY_WIDTH / max_size
            new_size = (int(display_img.width * ratio), int(display_img.height * ratio))
            display_img.thumbnail(new_size, Image.Resampling.LANCZOS)
        
        display_filename = f"char_{character_id}_display.jpg"
        display_path = char_dir / display_filename
        display_img.save(display_path, "JPEG", quality=85)
        
        # Создать thumbnail (80px по широкой стороне)
        thumb_img = img.copy()
        thumb_img.thumbnail((THUMB_WIDTH, THUMB_WIDTH), Image.Resampling.LANCZOS)
        
        thumb_filename = f"char_{character_id}_thumb.jpg"
        thumb_path = char_dir / thumb_filename
        thumb_img.save(thumb_path, "JPEG", quality=80)
        
        return display_filename, thumb_filename
    except Exception as e:
        print(f"Error processing portrait: {e}")
        return None, None


def get_character_or_404(character_id, allow_admin=False):
    user = current_user()
    row = query_one(
        """
        SELECT c.*, u.username
        FROM characters c
        JOIN users u ON u.id = c.user_id
        WHERE c.id = ?
        """,
        (character_id,),
    )
    if not row:
        return None
    if user and row["user_id"] == user["id"]:
        return row
    if allow_admin and user and user["is_superuser"]:
        return row
    return None


def parse_character_payload(raw_payload):
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError:
        return None
    required = {"v", "meta", "statMax", "statCur", "cardMap", "usage"}
    if not required.issubset(payload.keys()):
        return None
    meta = payload.get("meta") or {}
    if not meta.get("name") or not meta.get("background"):
        return None
    return payload


@app.route("/")
def landing():
    redirect_response = redirect_authenticated_user()
    if redirect_response:
        return redirect_response
    return render_template("landing.html")


@app.route("/guest")
def guest_sheet():
    redirect_response = redirect_authenticated_user()
    if redirect_response:
        return redirect_response
    return render_template(
        "index.html",
        character=generate(),
        page_mode="guest",
        save_label="💾 Скачать JSON",
        page_title="Mausritter",
    )


@app.route("/roll")
def roll_route():
    return jsonify(generate())


@app.route("/signup", methods=["GET", "POST"])
def signup():
    redirect_response = redirect_authenticated_user()
    if redirect_response:
        return redirect_response
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if not username or not password:
            flash("Имя пользователя и пароль обязательны.", "error")
        elif query_one("SELECT id FROM users WHERE username = ?", (username,)):
            flash("Пользователь с таким именем уже существует.", "error")
        else:
            now = utcnow()
            execute(
                """
                INSERT INTO users (username, password_hash, is_superuser, created_at, updated_at)
                VALUES (?, ?, 0, ?, ?)
                """,
                (username, generate_password_hash(password), now, now),
            )
            user = query_one(
                "SELECT id, username, is_superuser FROM users WHERE username = ?",
                (username,),
            )
            login_user(user)
            flash("Аккаунт создан.", "success")
            return redirect(url_for("account"))
    return render_template(
        "auth.html",
        mode="signup",
        title="Создать аккаунт",
        submit_label="Создать аккаунт",
    )


@app.route("/login", methods=["GET", "POST"])
def login():
    redirect_response = redirect_authenticated_user()
    if redirect_response:
        return redirect_response
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user = query_one("SELECT * FROM users WHERE username = ?", (username,))
        if not user or not check_password_hash(user["password_hash"], password):
            flash("Неверные логин или пароль.", "error")
        else:
            login_user(user)
            flash("Вы вошли в систему.", "success")
            return redirect(url_for("account"))
    return render_template(
        "auth.html",
        mode="login",
        title="Войти",
        submit_label="Войти",
    )


@app.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    flash("Вы вышли из системы.", "success")
    return redirect(url_for("landing"))


@app.route("/account")
@login_required
def account():
    user = current_user()
    characters = query_all(
        """
        SELECT id, name, background, emoji, portrait_filename, created_at, updated_at
        FROM characters
        WHERE user_id = ?
        ORDER BY updated_at DESC, id DESC
        """,
        (user["id"],),
    )
    return render_template("account.html", user=user, characters=characters)


@app.route("/account/password", methods=["POST"])
@login_required
def change_password():
    user = query_one("SELECT * FROM users WHERE id = ?", (session["user_id"],))
    current_password = request.form.get("current_password", "")
    new_password = request.form.get("new_password", "")
    confirm_password = request.form.get("confirm_password", "")
    if not check_password_hash(user["password_hash"], current_password):
        flash("Текущий пароль введён неверно.", "error")
    elif not new_password:
        flash("Новый пароль не может быть пустым.", "error")
    elif new_password != confirm_password:
        flash("Подтверждение пароля не совпадает.", "error")
    else:
        execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (generate_password_hash(new_password), utcnow(), user["id"]),
        )
        flash("Пароль обновлён.", "success")
    return redirect(url_for("account"))


@app.route("/characters/new", methods=["POST"])
@login_required
def create_character():
    character_id = create_character_for_user(session["user_id"])
    flash("Новая мышь создана.", "success")
    return redirect(url_for("character_detail", character_id=character_id))


@app.route("/characters/<int:character_id>")
@login_required
def character_detail(character_id):
    row = get_character_or_404(character_id, allow_admin=True)
    if not row:
        flash("Персонаж не найден.", "error")
        return redirect(url_for("account"))
    state = json.loads(row["character_json"])
    is_owner = row["user_id"] == session["user_id"]
    return render_template(
        "index.html",
        character=state,
        page_mode="account",
        save_label="💾 Сохранить в аккаунт",
        page_title=row["name"],
        character_row=row,
        is_owner=is_owner,
    )


@app.route("/characters/<int:character_id>/save", methods=["POST"])
@login_required
def save_character(character_id):
    row = get_character_or_404(character_id, allow_admin=True)
    if not row:
        return jsonify({"ok": False, "error": "not_found"}), 404
    if row["user_id"] != session["user_id"]:
        return jsonify({"ok": False, "error": "forbidden"}), 403
    payload = request.get_json(silent=True) or {}
    state = parse_character_payload(json.dumps(payload, ensure_ascii=False))
    if not state:
        return jsonify({"ok": False, "error": "invalid_payload"}), 400
    execute(
        """
        UPDATE characters
        SET name = ?, background = ?, character_json = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            state["meta"]["name"],
            state["meta"]["background"],
            json.dumps(state, ensure_ascii=False),
            utcnow(),
            character_id,
        ),
    )
    return jsonify({"ok": True, "name": state["meta"]["name"]})


@app.route("/characters/<int:character_id>/portrait/upload", methods=["POST"])
@login_required
def upload_portrait(character_id):
    row = get_character_or_404(character_id, allow_admin=True)
    if not row:
        return jsonify({"ok": False, "error": "not_found"}), 404
    if row["user_id"] != session["user_id"] and not session.get("is_superuser"):
        return jsonify({"ok": False, "error": "forbidden"}), 403
    
    # Проверить наличие файла
    if "portrait" not in request.files:
        return jsonify({"ok": False, "error": "no_file"}), 400
    
    file = request.files["portrait"]
    if file.filename == "":
        return jsonify({"ok": False, "error": "no_file"}), 400
    
    # Валидация размера
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Seek back to start
    
    if file_size > MAX_UPLOAD_SIZE:
        return jsonify({"ok": False, "error": "file_too_large"}), 400
    
    # Обработать портрет
    display_filename, thumb_filename = process_portrait(file, character_id)
    
    if not display_filename or not thumb_filename:
        return jsonify({"ok": False, "error": "processing_failed"}), 400
    
    # Обновить БД
    execute(
        "UPDATE characters SET portrait_filename = ?, updated_at = ? WHERE id = ?",
        (display_filename, utcnow(), character_id),
    )
    
    # Построить URLs
    char_dir = f"uploads/portraits/char_{character_id}"
    display_url = f"/static/{char_dir}/{display_filename}"
    thumb_url = f"/static/{char_dir}/{thumb_filename}"
    
    return jsonify({
        "ok": True,
        "display_url": display_url,
        "thumb_url": thumb_url,
        "display_filename": display_filename,
        "thumb_filename": thumb_filename
    })


@app.route("/characters/<int:character_id>/portrait", methods=["DELETE"])
@login_required
def delete_portrait(character_id):
    row = get_character_or_404(character_id, allow_admin=True)
    if not row:
        return jsonify({"ok": False, "error": "not_found"}), 404
    if row["user_id"] != session["user_id"] and not session.get("is_superuser"):
        return jsonify({"ok": False, "error": "forbidden"}), 403
    
    # Удалить файлы
    char_dir = UPLOAD_DIR / f"char_{character_id}"
    if char_dir.exists():
        shutil.rmtree(char_dir)
    
    # Обновить БД
    execute(
        "UPDATE characters SET portrait_filename = NULL, updated_at = ? WHERE id = ?",
        (utcnow(), character_id),
    )
    
    return jsonify({"ok": True})


@app.route("/characters/<int:character_id>/delete", methods=["POST"])
@login_required
def delete_character(character_id):
    row = get_character_or_404(character_id, allow_admin=True)
    if not row:
        flash("Персонаж не найден.", "error")
        return redirect(url_for("account"))
    if row["user_id"] != session["user_id"] and not session.get("is_superuser"):
        flash("Нельзя удалить чужого персонажа.", "error")
        return redirect(url_for("account"))
    
    # Удалить портрет если есть
    char_dir = UPLOAD_DIR / f"char_{character_id}"
    if char_dir.exists():
        shutil.rmtree(char_dir)
    
    execute("DELETE FROM characters WHERE id = ?", (character_id,))
    flash("Персонаж удалён.", "success")
    if session.get("is_superuser") and row["user_id"] != session["user_id"]:
        return redirect(url_for("admin_user_detail", user_id=row["user_id"]))
    return redirect(url_for("account"))


@app.route("/admin")
@superuser_required
def admin_dashboard():
    users = query_all(
        """
        SELECT u.id, u.username, u.is_superuser, u.created_at, u.updated_at,
               COUNT(c.id) AS character_count
        FROM users u
        LEFT JOIN characters c ON c.user_id = u.id
        GROUP BY u.id
        ORDER BY u.is_superuser DESC, u.username COLLATE NOCASE
        """
    )
    stats = {
        "users": query_one("SELECT COUNT(*) AS total FROM users")["total"],
        "characters": query_one("SELECT COUNT(*) AS total FROM characters")["total"],
    }
    return render_template("admin.html", users=users, stats=stats)


@app.route("/admin/users/<int:user_id>")
@superuser_required
def admin_user_detail(user_id):
    user = query_one(
        "SELECT id, username, is_superuser, created_at, updated_at FROM users WHERE id = ?",
        (user_id,),
    )
    if not user:
        flash("Пользователь не найден.", "error")
        return redirect(url_for("admin_dashboard"))
    characters = query_all(
        """
        SELECT id, name, background, emoji, created_at, updated_at
        FROM characters
        WHERE user_id = ?
        ORDER BY updated_at DESC, id DESC
        """,
        (user_id,),
    )
    return render_template("admin_user.html", managed_user=user, characters=characters)


@app.route("/admin/users/<int:user_id>/password-reset", methods=["POST"])
@superuser_required
def admin_reset_password(user_id):
    user = query_one("SELECT id, username FROM users WHERE id = ?", (user_id,))
    if not user:
        flash("Пользователь не найден.", "error")
    else:
        new_password = request.form.get("new_password", "")
        if not new_password:
            flash("Новый пароль не может быть пустым.", "error")
        else:
            execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                (generate_password_hash(new_password), utcnow(), user_id),
            )
            flash(f"Пароль пользователя {user['username']} обновлён.", "success")
    return redirect(url_for("admin_user_detail", user_id=user_id))


@app.route("/admin/users/<int:user_id>/delete", methods=["POST"])
@superuser_required
def admin_delete_user(user_id):
    if user_id == session["user_id"]:
        flash("Нельзя удалить самого себя.", "error")
        return redirect(url_for("admin_user_detail", user_id=user_id))
    user = query_one("SELECT id, username FROM users WHERE id = ?", (user_id,))
    if not user:
        flash("Пользователь не найден.", "error")
    else:
        execute("DELETE FROM users WHERE id = ?", (user_id,))
        flash(f"Пользователь {user['username']} удалён.", "success")
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/characters/<int:character_id>/delete", methods=["POST"])
@superuser_required
def admin_delete_character(character_id):
    row = query_one("SELECT id, user_id, name FROM characters WHERE id = ?", (character_id,))
    if not row:
        flash("Персонаж не найден.", "error")
        return redirect(url_for("admin_dashboard"))
    execute("DELETE FROM characters WHERE id = ?", (character_id,))
    flash(f"Персонаж {row['name']} удалён.", "success")
    return redirect(url_for("admin_user_detail", user_id=row["user_id"]))


@app.route("/portraits/<int:character_id>/<filename>")
def serve_portrait(character_id, filename):
    char_dir = UPLOAD_DIR / f"char_{character_id}"
    print(f"DEBUG: serve_portrait called: character_id={character_id}, filename={filename}, char_dir={char_dir}")
    if not char_dir.exists():
        print(f"DEBUG: char_dir does not exist: {char_dir}")
        return "Not found", 404
    file_path = char_dir / filename
    print(f"DEBUG: checking file_path={file_path}, exists={file_path.exists()}")
    if not file_path.exists():
        print(f"DEBUG: file does not exist")
        return "Not found", 404
    print(f"DEBUG: serving file from {char_dir}")
    return send_from_directory(str(char_dir), filename)


@app.route("/spells")
def spells():
    return render_template("spells.html")


init_db()

if __name__ == "__main__":
    print("Mausritter -> http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
