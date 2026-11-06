/* ===== Общие данные и утилиты сервиса «Соседи» =====
   Демо-версия: всё хранится в localStorage браузера. */

/* Если браузер запрещает localStorage (встроенный просмотр, приватный режим),
   данные живут в памяти страницы — сайт всё равно работает. */
const MEM = {};
const DB = {
  get(key, def) {
    try { const v = localStorage.getItem('sosedi3_' + key); if (v !== null) return JSON.parse(v); } catch (e) {}
    return key in MEM ? JSON.parse(MEM[key]) : def;
  },
  set(key, val) {
    MEM[key] = JSON.stringify(val);
    try { localStorage.setItem('sosedi3_' + key, MEM[key]); } catch (e) {}
  },
  del(key) {
    delete MEM[key];
    try { localStorage.removeItem('sosedi3_' + key); } catch (e) {}
  }
};

const DEMO_USER = {
  name: 'Иван Петров', email: 'demo@sosedi.ru', pass: 'demo123',
  bld: 'm2', room: '315', tg: '@ivan_petrov', login: 'demo'
};

/* общежития */
const DORMS = [
  { id: 'm1', ru: 'Металлург 1', en: 'Metallurg 1' },
  { id: 'm2', ru: 'Металлург 2', en: 'Metallurg 2' },
  { id: 'm3', ru: 'Металлург 3', en: 'Metallurg 3' },
  { id: 'm4', ru: 'Металлург 4', en: 'Metallurg 4' },
  { id: 'g1', ru: 'Горняк 1', en: 'Gornyak 1' },
  { id: 'g2', ru: 'Горняк 2', en: 'Gornyak 2' },
  { id: 'dk', ru: 'Дом-коммуна', en: 'Dom-Kommuna' },
  { id: 'dsg', ru: 'ДСГ, корпуса 5 и 6', en: 'DSG, buildings 5 & 6',
    ruFull: 'Дорогомиловский студенческий городок', enFull: 'Dorogomilovsky student campus' }
];
function dormName(id) {
  const d = DORMS.find(x => x.id === id);
  if (!d) return '—';
  return (typeof LANG !== 'undefined' && LANG === 'en') ? d.en : d.ru;
}
const DORM_BY_TG = {
  '@artem_k': 'm2', '@olga_sm': 'm1', '@masha_leb': 'm2', '@timur_a': 'g1', '@alina_e': 'm3',
  '@nik_orlov': 'dsg', '@egor_v': 'g2', '@dasha_k': 'm4', '@serg_fix': 'dk', '@anna_math': 'm1', '@rus_cut': 'g1'
};

const CATEGORIES = {
  thing: ['Инструменты', 'Бытовая техника', 'Кухня', 'Спорт и отдых', 'Учёба', 'Игры'],
  service: ['Ремонт техники', 'Помощь с учёбой', 'Красота', 'Другое']
};

const CAT_EMOJI = {
  'Инструменты': '🔧', 'Бытовая техника': '🔌', 'Кухня': '🍳', 'Спорт и отдых': '⚽',
  'Учёба': '📚', 'Игры': '🎲', 'Ремонт техники': '💻', 'Помощь с учёбой': '🎓',
  'Красота': '✂️', 'Другое': '✨'
};

/* палитры для узорных обложек карточек (как на скриншоте LMS) */
const PALETTES = [
  ['#fcd27a', '#f6b73c'], // жёлтая
  ['#8ee6e1', '#55cfc9'], // бирюзовая
  ['#a99cf3', '#8775e9'], // фиолетовая
  ['#e8eaee', '#cfd4dc'], // серая
  ['#a9bfff', '#7898ff'], // голубая
  ['#ffc0cf', '#ff8fab']  // розовая
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function patternBg(seedStr) {
  const seed = hash(seedStr);
  const [bg, fg] = PALETTES[seed % PALETTES.length];
  const kind = Math.floor(seed / 7) % 4;
  let s = '';
  if (kind === 0) { // ромбы
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const o = (0.35 + ((x + y) % 3) * 0.22).toFixed(2);
      s += `<path d="M${x*40+20} ${y*40}L${x*40+40} ${y*40+20}L${x*40+20} ${y*40+40}L${x*40} ${y*40+20}Z" fill="${fg}" opacity="${o}"/>`;
    }
  } else if (kind === 1) { // квадраты в квадратах
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      s += `<rect x="${x*40+6}" y="${y*40+6}" width="28" height="28" fill="none" stroke="${fg}" stroke-width="3"/>`;
      if ((x + y) % 2) s += `<rect x="${x*40+15}" y="${y*40+15}" width="10" height="10" fill="${fg}"/>`;
    }
  } else if (kind === 2) { // круги
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      const r = 14 + ((x * 3 + y) % 3) * 9;
      s += `<circle cx="${x*60+20}" cy="${y*60+20}" r="${r}" fill="${fg}" opacity=".45"/>`;
    }
  } else { // треугольники
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const o = ((x * y) % 3 === 0) ? '.75' : '.35';
      s += `<path d="M${x*40} ${y*40+40}L${x*40+20} ${y*40}L${x*40+40} ${y*40+40}Z" fill="${fg}" opacity="${o}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="${bg}"/>${s}</svg>`;
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ===== даты ===== */
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function addDays(n, from) { const d = new Date(from || today()); d.setDate(d.getDate() + n); return d; }
function iso(d) {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function parseIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function daysUntil(s) { return Math.round((parseIso(s) - today()) / 86400000); }
function fmtDate(s) {
  return parseIso(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

/* ===== пользователи и сессия ===== */
function getUsers() {
  const users = DB.get('users', null);
  if (users) return users;
  DB.set('users', [DEMO_USER]);
  return [DEMO_USER];
}
function saveUsers(u) { DB.set('users', u); }
function currentUser() {
  let email = DB.get('session', null);
  if (!email) { try { email = JSON.parse(sessionStorage.getItem('sosedi3_session')); } catch (e) {} }
  if (!email) email = MEM.tabSession || null;
  if (!email) return null;
  return getUsers().find(u => u.email === email) || null;
}
function login(email, remember) {
  MEM.tabSession = email;
  if (remember) DB.set('session', email);
  else { DB.del('session'); try { sessionStorage.setItem('sosedi3_session', JSON.stringify(email)); } catch (e) {} }
}
function logout() {
  delete MEM.tabSession;
  DB.del('session');
  try { sessionStorage.removeItem('sosedi3_session'); } catch (e) {}
}

/* ===== объявления ===== */
function seedItems() {
  const me = DEMO_USER;
  const N = (name, bld, room, tg) => ({ ownerName: name, owner: tg + '@n', bld: DORM_BY_TG[tg] || 'm1', room, tg });
  let id = 1;
  const mk = (o) => Object.assign({
    id: 'i' + (id++), status: 'free', uses: 0, created: iso(addDays(-id)), rating: null, reviews: 0
  }, o);

  return [
    mk({ type: 'thing', title: 'Дрель-шуруповёрт с набором бит', cat: 'Инструменты', emoji: '🔧',
      desc: 'Аккумуляторная, два аккумулятора в комплекте. Подходит, чтобы повесить полку или собрать шкаф.',
      ...N('Артём Ковалёв', '2', '412', '@artem_k'), uses: 21,
      status: 'busy', borrower: me.email, borrowerName: me.name, from: iso(addDays(-4)), to: iso(addDays(1)) }),
    mk({ type: 'thing', title: 'Стремянка 5 ступеней', cat: 'Инструменты', emoji: '🪜',
      desc: 'Алюминиевая, лёгкая. Лампочку поменять, шторы повесить.',
      ...N('Ольга Смирнова', '1', '207', '@olga_sm'), uses: 18 }),
    mk({ type: 'thing', title: 'Утюг с отпаривателем', cat: 'Бытовая техника', emoji: '👔',
      desc: 'Philips, вертикальное отпаривание. Перед защитой диплома — самое то.',
      ...N('Мария Лебедева', '2', '118', '@masha_leb'), uses: 34,
      status: 'busy', borrower: 'x@n', borrowerName: 'Денис О.', from: iso(addDays(-1)), to: iso(addDays(2)) }),
    mk({ type: 'thing', title: 'Пылесос беспроводной', cat: 'Бытовая техника', emoji: '🧹',
      desc: 'Держит заряд ~40 минут, хватит на комнату и коридор.',
      owner: me.email, ownerName: me.name, bld: me.bld, room: me.room, tg: me.tg, uses: 9,
      status: 'busy', borrower: 'y@n', borrowerName: 'Кирилл Н.', from: iso(addDays(-6)), to: iso(addDays(-1)) }),
    mk({ type: 'thing', title: 'Мультиварка Redmond', cat: 'Кухня', emoji: '🍲',
      desc: 'Плов, каша, суп — сама всё сделает, пока ты на парах.',
      ...N('Тимур Алиев', '3', '501', '@timur_a'), uses: 12 }),
    mk({ type: 'thing', title: 'Блендер погружной', cat: 'Кухня', emoji: '🥤',
      desc: 'Для смузи и супов-пюре. Насадка-венчик в комплекте.',
      ...N('Алина Ершова', '1', '305', '@alina_e'), uses: 5 }),
    mk({ type: 'thing', title: 'Велосипед городской', cat: 'Спорт и отдых', emoji: '🚲',
      desc: 'Даю на день-два, замок прилагается. Шлем тоже есть.',
      ...N('Никита Орлов', '4', '220', '@nik_orlov'), uses: 7 }),
    mk({ type: 'thing', title: 'Палатка на 3 человек', cat: 'Спорт и отдых', emoji: '⛺',
      desc: 'Для выездов на природу. Возвращать сухой, пожалуйста :)',
      owner: me.email, ownerName: me.name, bld: me.bld, room: me.room, tg: me.tg, uses: 3 }),
    mk({ type: 'thing', title: 'Инженерный калькулятор Casio', cat: 'Учёба', emoji: '🧮',
      desc: 'fx-991. Разрешён на экзаменах по матану и физике.',
      ...N('Ольга Смирнова', '1', '207', '@olga_sm'), uses: 15 }),
    mk({ type: 'thing', title: 'Учебник Демидовича (задачник)', cat: 'Учёба', emoji: '📕',
      desc: 'Сборник задач по матанализу. Без пометок.',
      ...N('Егор Васильев', '3', '102', '@egor_v'), uses: 4,
      status: 'busy', borrower: me.email, borrowerName: me.name, from: iso(addDays(-10)), to: iso(addDays(5)) }),
    mk({ type: 'thing', title: 'Настольная игра «Мафия»', cat: 'Игры', emoji: '🎲',
      desc: 'Карты и маски на 12 человек. Идеально для вечера на этаже.',
      ...N('Дарья Кузнецова', '2', '420', '@dasha_k'), uses: 11 }),

    mk({ type: 'service', title: 'Починю ноутбук, переустановлю Windows', cat: 'Ремонт техники', emoji: '💻',
      desc: 'Чистка от пыли, замена термопасты, установка ОС и программ. Быстро и бесплатно для соседей.',
      ...N('Сергей Романов', '3', '310', '@serg_fix'), uses: 27, rating: 4.9, reviews: 23 }),
    mk({ type: 'service', title: 'Помогу с матаном и линалом', cat: 'Помощь с учёбой', emoji: '🎓',
      desc: 'Объясню пределы, производные, матрицы. 4 курс, отличник.',
      ...N('Анна Белова', '1', '410', '@anna_math'), uses: 19, rating: 5.0, reviews: 14 }),
    mk({ type: 'service', title: 'Помогу с Python и алгоритмами', cat: 'Помощь с учёбой', emoji: '🐍',
      desc: 'Разберём лабы, задачи на алгоритмы, подготовка к контесту.',
      owner: me.email, ownerName: me.name, bld: me.bld, room: me.room, tg: me.tg, uses: 6, rating: 4.8, reviews: 5 }),
    mk({ type: 'service', title: 'Подстригу машинкой', cat: 'Красота', emoji: '✂️',
      desc: 'Короткие мужские стрижки. Своя машинка, всё чисто.',
      ...N('Руслан Гаджиев', '4', '115', '@rus_cut'), uses: 31, rating: 4.7, reviews: 26 }),
    mk({ type: 'service', title: 'Разговорный английский', cat: 'Помощь с учёбой', emoji: '🇬🇧',
      desc: 'Практика speaking 2 раза в неделю, уровень B2+.',
      ...N('Дарья Кузнецова', '2', '420', '@dasha_k'), uses: 8, rating: 4.9, reviews: 7 }),
    mk({ type: 'service', title: 'Помогу донести и собрать мебель', cat: 'Другое', emoji: '📦',
      desc: 'Переезд между комнатами, сборка шкафа или кровати.',
      ...N('Никита Орлов', '4', '220', '@nik_orlov'), uses: 10, rating: 4.6, reviews: 9 })
  ];
}

/* примеры объявлений выключены — каталог пустой, пока студенты не выложат свои */
const SEED_DEMO_LISTINGS = false;

function getItems() {
  const items = DB.get('items', null);
  if (items) return items;
  const seeded = SEED_DEMO_LISTINGS ? seedItems() : [];
  DB.set('items', seeded);
  return seeded;
}
function saveItems(items) { DB.set('items', items); }
