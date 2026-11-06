/* ===== Приложение «Соседи» ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ME = currentUser();
if (!ME) { location.replace('index.html'); throw new Error('Нет сессии'); }

let items = getItems();
const F = { type: 'thing', cat: '', bld: '', status: '', q: '', sort: 'new' }; // фильтры каталога
const closedGroups = new Set();

/* ---------- вход-анимация и приветствие ---------- */
if (DB.get('justLoggedIn', false)) {
  DB.del('justLoggedIn');
  setTimeout(() => toast('👋', `Привет, ${ME.name.split(' ')[0]}!`, 'Рады видеть тебя в «Соседях»'), 700);
  setTimeout(() => remindersToast(), 2200);
} else {
  $('#intro').remove();
}

/* ---------- шапка ---------- */
$('#avatar').textContent = initials(ME.name);
$('#umName').textContent = ME.name;
$('#umRoom').textContent = `Корпус ${ME.bld}, комната ${ME.room}`;

function togglePop(btn, pop) {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const was = pop.hidden;
    $$('.dropdown').forEach(d => d.hidden = true);
    pop.hidden = !was;
  });
}
togglePop($('#userBtn'), $('#userMenu'));
togglePop($('#bellBtn'), $('#bellMenu'));
document.addEventListener('click', e => {
  if (!e.target.closest('.dropdown')) $$('.dropdown').forEach(d => d.hidden = true);
  if (!e.target.closest('.menu-pop') && !e.target.closest('.kebab')) $$('.menu-pop').forEach(m => m.remove());
});
$('#burger').addEventListener('click', () => $('#nav').classList.toggle('open'));
$('#logoutBtn').addEventListener('click', () => { logout(); location.href = 'index.html'; });
$('#resetBtn').addEventListener('click', () => {
  DB.del('items'); items = getItems(); route(); updateBell();
  toast('↺', 'Демо-данные восстановлены');
});
$$('.footer [data-bld]').forEach(a => a.addEventListener('click', () => {
  F.bld = a.dataset.bld; F.type = 'all';
  setTimeout(() => { route(); scrollTo({ top: 0, behavior: 'smooth' }); });
}));

/* ---------- тосты ---------- */
function toast(icon, title, text = '') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span style="font-size:20px">${icon}</span><div><b>${esc(title)}</b>${text ? esc(text) : ''}</div>`;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3800);
}

/* ---------- сохранение ---------- */
function persist() { saveItems(items); updateBell(); }

/* ---------- напоминания ---------- */
function getReminders() {
  const list = [];
  items.forEach(it => {
    if (it.status !== 'busy' || !it.to) return;
    const d = daysUntil(it.to);
    if (it.borrower === ME.email) {
      if (d < 0) list.push({ lvl: 'red', it, text: `Верни «${it.title}» — просрочено на ${-d} ${plural(-d, 'день', 'дня', 'дней')}`, sub: `Владелец: ${it.ownerName}, корп. ${it.bld}, комн. ${it.room}` });
      else if (d <= 1) list.push({ lvl: 'yellow', it, text: `Верни «${it.title}» ${d === 0 ? 'сегодня' : 'завтра'}`, sub: `Владелец: ${it.ownerName}, корп. ${it.bld}, комн. ${it.room}` });
    } else if (it.owner === ME.email && d < 0) {
      list.push({ lvl: 'red', it, text: `${it.borrowerName} не вернул(а) «${it.title}»`, sub: `Срок истёк ${fmtDate(it.to)}` });
    }
  });
  return list;
}

function updateBell() {
  const rem = getReminders(), c = $('#bellCount');
  c.hidden = !rem.length; c.textContent = rem.length;
  c.classList.toggle('pulse', rem.some(r => r.lvl === 'red'));
  $('#bellMenu').innerHTML = `<div class="dd-title">Напоминания</div>` + (rem.length
    ? rem.map(r => `<div class="rem" data-go="loans"><span class="dot" style="background:var(--${r.lvl === 'red' ? 'red' : 'yellow'})"></span><div>${esc(r.text)}<small>${esc(r.sub)}</small></div></div>`).join('')
    : `<div class="empty-rem">🎉 Всё вернули вовремя.<br>Напоминаний нет</div>`);
  $$('#bellMenu .rem').forEach(r => r.addEventListener('click', () => location.hash = 'loans'));
}

function remindersToast() {
  const rem = getReminders();
  if (!rem.length) return;
  const r = rem[0];
  toast(r.lvl === 'red' ? '⚠️' : '⏰', r.text, rem.length > 1 ? ` И ещё ${rem.length - 1} в колокольчике.` : '');
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('Соседи: напоминание', { body: r.text, icon: 'assets/favicon.svg' }); } catch (e) {}
  }
}

/* ---------- карточка ---------- */
function statusHtml(it) {
  if (it.type === 'service') {
    return it.rating
      ? `<span class="badge yellow">★ ${it.rating.toFixed(1)}</span><span>${it.reviews} ${plural(it.reviews, 'отзыв', 'отзыва', 'отзывов')}</span>`
      : `<span class="badge gray">новое</span><span>пока без отзывов</span>`;
  }
  if (it.status === 'free') return `<span class="badge">Свободна</span><span>можно взять</span>`;
  const d = daysUntil(it.to);
  const cls = d < 0 ? 'red' : d <= 1 ? 'orange' : 'blue';
  const txt = d < 0 ? 'просрочено' : `до ${fmtDate(it.to)}`;
  return `<span class="badge ${cls}">Занята</span><span>${txt}</span>`;
}

function loanProgress(it) {
  const total = Math.max(1, Math.round((parseIso(it.to) - parseIso(it.from)) / 86400000));
  const left = daysUntil(it.to);
  const pct = Math.min(100, Math.max(0, Math.round((total - left) / total * 100)));
  const color = left < 0 ? 'var(--red)' : left <= 1 ? 'var(--orange)' : 'var(--yellow)';
  const label = left < 0 ? `просрочено на ${-left} ${plural(-left, 'день', 'дня', 'дней')}`
    : left === 0 ? 'вернуть сегодня' : `осталось ${left} ${plural(left, 'день', 'дня', 'дней')}`;
  const bcls = left < 0 ? 'red' : left <= 1 ? 'orange' : 'yellow';
  return { pct, color, label, bcls };
}

function cardHtml(it, opts = {}) {
  const mine = it.owner === ME.email;
  let foot = statusHtml(it), extra = '';
  if (opts.loan) {
    const p = loanProgress(it);
    foot = `<span class="badge ${p.bcls}">${p.pct}%</span><span>${p.label}</span>`;
    extra = `<div class="bar" style="margin-top:6px"><i style="width:${p.pct}%;background:${p.color}"></i></div>`;
  }
  const actions = opts.actions ? `<div class="card-actions">${opts.actions}</div>` : '';
  return `
  <article class="card" data-id="${it.id}" style="animation-delay:${(opts.i || 0) * 35}ms">
    <div class="cover" style="background-image:${patternBg(it.id + it.title)}"><span class="em">${esc(it.emoji || CAT_EMOJI[it.cat] || '📦')}</span></div>
    <div class="body">
      <div class="head">
        <span class="title">${esc(it.title)}</span>
        <span class="uses" title="${it.type === 'service' ? 'Сколько раз помогли' : 'Сколько раз брали'}">
          <svg width="16" height="12" viewBox="0 0 20 14" fill="#6a737b"><circle cx="6" cy="4" r="3"/><circle cx="14" cy="4" r="3"/><path d="M0 13c0-3 2.7-5 6-5s6 2 6 5zM10 13c.3-2.3 1.6-4 4-4 3.3 0 6 2 6 4z"/></svg>${it.uses}</span>
        <button class="kebab" data-menu="${it.id}" aria-label="Действия">⋮</button>
      </div>
      <div class="meta">${mine ? 'Моё' : esc(it.ownerName)} / Корп. ${esc(it.bld)} · комн. ${esc(it.room)}</div>
      <div class="meta">${esc(it.cat)}</div>
      <div class="foot">${foot}</div>
      ${extra}${actions}
    </div>
  </article>`;
}

function bindCards(root) {
  $$('.card', root).forEach(c => c.addEventListener('click', e => {
    if (e.target.closest('.kebab, .card-actions, .menu-pop')) return;
    openItem(c.dataset.id);
  }));
  $$('.kebab', root).forEach(k => k.addEventListener('click', e => {
    e.stopPropagation();
    $$('.menu-pop').forEach(m => m.remove());
    const it = items.find(x => x.id === k.dataset.menu), mine = it.owner === ME.email;
    const m = document.createElement('div');
    m.className = 'menu-pop';
    m.innerHTML = `<button data-a="open">🔎 Подробнее</button>` +
      (mine ? `<button data-a="del">🗑 Удалить объявление</button>`
            : `<button data-a="copy">📋 Скопировать контакт</button><button data-a="report">🚩 Пожаловаться</button>`);
    k.closest('.card').appendChild(m);
    m.addEventListener('click', ev => {
      const a = ev.target.dataset.a; m.remove();
      if (a === 'open') openItem(it.id);
      if (a === 'del') deleteItem(it.id);
      if (a === 'copy') { navigator.clipboard?.writeText(it.tg || '').catch(() => {}); toast('📋', 'Контакт скопирован', ` ${it.tg}`); }
      if (a === 'report') toast('🚩', 'Жалоба отправлена', ' Модератор общежития проверит объявление');
    });
  }));
  $$('[data-act]', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const id = b.closest('.card').dataset.id;
    ({ ret: returnItem, remind: remindBorrower, del: deleteItem, take: openItem })[b.dataset.act](id);
  }));
}

/* ---------- страницы ---------- */
function pageCatalog() {
  let list = items.filter(it => {
    if (F.type !== 'all' && it.type !== F.type) return false;
    if (F.cat && it.cat !== F.cat) return false;
    if (F.bld && it.bld !== F.bld) return false;
    if (F.status === 'free' && !(it.type === 'service' || it.status === 'free')) return false;
    if (F.status === 'busy' && it.status !== 'busy') return false;
    if (F.q) {
      const q = F.q.toLowerCase();
      if (!(it.title + ' ' + it.desc + ' ' + it.ownerName).toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const sorters = {
    new: (a, b) => b.created.localeCompare(a.created),
    popular: (a, b) => b.uses - a.uses,
    name: (a, b) => a.title.localeCompare(b.title, 'ru'),
    free: (a, b) => (a.status === 'busy') - (b.status === 'busy')
  };
  list.sort(sorters[F.sort]);

  const cats = F.type === 'all' ? [...CATEGORIES.thing, ...CATEGORIES.service] : CATEGORIES[F.type];
  const groups = cats.map(c => ({ c, list: list.filter(i => i.cat === c) })).filter(g => g.list.length);
  const freeCount = list.filter(i => i.type === 'service' || i.status === 'free').length;

  $('#view').innerHTML = `
  <div class="page">
    <h1>Каталог</h1>
    <div class="toprow">
      <div class="seg">
        <button data-type="thing" class="${F.type === 'thing' ? 'on' : ''}">Вещи</button>
        <button data-type="service" class="${F.type === 'service' ? 'on' : ''}">Услуги</button>
        <button data-type="all" class="${F.type === 'all' ? 'on' : ''}">Все объявления</button>
      </div>
      <div class="right-tools">
        <span class="pill">Объявлений: ${list.length}</span>
        <button class="btn" id="newBtn">＋ Выложить</button>
      </div>
    </div>

    <div class="filters">
      <label><span>Корпус</span>
        <select class="ctl" id="fBld"><option value="">Все</option>${BUILDINGS.map(b => `<option value="${b}" ${F.bld === b ? 'selected' : ''}>Корпус ${b}</option>`).join('')}</select></label>
      <label><span>Категория</span>
        <select class="ctl" id="fCat"><option value="">Все категории</option>${cats.map(c => `<option ${F.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label><span>Статус</span>
        <select class="ctl" id="fStatus">
          <option value="">Любой</option>
          <option value="free" ${F.status === 'free' ? 'selected' : ''}>Свободно</option>
          <option value="busy" ${F.status === 'busy' ? 'selected' : ''}>Занято</option>
        </select></label>
      <label class="f-search"><span>Поиск</span>
        <input class="ctl" id="fQ" placeholder="Найти вещь или услугу" value="${esc(F.q)}"></label>
      <label><span>Упорядочить</span>
        <select class="ctl" id="fSort">
          <option value="new" ${F.sort === 'new' ? 'selected' : ''}>Сначала новые</option>
          <option value="popular" ${F.sort === 'popular' ? 'selected' : ''}>По популярности</option>
          <option value="free" ${F.sort === 'free' ? 'selected' : ''}>Сначала свободные</option>
          <option value="name" ${F.sort === 'name' ? 'selected' : ''}>По названию</option>
        </select></label>
      <label><span>Вид</span>
        <select class="ctl" id="fView"><option>Компактно</option></select></label>
      <div class="filter-btns">
        <button class="btn primary" id="fApply">Применить</button>
        <button class="btn" id="fReset">Сбросить</button>
      </div>
    </div>

    ${groups.length ? groups.map(g => `
      <section class="group ${closedGroups.has(g.c) ? 'closed' : ''}" data-g="${esc(g.c)}">
        <div class="group-h">
          <span class="chev">▼</span><b>${CAT_EMOJI[g.c]} ${esc(g.c)}</b>
          ${g.list.some(i => i.owner === ME.email) ? '<span class="tag">Есть моё</span>' : ''}
          <span class="pill">Объявлений: ${g.list.length} · свободно: ${g.list.filter(i => i.type === 'service' || i.status === 'free').length}</span>
        </div>
        <div class="grid">${g.list.map((it, i) => cardHtml(it, { i })).join('')}</div>
      </section>`).join('')
    : `<div class="group"><div class="empty"><div class="big">🔍</div>Ничего не нашлось. Попробуй изменить фильтры<br>или <a href="#" id="emptyNew">выложи своё объявление</a>.</div></div>`}
    <p class="meta" style="margin-top:8px">Сейчас доступно: ${freeCount} из ${list.length}</p>
  </div>`;

  $$('.seg button').forEach(b => b.addEventListener('click', () => { F.type = b.dataset.type; F.cat = ''; pageCatalog(); }));
  const read = () => {
    F.bld = $('#fBld').value; F.cat = $('#fCat').value; F.status = $('#fStatus').value;
    F.q = $('#fQ').value.trim(); F.sort = $('#fSort').value;
  };
  ['#fBld', '#fCat', '#fStatus', '#fSort'].forEach(s => $(s).addEventListener('change', () => { read(); pageCatalog(); }));
  let qt;
  $('#fQ').addEventListener('input', () => {
    clearTimeout(qt);
    qt = setTimeout(() => { read(); pageCatalog(); const q = $('#fQ'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 300);
  });
  $('#fApply').addEventListener('click', () => { read(); pageCatalog(); });
  $('#fReset').addEventListener('click', () => { Object.assign(F, { cat: '', bld: '', status: '', q: '', sort: 'new' }); pageCatalog(); });
  $('#newBtn').addEventListener('click', () => openNew(F.type === 'service' ? 'service' : 'thing'));
  $('#emptyNew')?.addEventListener('click', e => { e.preventDefault(); openNew('thing'); });
  $$('.group-h').forEach(h => h.addEventListener('click', () => {
    const g = h.parentElement, name = g.dataset.g;
    g.classList.toggle('closed');
    g.classList.contains('closed') ? closedGroups.add(name) : closedGroups.delete(name);
  }));
  bindCards($('#view'));
}

function pageMy() {
  const mine = items.filter(i => i.owner === ME.email);
  const things = mine.filter(i => i.type === 'thing'), services = mine.filter(i => i.type === 'service');
  const act = it => (it.status === 'busy' ? `<button class="btn sm success" data-act="ret">✓ Мне вернули</button>` : '') +
    `<button class="btn sm danger" data-act="del">Удалить</button>`;
  $('#view').innerHTML = `
  <div class="page">
    <div class="toprow">
      <h1 style="margin:0">Мои объявления</h1>
      <div class="right-tools">
        <span class="pill">Всего: ${mine.length}</span>
        <button class="btn primary" id="newThing">＋ Выложить вещь</button>
        <button class="btn" id="newService">＋ Предложить услугу</button>
      </div>
    </div>
    <section class="group"><div class="group-h"><span class="chev">▼</span><b>📦 Мои вещи</b><span class="pill">${things.length} · на руках у соседей: ${things.filter(t => t.status === 'busy').length}</span></div>
      ${things.length ? `<div class="grid">${things.map((it, i) => cardHtml(it, { i, actions: act(it) })).join('')}</div>`
        : `<div class="empty"><div class="big">📦</div>У тебя пока нет вещей в обмене</div>`}
    </section>
    <section class="group"><div class="group-h"><span class="chev">▼</span><b>🤝 Мои услуги</b><span class="pill">${services.length}</span></div>
      ${services.length ? `<div class="grid">${services.map((it, i) => cardHtml(it, { i, actions: act(it) })).join('')}</div>`
        : `<div class="empty"><div class="big">🤝</div>Умеешь что-то полезное? Расскажи соседям!</div>`}
    </section>
  </div>`;
  $('#newThing').addEventListener('click', () => openNew('thing'));
  $('#newService').addEventListener('click', () => openNew('service'));
  $$('.group-h').forEach(h => h.addEventListener('click', () => h.parentElement.classList.toggle('closed')));
  bindCards($('#view'));
}

function pageLoans() {
  const took = items.filter(i => i.status === 'busy' && i.borrower === ME.email).sort((a, b) => a.to.localeCompare(b.to));
  const lent = items.filter(i => i.status === 'busy' && i.owner === ME.email).sort((a, b) => a.to.localeCompare(b.to));
  const rem = getReminders();
  const notifBtn = ('Notification' in window && Notification.permission === 'default')
    ? `<button class="btn" id="notifBtn">🔔 Включить уведомления в браузере</button>` : '';

  $('#view').innerHTML = `
  <div class="page">
    <div class="toprow">
      <h1 style="margin:0">Мои займы</h1>
      <div class="right-tools">${notifBtn}<span class="pill">Взял: ${took.length} · одолжил: ${lent.length}</span></div>
    </div>
    ${rem.map(r => `<div class="alert ${r.lvl}"><span class="ai">${r.lvl === 'red' ? '⚠️' : '⏰'}</span><div class="grow"><b>${esc(r.text)}</b><div class="meta" style="color:inherit;opacity:.8">${esc(r.sub)}</div></div></div>`).join('')}
    <section class="group"><div class="group-h"><span class="chev">▼</span><b>📥 Я взял на время</b><span class="tag blue">Нужно вернуть</span><span class="pill">${took.length}</span></div>
      ${took.length ? `<div class="grid">${took.map((it, i) => cardHtml(it, { i, loan: true, actions: `<button class="btn sm success" data-act="ret">✓ Я вернул</button>` })).join('')}</div>`
        : `<div class="empty"><div class="big">🙌</div>Ты ничего не должен соседям. <a href="#catalog">Найти вещь в каталоге</a></div>`}
    </section>
    <section class="group"><div class="group-h"><span class="chev">▼</span><b>📤 У меня взяли</b><span class="pill">${lent.length}</span></div>
      ${lent.length ? `<div class="grid">${lent.map((it, i) => cardHtml(it, { i, loan: true, actions: `<button class="btn sm" data-act="remind">🔔 Напомнить</button><button class="btn sm success" data-act="ret">✓ Мне вернули</button>` })).join('')}</div>`
        : `<div class="empty"><div class="big">📭</div>Сейчас никто не пользуется твоими вещами</div>`}
    </section>
  </div>`;
  $('#notifBtn')?.addEventListener('click', async () => {
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? '✅' : '🔕', p === 'granted' ? 'Уведомления включены' : 'Уведомления не разрешены');
    pageLoans();
  });
  $$('.group-h').forEach(h => h.addEventListener('click', () => h.parentElement.classList.toggle('closed')));
  bindCards($('#view'));
}

function pageAbout() {
  $('#view').innerHTML = `
  <div class="page">
    <div class="about-hero">
      <h1>Обмен вещами и услугами между студентами общежития</h1>
      <p>Многие вещи нужны пару раз в год — дрель, стремянка, инструменты, — и соседям приходится покупать такие же.
      А кто-то умеет чинить ноутбуки или объяснять матан, но об этом никто не знает. Найти нужное через общие чаты сложно.
      «Соседи» собирают всё в одном месте: бери вещи на время, выкладывай свои, предлагай помощь — а сервис напомнит, когда пора вернуть.</p>
    </div>
    <h2 class="sec">Как это работает</h2>
    <div class="steps">
      <div class="step"><div class="n">1</div><b>Найди</b><p>Ищи вещь или услугу в каталоге с фильтром по корпусу и категории.</p></div>
      <div class="step"><div class="n">2</div><b>Договорись</b><p>Выбери срок возврата и напиши соседу — контакты в карточке.</p></div>
      <div class="step"><div class="n">3</div><b>Пользуйся</b><p>Срок и прогресс займа видны в разделе «Мои займы».</p></div>
      <div class="step"><div class="n">4</div><b>Верни вовремя</b><p>Сервис напомнит за день до срока и сообщит владельцу о просрочке.</p></div>
    </div>
    <h2 class="sec">Правила обмена</h2>
    <ul class="rules">
      <li>Возвращай вещи в том же состоянии и в срок.</li>
      <li>Если сломал — честно скажи владельцу и договоритесь о ремонте.</li>
      <li>Запрещены объявления о продаже алкоголя, опасных и запрещённых предметов.</li>
      <li>Услуги между соседами — на добровольной основе.</li>
    </ul>
    <h2 class="sec">Поддержка</h2>
    <p class="meta" style="font-size:15px">Вопросы и предложения — студсовету общежития или автору проекта.</p>
  </div>`;
}

/* ---------- модалки ---------- */
function openModal(html) {
  $('#modal').innerHTML = html;
  $('#modalBg').hidden = false;
  document.body.style.overflow = 'hidden';
  $('#modal .m-close')?.addEventListener('click', closeModal);
}
function closeModal() { $('#modalBg').hidden = true; document.body.style.overflow = ''; }
$('#modalBg').addEventListener('click', e => { if (e.target.id === 'modalBg') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function openItem(id) {
  const it = items.find(x => x.id === id);
  if (!it) return;
  const mine = it.owner === ME.email, iBorrow = it.borrower === ME.email && it.status === 'busy';
  let action = '';
  if (it.type === 'service' && !mine) {
    action = `
      <form class="form" id="actForm">
        <label><span>Что нужно?</span><textarea class="ctl" name="msg" placeholder="Например: не включается ноутбук после обновления">Привет! Нужна помощь: </textarea></label>
        <div class="m-actions"><button type="button" class="btn m-cancel">Отмена</button><button class="btn primary">Откликнуться</button></div>
      </form>`;
  } else if (it.type === 'thing' && !mine && it.status === 'free') {
    action = `
      <form class="form" id="actForm">
        <label><span>На сколько берёшь?</span>
          <div class="quick">${[1, 2, 3, 7, 14].map(d => `<button type="button" data-d="${d}" class="${d === 3 ? 'on' : ''}">${d} ${plural(d, 'день', 'дня', 'дней')}</button>`).join('')}</div></label>
        <label><span>Верну до</span><input class="ctl" type="date" name="to" value="${iso(addDays(3))}" min="${iso(addDays(1))}" max="${iso(addDays(30))}" required></label>
        <p class="meta">⏰ Напомним за день до срока и в день возврата.</p>
        <div class="m-actions"><button type="button" class="btn m-cancel">Отмена</button><button class="btn primary">Взять на время</button></div>
      </form>`;
  } else if (iBorrow) {
    const p = loanProgress(it);
    action = `<p><span class="badge ${p.bcls}">${p.label}</span> &nbsp;Вернуть до <b>${fmtDate(it.to)}</b></p>
      <div class="m-actions"><button class="btn success" id="retBtn">✓ Я вернул</button></div>`;
  } else if (it.status === 'busy') {
    action = `<p class="meta">Сейчас у: <b>${esc(it.borrowerName)}</b> до ${fmtDate(it.to)}.${mine ? '' : ' Загляни позже или поищи похожее.'}</p>
      ${mine ? `<div class="m-actions"><button class="btn" id="remBtn">🔔 Напомнить</button><button class="btn success" id="retBtn">✓ Мне вернули</button></div>` : ''}`;
  } else if (mine) {
    action = `<p class="meta">Это твоё объявление. Его видят все жители общежития.</p>
      <div class="m-actions"><button class="btn danger" id="delBtn">Удалить объявление</button></div>`;
  }

  openModal(`
    <div class="m-cover" style="background-image:${patternBg(it.id + it.title)}">
      <span class="em">${esc(it.emoji || CAT_EMOJI[it.cat])}</span>
      <button class="m-close" aria-label="Закрыть">✕</button>
    </div>
    <div class="m-body">
      <div class="meta">${esc(it.cat)} · ${it.type === 'service' ? 'услуга' : 'вещь'}</div>
      <h3>${esc(it.title)}</h3>
      <div class="foot" style="padding-top:4px">${statusHtml(it)}<span>· ${it.uses} ${it.type === 'service' ? plural(it.uses, 'раз помог(ла)', 'раза помог(ла)', 'раз помог(ла)') : plural(it.uses, 'раз брали', 'раза брали', 'раз брали')}</span></div>
      <p class="desc">${esc(it.desc)}</p>
      <div class="owner">
        <span class="avatar">${initials(it.ownerName)}</span>
        <div style="flex:1"><b>${mine ? 'Ты' : esc(it.ownerName)}</b><small>Корпус ${esc(it.bld)}, комната ${esc(it.room)}${it.tg ? ' · ' + esc(it.tg) : ''}</small></div>
      </div>
      ${action}
    </div>`);

  $('.m-cancel')?.addEventListener('click', closeModal);
  $('#retBtn')?.addEventListener('click', () => { returnItem(id); closeModal(); });
  $('#remBtn')?.addEventListener('click', () => remindBorrower(id));
  $('#delBtn')?.addEventListener('click', () => { closeModal(); deleteItem(id); });
  const f = $('#actForm');
  if (!f) return;
  $$('.quick button', f).forEach(b => b.addEventListener('click', () => {
    $$('.quick button', f).forEach(x => x.classList.remove('on'));
    b.classList.add('on'); f.to.value = iso(addDays(+b.dataset.d));
  }));
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (it.type === 'service') {
      it.uses++; persist(); closeModal();
      toast('📨', 'Заявка отправлена', ` ${it.ownerName.split(' ')[0]} получит сообщение и свяжется с тобой (${it.tg}).`);
    } else {
      const to = f.to.value;
      if (!to || daysUntil(to) < 1) { toast('⚠️', 'Выбери дату возврата не раньше завтра'); return; }
      Object.assign(it, { status: 'busy', borrower: ME.email, borrowerName: ME.name, from: iso(today()), to });
      it.uses++; persist(); closeModal(); route();
      toast('🎉', 'Вещь твоя до ' + fmtDate(to), ` Забрать: ${it.ownerName.split(' ')[0]}, корп. ${it.bld}, комн. ${it.room}. Напомним о возврате!`);
    }
  });
}

function openNew(type) {
  const cats = CATEGORIES[type];
  const emojis = type === 'thing'
    ? ['🔧', '🪜', '🔌', '🍳', '🧹', '👔', '⚽', '🚲', '⛺', '📚', '🧮', '🎲', '🎸', '📦']
    : ['💻', '🎓', '🐍', '✂️', '🇬🇧', '📷', '🧑‍🍳', '📦', '🎨', '✨'];
  openModal(`
    <div class="m-body">
      <div class="toprow" style="margin-bottom:10px"><h3 style="margin:0">${type === 'thing' ? 'Выложить вещь' : 'Предложить услугу'}</h3><button class="btn sm m-x">✕</button></div>
      <form class="form" id="newForm">
        <div class="seg" style="width:max-content">
          <button type="button" data-t="thing" class="${type === 'thing' ? 'on' : ''}">Вещь</button>
          <button type="button" data-t="service" class="${type === 'service' ? 'on' : ''}">Услуга</button>
        </div>
        <label><span>Название</span><input class="ctl" name="title" maxlength="70" required placeholder="${type === 'thing' ? 'Например: Паяльник 60 Вт' : 'Например: Помогу с английским'}"></label>
        <div class="row2">
          <label><span>Категория</span><select class="ctl" name="cat">${cats.map(c => `<option>${c}</option>`).join('')}</select></label>
          <label><span>Контакт (Telegram)</span><input class="ctl" name="tg" value="${esc(ME.tg || '')}" placeholder="@username"></label>
        </div>
        <label><span>Описание</span><textarea class="ctl" name="desc" maxlength="400" placeholder="Состояние, комплектация, условия"></textarea></label>
        <label><span>Иконка</span><div class="emoji-pick">${emojis.map((e, i) => `<button type="button" class="${i === 0 ? 'on' : ''}">${e}</button>`).join('')}</div></label>
        <div class="m-actions"><button type="button" class="btn m-cancel">Отмена</button><button class="btn primary">Опубликовать</button></div>
      </form>
    </div>`);
  const f = $('#newForm');
  let emoji = emojis[0];
  $('.m-x').addEventListener('click', closeModal);
  $('.m-cancel').addEventListener('click', closeModal);
  $$('[data-t]', f).forEach(b => b.addEventListener('click', () => openNew(b.dataset.t)));
  $$('.emoji-pick button', f).forEach(b => b.addEventListener('click', () => {
    $$('.emoji-pick button', f).forEach(x => x.classList.remove('on'));
    b.classList.add('on'); emoji = b.textContent;
  }));
  f.elements.title.focus();
  f.addEventListener('submit', e => {
    e.preventDefault();
    const title = f.elements.title.value.trim();
    if (title.length < 3) { f.elements.title.focus(); toast('✏️', 'Название слишком короткое'); return; }
    const tg = f.tg.value.trim();
    if (tg && tg !== ME.tg) {
      const users = getUsers(), u = users.find(x => x.email === ME.email);
      if (u) { u.tg = tg; ME.tg = tg; saveUsers(users); }
    }
    items.unshift({
      id: 'u' + Date.now(), type, title, cat: f.cat.value, emoji,
      desc: f.desc.value.trim() || 'Без описания',
      owner: ME.email, ownerName: ME.name, bld: ME.bld, room: ME.room, tg,
      status: 'free', uses: 0, created: iso(today()) + 'T' + Date.now(), rating: null, reviews: 0
    });
    persist(); closeModal();
    toast('✅', 'Объявление опубликовано', ' Соседи уже могут его увидеть');
    location.hash === '#my' ? route() : (location.hash = 'my');
  });
}

/* ---------- действия ---------- */
function returnItem(id) {
  const it = items.find(x => x.id === id);
  const wasMine = it.owner === ME.email;
  Object.assign(it, { status: 'free', borrower: null, borrowerName: null, from: null, to: null });
  persist(); route();
  toast('✅', wasMine ? 'Вещь снова у тебя' : 'Спасибо, что вернул!', wasMine ? ` «${it.title}» снова доступна соседям` : ` ${it.ownerName.split(' ')[0]} получит уведомление`);
}
function remindBorrower(id) {
  const it = items.find(x => x.id === id);
  toast('🔔', 'Напоминание отправлено', ` ${it.borrowerName} получит сообщение о возврате «${it.title}»`);
}
function deleteItem(id) {
  const it = items.find(x => x.id === id);
  if (!confirm(`Удалить «${it.title}»?`)) return;
  items = items.filter(x => x.id !== id);
  persist(); route();
  toast('🗑', 'Объявление удалено');
}

/* ---------- роутер ---------- */
const PAGES = { catalog: pageCatalog, my: pageMy, loans: pageLoans, about: pageAbout };
function route() {
  const r = location.hash.slice(1) || 'catalog';
  (PAGES[r] || pageCatalog)();
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === r));
  $('#nav').classList.remove('open');
  $$('.dropdown').forEach(d => d.hidden = true);
  closeModal();
}
window.addEventListener('hashchange', () => { route(); scrollTo({ top: 0 }); });

route();
updateBell();
