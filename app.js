const $ = id => document.getElementById(id);
function parseTime(v) {
  if (v == null) return null;
  v = String(v).trim();
  if (!v) return null;
  if (v.includes(':')) {
    const p = v.split(':');
    const m = Number(p[0]); const s = Number(p[1]);
    if (Number.isNaN(m) || Number.isNaN(s)) return null;
    return m * 60 + s;
  }
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
function fmt(sec) {
  if (sec == null) return '-';
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1).padStart(4, '0');
  return m ? (m + ':' + s) : (sec.toFixed(1) + '초');
}
function ageBand(age) {
  if (age <= 6) return 0;
  if (age <= 8) return 1;
  if (age <= 10) return 2;
  if (age <= 12) return 3;
  if (age <= 14) return 4;
  if (age <= 19) return 5;
  if (age <= 29) return 6;
  if (age <= 39) return 7;
  if (age <= 49) return 8;
  if (age <= 59) return 9;
  if (age <= 69) return 10;
  return 11;
}
const JP_IM200 = {
  M: [298,271,229,208,193,185,240,250,260,270,285,302],
  F: [298,271,229,198,180,165,200,210,220,230,245,270]
};
const JP_IM100 = {
  M: [150,136,123,108,99,92,110,120,130,140,160,165],
  F: [150,136,123,108,92,85,100,110,120,130,140,147]
};
function scale(t, fromM, toM, factor) {
  if (t == null) return null;
  return t * (toM / fromM) * factor;
}
function bestOf(cands) {
  const ok = cands.filter(x => x != null);
  return ok.length ? Math.min.apply(null, ok) : null;
}
function strokeSet(prefix) {
  return {
    t25: parseTime($(prefix + '25').value),
    t50: parseTime($(prefix + '50').value),
    t100: parseTime($(prefix + '100').value)
  };
}
function fillStroke(s) {
  const t25 = bestOf([s.t25, scale(s.t50, 50, 25, 0.48), scale(s.t100, 100, 25, 0.46)]);
  const t50 = bestOf([s.t50, scale(s.t25, 25, 50, 2.12), scale(s.t100, 100, 50, 0.49)]);
  const t100 = bestOf([s.t100, scale(s.t50, 50, 100, 2.12), scale(s.t25, 25, 100, 4.35)]);
  return { t25: t25, t50: t50, t100: t100 };
}
function collect() {
  const fr = fillStroke(strokeSet('fr'));
  const bk = fillStroke(strokeSet('bk'));
  const br = fillStroke(strokeSet('br'));
  const fl = fillStroke(strokeSet('fl'));
  const has4 = !!(fr.t25 && bk.t25 && br.t25 && fl.t25);
  const s4 = $('s4').checked || has4;
  const im100 = bestOf([
    has4 ? (fr.t25 + bk.t25 + br.t25 + fl.t25) * 1.08 : null,
    (fr.t50 && bk.t50 && br.t50 && fl.t50) ? (fl.t50 + bk.t50 + br.t50 + fr.t50) * 0.54 : null
  ]);
  const im200 = im100 != null ? im100 * 2.16 : null;
  const fr200 = fr.t100 != null ? fr.t100 * 2.14 : (fr.t50 != null ? fr.t50 * 4.4 : null);
  const fr400 = fr.t100 != null ? fr.t100 * 4.45 : null;
  const fr500 = fr.t100 != null ? fr.t100 * 5.55 : null;
  const fr800 = fr.t100 != null ? fr.t100 * 9.2 : null;
  return {
    age: Number($('age').value || 30), sex: $('sex').value,
    fr: fr, bk: bk, br: br, fl: fl, fr25: fr.t25, fr50: fr.t50, fr100: fr.t100,
    fr200: fr200, fr400: fr400, fr500: fr500, fr800: fr800, br50: br.t50, im100: im100, im200: im200,
    s4: s4, sRescue: $('sRescue').checked, sDive2: $('sDive2').checked, sTow: $('sTow').checked
  };
}
function koreaGrade(d) {
  if (d.im200 != null && d.im200 <= 180 && d.sRescue) return { grade: '1급', why: '환산 IM200 ' + fmt(d.im200) + ' ≤ 3:00, 구조영법' };
  if (d.im100 != null && d.im100 <= 150 && d.fr200 != null && d.fr200 <= 300 && d.sRescue) return { grade: '2급', why: '환산 IM100 ' + fmt(d.im100) + ', 200자 ' + fmt(d.fr200) };
  if (d.im100 != null && d.im100 <= 150) return { grade: '3급', why: '환산 IM100 ' + fmt(d.im100) + ' ≤ 2:30' };
  if (d.s4) return { grade: '4급', why: '4영법 25m 라인' };
  if (d.fr.t25 && d.bk.t25 && d.br.t50) return { grade: '5급', why: '자·배 25m + 평영 거리' };
  if (d.fr.t25 || d.bk.t25) return { grade: '7~8급', why: '자 또는 배 25m' };
  return { grade: '측정 정보 부족', why: '자유형 25m부터 넣어 주세요.' };
}
function japanGrade(d) {
  const i = ageBand(d.age);
  const c200 = JP_IM200[d.sex][i];
  const c100 = JP_IM100[d.sex][i];
  if (d.im200 != null && d.im200 <= c200) return { grade: '1급', why: '환산 200IM ' + fmt(d.im200) + ' ≤ ' + fmt(c200) };
  if (d.im100 != null && d.im100 <= c100) return { grade: '2급', why: '환산 100IM ' + fmt(d.im100) + ' ≤ ' + fmt(c100) };
  const fifty = bestOf([d.fr.t50, d.bk.t50, d.br.t50, d.fl.t50]);
  if ((fifty && fifty <= 75) || d.s4) return { grade: '3~4급 추정', why: '가장 빠른 50m ' + fmt(fifty) };
  if (d.fr.t25 || d.s4) return { grade: '5~7급 추정', why: '25m 1종목 이상' };
  return { grade: '미달/정보 부족', why: '25m 기록이 필요합니다.' };
}
function germanyGrade(d) {
  const breastOk = d.br50 != null && d.br50 <= 75;
  const goldDist = d.fr800 != null && d.fr800 <= 1800;
  const silverDist = d.fr400 != null && d.fr400 <= 1200;
  const bronzeDist = d.fr200 != null && d.fr200 <= 900;
  if (goldDist && breastOk && d.sDive2 && d.sTow) return { grade: 'Gold', why: '환산 800자 ' + fmt(d.fr800) + ' + 평영50 ' + fmt(d.br50) };
  if (goldDist && (breastOk || d.sDive2)) return { grade: 'Gold 근접', why: '환산 800자 ' + fmt(d.fr800) };
  if (silverDist && d.sDive2) return { grade: 'Silber', why: '환산 400자 ' + fmt(d.fr400) + ' + 잠수' };
  if (bronzeDist || d.s4) return { grade: 'Bronze 가능', why: d.fr200 ? '환산 200자 ' + fmt(d.fr200) : '4영법 25m' };
  return { grade: '준비 단계', why: '자유형 50·100m를 넣으면 거리 환산이 됩니다.' };
}
function globalLevel(d) {
  if (d.fr100 != null && d.fr100 <= 60 && d.fr500 != null && d.fr500 <= 360) return { grade: 'Level 5 · 상위 1%', why: '자유형 100 ' + fmt(d.fr100) };
  if (d.fr100 != null && d.fr100 <= 90) return { grade: 'Level 4 · 상위 5%', why: '자유형 100 ' + fmt(d.fr100) };
  if ((d.fr100 != null && d.fr100 <= 180) || (d.fr500 != null && d.fr500 <= 900)) return { grade: 'Level 3 · 상위 10%', why: '자유형 100 ' + fmt(d.fr100) };
  if (d.s4) return { grade: 'Level 2 · 상위 25%', why: '4영법 25m' };
  if (d.fr.t25) return { grade: 'Level 1 · 상위 50%', why: '자유형 25 ' + fmt(d.fr.t25) };
  return { grade: 'Level 0', why: '자유형 25m부터 입력하세요.' };
}
function englandStage(d) {
  if (d.fr800 != null && d.fr800 <= 1440) return { grade: 'Stage 10', why: '환산 800 ' + fmt(d.fr800) };
  if (d.fr400) return { grade: 'Stage 8~9', why: '환산 400자 ' + fmt(d.fr400) };
  if (d.s4) return { grade: 'Stage 6~7', why: '4영법 형태' };
  if (d.fr.t25) return { grade: 'Stage 4~5', why: '단거리 이동' };
  return { grade: 'Stage 1~3', why: '기록 입력 전' };
}
function waPoints(d) {
  const base = d.sex === 'M'
    ? { fr100: 46.40, fr50: 20.91, bk100: 51.60, br100: 56.88, fl100: 49.45 }
    : { fr100: 51.71, fr50: 23.61, bk100: 57.13, br100: 64.13, fl100: 54.64 };
  const rows = [];
  function add(label, t, b) {
    if (t == null || !b) return;
    rows.push({ label: label, t: t, p: Math.max(0, Math.floor(1000 * Math.pow(b / t, 3))) });
  }
  add('자유형 100m', d.fr100, base.fr100);
  add('자유형 50m', d.fr50, base.fr50);
  add('배영 100m', d.bk.t100, base.bk100);
  add('평영 100m', d.br.t100, base.br100);
  add('접영 100m', d.fl.t100, base.fl100);
  return rows;
}
function render() {
  const d = collect();
  const items = [
    Object.assign({ name: '한국 · 협회 능력검정' }, koreaGrade(d)),
    Object.assign({ name: '일본 · 영력검정' }, japanGrade(d)),
    Object.assign({ name: '독일 · Schwimmabzeichen' }, germanyGrade(d)),
    Object.assign({ name: '글로벌 7단계' }, globalLevel(d)),
    Object.assign({ name: '영국 · Swim England' }, englandStage(d))
  ];
  const pts = waPoints(d);
  const conv = [];
  if (d.im100) conv.push('환산 IM100 ' + fmt(d.im100));
  if (d.im200) conv.push('환산 IM200 ' + fmt(d.im200));
  if (d.fr200) conv.push('환산 자유형200 ' + fmt(d.fr200));
  if (d.fr500) conv.push('환산 자유형500 ' + fmt(d.fr500));
  $('out').innerHTML = '<h2>진단 결과 · ' + d.age + '세 ' + (d.sex === 'M' ? '남자' : '여자') + '</h2>' +
    '<div class="badge-list">' + items.map(function (it) {
      return '<article class="nation"><div class="nation-top"><h3>' + it.name + '</h3><div class="grade">' + it.grade +
        '</div></div><p class="why">' + it.why + '</p></article>';
    }).join('') + '</div><div class="points"><h2>자동 환산값</h2><p class="why">' +
    (conv.length ? conv.join(' · ') : '25/50/100 중 하나 이상 입력하면 환산됩니다.') +
    '</p><h2>World Aquatics 근사 점수</h2>' +
    (pts.length ? pts.map(function (p) { return '<p class="why">' + p.label + ' ' + fmt(p.t) + ' → <b style="color:#3ec6ff">' + p.p + '점</b></p>'; }).join('') :
      '<p class="why">50m 또는 100m가 있으면 점수가 나옵니다.</p>') + '</div>';
}
$('go').onclick = render;
$('reset').onclick = function () { location.reload(); };
