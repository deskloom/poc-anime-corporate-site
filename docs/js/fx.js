/* 前景FX（2D canvas・加算合成）：奥行きのある光の粒＋光の精霊「ともり」。
   ともりは粒子とリボンだけで形づくる、抽象的で静かな存在（仮のキャラクター表現）。 */
(function () {
  'use strict';
  var HS = window.HS;
  var TAU = Math.PI * 2;
  function rnd(s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  /* シーンごとのポーズ：lean 傾き / arm 腕の上がり / spread リボンの広がり / sway 揺れの量 / x,y 位置(横の割合) */
  var POSE = [
    { lean: 0.00, arm: 0.25, spread: 0.0, sway: 1.0, x: 0.74 },
    { lean: -0.04, arm: 1.0, spread: 0.2, sway: 1.0, x: 0.76 },
    { lean: 0.05, arm: 0.5, spread: 1.0, sway: 1.8, x: 0.72 },
    { lean: 0.0, arm: 0.0, spread: 0.1, sway: 0.4, x: 0.76 },
    { lean: 0.08, arm: 0.6, spread: 0.5, sway: 1.1, x: 0.72 }
  ];

  HS.createFX = function (canvas) {
    var ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = 1;
    var spr = document.createElement('canvas'); spr.width = spr.height = 64;
    var sc = spr.getContext('2d'), tint = '';
    function paint(r, g, b) {
      var key = r + ',' + g + ',' + b; if (key === tint) return; tint = key;
      sc.clearRect(0, 0, 64, 64);
      var gr = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,250,236,1)'); gr.addColorStop(0.18, 'rgba(' + r + ',' + g + ',' + b + ',.75)');
      gr.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',.18)'); gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
      sc.fillStyle = gr; sc.fillRect(0, 0, 64, 64);
    }
    var R = rnd(42), motes = [], body = [], sparks = [], i;
    for (i = 0; i < 110; i++) motes.push({ x: R(), y: R(), z: Math.pow(R(), 1.6), vx: (R() - 0.5) * 0.004, vy: -0.002 - R() * 0.006, ph: R() * 40 });
    for (i = 0; i < 190; i++) body.push({ t: Math.pow(R(), 0.8), th: R() * TAU, spd: 0.25 + R() * 0.6, rr: 0.4 + R() * 0.75, b: 0.4 + R() * 0.6, ph: R() * 20 });
    for (i = 0; i < 40; i++) sparks.push({ t0: R(), dx: (R() - 0.5) * 0.7, v: 0.25 + R() * 0.5, rate: 0.05 + R() * 0.09, off: R() });

    function glow(x, y, rad, a) {
      if (a <= 0.003 || rad < 0.5) return;
      ctx.globalAlpha = a > 1 ? 1 : a; ctx.drawImage(spr, x - rad, y - rad, rad * 2, rad * 2);
    }

    function spirit(cx, cy, S, time, pose, look, A) {
      var sway = Math.sin(time * 0.6) * 0.05 * pose.sway;
      var ax = function (t) { return Math.sin(time * 0.7 + t * 2.6) * 0.05 * (0.4 + t) * pose.sway + pose.lean * t + sway * (1 - t); };
      var Y = function (t) { return -0.95 + t * 1.85; };
      var X = function (x) { return cx + x * S; }, YY = function (y) { return cy + y * S; };
      var hx = X(ax(0)), hy = YY(Y(0));
      /* 大きなブルーム */
      glow(X(ax(0.45)), YY(Y(0.45)), S * 1.25, 0.16 * A);
      glow(hx, hy, S * 0.55, 0.5 * A);
      /* 体：流れるローブの形に集まる粒 */
      var k, p, t, r, ang, x, y, dep, col = 'rgb(' + look.ar + ',' + look.ag + ',' + look.ab + ')';
      for (k = 0; k < body.length; k++) {
        p = body[k]; t = p.t;
        r = (0.025 + 0.36 * Math.pow(t, 0.85)) * p.rr;
        ang = p.th + time * p.spd * (1 + t);
        x = ax(t) + r * Math.cos(ang); y = Y(t) + r * 0.16 * Math.sin(ang) + Math.sin(time * 0.9 + p.ph) * 0.014;
        dep = 0.55 + 0.45 * Math.sin(ang);
        glow(X(x), YY(y), S * (0.03 + 0.055 * p.b * (1 - 0.4 * t)), (1.0 - 0.6 * t) * dep * p.b * A);
      }
      /* 半透明のローブ：やわらかく光る輪郭 */
      var gw = function (t) { return 0.012 + 0.37 * Math.pow(t, 1.2); };
      ctx.globalCompositeOperation = 'lighter';
      var grd = ctx.createLinearGradient(0, YY(Y(0.02)), 0, YY(Y(1)));
      grd.addColorStop(0, 'rgba(' + look.lr + ',' + look.lg + ',' + look.lb + ',0)'); grd.addColorStop(0.18, 'rgba(' + look.lr + ',' + look.lg + ',' + look.lb + ',' + (0.34 * A).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(' + look.ar + ',' + look.ag + ',' + look.ab + ',0)');
      ctx.globalAlpha = 1; ctx.fillStyle = grd; ctx.beginPath();
      var tt, wob;
      for (tt = 0.02; tt <= 1.001; tt += 0.04) { wob = 1 + 0.07 * Math.sin(time * 1.1 + tt * 7); ctx.lineTo(X(ax(tt) - gw(tt) * wob), YY(Y(tt))); }
      for (tt = 1; tt >= 0.019; tt -= 0.04) { wob = 1 + 0.07 * Math.sin(time * 1.3 + tt * 6 + 2); ctx.lineTo(X(ax(tt) + gw(tt) * wob), YY(Y(tt))); }
      ctx.closePath(); ctx.fill();
      /* リボン：風になびく長い帯（後ろへ流れる） */
      ctx.lineCap = 'round';
      var u, px, py, qx, qy, rib, mixc = 'rgb(' + ((look.ar + look.lr) >> 1) + ',' + ((look.ag + look.lg) >> 1) + ',' + ((look.ab + look.lb) >> 1) + ')';
      for (rib = 0; rib < 6; rib++) {
        var ox = ax(0.1 + rib * 0.02) + 0.02, oy = Y(0.1 + rib * 0.03), dirx = 0.5 + rib * 0.1 + pose.spread * 0.3;
        px = ox; py = oy;
        for (u = 1; u <= 40; u++) {
          var f = u / 40, amp = 0.05 + 0.08 * pose.sway * f;
          qx = ox + f * dirx + Math.sin(f * 4.6 - time * 1.15 + rib * 1.3) * amp;
          qy = oy + f * (0.35 + rib * 0.1) + Math.sin(f * 3.2 + rib * 0.9 - time * 0.7) * 0.07 * f;
          var al = (1 - f) * (1 - f) * A; ctx.strokeStyle = mixc;
          ctx.globalAlpha = al * 0.13; ctx.lineWidth = S * 0.06 * (1 - f * 0.7); ctx.beginPath(); ctx.moveTo(X(px), YY(py)); ctx.lineTo(X(qx), YY(qy)); ctx.stroke();
          ctx.globalAlpha = al * 0.6; ctx.lineWidth = Math.max(0.7, S * 0.007 * (1 - f * 0.5)); ctx.beginPath(); ctx.moveTo(X(px), YY(py)); ctx.lineTo(X(qx), YY(qy)); ctx.stroke();
          px = qx; py = qy;
        }
      }
      /* 手にともす、小さなあかり */
      var raise = pose.arm, hxL = ax(0.2) + 0.2 + raise * 0.05, hyL = Y(0.2) - 0.08 - raise * 0.42;
      var sxs = ax(0.18) + 0.05, sys = Y(0.18);
      ctx.strokeStyle = col; ctx.globalAlpha = 0.5 * A; ctx.lineWidth = Math.max(0.8, S * 0.007);
      ctx.beginPath(); ctx.moveTo(X(sxs), YY(sys)); ctx.quadraticCurveTo(X(sxs + 0.16), YY(sys + 0.08), X(hxL), YY(hyL)); ctx.stroke();
      var pulse = 0.8 + 0.2 * Math.sin(time * 2.2);
      glow(X(hxL), YY(hyL), S * 0.2 * pulse, 0.95 * A); glow(X(hxL), YY(hyL), S * 0.07, A);
      /* 頭：あかりの核・淡い輪・星の瞬き */
      glow(hx, hy, S * 0.2, A); glow(hx, hy, S * 0.075, A);
      ctx.strokeStyle = 'rgb(255,235,190)'; ctx.globalAlpha = 0.28 * A; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hx, hy, S * (0.13 + Math.sin(time * 1.3) * 0.006), 0, TAU); ctx.stroke();
      var rot = time * 0.08, L = S * (0.2 + Math.sin(time * 1.9) * 0.02);
      ctx.globalAlpha = 0.5 * A; ctx.lineWidth = 1;
      for (k = 0; k < 4; k++) {
        var aa = rot + k * Math.PI / 2, g = ctx.createLinearGradient(hx, hy, hx + Math.cos(aa) * L, hy + Math.sin(aa) * L);
        g.addColorStop(0, 'rgba(255,240,200,.9)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(aa) * L, hy + Math.sin(aa) * L); ctx.stroke();
      }
      /* こぼれる光 */
      for (k = 0; k < sparks.length; k++) {
        p = sparks[k]; var life = (time * p.rate + p.off) % 1;
        glow(X(ax(p.t0) + p.dx * life * 0.6), YY(Y(0.3 + p.t0 * 0.5) + life * p.v), S * 0.022, (1 - life) * 0.8 * A);
      }
    }

    return {
      resize: function () {
        dpr = Math.min(window.devicePixelRatio || 1, 1.25);
        W = canvas.width = Math.floor(window.innerWidth * dpr); H = canvas.height = Math.floor(window.innerHeight * dpr);
      },
      /* st: {t, dt, ptr:{x,y}, look, pos, spiritA, story(0..1), still} */
      draw: function (st) {
        var time = st.t, look = st.look, k, m;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
        paint(look.lr, look.lg, look.lb);
        ctx.globalCompositeOperation = 'lighter';
        var px = st.ptr.x, py = st.ptr.y, sy = st.scrollY * 0.00025;
        for (k = 0; k < motes.length; k++) {
          m = motes[k];
          if (!st.still) { m.x += m.vx * st.dt * 60; m.y += m.vy * st.dt * 60; if (m.y < -0.05) m.y = 1.05; if (m.x < -0.05) m.x = 1.05; if (m.x > 1.05) m.x = -0.05; }
          var z = m.z, x = (m.x + px * z * 0.035) * W, y = (((m.y - sy * (0.3 + z)) % 1.1 + 1.1) % 1.1 - 0.05 + py * z * 0.02) * H;
          var tw = st.still ? 0.8 : 0.65 + 0.35 * Math.sin(time * 0.9 + m.ph);
          /* 手前ほど大きくぼける（ボケ）。奥は小さく鋭い */
          var rad = (2.2 + z * z * 34) * dpr, a = (z > 0.7 ? 0.2 : 0.75 - z * 0.35) * tw;
          glow(x, y, rad, a);
        }
        /* ともり */
        var sp = st.spirit;
        if (sp && sp.a > 0.01) {
          var pa = st.pose, base = Math.floor(st.pos), fr = st.pos - base, P0 = POSE[Math.min(4, Math.max(0, base))], P1 = POSE[Math.min(4, base + 1)];
          var pose = {}; for (var key in P0) pose[key] = P0[key] + (P1[key] - P0[key]) * fr;
          spirit(sp.x * W + px * 14 * dpr, sp.y * H + py * 8 * dpr, sp.s * H, time, pose, look, sp.a);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      },
      clear: function () { ctx.clearRect(0, 0, W, H); },
      poseX: function (pos) { var b = Math.floor(pos), f = pos - b; return POSE[Math.min(4, Math.max(0, b))].x * (1 - f) + POSE[Math.min(4, b + 1)].x * f; }
    };
  };
})();
