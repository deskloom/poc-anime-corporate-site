/* 背景：生のWebGL1・単一フラグメントシェーダー。外部ライブラリなし。
   夜空（fbm雲・星・ゴッドレイ・低い霧・地平線の光）を、シーンごとの“見た目パラメータ”で描く。
   シーン切り替えは、fbmのしきい値が画面を掃く“ノイズ・ディゾルブ”（縁が光る）。 */
(function () {
  'use strict';
  var HS = window.HS;

  function rgb(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  /* 1シーン = 7つのvec4。
     0: 空の上色rgb, 雲の密度  1: 空の下色rgb, 地平線の高さ  2: 雲色rgb, 霧
     3: 光の色rgb, 光の強さ    4: 光の位置xy, 星の密度, 光線の強さ  5: アクセントrgb, 風の伸び
     6: 水面反射, 波紋, 光の道, 地平線の輝き */
  function scene(o) {
    return [].concat(rgb(o.top), [o.cloud], rgb(o.bot), [o.hor], rgb(o.cc), [o.mist], rgb(o.light), [o.li],
      o.lp, [o.star, o.rays], rgb(o.acc), [o.wind], [o.refl, o.rip, o.road, o.glow]);
  }
  HS.SCENES = [
    /* 0 ヒーロー：深い藍の夜空と、低くのぼる金色の光 */
    scene({ top: '#03051c', cloud: 1.0, bot: '#3a2a78', hor: 0.30, cc: '#8a74d0', mist: 0.6, light: '#ffcf7a', li: 0.85, lp: [0.58, 0.36], star: 1.0, rays: 1.0, acc: '#ff9a6b', wind: 0.0, refl: 0, rip: 0, road: 0, glow: 0.9 }),
    /* 1 光をつくる：夕暮れのあかりの海 */
    scene({ top: '#1a0c3c', cloud: 0.8, bot: '#e0704a', hor: 0.34, cc: '#9a4f86', mist: 0.8, light: '#ff8c58', li: 1.1, lp: [0.5, 0.33], star: 0.5, rays: 1.15, acc: '#ff9460', wind: 0.0, refl: 0, rip: 0, road: 0, glow: 1.3 }),
    /* 2 熱を逃がす：深い青の洞窟・冷たい風 */
    scene({ top: '#010818', cloud: 1.0, bot: '#0b5878', hor: 0.20, cc: '#2f86a6', mist: 0.7, light: '#a6ecff', li: 1.1, lp: [0.30, 1.03], star: 0.08, rays: 1.5, acc: '#58d6e6', wind: 1.0, refl: 0, rip: 0, road: 0, glow: 0.6 }),
    /* 3 揺れを鎮める：星を映す湖 */
    scene({ top: '#070626', cloud: 0.5, bot: '#4a3396', hor: 0.46, cc: '#8466bd', mist: 0.45, light: '#f0d8ff', li: 0.62, lp: [0.72, 0.74], star: 1.7, rays: 0.55, acc: '#c8a0ff', wind: 0.2, refl: 1, rip: 1, road: 0, glow: 0.6 }),
    /* 4 届ける：地平線へ続く光の道 */
    scene({ top: '#080826', cloud: 0.55, bot: '#ee8a62', hor: 0.40, cc: '#8a4f94', mist: 0.55, light: '#ffa27c', li: 1.05, lp: [0.5, 0.405], star: 1.1, rays: 0.85, acc: '#ff9a78', wind: 0.3, refl: 0, rip: 0, road: 1, glow: 1.4 })
  ];

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes;uniform float uTime;uniform float uD;uniform vec2 uPtr;uniform float uRip;uniform float uDim;uniform vec4 uA[7];uniform vec4 uB[7];',
    'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
    'float fbm3(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*noise(p);p=p*2.07+vec2(3.1,1.3);a*=.5;}return v;}',
    'float stars(vec2 uv,float asp,float dens,float t){float s=0.;',
    ' for(int k=0;k<2;k++){float fk=float(k);float sc=70.-fk*42.;vec2 g=vec2(uv.x*asp,uv.y)*sc;vec2 id=floor(g);vec2 f=fract(g)-.5;',
    '  float h=hash(id+fk*17.);vec2 o=(vec2(hash(id+3.1),hash(id+7.7))-.5)*.6;float d=length(f-o);',
    '  float on=step(1.-dens*(.07-fk*.045),h);float tw=.55+.45*sin(t*(1.+h*3.)+h*50.);',
    '  s+=on*tw*smoothstep(.11+fk*.05,0.,d)*(.8+fk*.7);}',
    ' return s;}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;float tt=uTime;',
    ' float n=fbm(vec2(uv.x*asp,uv.y)*2.4+3.7);',
    ' float field=uv.x*.6+(1.-uv.y)*.15+(n-.5)*.6;',
    ' float sweep=mix(-.35,1.2,uD);',
    ' float m=1.-smoothstep(sweep-.035,sweep+.035,field);',
    ' float e=(field-sweep)/.032;float edge=exp(-e*e)*smoothstep(0.,.06,uD)*smoothstep(1.,.94,uD);',
    ' if(uD<=.001){m=0.;edge=0.;}',
    ' vec4 p0=mix(uA[0],uB[0],m),p1=mix(uA[1],uB[1],m),p2=mix(uA[2],uB[2],m),p3=mix(uA[3],uB[3],m),p4=mix(uA[4],uB[4],m),p5=mix(uA[5],uB[5],m),p6=mix(uA[6],uB[6],m);',
    ' float hor=p1.w;vec2 pp=uv+uPtr*vec2(.012,.006);',
    ' float h=clamp((pp.y-hor)/(1.-hor),0.,1.);',
    ' vec3 col=mix(p1.rgb,p0.rgb,pow(h,.65));',
    ' float st=stars(pp,asp,p4.z,tt)*smoothstep(hor,hor+.35,pp.y);',
    ' float ws=p5.w;',
    ' vec2 cp=vec2((pp.x-.5)*asp/(1.+ws*2.5),pp.y*(1.+ws*.8))*2.2+vec2(tt*.012*(1.+ws*8.),0.);',
    ' float q=fbm(cp+vec2(0.,tt*.01));float c=fbm(cp+q*1.8+vec2(tt*.018,0.));',
    ' float cloud=smoothstep(.36,.9,c)*p0.w*smoothstep(hor-.02,hor+.3,pp.y);',
    ' vec2 d=pp-p4.xy;d.x*=asp;float r=length(d);float lit=exp(-r*1.7);float ang=atan(d.y,d.x);',
    ' float streak=noise(vec2(ang*7.+tt*.04,1.3))*.55+noise(vec2(ang*19.-tt*.06,5.1))*.45;',
    ' float rays=pow(streak,2.2)*exp(-r*1.35)*p4.w*(1.-cloud*.75);',
    ' float core=exp(-r*r*22.)*1.4+exp(-r*4.)*.35;',
    ' vec3 lc=p3.rgb*p3.w;',
    ' vec3 cloudCol=p2.rgb*(.5+1.05*q)+lc*lit*lit*(.4+c)*1.5;',
    ' col=mix(col,cloudCol,cloud*.9);',
    ' col+=st*vec3(.9,.95,1.)*(1.-cloud)*.9;',
    ' col+=lc*(rays*.9+core);',
    ' float hg=(pp.y-hor)*6.5;col+=p5.rgb*exp(-hg*hg)*p6.w*.55;',
    /* 稜線（遠景・近景）。水面や光の道のシーンでは低くする */
    ' float rA=hor+.02+.10*fbm3(vec2(pp.x*asp*1.4+11.,3.))*(1.-p6.x*.5)*(1.-p6.z*.92);',
    ' float rB=hor-.02+.075*fbm3(vec2((pp.x+uPtr.x*.012)*asp*2.2+4.,8.))*(1.-p6.z*.85);',
    ' vec3 farCol=p1.rgb*.5+p2.rgb*.14+lc*.03;',
    ' float fm=smoothstep(rA+.004,rA-.004,pp.y);col=mix(col,farCol,fm*.9);',
    ' float rim=smoothstep(.012,0.,abs(pp.y-rA))*lit;col+=lc*rim*.25*(1.-p6.x);',
    ' vec3 nearCol=p0.rgb*.16+vec3(.004,.004,.012);',
    ' float gm=smoothstep(rB+.004,rB-.004,pp.y)*(1.-p6.x);col=mix(col,nearCol,gm);',
    /* 水面：星と光の柱を映し、波紋はスクロールで収まる */
    ' float below=smoothstep(hor+.002,hor-.002,pp.y);float dpt=hor-pp.y;',
    ' float amp=p6.y*uRip;float dis=sin(dpt*140.+tt*1.7+noise(vec2(pp.x*8.,tt*.2))*5.)*.002*(.15+amp*3.)*(dpt*5.+.2);',
    ' vec2 mu=vec2(pp.x+dis,hor+dpt*.95);',
    ' vec3 wcol=mix(p1.rgb*.3,p0.rgb*.2,clamp(dpt*2.,0.,1.));',
    ' wcol+=stars(mu,asp,p4.z,tt)*.5*vec3(.9,.9,1.);',
    ' float lx=(pp.x-p4.x+dis*.6)*asp;wcol+=lc*exp(-lx*lx*70.)*exp(-dpt*2.)*(.75+.25*sin(pp.y*190.+tt*3.))*.7;',
    ' wcol+=p5.rgb*.1*exp(-dpt*5.);',
    ' col=mix(col,wcol,below*p6.x);',
    /* 光の道（遠近法で地平線へ収束する光点） */
    ' float tz=hor-pp.y;',
    ' if(tz>.004&&p6.z>.01){float px=(pp.x-.5)*asp/tz;float pz=1./tz;',
    '  float row=fract(pz*.55-tt*.25);float rowG=exp(-pow((row-.5)/.07,2.))+.3*exp(-pow((row-.5)/.25,2.));',
    '  float colG=exp(-pow((abs(px)-2.3)/.13,2.))+.3*exp(-pow((abs(px)-2.3)/.4,2.));',
    '  float dash=step(.5,fract(pz*.28-tt*.12))*exp(-pow(px/.09,2.))*.5;',
    '  float fade=smoothstep(.012,.07,tz)*exp(-tz*1.3);',
    '  col+=vec3(1.,.82,.58)*(rowG*colG*2.6+dash)*fade*p6.z;',
    '  col+=p5.rgb*.22*exp(-tz*3.)*exp(-pow(px*.3,2.))*p6.z;}',
        /* 低く流れる霧 */
    ' float mb=smoothstep(hor+.3,hor-.08,pp.y);float mn=fbm3(vec2(pp.x*asp*1.3+tt*.02,pp.y*4.-tt*.01));',
    ' float lum=dot(col,vec3(.3,.5,.2));col=mix(col,mix(p2.rgb,lc,.25)*.9+.04,clamp(p2.w*mn*mb*1.1,0.,.75)*(1.-clamp(lum,0.,1.)*.85));',
    /* ディゾルブの縁の光 */
    ' col+=(mix(uA[3].rgb,uB[3].rgb,.5)+.55)*edge*1.0;',
    ' vec2 dq=vec2((uv.x-.5)/.62,(uv.y-.32)/.44);col*=1.-uDim*exp(-dot(dq,dq)*1.2);',
    ' vec2 vq=uv-.5;col*=1.-.7*dot(vq,vq);',
    ' col=col/(1.+col*.22);col=pow(col,vec3(.93));',
    ' col+=(hash(gl_FragCoord.xy+fract(tt))-.5)/180.;',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  HS.createGL = function (canvas) {
    var gl = null;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' }) || canvas.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) return null;
    function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn('shader:', gl.getShaderInfoLog(s)); return null; } return s; }
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var la = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['uRes', 'uTime', 'uD', 'uPtr', 'uRip', 'uDim', 'uA', 'uB'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    var lost = false;
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; document.documentElement.classList.add('no-gl'); });
    var api = {
      resize: function (scale) {
        var w = Math.max(2, Math.floor(window.innerWidth * scale)), h = Math.max(2, Math.floor(window.innerHeight * scale));
        canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
      },
      /* a, b: シーン番号 / d: 0..1 ディゾルブ進行 */
      render: function (a, b2, d, t, ptr, rip, dim) {
        if (lost) return;
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uTime, t); gl.uniform1f(U.uD, d); gl.uniform2f(U.uPtr, ptr.x, ptr.y); gl.uniform1f(U.uRip, rip); gl.uniform1f(U.uDim, dim);
        gl.uniform4fv(U.uA, new Float32Array(HS.SCENES[a])); gl.uniform4fv(U.uB, new Float32Array(HS.SCENES[b2]));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
    return api;
  };
})();
