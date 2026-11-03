'use strict';
const defaults = [
  { id: 'reading', title: '아침 독서 10분', detail: '책과 함께 여는 차분한 아침', icon: '▤', time: '07:00' },
  { id: 'algorithm', title: '알고리즘 문제 1개', detail: '하루 한 문제, 생각하는 힘 기르기', icon: '⌘', time: '09:00' },
  { id: 'english', title: '매일 영어 10분', detail: '짧게라도 매일, 영어와 가까워지기', icon: 'Aa', time: '12:00' },
  { id: 'exercise', title: '밤 9시 운동', detail: '달리기 · 계단 · 스쿼트 중 하나', icon: '↗', time: '21:00' },
  { id: 'writing', title: '밤 11시 글쓰기', detail: '오늘의 생각을 나만의 문장으로', icon: '✎', time: '23:00' }
];
const key = 'harugyeol-v1';
let state = { times: {}, days: {}, notified: {} };
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved && typeof saved === 'object') {
    for (const field of ['times', 'days', 'notified']) {
      if (saved[field] && typeof saved[field] === 'object' && !Array.isArray(saved[field])) state[field] = saved[field];
    }
  }
} catch { storageAvailable = false; }
const $ = id => document.getElementById(id);
function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function parseDate(value) { return new Date(`${value}T12:00:00`); }
let selected = dateKey();
let toastTimer;
function toast(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6000);
}
function save() {
  try { localStorage.setItem(key, JSON.stringify(state)); }
  catch { storageAvailable = false; toast('저장 공간을 사용할 수 없어 변경 사항이 이 창에서만 유지됩니다.'); }
}
function timeFor(routine) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(state.times[routine.id]) ? state.times[routine.id] : routine.time; }
function completed(day, id) { return state.days[day]?.[id] === true; }
function countFor(day) { return defaults.filter(r => completed(day, r.id)).length; }
function render() {
  const count = countFor(selected);
  $('date').value = selected;
  $('count').textContent = count;
  $('percent').innerHTML = `${count * 20}<small>%</small>`;
  $('ring').style.setProperty('--progress', `${count * 20}%`);
  $('encourage').textContent = count === 5 ? '오늘의 약속을 모두 지켰어요. 수고했어요!' : count ? '잘하고 있어요. 작은 성취가 차곡차곡 쌓이고 있어요.' : '오늘의 첫 번째 작은 성취를 만들어 보세요.';
  $('date-label').textContent = parseDate(selected).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' });
  $('routines').replaceChildren();
  defaults.forEach(r => {
    const done = completed(selected, r.id);
    const row = document.createElement('article'); row.className = `routine${done ? ' done' : ''}`;
    row.innerHTML = `<button class="check" aria-label="${r.title} 완료" aria-pressed="${done}">✓</button><div class="icon" aria-hidden="true">${r.icon}</div><div class="routine-info"><h3>${r.title}</h3><p>${r.detail}</p></div><label class="time-wrap"><input type="time" value="${timeFor(r)}" aria-label="${r.title} 알림 시간"></label>`;
    row.querySelector('button').onclick = () => {
      if (!state.days[selected] || typeof state.days[selected] !== 'object') state.days[selected] = {};
      state.days[selected][r.id] = !completed(selected, r.id); save(); render();
    };
    if (r.id === 'exercise') {
      const label = document.createElement('label');
      label.className = 'exercise-choice';
      const caption = document.createElement('span'); caption.textContent = '오늘 한 운동';
      const select = document.createElement('select'); select.setAttribute('aria-label', '오늘 한 운동');
      for (const [value, text] of [['', '운동 선택'], ['running', '달리기'], ['stairs', '계단'], ['squats', '스쿼트']]) {
        const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
      }
      select.value = state.days[selected]?.exerciseType || '';
      select.onchange = () => {
        if (!state.days[selected] || typeof state.days[selected] !== 'object') state.days[selected] = {};
        state.days[selected].exerciseType = select.value; save();
      };
      label.append(caption, select); row.append(label);
    }
    row.querySelector('input').onchange = event => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.target.value)) { render(); return; }
      state.times[r.id] = event.target.value; save(); toast('매일 알림 시간이 변경됐어요.');
    };
    $('routines').append(row);
  });
  $('week').replaceChildren();
  for (let offset = -6; offset <= 0; offset++) {
    const day = new Date(); day.setHours(12,0,0,0); day.setDate(day.getDate()+offset);
    const value = dateKey(day), count = countFor(value);
    const item = document.createElement('div'); item.className = `day${selected === value ? ' selected' : ''}`;
    const label = document.createElement('span'); label.textContent = day.toLocaleDateString('ko-KR',{weekday:'short'});
    const button = document.createElement('button'); button.textContent = count === 5 ? '✓' : day.getDate();
    button.style.background = count ? `rgba(108,133,88,${.16 + count * .12})` : '';
    button.setAttribute('aria-label', `${value}, ${count}개 완료`); button.onclick = () => { selected = value; render(); };
    const score = document.createElement('span'); score.textContent = `${count}/5`;
    item.append(label, button, score); $('week').append(item);
  }
}
function shiftDate(amount) { const day = parseDate(selected); day.setDate(day.getDate()+amount); selected = dateKey(day); render(); }
$('prev').onclick = () => shiftDate(-1); $('next').onclick = () => shiftDate(1);
$('today').onclick = () => { selected = dateKey(); render(); };
$('date').onchange = event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) { selected = event.target.value; render(); } };
function notificationLabel() {
  $('notify').textContent = !('Notification' in window) ? '브라우저 알림 미지원' : Notification.permission === 'granted' ? '알림 켜짐 ✓' : Notification.permission === 'denied' ? '알림 차단됨' : '알림 켜기 ↗';
}
$('notify').onclick = async () => {
  if (!('Notification' in window)) return toast('이 브라우저는 시스템 알림을 지원하지 않아요. 앱 안 알림은 동작합니다.');
  if (Notification.permission === 'denied') return toast('브라우저 사이트 설정에서 알림을 허용해 주세요.');
  if (Notification.permission === 'granted') return toast('알림이 켜져 있어요. 정해진 시간에 앱을 열어 두세요.');
  try {
    const permission = await Notification.requestPermission(); notificationLabel();
    toast(permission === 'granted' ? '알림을 켰어요. 앱이 열려 있을 때 정해진 시간에 알려드려요.' : '시스템 알림을 허용하지 않았어요. 앱 안 알림은 동작합니다.');
  } catch { toast('알림을 설정할 수 없어요. HTTPS 또는 로컬 개발 환경에서 사용해 주세요.'); }
};
function checkReminders(now = new Date()) {
  const day = dateKey(now), minute = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  defaults.forEach(r => {
    const stamp = `${day}/${r.id}/${minute}`;
    if (timeFor(r) !== minute || completed(day, r.id) || state.notified[stamp]) return;
    state.notified[stamp] = true; save(); toast(`지금은 ${r.title} 시간이에요.`);
    if ('Notification' in window && Notification.permission === 'granted') {
      try { const notification = new Notification('하루결 · 루틴 알림', { body:r.title, tag:stamp }); notification.onclick = () => { window.focus(); selected = dateKey(); render(); notification.close(); }; }
      catch { /* The in-app reminder remains available on browsers without this constructor. */ }
    }
  });
}
window.addEventListener('storage', event => { if (event.key === key) { try { const other = JSON.parse(event.newValue); if (other?.times && other?.days && other?.notified) { state = other; render(); } } catch {} } });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { notificationLabel(); checkReminders(); } });
render(); notificationLabel(); checkReminders(); setInterval(checkReminders, 15000);
if (!storageAvailable) $('notice').textContent = '브라우저 저장소를 읽지 못했어요. 저장이 제한될 수 있습니다. 알림은 앱이 열려 있을 때 동작해요.';
