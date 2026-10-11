/* Ink on washi paper: the WebGL renderer behind the opening animation and the app icon.
 *
 * Plain script, no imports: the Vite plugin in vite.config.js inlines it into index.html so it runs before the app
 * bundle, and the same text runs inside a Web Worker (so the animation stays smooth while the app is loading)
 * and in scripts/make-icons.mjs (so the icon is literally the last frame of the animation).
 *
 * The texture public/ink/field.png comes from scripts/ink-field.mjs, which simulated ink soaking into paper:
 *   R = when the brush ink arrives, G = how much pigment arrives, B = when the vermilion drop arrives.
 * The shader turns "ink time" into colour: the brush core darkens almost at once, the bleed around it fills in more
 * slowly with a darker wet front that settles into a thin dried edge, diluted ink granulates, wet paper darkens a
 * touch and dries again, and the sun is one drop of vermilion that spreads to a ring-edged disc.
 */
/* eslint-disable */
function kotobaInk(scope) {
  var VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform sampler2D uField;",
    "uniform vec2 uRes;",      // canvas size in device pixels
    "uniform vec3 uBox;",      // the picture square: centre x, centre y (from the top left), size, in device pixels
    "uniform float uScale;",   // device pixels per CSS pixel, so paper grain looks the same on every screen
    "uniform float uSim;",     // ink time in seconds
    "uniform float uTime;",    // real time in seconds (only for the slow shimmer of wet ink)
    "uniform float uExit;",    // < 0 while showing; 0..1 while the page floods with the app's colour
    "uniform vec3 uPaper;",
    "uniform vec3 uBg;",
    "uniform float uSimMax;",
    "uniform vec4 uSun;",      // t0, v (texels per sqrt(second)), radius (0..1 of the square), seed radius
    "uniform float uN;",
    "uniform vec2 uSunC;",
    "uniform sampler2D uFlood;",
    "uniform float uFloodSpan;",
    "float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);",
    "  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}",
    "float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p=p*2.03+17.1;a*=.5;}return s;}",
    "void main(){",
    "  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);",
    "  vec2 q=px/uScale;",
    // paper: blotchy sizing, pulp grain, a few long fibres, a soft vignette
    "  float mott=fbm(q*.011);",
    "  float tooth=vnoise(q*.85)*.6+vnoise(q*2.1)*.4;",
    "  float fa=vnoise(vec2(q.x*.035+q.y*.012,q.y*.55-q.x*.2));",
    "  float fb=vnoise(vec2(q.y*.03-q.x*.01,q.x*.6+q.y*.18)+40.);",
    "  float fib=smoothstep(.86,.97,fa)+smoothstep(.88,.98,fb);",
    "  vec3 col=uPaper*(1.-.07*(mott-.5)-.04*(tooth-.5))+vec3(.025,.022,.018)*fib;",
    "  vec2 vc=(px-uBox.xy)/max(uRes.x,uRes.y);",
    "  col*=1.-.16*smoothstep(.25,.85,length(vc*vec2(1.,.9)));",
    "  vec2 uv=(px-uBox.xy)/uBox.z+.5;",
    "  vec3 A=vec3(0.);",
    "  float aw=99.;",
    "  float feather=(vnoise(q*.7)-.5)*.022+(vnoise(q*2.6)-.5)*.012;",
    "  if(uv.x>0.&&uv.y>0.&&uv.x<1.&&uv.y<1.){",
    "    vec3 f=texture2D(uField,uv).rgb;",
    // brush ink and its bleed
    "    if(f.r<.996){",
    "      float a=f.r*255./254.*uSimMax;",
    "      aw=a;",
    "      float L=max(f.g-.012,0.)/.988;",
    "      float age=uSim-a+feather;",
    "      if(age>0.){",
    "        float core=smoothstep(.5,.62,L);",
    "        float halo=(1.-core)*smoothstep(.01,.06,L);",
    "        float d=L*(1.-exp(-age/mix(.09,.018,core)));",
    "        d+=core*exp(-age/.05)*.35;",                               // freshly laid ink is glossy-black
    "        d+=halo*exp(-age/.09)*.12;",                               // pigment rides the wet front
    "        d*=mix(1.,.7+.6*vnoise(q*1.7),halo);",                    // diluted ink granulates
    "        d*=1.+.1*(vnoise(q*.05+vec2(uTime*.22,-uTime*.15))-.5)*exp(-age/.4);", // wet ink still moves a little
    "        A+=vec3(2.45,2.58,2.68)*d*(1.+.45*core);",
    "        A+=vec3(.02,.022,.024)*exp(-age/.35)*(1.-smoothstep(0.,.05,L));", // wet paper, drying
    "      }",
    "    }",
    // the vermilion drop
    "    if(f.b<.996){",
    "      float a=f.b*255./254.*uSimMax;",
    "      float age=uSim-a+feather*.5;",
    "      if(age>0.){",
    "        float D=length(uv-uSunC)+feather*.35+(fbm(q*.06)-.5)*.012;",
    "        float inside=1.-smoothstep(uSun.z-.003,uSun.z+.002,D);",
    "        float d=inside*(1.-exp(-age/.05));",
    "        d*=.9+.2*vnoise(q*1.25);",
    "        d+=inside*smoothstep(uSun.z-.028,uSun.z-.002,D)*.32*(1.-exp(-age/.3));",
    "        A+=vec3(.16,1.36,1.58)*d;",
    "      }",
    "    }",
    "  }",
    "  col*=exp(-A);",
    // leaving: the ink floods out of the strokes along the paper's fibres until it covers the page. The flood field
    // spreads with the square root of time too, so it rushes out and then slows as it reaches the corners.
    "  if(uExit>=0.){",
    "    vec2 uf=(px-uBox.xy)/(uBox.z*uFloodSpan)+.5;",
    "    float af=(uf.x>0.&&uf.y>0.&&uf.x<1.&&uf.y<1.)?texture2D(uFlood,uf).r:1.;",
    "    af+=feather*.6+(vnoise(q*.12)-.5)*.015;",
    "    float e=pow(clamp(uExit,0.,1.),1.7)*1.06;",
    "    float m=1.-smoothstep(e-.012,e+.004,af);",
    "    float rim=(1.-smoothstep(e,e*1.18+.012,af))*(1.-m)*step(.001,e);",
    "    col*=1.-.38*rim;",
    "    col=mix(col,uBg,m);",
    "  }",
    "  gl_FragColor=vec4(col,1.);",
    "}",
  ].join("\n");

  function shader(gl, type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  }

  function texture(gl, unit, image, format) {
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  /** gl: a WebGL context. image, flood: the two textures (ImageBitmap or <img>). k: constants.json. */
  function create(gl, image, flood, k) {
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link");
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    texture(gl, 0, image, gl.RGB);
    texture(gl, 1, flood, gl.LUMINANCE);
    var U = {};
    ["uField", "uRes", "uBox", "uScale", "uSim", "uTime", "uExit", "uPaper", "uBg", "uSimMax", "uSun", "uN", "uSunC", "uFlood", "uFloodSpan"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.uField, 0);
    gl.uniform1i(U.uFlood, 1);
    gl.uniform1f(U.uFloodSpan, k.FLOOD.span);
    gl.uniform1f(U.uSimMax, k.SIM_MAX);
    gl.uniform1f(U.uN, k.N);
    var sunV = ((k.SUN.r - k.SUN.seedR) * k.N) / Math.sqrt(k.SUN.grow);
    gl.uniform4f(U.uSun, k.SUN.t0, sunV, k.SUN.r, k.SUN.seedR);
    gl.uniform2f(U.uSunC, k.SUN.x, k.SUN.y);
    return {
      /** o: { w, h, box: [cx, cy, size], scale, sim, time, exit, paper: [r,g,b], bg: [r,g,b] } (colours 0..1) */
      draw: function (o) {
        gl.viewport(0, 0, o.w, o.h);
        gl.uniform2f(U.uRes, o.w, o.h);
        gl.uniform3f(U.uBox, o.box[0], o.box[1], o.box[2]);
        gl.uniform1f(U.uScale, o.scale);
        gl.uniform1f(U.uSim, o.sim);
        gl.uniform1f(U.uTime, o.time);
        gl.uniform1f(U.uExit, o.exit == null ? -1 : o.exit);
        gl.uniform3f(U.uPaper, o.paper[0], o.paper[1], o.paper[2]);
        gl.uniform3f(U.uBg, o.bg[0], o.bg[1], o.bg[2]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  }

  /**
   * Real time → ink time. Ink time runs at full speed when the brush lands and then slows to `slow` of real speed:
   * the "rapid, then slow motion" of the opening. sim(t) = slow·t + (1 − slow)·knee·tanh(t / knee)
   */
  function inkTime(t, slow, knee) { return slow * t + (1 - slow) * knee * Math.tanh(t / knee); }

  scope.KotobaInk = { create: create, inkTime: inkTime };
}

/* The worker side: draws into a canvas handed over with transferControlToOffscreen, independent of the page's
   main thread, so the animation keeps running while the app bundle is parsed and started. */
function kotobaInkWorker(scope) {
  var r = null, gl = null, o = null, start = 0, exitAt = -1, stopped = false, raf = scope.requestAnimationFrame ? scope.requestAnimationFrame.bind(scope) : function (f) { return setTimeout(function () { f(); }, 16); };
  var now = function () { return performance.timeOrigin + performance.now(); };
  function loop() {
    var t = (now() - start) / 1000;
    var exit = exitAt < 0 ? -1 : Math.min(1, (now() - exitAt) / o.exitMs);
    r.draw({ w: o.w, h: o.h, box: o.box, scale: o.scale, sim: scope.KotobaInk.inkTime(t, o.slow, o.knee), time: t, exit: exit, paper: o.paper, bg: o.bg });
    if (exit >= 1) { scope.postMessage({ type: "exited" }); return; }
    if (!stopped) raf(loop);
  }
  function fail(err) { scope.postMessage({ type: "fail", message: String((err && err.message) || err) }); }
  scope.onmessage = function (e) {
    var m = e.data;
    try {
      if (m.type === "init") {
        o = m;
        gl = m.canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: "low-power" });
        if (!gl) throw new Error("no webgl in worker");
        // fetch and decode the textures here, so a busy page can't hold them up; if that fails the page sends them
        var bmp = function (u) {
          return fetch(u).then(function (res) { if (!res.ok) throw new Error(u + " " + res.status); return res.blob(); })
            .then(function (b) { return createImageBitmap(b, { premultiplyAlpha: "none", colorSpaceConversion: "none" }); });
        };
        Promise.all([bmp(m.urls[0]), bmp(m.urls[1])])
          .then(function (imgs) { scope.onmessage({ data: { type: "field", image: imgs[0], flood: imgs[1] } }); })
          .catch(function () { scope.postMessage({ type: "need-field" }); });
      } else if (m.type === "field" && gl && !r) {
        r = scope.KotobaInk.create(gl, m.image, m.flood, o.k);
        start = now();
        loop();
        scope.postMessage({ type: "ready", start: start });
      } else if (m.type === "exit" && r && exitAt < 0) {
        exitAt = m.at;
      } else if (m.type === "resize" && o) {
        o.w = m.w; o.h = m.h; o.box = m.box; o.scale = m.scale;
        o.canvas.width = m.w; o.canvas.height = m.h;
      } else if (m.type === "stop") {
        stopped = true;
      }
    } catch (err) { fail(err); }
  };
}
