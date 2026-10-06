/* Exercise library + animated stick-figure renderer (SVG/SMIL, no external assets).
   Poses are described with joint angles (0° = pointing down, 90° = forward, 180° = up, -90° = backward);
   hands/feet can also be placed with a relative target that is solved with 2-bone IK. */
(function (PD) {
  const LEN = { torso: 25, head: 9, thigh: 17, shin: 18, upper: 12, fore: 12, toe: 5 };
  const R = Math.PI / 180;
  const dir = (a) => [Math.sin(a * R), Math.cos(a * R)];

  function ik(l1, l2, [tx, ty], bend) {
    const d = Math.min(Math.max(Math.hypot(tx, ty), 0.01), l1 + l2 - 0.001);
    const th = Math.atan2(tx, ty) / R;
    const al = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) / R;
    const a1 = th + bend * al;
    const [mx, my] = dir(a1).map((v) => v * l1);
    return [a1, Math.atan2(tx - mx, ty - my) / R];
  }

  /** Normalise a pose: limb specs -> angle pairs. */
  function P(o = {}) {
    const limb = (v, l1, l2) => (!v ? [0, 0] : Array.isArray(v) ? v : ik(l1, l2, v.to, v.bend ?? 1));
    return {
      t: o.t || 0, hd: o.hd || 0, lift: o.lift || 0, toe: o.toe ?? 90,
      l1: limb(o.l1 ?? o.l, LEN.thigh, LEN.shin), l2: limb(o.l2 ?? o.l, LEN.thigh, LEN.shin),
      a1: limb(o.a1 ?? o.a, LEN.upper, LEN.fore), a2: limb(o.a2 ?? o.a, LEN.upper, LEN.fore),
    };
  }

  function joints(p, front) {
    const add = (a, ang, len) => { const [dx, dy] = dir(ang); return [a[0] + dx * len, a[1] + dy * len]; };
    const h = [0, 0];
    const s = [Math.sin(p.t * R) * LEN.torso, -Math.cos(p.t * R) * LEN.torso];
    const hd = [s[0] + Math.sin((p.t + p.hd) * R) * LEN.head, s[1] - Math.cos((p.t + p.hd) * R) * LEN.head];
    const nk = [s[0] + Math.sin((p.t + p.hd) * R) * 3.5, s[1] - Math.cos((p.t + p.hd) * R) * 3.5];
    const k1 = add(h, p.l1[0], LEN.thigh); const f1 = add(k1, p.l1[1], LEN.shin);
    const k2 = add(h, p.l2[0], LEN.thigh); const f2 = add(k2, p.l2[1], LEN.shin);
    const e1 = add(s, p.a1[0], LEN.upper); const w1 = add(e1, p.a1[1], LEN.fore);
    const e2 = add(s, p.a2[0], LEN.upper); const w2 = add(e2, p.a2[1], LEN.fore);
    const tl = front ? 0 : LEN.toe;
    const t1 = add(f1, p.toe, tl); const t2 = add(f2, p.toe, tl);
    return { h, s, hd, nk, k1, f1, k2, f2, e1, w1, e2, w2, t1, t2 };
  }

  const lerp = (a, b, u) => a + (b - a) * u;
  const lerpPose = (A, B, u) => ({
    t: lerp(A.t, B.t, u), hd: lerp(A.hd, B.hd, u), lift: lerp(A.lift, B.lift, u), toe: lerp(A.toe, B.toe, u),
    l1: [lerp(A.l1[0], B.l1[0], u), lerp(A.l1[1], B.l1[1], u)], l2: [lerp(A.l2[0], B.l2[0], u), lerp(A.l2[1], B.l2[1], u)],
    a1: [lerp(A.a1[0], B.a1[0], u), lerp(A.a1[1], B.a1[1], u)], a2: [lerp(A.a2[0], B.a2[0], u), lerp(A.a2[1], B.a2[1], u)],
  });
  const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

  const GROUND = 90;
  function frames(ex) {
    let poses = ex.poses;
    if (poses.length === 1) poses = [poses[0], { ...poses[0], t: poses[0].t + 2.5, lift: (poses[0].lift || 0) + 0.6 }];
    const S = poses.length > 2 ? 5 : 7;
    const out = [];
    poses.forEach((A, i) => {
      const B = poses[(i + 1) % poses.length];
      for (let s = 0; s < S; s++) out.push(lerpPose(A, B, ease(s / S)));
    });
    out.push(poses[0]);
    // ground each frame (lowest point touches the floor) and anchor horizontally
    const pts = out.map((p) => {
      const j = joints(p, ex.view === 'front');
      let maxY = -Infinity;
      Object.entries(j).forEach(([k, v]) => { maxY = Math.max(maxY, k === 'hd' ? v[1] + 3 : v[1]); });
      const dy = GROUND - 2.6 - maxY - p.lift;
      Object.values(j).forEach((v) => { v[1] += dy; });
      return j;
    });
    // keep the anchor point (e.g. the planted foot) still across frames
    const anchor = ex.anchor || 'f1';
    const ax = pts[0][anchor][0];
    pts.forEach((j) => { const dx = ax - j[anchor][0]; Object.values(j).forEach((v) => { v[0] += dx; }); });
    // centre the whole motion and shrink it if it doesn't fit the 100×100 box
    const all = pts.flatMap((j) => Object.values(j));
    const minX = Math.min(...all.map((v) => v[0])) - 3; const maxX = Math.max(...all.map((v) => v[0])) + 3;
    const minY = Math.min(...all.map((v) => v[1])) - 6;
    const sc = Math.min(1, 92 / (maxX - minX), (GROUND - 4) / (GROUND - minY));
    const cx = (minX + maxX) / 2;
    all.forEach((v) => { v[0] = 50 + (v[0] - cx) * sc; v[1] = GROUND - (GROUND - v[1]) * sc; });
    return pts;
  }

  const cache = {};
  const f1 = (n) => n.toFixed(1);
  const ptsStr = (j, keys) => keys.map((k) => `${f1(j[k][0])},${f1(j[k][1])}`).join(' ');

  function figure(ex, { cls = '', still = false } = {}) {
    if (!ex.poses) return customFigure(ex, cls);
    const fr = cache[ex.id] || (cache[ex.id] = frames(ex));
    const front = ex.view === 'front';
    const dur = `${(ex.tempo || 1.1) * Math.max(ex.poses.length, 2)}s`;
    const kt = fr.map((_, i) => (i / (fr.length - 1)).toFixed(3)).join(';');
    const anim = (attr, vals) => (still ? '' : `<animate attributeName="${attr}" dur="${dur}" repeatCount="indefinite" keyTimes="${kt}" values="${vals.join(';')}"/>`);
    const poly = (keys, c) => `<polyline class="${c}" points="${ptsStr(fr[0], keys)}">${anim('points', fr.map((j) => ptsStr(j, keys)))}</polyline>`;
    const dot = (k, c, r) => `<circle class="${c}" r="${r}" cx="${f1(fr[0][k][0])}" cy="${f1(fr[0][k][1])}">${anim('cx', fr.map((j) => f1(j[k][0])))}${anim('cy', fr.map((j) => f1(j[k][1])))}</circle>`;
    const legK = front ? ['h', 'k1', 'f1'] : ['h', 'k1', 'f1', 't1'];
    const legK2 = front ? ['h', 'k2', 'f2'] : ['h', 'k2', 'f2', 't2'];
    const xs = fr[0];
    let props = '';
    (ex.props || []).forEach((pr) => {
      const at = fr[pr.frame || 0][pr.at || 'h'];
      if (pr.type === 'wall') props += `<rect class="prop" x="${f1(at[0] + (pr.dx || -4) - 3)}" y="18" width="3" height="${GROUND - 18}" rx="1.5"/>`;
      if (pr.type === 'chair') {
        const top = at[1] + 2.5; const x = at[0] + (pr.dx || -14);
        props += `<path class="prop-line" d="M${f1(x)},${f1(top)} h16 M${f1(x + 1.5)},${f1(top)} V${GROUND} M${f1(x + 14.5)},${f1(top)} V${GROUND} M${f1(x + 1.5)},${f1(top)} V${f1(top - 20)}"/>`;
      }
      if (pr.type === 'box') {
        const top = at[1] + 2.5;
        props += `<rect class="prop" x="${f1(at[0] - 9)}" y="${f1(top)}" width="20" height="${f1(GROUND - top)}" rx="2"/>`;
      }
    });
    const db = (ex.props || []).some((p) => p.type === 'db');
    return `<svg class="fig ${cls}" viewBox="0 0 100 100" aria-hidden="true">
      <ellipse class="fig-shadow" cx="${f1(xs.h[0])}" cy="${GROUND + 1}" rx="24" ry="2.6"/>
      <line class="fig-floor" x1="4" x2="96" y1="${GROUND + 0.5}" y2="${GROUND + 0.5}"/>
      ${props}
      <g class="${front ? 'front' : ''}">
        ${poly(legK2, 'far')}${poly(['s', 'e2', 'w2'], 'far')}${db ? dot('w2', 'db far-db', 3.2) : ''}
        ${poly(['h', 's', 'nk'], 'near')}${poly(legK, 'near')}${poly(['s', 'e1', 'w1'], 'near')}
        ${dot('hd', 'head', 5.2)}${db ? dot('w1', 'db', 3.4) : ''}
      </g></svg>`;
  }

  function customFigure(ex, cls) {
    if (ex.image) return `<img class="fig fig-img ${cls}" src="${PD.esc(ex.image)}" alt="${PD.esc(ex.name)}" loading="lazy">`;
    return `<div class="fig fig-emoji ${cls}" aria-hidden="true">${PD.esc(ex.emoji || '🏋️')}</div>`;
  }

  /* ---------------- library ---------------- */
  // Reusable poses
  const STAND = P({ a: [4, 4] });
  const SQUAT = P({ t: 38, l: { to: [9, 21] }, a: [88, 92] });
  const PLANK_HI = P({ t: 66, l: [-66, -66], a: [0, 0], toe: 15 });
  const PUSH_DN = P({ t: 82, l: [-82, -82], a: { to: [-4.6, 8.5], bend: -1 }, toe: 15 });
  const PLANK_LO = P({ t: 78, l: [-78, -78], a: [0, 90], toe: 15 });
  const QUAD = P({ t: 74, l: [0, -90], a: [0, 0], toe: -90 });
  const BACK = { t: -90, toe: 180 }; // lying on back, head to the left
  const FOLD = P({ t: 150, a: [55, 55], l: [3, -3] });
  const runArms = (s) => (s ? { a1: [55, 150], a2: [-45, 35] } : { a1: [-45, 35], a2: [55, 150] });

  const E = [
    // ---------- Lower body ----------
    { id: 'squat', name: 'Squats', cat: 'Lower body', muscles: 'Quads, glutes, hamstrings', mode: 'reps', value: 15, met: 5, level: 1,
      steps: ['Feet shoulder-width apart, toes slightly out.', 'Push your hips back and bend your knees as if sitting on a chair.', 'Go down until thighs are about parallel, chest up.', 'Drive through your heels back to standing.'],
      tip: 'Keep your knees in line with your toes and your heels on the floor.', poses: [STAND, SQUAT] },
    { id: 'jumpsquat', name: 'Jump squats', cat: 'Lower body', muscles: 'Quads, glutes, calves', mode: 'time', value: 30, met: 8, level: 2, tempo: 0.7,
      steps: ['Lower into a squat with arms forward.', 'Explode up and jump, swinging your arms overhead.', 'Land softly with bent knees and go straight into the next squat.'],
      tip: 'Land quietly — soft knees protect your joints.', poses: [SQUAT, P({ a: [175, 178], lift: 9, toe: 40 })] },
    { id: 'lunge', name: 'Alternating lunges', cat: 'Lower body', muscles: 'Quads, glutes', mode: 'reps', value: 12, side: true, met: 5, level: 1,
      steps: ['Stand tall, hands on hips.', 'Step forward and lower until both knees are at about 90°.', 'Push off the front foot back to standing and switch legs.'],
      tip: 'Keep your torso upright and front knee above the ankle.', anchor: 'f1',
      poses: [P({ a: [-28, 68], l1: [0, 0], l2: [0, 0] }), P({ a: [-28, 68], l1: [88, 0], l2: [-28, -96] })] },
    { id: 'sidelunge', name: 'Side lunges', cat: 'Lower body', muscles: 'Adductors, glutes, quads', mode: 'reps', value: 10, side: true, met: 5, level: 2, view: 'front',
      steps: ['Stand with feet wide apart.', 'Shift your weight to one side, bending that knee and pushing the hips back.', 'Keep the other leg straight, then push back to the centre.'],
      tip: 'Keep both feet flat and pointing forward.',
      poses: [P({ l1: [27, 27], l2: [-27, -27], a1: [25, -60], a2: [-25, 60] }), P({ t: 8, l1: { to: [6, 20], bend: 1 }, l2: { to: [-26, 20], bend: 1 }, a1: [35, -50], a2: [-15, 70] })] },
    { id: 'sumo', name: 'Sumo squats', cat: 'Lower body', muscles: 'Glutes, inner thighs', mode: 'reps', value: 15, met: 5, level: 1, view: 'front',
      steps: ['Stand wide with toes turned out.', 'Lower your hips straight down, knees tracking over the toes.', 'Squeeze your glutes to come back up.'],
      tip: 'Push your knees out the whole way.',
      poses: [P({ l1: [30, 30], l2: [-30, -30], a1: [25, -70], a2: [-25, 70] }), P({ l1: { to: [17.5, 15], bend: 1 }, l2: { to: [-17.5, 15], bend: -1 }, a1: [25, -70], a2: [-25, 70] })] },
    { id: 'bridge', name: 'Glute bridges', cat: 'Lower body', muscles: 'Glutes, hamstrings', mode: 'reps', value: 15, met: 3.5, level: 1, anchor: 'f1',
      steps: ['Lie on your back, knees bent, feet flat near your hips.', 'Press through your heels and lift your hips.', 'Squeeze your glutes at the top, then lower slowly.'],
      tip: 'Make a straight line from knees to shoulders at the top.',
      poses: [P({ ...BACK, l: { to: [22, 0], bend: 1 }, a: [90, 90], toe: 100 }), P({ t: -124, l: { to: [18, 14], bend: 1 }, a: [70, 90], toe: 100 })] },
    { id: 'wallsit', name: 'Wall sit', cat: 'Lower body', muscles: 'Quads, glutes', mode: 'time', value: 45, met: 4, level: 2, equip: 'wall',
      steps: ['Lean your back flat against a wall.', 'Slide down until your knees are at 90°.', 'Hold, keeping your back against the wall.'],
      tip: 'Breathe steadily and keep your weight in your heels.', props: [{ type: 'wall', at: 'h', dx: -2 }],
      poses: [P({ l: [90, 0], a: [5, 5] })] },
    { id: 'calf', name: 'Calf raises', cat: 'Lower body', muscles: 'Calves', mode: 'reps', value: 20, met: 3, level: 1, tempo: 0.8,
      steps: ['Stand tall with feet hip-width apart.', 'Rise up onto the balls of your feet.', 'Pause at the top, then lower slowly.'],
      tip: 'Hold onto a wall or chair for balance if you need to.', poses: [STAND, P({ a: [4, 4], toe: 30 })] },
    { id: 'donkey', name: 'Donkey kicks', cat: 'Lower body', muscles: 'Glutes', mode: 'reps', value: 12, side: true, met: 3.5, level: 1, anchor: 'w1',
      steps: ['Start on hands and knees.', 'Keeping the knee bent at 90°, kick one foot up towards the ceiling.', 'Lower with control without touching the floor.'],
      tip: "Don't arch your lower back — brace your core.", poses: [QUAD, P({ t: 74, l1: [-95, 175], l2: [0, -90], a: [0, 0], toe: -90 })] },
    { id: 'sldl', name: 'Single-leg deadlift', cat: 'Lower body', muscles: 'Hamstrings, glutes, balance', mode: 'reps', value: 10, side: true, met: 4, level: 2,
      steps: ['Stand on one leg with a soft knee.', 'Hinge forward at the hips while the other leg extends behind you.', 'Lower until your body is parallel to the floor, then return.'],
      tip: 'Keep your hips square to the floor.', poses: [STAND, P({ t: 88, l1: [6, -4], l2: [-90, -90], a: [0, 0] })] },
    { id: 'stepup', name: 'Step-ups', cat: 'Lower body', muscles: 'Quads, glutes', mode: 'reps', value: 12, side: true, met: 6, level: 1, equip: 'chair', anchor: 'f2',
      steps: ['Stand in front of a sturdy chair or step.', 'Place one foot fully on the step and push up until standing.', 'Step back down with control.'],
      tip: 'Use a step that is stable and does not slide.', props: [{ type: 'box', at: 'f1', frame: 7 }],
      poses: [P({ a: [4, 4] }), P({ t: 10, l1: { to: [9, 17] }, l2: [-4, -4], ...runArms(0) })] },

    // ---------- Upper body ----------
    { id: 'pushup', name: 'Push-ups', cat: 'Upper body', muscles: 'Chest, shoulders, triceps', mode: 'reps', value: 12, met: 6, level: 2,
      steps: ['Start in a high plank, hands slightly wider than shoulders.', 'Lower your chest towards the floor, elbows at about 45°.', 'Push back up to a straight-arm plank.'],
      tip: 'Keep a straight line from head to heels.', poses: [PLANK_HI, PUSH_DN] },
    { id: 'kneepush', name: 'Knee push-ups', cat: 'Upper body', muscles: 'Chest, shoulders, triceps', mode: 'reps', value: 12, met: 4, level: 1, anchor: 'k1',
      steps: ['Start on your hands and knees, then walk your hands forward.', 'Lower your chest towards the floor.', 'Push back up, keeping your hips in line.'],
      tip: 'Great to build strength towards full push-ups.',
      poses: [P({ t: 55, l: [-55, -105], a: [0, 0], toe: -100 }), P({ t: 79, l: [-79, -120], a: { to: [-6.8, 8], bend: -1 }, toe: -100 })] },
    { id: 'dips', name: 'Triceps dips', cat: 'Upper body', muscles: 'Triceps, shoulders', mode: 'reps', value: 12, met: 5, level: 2, equip: 'chair', anchor: 'w1',
      steps: ['Sit on the edge of a chair, hands next to your hips.', 'Slide forward off the seat and bend your elbows to lower.', 'Press back up until your arms are straight.'],
      tip: 'Keep your back close to the chair and elbows pointing back.', props: [{ type: 'chair', at: 'w1', dx: -14 }],
      poses: [P({ l: { to: [22, 30] }, a: [-10, -10] }), P({ l: { to: [22, 21] }, a: { to: [-4.2, 13.6], bend: -1 } })] },
    { id: 'pike', name: 'Pike push-ups', cat: 'Upper body', muscles: 'Shoulders, triceps', mode: 'reps', value: 8, met: 6, level: 3, anchor: 'f1',
      steps: ['Start in a downward-dog position, hips high.', 'Bend your elbows and lower the top of your head towards the floor.', 'Push back up.'],
      tip: 'The more upright your torso, the harder it gets.',
      poses: [P({ t: 140, l: [-38, -38], a: [28, 28], toe: 20 }), P({ t: 152, l: [-38, -38], a: { to: [12, 13], bend: -1 }, hd: 8, toe: 20 })] },
    { id: 'taps', name: 'Plank shoulder taps', cat: 'Upper body', muscles: 'Shoulders, core', mode: 'time', value: 30, met: 5, level: 2, tempo: 0.7,
      steps: ['Hold a high plank with feet a little wider apart.', 'Lift one hand and tap the opposite shoulder.', 'Alternate sides without rocking your hips.'],
      tip: 'Widen your feet to make it more stable.', poses: [PLANK_HI, P({ t: 66, l: [-66, -66], a1: [70, -150], a2: [0, 0], toe: 15 })] },
    { id: 'superman', name: 'Superman', cat: 'Upper body', muscles: 'Lower back, glutes, shoulders', mode: 'reps', value: 12, met: 3.5, level: 1, anchor: 'h',
      steps: ['Lie face down with arms extended in front.', 'Lift your arms, chest and legs off the floor at the same time.', 'Hold briefly, then lower with control.'],
      tip: 'Look at the floor to keep your neck neutral.',
      poses: [P({ t: 90, l: [-90, -90], a: [90, 90], toe: -90 }), P({ t: 78, l: [-80, -80], a: [102, 102], toe: -85 })] },
    { id: 'updown', name: 'Plank up-downs', cat: 'Upper body', muscles: 'Shoulders, triceps, core', mode: 'time', value: 30, met: 6, level: 2, tempo: 0.9,
      steps: ['Start in a forearm plank.', 'Press up onto one hand, then the other, into a high plank.', 'Lower back down one forearm at a time.'],
      tip: 'Keep your hips as still as possible.', poses: [PLANK_LO, PLANK_HI] },
    { id: 'armcircle', name: 'Arm circles', cat: 'Upper body', muscles: 'Shoulders', mode: 'time', value: 30, met: 2.5, level: 1, view: 'front', tempo: 0.5,
      steps: ['Stand tall with arms out to the sides at shoulder height.', 'Make small circles, gradually getting bigger.', 'Switch direction halfway.'],
      tip: 'Keep your shoulders down, away from your ears.',
      poses: [P({ l1: [8, 8], l2: [-8, -8], a1: [88, 88], a2: [-88, -88] }), P({ l1: [8, 8], l2: [-8, -8], a1: [104, 104], a2: [-104, -104] })] },

    // ---------- Dumbbells ----------
    { id: 'curl', name: 'Biceps curls', cat: 'Upper body', muscles: 'Biceps', mode: 'reps', value: 12, met: 3.5, level: 1, equip: 'dumbbells', props: [{ type: 'db' }],
      steps: ['Stand with a dumbbell in each hand, palms forward.', 'Curl the weights up while keeping your elbows at your sides.', 'Lower slowly.'],
      tip: "Don't swing — control the way down.", poses: [P({ a: [2, 2] }), P({ a: [6, 155] })] },
    { id: 'press', name: 'Shoulder press', cat: 'Upper body', muscles: 'Shoulders, triceps', mode: 'reps', value: 10, met: 4, level: 2, equip: 'dumbbells', view: 'front', props: [{ type: 'db' }],
      steps: ['Hold dumbbells at shoulder height, palms forward.', 'Press them overhead until your arms are straight.', 'Lower back to your shoulders.'],
      tip: 'Brace your core so your lower back does not arch.',
      poses: [P({ l1: [6, 6], l2: [-6, -6], a1: [92, 178], a2: [-92, -178] }), P({ l1: [6, 6], l2: [-6, -6], a1: [165, 172], a2: [-165, -172] })] },
    { id: 'row', name: 'Bent-over rows', cat: 'Upper body', muscles: 'Back, biceps', mode: 'reps', value: 12, met: 4, level: 2, equip: 'dumbbells', props: [{ type: 'db' }],
      steps: ['Hinge forward at the hips, back flat, dumbbells hanging.', 'Pull the weights towards your hips, squeezing your shoulder blades.', 'Lower with control.'],
      tip: 'Lead with your elbows, not your hands.',
      poses: [P({ t: 62, l: [12, -10], a: [0, 0] }), P({ t: 62, l: [12, -10], a: { to: [-6, 10], bend: -1 } })] },
    { id: 'goblet', name: 'Goblet squats', cat: 'Lower body', muscles: 'Quads, glutes, core', mode: 'reps', value: 12, met: 5, level: 2, equip: 'dumbbells', props: [{ type: 'db' }],
      steps: ['Hold one dumbbell vertically against your chest.', 'Squat down between your knees, elbows inside the knees.', 'Drive back up through your heels.'],
      tip: 'Keep the weight close to your body.', poses: [P({ a: [12, 168] }), P({ t: 38, l: { to: [9, 21] }, a: [40, 175] })] },
    { id: 'rdl', name: 'Romanian deadlift', cat: 'Lower body', muscles: 'Hamstrings, glutes, back', mode: 'reps', value: 12, met: 4, level: 2, equip: 'dumbbells', props: [{ type: 'db' }],
      steps: ['Stand holding dumbbells in front of your thighs.', 'Push your hips back with soft knees, sliding the weights down your legs.', 'Stop when you feel a hamstring stretch, then stand up.'],
      tip: 'Keep your back flat throughout.', poses: [P({ a: [2, 2] }), P({ t: 75, l: [-10, 6], a: [0, 0] })] },

    // ---------- Core ----------
    { id: 'plank', name: 'Plank', cat: 'Core', muscles: 'Core, shoulders', mode: 'time', value: 40, met: 3.5, level: 1,
      steps: ['Rest on your forearms, elbows under your shoulders.', 'Lift your hips into a straight line from head to heels.', 'Brace your core and hold.'],
      tip: "Squeeze your glutes and don't let your hips sag.", poses: [PLANK_LO] },
    { id: 'sideplank', name: 'Side plank', cat: 'Core', muscles: 'Obliques, shoulders', mode: 'time', value: 30, side: true, met: 3.5, level: 2, view: 'front', anchor: 'w1',
      steps: ['Lie on your side, elbow under your shoulder.', 'Lift your hips so your body forms a straight line.', 'Hold, then switch sides.'],
      tip: 'Stack your feet, or stagger them for more balance.',
      poses: [P({ t: 76, l: [-76, -76], a1: [0, 90], a2: [176, 178] }), P({ t: 72, l: [-80, -80], a1: [0, 90], a2: [150, 160] })] },
    { id: 'crunch', name: 'Crunches', cat: 'Core', muscles: 'Abs', mode: 'reps', value: 20, met: 3.5, level: 1,
      steps: ['Lie on your back, knees bent, fingertips behind your ears.', 'Curl your shoulders off the floor using your abs.', 'Lower slowly.'],
      tip: "Don't pull on your neck; look at the ceiling.",
      poses: [P({ ...BACK, l: { to: [22, 0] }, a: [-130, -55], toe: 100 }), P({ t: -62, l: { to: [22, 0] }, a: [-105, -30], toe: 100 })] },
    { id: 'bicycle', name: 'Bicycle crunches', cat: 'Core', muscles: 'Abs, obliques', mode: 'time', value: 30, met: 4, level: 2, anchor: 'h', tempo: 0.7,
      steps: ['Lie on your back, hands behind your head, legs lifted.', 'Bring one knee in while rotating the opposite elbow towards it.', 'Switch sides in a pedalling motion.'],
      tip: 'Slow and controlled beats fast and sloppy.',
      poses: [P({ t: -66, l1: [158, 82], l2: [96, 96], a: [-120, -48], toe: 100 }), P({ t: -66, l1: [96, 96], l2: [158, 82], a: [-120, -48], toe: 100 })] },
    { id: 'legraise', name: 'Leg raises', cat: 'Core', muscles: 'Lower abs, hip flexors', mode: 'reps', value: 12, met: 3.5, level: 2, anchor: 'h',
      steps: ['Lie on your back with legs straight, hands under your hips.', 'Lift your legs to vertical keeping them straight.', 'Lower slowly without touching the floor.'],
      tip: 'Press your lower back into the floor.', poses: [P({ ...BACK, l: [96, 96], a: [90, 90], toe: 100 }), P({ ...BACK, l: [176, 176], a: [90, 90], toe: 170 })] },
    { id: 'twist', name: 'Russian twists', cat: 'Core', muscles: 'Obliques, abs', mode: 'time', value: 30, met: 4, level: 2, anchor: 'h', tempo: 0.6,
      steps: ['Sit with knees bent, lean back slightly and lift your feet.', 'Rotate your torso to tap the floor beside your hip.', 'Alternate sides.'],
      tip: 'Keep your chest up and back straight.',
      poses: [P({ t: -35, l: [122, 62], a1: [72, 110], a2: [52, 88], toe: 120 }), P({ t: -35, l: [122, 62], a1: [40, 70], a2: [92, 125], toe: 120 })] },
    { id: 'deadbug', name: 'Dead bug', cat: 'Core', muscles: 'Deep core', mode: 'reps', value: 10, side: true, met: 3, level: 1, anchor: 'h',
      steps: ['Lie on your back, arms up, knees bent at 90° above your hips.', 'Lower one arm overhead and the opposite leg towards the floor.', 'Return and switch sides.'],
      tip: 'Move slowly and keep your lower back on the floor.',
      poses: [P({ ...BACK, l: [178, 90], a: [180, 180], toe: 120 }), P({ ...BACK, l1: [96, 96], l2: [178, 90], a1: [180, 180], a2: [-96, -96], toe: 120 })] },
    { id: 'flutter', name: 'Flutter kicks', cat: 'Core', muscles: 'Lower abs', mode: 'time', value: 30, met: 4, level: 2, anchor: 'h', tempo: 0.4,
      steps: ['Lie on your back, legs straight and lifted a little.', 'Kick your legs up and down in small, quick movements.', 'Keep breathing.'],
      tip: 'Lift your shoulders slightly for an extra challenge.',
      poses: [P({ t: -84, l1: [108, 108], l2: [96, 96], a: [90, 90], toe: 110 }), P({ t: -84, l1: [96, 96], l2: [108, 108], a: [90, 90], toe: 110 })] },
    { id: 'hollow', name: 'Hollow hold', cat: 'Core', muscles: 'Abs', mode: 'time', value: 20, met: 3.5, level: 3, anchor: 'h',
      steps: ['Lie on your back with arms overhead.', 'Lift your shoulders and legs a few centimetres off the floor.', 'Hold a banana shape with your lower back pressed down.'],
      tip: 'Bend your knees to make it easier.', poses: [P({ t: -76, l: [103, 103], a: [-104, -104], toe: 110 })] },
    { id: 'birddog', name: 'Bird dog', cat: 'Core', muscles: 'Core, lower back, glutes', mode: 'reps', value: 10, side: true, met: 3, level: 1, anchor: 'k1',
      steps: ['Start on hands and knees.', 'Extend one arm forward and the opposite leg back.', 'Hold for a second, return, and switch.'],
      tip: 'Imagine balancing a glass of water on your back.', poses: [QUAD, P({ t: 74, l1: [0, -90], l2: [-92, -92], a1: [96, 96], a2: [0, 0], toe: -90 })] },
    { id: 'climber', name: 'Mountain climbers', cat: 'Cardio', muscles: 'Core, shoulders, cardio', mode: 'time', value: 30, met: 8, level: 2, anchor: 'w1', tempo: 0.4,
      steps: ['Start in a high plank.', 'Drive one knee towards your chest, then switch legs quickly.', 'Keep your hips low and back flat.'],
      tip: 'Go as fast as you can with good form.',
      poses: [P({ t: 66, l1: [42, -40], l2: [-66, -66], a: [0, 0], toe: 15 }), P({ t: 66, l1: [-66, -66], l2: [42, -40], a: [0, 0], toe: 15 })] },

    // ---------- Cardio / full body ----------
    { id: 'jacks', name: 'Jumping jacks', cat: 'Cardio', muscles: 'Full body, cardio', mode: 'time', value: 30, met: 8, level: 1, view: 'front', tempo: 0.45,
      steps: ['Stand with feet together and arms at your sides.', 'Jump your feet out while raising your arms overhead.', 'Jump back to the start.'],
      tip: 'Stay light on the balls of your feet.',
      poses: [P({ l1: [4, 4], l2: [-4, -4], a1: [12, 12], a2: [-12, -12] }), P({ l1: [22, 22], l2: [-22, -22], a1: [162, 168], a2: [-162, -168] })] },
    { id: 'highknees', name: 'High knees', cat: 'Cardio', muscles: 'Hip flexors, cardio', mode: 'time', value: 30, met: 8, level: 1, tempo: 0.32,
      steps: ['Run on the spot.', 'Drive your knees up to hip height.', 'Pump your arms.'],
      tip: 'Stay on the balls of your feet.', anchor: 'h',
      poses: [P({ l1: [95, -5], l2: [0, 0], ...runArms(1), toe: 50, lift: 2 }), P({ l1: [0, 0], l2: [95, -5], ...runArms(0), toe: 50, lift: 2 })] },
    { id: 'buttkicks', name: 'Butt kicks', cat: 'Cardio', muscles: 'Hamstrings, cardio', mode: 'time', value: 30, met: 7, level: 1, tempo: 0.32, anchor: 'h',
      steps: ['Jog on the spot.', 'Kick your heels up towards your glutes.', 'Keep your knees pointing down.'],
      tip: 'Use your arms to keep the rhythm.',
      poses: [P({ l1: [-6, -160], l2: [0, 0], ...runArms(1), toe: 50 }), P({ l1: [0, 0], l2: [-6, -160], ...runArms(0), toe: 50 })] },
    { id: 'burpee', name: 'Burpees', cat: 'Full body', muscles: 'Full body, cardio', mode: 'time', value: 30, met: 8.5, level: 3, tempo: 0.5,
      steps: ['From standing, squat down and place your hands on the floor.', 'Jump your feet back into a plank.', 'Jump your feet back in, then explode up with a jump.'],
      tip: 'Step back instead of jumping to make it easier.',
      poses: [P({ a: [176, 178], lift: 7, toe: 40 }), P({ t: 50, l: { to: [8, 15] }, a: [40, 40] }), PLANK_HI, P({ t: 50, l: { to: [8, 15] }, a: [40, 40] })] },
    { id: 'inchworm', name: 'Inchworms', cat: 'Full body', muscles: 'Hamstrings, shoulders, core', mode: 'reps', value: 8, met: 5, level: 2, tempo: 0.9,
      steps: ['Stand tall, then fold forward and place your hands on the floor.', 'Walk your hands out to a plank.', 'Walk your hands back to your feet and stand up.'],
      tip: 'Bend your knees slightly if your hamstrings are tight.', poses: [STAND, FOLD, PLANK_HI, FOLD] },
    { id: 'boxing', name: 'Shadow boxing', cat: 'Cardio', muscles: 'Shoulders, arms, cardio', mode: 'time', value: 45, met: 7, level: 1, tempo: 0.35,
      steps: ['Stand in a staggered stance, fists up.', 'Throw quick straight punches, alternating arms.', 'Stay light on your feet.'],
      tip: 'Rotate your hips into every punch.',
      poses: [P({ l1: [14, 0], l2: [-14, 0], a1: [90, 90], a2: [25, 155] }), P({ l1: [14, 0], l2: [-14, 0], a1: [25, 155], a2: [90, 90] })] },
    { id: 'rope', name: 'Jump rope (no rope)', cat: 'Cardio', muscles: 'Calves, cardio', mode: 'time', value: 45, met: 8, level: 1, tempo: 0.28,
      steps: ['Hold imaginary handles at hip height.', 'Make small circles with your wrists while hopping.', 'Land softly on the balls of your feet.'],
      tip: 'Small, quick hops — just a few centimetres.', poses: [P({ a: [16, 70], toe: 90 }), P({ a: [12, 60], lift: 5, toe: 40 })] },

    // ---------- Mobility ----------
    { id: 'toetouch', name: 'Standing toe touch', cat: 'Mobility', muscles: 'Hamstrings, lower back', mode: 'time', value: 30, met: 2.3, level: 1, tempo: 1.6,
      steps: ['Stand tall and reach your arms overhead.', 'Slowly fold forward, reaching for your toes.', 'Let your head hang and breathe.'],
      tip: 'Bend your knees as much as you need.', poses: [P({ a: [178, 180] }), FOLD] },
    { id: 'catcow', name: 'Cat-cow', cat: 'Mobility', muscles: 'Spine', mode: 'time', value: 40, met: 2.3, level: 1, anchor: 'k1', tempo: 1.8,
      steps: ['Start on hands and knees.', 'Inhale: drop your belly and look up (cow).', 'Exhale: round your back and tuck your chin (cat).'],
      tip: 'Move with your breath.', poses: [P({ t: 70, hd: -35, l: [0, -90], a: [0, 0], toe: -90 }), P({ t: 78, hd: 55, l: [0, -90], a: [0, 0], toe: -90 })] },
    { id: 'child', name: "Child's pose", cat: 'Mobility', muscles: 'Back, hips, shoulders', mode: 'time', value: 40, met: 2, level: 1, anchor: 'k1', tempo: 2,
      steps: ['Kneel and sit back on your heels.', 'Walk your hands forward and lower your chest to the floor.', 'Relax and breathe deeply.'],
      tip: 'Widen your knees for a deeper hip stretch.',
      poses: [QUAD, P({ t: 97, hd: 12, l: [80, -92], a: [86, 86], toe: -90 })] },
    { id: 'cobra', name: 'Cobra stretch', cat: 'Mobility', muscles: 'Abs, hip flexors, spine', mode: 'time', value: 30, met: 2, level: 1, anchor: 'h', tempo: 1.8,
      steps: ['Lie face down, hands under your shoulders.', 'Press up, lifting your chest while your hips stay down.', 'Relax your shoulders and hold.'],
      tip: 'Only go as high as is comfortable for your lower back.',
      poses: [P({ t: 90, l: [-90, -90], a: [-150, 30], toe: -90 }), P({ t: 42, hd: -12, l: [-92, -92], a: [8, 8], toe: -90 })] },
    { id: 'hipflexor', name: 'Kneeling hip flexor stretch', cat: 'Mobility', muscles: 'Hip flexors, quads', mode: 'time', value: 30, side: true, met: 2, level: 1, anchor: 'f1', tempo: 2,
      steps: ['Kneel on one knee, the other foot in front.', 'Tuck your pelvis and shift your hips forward.', 'Hold, then switch sides.'],
      tip: 'Squeeze the glute of the back leg.',
      poses: [P({ l1: [80, 0], l2: [-15, -92], a: [-28, 68] }), P({ t: -6, l1: [62, -12], l2: [-32, -95], a: [-28, 68] })] },
    { id: 'quad', name: 'Standing quad stretch', cat: 'Mobility', muscles: 'Quads', mode: 'time', value: 30, side: true, met: 2, level: 1, anchor: 'f1', tempo: 2,
      steps: ['Stand on one leg (use a wall for balance).', 'Grab the other ankle and pull your heel towards your glute.', 'Keep your knees together and hold.'],
      tip: 'Stand tall — don\'t lean forward.', poses: [P({ l2: [-8, -168], a2: { to: [-8, 23], bend: -1 }, a1: [90, 90] })] },
    { id: 'sidebend', name: 'Standing side bend', cat: 'Mobility', muscles: 'Obliques, lats', mode: 'time', value: 30, met: 2, level: 1, view: 'front', tempo: 1.8,
      steps: ['Stand with feet hip-width apart.', 'Reach one arm overhead and lean to the opposite side.', 'Return and switch sides.'],
      tip: 'Keep your hips still and lengthen through your fingertips.',
      poses: [P({ t: -16, l1: [8, 8], l2: [-8, -8], a1: [165, 205], a2: [-12, -12] }), P({ t: 16, l1: [8, 8], l2: [-8, -8], a1: [12, 12], a2: [-165, -205] })] },
  ];

  E.forEach((e) => { e.equip = e.equip || 'none'; });

  const CATS = ['Lower body', 'Upper body', 'Core', 'Cardio', 'Full body', 'Mobility'];
  const EQUIP = { none: 'No equipment', chair: 'Chair', wall: 'Wall', dumbbells: 'Dumbbells' };

  PD.EXERCISES = E;
  PD.exercises = {
    list: E, CATS, EQUIP, figure,
    byId: (id) => E.find((e) => e.id === id) || (PD.store.get('workouts').custom || []).find((e) => e.id === id),
    videoUrl: (ex) => {
      const m = PD.store.get('workouts').media[ex.id] || ex.video;
      return m || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} exercise proper form`)}`;
    },
  };
})(window.PD);
