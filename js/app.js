/* ===== Приложение «Соседи» ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function startApp() {
const ME = currentUser();

let items = getItems();
let filtersOpen = false;
const F = { type: 'all', cat: '', status: '', q: '', sort: 'new' }; // фильтры каталога (общежитие — всегда моё)
const closedGroups = new Set();

/* ---------- вход-анимация и приветствие ---------- */
$('#intro')?.remove();
if (DB.get('justLoggedIn', false)) {
  DB.del('justLoggedIn');
  setTimeout(() => remindersToast(), 400);
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
});
$('#burger').addEventListener('click', () => $('#nav').classList.toggle('open'));
$('#logoutBtn').addEventListener('click', () => { logout(); location.hash = ''; location.reload(); });
$('#resetBtn').addEventListener('click', () => {
  $$('.dropdown').forEach(d => d.hidden = true);
  if (!confirm('Удалить все объявления и обмены? Это действие нельзя отменить.')) return;
  items = []; persist(); route();
  toast('✓', 'Объявления удалены');
});
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
    toast('✓', t('dormSaved'), ' ' + dormName(chosen));
  });
}

/* язык */
function markLang() {
  $('#umLangCur').textContent = LANG === 'en' ? 'English' : 'Русский';
  $$('#umLangs button').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG));
}
markLang();
$('#langToggle').addEventListener('click', () => {
  const list = $('#umLangs');
  list.hidden = !list.hidden;
  $('#langToggle').classList.toggle('open', !list.hidden);
});
$$('#umLangs button').forEach(b => b.addEventListener('click', () => {
  $$('.dropdown').forEach(d => d.hidden = true);
  $('#umLangs').hidden = true; $('#langToggle').classList.remove('open');
  if (b.dataset.lang !== LANG) setLang(b.dataset.lang);
  markLang();
}));
$('#userBtn').addEventListener('click', () => { $('#umLangs').hidden = true; $('#langToggle').classList.remove('open'); });
document.addEventListener('langchange', () => {
  $('#umRoom').textContent = where();
  route();
});
applyI18n();

/* ---------- тосты ---------- */
function toast(icon, title, text = '') {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span style="font-size:20px">${icon}</span><div><b>${esc(title)}</b>${text ? esc(text) : ''}</div>`;
  const box = $('#toasts');
  if (matchMedia('(max-width: 600px)').matches) [...box.children].forEach(x => x.remove());
  else while (box.children.length >= 3) box.firstElementChild.remove();
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3500);
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
      if (d < 0) list.push({ lvl: 'red', it, text: `Срок возврата «${it.title}» истёк ${-d} ${plural(-d, 'день', 'дня', 'дней')} назад`, sub: `Владелец: ${it.ownerName}, ${dormName(it.bld)}, комн. ${it.room}` });
      else if (d <= 1) list.push({ lvl: 'yellow', it, text: `Необходимо вернуть «${it.title}» ${d === 0 ? 'сегодня' : 'завтра'}`, sub: `Владелец: ${it.ownerName}, ${dormName(it.bld)}, комн. ${it.room}` });
    } else if (it.owner === ME.email && d < 0) {
      list.push({ lvl: 'red', it, text: `«${it.title}» не возвращено: ${it.borrowerName}`, sub: `Срок истёк ${fmtDate(it.to)}` });
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
    : `<div class="empty-rem">Напоминаний нет</div>`);
  $$('#bellMenu .rem').forEach(r => r.addEventListener('click', () => location.hash = 'loans'));
}

function remindersToast() {
  const rem = getReminders();
  if (!rem.length) return;
  const r = rem[0];
  toast('!', r.text, rem.length > 1 ? ` Ещё напоминаний: ${rem.length - 1}.` : '');
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('Соседи: напоминание', { body: r.text, icon: 'assets/favicon.svg' }); } catch (e) {}
  }
}

/* ---------- карточка ---------- */
function statusHtml(it) {
  if (it.type === 'service') {
    return it.rating
      ? `<span class="badge yellow">★ ${it.rating.toFixed(1)}</span>`
      : `<span class="badge gray">новое</span>`;
  }
  if (it.status === 'free') return `<span class="badge">${t('available')}</span>`;
  return `<span class="badge blue">${t('taken')}</span>`;
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
    if (e.target.closest('.card-actions')) return;
    openItem(c.dataset.id);
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
    if (it.bld !== ME.bld) return false; // только моё общежитие
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
    <h1>${t('catalog')}</h1>${ME.bld ? `<p class="meta" style="margin:-6px 0 14px">${t('myDorm')}: <b>${esc(dormName(ME.bld))}</b></p>` : ''}
    <div class="toprow">
      <div class="seg">
        <button data-type="thing" class="${F.type === 'thing' ? 'on' : ''}">${t('things')}</button>
        <button data-type="service" class="${F.type === 'service' ? 'on' : ''}">${t('services')}</button>
        <button data-type="all" class="${F.type === 'all' ? 'on' : ''}">${t('allAds')}</button>
      </div>
      <div class="right-tools">
        <span class="pill">${t('ads')}: ${list.length}</span>
        <button class="btn f-toggle" id="fToggle">${LANG === 'en' ? 'Filters' : 'Фильтры'}${F.cat || F.status || F.sort !== 'new' ? ' •' : ''}</button>
        <button class="btn" id="newBtn">${t('post')}</button>
      </div>
    </div>

    <div class="filters ${filtersOpen ? 'open' : ''}">
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
      <label class="f-sort"><span>${t('sort')}</span>
        <select class="ctl" id="fSort">
          <option value="new" ${F.sort === 'new' ? 'selected' : ''}>${t('sortNew')}</option>
          <option value="popular" ${F.sort === 'popular' ? 'selected' : ''}>${t('sortPop')}</option>
          <option value="free" ${F.sort === 'free' ? 'selected' : ''}>${t('sortFree')}</option>
          <option value="name" ${F.sort === 'name' ? 'selected' : ''}>${t('sortName')}</option>
        </select></label>
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
    F.cat = $('#fCat').value; F.status = $('#fStatus').value;
    F.q = $('#fQ').value.trim(); F.sort = $('#fSort').value;
  };
  ['#fCat', '#fStatus', '#fSort'].forEach(s => $(s).addEventListener('change', () => { read(); pageCatalog(); }));
  let qt;
  $('#fQ').addEventListener('input', () => {
    clearTimeout(qt);
    qt = setTimeout(() => { read(); pageCatalog(); const q = $('#fQ'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 300);
  });
  $('#fApply').addEventListener('click', () => { read(); pageCatalog(); });
  $('#fReset').addEventListener('click', () => { Object.assign(F, { cat: '', status: '', q: '', sort: 'new' }); pageCatalog(); });
  $('#fToggle').addEventListener('click', () => { filtersOpen = !filtersOpen; $('.filters').classList.toggle('open', filtersOpen); });
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
  const act = it => (it.status === 'busy' ? `<button class="btn sm success" data-act="ret">✓ Подтвердить возврат</button>` : '') +
    `<button class="btn sm danger" data-act="del">Удалить</button>`;
  $('#view').innerHTML = `
  <div class="page">
    <div class="toprow">
      <h1 style="margin:0">${t('myAds')}</h1>
      <div class="right-tools">
        <span class="pill">Всего: ${mine.length}</span>
        <button class="btn primary" id="newThing">＋ Разместить вещь</button>
        <button class="btn" id="newService">＋ Предложить услугу</button>
      </div>
    </div>
    <section class="group"><div class="group-h"><span class="chev">▼</span><b>📦 Мои вещи</b><span class="pill">${things.length} · на руках у соседей: ${things.filter(t => t.status === 'busy').length}</span></div>
      ${things.length ? `<div class="grid">${things.map((it, i) => cardHtml(it, { i, actions: act(it) })).join('')}</div>`
        : `<div class="empty"><div class="big">📦</div>У вас пока нет размещённых вещей</div>`}
    </section>
    <section class="group"><div class="group-h"><span class="chev">▼</span><b>🤝 Мои услуги</b><span class="pill">${services.length}</span></div>
      ${services.length ? `<div class="grid">${services.map((it, i) => cardHtml(it, { i, actions: act(it) })).join('')}</div>`
        : `<div class="empty"><div class="big">🤝</div>Вы можете предложить соседям свою услугу</div>`}
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
      <div class="right-tools">${notifBtn}<span class="pill">Взято: ${took.length} · передано: ${lent.length}</span></div>
    </div>
    ${rem.map(r => `<div class="alert ${r.lvl}"><span class="ai">${r.lvl === 'red' ? '⚠️' : '⏰'}</span><div class="grow"><b>${esc(r.text)}</b><div class="meta" style="color:inherit;opacity:.8">${esc(r.sub)}</div></div></div>`).join('')}
    <section class="group"><div class="group-h"><span class="chev">▼</span><b>📥 Взято мной</b><span class="tag blue">Нужно вернуть</span><span class="pill">${took.length}</span></div>
      ${took.length ? `<div class="grid">${took.map((it, i) => cardHtml(it, { i, loan: true, actions: `<button class="btn sm" data-act="ics" title="Добавить напоминание в календарь телефона">📅 В календарь</button><button class="btn sm success" data-act="ret">✓ Отметить возврат</button>` })).join('')}</div>`
        : `<div class="empty"><div class="big">📭</div>Взятых вещей нет. <a href="#catalog">Перейти в каталог</a></div>`}
    </section>
    <section class="group"><div class="group-h"><span class="chev">▼</span><b>📤 Передано мной</b><span class="pill">${lent.length}</span></div>
      ${lent.length ? `<div class="grid">${lent.map((it, i) => cardHtml(it, { i, loan: true, actions: `<button class="btn sm" data-act="remind">🔔 Напомнить</button><button class="btn sm success" data-act="ret">✓ Подтвердить возврат</button>` })).join('')}</div>`
        : `<div class="empty"><div class="big">📭</div>Ваши вещи сейчас никому не переданы</div>`}
    </section>
  </div>`;
  $('#notifBtn')?.addEventListener('click', async () => {
    const p = await Notification.requestPermission();
    toast(p === 'granted' ? '✓' : '!', p === 'granted' ? 'Уведомления включены' : 'Уведомления не разрешены');
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
      <p>«МИСИС Соседи» — сервис взаимопомощи для студентов, проживающих в общежитиях университета.</p>
      <p>Многие предметы быта — инструменты, стремянки, бытовая техника — требуются студентам лишь эпизодически,
      однако каждому приходится приобретать их самостоятельно. Вместе с тем многие студенты обладают полезными навыками
      (ремонт техники, помощь в учёбе), но информация об этом не доходит до соседей, а поиск через общие чаты малоэффективен.</p>
      <p>Сервис объединяет предложения в едином каталоге: студенты могут взять вещь во временное пользование,
      разместить собственную или предложить услугу. Система фиксирует сроки возврата и своевременно напоминает о них,
      что позволяет сократить расходы студентов и развивать культуру взаимопомощи.</p>
    </div>
    <h2 class="sec">Порядок работы</h2>
    <div class="steps">
      <div class="step"><div class="n">1</div><b>Поиск</b><p>Найдите вещь или услугу в каталоге, используя фильтры по общежитию и категории.</p></div>
      <div class="step"><div class="n">2</div><b>Договорённость</b><p>Укажите срок возврата — сервис покажет Telegram владельца, чтобы договориться о передаче.</p></div>
      <div class="step"><div class="n">3</div><b>Пользование</b><p>Срок пользования отображается в разделе «Мои обмены»; напоминание можно добавить в календарь.</p></div>
      <div class="step"><div class="n">4</div><b>Возврат</b><p>Сервис напомнит о возврате заранее и уведомит владельца о просрочке. После возврата оцените обмен.</p></div>
    </div>
    <h2 class="sec">Правила обмена</h2>
    <ul class="rules">
      <li>Вещи возвращаются в установленный срок и в исходном состоянии.</li>
      <li>О повреждении вещи необходимо сообщить владельцу и согласовать порядок ремонта или компенсации.</li>
      <li>Запрещено размещение объявлений об алкоголе, опасных и запрещённых предметах.</li>
      <li>Услуги оказываются на добровольной основе.</li>
    </ul>
    <h2 class="sec">Поддержка</h2>
    <p class="meta" style="font-size:15px">По вопросам работы сервиса обращайтесь в студенческий совет общежития.</p>
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
        <label><span>Описание запроса</span><textarea class="ctl" name="msg" placeholder="Опишите, какая помощь требуется"></textarea></label>
        <div class="m-actions"><button type="button" class="btn m-cancel">Отмена</button><button class="btn primary">Отправить заявку</button></div>
      </form>`;
  } else if (it.type === 'thing' && !mine && it.status === 'free') {
    action = `
      <form class="form" id="actForm">
        <div class="fld"><span>Срок пользования</span>
          <div class="quick">${[1, 2, 3, 7, 14].map(d => `<button type="button" data-d="${d}" class="${d === 3 ? 'on' : ''}">${d} ${plural(d, 'день', 'дня', 'дней')}</button>`).join('')}</div></div>
        <label><span>Дата возврата</span><input class="ctl" type="date" name="to" value="${iso(addDays(3))}" min="${iso(addDays(1))}" max="${iso(addDays(30))}" required></label>
        <p class="meta">Напоминание придёт за день до срока и в день возврата.</p>
        <div class="m-actions"><button type="button" class="btn m-cancel">Отмена</button><button class="btn primary">Взять на время</button></div>
      </form>`;
  } else if (iBorrow) {
    const p = loanProgress(it);
    action = `<p><span class="badge ${p.bcls}">${p.label}</span> &nbsp;Вернуть до <b>${fmtDate(it.to)}</b></p>
      <div class="m-actions"><button class="btn" id="icsBtn">📅 В календарь</button><button class="btn success" id="retBtn">✓ Отметить возврат</button></div>`;
  } else if (it.status === 'busy') {
    action = `<p class="meta">Сейчас у: <b>${esc(it.borrowerName)}</b> до ${fmtDate(it.to)}.${mine ? '' : ' Вещь станет доступна после возврата.'}</p>
      ${mine ? `<div class="m-actions"><button class="btn" id="remBtn">🔔 Напомнить</button><button class="btn success" id="retBtn">✓ Подтвердить возврат</button></div>` : ''}`;
  } else if (mine) {
    action = `<p class="meta">Это ваше объявление. Оно доступно всем жителям общежитий.</p>
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
      <div class="foot" style="padding-top:4px">${statusHtml(it)}</div>
      <p class="desc">${esc(it.desc)}</p>
      <div class="owner">
        <span class="avatar">${initials(it.ownerName)}</span>
        <div style="flex:1"><b>${mine ? 'Ты' : esc(it.ownerName)}</b><small>${esc(dormName(it.bld))}${it.room ? ', комната ' + esc(it.room) : ''}</small></div>
        ${it.tg && !mine ? `<button type="button" class="btn tg-btn sm" data-tg="${esc(it.tg)}">${TG_ICON} Написать</button>` : ''}
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
      it.uses++; logEvent({ type: 'service', who: ME.email, owner: it.owner, item: it.title });
      persist(); closeModal(); showContact(it, 'service');
    } else {
      const to = f.to.value;
      if (!to || daysUntil(to) < 1) { toast('!', 'Дата возврата должна быть не раньше завтрашнего дня'); return; }
      Object.assign(it, { status: 'busy', borrower: ME.email, borrowerName: ME.name, from: iso(today()), to });
      it.uses++; logEvent({ type: 'borrow', who: ME.email, owner: it.owner, item: it.title });
      persist(); closeModal(); route();
      showContact(it, 'thing');
    }
  });
}

/* иконки с подписями; keys — слова в названии, по которым иконка выбирается сама */
const ICONS = {
  thing: [
    { e: '🔧', l: 'Инструмент', cat: 'Инструменты', keys: ['дрел', 'шуруп', 'отвёрт', 'отверт', 'молот', 'ключ', 'инструм', 'паяль'] },
    { e: '🪜', l: 'Стремянка', keys: ['стремян', 'лестниц'] },
    { e: '✂️', l: 'Ножницы', keys: ['ножниц'] },
    { e: '🔌', l: 'Техника', cat: 'Бытовая техника', keys: ['удлинит', 'зарядк', 'пылесос', 'техник'] },
    { e: '🔊', l: 'Колонка', keys: ['колонк', 'наушник', 'динамик'] },
    { e: '👔', l: 'Утюг, одежда', keys: ['утюг', 'отпарив', 'костюм', 'рубаш', 'одежд'] },
    { e: '💨', l: 'Фен', keys: ['фен'] },
    { e: '🍳', l: 'Кухня', cat: 'Кухня', keys: ['сковород', 'кастрюл', 'мультивар', 'блендер', 'миксер', 'посуд', 'чайник'] },
    { e: '⚽', l: 'Мяч, спорт', cat: 'Спорт и отдых', keys: ['мяч', 'футбол', 'баскет', 'волейб', 'гантел', 'коврик', 'ракетк'] },
    { e: '🚲', l: 'Велосипед', keys: ['велосип', 'самокат', 'ролик'] },
    { e: '⛺', l: 'Туризм', keys: ['палатк', 'спальник', 'рюкзак', 'поход'] },
    { e: '📚', l: 'Книги', cat: 'Учёба', keys: ['книг', 'учебник', 'задачник', 'конспект'] },
    { e: '🧮', l: 'Калькулятор', keys: ['калькулят'] },
    { e: '🎲', l: 'Настолки', cat: 'Игры', keys: ['игр', 'мафи', 'карты', 'шахмат', 'монопол'] },
    { e: '🎸', l: 'Музыка', keys: ['гитар', 'укулел', 'синтез'] },
    { e: '📦', l: 'Другое', keys: [] }
  ],
  service: [
    { e: '💻', l: 'Ремонт ноутбука', cat: 'Ремонт техники', keys: ['ноутбук', 'компьют', 'windows', 'винд', 'пк'] },
    { e: '📱', l: 'Ремонт телефона', keys: ['телефон', 'смартфон', 'экран'] },
    { e: '🎓', l: 'Учёба', cat: 'Помощь с учёбой', keys: ['матан', 'математ', 'физик', 'химия', 'курсов', 'лаб', 'экзамен', 'учёб', 'учеб'] },
    { e: '👨‍💻', l: 'Программирование', keys: ['python', 'питон', 'програм', 'код', 'java', 'c++'] },
    { e: '🇬🇧', l: 'Языки', keys: ['англ', 'язык', 'немец', 'english'] },
    { e: '💈', l: 'Стрижка', cat: 'Красота', keys: ['стриж', 'подстриг', 'бород'] },
    { e: '💅', l: 'Маникюр, макияж', keys: ['маникюр', 'макияж', 'ногт', 'бров'] },
    { e: '🍲', l: 'Готовка', keys: ['суп', 'приготов', 'готов', 'пирог', 'обед', 'выпеч'] },
    { e: '📷', l: 'Фото', keys: ['фото', 'съёмк', 'съемк'] },
    { e: '🎨', l: 'Дизайн', keys: ['дизайн', 'рису', 'презентац', 'плакат'] },
    { e: '🚚', l: 'Переезд, мебель', keys: ['переезд', 'мебел', 'шкаф', 'собрать', 'донести'] },
    { e: '✨', l: 'Другое', cat: 'Другое', keys: [] }
  ]
};
function guessIcon(type, title, cat) {
  const t = title.toLowerCase(), list = ICONS[type];
  return list.find(i => i.keys.some(k => t.includes(k))) || list.find(i => i.cat === cat) || list[list.length - 1];
}

function openNew(type) {
  const cats = CATEGORIES[type];
  const icons = ICONS[type];
  openModal(`
    <div class="m-body">
      <div class="toprow" style="margin-bottom:10px"><h3 style="margin:0">${type === 'thing' ? 'Разместить вещь' : 'Предложить услугу'}</h3><button class="btn sm m-x">✕</button></div>
      <form class="form" id="newForm">
        <div class="seg" style="width:max-content">
          <button type="button" data-t="thing" class="${type === 'thing' ? 'on' : ''}">Вещь</button>
          <button type="button" data-t="service" class="${type === 'service' ? 'on' : ''}">Услуга</button>
        </div>
        <label><span>Название</span><input class="ctl" name="title" maxlength="70" required placeholder="${type === 'thing' ? 'Например: футбольный мяч' : 'Например: починю ноутбук'}"></label>
        <div class="row2">
          <label><span>Категория</span><select class="ctl" name="cat">${cats.map(c => `<option>${c}</option>`).join('')}</select></label>
          <label><span>Контакт (Telegram)</span><input class="ctl" name="tg" value="${esc(ME.tg || '')}" placeholder="@username"></label>
        </div>
        <label><span>Описание</span><textarea class="ctl" name="desc" maxlength="400" placeholder="Состояние, комплектация, условия"></textarea></label>
        <div class="fld"><span>Иконка <small class="meta">— подбирается по названию, можно выбрать вручную</small></span>
          <div class="icon-pick">${icons.map(i => `<button type="button" data-e="${i.e}" title="${i.l}"><span>${i.e}</span><small>${i.l}</small></button>`).join('')}</div></div>
        <div class="m-actions"><button type="button" class="btn m-cancel">Отмена</button><button class="btn primary">Опубликовать</button></div>
      </form>
    </div>`);
  const f = $('#newForm');
  let emoji = '', manual = false;
  const mark = e => { emoji = e; $$('.icon-pick button', f).forEach(x => x.classList.toggle('on', x.dataset.e === e)); };
  const auto = () => { if (!manual) mark(guessIcon(type, f.elements.title.value, f.cat.value).e); };
  auto();
  f.elements.title.addEventListener('input', auto);
  f.cat.addEventListener('change', auto);
  $('.m-x').addEventListener('click', closeModal);
  $('.m-cancel').addEventListener('click', closeModal);
  $$('[data-t]', f).forEach(b => b.addEventListener('click', () => openNew(b.dataset.t)));
  $$('.icon-pick button', f).forEach(b => b.addEventListener('click', () => { manual = true; mark(b.dataset.e); }));
  f.elements.title.focus();
  f.addEventListener('submit', e => {
    e.preventDefault();
    const title = f.elements.title.value.trim();
    if (title.length < 3) { f.elements.title.focus(); toast('!', 'Название должно содержать не менее 3 символов'); return; }
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
    logEvent({ type: 'post', who: ME.email, item: title });
    persist(); closeModal();
    toast('✓', 'Объявление опубликовано');
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
  toast('✓', wasMine ? 'Возврат подтверждён' : 'Возврат отмечен', wasMine ? ` «${it.title}» снова доступна в каталоге` : ` ${it.ownerName.split(' ')[0]} получит уведомление`);
}
function remindBorrower(id) {
  const it = items.find(x => x.id === id);
  toast('✓', 'Напоминание отправлено', ` ${it.borrowerName}: возврат «${it.title}»`);
}
function deleteItem(id) {
  const it = items.find(x => x.id === id);
  if (!confirm(`Удалить объявление «${it.title}»?`)) return;
  items = items.filter(x => x.id !== id);
  persist(); route();
  toast('✓', 'Объявление удалено');
}



/* ---------- контакт владельца после «Взять на время» / заявки на услугу ---------- */
const TG_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.2l-4.7-1.5c-1-.3-1-1 .2-1.5l18.4-7.1c.9-.3 1.6.2 1.5 1.2z"/></svg>';
function longDate(isoStr) { return parseIso(isoStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }); }
/* кнопка «Написать»: в демо-версии не открывает Telegram, а копирует ник */
document.addEventListener('click', e => {
  const b = e.target.closest('#appScreen .tg-btn[data-tg]');
  if (!b) return;
  const tg = b.dataset.tg;
  navigator.clipboard?.writeText(tg).catch(() => {});
  toast('✓', 'Ник скопирован: ' + tg, ' Найдите пользователя в Telegram и напишите ему');
});

function showContact(it, kind) {
  const first = it.ownerName.split(' ')[0];
  const msg = kind === 'thing'
    ? `Здравствуйте! Хочу взять «${it.title}» через «МИСИС Соседи» до ${longDate(it.to)}. Когда удобно забрать?`
    : `Здравствуйте! Пишу по объявлению «${it.title}» в «МИСИС Соседи».`;
  openModal(`
    <div class="m-body contact">
      <div class="ok-mark">✓</div>
      <h3>${kind === 'thing' ? 'Вещь закреплена за вами' : 'Заявка отправлена'}</h3>
      <p class="meta">${kind === 'thing'
        ? `до <b>${longDate(it.to)}</b>. Напишите владельцу, чтобы договориться, когда и где забрать вещь.`
        : `Напишите исполнителю, чтобы договориться о времени.`}</p>
      <div class="owner">
        <span class="avatar">${initials(it.ownerName)}</span>
        <div style="flex:1"><b>${esc(it.ownerName)}</b><small>${esc(dormName(it.bld))}${it.room ? ', комната ' + esc(it.room) : ''}</small></div>
      </div>
      ${it.tg ? `
        <button type="button" class="btn tg-btn big" data-tg="${esc(it.tg)}">${TG_ICON} Написать в Telegram ${esc(it.tg)}</button>
        <div class="msg-box"><small>Готовое сообщение</small><p id="msgText">${esc(msg)}</p></div>
        <div class="m-actions" style="justify-content:space-between">
          <button class="btn" id="copyMsg">📋 Скопировать сообщение</button>
          <div style="display:flex;gap:8px">${kind === 'thing' ? '<button class="btn" id="cIcs">📅 В календарь</button>' : ''}<button class="btn primary m-cancel">Готово</button></div>
        </div>`
      : `<p class="meta">Владелец не указал Telegram — найдите его по адресу: ${esc(dormName(it.bld))}${it.room ? ', комната ' + esc(it.room) : ''}.</p>
        <div class="m-actions"><button class="btn primary m-cancel">Готово</button></div>`}
    </div>`);
  $('.m-cancel').addEventListener('click', closeModal);
  $('#cIcs')?.addEventListener('click', () => downloadIcs(it.id));
  $('#copyMsg')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(msg).then(() => toast('✓', 'Сообщение скопировано', ' Вставьте его в чат с ' + first)).catch(() => toast('!', 'Не удалось скопировать'));
  });
}

/* ================= Дополнительно: статистика, достижения, оценки, календарь, тема ================= */
function getLog() { return DB.get('log', []); }
function logEvent(e) { const l = getLog(); l.push(Object.assign({ at: Date.now() }, e)); DB.set('log', l); }

function ratingOf(email) {
  const r = getLog().filter(e => e.type === 'rate' && e.to === email);
  if (!r.length) return null;
  return { avg: r.reduce((s, e) => s + e.stars, 0) / r.length, n: r.length };
}

function statsOf(email) {
  const log = getLog();
  return {
    borrowed: log.filter(e => e.type === 'borrow' && e.who === email).length,
    lent: log.filter(e => e.type === 'borrow' && e.owner === email).length,
    helped: log.filter(e => e.type === 'service' && e.owner === email).length,
    rating: ratingOf(email)
  };
}

/* оценка после возврата */
function askRating(other, title) {
  if (!other.email || other.email === ME.email) return;
  let stars = 0;
  openModal(`
    <div class="m-body" style="text-align:center">
      <h3>Оценка обмена</h3>
      <p class="meta" style="margin:4px 0 14px">Оцените соседа: <b>${esc(other.name || '')}</b> · «${esc(title)}»</p>
      <div class="rate" id="rate">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n}">★</button>`).join('')}</div>
      <p class="meta" id="rateTxt" style="min-height:20px;margin-top:6px"></p>
      <div class="m-actions" style="justify-content:center"><button class="btn m-cancel">Пропустить</button><button class="btn primary" id="rateSend" disabled>Оценить</button></div>
    </div>`);
  const words = ['', 'Плохо', 'Удовлетворительно', 'Нормально', 'Хорошо', 'Отлично'];
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
    toast('✓', 'Оценка сохранена');
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
    `DESCRIPTION:Владелец: ${it.ownerName}\\, ${dormName(it.bld)}${it.room ? '\\, комн. ' + it.room : ''}. Сервис «МИСИС Соседи».`,
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Завтра вернуть вещь соседу', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'vernut-' + it.id + '.ics';
  document.body.appendChild(a); a.click(); a.remove();
  toast('✓', 'Файл календаря загружен', ' Откройте его, чтобы добавить событие с напоминанием за день');
}

/* страница профиля */
function pageProfile() {
  const st = statsOf(ME.email);
  const active = items.filter(i => i.owner === ME.email).length;
  const stars = st.rating ? '★★★★★'.slice(0, Math.round(st.rating.avg)).padEnd(5, '☆') : '☆☆☆☆☆';
  const userIds = new Map(getUsers().map(u => [u.email, u.name]));
  const nameOf = e => userIds.get(e) || '—';
  const hist = getLog().filter(e => e.who === ME.email || e.owner === ME.email || e.to === ME.email || e.from === ME.email)
    .filter(e => e.type !== 'post').slice(-12).reverse();
  const line = e => {
    const mine = e.who === ME.email || e.from === ME.email;
    if (e.type === 'borrow') return mine ? ['📥', `Взяли во временное пользование «${e.item}»`, `у ${nameOf(e.owner)}`] : ['📤', `Передали «${e.item}»`, `${nameOf(e.who)}`];
    if (e.type === 'return') return mine ? ['✅', `Вернули «${e.item}»`, e.onTime ? 'в срок' : 'с опозданием'] : ['✅', `Вам вернули «${e.item}»`, e.onTime ? 'в срок' : 'с опозданием'];
    if (e.type === 'service') return mine ? ['📨', `Заявка на услугу «${e.item}»`, `исполнитель: ${nameOf(e.owner)}`] : ['🤝', `Заявка на вашу услугу «${e.item}»`, `от ${nameOf(e.who)}`];
    if (e.type === 'rate') return mine ? ['⭐', `Вы оценили обмен «${e.item}»`, '★'.repeat(e.stars)] : ['⭐', `Вас оценили за «${e.item}»`, '★'.repeat(e.stars)];
    return null;
  };
  $('#view').innerHTML = `
  <div class="page">
    <div class="profile-hero">
      <span class="avatar big">${initials(ME.name)}</span>
      <div style="flex:1">
        <h1 style="margin:0;color:#fff">${esc(ME.name)}</h1>
        <p>${esc(dormName(ME.bld))}${ME.room ? ' · комн. ' + esc(ME.room) : ''}</p>
        <p class="hero-stars">${stars} <small>${st.rating ? st.rating.avg.toFixed(1) + ' · ' + st.rating.n + ' ' + plural(st.rating.n, 'оценка', 'оценки', 'оценок') : 'оценок пока нет'}</small></p>
      </div>
      <button class="btn hero-btn" id="editProfile">✎ Редактировать</button>
    </div>

    <div class="tiles">
      <div class="tile"><span>📦</span><b>${active}</b><small>активных объявлений</small></div>
      <div class="tile"><span>📥</span><b>${st.borrowed}</b><small>взято во временное пользование</small></div>
      <div class="tile"><span>📤</span><b>${st.lent}</b><small>передано соседям</small></div>
      <div class="tile"><span>🤝</span><b>${st.helped}</b><small>оказано услуг</small></div>
    </div>

    <div class="prof-grid">
      <section>
        <h2 class="sec">Контактные данные</h2>
        <div class="info-card">
          <div><small>Имя</small><b>${esc(ME.name)}</b></div>
          <div><small>Логин</small><b>${esc(ME.login || ME.email)}</b></div>
          <div><small>Общежитие</small><b>${esc(dormName(ME.bld))} <button type="button" class="btn sm" id="profDorm">Сменить</button></b></div>
          <div><small>Комната</small><b>${ME.room ? esc(ME.room) : '<span class="meta">не указана</span>'}</b></div>
          <div><small>Telegram</small><b>${ME.tg ? esc(ME.tg) : '<span class="meta">не указан</span>'}</b></div>
        </div>
      </section>
      <section>
        <h2 class="sec">История обменов</h2>
        <div class="info-card hist">
          ${hist.map(line).filter(Boolean).map((l, i) => `<div class="h-row"><span>${l[0]}</span><div><b>${esc(l[1])}</b><small>${esc(l[2])} · ${new Date(hist[i].at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</small></div></div>`).join('')
            || '<p class="meta" style="padding:6px 2px">Операций пока не было.</p>'}
        </div>
      </section>
    </div>
  </div>`;
  $('#editProfile').addEventListener('click', openProfileEdit);
  $('#profDorm').addEventListener('click', openDormPicker);
}

function openProfileEdit() {
  openModal(`
    <div class="m-body">
      <div class="toprow" style="margin-bottom:10px"><h3 style="margin:0">Редактирование профиля</h3><button class="btn sm m-x">✕</button></div>
      <form class="form" id="profForm">
        <label><span>Имя и фамилия</span><input class="ctl" name="fullname" maxlength="60" required value="${esc(ME.name)}"></label>
        <div class="row2">
          <label><span>Комната</span><input class="ctl" name="room" maxlength="6" inputmode="numeric" value="${esc(ME.room || '')}"></label>
          <label><span>Telegram</span><input class="ctl" name="tg" maxlength="40" placeholder="@username" value="${esc(ME.tg || '')}"></label>
        </div>
        <p class="meta">Общежитие меняется в профиле: «Контактные данные» → «Сменить».</p>
        <div class="m-actions"><button type="button" class="btn m-cancel">Отмена</button><button class="btn primary">Сохранить</button></div>
      </form>
    </div>`);
  $('.m-x').addEventListener('click', closeModal);
  $('.m-cancel').addEventListener('click', closeModal);
  $('#profForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, name = f.fullname.value.trim();
    if (name.length < 2) { f.fullname.focus(); return; }
    let tg = f.tg.value.trim(); if (tg && !tg.startsWith('@')) tg = '@' + tg;
    const room = f.room.value.trim();
    const users = getUsers(), u = users.find(x => x.email === ME.email);
    Object.assign(u, { name, room, tg }); Object.assign(ME, { name, room, tg }); saveUsers(users);
    items.forEach(it => { if (it.owner === ME.email) Object.assign(it, { ownerName: name, room, tg }); if (it.borrower === ME.email) it.borrowerName = name; });
    persist(); closeModal();
    $('#avatar').textContent = initials(name); $('#umName').textContent = name; $('#umRoom').textContent = where();
    route();
    toast('✓', 'Профиль сохранён');
  });
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
