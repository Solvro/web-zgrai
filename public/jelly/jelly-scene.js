/*! zgrai.solvro.pl jelly agents: ZgraiJelly overlay renderer.
 * Classic script. Needs three.js r128 loaded as window.THREE. Defines only window.ZgraiJelly.
 * Never touches DOM outside the canvas it is given.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.ZgraiJelly) return;

  var SHAPE_NAMES = ['square', 'blob', 'pill', 'capsule', 'gumdrop', 'bell', 'hex'];
  var lib = null;

  function noopHandle() {
    var f = function () {};
    return { wake: f, sleep: f, refresh: f, poke: f, setClearRect: f, setColors: f, dispose: f };
  }

  function boot() {
    if (lib) return lib;
    var T = window.THREE;
    if (!T || !T.WebGLRenderer) return null;
    lib = buildLibrary(T);
    return lib;
  }

  window.ZgraiJelly = {
    version: '1.0.0',
    shapes: SHAPE_NAMES.slice(),
    mountOverlay: function (canvas, root, options) {
      var L = boot();
      if (!L || !canvas || !canvas.getContext) return noopHandle();
      try {
        return L.createEngine(canvas, root || null, options || {});
      } catch (e) {
        if (window.console && console.warn) console.warn('ZgraiJelly: could not start', e);
        return noopHandle();
      }
    },
    // Convenience: a field-only scene. Same handle as mountOverlay.
    mount: function (canvas, options) {
      options = options || {};
      var o = {};
      for (var k in options) if (Object.prototype.hasOwnProperty.call(options, k)) o[k] = options[k];
      o.field = { bots: options.bots || [], master: options.master, clearRect: options.clearRect, state: options.state, botSize: options.botSize };
      return window.ZgraiJelly.mountOverlay(canvas, options.root || null, o);
    }
  };

  // ======================================================================
  function buildLibrary(THREE) {
    // ------------------------------------------------------------ utils
    var TAU = Math.PI * 2;
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function randInt(a, b) { return Math.floor(rand(a, b + 1 - 1e-9)); }
    function damp(k, dt) { return 1 - Math.exp(-k * dt); }
    function wrapAngle(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function num(v, f) { v = parseFloat(v); return isFinite(v) ? v : f; }
    function lin(css) { var c = new THREE.Color(0x888888); try { c.set(String(css)); } catch (e) { /* keep grey */ } return c.convertSRGBToLinear(); }
    function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

    class Spring {
      constructor(x, k, c) { this.x = x; this.v = 0; this.t = x; this.k = k; this.c = c; }
      step(dt) { this.v += (-this.k * (this.x - this.t) - this.c * this.v) * dt; this.x += this.v * dt; }
    }

    // ------------------------------------------------------------ constants
    var GRAVITY = 26;
    var STEP = 1 / 120;
    var ANT_L = 0.19;
    var ANT_BALL = 0.058;
    var JIGGLE_MAX = 0.05;
    var BLINK = 0.15;
    var SHEEN = 0.45;
    var EYE_PROUD = 0.004;
    var GAZE_X = 0.062;
    var GAZE_Y = 0.045;
    var BADGE_TILT = 0.3;
    var BOX_H = 36 / 42, BOX_R = BOX_H / 3;

    // Brand colours get a stable shape with data-jelly="auto".
    var AUTO_SHAPES = {
      '#2563eb': 'blob', '#f97316': 'pill', '#14b8a6': 'gumdrop', '#8b5cf6': 'capsule', '#ec4899': 'bell',
      '#eab308': 'hex', '#0ea5e9': 'capsule', '#6366f1': 'gumdrop', '#22c55e': 'blob', '#ef4444': 'pill'
    };
    function autoShape(color) {
      if (!color) return 'square';
      var c = String(color).trim().toLowerCase();
      return AUTO_SHAPES[c] || SHAPE_NAMES[hash(c) % SHAPE_NAMES.length];
    }

    // ------------------------------------------------------------ SDFs (body-local, y up, front +z)
    function sdRoundBox(x, y, z, bx, by, bz, r) {
      var qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
    }
    function sdEllipsoid(x, y, z, rx, ry, rz) {
      var k0 = Math.hypot(x / rx, y / ry, z / rz);
      var k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
      return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
    }
    function sdCapsuleX(x, y, z, a, r) { return Math.hypot(Math.max(Math.abs(x) - a, 0), y, z) - r; }
    function sdCapsuleY(x, y, z, a, r) { return Math.hypot(x, Math.max(Math.abs(y) - a, 0), z) - r; }
    function smin(a, b, k) { var h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); }
    function smax(a, b, k) { return -smin(-a, -b, k); }
    function sdHexPrism(x, y, z, hx, hz) {   // flat top and bottom, axis along z
      var px = Math.abs(x), py = Math.abs(y), pz = Math.abs(z);
      var kx = -0.8660254, ky = 0.5, kz = 0.57735;
      var d = Math.min(kx * px + ky * py, 0);
      px -= 2 * d * kx; py -= 2 * d * ky;
      var cx = clamp(px, -kz * hx, kz * hx);
      var dx = Math.hypot(px - cx, py - hx) * Math.sign(py - hx);
      var dz = pz - hz;
      return Math.min(Math.max(dx, dz), 0) + Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
    }
    function bellSdf(x, y, z) {
      var s = lerp(1.2, 0.8, clamp((y + 0.46) / 0.92, 0, 1));
      return sdRoundBox(x / s, y, z / s, 0.43, 0.46, 0.35, 0.3);
    }

    var DEFS = {
      square:  { box: true, sdf: function (x, y, z) { return sdRoundBox(x, y, z, 0.5, BOX_H / 2, 0.4, BOX_R); }, eye: { x: 0.185, y: 0.035, r: 0.098 } },
      blob:    { sdf: function (x, y, z) { return smax(sdEllipsoid(x, y, z, 0.53, 0.5, 0.49), -(y + 0.42), 0.09); }, ext: [0.53, 0.47, 0.49], c: 0.03, eye: { x: 0.17, y: 0.06, r: 0.095 } },
      pill:    { sdf: function (x, y, z) { return smax(sdCapsuleX(x, y, z / 0.94, 0.36, 0.36), -(y + 0.31), 0.07); }, ext: [0.72, 0.34, 0.34], c: 0.02, eye: { x: 0.2, y: 0.03, r: 0.09 } },
      capsule: { sdf: function (x, y, z) { return smax(sdCapsuleY(x, y, z / 0.94, 0.25, 0.37), -(y + 0.57), 0.08); }, ext: [0.37, 0.6, 0.35], c: 0.02, eye: { x: 0.14, y: 0.16, r: 0.088, gx: 0.035 } },
      gumdrop: { sdf: function (x, y, z) { return smax(sdEllipsoid(x, y, z, 0.56, 0.8, 0.5), -(y + 0.1), 0.1); }, ext: [0.56, 0.45, 0.5], c: 0.3, eye: { x: 0.17, y: -0.04, r: 0.092 } },
      bell:    { sdf: bellSdf, ext: [0.52, 0.46, 0.42], c: 0, eye: { x: 0.155, y: 0.02, r: 0.088 } },
      hex:     { sdf: function (x, y, z) { return sdHexPrism(x, y, z, 0.31, 0.21) - 0.15; }, ext: [0.53, 0.46, 0.36], c: 0, eye: { x: 0.17, y: 0.02, r: 0.092 } }
    };

    // Rounded box with even angular spacing on the rounded band and exact normals.
    function roundedBoxGeometry(w, h, d, r, k, flat) {
      var s = 2 * k + flat;
      var geo = new THREE.BoxGeometry(2, 2, 2, s, s, s);
      var pos = geo.attributes.position, nrm = geo.attributes.normal;
      var inner = [w / 2 - r, h / 2 - r, d / 2 - r];
      function remap(u, inn) {
        var i = Math.round((u + 1) * 0.5 * s);
        if (i <= k) return -(inn + r * Math.tan(((k - i) / k) * Math.PI / 4));
        if (i >= s - k) return inn + r * Math.tan(((i - (s - k)) / k) * Math.PI / 4);
        return -inn + ((i - k) / flat) * 2 * inn;
      }
      var pv = [0, 0, 0], cv = [0, 0, 0], nv = [0, 0, 0];
      for (var v = 0; v < pos.count; v++) {
        pv[0] = remap(pos.getX(v), inner[0]); pv[1] = remap(pos.getY(v), inner[1]); pv[2] = remap(pos.getZ(v), inner[2]);
        var len = 0;
        for (var a = 0; a < 3; a++) { cv[a] = clamp(pv[a], -inner[a], inner[a]); nv[a] = pv[a] - cv[a]; len += nv[a] * nv[a]; }
        len = Math.sqrt(len) || 1;
        for (a = 0; a < 3; a++) nv[a] /= len;
        pos.setXYZ(v, cv[0] + nv[0] * r, cv[1] + nv[1] * r, cv[2] + nv[2] * r);
        nrm.setXYZ(v, nv[0], nv[1], nv[2]);
      }
      geo.deleteAttribute('uv');
      return geo;
    }

    // Star-shaped SDF body: project a subdivided cube onto the zero level set,
    // normals from the SDF gradient (smooth, seam free).
    function sdfGeometry(f, ext, cy, seg) {
      var geo = new THREE.BoxGeometry(2, 2, 2, seg, seg, seg);
      var pos = geo.attributes.position, nrm = geo.attributes.normal;
      var rMax = 2.5 * Math.max(ext[0], ext[1], ext[2]) + 0.5, e = 1e-3;
      for (var v = 0; v < pos.count; v++) {
        var dx = pos.getX(v) * ext[0], dy = pos.getY(v) * ext[1], dz = pos.getZ(v) * ext[2];
        var l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
        var lo = 0, hi = rMax;
        for (var i = 0; i < 26; i++) { var m = (lo + hi) * 0.5; if (f(dx * m, cy + dy * m, dz * m) > 0) hi = m; else lo = m; }
        var r = (lo + hi) * 0.5, px = dx * r, py = cy + dy * r, pz = dz * r;
        var nx = f(px + e, py, pz) - f(px - e, py, pz);
        var ny = f(px, py + e, pz) - f(px, py - e, pz);
        var nz = f(px, py, pz + e) - f(px, py, pz - e);
        var nl = Math.hypot(nx, ny, nz) || 1;
        pos.setXYZ(v, px, py, pz);
        nrm.setXYZ(v, nx / nl, ny / nl, nz / nl);
      }
      geo.deleteAttribute('uv');
      return geo;
    }

    function buildShape(name) {
      var d = DEFS[name];
      var geo = d.box ? roundedBoxGeometry(1, BOX_H, 0.8, BOX_R, 5, 4) : sdfGeometry(d.sdf, d.ext, d.c, 16);
      geo.computeBoundingBox();
      var bb = geo.boundingBox;
      var offY = -(bb.min.y + bb.max.y) / 2;
      var H = bb.max.y - bb.min.y, W = bb.max.x - bb.min.x, D = bb.max.z - bb.min.z;
      geo.translate(0, offY, 0);
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      var p = geo.attributes.position, maxR = 0;
      for (var i = 0; i < p.count; i++) maxR = Math.max(maxR, Math.hypot(p.getX(i), p.getZ(i)));
      var minHalf = Math.min(W, D) / 2;
      return {
        name: name, geo: geo, H: H, W: W, D: D, offY: offY, sdf: d.sdf, eye: d.eye,
        radius: maxR - (maxR - minHalf) * 0.35 + 0.02
      };
    }

    // Eye placement on the front surface: z of the surface at (x, y) and the
    // Euler angles that align +z with the surface normal.
    var surf = { z: 0, rx: 0, ry: 0 };
    function placeOnSurface(sh, x, y, o) {
      var f = sh.sdf, oy = y - sh.offY, lo = 0, hi = sh.D;
      if (f(x, oy, 0) > 0) { o.z = 0; o.rx = 0; o.ry = 0; return o; }
      for (var i = 0; i < 14; i++) { var m = (lo + hi) * 0.5; if (f(x, oy, m) > 0) hi = m; else lo = m; }
      var z = (lo + hi) * 0.5, e = 0.002;
      var nx = f(x + e, oy, z) - f(x - e, oy, z);
      var ny = f(x, oy + e, z) - f(x, oy - e, z);
      var nz = f(x, oy, z + e) - f(x, oy, z - e);
      var l = Math.hypot(nx, ny, nz) || 1;
      o.z = z;
      o.ry = Math.asin(clamp(nx / l, -1, 1));
      o.rx = Math.atan2(-ny / l, nz / l);
      return o;
    }

    // ------------------------------------------------------------ shared resources
    var shared = { refs: 0, shapes: {}, eyeGeo: null, stickGeo: null, ballGeo: null, lidGeo: null, lidGeoThick: null, blobGeo: null, contactTex: null, zTex: null };

    function mergeGeos(list) {
      var pos = [], nrm = [], idx = [], base = 0;
      list.forEach(function (g) {
        var p = g.attributes.position, n = g.attributes.normal;
        for (var i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); }
        if (g.index) for (var j = 0; j < g.index.count; j++) idx.push(g.index.getX(j) + base);
        else for (var q = 0; q < p.count; q++) idx.push(q + base);
        base += p.count;
        g.dispose();
      });
      var out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      out.setIndex(idx);
      out.computeBoundingSphere();
      return out;
    }
    function lidGeometry(t) {
      var A = new THREE.Vector3(-0.085, 0.024, 0), B = new THREE.Vector3(0.085, 0.024, 0);
      var tube = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, new THREE.Vector3(0, -0.05, 0), B), 20, t, 8, false);
      var c1 = new THREE.SphereGeometry(t, 10, 8); c1.translate(A.x, A.y, A.z);
      var c2 = new THREE.SphereGeometry(t, 10, 8); c2.translate(B.x, B.y, B.z);
      return mergeGeos([tube, c1, c2]);
    }
    function canvasTexture(w, h, draw) {
      var c = document.createElement('canvas');   // detached, never added to the document
      c.width = w; c.height = h;
      draw(c.getContext('2d'));
      return new THREE.CanvasTexture(c);
    }

    function acquire() {
      if (shared.refs++ > 0) return;
      shared.eyeGeo = new THREE.SphereGeometry(1, 24, 16);
      shared.stickGeo = new THREE.CylinderGeometry(0.018, 0.024, ANT_L, 12, 1);
      shared.stickGeo.translate(0, ANT_L / 2, 0);
      shared.ballGeo = new THREE.SphereGeometry(ANT_BALL, 20, 14);
      shared.lidGeo = lidGeometry(0.017);
      shared.lidGeoThick = lidGeometry(0.03);
      shared.blobGeo = new THREE.PlaneGeometry(1, 1);
      shared.blobGeo.rotateX(-Math.PI / 2);
      shared.contactTex = canvasTexture(128, 128, function (g) {
        var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grd.addColorStop(0, 'rgba(0,0,0,1)');
        grd.addColorStop(0.35, 'rgba(0,0,0,0.6)');
        grd.addColorStop(0.7, 'rgba(0,0,0,0.14)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      });
      shared.zTex = canvasTexture(64, 64, function (g) {
        g.fillStyle = '#ffffff';
        g.font = '600 46px ui-monospace, "Geist Mono", SFMono-Regular, Menlo, Consolas, monospace';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('z', 32, 30);
      });
      shared.zTex.encoding = THREE.sRGBEncoding;
    }
    function release() {
      if (--shared.refs > 0) return;
      shared.refs = 0;
      for (var k in shared.shapes) shared.shapes[k].geo.dispose();
      shared.shapes = {};
      ['eyeGeo', 'stickGeo', 'ballGeo', 'lidGeo', 'lidGeoThick', 'blobGeo', 'contactTex', 'zTex'].forEach(function (n) {
        if (shared[n]) { shared[n].dispose(); shared[n] = null; }
      });
    }
    function getShape(name) {
      if (!DEFS[name]) name = 'square';
      return shared.shapes[name] || (shared.shapes[name] = buildShape(name));
    }

    // ------------------------------------------------------------ jelly shader
    var VERT_PARS = [
      'uniform float uTime;', 'uniform float uJiggle;', 'uniform vec2 uSway;', 'uniform float uH;', 'uniform float uSeed;',
      'varying float vFillH;', 'varying float vFillX;', ''
    ].join('\n');
    var VERT_NORMAL = [
      'float jh = clamp((position.y + uH * 0.5) / uH, 0.0, 1.0);',
      'float jw = 0.6 * sin(uTime * 16.0 + position.y * 7.0 + position.x * 4.0 + uSeed)',
      '         + 0.4 * sin(uTime * 11.0 + position.x * 8.0 - position.z * 6.0 + uSeed * 1.7);',
      'vec3 jn = vec3(sin(uTime * 13.0 + position.y * 6.0 + uSeed), 0.0, cos(uTime * 12.0 + position.x * 6.0 + uSeed));',
      'objectNormal = normalize(objectNormal + jn * (uJiggle * 6.0 * jw));',
      'objectNormal.y -= (uSway.x * objectNormal.x + uSway.y * objectNormal.z) * (2.0 * jh / uH);',
      'objectNormal = normalize(objectNormal);', ''
    ].join('\n');
    var VERT_BEGIN = [
      'vec3 transformed = vec3(position);',
      'transformed += normal * (uJiggle * jw * (0.3 + 0.7 * jh));',
      'transformed.xz += uSway * (jh * jh);',
      'vFillH = jh;',
      'vFillX = position.x * 0.8 + position.z * 0.6;', ''
    ].join('\n');
    var FRAG_PARS = [
      'uniform float uFill;', 'uniform vec3 uSleep;', 'uniform float uClock;', 'uniform float uRim;', 'uniform float uInner;',
      'varying float vFillH;', 'varying float vFillX;', ''
    ].join('\n');
    var FRAG_DIFFUSE = [
      'float fillEdge = vFillH + sin(vFillX * 10.0 + uClock * 6.0) * 0.022 + sin(vFillX * 4.0 - uClock * 3.0) * 0.018;',
      'float fillK = 1.0 - smoothstep(uFill - 0.03, uFill + 0.03, fillEdge);',
      'vec4 diffuseColor = vec4( mix( uSleep, diffuse, fillK ), opacity );', ''
    ].join('\n');
    var FRAG_EMISSIVE = [
      'totalEmissiveRadiance += diffuseColor.rgb * uInner;',
      'float fillBand = clamp(1.0 - abs(fillEdge - uFill) / 0.045, 0.0, 1.0) * step(-0.06, uFill) * step(uFill, 1.06);',
      'totalEmissiveRadiance += mix(diffuse, vec3(1.0), 0.55) * fillBand * 0.4;', ''
    ].join('\n');
    var FRAG_RIM = [
      'float rimF = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );',
      'gl_FragColor.rgb += mix( diffuseColor.rgb, vec3( 1.0 ), 0.5 ) * ( pow( rimF, 3.0 ) * uRim * fillK );', ''
    ].join('\n');
    // One shared function => one compiled program per renderer for every body.
    function bodyOnBeforeCompile(shader) {
      var u = this.userData.u;
      for (var name in u) shader.uniforms[name] = u[name];
      shader.vertexShader = VERT_PARS + shader.vertexShader
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + VERT_NORMAL)
        .replace('#include <begin_vertex>', VERT_BEGIN);
      shader.fragmentShader = FRAG_PARS + shader.fragmentShader
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', FRAG_DIFFUSE)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + FRAG_EMISSIVE)
        .replace('#include <tonemapping_fragment>', FRAG_RIM + '#include <tonemapping_fragment>');
    }

    function buildEnv(renderer) {
      var pmrem = new THREE.PMREMGenerator(renderer);
      var env = new THREE.Scene(), trash = [];
      var domeGeo = new THREE.SphereGeometry(20, 24, 12);
      var p = domeGeo.attributes.position, cols = [];
      for (var i = 0; i < p.count; i++) {
        var t = clamp(p.getY(i) / 20 * 0.5 + 0.5, 0, 1), c = lerp(0.12, 0.5, Math.pow(t, 0.8));
        cols.push(c, c, c);
      }
      domeGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      var domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
      env.add(new THREE.Mesh(domeGeo, domeMat));
      trash.push(domeGeo, domeMat);
      var panelGeo = new THREE.PlaneGeometry(1, 1);
      trash.push(panelGeo);
      function panel(w, h, x, y, z, k) {
        var m = new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide });
        var mesh = new THREE.Mesh(panelGeo, m);
        mesh.scale.set(w, h, 1); mesh.position.set(x, y, z); mesh.lookAt(0, 0, 0);
        env.add(mesh); trash.push(m);
      }
      panel(9, 6, -7, 10, 8, 4.0);
      panel(3, 10, 10, 3, -2, 2.5);
      panel(12, 12, 0, 15, -2, 1.1);
      panel(5, 2.5, 3, 2.5, 11, 2.2);
      var rt = pmrem.fromScene(env, 0.03);
      pmrem.dispose();
      trash.forEach(function (d) { d.dispose(); });
      return rt;
    }

    // ------------------------------------------------------------ convex polygon helpers (floor xz)
    function makePoly(pts) {
      var n = pts.length, cx = 0, cz = 0, i;
      for (i = 0; i < n; i++) { cx += pts[i].x; cz += pts[i].z; }
      cx /= n; cz /= n;
      var edges = [];
      for (i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        var nx = -(b.z - a.z), nz = b.x - a.x, l = Math.hypot(nx, nz) || 1;
        nx /= l; nz /= l;
        if ((cx - a.x) * nx + (cz - a.z) * nz < 0) { nx = -nx; nz = -nz; }
        edges.push({ ax: a.x, az: a.z, nx: nx, nz: nz });
      }
      return { pts: pts, edges: edges, cx: cx, cz: cz };
    }
    function polyDepth(poly, x, z) {   // > 0 inside, < 0 outside
      var m = Infinity;
      for (var i = 0; i < poly.edges.length; i++) {
        var e = poly.edges[i], d = (x - e.ax) * e.nx + (z - e.az) * e.nz;
        if (d < m) m = d;
      }
      return m;
    }
    function segHitsPoly(poly, x0, z0, x1, z1, m) {
      var t0 = 0, t1 = 1, dx = x1 - x0, dz = z1 - z0;
      for (var i = 0; i < poly.edges.length; i++) {
        var e = poly.edges[i];
        var nm = (x0 - e.ax) * e.nx + (z0 - e.az) * e.nz + m;
        var den = dx * e.nx + dz * e.nz;
        if (Math.abs(den) < 1e-9) { if (nm <= 0) return false; continue; }
        var t = -nm / den;
        if (den > 0) { if (t > t0) t0 = t; } else if (t < t1) t1 = t;
        if (t0 >= t1) return false;
      }
      return true;
    }
    function clipPoly(pts, poly) {
      var out = pts.slice();
      for (var k = 0; k < poly.edges.length && out.length; k++) {
        var e = poly.edges[k], inp = out;
        out = [];
        for (var i = 0; i < inp.length; i++) {
          var a = inp[i], b = inp[(i + 1) % inp.length];
          var da = (a.x - e.ax) * e.nx + (a.z - e.az) * e.nz, db = (b.x - e.ax) * e.nx + (b.z - e.az) * e.nz;
          if (da >= 0) out.push(a);
          if ((da >= 0) !== (db >= 0)) { var t = da / (da - db); out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }); }
        }
      }
      return out;
    }
    function polyArea(pts) {
      var s = 0;
      for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; s += a.x * b.z - b.x * a.z; }
      return Math.abs(s) / 2;
    }

    // Put a (possibly reused) context back to WebGL defaults.
    function resetGL(gl) {
      if (!gl || (gl.isContextLost && gl.isContextLost())) return;
      try {
        if (gl.bindVertexArray) gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        var units = Math.min(gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 16, 32);
        for (var i = 0; i < units; i++) {
          gl.activeTexture(gl.TEXTURE0 + i);
          gl.bindTexture(gl.TEXTURE_2D, null);
          gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
        }
        gl.activeTexture(gl.TEXTURE0);
        var attrs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) || 16;
        for (var a = 0; a < attrs; a++) gl.disableVertexAttribArray(a);
        gl.useProgram(null);
        [gl.BLEND, gl.CULL_FACE, gl.DEPTH_TEST, gl.SCISSOR_TEST, gl.STENCIL_TEST, gl.POLYGON_OFFSET_FILL, gl.SAMPLE_ALPHA_TO_COVERAGE].forEach(function (cap) { gl.disable(cap); });
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ZERO);
        gl.depthMask(true);
        gl.colorMask(true, true, true, true);
        gl.depthFunc(gl.LESS);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);
      } catch (e) { /* best effort */ }
    }

    // ==================================================================
    function createEngine(canvas, root, options) {
      acquire();
      var renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'default' });
      } catch (e) { release(); throw e; }
      // The canvas may carry GL state from an earlier renderer (remount): start clean.
      resetGL(renderer.getContext());
      if (renderer.state && renderer.state.reset) renderer.state.reset();
      renderer.setClearColor(0x000000, 0);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.localClippingEnabled = true;
      renderer.autoClear = false;
      var envRT = buildEnv(renderer);

      var colors = {
        sleep: options.sleepColor || '#E6E6E6',
        z: options.zColor || '#A3A3A3',
        shadow: clamp(num(options.shadowOpacity, 0.18), 0, 1),
        master: options.masterColor || '#0A0A0A'
      };
      var sleepLin = lin(colors.sleep);
      var maxFps = clamp(num(options.maxFps, 60), 10, 120);
      var prCap = Math.min(num(options.pixelRatio, window.devicePixelRatio || 1), 2);

      var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      var RM = options.reducedMotion === true || (options.reducedMotion !== false && !!(mq && mq.matches));
      var MS = RM ? 0.3 : 1;
      function onMq(e) { if (options.reducedMotion === undefined) { RM = e.matches; MS = RM ? 0.3 : 1; } }
      if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq); }

      var clock = 0, disposed = false;
      var viewW = 1, viewH = 1, cssScale = 1;
      var canvasRect = { left: 0, top: 0, width: 0, height: 0 };
      var raycaster = new THREE.Raycaster();
      var pointer = { x: 0, y: 0, inside: false, last: -10, dirty: false, world: new THREE.Vector3(), hasWorld: false };
      var WHITE = new THREE.Color(1, 1, 1), tmpC = new THREE.Color(), tmpC2 = new THREE.Color();

      // badge scene: orthographic, canvas pixels, y up (screen y = -world y)
      var badgeScene = new THREE.Scene();
      badgeScene.environment = envRT.texture;
      var orthoCam = new THREE.OrthographicCamera(0, 1, 0, -1, 1, 200000);
      orthoCam.position.set(0, 0, 100000);
      var bLight = new THREE.DirectionalLight(0xffffff, 0.55);
      bLight.position.set(-0.45, 1, 0.65);
      badgeScene.add(bLight);

      var fieldEyeMat = makeEyeMat();
      function makeEyeMat() {
        return new THREE.MeshPhysicalMaterial({
          color: 0xffffff, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04,
          emissive: new THREE.Color(0.3, 0.3, 0.3)
        });
      }

      // ================================================================ Bot
      class Bot {
        constructor(kind, o) {
          this.kind = kind;
          this.master = !!o.master;
          this.shapeName = this.master ? 'square' : (DEFS[o.shape] ? o.shape : 'square');
          this.shape = getShape(this.shapeName);
          this.size = kind === 'field' ? (num(o.size, 0) || (this.master ? 1.45 : 1)) : 1;
          this.colorHex = String(o.color || (this.master ? colors.master : '#2563EB'));
          this.color = lin(this.colorHex);
          this.seed = Math.random() * 50;
          this.H = this.shape.H;
          this.radius = this.shape.radius * this.size;
          this.invMass = this.master ? 0.2 : 1 / Math.max(0.6, this.size * this.size);
          this.x = 0; this.z = 0; this.y = 0; this.vx = 0; this.vz = 0; this.vy = 0;
          this.grounded = true;
          this.yaw = 0; this.yawV = 0; this.yawTarget = 0;
          var k = this.master ? 210 : 300, c = this.master ? 9 : 11;
          this.sx = new Spring(1, k, c); this.sy = new Spring(1, k, c); this.sz = new Spring(1, k, c);
          this.sway = { x: 0, z: 0, vx: 0, vz: 0, ax: 0, az: 0 };
          this.ant = { x: 0, z: 0, vx: 0, vz: 0, b: 0, vb: 0 };
          this.lean = { x: 0, z: 0, vx: 0, vz: 0 };
          this.jiggle = 0;
          this.eye = new Spring(0, 200, 15);
          this.gx = 0; this.gy = 0;
          this.blinkAt = clock + rand(1, 4); this.blinkStart = -10; this.squint = 0;
          this.crouch = 0; this.pending = null;
          this.fill = -0.15; this.fillFrom = -0.15; this.fillTo = -0.15; this.fillT = 1; this.fillDur = 1; this.fillEase = easeOutCubic;
          this.awake = false; this.sleepK = 1; this.yawn = 0;
          this.mode = 'sleep'; this.modeT = 0; this.timer = rand(0.5, 2);
          this.hopCd = 0; this.spot = null; this.arrived = false; this.home = { x: 0, z: 0 };
          this.convo = null; this.partner = null;
          this.lookPt = new THREE.Vector3();
          this.idleKind = 'camera'; this.idleBot = null; this.idleUntil = 0; this.idlePx = 0; this.idlePz = 0;
          this.lookOverride = null; this.lookOverrideUntil = 0;
          this.bumpCd = 0; this.breathPhase = Math.random() * TAU;
          this.dozeTilt = (Math.random() < 0.5 ? -1 : 1) * rand(0.03, 0.07);
          this.zAt = clock + rand(0.8, 7); this.peekUntil = 0;
          this.wakeAt = 0; this.settleAt = 0; this.settleStage = 0; this.settleStart = 0; this.sleepDoneAt = 0;
          this.active = true; this.vis = new Spring(1, 220, 17);
          // badge only
          this.el = null; this.targetState = 'awake'; this.state = ''; this.dsize = 0; this.order = 0;
          this.px = 40; this.boost = 1; this.thick = 1; this.lidThick = false; this.clipEls = [];
          this.nextIdle = clock + rand(1.5, 4); this.talkAt = 0; this.glanceUntil = 0; this.glx = 0; this.gly = 0;
          this.cx = 0; this.cy = 0;
          this._l = { x: 0, z: 0 };
          this.build();
        }

        build() {
          var sh = this.shape, badge = this.kind === 'badge';
          this.u = {
            uTime: { value: 0 }, uClock: { value: 0 }, uJiggle: { value: 0 }, uSway: { value: new THREE.Vector2() },
            uH: { value: sh.H }, uSeed: { value: this.seed }, uFill: { value: this.fill },
            uSleep: { value: sleepLin.clone() }, uRim: { value: this.master ? 0.22 : 0.3 }, uInner: { value: 0.06 }
          };
          this.mat = new THREE.MeshPhysicalMaterial({
            color: this.color.clone(), roughness: 0.34, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06,
            envMapIntensity: this.master ? 0.75 : 1
          });
          this.mat.sheen = new THREE.Color(0, 0, 0);
          this.mat.userData.u = this.u;
          this.mat.onBeforeCompile = bodyOnBeforeCompile;
          this.antMat = new THREE.MeshPhysicalMaterial({ color: sleepLin.clone(), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
          this.lidMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.45, envMapIntensity: 0.6 });
          this.eyeMat = badge ? makeEyeMat() : fieldEyeMat;
          this.blobMat = new THREE.MeshBasicMaterial({ map: shared.contactTex, color: 0x000000, transparent: true, depthWrite: false, opacity: 0.2 });
          if (badge) {
            this.clip = [
              new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
              new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
            ];
            var clip = this.clip;
            [this.mat, this.antMat, this.lidMat, this.eyeMat, this.blobMat].forEach(function (m) { m.clippingPlanes = clip; });
          }

          this.root = new THREE.Group();
          this.yawG = new THREE.Group(); this.root.add(this.yawG);
          this.hopG = new THREE.Group(); this.yawG.add(this.hopG);
          this.leanG = new THREE.Group(); this.hopG.add(this.leanG);
          this.squashG = new THREE.Group(); this.leanG.add(this.squashG);
          this.body = new THREE.Mesh(sh.geo, this.mat);
          this.body.position.y = sh.H / 2;
          this.body.userData.bot = this;
          this.squashG.add(this.body);
          this.eyes = []; this.lids = [];
          for (var i = 0; i < 2; i++) {
            var e = new THREE.Mesh(shared.eyeGeo, this.eyeMat);
            this.squashG.add(e); this.eyes.push(e);
            var lid = new THREE.Mesh(shared.lidGeo, this.lidMat);
            this.squashG.add(lid); this.lids.push(lid);
          }
          this.antG = new THREE.Group(); this.leanG.add(this.antG);
          this.stick = new THREE.Mesh(shared.stickGeo, this.antMat);
          this.ball = new THREE.Mesh(shared.ballGeo, this.antMat);
          this.antG.add(this.stick, this.ball);
          this.blob = new THREE.Mesh(shared.blobGeo, this.blobMat);
          this.blob.position.y = 0.003;
          this.blob.renderOrder = -1;
          this.yawG.add(this.blob);
          if (badge) {
            this.root.rotation.x = BADGE_TILT;
          } else {
            this.castMat = new THREE.MeshBasicMaterial({ map: shared.contactTex, color: 0x000000, transparent: true, depthWrite: false, opacity: 0.1 });
            this.cast = new THREE.Mesh(shared.blobGeo, this.castMat);
            this.cast.renderOrder = -2;
            this.root.add(this.cast);
          }
        }

        setColor(hex) {
          this.colorHex = String(hex);
          this.color.copy(lin(hex));
          this.mat.color.copy(this.color);
        }

        destroy() {
          if (this.root.parent) this.root.parent.remove(this.root);
          this.mat.dispose(); this.antMat.dispose(); this.lidMat.dispose(); this.blobMat.dispose();
          if (this.castMat) this.castMat.dispose();
          if (this.eyeMat !== fieldEyeMat) this.eyeMat.dispose();
        }

        toLocal(wx, wz) {
          var c = Math.cos(this.yaw), s = Math.sin(this.yaw);
          this._l.x = wx * c - wz * s;
          this._l.z = wx * s + wz * c;
          return this._l;
        }
        headPos(o) { return o.set(this.x, this.y + this.H * 0.62 * this.size, this.z); }
        setMode(m, timer) { this.mode = m; this.modeT = 0; if (timer !== undefined) this.timer = timer; }
        startFill(to, dur, ease) { this.fillFrom = this.fill; this.fillTo = to; this.fillT = 0; this.fillDur = dur; this.fillEase = ease; }

        // ---- motion primitives (shared)
        hop(tx, tz, height, opts) {
          if (!this.grounded || this.crouch > 0) return false;
          opts = opts || {};
          this.pending = { tx: tx, tz: tz, height: height, maxD: opts.maxD || 0.9 };
          this.crouch = opts.anticip || (height < 0.15 ? 0.06 : 0.12);
          var dx = tx - this.x, dz = tz - this.z;
          if (!opts.keepYaw && dx * dx + dz * dz > 0.01) this.yawTarget = Math.atan2(dx, dz);
          return true;
        }
        launch() {
          var p = this.pending;
          this.pending = null;
          if (!p) return;
          var vy0 = Math.sqrt(2 * GRAVITY * p.height), T = 2 * vy0 / GRAVITY;
          var dx = p.tx - this.x, dz = p.tz - this.z, d = Math.hypot(dx, dz);
          if (d > p.maxD) { dx *= p.maxD / d; dz *= p.maxD / d; }
          this.vx = dx / T; this.vz = dz / T; this.vy = vy0;
          this.grounded = false; this.y = 0.0001;
          var m = MS;
          this.sy.v += vy0 * 0.8 * m; this.sx.v -= vy0 * 0.35 * m; this.sz.v -= vy0 * 0.35 * m;
          var l = this.toLocal(this.vx, this.vz);
          this.sway.vx -= l.x * 0.35 * m; this.sway.vz -= l.z * 0.35 * m;
          this.ant.vx -= l.x * 0.8 * m; this.ant.vz -= l.z * 0.8 * m;
        }
        land() {
          var impact = -this.vy;
          this.y = 0; this.vy = 0; this.grounded = true;
          var m = MS, l = this.toLocal(this.vx, this.vz);
          this.sway.vx += l.x * 0.45 * m; this.sway.vz += l.z * 0.45 * m;
          this.ant.vx += l.x * 1.1 * m; this.ant.vz += l.z * 1.1 * m;
          this.vx *= 0.12; this.vz *= 0.12;
          var k = Math.min(impact, 7) * m;
          this.sy.v -= k * 1.15; this.sx.v += k * 0.6; this.sz.v += k * 0.6;
          this.jiggle = Math.min(JIGGLE_MAX, this.jiggle + k * 0.0055);
          this.ant.vx += (Math.random() - 0.5) * k * 0.25; this.ant.vz += (Math.random() - 0.5) * k * 0.25;
          this.hopCd = Math.max(this.hopCd, rand(0.08, 0.22));
        }
        squish(power) {
          var m = MS * power;
          this.sy.v -= 6.5 * m; this.sx.v += 3.2 * m; this.sz.v += 3.2 * m;
          this.jiggle = Math.min(JIGGLE_MAX, this.jiggle + 0.04 * m);
          this.ant.vx += rand(-1, 1) * 2.2 * m; this.ant.vz += rand(-1, 1) * 2.2 * m;
          this.squint = 1;
        }
        talkBounce(small) {
          if (RM) { this.sy.v += small ? 1 : 1.4; this.sx.v -= 0.5; this.sz.v -= 0.5; return; }
          var h = small ? rand(0.05, 0.08) : (this.master ? 0.15 : rand(0.07, 0.13));
          this.hop(this.x, this.z, h, { keepYaw: true, anticip: 0.05 });
        }

        // ---- shared per-frame bookkeeping
        thinkCommon(dt) {
          this.modeT += dt; this.timer -= dt; this.hopCd -= dt;
          this.squint = Math.max(0, this.squint - dt * 3.2);
          var sleepingNow = !this.awake || (this.mode === 'settle' && this.settleStage === 2);
          this.sleepK += ((sleepingNow ? 1 : 0) - this.sleepK) * damp(1.5, dt);
          if (this.awake && this.mode !== 'settle' && clock >= this.blinkAt) {
            this.blinkStart = clock;
            this.blinkAt = clock + (Math.random() < 0.18 ? BLINK + 0.12 : rand(2.4, 5.6));
          }
          if (this.fillT < 1) {
            this.fillT = Math.min(1, this.fillT + dt / this.fillDur);
            this.fill = lerp(this.fillFrom, this.fillTo, this.fillEase(this.fillT));
          }
        }

        // ---- physics (fixed step, shared)
        step(dt) {
          if (this.crouch > 0) { this.crouch -= dt; if (this.crouch <= 0) { this.crouch = 0; this.launch(); } }
          this.x += this.vx * dt; this.z += this.vz * dt;
          if (!this.grounded) {
            this.vy -= GRAVITY * dt;
            this.y += this.vy * dt;
            if (this.y <= 0 && this.vy < 0) this.land();
          } else {
            var f = Math.exp(-14 * dt); this.vx *= f; this.vz *= f;
          }
          var ty = 1;
          if (!this.grounded) ty += Math.min(0.22, Math.abs(this.vy) * 0.045) * MS;
          else if (this.crouch > 0) ty -= (this.pending && this.pending.height < 0.15 ? 0.08 : 0.16) * MS;
          var breathAmp = lerp(this.kind === 'badge' ? 0.016 : 0.008, 0.028, this.sleepK) * (RM ? 0.3 : 1);
          ty += Math.sin(clock * lerp(2.2, 1.5, this.sleepK) + this.breathPhase) * breathAmp - this.sleepK * 0.02;
          ty += this.yawn;
          var txz = 1 / Math.sqrt(ty);
          this.sy.t = ty; this.sx.t = txz; this.sz.t = txz;
          var prevSyV = this.sy.v;
          this.sx.step(dt); this.sy.step(dt); this.sz.step(dt);
          this.sx.x = clamp(this.sx.x, 0.6, 1.6); this.sy.x = clamp(this.sy.x, 0.5, 1.6); this.sz.x = clamp(this.sz.x, 0.6, 1.6);

          var sw = this.sway;
          sw.ax = -160 * sw.x - 5 * sw.vx; sw.az = -160 * sw.z - 5 * sw.vz;
          sw.vx += sw.ax * dt; sw.vz += sw.az * dt;
          sw.x = clamp(sw.x + sw.vx * dt, -0.16, 0.16); sw.z = clamp(sw.z + sw.vz * dt, -0.16, 0.16);

          var an = this.ant, rx = this.sleepK * this.dozeTilt * 0.8, rz = this.sleepK * 0.06;
          an.vx += (-110 * (an.x - rx) - 3.2 * an.vx - sw.ax * 0.9) * dt;
          an.vz += (-110 * (an.z - rz) - 3.2 * an.vz - sw.az * 0.9) * dt;
          an.x = clamp(an.x + an.vx * dt, -0.17, 0.17); an.z = clamp(an.z + an.vz * dt, -0.17, 0.17);
          var syAcc = (this.sy.v - prevSyV) / dt;
          an.vb += (-380 * an.b - 8 * an.vb - syAcc * this.H * 0.08) * dt;
          an.b = clamp(an.b + an.vb * dt, -0.08, 0.1);

          var dyaw = wrapAngle(this.yawTarget - this.yaw);
          this.yawV += (55 * dyaw - 11 * this.yawV) * dt;
          this.yaw = wrapAngle(this.yaw + this.yawV * dt);

          var ln = this.lean, l = this.toLocal(this.vx, this.vz);
          var tlx = clamp(l.z * 0.05, -0.14, 0.14) * MS + this.sleepK * 0.035;
          var tlz = clamp(-l.x * 0.05, -0.14, 0.14) * MS + this.sleepK * this.dozeTilt;
          ln.vx += (140 * (tlx - ln.x) - 13 * ln.vx) * dt; ln.vz += (140 * (tlz - ln.z) - 13 * ln.vz) * dt;
          ln.x += ln.vx * dt; ln.z += ln.vz * dt;

          this.eye.step(dt);
          this.jiggle *= Math.exp(-3.2 * dt);
          this.bumpCd -= dt;
        }

        // ---- scene graph sync (shared)
        syncCommon() {
          var sh = this.shape, sw = this.sway, ey = sh.eye;
          this.yawG.rotation.y = this.yaw;
          this.leanG.rotation.set(this.lean.x, 0, this.lean.z);
          this.squashG.scale.set(this.sx.x, this.sy.x, this.sz.x);

          var open = this.eye.x, bt = clock - this.blinkStart;
          if (bt >= 0 && bt < BLINK) open *= 1 - Math.sin((bt / BLINK) * Math.PI) * 0.96;
          open *= 1 - this.squint * 0.92;
          open = clamp(open, 0, 1.18);
          var lidA = clamp(1 - open / 0.22, 0, 1);
          var er = ey.r * this.boost, spread = 1 + (this.boost - 1) * 0.3;
          for (var i = 0; i < 2; i++) {
            var side = i === 0 ? -1 : 1;
            var ex = side * ey.x * spread + this.gx, eyy = ey.y + this.gy;
            placeOnSurface(sh, ex, eyy, surf);
            var hh = clamp((eyy + this.H / 2) / this.H, 0, 1), s2 = hh * hh;
            var px = ex + sw.x * s2, py = this.H / 2 + eyy, pz = surf.z + EYE_PROUD + sw.z * s2;
            var e = this.eyes[i];
            e.visible = open > 0.06;
            e.position.set(px, py, pz);
            e.rotation.set(surf.rx, surf.ry, 0);
            e.scale.set(er * (1 + (1 - Math.min(open, 1)) * 0.15), er * Math.max(open, 0.06), er * 0.38);
            var lid = this.lids[i];
            lid.visible = lidA > 0.02;
            lid.position.set(px, py - 0.004, pz + 0.008);
            lid.rotation.set(surf.rx, surf.ry, 0);
            lid.scale.setScalar(Math.max(lidA, 0.001) * er / 0.098);
          }

          var an = this.ant;
          this.antG.position.set(sw.x * this.sx.x, this.H * this.sy.x - 0.03, sw.z * this.sz.x);
          this.antG.rotation.set(Math.atan2(an.z, ANT_L), 0, -Math.atan2(an.x, ANT_L));
          var st = clamp(1 + an.b / ANT_L, 0.55, 1.6);
          this.stick.scale.set(this.thick, st, this.thick);
          var bs = 1 + (this.thick - 1) * 0.45;
          this.ball.scale.setScalar(bs);
          this.ball.position.y = ANT_L * st + ANT_BALL * 0.55 * bs;

          var k = clamp((this.fill + 0.15) / 1.3, 0, 1);
          var ballK = clamp((this.fill - 0.86) / 0.24, 0, 1);
          this.antMat.color.copy(sleepLin).lerp(this.color, ballK);
          tmpC.copy(sleepLin).lerp(this.color, k);
          this.mat.sheen.copy(tmpC).lerp(WHITE, 0.55).multiplyScalar(SHEEN);
          tmpC2.copy(tmpC).multiplyScalar(0.42);
          this.lidMat.color.copy(tmpC2).lerp(WHITE, k);

          var u = this.u;
          u.uTime.value = clock; u.uClock.value = clock;
          u.uJiggle.value = this.jiggle;
          u.uSway.value.set(sw.x, sw.z);
          u.uFill.value = this.fill;
        }

        syncBlob(hgt, base) {
          var sh = this.shape, sc = 1 + hgt * 0.45;
          this.blob.scale.set(sh.W * 1.3 * sc * this.sx.x, 1, sh.D * 1.38 * sc * this.sz.x);
          this.blobMat.opacity = base * clamp(1 - hgt * 0.8, 0.2, 1);
        }

        // ================= field behaviour =================
        syncField(dt) {
          this.vis.step(Math.min(dt, 1 / 30));
          var v = Math.max(0.0001, this.vis.x);
          this.root.visible = this.active || this.vis.x > 0.03;
          this.root.position.set(this.x, 0, this.z);
          this.root.scale.setScalar(this.size * v);
          var hgt = this.y / this.size;
          this.hopG.position.y = hgt;
          this.syncCommon();
          this.syncBlob(hgt, colors.shadow * 1.1);
          var sh = this.shape, cs = 1 + hgt * 0.6;
          this.cast.position.set(0.3 * cs, 0.002, -0.4 * cs);
          this.cast.rotation.y = Math.atan2(0.3, -0.4);
          this.cast.scale.set(sh.W * 1.45 * cs, 1, Math.max(sh.D, sh.H) * 1.75 * cs);
          this.castMat.opacity = colors.shadow * 0.55 * clamp(1 - hgt * 0.5, 0.3, 1);
        }

        thinkField(dt) {
          this.thinkCommon(dt);
          if (this.awake && this.grounded && this.crouch <= 0 && this.modeT > 0.15 &&
              (this.mode === 'idle' || this.mode === 'talk' || this.mode === 'goto' || this.mode === 'poked')) {
            if (insideK(this, 0.05)) {
              var p = escapeSpot(this);
              if (p) { if (this.convo) this.convo.cancel(); this.spot = p; this.arrived = false; this.setMode('wander'); }
            }
          }
          switch (this.mode) {
            case 'sleep':
              this.eye.t = clock < this.peekUntil ? 0.45 : 0;
              if (clock >= this.zAt) { spawnZ(this); this.zAt = clock + rand(4, 9); }
              break;
            case 'waking': if (clock >= this.wakeAt) this.doWake(); break;
            case 'idle': this.thinkIdle(); break;
            case 'wander': case 'goto': this.thinkMove(); break;
            case 'poked': if (this.modeT > 0.9 && this.grounded) this.setMode('idle', rand(0.5, 1.4)); break;
            case 'settle': this.thinkSettle(); break;
          }
          this.updateLookField(dt);
        }

        thinkIdle() {
          if (this.master) {
            if (this.timer <= 0 && this.grounded) {
              this.timer = rand(2.5, 5.5);
              var d = Math.hypot(this.x - this.home.x, this.z - this.home.z);
              if (d > 0.35) {
                var t = routeTarget(this, this.home.x, this.home.z);
                this.hop(t.x, t.z, RM ? 0.12 : 0.25, { maxD: 0.7 });
                this.timer = d > 0.8 ? 0.4 : this.timer;
              } else if (!RM && Math.random() < 0.5) this.hop(this.x, this.z, 0.1, { keepYaw: true });
            }
            return;
          }
          if (this.timer <= 0) {
            if (!RM && Math.random() < 0.62) {
              var s = randomSpot(this);
              if (s) { this.spot = s; this.arrived = false; this.setMode('wander'); return; }
            }
            this.timer = rand(0.8, 2.2);
            this.idleUntil = 0;
          }
        }

        thinkMove() {
          if (!this.spot) { this.setMode('idle', rand(0.5, 1.5)); return; }
          if (this.arrived) return;
          var dx = this.spot.x - this.x, dz = this.spot.z - this.z, d = Math.hypot(dx, dz);
          if (d < 0.26 || this.modeT > 7) {
            if (!this.grounded || this.crouch > 0) return;
            if (this.mode === 'wander') { this.spot = null; this.setMode('idle', rand(0.7, 2.2)); }
            else this.arrived = true;
            return;
          }
          if (this.grounded && this.crouch <= 0 && this.hopCd <= 0) {
            var t = routeTarget(this, this.spot.x, this.spot.z);
            var td = Math.hypot(t.x - this.x, t.z - this.z);
            this.hop(t.x, t.z, RM ? 0.12 : lerp(0.18, 0.3, Math.min(1, td / 1.6)), { maxD: 0.85 });
          }
        }

        thinkSettle() {
          if (clock < this.settleAt) return;
          if (this.settleStage === 0) {
            if (!this.grounded || this.crouch > 0) return;
            this.settleStage = 1; this.settleStart = clock; this.eye.t = 0.4;
            this.idleKind = 'camera'; this.idleUntil = clock + 10;
          }
          var s = clock - this.settleStart;
          this.yawn = s < 1.3 ? Math.sin((s / 1.3) * Math.PI) * 0.1 * (RM ? 0.3 : 1) : 0;
          if (this.settleStage === 1 && s > 0.75) { this.settleStage = 2; this.eye.t = 0; this.startFill(-0.15, 1.5, easeInOutCubic); }
          if (this.settleStage === 2 && s > 2.35) { this.awake = false; this.yawn = 0; this.setMode('sleep'); this.zAt = clock + rand(0.8, 4); }
        }

        queueWake(delay) {
          if (this.awake && this.mode !== 'settle' && this.mode !== 'waking') return;
          this.yawn = 0; this.setMode('waking'); this.wakeAt = clock + delay;
        }
        doWake() {
          this.awake = true; this.yawn = 0; this.settleStage = 0;
          this.setMode('idle', rand(1.0, 2.0));
          this.eye.t = 1; this.eye.v += 3;
          this.startFill(1.15, this.master ? 0.85 : 0.65, easeOutCubic);
          this.jiggle = Math.min(JIGGLE_MAX, this.jiggle + 0.03 * MS);
          this.ant.vx += rand(-1, 1) * 1.4 * MS; this.ant.vz += rand(-1, 1) * 1.4 * MS;
          var tx = this.x, tz = this.z, esc = insideK(this, 0) ? escapeSpot(this) : null;
          if (esc) { var r = routeTarget(this, esc.x, esc.z); tx = r.x; tz = r.z; this.spot = esc; this.arrived = false; this.setMode('wander'); }
          if (!RM && this.grounded && this.crouch <= 0) this.hop(tx, tz, this.master ? 0.42 : 0.5, { keepYaw: !esc, anticip: 0.09, maxD: 1.0 });
          else this.sy.v += 2.2 * MS;
          this.blinkAt = clock + rand(1.6, 3.2);
          if (this.master) { this.idleKind = 'camera'; this.idleBot = null; }
          else { this.idleKind = 'bot'; this.idleBot = F.master; }
          this.idleUntil = clock + rand(1.2, 2.2);
        }
        wakeInstant() {
          this.awake = true; this.sleepK = 0; this.setMode('idle', rand(0.5, 2.5));
          this.eye.x = this.eye.t = 1; this.fill = this.fillFrom = this.fillTo = 1.15; this.fillT = 1;
        }
        goToSleep(delay) {
          if (this.mode === 'sleep' || this.mode === 'settle') return;
          if (this.mode === 'waking' && !this.awake) { this.setMode('sleep'); return; }
          this.spot = null; this.arrived = false;
          this.setMode('settle'); this.settleAt = clock + delay; this.settleStage = 0;
        }

        bump(nx, nz, s, other) {
          if (this.bumpCd > 0) return;
          this.bumpCd = 0.3;
          var m = MS * (this.master ? 0.6 : 1), l = this.toLocal(nx, nz), lx = l.x, lz = l.z;
          this.sx.v -= Math.abs(lx) * s * 2.4 * m; this.sz.v -= Math.abs(lz) * s * 2.4 * m; this.sy.v += s * m;
          this.sway.vx -= lx * s * 0.35 * m; this.sway.vz -= lz * s * 0.35 * m;
          this.ant.vx -= lx * s * 0.9 * m; this.ant.vz -= lz * s * 0.9 * m;
          this.jiggle = Math.min(JIGGLE_MAX, this.jiggle + s * 0.01 * m);
          this.squint = Math.max(this.squint, 0.7);
          if (this.awake && other) { this.lookOverride = other; this.lookOverrideUntil = clock + 0.8; }
        }

        poke() {
          this.squish(1);
          if (!this.awake) { this.peekUntil = clock + 0.9; this.zAt = Math.max(this.zAt, clock + 1.2); return; }
          if (this.convo) this.convo.cancel();
          if (!RM) {
            this.crouch = 0; this.pending = null;
            if (this.grounded) {
              this.vy = this.master ? 4.6 : 5.6; this.grounded = false; this.y = 0.0001;
              this.vx = rand(-0.5, 0.5); this.vz = rand(-0.5, 0.5);
            } else this.vy = Math.max(this.vy, 3);
          }
          if (this.mode !== 'settle' && this.mode !== 'waking') { this.spot = null; this.setMode('poked'); }
          var self = this;
          F.bots.forEach(function (o) {
            if (o === self || !o.active || !o.awake || o.mode === 'settle' || dist(o, self) > 3.4) return;
            o.lookOverride = self; o.lookOverrideUntil = clock + rand(1.1, 1.7);
            if (!RM && !o.convo && Math.random() < 0.35) { o.squint = Math.max(o.squint, 0.6); if (o.grounded && o.crouch <= 0) o.hop(o.x, o.z, 0.09, { keepYaw: true, anticip: 0.04 }); }
          });
        }

        idleLookPoint(L) {
          if (clock > this.idleUntil || (this.idleKind === 'bot' && (!this.idleBot || this.idleBot === this || !this.idleBot.active))) this.pickIdleLook();
          if (this.idleKind === 'bot') this.idleBot.headPos(L);
          else if (this.idleKind === 'point') L.set(this.idlePx, 0.25, this.idlePz);
          else L.copy(fieldCam.position);
          return this.idleKind;
        }
        pickIdleLook() {
          this.idleUntil = clock + rand(1.3, 3.6);
          var r = Math.random(), act = F.bots.filter(function (b) { return b.active; });
          if (this.master) {
            var busy = F.convos.filter(function (c) { return c.phase === 'talk' && !c.visit; });
            if (busy.length && r < 0.55) { var c = busy[randInt(0, busy.length - 1)]; this.idleKind = 'bot'; this.idleBot = Math.random() < 0.5 ? c.a : c.b; }
            else if (r < 0.72 && act.length > 1) { this.idleKind = 'bot'; this.idleBot = act[randInt(0, act.length - 1)]; }
            else this.idleKind = 'camera';
            return;
          }
          if (r < 0.36 || act.length < 2) this.idleKind = 'camera';
          else if (r < 0.58 && F.master && F.master.active) { this.idleKind = 'bot'; this.idleBot = F.master; }
          else if (r < 0.86) { this.idleKind = 'bot'; this.idleBot = act[randInt(0, act.length - 1)]; }
          else { this.idleKind = 'point'; this.idlePx = this.x + rand(-2, 2); this.idlePz = this.z + rand(-2, 2); }
        }
        updateLookField(dt) {
          var L = this.lookPt, kind;
          if (this.mode === 'sleep' || this.mode === 'waking') {
            this.gx += (0 - this.gx) * damp(4, dt); this.gy += (-0.008 - this.gy) * damp(4, dt);
            return;
          }
          if (this.lookOverride && this.lookOverride !== this && clock < this.lookOverrideUntil) { this.lookOverride.headPos(L); kind = 'bot'; }
          else if (this.partner) { this.partner.headPos(L); kind = 'partner'; }
          else if (pointerNearField(this)) { L.copy(pointer.world); kind = 'pointer'; }
          else kind = this.idleLookPoint(L);
          var toT = Math.atan2(L.x - this.x, L.z - this.z);
          var facingPartner = this.partner && (this.mode === 'talk' || (this.mode === 'goto' && this.arrived));
          if (facingPartner) this.yawTarget = toT;
          else if (this.mode === 'idle' || this.mode === 'poked' || (this.mode === 'settle' && this.settleStage < 2)) {
            var camYaw = Math.atan2(fieldCam.position.x - this.x, fieldCam.position.z - this.z);
            this.yawTarget = camYaw + clamp(wrapAngle(toT - camYaw), -1, 1) * (kind === 'camera' ? 1 : 0.55);
          }
          var c = Math.cos(this.yaw), s = Math.sin(this.yaw);
          var dx = L.x - this.x, dz = L.z - this.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
          var dy = L.y - (this.y + (this.H / 2 + this.shape.eye.y) * this.size);
          var az = Math.atan2(lx, Math.max(lz, 0.05)), el = Math.atan2(dy, Math.max(Math.hypot(lx, lz), 0.35));
          var gxMax = this.shape.eye.gx || GAZE_X;
          var r = damp(this.mode === 'settle' ? 4 : 16, dt);
          this.gx += (clamp(az, -1, 1) * gxMax - this.gx) * r;
          this.gy += (clamp(el / 0.9, -1, 1) * GAZE_Y - this.gy) * r;
        }

        // ================= badge behaviour =================
        initState(state) {
          this.state = state;
          var awake = state !== 'asleep';
          this.awake = awake; this.sleepK = awake ? 0 : 1;
          this.fill = this.fillFrom = this.fillTo = awake ? 1.15 : -0.15; this.fillT = 1;
          this.eye.x = this.eye.t = awake ? 1 : 0;
          this.mode = awake ? 'idle' : 'sleep';
        }
        fitBadge(box) {
          var sh = this.shape, t = BADGE_TILT, ct = Math.cos(t), st = Math.sin(t);
          var bw = box.w, bh = box.h;
          if (this.dsize > 0) { var ds = this.dsize * cssScale; bw = Math.min(bw, ds); bh = Math.min(bh, ds); }
          var top = Math.max((sh.H + ANT_L + ANT_BALL * 2) * ct, sh.H * ct + sh.D * 0.5 * st) + 0.1;
          var bottom = -sh.D * 0.5 * st - 0.06;
          var totalH = top - bottom, totalW = Math.max(sh.W, 0.8) * 1.08;
          var s = Math.max(1, Math.min(bw / totalW, bh / totalH));
          this.px = s;
          var pw = sh.W * s;
          this.boost = clamp(1.4 - (pw - 22) * (0.4 / 26), 1, 1.4);
          this.thick = clamp(1.9 - (pw - 22) * (0.9 / 30), 1, 1.9);
          var thickLid = pw < 46;
          if (thickLid !== this.lidThick) {
            this.lidThick = thickLid;
            for (var i = 0; i < 2; i++) this.lids[i].geometry = thickLid ? shared.lidGeoThick : shared.lidGeo;
          }
          var cx = box.x + box.w / 2, cy = box.y + box.h / 2;
          var feetPx = cy + ((top + bottom) / 2) * s;
          this.cx = cx; this.cy = cy;
          this.root.position.set(cx, -feetPx, this.order * 160 + 80);
          this.root.scale.setScalar(s);
        }
        setClip(l, t, r, b) {
          this.clip[0].constant = -l; this.clip[1].constant = r;
          this.clip[2].constant = -t; this.clip[3].constant = b;
        }
        thinkBadge(dt, speakers) {
          this.thinkCommon(dt);
          var want = this.targetState;
          if (want !== this.state) {
            var wasAsleep = this.state === 'asleep';
            this.state = want;
            if (want === 'asleep') {
              this.mode = 'settle'; this.settleStage = 2; this.eye.t = 0;
              this.startFill(-0.15, 1.1, easeInOutCubic); this.sleepDoneAt = clock + 1.2;
            } else if (wasAsleep || !this.awake) {
              this.awake = true; this.mode = 'idle'; this.settleStage = 0;
              this.eye.t = 1; this.eye.v += 3;
              this.startFill(1.15, 0.6, easeOutCubic);
              this.jiggle = Math.min(JIGGLE_MAX, this.jiggle + 0.03 * MS);
              this.ant.vx += rand(-1, 1) * MS;
              if (!RM) this.hop(0, 0, 0.14, { keepYaw: true, anticip: 0.08 }); else this.sy.v += 2 * MS;
              this.blinkAt = clock + rand(1.5, 3);
            }
          }
          if (this.mode === 'settle' && clock >= this.sleepDoneAt) { this.awake = false; this.mode = 'sleep'; }
          if (this.state === 'asleep') {
            this.eye.t = clock < this.peekUntil ? 0.45 : 0;
          } else {
            this.eye.t = 1;
            if (this.state === 'speaking') {
              if (clock >= this.talkAt) { this.talkBounce(true); this.talkAt = clock + rand(0.22, 0.34); }
            } else if (clock >= this.nextIdle) {
              this.nextIdle = clock + rand(2.2, 5.5);
              var r = Math.random();
              if (r < 0.3 && !RM) this.hop(0, 0, rand(0.05, 0.08), { keepYaw: true, anticip: 0.05 });
              else if (r < 0.65) { this.ant.vx += rand(-1, 1) * 0.9 * MS; this.ant.vz += rand(-0.5, 0.5) * 0.6 * MS; }
              this.glanceUntil = 0;
            }
          }
          this.badgeLook(dt, speakers);
        }
        badgeLook(dt, speakers) {
          var tx = 0, ty = 0, ry = 0, r = damp(10, dt);
          if (this.mode === 'sleep' || (this.mode === 'settle')) {
            this.gx += (0 - this.gx) * damp(4, dt); this.gy += (-0.008 - this.gy) * damp(4, dt);
            this.yawTarget = 0;
            return;
          }
          var gxMax = this.shape.eye.gx || GAZE_X, reach = this.px * 4 + 60 * cssScale;
          var target = null;
          if (pointer.inside && clock - pointer.last < 2.5 && Math.hypot(pointer.x - this.cx, pointer.y - this.cy) < reach * 1.6) target = pointer;
          else if (this.state !== 'speaking') {
            var best = null, bd = Infinity;
            for (var i = 0; i < speakers.length; i++) {
              var sp = speakers[i];
              if (sp === this) continue;
              var d = Math.hypot(sp.cx - this.cx, sp.cy - this.cy);
              if (d < bd && d < 600 * cssScale) { bd = d; best = sp; }
            }
            if (best) target = best;
          }
          if (target) {
            var dx = target.x !== undefined && target === pointer ? pointer.x - this.cx : target.cx - this.cx;
            var dy = target === pointer ? pointer.y - this.cy : target.cy - this.cy;
            var n = Math.max(this.px * 2.5, 30 * cssScale);
            tx = clamp(dx / n, -1, 1); ty = clamp(-dy / n, -1, 1);
            ry = clamp(dx / (n * 4), -0.3, 0.3);
            r = damp(16, dt);
          } else {
            if (clock > this.glanceUntil) {
              this.glanceUntil = clock + rand(1.5, 4);
              var q = Math.random();
              if (q < 0.5) { this.glx = 0; this.gly = 0.25; }
              else { this.glx = (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 1); this.gly = rand(-0.4, 0.5); }
            }
            tx = this.glx; ty = this.gly; ry = this.glx * 0.18;
          }
          this.gx += (tx * gxMax - this.gx) * r;
          this.gy += (ty * GAZE_Y - this.gy) * r;
          this.yawTarget = ry;
        }
        pokeBadge() {
          this.squish(0.7);
          if (!this.awake) { this.peekUntil = clock + 0.9; return; }
          if (!RM && this.grounded && this.crouch <= 0) this.hop(0, 0, 0.12, { keepYaw: true, anticip: 0.03 });
        }
        syncBadge() {
          this.hopG.position.y = this.y;
          this.syncCommon();
          this.syncBlob(this.y, colors.shadow * 0.9);
        }
      }

      // ================================================================ field
      var F = null, fieldScene = null, fieldCam = null;
      if (options.field) {
        fieldScene = new THREE.Scene();
        fieldScene.environment = envRT.texture;
        fieldCam = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
        var fLight = new THREE.DirectionalLight(0xffffff, 0.55);
        fLight.position.set(-4.5, 10, 6.5);
        fieldScene.add(fLight);
        F = {
          bots: [], agents: [], master: null, convos: [], regions: null, state: 'asleep',
          convoTimer: 2.5, visitTimer: 6, acc: 0, placed: false, camKey: '', clearKey: '',
          clearOpt: normRects(options.field.clearRect), botSize: num(options.field.botSize, 0), zPool: [],
          camTarget: new THREE.Vector3(0, 0.45, 0), camDir: new THREE.Vector3()
        };
        var fb = options.field.bots || [];
        if (options.field.master) {
          var mo = options.field.master === true ? {} : options.field.master;
          F.master = new Bot('field', { master: true, color: mo.color || colors.master });
          F.bots.push(F.master);
        }
        fb.forEach(function (d) {
          var b = new Bot('field', { color: d.color, shape: d.shape === 'auto' ? autoShape(d.color) : d.shape, size: d.size });
          F.agents.push(b); F.bots.push(b);
        });
        F.bots.forEach(function (b) { fieldScene.add(b.root); });
        if (options.field.state === 'awake') { F.state = 'awake'; F.bots.forEach(function (b) { b.wakeInstant(); }); }
      }

      function normRects(r) {
        if (!r) return [];
        var list = Array.isArray(r) ? r : [r];
        return list.filter(function (q) { return q && isFinite(q.x) && isFinite(q.y) && isFinite(q.w) && isFinite(q.h); })
          .map(function (q) { return { x: +q.x, y: +q.y, w: +q.w, h: +q.h }; });
      }
      function pxToNdcX(px) { return px / viewW * 2 - 1; }
      function pxToNdcY(py) { return 1 - py / viewH * 2; }
      var hitPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitV = new THREE.Vector3(), hitNdc = new THREE.Vector2();
      function hit(nx, ny, h) {
        for (var i = 0; i < 12; i++) {
          hitNdc.set(nx, ny);
          raycaster.setFromCamera(hitNdc, fieldCam);
          hitPlane.constant = -h;
          var p = raycaster.ray.intersectPlane(hitPlane, hitV);
          if (p) return { x: p.x, z: p.z };
          ny -= 0.1;
        }
        return { x: 0, z: 0 };
      }

      function clearRects() {
        var pad = 12 * cssScale, out = [];
        F.clearOpt.forEach(function (q) {
          out.push({ left: q.x * viewW - pad, top: q.y * viewH - pad, right: (q.x + q.w) * viewW + pad, bottom: (q.y + q.h) * viewH + pad });
        });
        if (root) {
          var els = root.querySelectorAll('[data-jelly-clear]');
          for (var i = 0; i < els.length; i++) {
            var r = els[i].getBoundingClientRect();
            if (r.width < 1 || r.height < 1) continue;
            out.push({ left: r.left - canvasRect.left - pad, top: r.top - canvasRect.top - pad, right: r.right - canvasRect.left + pad, bottom: r.bottom - canvasRect.top + pad });
          }
        }
        var lim = 30;
        return out.map(function (q) {
          return { left: clamp(q.left, -lim, viewW + lim), top: clamp(q.top, -lim, viewH + lim), right: clamp(q.right, -lim, viewW + lim), bottom: clamp(q.bottom, -lim, viewH + lim) };
        }).filter(function (q) { return q.right > q.left + 2 && q.bottom > q.top + 2 && q.right > 0 && q.left < viewW && q.bottom > 0 && q.top < viewH; });
      }

      function regionsFor(Htop, rects) {
        var m = 6 * cssScale, mx = 2 * m / viewW, yTop = pxToNdcY(m), yBot = pxToNdcY(viewH - m);
        var A = makePoly([hit(-1 + mx, yBot, 0), hit(1 - mx, yBot, 0), hit(1 - mx, yTop, Htop), hit(-1 + mx, yTop, Htop)]);
        var K = rects.map(function (r) {
          var l = pxToNdcX(r.left), rr = pxToNdcX(r.right), t = pxToNdcY(r.top), b = pxToNdcY(r.bottom);
          return makePoly([hit(l, b, Htop), hit(rr, b, Htop), hit(rr, t, 0), hit(l, t, 0)]);
        });
        return { A: A, K: K };
      }
      function fReg(b) { return b.master ? F.regions.master : F.regions.agent; }
      function masterZone() { return F.master ? F.master.radius + 0.6 : 0; }
      function insideK(b, margin) {
        var K = fReg(b).K, r = b.radius - (margin || 0);
        for (var i = 0; i < K.length; i++) if (polyDepth(K[i], b.x, b.z) > -r) return true;
        return false;
      }
      function validSpot(b, x, z, extra, ignoreMaster) {
        var R = fReg(b), r = b.radius + (extra || 0);
        if (polyDepth(R.A, x, z) < r) return false;
        for (var i = 0; i < R.K.length; i++) if (polyDepth(R.K[i], x, z) > -r) return false;
        if (!ignoreMaster && F.master && b !== F.master && F.master.active && Math.hypot(x - F.master.x, z - F.master.z) < masterZone()) return false;
        return true;
      }
      function screenSpot(b, extra, ignoreMaster) {
        for (var i = 0; i < 40; i++) {
          var p = hit(pxToNdcX(rand(0, viewW)), pxToNdcY(rand(0, viewH)), b.H * b.size * 0.5);
          if (validSpot(b, p.x, p.z, extra, ignoreMaster)) return p;
        }
        return null;
      }
      function crowded(b, x, z) {
        for (var i = 0; i < F.bots.length; i++) {
          var o = F.bots[i];
          if (o === b || !o.active) continue;
          var tx = o.spot ? o.spot.x : o.x, tz = o.spot ? o.spot.z : o.z;
          if (Math.hypot(tx - x, tz - z) < o.radius + b.radius + 0.15) return true;
        }
        return false;
      }
      function randomSpot(b) {
        for (var i = 0; i < 24; i++) {
          var a = Math.random() * TAU, d = rand(0.9, 2.8);
          var x = b.x + Math.sin(a) * d, z = b.z + Math.cos(a) * d;
          if (validSpot(b, x, z, 0.15) && !crowded(b, x, z)) return { x: x, z: z };
        }
        return screenSpot(b, 0.15);
      }
      function routeTarget(b, tx, tz) {
        var K = fReg(b).K, m = b.radius + 0.12;
        for (var i = 0; i < K.length; i++) {
          var P = K[i];
          if (!segHitsPoly(P, b.x, b.z, tx, tz, m)) continue;
          var best = null, bc = Infinity;
          for (var j = 0; j < P.pts.length; j++) {
            var p = P.pts[j], ox = p.x - P.cx, oz = p.z - P.cz, l = Math.hypot(ox, oz) || 1;
            var cx = p.x + ox / l * (b.radius + 0.45), cz = p.z + oz / l * (b.radius + 0.45);
            if (!validSpot(b, cx, cz, 0, true)) continue;
            if (segHitsPoly(P, b.x, b.z, cx, cz, m)) continue;
            var cost = Math.hypot(cx - b.x, cz - b.z) + Math.hypot(tx - cx, tz - cz);
            if (cost < bc) { bc = cost; best = { x: cx, z: cz }; }
          }
          if (best) return best;
        }
        return { x: tx, z: tz };
      }
      function escapeSpot(b) {
        var R = fReg(b), best = null, bd = Infinity;
        for (var i = 0; i < R.K.length; i++) {
          var P = R.K[i];
          if (polyDepth(P, b.x, b.z) <= -b.radius) continue;
          for (var j = 0; j < P.edges.length; j++) {
            var e = P.edges[j], d = (b.x - e.ax) * e.nx + (b.z - e.az) * e.nz, push = d + b.radius + 0.35;
            var x = b.x - e.nx * push, z = b.z - e.nz * push;
            if (push < bd && validSpot(b, x, z, 0.05, true)) { bd = push; best = { x: x, z: z }; }
          }
        }
        return best || screenSpot(b, 0.05, true);
      }
      function pointerNearField(b) {
        if (!pointer.inside || !pointer.hasWorld || clock - pointer.last > 2.5) return false;
        var dx = pointer.world.x - b.x, dz = pointer.world.z - b.z;
        return dx * dx + dz * dz < 3.3 * 3.3;
      }

      function fieldLayout(rects, cameraChanged) {
        var cssW = viewW / cssScale, cssH = viewH / cssScale, aspect = viewW / viewH;
        if (cameraChanged) {
          var portrait = aspect < 0.85;
          fieldCam.aspect = aspect;
          fieldCam.fov = portrait ? 30 : 24;
          var el = portrait ? 0.8 : 0.7;
          var wpx = (F.botSize > 0 ? F.botSize : clamp(cssW * 0.05 + cssH * 0.02, 40, 80)) * cssScale;
          var d = viewH / (2 * Math.tan(fieldCam.fov * Math.PI / 360) * wpx);
          F.camDir.set(0, Math.sin(el), Math.cos(el));
          fieldCam.position.copy(F.camTarget).addScaledVector(F.camDir, d);
          fieldCam.far = d * 6 + 50;
          fieldCam.lookAt(F.camTarget);
          fieldCam.updateProjectionMatrix();
          fieldCam.updateMatrixWorld();
        }
        var agentTop = 1.2, i;
        for (i = 0; i < F.agents.length; i++) agentTop = Math.max(agentTop, (F.agents[i].H + ANT_L + ANT_BALL * 2) * F.agents[i].size);
        var masterTop = F.master ? (F.master.H + ANT_L + ANT_BALL * 2) * F.master.size : agentTop;
        F.regions = { agent: regionsFor(agentTop, rects), master: regionsFor(masterTop, rects) };
        if (cameraChanged || !F.placed) updateActiveCount();
        chooseMasterHome(rects, cameraChanged || !F.placed);
      }
      function updateActiveCount() {
        var R = F.regions.agent, free = polyArea(R.A.pts);
        R.K.forEach(function (P) { free -= polyArea(clipPoly(P.pts, R.A)); });
        if (F.master) free -= Math.PI * Math.pow(F.master.radius + 0.5, 2);
        var n = clamp(Math.floor(free / 2.6), Math.min(3, F.agents.length), F.agents.length);
        F.agents.forEach(function (b, i) { setActive(b, i < n); });
      }
      function setActive(b, on) {
        if (on === b.active) return;
        b.active = on;
        if (on) {
          if (F.placed) {
            var p = screenSpot(b, 0.1) || { x: 0, z: 0 };
            b.x = p.x; b.z = p.z; b.y = 0; b.vx = b.vz = b.vy = 0; b.grounded = true;
            b.vis.x = 0; b.vis.v = 0;
          }
          b.vis.t = 1;
          if (F.state === 'awake') b.wakeInstant();
        } else {
          if (b.convo) b.convo.cancel();
          b.vis.t = 0;
          if (!F.placed) { b.vis.x = 0; b.vis.v = 0; }
        }
      }
      function chooseMasterHome(rects, force) {
        var M = F.master;
        if (!M) return;
        if (!force && validSpot(M, M.home.x, M.home.z, 0.05, true)) return;
        var big = null;
        rects.forEach(function (q) { if (!big || (q.right - q.left) * (q.bottom - q.top) > (big.right - big.left) * (big.bottom - big.top)) big = q; });
        var cands = [], hm = M.H * M.size * 0.5;
        if (big) {
          var narrow = viewW / viewH < 0.85 || (big.right - big.left) > viewW * 0.72;
          var top = { px: viewW / 2, py: Math.max(0, big.top) / 2 };
          var bottom = { px: viewW / 2, py: (Math.min(viewH, big.bottom) + viewH) / 2 };
          var left = { px: Math.max(0, big.left) / 2, py: (big.top + big.bottom) / 2 - (big.bottom - big.top) * 0.1 };
          var right = { px: (Math.min(viewW, big.right) + viewW) / 2, py: (big.top + big.bottom) / 2 - (big.bottom - big.top) * 0.1 };
          cands = narrow ? [bottom, top, left, right] : [top, left, right, bottom];
        } else cands = [{ px: viewW / 2, py: viewH * 0.55 }];
        for (var i = 0; i < cands.length; i++) {
          var p = hit(pxToNdcX(cands[i].px), pxToNdcY(cands[i].py), hm);
          if (validSpot(M, p.x, p.z, 0.15, true)) { M.home = p; return; }
        }
        M.home = screenSpot(M, 0.05, true) || { x: 0, z: 0 };
      }
      function placeAll() {
        var M = F.master, placed = [];
        if (M) { M.x = M.home.x; M.z = M.home.z; placed.push(M); }
        F.agents.forEach(function (b) {
          if (!b.active) return;
          var best = null, bestScore = -Infinity;
          for (var i = 0; i < 70; i++) {
            var p = hit(pxToNdcX(rand(0, viewW)), pxToNdcY(rand(0, viewH)), b.H * b.size * 0.5);
            if (!validSpot(b, p.x, p.z, 0.1, true)) continue;
            var md = 10;
            for (var j = 0; j < placed.length; j++) md = Math.min(md, Math.hypot(placed[j].x - p.x, placed[j].z - p.z) - placed[j].radius - b.radius);
            if (md > bestScore) { bestScore = md; best = p; }
          }
          if (!best) best = screenSpot(b, 0, true) || { x: 0, z: 0 };
          b.x = best.x; b.z = best.z; b.home = { x: b.x, z: b.z };
          placed.push(b);
        });
        F.bots.forEach(function (b) {
          b.yaw = b.yawTarget = Math.atan2(fieldCam.position.x - b.x, fieldCam.position.z - b.z) + (b.master ? 0 : rand(-0.35, 0.35));
        });
      }

      function collide() {
        var bs = F.bots, i, j;
        for (i = 0; i < bs.length; i++) {
          var a = bs[i];
          if (!a.active) continue;
          for (j = i + 1; j < bs.length; j++) {
            var b = bs[j];
            if (!b.active) continue;
            var dx = b.x - a.x, dz = b.z - a.z, minD = a.radius + b.radius, d2 = dx * dx + dz * dz;
            if (d2 >= minD * minD) continue;
            var d = Math.sqrt(d2);
            if (d < 1e-4) { dx = Math.random() - 0.5; dz = Math.random() - 0.5; d = Math.hypot(dx, dz); }
            var nx = dx / d, nz = dz / d, overlap = minD - d, wa = a.invMass, wb = b.invMass, ws = wa + wb;
            a.x -= nx * overlap * wa / ws; a.z -= nz * overlap * wa / ws;
            b.x += nx * overlap * wb / ws; b.z += nz * overlap * wb / ws;
            var rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
            if (rv < 0) {
              var jimp = -1.5 * rv / ws;
              a.vx -= jimp * wa * nx; a.vz -= jimp * wa * nz; b.vx += jimp * wb * nx; b.vz += jimp * wb * nz;
              var s = clamp(-rv * 0.55, 0, 2.4);
              if (s > 0.25) { a.bump(nx, nz, s, b); b.bump(-nx, -nz, s, a); }
            }
          }
        }
      }
      function constrain(dt) {
        for (var i = 0; i < F.bots.length; i++) {
          var b = F.bots[i];
          if (!b.active) continue;
          var R = fReg(b), k, e, d;
          var rate = b.mode === 'waking' ? 0 : b.awake ? 3 : 0.6;
          for (k = 0; k < R.K.length && rate > 0; k++) {
            var P = R.K[k], minD = Infinity, me = null, out = false;
            for (var q = 0; q < P.edges.length; q++) {
              e = P.edges[q];
              d = (b.x - e.ax) * e.nx + (b.z - e.az) * e.nz + b.radius;
              if (d <= 0) { out = true; break; }
              if (d < minD) { minD = d; me = e; }
            }
            if (out || !me) continue;
            var stp = Math.min(minD, rate * dt);
            b.x -= me.nx * stp; b.z -= me.nz * stp;
            var vn = b.vx * me.nx + b.vz * me.nz;
            if (vn > 0) { b.vx -= vn * me.nx * 1.5; b.vz -= vn * me.nz * 1.5; }
          }
          for (k = 0; k < R.A.edges.length; k++) {
            e = R.A.edges[k];
            d = (b.x - e.ax) * e.nx + (b.z - e.az) * e.nz;
            if (d < b.radius) {
              var push = b.radius - d;
              b.x += e.nx * push; b.z += e.nz * push;
              var vn2 = b.vx * e.nx + b.vz * e.nz;
              if (vn2 < 0) { b.vx -= 1.6 * vn2 * e.nx; b.vz -= 1.6 * vn2 * e.nz; }
            }
          }
        }
      }

      // ---- conversations
      class Convo {
        constructor(a, b, visit, spots) {
          this.a = a; this.b = b; this.visit = visit; this.done = false;
          this.phase = 'approach'; this.t = 0;
          this.turns = visit ? 2 : randInt(3, 5);
          this.turn = 0; this.speaker = a; this.beat = 0; this.beats = randInt(2, 3); this.beatT = 0.3;
          a.convo = this; b.convo = this; a.partner = b; b.partner = a;
          if (RM) {
            a.spot = b.spot = null; a.arrived = b.arrived = true;
            a.setMode('talk'); b.setMode('talk'); this.phase = 'talk';
            return;
          }
          if (visit) {
            a.home = { x: a.x, z: a.z };
            a.spot = { x: spots.x, z: spots.z }; a.arrived = false; a.setMode('goto');
            b.spot = null; b.setMode('talk');
          } else {
            a.spot = spots[0]; a.arrived = false; a.setMode('goto');
            b.spot = spots[1]; b.arrived = false; b.setMode('goto');
          }
        }
        update(dt) {
          if (this.done) return;
          var a = this.a, b = this.b;
          this.t += dt;
          if (this.phase === 'approach') {
            if ((a.arrived && (this.visit || b.arrived)) || this.t > 6.5) {
              this.phase = 'talk'; a.spot = b.spot = null; a.setMode('talk'); b.setMode('talk'); this.beatT = 0.3;
            }
            return;
          }
          this.beatT -= dt;
          if (this.beatT > 0) return;
          var sp = this.speaker;
          if (this.beat < this.beats) {
            sp.talkBounce(false); this.beat++;
            this.beatT = sp.master ? rand(0.36, 0.44) : rand(0.24, 0.32);
          } else {
            this.turn++;
            if (this.turn >= this.turns) { this.finish(); return; }
            this.speaker = sp === a ? b : a; this.beat = 0;
            this.beats = this.speaker.master ? 2 : randInt(2, 3);
            this.beatT = rand(0.22, 0.38);
          }
        }
        release() {
          this.done = true;
          var self = this;
          [this.a, this.b].forEach(function (x) { if (x.convo === self) { x.convo = null; x.partner = null; } });
        }
        finish() {
          var a = this.a, b = this.b;
          this.release();
          if (this.visit && !RM) {
            var h = validSpot(a, a.home.x, a.home.z, 0.05) ? a.home : randomSpot(a);
            if (h) { a.spot = { x: h.x, z: h.z }; a.arrived = false; a.setMode('wander'); } else a.setMode('idle', 1);
            b.setMode('idle', rand(1.5, 3));
          } else {
            if (a.mode === 'talk') a.setMode('idle', rand(0.6, 1.6));
            if (b.mode === 'talk') b.setMode('idle', rand(0.6, 1.6));
          }
        }
        cancel() {
          if (this.done) return;
          this.release();
          [this.a, this.b].forEach(function (x) { if (x.mode === 'talk' || x.mode === 'goto') { x.spot = null; x.setMode('idle', rand(0.5, 1.2)); } });
        }
      }
      function available(b) { return b.active && b.awake && !b.convo && !b.master && b.grounded && (b.mode === 'idle' || b.mode === 'wander'); }
      function separated(a, b) {
        var K = fReg(a).K;
        for (var i = 0; i < K.length; i++) if (segHitsPoly(K[i], a.x, a.z, b.x, b.z, 0.2)) return true;
        return false;
      }
      function pairSpots(a, b) {
        var gap = a.radius + b.radius + 0.38, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1;
        dx /= d; dz /= d;
        var mids = [{ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, { x: a.x + dx * gap / 2, z: a.z + dz * gap / 2 }, { x: b.x - dx * gap / 2, z: b.z - dz * gap / 2 }];
        var dirs = [[dx, dz], [-dz, dx]];
        for (var i = 0; i < mids.length; i++) {
          for (var j = 0; j < dirs.length; j++) {
            var ux = dirs[j][0], uz = dirs[j][1], m = mids[i];
            var s1 = { x: m.x - ux * gap / 2, z: m.z - uz * gap / 2 }, s2 = { x: m.x + ux * gap / 2, z: m.z + uz * gap / 2 };
            if (validSpot(a, s1.x, s1.z, 0) && validSpot(b, s2.x, s2.z, 0)) return [s1, s2];
          }
        }
        return null;
      }
      function startConvo() {
        var pool = F.agents.filter(available);
        if (pool.length < 2) return;
        var a = pool[randInt(0, pool.length - 1)];
        var others = pool.filter(function (b) { return b !== a && !separated(a, b) && dist(a, b) < 4.5; })
          .sort(function (p, q) { return dist(a, p) - dist(a, q); }).slice(0, 3);
        if (RM) others = others.filter(function (b) { return dist(a, b) < 2.6; });
        for (var i = 0; i < others.length; i++) {
          var b = others[(i + randInt(0, others.length - 1)) % others.length];
          var sp = RM ? [null, null] : pairSpots(a, b);
          if (sp) { F.convos.push(new Convo(a, b, false, sp)); return; }
        }
      }
      function startVisit() {
        var M = F.master;
        if (RM || !M || !M.active || M.convo || !M.awake || M.mode !== 'idle' || !M.grounded) return;
        var pool = F.agents.filter(available).sort(function (p, q) { return dist(p, M) - dist(q, M); }).slice(0, 4);
        if (!pool.length) return;
        var a = pool[randInt(0, pool.length - 1)];
        var gap = a.radius + M.radius + 0.3, base = Math.atan2(a.x - M.x, a.z - M.z);
        var offs = [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2.2, -2.2];
        for (var i = 0; i < offs.length; i++) {
          var ang = base + offs[i], x = M.x + Math.sin(ang) * gap, z = M.z + Math.cos(ang) * gap;
          if (validSpot(a, x, z, 0.05, true)) { F.convos.push(new Convo(a, M, true, { x: x, z: z })); return; }
        }
      }
      function director(dt) {
        for (var i = F.convos.length - 1; i >= 0; i--) { F.convos[i].update(dt); if (F.convos[i].done) F.convos.splice(i, 1); }
        if (F.state !== 'awake') return;
        F.convoTimer -= dt; F.visitTimer -= dt;
        if (F.convoTimer <= 0) { F.convoTimer = rand(2.4, 4.4); if (F.convos.filter(function (c) { return !c.visit; }).length < 2) startConvo(); }
        if (F.visitTimer <= 0) { F.visitTimer = rand(5.5, 9.5); if (!F.convos.some(function (c) { return c.visit; })) startVisit(); }
      }
      function wakeAll() {
        F.convos.slice().forEach(function (c) { c.cancel(); });
        F.state = 'awake';
        F.zPool.forEach(function (z) { if (z.alive && z.kill < 0) z.kill = 0.3; });
        if (F.master) F.master.queueWake(0.1);
        var act = F.agents.filter(function (b) { return b.active; });
        var blocked = act.filter(function (b) { return insideK(b, 0); });
        var rest = act.filter(function (b) { return blocked.indexOf(b) < 0; })
          .sort(function (a, b) { return Math.atan2(a.x, a.z) - Math.atan2(b.x, b.z); });
        blocked.concat(rest).forEach(function (b, i) { b.queueWake((F.master ? 0.45 : 0.1) + i * 0.12); });
        F.convoTimer = 2.8; F.visitTimer = rand(5, 7);
      }
      function sleepAll() {
        F.convos.slice().forEach(function (c) { c.cancel(); });
        F.state = 'sleeping';
        F.agents.forEach(function (b) { if (b.active) b.goToSleep(rand(0, 1.0)); });
        if (F.master) F.master.goToSleep(F.agents.length ? 1.5 : 0.1);
      }

      // ---- "z" sprites (inside the 3D scene)
      function spawnZ(bot) {
        var z = null;
        for (var i = 0; i < F.zPool.length; i++) if (!F.zPool[i].alive) { z = F.zPool[i]; break; }
        if (!z) {
          if (F.zPool.length >= 12) return;
          var mat = new THREE.SpriteMaterial({ map: shared.zTex, color: new THREE.Color(colors.z), transparent: true, depthTest: false, depthWrite: false, opacity: 0 });
          var sp = new THREE.Sprite(mat);
          sp.renderOrder = 10;
          fieldScene.add(sp);
          z = { sprite: sp, mat: mat, alive: false, origin: new THREE.Vector3() };
          F.zPool.push(z);
        }
        bot.ball.getWorldPosition(z.origin);
        z.alive = true; z.t = 0; z.life = rand(2.4, 3.2); z.phase = Math.random() * TAU;
        z.dir = Math.random() < 0.5 ? -1 : 1; z.size = bot.size * (Math.random() < 0.35 ? 1.25 : 1); z.kill = -1;
        z.sprite.visible = true;
      }
      function updateZs(dt) {
        for (var i = 0; i < F.zPool.length; i++) {
          var z = F.zPool[i];
          if (!z.alive) continue;
          z.t += dt;
          var p = z.t / z.life, fade = 1;
          if (z.kill >= 0) { z.kill -= dt; fade = Math.max(0, z.kill / 0.3); }
          if (p >= 1 || fade <= 0) { z.alive = false; z.sprite.visible = false; continue; }
          var sw = RM ? 0.3 : 1;
          z.sprite.position.set(
            z.origin.x + (Math.sin(p * 3.2 + z.phase) * 0.12 + p * 0.3 * z.dir) * sw * z.size,
            z.origin.y + 0.1 + p * (RM ? 0.35 : 0.95) * z.size,
            z.origin.z
          );
          var sc = 0.24 * z.size * (0.55 + p * 0.75);
          z.sprite.scale.set(sc, sc, 1);
          z.sprite.material.rotation = (-12 + Math.sin(p * 4 + z.phase) * 8) * Math.PI / 180;
          z.mat.opacity = Math.pow(Math.sin(p * Math.PI), 0.8) * fade;
        }
      }

      function updatePointerWorld() {
        if (!pointer.dirty) return;
        pointer.dirty = false;
        hitNdc.set(pxToNdcX(pointer.x), pxToNdcY(pointer.y));
        raycaster.setFromCamera(hitNdc, fieldCam);
        hitPlane.constant = -0.45;
        pointer.hasWorld = !!raycaster.ray.intersectPlane(hitPlane, pointer.world);
      }
      function pickField() {
        hitNdc.set(pxToNdcX(pointer.x), pxToNdcY(pointer.y));
        raycaster.setFromCamera(hitNdc, fieldCam);
        var bodies = F.bots.filter(function (b) { return b.active && b.root.visible; }).map(function (b) { return b.body; });
        var hits = raycaster.intersectObjects(bodies, false);
        if (hits.length) return hits[0].object.userData.bot;
        hitPlane.constant = -0.4;
        var p = raycaster.ray.intersectPlane(hitPlane, hitV);
        if (!p) return null;
        var best = null, bd = Infinity;
        F.bots.forEach(function (b) { if (!b.active) return; var d = Math.hypot(b.x - p.x, b.z - p.z) - b.radius; if (d < bd) { bd = d; best = b; } });
        return bd < 0.25 ? best : null;
      }

      function fieldFrame(dt, layoutChanged) {
        var rects = clearRects();
        var key = rects.map(function (q) { return [q.left, q.top, q.right, q.bottom].map(function (v) { return Math.round(v / 2); }).join(','); }).join('|');
        if (layoutChanged || key !== F.clearKey || !F.regions) {
          F.clearKey = key;
          fieldLayout(rects, layoutChanged || !F.regions);
        }
        if (!F.placed) { placeAll(); F.placed = true; }
        updatePointerWorld();
        director(dt);
        var i, bs = F.bots;
        for (i = 0; i < bs.length; i++) if (bs[i].active) bs[i].thinkField(dt);
        F.acc += dt;
        var n = 0;
        while (F.acc >= STEP && n < 10) {
          for (i = 0; i < bs.length; i++) if (bs[i].active) bs[i].step(STEP);
          collide();
          constrain(STEP);
          F.acc -= STEP; n++;
        }
        if (n >= 10) F.acc = 0;
        for (i = 0; i < bs.length; i++) bs[i].syncField(dt);
        updateZs(dt);
        if (F.state === 'sleeping' && bs.every(function (b) { return !b.active || b.mode === 'sleep'; })) F.state = 'asleep';
      }

      // ================================================================ badges
      var badges = new Map(), badgeList = [], scanDirty = true, badgeAcc = 0;
      var clipStyleCache = new WeakMap();
      function clipsContent(el) {
        var v = clipStyleCache.get(el);
        if (v === undefined) {
          var cs = getComputedStyle(el);
          v = cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
          clipStyleCache.set(el, v);
        }
        return v;
      }
      function clipAncestors(el) {
        var out = [], n = el.parentElement;
        while (n && n !== document.documentElement) {
          if (n === canvas) break;
          if (clipsContent(n)) out.push(n);
          if (n === root) break;
          n = n.parentElement;
        }
        return out;
      }
      function scan() {
        scanDirty = false;
        clipStyleCache = new WeakMap();
        if (!root) return;
        var els = root.querySelectorAll('[data-jelly]'), seen = new Set(), i;
        for (i = 0; i < els.length; i++) {
          var el = els[i];
          if (el === canvas) continue;
          seen.add(el);
          var attr = (el.getAttribute('data-jelly') || '').trim().toLowerCase();
          var isMaster = el.hasAttribute('data-master');
          var color = el.getAttribute('data-color') || (isMaster ? colors.master : '');
          var shape = isMaster ? 'square' : (DEFS[attr] ? attr : (attr === 'auto' ? autoShape(color) : 'square'));
          var state = (el.getAttribute('data-state') || 'awake').trim().toLowerCase();
          if (state !== 'asleep' && state !== 'speaking') state = 'awake';
          var b = badges.get(el);
          if (b && (b.shapeName !== shape || b.master !== isMaster)) { b.destroy(); badges.delete(el); b = null; }
          if (!b) {
            b = new Bot('badge', { shape: shape, color: color || '#2563EB', master: isMaster });
            b.el = el; b.initState(state);
            badges.set(el, b);
            badgeScene.add(b.root);
          } else if (color && color.toLowerCase() !== b.colorHex.toLowerCase()) b.setColor(color);
          b.targetState = state;
          b.dsize = num(el.getAttribute('data-size'), 0);
          b.order = i;
          b.clipEls = clipAncestors(el);
          var vs = getComputedStyle(el).visibility;
          b.cssHidden = vs === 'hidden' || vs === 'collapse';
        }
        badges.forEach(function (b, el) { if (!seen.has(el)) { b.destroy(); badges.delete(el); } });
        badgeList = Array.from(badges.values()).sort(function (a, b) { return a.order - b.order; });
      }
      function badgeFrame(dt) {
        if (!badgeList.length) return 0;
        var rectCache = new Map(), live = [], speakers = [], i, b;
        function rectOf(el) { var r = rectCache.get(el); if (!r) { r = el.getBoundingClientRect(); rectCache.set(el, r); } return r; }
        for (i = 0; i < badgeList.length; i++) {
          b = badgeList[i];
          if (!b.el.isConnected) { scanDirty = true; b.root.visible = false; continue; }
          var r = b.el.getBoundingClientRect();
          var x = r.left - canvasRect.left, y = r.top - canvasRect.top;
          var cl = 0, ct = 0, cr = viewW, cb = viewH;
          for (var k = 0; k < b.clipEls.length; k++) {
            var ar = rectOf(b.clipEls[k]);
            cl = Math.max(cl, ar.left - canvasRect.left); ct = Math.max(ct, ar.top - canvasRect.top);
            cr = Math.min(cr, ar.right - canvasRect.left); cb = Math.min(cb, ar.bottom - canvasRect.top);
          }
          if (b.cssHidden || r.width < 3 || r.height < 3 || x + r.width <= cl || x >= cr || y + r.height <= ct || y >= cb) { b.root.visible = false; continue; }
          b.root.visible = true;
          b.fitBadge({ x: x, y: y, w: r.width, h: r.height });
          b.setClip(cl, ct, cr, cb);
          live.push(b);
          if (b.state === 'speaking') speakers.push(b);
        }
        for (i = 0; i < live.length; i++) live[i].thinkBadge(dt, speakers);
        badgeAcc += dt;
        var n = 0;
        while (badgeAcc >= STEP && n < 10) { for (i = 0; i < live.length; i++) live[i].step(STEP); badgeAcc -= STEP; n++; }
        if (n >= 10) badgeAcc = 0;
        for (i = 0; i < live.length; i++) live[i].syncBadge();
        return live.length;
      }

      // ================================================================ input
      function onPointerMove(e) {
        pointer.x = e.clientX - canvasRect.left; pointer.y = e.clientY - canvasRect.top;
        pointer.inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= canvasRect.width && pointer.y <= canvasRect.height;
        pointer.last = clock; pointer.dirty = true;
      }
      function onPointerDown(e) {
        onPointerMove(e);
        if (!pointer.inside) return;
        var t = e.target && e.target.closest ? e.target.closest('[data-jelly]') : null;
        if (t && badges.has(t)) { badges.get(t).pokeBadge(); kick(); return; }
        if (F && F.regions) { updatePointerWorld(); var b = pickField(); if (b) { b.poke(); kick(); } }
      }
      function onPointerOut(e) { if (!e.relatedTarget) pointer.inside = false; }
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerdown', onPointerDown, { passive: true });
      document.addEventListener('pointerout', onPointerOut, { passive: true });

      // ================================================================ loop
      var raf = 0, last = 0, inView = true, pageVisible = !document.hidden, sizeKey = '';
      function shouldRun() { return !disposed && inView && pageVisible; }
      function kick() {
        if (raf || !shouldRun()) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
      function measure() {
        var r = canvas.getBoundingClientRect();
        canvasRect = { left: r.left, top: r.top, width: r.width, height: r.height };
        var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
        var k = w + 'x' + h;
        if (k === sizeKey) return false;
        sizeKey = k;
        viewW = w; viewH = h;
        cssScale = canvas.clientWidth > 0 ? r.width / canvas.clientWidth : 1;
        if (!isFinite(cssScale) || cssScale <= 0) cssScale = 1;
        renderer.setPixelRatio(prCap);
        renderer.setSize(w, h, false);
        orthoCam.left = 0; orthoCam.right = w; orthoCam.top = 0; orthoCam.bottom = -h;
        orthoCam.updateProjectionMatrix();
        return true;
      }
      function frame(now) {
        raf = 0;
        if (!shouldRun()) return;
        raf = requestAnimationFrame(frame);
        var ms = now - last;
        if (ms < 1000 / maxFps - 2) return;
        var dt = Math.min(ms / 1000, 1 / 20);
        if (!(dt > 0)) dt = 1 / 60;
        last = now;
        clock += dt;
        var resized = measure();
        if (canvasRect.width < 2 || canvasRect.height < 2) return;
        if (scanDirty) scan();
        if (F) fieldFrame(dt, resized);
        var liveBadges = badgeFrame(dt);
        renderer.clear(true, true, true);
        if (F) renderer.render(fieldScene, fieldCam);
        if (liveBadges) { renderer.clearDepth(); renderer.render(badgeScene, orthoCam); }
      }

      var ro = window.ResizeObserver ? new ResizeObserver(function () { sizeKey = ''; kick(); }) : null;
      if (ro) { ro.observe(canvas); if (root) ro.observe(root); }
      var io = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
        inView = entries[entries.length - 1].isIntersecting; kick();
      }) : null;
      if (io) io.observe(canvas);
      var mo = (root && window.MutationObserver) ? new MutationObserver(function () { scanDirty = true; }) : null;
      if (mo) mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-jelly', 'data-color', 'data-state', 'data-master', 'data-size', 'class', 'style', 'hidden'] });
      function onVis() { pageVisible = !document.hidden; kick(); }
      document.addEventListener('visibilitychange', onVis);
      function onScroll() { kick(); }
      window.addEventListener('scroll', onScroll, { passive: true, capture: true });

      function dispose() {
        if (disposed) return;
        disposed = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (ro) ro.disconnect();
        if (io) io.disconnect();
        if (mo) mo.disconnect();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('pointerout', onPointerOut);
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('scroll', onScroll, true);
        if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq); }
        badges.forEach(function (b) { b.destroy(); });
        badges.clear(); badgeList = [];
        if (F) {
          F.bots.forEach(function (b) { b.destroy(); });
          F.zPool.forEach(function (z) { z.mat.dispose(); });
          F.bots = []; F.agents = []; F.zPool = [];
        }
        fieldEyeMat.dispose();
        envRT.dispose();
        // Free this context's copies of the shared buffers too; other live scenes re-upload lazily.
        for (var k in shared.shapes) shared.shapes[k].geo.dispose();
        ['eyeGeo', 'stickGeo', 'ballGeo', 'lidGeo', 'lidGeoThick', 'blobGeo', 'contactTex', 'zTex'].forEach(function (n) { if (shared[n]) shared[n].dispose(); });
        renderer.clear(true, true, true);
        renderer.renderLists.dispose();
        renderer.dispose();
        resetGL(renderer.getContext());
        release();
      }

      var handle = {
        wake: function () { if (F) wakeAll(); kick(); },
        sleep: function () { if (F) sleepAll(); kick(); },
        refresh: function () { scanDirty = true; sizeKey = ''; if (F) F.clearKey = '#'; kick(); },
        poke: function (target) {
          if (target && target.nodeType === 1) { var b = badges.get(target); if (b) b.pokeBadge(); }
          else if (F) {
            var fb = target === 'master' ? F.master : F.agents[target | 0];
            if (fb && fb.active) fb.poke();
          }
          kick();
        },
        setClearRect: function (r) { if (F) { F.clearOpt = normRects(r); F.clearKey = '#'; } kick(); },
        setColors: function (c) {
          c = c || {};
          if (c.sleepColor) { colors.sleep = c.sleepColor; sleepLin.copy(lin(c.sleepColor)); }
          if (c.zColor) { colors.z = c.zColor; if (F) F.zPool.forEach(function (z) { z.mat.color.set(c.zColor); }); }
          if (c.shadowOpacity !== undefined) colors.shadow = clamp(num(c.shadowOpacity, colors.shadow), 0, 1);
          var all = Array.from(badges.values()).concat(F ? F.bots : []);
          all.forEach(function (b) { b.u.uSleep.value.copy(sleepLin); });
          kick();
        },
        dispose: dispose
      };
      measure();
      kick();
      return handle;
    }

    return { createEngine: createEngine };
  }
})();
