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
  return m ? `${m}:${s}` : `${sec.toFixed(1)}초`;
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
function koreaGrade(d) {
  if (d.im200 != null && d.im200 <= 180 && d.sRescue) {
    return { grade: '1급', why: `IM 200m ${fmt(d.im200)} ≤ 3:00, 구조영법 보유` };
  }
  if (d.im100 != null && d.im100 <= 150 && ((d.fr200 != null && d.fr200 <= 300) || d.cont >= 200) && d.sRescue) {
    return { grade: '2급', why: `IM 100m ${fmt(d.im100)} ≤ 2:30, 200m 5분대, 구조영법` };
  }
  if (d.im100 != null && d.im100 <= 150 && d.uw >= 10) {
    return { grade: '3급', why: `IM 100m ${fmt(d.im100)} ≤ 2:30, 잠영 ${d.uw}m` };
  }
  if (d.s4 || (d.fr25 && d.bk25 && d.br25 && d.fl25)) {
    return { grade: '4급', why: '4영법 각 25m 완주 (고급/간접구조 라인)' };
  }
  if ((d.fr25 || d.s4) && (d.bk25 || d.s4) && (d.br50 || d.br25)) {
    return { grade: '5급', why: '자·배 25m + 평영 거리 확보' };
  }
  if ((d.fr25 || d.s4) && d.sFloat) return { grade: '6급', why: '자·배 기초 + 떠서 이동' };
  if (d.fr25 || d.bk25) return { grade: '7~8급', why: '자 또는 배 25m 가능' };
  if (d.tread >= 5 || d.cont >= 15) return { grade: '9~10급', why: '기초 생존·물 적응 구간' };
  return { grade: '측정 정보 부족', why: '25m 기록 또는 기술 체크가 더 필요합니다.' };
}
function japanGrade(d) {
  const i = ageBand(d.age);
  const im200cut = JP_IM200[d.sex][i];
  const im100cut = JP_IM100[d.sex][i];
  if (d.im200 != null && d.im200 <= im200cut) {
    return { grade: '1급', why: `200IM ${fmt(d.im200)} ≤ 기준 ${fmt(im200cut)} (연령대 보정)` };
  }
  if (d.im100 != null && d.im100 <= im100cut) {
    return { grade: '2급', why: `100IM ${fmt(d.im100)} ≤ 기준 ${fmt(im100cut)}` };
  }
  if ((d.fr50 && d.fr50 <= 75) || d.s4) {
    return { grade: '3~4급 추정', why: '단거리 1종목 기준. 정확한 급수는 종목별 공식 타임표를 따릅니다.' };
  }
  if (d.fr25 || d.s4) return { grade: '5~7급 추정', why: '25m 1종목 완주 가능. 하위 급 타임만 충족하면 합격권.' };
  return { grade: '미달/정보 부족', why: '25m 이상 기록이 필요합니다.' };
}
function germanyGrade(d) {
  const longOk = d.cont || (d.fr500 ? 500 : 0) || (d.fr200 ? 200 : 0);
  const goldDist = longOk >= 800 || (d.fr500 != null && d.fr500 <= 1800);
  const silverDist = longOk >= 400 || (d.fr500 != null);
  const bronzeDist = longOk >= 200 || d.fr200 != null || d.sTurn;
  const breastOk = d.br50 != null && d.br50 <= 75;
  if (goldDist && breastOk && d.uw >= 10 && d.sDive2 && d.sTow && d.sTurn) {
    return { grade: 'Gold', why: '800m급 지구력 + 평영 50m 1:15 + 잠영·잠수·이송' };
  }
  if (goldDist && (breastOk || d.uw >= 10)) {
    return { grade: 'Gold 근접', why: '거리/일부 기술은 충족. 평영 1:15, 2m 잠수 3회, 이송수영을 확인하세요.' };
  }
  if (silverDist && (d.uw >= 10 || d.sDive2)) {
    return { grade: 'Silber', why: '400m/20분 라인 + 잠수·잠영 요소' };
  }
  if (bronzeDist || d.s4 || (d.tread >= 60 && (d.fr25 || d.cont >= 25))) {
    return { grade: 'Bronze 가능', why: '15분 내 200m + 자세 전환 + 2m 잠수 1회가 핵심' };
  }
  return { grade: 'Seepferdchen~준비', why: '연속 200m와 입영이 먼저입니다.' };
}
function globalLevel(d) {
  const fr100 = d.fr100;
  if (fr100 != null && fr100 <= 60 && (d.fr500 != null && d.fr500 <= 360)) {
    return { grade: 'Level 5 · 상위 1%', why: '100m 1분 전후, 고강도 훈련권' };
  }
  if (fr100 != null && fr100 <= 90 && d.uw >= 15) {
    return { grade: 'Level 4 · 상위 5%', why: `자유형 100m ${fmt(fr100)}, 잠영 ${d.uw}m` };
  }
  if ((fr100 != null && fr100 <= 180) || (d.fr500 != null && d.fr500 <= 900)) {
    return { grade: 'Level 3 · 상위 10%', why: '100m 3분 또는 500m 15분 라인' };
  }
  if (d.s4 || (d.fr25 && d.bk25 && d.br25 && d.fl25)) {
    return { grade: 'Level 2 · 상위 25%', why: '4영법 25m' };
  }
  if (d.tread >= 60 || d.cont >= 25 || d.fr25) {
    return { grade: 'Level 1 · 상위 50%', why: '깊은 물 생존 + 25m 이동' };
  }
  return { grade: 'Level 0 · 물 적응', why: '입영·25m부터 시작하면 됩니다.' };
}
function englandStage(d) {
  if (d.cont >= 1200 || (d.fr500 != null && d.fr500 <= 1440 && d.cont >= 800)) return { grade: 'Stage 10', why: '장거리 세트(1200m/24분) 라인' };
  if (d.cont >= 800 || d.fr500) return { grade: 'Stage 8~9', why: '400~800m 구조화 세트' };
  if (d.s4) return { grade: 'Stage 6~7', why: '4영법 형태와 기초 안전' };
  if (d.fr25 || d.sFloat) return { grade: 'Stage 4~5', why: '이동·킥·짧은 영법' };
  return { grade: 'Stage 1~3', why: '물 적응, 뜨기, 5~10m' };
}
function waPoints(d) {
  const base = d.sex === 'M'
    ? { fr100: 46.40, fr50: 20.91, im100: 49.95, im200: 113.42 }
    : { fr100: 51.71, fr50: 23.61, im100: 56.51, im200: 126.12 };
  const rows = [];
  const add = (label, t, b) => {
    if (t == null || !b) return;
    const p = Math.floor(1000 * Math.pow(b / t, 3));
    rows.push({ label, t, p: Math.max(0, p) });
  };
  add('자유형 100m', d.fr100, base.fr100);
  add('자유형 50m', d.fr50, base.fr50);
  add('IM 100m', d.im100, base.im100);
  add('IM 200m', d.im200, base.im200);
  return rows;
}
function render() {
  const d = {
    age: Number($('age').value || 30),
    sex: $('sex').value,
    tread: parseTime($('tread').value),
    uw: Number($('uw').value || 0),
    cont: Number($('cont').value || 0),
    fr25: parseTime($('fr25').value),
    fr50: parseTime($('fr50').value),
    fr100: parseTime($('fr100').value),
    fr200: parseTime($('fr200').value),
    fr500: parseTime($('fr500').value),
    bk25: parseTime($('bk25').value),
    br25: parseTime($('br25').value),
    br50: parseTime($('br50').value),
    fl25: parseTime($('fl25').value),
    im100: parseTime($('im100').value),
    im200: parseTime($('im200').value),
    s4: $('s4').checked,
    sFloat: $('sFloat').checked,
    sRescue: $('sRescue').checked,
    sDive2: $('sDive2').checked,
    sTow: $('sTow').checked,
    sTurn: $('sTurn').checked
  };
  const items = [
    { name: '한국 · 협회 능력검정', ...koreaGrade(d) },
    { name: '일본 · 영력검정', ...japanGrade(d) },
    { name: '독일 · Schwimmabzeichen', ...germanyGrade(d) },
    { name: '글로벌 7단계', ...globalLevel(d) },
    { name: '영국 · Swim England', ...englandStage(d) }
  ];
  const pts = waPoints(d);
  const nextTips = [];
  if (!d.s4) nextTips.push('4영법 25m를 먼저 완성하면 한국 4급·글로벌 Lv.2가 열립니다.');
  if (d.im100 == null) nextTips.push('IM 100m 한 번만 재도 한·일 급수가 크게 정확해집니다.');
  if (d.fr100 == null) nextTips.push('자유형 100m는 세계 점수와 글로벌 레벨의 기준 종목입니다.');
  $('out').innerHTML = `
    <h2>진단 결과 · ${d.age}세 ${d.sex === 'M' ? '남자' : '여자'}</h2>
    <div class="badge-list">
      ${items.map(it => `
        <article class="nation">
          <div class="nation-top">
            <h3>${it.name}</h3>
            <div class="grade">${it.grade}</div>
          </div>
          <p class="why">${it.why}</p>
        </article>
      `).join('')}
    </div>
    <div class="points">
      <h2>World Aquatics 근사 점수</h2>
      ${pts.length ? pts.map(p => `<p class="why">${p.label} ${fmt(p.t)} → <b style="color:#3ec6ff">${p.p}점</b></p>`).join('') : '<p class="why">100m/50m/IM 기록이 있으면 점수가 계산됩니다. 1000점 = 세계기록급.</p>'}
      <p class="why">생활수영 참고: 150~250 입문 훈련, 300~450 진지한 아마추어, 500+ 마스터즈 상위권.</p>
    </div>
    ${nextTips.length ? `<p class="next">${nextTips.join('<br>')}</p>` : ''}
  `;
}
$('go').onclick = render;
$('reset').onclick = () => location.reload();
