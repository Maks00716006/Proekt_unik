/* ===== Языки: русский / английский ===== */
let LANG = DB.get('lang', 'ru');

const I18N = {
  ru: {
    langName: 'Русский (ru)',
    brandSub: 'обмен в общежитии',
    loginPh: 'Логин или адрес электронной почты',
    passPh: 'Пароль',
    loginBtn: 'Войти',
    forgot: 'Забыли пароль?',
    forgotToast: 'Обратитесь к администратору общежития, чтобы восстановить пароль',
    errEmpty: 'Введите логин и пароль',
    errPass: 'Неверный логин или пароль',
    dormTitle: 'Выберите общежитие',
    dormSub: 'Покажем вещи и услуги соседей рядом с вами',
    continue: 'Продолжить',

    navCatalog: 'Каталог', navMy: 'Мои объявления', navLoans: 'Мои займы', navAbout: 'О сервисе',
    umMy: '📦 Мои объявления', umLoans: '⏰ Мои займы', umDorm: '🏠 Сменить общежитие',
    umLang: '🌐 English', umReset: '↺ Сбросить демо-данные', umLogout: '⎋ Выйти',
    fAbout: 'О сервисе', fHow: 'Как это работает', fRules: 'Правила обмена', fSupport: 'Поддержка',
    fDorms: 'Общежития', fSections: 'Разделы',
    fBottom: 'Соседи · обмен вещами и услугами между студентами общежития · 2026',
    catalog: 'Каталог', things: 'Вещи', services: 'Услуги', allAds: 'Все объявления',
    ads: 'Объявлений', post: '＋ Выложить', dorm: 'Общежитие', allDorms: 'Все общежития',
    category: 'Категория', allCats: 'Все категории', status: 'Статус', any: 'Любой',
    sFree: 'Свободно', sBusy: 'Занято', search: 'Поиск', searchPh: 'Найти вещь или услугу',
    sort: 'Упорядочить', sortNew: 'Сначала новые', sortPop: 'По популярности',
    sortFree: 'Сначала свободные', sortName: 'По названию', view: 'Вид', compact: 'Компактно',
    apply: 'Применить', reset: 'Сбросить', freeOf: 'свободно', nowFree: 'Сейчас доступно',
    myDorm: 'Моё общежитие', room: 'комн.', mine: 'Моё',
    available: 'Свободна', taken: 'Занята', canTake: 'можно взять', until: 'до', overdue: 'просрочено',
    myAds: 'Мои объявления', myLoans: 'Мои займы', aboutTitle: 'Обмен вещами и услугами между студентами общежития',
    changeDorm: 'Сменить общежитие', save: 'Сохранить', dormSaved: 'Общежитие сохранено',
    hello: 'Привет', welcome: 'Рады видеть тебя в «Соседях»',
    emptyTitle: 'Пока объявлений нет', emptyText: 'Выложи вещь или предложи услугу — соседи увидят её первыми.',
    noMatch: 'Ничего не нашлось. Попробуй изменить фильтры', postOwn: 'или выложи своё объявление'
  },
  en: {
    langName: 'English (en)',
    brandSub: 'dorm sharing',
    loginPh: 'Username or email',
    passPh: 'Password',
    loginBtn: 'Log in',
    forgot: 'Forgotten your password?',
    forgotToast: 'Contact the dormitory administrator to reset your password',
    errEmpty: 'Enter your username and password',
    errPass: 'Invalid username or password',
    dormTitle: 'Choose your dormitory',
    dormSub: 'We will show items and services from neighbours nearby',
    continue: 'Continue',

    navCatalog: 'Catalogue', navMy: 'My listings', navLoans: 'My loans', navAbout: 'About',
    umMy: '📦 My listings', umLoans: '⏰ My loans', umDorm: '🏠 Change dormitory',
    umLang: '🌐 Русский', umReset: '↺ Reset demo data', umLogout: '⎋ Log out',
    fAbout: 'About', fHow: 'How it works', fRules: 'Sharing rules', fSupport: 'Support',
    fDorms: 'Dormitories', fSections: 'Sections',
    fBottom: 'Sosedi · sharing items and services between dorm students · 2026',
    catalog: 'Catalogue', things: 'Items', services: 'Services', allAds: 'All listings',
    ads: 'Listings', post: '＋ Post', dorm: 'Dormitory', allDorms: 'All dormitories',
    category: 'Category', allCats: 'All categories', status: 'Status', any: 'Any',
    sFree: 'Available', sBusy: 'Taken', search: 'Search', searchPh: 'Find an item or service',
    sort: 'Sort by', sortNew: 'Newest first', sortPop: 'Most popular',
    sortFree: 'Available first', sortName: 'By name', view: 'View', compact: 'Compact',
    apply: 'Apply', reset: 'Reset', freeOf: 'available', nowFree: 'Available now',
    myDorm: 'My dorm', room: 'room', mine: 'Mine',
    available: 'Available', taken: 'Taken', canTake: 'can borrow', until: 'until', overdue: 'overdue',
    myAds: 'My listings', myLoans: 'My loans', aboutTitle: 'Sharing items and services between dorm students',
    changeDorm: 'Change dormitory', save: 'Save', dormSaved: 'Dormitory saved',
    hello: 'Hi', welcome: 'Welcome to Sosedi',
    emptyTitle: 'No listings yet', emptyText: 'Post an item or offer a service — your neighbours will see it first.',
    noMatch: 'Nothing found. Try changing the filters', postOwn: 'or post your own listing'
  }
};

function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) ?? I18N.ru[key] ?? key;
}

function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.documentElement.lang = LANG;
}

function setLang(lang) {
  LANG = lang;
  DB.set('lang', lang);
  applyI18n();
  document.dispatchEvent(new Event('langchange'));
}

/* HTML списка общежитий с кружками-радиокнопками */
function dormOptionsHtml(selected) {
  return DORMS.map((d, i) => `
    <label class="dorm ${d.id === selected ? 'on' : ''}" style="animation-delay:${i * 40}ms">
      <input type="radio" name="dorm" value="${d.id}" ${d.id === selected ? 'checked' : ''}>
      <span class="radio"></span>
      <span><b>${LANG === 'en' ? d.en : d.ru}</b>${d.ruFull ? `<small>${LANG === 'en' ? d.enFull : d.ruFull}</small>` : ''}</span>
    </label>`).join('');
}
function bindDormOptions(root, onChange) {
  root.querySelectorAll('.dorm input').forEach(inp => inp.addEventListener('change', () => {
    root.querySelectorAll('.dorm').forEach(l => l.classList.toggle('on', l.contains(inp) && inp.checked));
    onChange && onChange(inp.value);
  }));
}
