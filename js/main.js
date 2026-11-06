/* ===== Запуск: показываем вход или приложение (всё на одной странице) ===== */
function showApp() {
  document.getElementById('authScreen').hidden = true;
  document.getElementById('appScreen').hidden = false;
  document.title = 'Соседи — обмен в общежитии';
  window.scrollTo(0, 0);
  startApp();
}

if (currentUser()) {
  showApp();
} else {
  document.title = 'Соседи — вход';
  document.getElementById('authScreen').hidden = false;
  startAuth();
}
