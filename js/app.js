/* ===== Приложение «Соседи» ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function startApp() {
const ME = currentUser();

let items = getItems();
const F = { type: 'thing', cat: '', bld: '', status: '', q: '', sort: 'new' }; // фильтры каталога
const closedGroups = new Set();

/* ---------- вход-анимация и приветствие ---------- */
if (DB.get('justLoggedIn', false)) {
  DB.del('justLoggedIn');
  setTimeout(() => toast('👋', `${t('hello')}, ${ME.name.split(' ')[0]}!`, ' ' + t('welcome') + ' · ' + dormName(ME.bld)), 700);
  setTimeout(() => remindersToast(), 2200);
} else {
  $('#intro').remove();
}

/* ---------- шапка ---------- */
$('#avatar').textContent = initials(ME.name);
$('#umName').textContent = ME.name;
const where = () => dormName(ME.bld) + (ME.room ? `, ${t('room')} ${ME.room}` : '');
$('#umRoom').textContent = where();

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
$('#logoutBtn').addEventListener('click', () => { logout(); location.hash = ''; location.reload(); });
$('#resetBtn').addEventListener('click', () => {
  DB.del('items'); items = getItems(); route(); updateBell();
  toast('↺', 'Демо-данные восстановлены');
});
/* подвал: список общежитий */
function renderFooterDorms() {
  $('#footDorms').innerHTML = DORMS.map(d => `<a href="#catalog" data-bld="${d.id}">${esc(dormName(d.id).replace(', корпуса 5 и 6', '').replace(', buildings 5 & 6', ''))}</a>`).join('');
  $$('#footDorms a').forEach(a => a.addEventListener('click', () => {
    F.bld = a.dataset.bld; F.type = 'all';
    setTimeout(() => { route(); scrollTo({ top: 0, behavior: 'smooth' }); });
  }));
}

/* смена общежития */
function openDormPicker() {
  $$('.dropdown').forEach(d => d.hidden = true);
  let chosen = ME.bld;
  openModal(`
    <div class="m-body">
      <div class="toprow" style="margin-bottom:6px"><h3 style="margin:0">${t('changeDorm')}</h3><button class="btn sm m-x">✕</button></div>
      <p class="meta" style="margin-bottom:14px">${t('dormSub')}</p>
      <div class="dorm-pick" id="dormPick">${dormOptionsHtml(chosen)}</div>
      <div class="m-actions" style="margin-top:16px"><button class="btn primary" id="dormSave">${t('save')}</button></div>
    </div>`);
  $('.m-x').addEventListener('click', closeModal);
  bindDormOptions($('#dormPick'), id => { chosen = id; });
  $('#dormSave').addEventListener('click', () => {
    const users = getUsers(), u = users.find(x => x.email === ME.email);
    if (u) { u.bld = chosen; saveUsers(users); }
    ME.bld = chosen;
    items.forEach(it => { if (it.owner === ME.email) it.bld = chosen; });
    persist(); closeModal();
    $('#umRoom').textContent = where();
    route();
    toast('🏠', t('dormSaved'), ' ' + dormName(chosen));
  });
}
$('#dormBtn').addEventListener('click', openDormPicker);
$('#view').addEventListener('click', e => {
  if (e.target.id === 'chDorm') { e.preventDefault(); openDormPicker(); }
});

/* язык */
$('#langToggle').addEventListener('click', () => {
  setLang(LANG === 'ru' ? 'en' : 'ru');
  $$('.dropdown').forEach(d => d.hidden = true);
});
document.addEventListener('langchange', () => {
  $('#umRoom').textContent = where();
  renderFooterDorms();
  route();
});
applyI18n();
renderFooterDorms();

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
      if (d < 0) list.push({ lvl: 'red', it, text: `Верни «${it.title}» — просрочено на ${-d} ${plural(-d, 'день', 'дня', 'дней')}`, sub: `Владелец: ${it.ownerName}, ${dormName(it.bld)}, комн. ${it.room}` });
      else if (d <= 1) list.push({ lvl: 'yellow', it, text: `Верни «${it.title}» ${d === 0 ? 'сегодня' : 'завтра'}`, sub: `Владелец: ${it.ownerName}, ${dormName(it.bld)}, комн. ${it.room}` });
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
  if (it.status === 'free') return `<span class="badge">${t('available')}</span><span>${t('canTake')}</span>`;
  const d = daysUntil(it.to);
  const cls = d < 0 ? 'red' : d <= 1 ? 'orange' : 'blue';
  const txt = d < 0 ? t('overdue') : `${t('until')} ${fmtDate(it.to)}`;
  return `<span class="badge ${cls}">${t('taken')}</span><span>${txt}</span>`;
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
      <div class="meta">${mine ? t('mine') : esc(it.ownerName)}${ratingOf(it.owner) ? ` <span class="stars-mini">★ ${ratingOf(it.owner).avg.toFixed(1)}</span>` : ''} / ${esc(dormName(it.bld))}${it.room ? ' · ' + t('room') + ' ' + esc(it.room) : ''}</div>
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
    ({ ret: returnItem, remind: remindBorrower, del: deleteItem, take: openItem, ics: downloadIcs })[b.dataset.act](id);
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
    <h1>${t('catalog')}</h1>${ME.bld ? `<p class="meta" style="margin:-6px 0 14px">🏠 ${t('myDorm')}: <b>${esc(dormName(ME.bld))}</b> · <a href="#" id="chDorm">${t('changeDorm').toLowerCase()}</a></p>` : ''}
    <div class="toprow">
      <div class="seg">
        <button data-type="thing" class="${F.type === 'thing' ? 'on' : ''}">${t('things')}</button>
        <button data-type="service" class="${F.type === 'service' ? 'on' : ''}">${t('services')}</button>
        <button data-type="all" class="${F.type === 'all' ? 'on' : ''}">${t('allAds')}</button>
      </div>
      <div class="right-tools">
        <span class="pill">${t('ads')}: ${list.length}</span>
        <button class="btn" id="newBtn">${t('post')}</button>
      </div>
    </div>

    <div class="filters">
      <label><span>${t('dorm')}</span>
        <select class="ctl" id="fBld"><option value="">${t('allDorms')}</option>${DORMS.map(d => `<option value="${d.id}" ${F.bld === d.id ? 'selected' : ''}>${esc(dormName(d.id))}</option>`).join('')}</select></label>
      <label><span>${t('category')}</span>
        <select class="ctl" id="fCat"><option value="">${t('allCats')}</option>${cats.map(c => `<option ${F.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label><span>${t('status')}</span>
        <select class="ctl" id="fStatus">
          <option value="">${t('any')}</option>
          <option value="free" ${F.status === 'free' ? 'selected' : ''}>${t('sFree')}</option>
          <option value="busy" ${F.status === 'busy' ? 'selected' : ''}>${t('sBusy')}</option>
        </select></label>
      <label class="f-search"><span>${t('search')}</span>
        <input class="ctl" id="fQ" placeholder="${t('searchPh')}" value="${esc(F.q)}"></label>
      <label><span>${t('sort')}</span>
        <select class="ctl" id="fSort">
          <option value="new" ${F.sort === 'new' ? 'selected' : ''}>${t('sortNew')}</option>
          <option value="popular" ${F.sort === 'popular' ? 'selected' : ''}>${t('sortPop')}</option>
          <option value="free" ${F.sort === 'free' ? 'selected' : ''}>${t('sortFree')}</option>
          <option value="name" ${F.sort === 'name' ? 'selected' : ''}>${t('sortName')}</option>
        </select></label>
      <label><span>${t('view')}</span>
        <select class="ctl" id="fView"><option>${t('compact')}</option></select></label>
      <div class="filter-btns">
        <button class="btn primary" id="fApply">${t('apply')}</button>
        <button class="btn" id="fReset">${t('reset')}</button>
      </div>
    </div>

    ${groups.length ? groups.map(g => `
      <section class="group ${closedGroups.has(g.c) ? 'closed' : ''}" data-g="${esc(g.c)}">
        <div class="group-h">
          <span class="chev">▼</span><b>${CAT_EMOJI[g.c]} ${esc(g.c)}</b>
          ${g.list.some(i => i.owner === ME.email) ? '<span class="tag">Есть моё</span>' : ''}
          <span class="pill">${t('ads')}: ${g.list.length} · ${t('freeOf')}: ${g.list.filter(i => i.type === 'service' || i.status === 'free').length}</span>
        </div>
        <div class="grid">${g.list.map((it, i) => cardHtml(it, { i })).join('')}</div>
      </section>`).join('')
    : items.length === 0
      ? `<div class="group"><div class="empty"><div class="big">📭</div><b style="font-size:17px;color:var(--text)">${t('emptyTitle')}</b><br>${t('emptyText')}<br><br><button class="btn primary" id="emptyNewBtn">${t('post')}</button></div></div>`
      : `<div class="group"><div class="empty"><div class="big">🔍</div>${t('noMatch')}<br><a href="#" id="emptyNew">${t('postOwn')}</a></div></div>`}
    <p class="meta" style="margin-top:8px">${t('nowFree')}: ${freeCount} / ${list.length}</p>
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
  $('#emptyNewBtn')?.addEventListener('click', () => openNew(F.type === 'service' ? 'service' : 'thing'));
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
      <h1 style="margin:0">${t('myAds')}</h1>
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
      <h1 style="margin:0">${t('myLoans')}</h1>
      <div class="right-tools">${notifBtn}<span class="pill">Взял: ${took.length} · одолжил: ${lent.length}</span></div>
    </div>
    ${rem.map(r => `<div class="alert ${r.lvl}"><span class="ai">${r.lvl === 'red' ? '⚠️' : '⏰'}</span><div class="grow"><b>${esc(r.text)}</b><div class="meta" style="color:inherit;opacity:.8">${esc(r.sub)}</div></div></div>`).join('')}
    <section class="group"><div class="group-h"><span class="chev">▼</span><b>📥 Я взял на время</b><span class="tag blue">Нужно вернуть</span><span class="pill">${took.length}</span></div>
      ${took.length ? `<div class="grid">${took.map((it, i) => cardHtml(it, { i, loan: true, actions: `<button class="btn sm" data-act="ics" title="Добавить напоминание в календарь телефона">📅 В календарь</button><button class="btn sm success" data-act="ret">✓ Я вернул</button>` })).join('')}</div>`
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
      <h1>${t('aboutTitle')}</h1>
      <p>Многие вещи нужны пару раз в год — дрель, стремянка, инструменты, — и соседям приходится покупать такие же.
      А кто-то умеет чинить ноутбуки или объяснять матан, но об этом никто не знает. Найти нужное через общие чаты сложно.
      «Соседи» собирают всё в одном месте: бери вещи на время, выкладывай свои, предлагай помощь — а сервис напомнит, когда пора вернуть.</p>
    </div>
    <h2 class="sec">Как это работает</h2>
    <div class="steps">
      <div class="step"><div class="n">1</div><b>Найди</b><p>Ищи вещь или услугу в каталоге с фильтром по общежитию и категории.</p></div>
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
      <div class="m-actions"><button class="btn" id="icsBtn">📅 В календарь</button><button class="btn success" id="retBtn">✓ Я вернул</button></div>`;
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
        <div style="flex:1"><b>${mine ? 'Ты' : esc(it.ownerName)}</b><small>${esc(dormName(it.bld))}${it.room ? ', комната ' + esc(it.room) : ''}${it.tg ? ' · ' + esc(it.tg) : ''}</small></div>
      </div>
      ${action}
    </div>`);

  $('.m-cancel')?.addEventListener('click', closeModal);
  $('#retBtn')?.addEventListener('click', () => { closeModal(); returnItem(id); });
  $('#icsBtn')?.addEventListener('click', () => downloadIcs(id));
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
      it.uses++; logEvent({ type: 'service', who: ME.email, owner: it.owner, item: it.title, price: priceOf(it) });
      persist(); closeModal(); checkAchievements();
      toast('📨', 'Заявка отправлена', ` ${it.ownerName.split(' ')[0]} получит сообщение и свяжется с тобой (${it.tg}).`);
    } else {
      const to = f.to.value;
      if (!to || daysUntil(to) < 1) { toast('⚠️', 'Выбери дату возврата не раньше завтра'); return; }
      Object.assign(it, { status: 'busy', borrower: ME.email, borrowerName: ME.name, from: iso(today()), to });
      it.uses++; logEvent({ type: 'borrow', who: ME.email, owner: it.owner, item: it.title, price: priceOf(it) });
      persist(); closeModal(); route(); confetti();
      setTimeout(checkAchievements, 900);
      toast('🎉', 'Вещь твоя до ' + fmtDate(to), ` Забрать: ${it.ownerName.split(' ')[0]}, ${dormName(it.bld)}${it.room ? ', комн. ' + it.room : ''}. Напомним о возврате!`);
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
        <label><span>${type === 'thing' ? 'Сколько стоит новая, ₽' : 'Сколько стоила бы у мастера, ₽'} <small class="meta">(для подсчёта экономии)</small></span>
          <input class="ctl" name="price" type="number" min="0" max="500000" step="100" placeholder="${DEFAULT_PRICE[cats[0]]}"></label>
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
      price: Math.max(0, Math.round(+f.price.value || DEFAULT_PRICE[f.cat.value] || 1000)),
      desc: f.desc.value.trim() || 'Без описания',
      owner: ME.email, ownerName: ME.name, bld: ME.bld, room: ME.room, tg,
      status: 'free', uses: 0, created: iso(today()) + 'T' + Date.now(), rating: null, reviews: 0
    });
    logEvent({ type: 'post', who: ME.email, item: title });
    persist(); closeModal();
    toast('✅', 'Объявление опубликовано', ' Соседи уже могут его увидеть');
    checkAchievements();
    location.hash === '#my' ? route() : (location.hash = 'my');
  });
}

/* ---------- действия ---------- */
function returnItem(id) {
  const it = items.find(x => x.id === id);
  const wasMine = it.owner === ME.email;
  const other = wasMine ? { email: it.borrower, name: it.borrowerName } : { email: it.owner, name: it.ownerName };
  const onTime = it.to ? daysUntil(it.to) >= 0 : true;
  logEvent({ type: 'return', who: wasMine ? it.borrower : ME.email, owner: it.owner, item: it.title, onTime });
  Object.assign(it, { status: 'free', borrower: null, borrowerName: null, from: null, to: null });
  persist(); route();
  setTimeout(() => askRating(other, it.title), 500);
  checkAchievements();
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


/* ================= Дополнительно: статистика, достижения, оценки, календарь, тема ================= */
const DEFAULT_PRICE = {
  'Инструменты': 4500, 'Бытовая техника': 3500, 'Кухня': 3000, 'Спорт и отдых': 6000, 'Учёба': 1500, 'Игры': 2000,
  'Ремонт техники': 1500, 'Помощь с учёбой': 1200, 'Красота': 800, 'Другое': 700
};
function priceOf(it) { return it.price || DEFAULT_PRICE[it.cat] || 1000; }

function getLog() { return DB.get('log', []); }
function logEvent(e) { const l = getLog(); l.push(Object.assign({ at: Date.now() }, e)); DB.set('log', l); }

function ratingOf(email) {
  const r = getLog().filter(e => e.type === 'rate' && e.to === email);
  if (!r.length) return null;
  return { avg: r.reduce((s, e) => s + e.stars, 0) / r.length, n: r.length };
}

function statsOf(email) {
  const log = getLog();
  const borrowed = log.filter(e => e.type === 'borrow' && e.who === email);
  const services = log.filter(e => e.type === 'service' && e.who === email);
  return {
    borrowed: borrowed.length,
    lent: log.filter(e => e.type === 'borrow' && e.owner === email).length,
    helped: log.filter(e => e.type === 'service' && e.owner === email).length,
    posted: log.filter(e => e.type === 'post' && e.who === email).length,
    returnedOnTime: log.filter(e => e.type === 'return' && e.who === email && e.onTime).length,
    saved: [...borrowed, ...services].reduce((s, e) => s + (e.price || 0), 0),
    rating: ratingOf(email)
  };
}

const ACHIEVEMENTS = [
  { id: 'first_post', icon: '📦', name: 'Первый шаг', desc: 'Выложить первое объявление', ok: s => s.posted >= 1 },
  { id: 'first_borrow', icon: '🤝', name: 'Знакомство с соседом', desc: 'Взять вещь или услугу у соседа', ok: s => s.borrowed + (s.saved && !s.borrowed ? 1 : 0) >= 1 },
  { id: 'generous', icon: '🎁', name: 'Щедрый сосед', desc: 'Одолжить вещи 3 раза', ok: s => s.lent >= 3 },
  { id: 'reliable', icon: '⏰', name: 'Надёжный', desc: 'Вернуть 3 вещи вовремя', ok: s => s.returnedOnTime >= 3 },
  { id: 'saver', icon: '💰', name: 'Экономист', desc: 'Сэкономить 10 000 ₽', ok: s => s.saved >= 10000 },
  { id: 'star', icon: '⭐', name: 'Звезда общежития', desc: 'Средняя оценка от 4.5 (мин. 3 оценки)', ok: s => s.rating && s.rating.n >= 3 && s.rating.avg >= 4.5 }
];

function checkAchievements() {
  const s = statsOf(ME.email), key = 'ach_' + ME.email;
  const have = DB.get(key, []);
  const fresh = ACHIEVEMENTS.filter(a => a.ok(s) && !have.includes(a.id));
  if (!fresh.length) return;
  DB.set(key, [...have, ...fresh.map(a => a.id)]);
  fresh.forEach((a, i) => setTimeout(() => { toast('🏆', 'Новое достижение: ' + a.name, ' ' + a.desc); confetti(); }, 600 + i * 900));
}

/* конфетти */
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti'; c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const colors = ['#1438f0', '#36e2fa', '#ffd25e', '#18a957', '#ff8fab', '#8775e9'];
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight / 3,
    vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 4,
    s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .3,
    c: colors[Math.floor(Math.random() * colors.length)]
  }));
  let frame = 0;
  (function tick() {
    ctx.clearRect(0, 0, c.width, c.height);
    parts.forEach(p => {
      p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    });
    if (++frame < 150) requestAnimationFrame(tick); else c.remove();
  })();
}

/* оценка после возврата */
function askRating(other, title) {
  if (!other.email || other.email === ME.email) return;
  let stars = 0;
  openModal(`
    <div class="m-body" style="text-align:center">
      <div style="font-size:44px">🤝</div>
      <h3>Как прошёл обмен?</h3>
      <p class="meta" style="margin:4px 0 14px">Оцени соседа: <b>${esc(other.name || '')}</b> · «${esc(title)}»</p>
      <div class="rate" id="rate">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n}">★</button>`).join('')}</div>
      <p class="meta" id="rateTxt" style="min-height:20px;margin-top:6px"></p>
      <div class="m-actions" style="justify-content:center"><button class="btn m-cancel">Пропустить</button><button class="btn primary" id="rateSend" disabled>Оценить</button></div>
    </div>`);
  const words = ['', 'Плохо 😕', 'Так себе', 'Нормально', 'Хорошо 🙂', 'Отлично! 🔥'];
  const paint = n => $$('#rate button').forEach(b => b.classList.toggle('on', +b.dataset.n <= n));
  $$('#rate button').forEach(b => {
    b.addEventListener('mouseenter', () => paint(+b.dataset.n));
    b.addEventListener('mouseleave', () => paint(stars));
    b.addEventListener('click', () => { stars = +b.dataset.n; paint(stars); $('#rateTxt').textContent = words[stars]; $('#rateSend').disabled = false; });
  });
  $('.m-cancel').addEventListener('click', closeModal);
  $('#rateSend').addEventListener('click', () => {
    logEvent({ type: 'rate', from: ME.email, to: other.email, stars, item: title });
    closeModal(); route();
    toast('⭐', 'Спасибо за оценку!', ' Так соседи понимают, кому можно доверять');
    if (stars === 5) confetti();
  });
}

/* напоминание в календарь (.ics — открывается в Google/Apple/Outlook календаре) */
function downloadIcs(id) {
  const it = items.find(x => x.id === id);
  if (!it || !it.to) return;
  const d = it.to.replace(/-/g, ''), stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sosedi//RU', 'BEGIN:VEVENT',
    `UID:${it.id}-${d}@sosedi`, `DTSTAMP:${stamp}`,
    `DTSTART:${d}T100000`, `DTEND:${d}T103000`,
    `SUMMARY:Вернуть «${it.title}»`,
    `DESCRIPTION:Владелец: ${it.ownerName}\\, ${dormName(it.bld)}${it.room ? '\\, комн. ' + it.room : ''}. Сервис «Соседи».`,
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Завтра вернуть вещь соседу', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'vernut-' + it.id + '.ics';
  document.body.appendChild(a); a.click(); a.remove();
  toast('📅', 'Напоминание скачано', ' Открой файл — событие добавится в календарь с оповещением за день');
}

/* страница профиля */
function pageProfile() {
  const s = statsOf(ME.email), have = DB.get('ach_' + ME.email, []);
  const log = getLog();
  const byDorm = DORMS.map(d => {
    const members = new Set(getUsers().filter(u => u.bld === d.id).map(u => u.email));
    const saved = log.filter(e => (e.type === 'borrow' || e.type === 'service') && members.has(e.who)).reduce((a, e) => a + (e.price || 0), 0);
    return { d, saved };
  });
  const maxSaved = Math.max(1, ...byDorm.map(x => x.saved));
  const stars = s.rating ? '★★★★★'.slice(0, Math.round(s.rating.avg)).padEnd(5, '☆') : '☆☆☆☆☆';
  $('#view').innerHTML = `
  <div class="page">
    <div class="profile-hero">
      <span class="avatar big">${initials(ME.name)}</span>
      <div>
        <h1 style="margin:0;color:#fff">${esc(ME.name)}</h1>
        <p>🏠 ${esc(dormName(ME.bld))}${ME.room ? ' · комн. ' + esc(ME.room) : ''}</p>
        <p class="hero-stars">${stars} <small>${s.rating ? s.rating.avg.toFixed(1) + ' · ' + s.rating.n + ' ' + plural(s.rating.n, 'оценка', 'оценки', 'оценок') : 'пока нет оценок'}</small></p>
      </div>
    </div>

    <div class="tiles">
      <div class="tile"><span>💰</span><b data-count="${s.saved}" data-suffix=" ₽">0 ₽</b><small>сэкономлено</small></div>
      <div class="tile"><span>📥</span><b data-count="${s.borrowed}">0</b><small>взял на время</small></div>
      <div class="tile"><span>📤</span><b data-count="${s.lent}">0</b><small>одолжил соседям</small></div>
      <div class="tile"><span>🤝</span><b data-count="${s.helped}">0</b><small>раз помог услугой</small></div>
    </div>

    <h2 class="sec">Достижения <small class="meta">${have.length} из ${ACHIEVEMENTS.length}</small></h2>
    <div class="achs">${ACHIEVEMENTS.map((a, i) => `
      <div class="ach ${have.includes(a.id) ? 'got' : ''}" style="animation-delay:${i * 50}ms">
        <span>${a.icon}</span><div><b>${a.name}</b><small>${a.desc}</small></div>${have.includes(a.id) ? '<em>✓</em>' : '<em class="lock">🔒</em>'}
      </div>`).join('')}</div>

    <h2 class="sec">Экономия по общежитиям</h2>
    <div class="group" style="padding:16px 18px">
      ${byDorm.some(x => x.saved) ? byDorm.sort((a, b) => b.saved - a.saved).map(x => `
        <div class="dbar ${x.d.id === ME.bld ? 'me' : ''}"><span>${esc(dormName(x.d.id))}</span>
          <div class="track"><i style="width:${Math.round(x.saved / maxSaved * 100)}%"></i></div><b>${x.saved.toLocaleString('ru-RU')} ₽</b></div>`).join('')
        : '<p class="meta">Пока нет обменов. Когда соседи начнут брать вещи друг у друга, здесь появится рейтинг общежитий 🏆</p>'}
    </div>
  </div>`;
  $$('#view [data-count]').forEach(el => {
    const target = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now();
    (function tick(tm) {
      const p = Math.min(1, (tm - t0) / 1200), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e).toLocaleString('ru-RU') + suf;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  });
  requestAnimationFrame(() => $$('.dbar i').forEach(i => { const w = i.style.width; i.style.width = '0'; requestAnimationFrame(() => i.style.width = w); }));
}

/* тёмная тема */
function applyTheme(th) {
  document.documentElement.dataset.theme = th;
  const b = $('#themeBtn');
  if (b) b.textContent = th === 'dark' ? '☀️' : '🌙';
}
applyTheme(DB.get('theme', 'light'));
$('#themeBtn').addEventListener('click', () => {
  const th = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  DB.set('theme', th); applyTheme(th);
});

/* ---------- роутер ---------- */
const PAGES = { catalog: pageCatalog, my: pageMy, loans: pageLoans, profile: pageProfile, about: pageAbout };
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
}
