/* ===== Страница входа ===== */
function startAuth() {
  getUsers(); // создаёт демо-аккаунт при первом запуске

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  requestAnimationFrame(() => requestAnimationFrame(() => $('.auth-root').classList.add('loaded')));

  /* --- подсветка карточки за курсором --- */
  const card = $('#card'), glow = $('#glow');
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    glow.style.left = (e.clientX - r.left) + 'px';
    glow.style.top = (e.clientY - r.top) + 'px';
  });

  /* --- вкладки --- */
  const tabs = $('.tabs');
  $$('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  function switchTab(name) {
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    tabs.classList.toggle('reg', name === 'register');
    $('#loginForm').classList.toggle('hidden', name !== 'login');
    $('#regForm').classList.toggle('hidden', name !== 'register');
  }

  /* --- показать пароль --- */
  $$('.eye').forEach(b => b.addEventListener('click', () => {
    const inp = b.parentElement.querySelector('input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    b.textContent = inp.type === 'password' ? '👁' : '🙈';
  }));

  /* --- рябь на кнопках --- */
  $$('.btn').forEach(b => b.addEventListener('pointerdown', e => {
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height);
    const rp = document.createElement('span');
    rp.className = 'ripple';
    rp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(rp);
    setTimeout(() => rp.remove(), 600);
  }));

  /* --- индикатор сложности пароля --- */
  const regPass = $('#regForm [name=pass]');
  regPass.addEventListener('input', () => {
    const v = regPass.value;
    let s = 0;
    if (v.length >= 6) s++;
    if (v.length >= 10) s++;
    if (/[A-ZА-Я]/.test(v) && /[a-zа-я]/.test(v)) s++;
    if (/\d/.test(v) && /[^\wА-Яа-я]/.test(v)) s++;
    const colors = ['#e02f44', '#f6a609', '#7bc043', '#18a957'];
    const labels = ['слабый', 'так себе', 'хороший', 'отличный'];
    $$('.strength i').forEach((i, k) => i.style.background = k < s ? colors[s - 1] : '#e6e9ef');
    $('#strengthTxt').textContent = v ? labels[Math.max(0, s - 1)] : '';
  });

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function fail(form, errEl, msg, fields) {
    errEl.textContent = msg;
    fields.forEach(n => {
      const f = form.querySelector(`[name=${n}]`).closest('.field');
      f.classList.remove('bad'); void f.offsetWidth; f.classList.add('bad');
    });
  }

  /* успешный вход: галочка → синий круг на весь экран → приложение */
  function success(btn, email, remember) {
    btn.classList.add('loading');
    setTimeout(() => {
      btn.classList.remove('loading'); btn.classList.add('done');
      login(email, remember);
      DB.set('justLoggedIn', true);
      setTimeout(() => {
        const r = btn.getBoundingClientRect(), rv = $('#reveal');
        rv.style.left = (r.left + r.width / 2) + 'px';
        rv.style.top = (r.top + r.height / 2) + 'px';
        rv.classList.add('go');
        setTimeout(() => showApp(), 650);
      }, 450);
    }, 900);
  }

  /* --- вход --- */
  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, err = $('#loginErr');
    const email = f.email.value.trim().toLowerCase(), pass = f.pass.value;
    err.textContent = '';
    if (!email || !pass) return fail(f, err, 'Заполни email и пароль', ['email', 'pass'].filter(n => !f[n].value));
    const u = getUsers().find(x => x.email === email);
    if (!u || u.pass !== pass) return fail(f, err, 'Неверный email или пароль', ['email', 'pass']);
    success(f.querySelector('.btn.primary'), u.email, f.remember.checked);
  });

  $('#demoBtn').addEventListener('click', () => {
    const f = $('#loginForm');
    f.email.value = ''; f.pass.value = '';
    // «печатаем» данные демо-аккаунта
    const typeInto = (inp, text, cb) => {
      let i = 0;
      (function step() {
        inp.value = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, 35); else cb && cb();
      })();
    };
    typeInto(f.email, DEMO_USER.email, () =>
      typeInto(f.pass, DEMO_USER.pass, () => f.requestSubmit()));
  });

  $('#forgot').addEventListener('click', e => {
    e.preventDefault();
    toast('Демо-версия: используй демо-аккаунт demo@sosedi.ru / demo123');
  });

  /* --- регистрация --- */
  $('#regForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, err = $('#regErr');
    const name = f.fullname.value.trim(), email = f.email.value.trim().toLowerCase();
    const room = f.room.value.trim(), pass = f.pass.value, bld = f.bld.value;
    err.textContent = '';
    if (name.length < 2) return fail(f, err, 'Как тебя зовут?', ['fullname']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(f, err, 'Похоже, email с ошибкой', ['email']);
    if (!/^\d{1,4}$/.test(room)) return fail(f, err, 'Укажи номер комнаты цифрами', ['room']);
    if (pass.length < 6) return fail(f, err, 'Пароль — минимум 6 символов', ['pass']);
    const users = getUsers();
    if (users.some(u => u.email === email)) return fail(f, err, 'Такой email уже зарегистрирован', ['email']);
    users.push({ name, email, pass, bld, room, tg: '' });
    saveUsers(users);
    success(f.querySelector('.btn.primary'), email, true);
  });
}
