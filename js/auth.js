/* ===== Экран входа → выбор общежития ===== */
function startAuth() {
  getUsers(); // создаёт демо-аккаунт при первом запуске

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  applyI18n();
  $('#langName').textContent = t('langName');

  /* --- язык --- */
  const lang = $('#lang'), langMenu = $('#langMenu');
  const markLang = () => $$('#langMenu button').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG));
  markLang();
  $('#langBtn').addEventListener('click', e => {
    e.stopPropagation();
    langMenu.hidden = !langMenu.hidden;
    lang.classList.toggle('open', !langMenu.hidden);
  });
  $$('#langMenu button').forEach(b => b.addEventListener('click', () => {
    setLang(b.dataset.lang);
    $('#langName').textContent = t('langName');
    markLang();
    langMenu.hidden = true; lang.classList.remove('open');
    if (!$('#stepDorm').hidden) renderDorms();
  }));
  document.addEventListener('click', e => {
    if (!e.target.closest('#lang')) { langMenu.hidden = true; lang.classList.remove('open'); }
  });

  function toast(msg) {
    const tt = $('#toast');
    tt.textContent = msg; tt.classList.add('show');
    clearTimeout(tt._h); tt._h = setTimeout(() => tt.classList.remove('show'), 3000);
  }
  $('#forgot').addEventListener('click', e => { e.preventDefault(); toast(t('forgotToast')); });

  function shake(inputs) {
    inputs.forEach(i => { i.classList.remove('bad'); void i.offsetWidth; i.classList.add('bad'); });
  }

  /* --- шаг 1: вход --- */
  let pending = null; // вошёл, но ещё не выбрал общежитие
  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, err = $('#loginErr');
    const loginVal = f.login.value.trim(), pass = f.pass.value;
    err.textContent = '';
    if (!loginVal || !pass) {
      err.textContent = t('errEmpty');
      return shake([f.login, f.pass].filter(i => !i.value.trim()));
    }
    const key = loginVal.toLowerCase();
    const users = getUsers();
    let u = users.find(x => x.email === key || (x.login || '').toLowerCase() === key);
    if (u && u.pass !== pass) { err.textContent = t('errPass'); return shake([f.login, f.pass]); }
    if (!u) {
      // демо-режим: первый вход с новым логином создаёт аккаунт
      const base = key.split('@')[0];
      u = { name: base.charAt(0).toUpperCase() + base.slice(1), email: key, login: base, pass, bld: '', room: '', tg: '' };
      users.push(u); saveUsers(users);
    }
    pending = u;
    showDormStep();
  });

  /* --- шаг 2: общежитие --- */
  let chosen = '';
  function renderDorms() {
    $('#dormList').innerHTML = dormOptionsHtml(chosen);
    bindDormOptions($('#dormList'), id => { chosen = id; $('#dormNext').disabled = false; });
    applyI18n($('#stepDorm'));
  }
  function showDormStep() {
    chosen = DORMS.some(d => d.id === pending.bld) ? pending.bld : '';
    $('#stepLogin').hidden = true;
    $('#stepDorm').hidden = false;
    $('#card').classList.add('wide');
    $('#dormNext').disabled = !chosen;
    renderDorms();
  }

  $('#dormNext').addEventListener('click', () => {
    if (!chosen) return;
    const users = getUsers(), u = users.find(x => x.email === pending.email);
    u.bld = chosen; saveUsers(users);
    login(u.email, true);
    DB.set('justLoggedIn', true);
    showApp();
  });
}
