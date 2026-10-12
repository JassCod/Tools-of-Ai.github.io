import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Ashima / Stefan Gustavson 3D simplex noise
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const PALETTE = /* glsl */ `
vec3 pal(float t){
  // cyan -> violet -> pink -> amber, cosine palette
  vec3 a=vec3(0.55,0.45,0.75);vec3 b=vec3(0.45,0.4,0.3);vec3 c=vec3(1.0,1.0,1.0);vec3 d=vec3(0.45,0.62,0.85);
  return a+b*cos(6.28318*(c*t+d));
}`;

export function createScene(canvas, { isMobile, reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  const DPR = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x04050d, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04050d, 0.035);
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 12);

  const world = new THREE.Group();
  scene.add(world);

  // ---------------- Morphing iridescent core ----------------
  const coreUniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.32 },
    uFreq: { value: 1.1 },
    uMorph: { value: 0 },
    uHover: { value: 0 },
  };
  const coreMat = new THREE.ShaderMaterial({
    uniforms: coreUniforms,
    vertexShader: /* glsl */ `
      uniform float uTime, uAmp, uFreq, uMorph, uHover;
      varying vec3 vN; varying vec3 vView; varying float vD;
      ${NOISE}
      vec3 displace(vec3 p){
        vec3 n = normalize(p);
        float t = uTime*0.35;
        float d = snoise(n*uFreq + vec3(t, t*0.7, -t*0.5));
        d += 0.5*snoise(n*uFreq*2.3 - vec3(t*1.3));
        // section-driven shape: smooth blob -> faceted crystal -> rippling
        float facet = abs(sin(n.x*6.0+uTime*0.6)*sin(n.y*6.0)*sin(n.z*6.0+uTime*0.4));
        float ripple = sin(length(n.xy)*14.0 - uTime*2.0)*0.12;
        float k = clamp(uMorph,0.0,4.0);
        float shape = mix(d, d*0.4 + facet*0.9, smoothstep(0.5,1.5,k) * (1.0-smoothstep(2.5,3.5,k)));
        shape += ripple * smoothstep(2.5,3.5,k);
        float amp = uAmp + uHover*0.18;
        return n * (1.0 + shape*amp);
      }
      void main(){
        vec3 p = displace(position);
        // recompute normal from neighbours
        vec3 n = normalize(position);
        vec3 tg = normalize(cross(n, vec3(0.0,1.0,0.0)+vec3(0.0001)));
        vec3 bt = normalize(cross(n, tg));
        float e = 0.01;
        vec3 pa = displace(position + tg*e);
        vec3 pb = displace(position + bt*e);
        vec3 nn = normalize(cross(pa-p, pb-p));
        if(dot(nn,n)<0.0) nn=-nn;
        vec4 mv = modelViewMatrix*vec4(p,1.0);
        vN = normalize(normalMatrix*nn);
        vView = normalize(-mv.xyz);
        vD = length(p);
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vN; varying vec3 vView; varying float vD;
      ${PALETTE}
      void main(){
        float fres = pow(1.0 - max(dot(vN, vView),0.0), 2.2);
        float t = dot(vN, vec3(0.3,0.6,0.2)) * 0.6 + vD*0.5 + uTime*0.05;
        vec3 base = pal(t);
        vec3 deep = vec3(0.04,0.03,0.12);
        vec3 col = mix(deep, base, 0.35 + fres*0.9);
        // specular streak
        vec3 L = normalize(vec3(0.6,0.8,0.5));
        float spec = pow(max(dot(reflect(-L, vN), vView),0.0), 32.0);
        col += spec*vec3(1.0,0.95,0.9)*0.9;
        col += fres*pal(t+0.3)*0.9;
        gl_FragColor = vec4(col*0.78, 1.0);
      }`,
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, isMobile ? 48 : 96), coreMat);
  world.add(core);

  // Glass halo rings around the core
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.35, wireframe: false });
  const rings = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(2.1 + i * 0.32, 0.006, 8, 220), ringMat.clone());
    r.material.color.set([0x5eead4, 0xa78bfa, 0xf472b6][i]);
    r.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    r.userData.speed = 0.12 + i * 0.07;
    rings.add(r);
  }
  world.add(rings);

  // ---------------- Morphing particle field ----------------
  const COUNT = isMobile ? 7000 : 16000;
  const shapes = buildShapes(COUNT);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(shapes[0], 3));
  shapes.slice(1).forEach((arr, i) => pGeo.setAttribute(`aPos${i + 1}`, new THREE.BufferAttribute(arr, 3)));
  const rand = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) rand[i] = Math.random();
  pGeo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));

  const pUniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uSize: { value: (isMobile ? 34 : 30) * DPR },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
  };
  const pMat = new THREE.ShaderMaterial({
    uniforms: pUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uMorph, uSize; uniform vec3 uMouse;
      attribute vec3 aPos1, aPos2, aPos3, aPos4; attribute float aRand;
      varying vec3 vCol; varying float vAlpha;
      ${NOISE}
      ${PALETTE}
      float stage(float k){ float x = clamp((uMorph-k)*1.35 - aRand*0.35, 0.0, 1.0); return x*x*(3.0-2.0*x); }
      void main(){
        vec3 p = position;
        p = mix(p, aPos1, stage(0.0));
        p = mix(p, aPos2, stage(1.0));
        p = mix(p, aPos3, stage(2.0));
        p = mix(p, aPos4, stage(3.0));
        // in-between turbulence: strongest mid-morph
        float mid = sin(fract(uMorph)*3.14159);
        float n = snoise(p*0.35 + uTime*0.15 + aRand);
        p += normalize(p+0.001) * n * (0.08 + mid*0.9);
        p.y += sin(uTime*0.8 + aRand*6.28)*0.04;
        vec4 mv = modelViewMatrix*vec4(p,1.0);
        // mouse repulsion in view space
        vec2 dm = mv.xy - uMouse.xy;
        float md = length(dm);
        mv.xy += normalize(dm+0.0001) * smoothstep(1.8,0.0,md) * 0.9;
        gl_Position = projectionMatrix*mv;
        gl_PointSize = uSize * (0.35 + aRand*0.8) / -mv.z;
        vCol = pal(aRand*0.6 + p.y*0.05 + uTime*0.03 + uMorph*0.12);
        vAlpha = 0.55 + 0.45*sin(uTime*1.5 + aRand*20.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCol; varying float vAlpha;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        a = pow(a, 1.6);
        gl_FragColor = vec4(vCol*1.25, a*vAlpha);
      }`,
  });
  const particles = new THREE.Points(pGeo, pMat);
  world.add(particles);

  // ---------------- India -> Australia arc on the globe ----------------
  const R = 3.4;
  const india = latLon(22.5, 79, R);
  const sydney = latLon(-33.87, 151.2, R);
  const mid = india.clone().add(sydney).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.55);
  const curve = new THREE.QuadraticBezierCurve3(india, mid, sydney);
  const arcUniforms = { uTime: { value: 0 }, uOpacity: { value: 1 } };
  const arc = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 160, 0.025, 8, false),
    new THREE.ShaderMaterial({
      uniforms: arcUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        uniform float uTime, uOpacity; varying vec2 vUv;
        void main(){
          float head = fract(uTime*0.25);
          float trail = smoothstep(head-0.35, head, vUv.x) * step(vUv.x, head);
          vec3 col = mix(vec3(0.37,0.92,0.83), vec3(0.98,0.75,0.14), vUv.x);
          float a = 0.18 + trail*1.4;
          gl_FragColor = vec4(col, a*uOpacity);
        }`,
    })
  );
  const markers = new THREE.Group();
  [india, sydney].forEach((v, i) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 16, 16),
      new THREE.MeshBasicMaterial({ color: i ? 0xfbbf24 : 0x5eead4, transparent: true })
    );
    m.position.copy(v);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.16, 40),
      new THREE.MeshBasicMaterial({ color: i ? 0xfbbf24 : 0x5eead4, transparent: true, side: THREE.DoubleSide })
    );
    halo.position.copy(v);
    halo.lookAt(v.clone().multiplyScalar(2));
    halo.userData.pulse = i * 0.5;
    markers.add(m, halo);
  });
  const globeExtras = new THREE.Group();
  globeExtras.add(arc, markers);
  // orient so India/Australia face the camera initially
  world.add(globeExtras);
  const baseRotY = -2.2;

  // ---------------- Background starfield + floating shards ----------------
  const starGeo = new THREE.BufferGeometry();
  const SC = isMobile ? 900 : 2200;
  const sp = new Float32Array(SC * 3);
  for (let i = 0; i < SC; i++) {
    sp[i * 3] = (Math.random() - 0.5) * 80;
    sp[i * 3 + 1] = (Math.random() - 0.5) * 80;
    sp[i * 3 + 2] = -10 - Math.random() * 50;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ size: 0.08, color: 0x9aa3ff, transparent: true, opacity: 0.7, depthWrite: false })
  );
  scene.add(stars);

  const shards = new THREE.Group();
  const shardGeos = [new THREE.OctahedronGeometry(0.35), new THREE.TetrahedronGeometry(0.4), new THREE.IcosahedronGeometry(0.3)];
  for (let i = 0; i < (isMobile ? 10 : 22); i++) {
    const m = new THREE.Mesh(
      shardGeos[i % 3],
      new THREE.MeshBasicMaterial({
        color: [0x5eead4, 0xa78bfa, 0xf472b6, 0xfbbf24][i % 4],
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      })
    );
    m.position.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 16, -4 - Math.random() * 14);
    m.userData.spin = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.6);
    m.userData.float = Math.random() * Math.PI * 2;
    shards.add(m);
  }
  scene.add(shards);

  // ---------------- Post-processing ----------------
  let composer = null;
  if (!isMobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.55, 0.32));
    composer.addPass(new OutputPass());
  }

  // ---------------- State driven by the page ----------------
  const state = {
    morph: 0, // target morph 0..4
    side: 1, // -1 left, 0 centre, 1 right
    scroll: 0, // 0..1 page progress
    hover: 0,
    mouse: new THREE.Vector2(0, 0),
  };
  const cur = { morph: 0, x: 0, scroll: 0, mx: 0, my: 0, hover: 0 };

  function sideOffset() {
    const aspect = window.innerWidth / window.innerHeight;
    if (window.innerWidth < 860) return 0;
    return Math.min(4.2, 2.3 * aspect);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (composer) composer.setSize(w, h);
    const small = w < 860;
    world.scale.setScalar(small ? 0.72 : 1);
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = { last: performance.now(), elapsedTime: 0, getDelta() { const n = performance.now(); const d = (n - this.last) / 1000; this.last = n; this.elapsedTime += Math.min(d, 0.05); return d; } };
  const tmp = new THREE.Vector3();
  let running = true;

  function tick() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime * (reduced ? 0.3 : 1);
    const k = 1 - Math.pow(0.001, dt); // frame-rate independent easing

    cur.morph += (state.morph - cur.morph) * k * 0.9;
    cur.x += (state.side * sideOffset() - cur.x) * k * 0.8;
    cur.scroll += (state.scroll - cur.scroll) * k;
    cur.mx += (state.mouse.x - cur.mx) * k * 0.6;
    cur.my += (state.mouse.y - cur.my) * k * 0.6;
    cur.hover += (state.hover - cur.hover) * k;

    coreUniforms.uTime.value = t;
    coreUniforms.uMorph.value = cur.morph;
    coreUniforms.uHover.value = cur.hover;
    coreUniforms.uFreq.value = 1.1 + cur.morph * 0.15;
    pUniforms.uTime.value = t;
    pUniforms.uMorph.value = cur.morph;
    arcUniforms.uTime.value = t;
    arcUniforms.uOpacity.value = Math.max(0, 1 - cur.morph * 2.2);
    markers.children.forEach((m) => {
      m.material.opacity = arcUniforms.uOpacity.value;
      if (m.userData.pulse !== undefined) {
        const s = 1 + ((t * 0.8 + m.userData.pulse) % 1) * 1.8;
        m.scale.setScalar(s);
        m.material.opacity = arcUniforms.uOpacity.value * (1 - ((t * 0.8 + m.userData.pulse) % 1));
      }
    });

    // world placement: slides sideways between sections, drifts along a 3D path with scroll
    world.position.x = cur.x;
    world.position.y = Math.sin(cur.scroll * Math.PI * 2) * 0.4;
    world.rotation.y = baseRotY + t * 0.08 + cur.scroll * Math.PI * 2.2 + cur.mx * 0.35;
    world.rotation.x = 0.25 + Math.sin(cur.scroll * Math.PI) * 0.35 - cur.my * 0.25;
    world.rotation.z = Math.sin(t * 0.1) * 0.05;
    core.rotation.y = -t * 0.12;
    rings.children.forEach((r, i) => {
      r.rotation.x += dt * r.userData.speed;
      r.rotation.y += dt * r.userData.speed * 0.6 * (i % 2 ? -1 : 1);
    });

    // camera flies forward through the field as you scroll (the "pathway")
    camera.position.z = 12 - Math.sin(cur.scroll * Math.PI) * 2.5;
    camera.position.x = cur.mx * 0.6;
    camera.position.y = cur.my * 0.4 + (cur.scroll - 0.5) * -1.2;
    camera.lookAt(tmp.set(cur.x * 0.35, 0, 0));

    stars.rotation.y = t * 0.005 + cur.scroll * 0.4;
    stars.position.z = cur.scroll * 18;
    shards.children.forEach((s) => {
      s.rotation.x += dt * s.userData.spin.x;
      s.rotation.y += dt * s.userData.spin.y;
      s.position.y += Math.sin(t + s.userData.float) * 0.002;
    });
    shards.position.z = cur.scroll * 10;
    shards.rotation.z = cur.scroll * 0.6;

    // mouse in world-space-ish (view space at particle depth) for repulsion
    pUniforms.uMouse.value.set(cur.mx * 5.5 - cur.x * 0.0, cur.my * 3.2, 0);

    if (composer) composer.render();
    else renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; clock.getDelta(); requestAnimationFrame(tick); }
  });

  return {
    state,
    start() { requestAnimationFrame(tick); },
  };
}

function latLon(lat, lon, r) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

// Five target formations, each COUNT points: globe, torus, double helix, wave grid, lattice cube
function buildShapes(COUNT) {
  const globe = new Float32Array(COUNT * 3);
  const torus = new Float32Array(COUNT * 3);
  const helix = new Float32Array(COUNT * 3);
  const wave = new Float32Array(COUNT * 3);
  const cube = new Float32Array(COUNT * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const side = Math.ceil(Math.sqrt(COUNT));
  const cubeN = Math.ceil(Math.cbrt(COUNT));

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    // globe — fibonacci sphere with slight shell thickness
    const y = 1 - (i / (COUNT - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = golden * i;
    const R = 3.4 + (Math.random() - 0.5) * 0.08;
    globe[i3] = Math.cos(th) * rr * R;
    globe[i3 + 1] = y * R;
    globe[i3 + 2] = Math.sin(th) * rr * R;

    // torus
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI * 2;
    const tR = 3.2, tr = 0.9 + (Math.random() - 0.5) * 0.15;
    torus[i3] = (tR + tr * Math.cos(v)) * Math.cos(u);
    torus[i3 + 1] = tr * Math.sin(v);
    torus[i3 + 2] = (tR + tr * Math.cos(v)) * Math.sin(u);

    // double helix with rungs
    const f = i / COUNT;
    const strand = i % 3;
    const ang = f * Math.PI * 10;
    const hy = (f - 0.5) * 9;
    if (strand < 2) {
      const a = ang + strand * Math.PI;
      helix[i3] = Math.cos(a) * 1.9 + (Math.random() - 0.5) * 0.25;
      helix[i3 + 1] = hy + (Math.random() - 0.5) * 0.15;
      helix[i3 + 2] = Math.sin(a) * 1.9 + (Math.random() - 0.5) * 0.25;
    } else {
      const s = Math.random() * 2 - 1;
      helix[i3] = Math.cos(ang) * 1.9 * s;
      helix[i3 + 1] = hy;
      helix[i3 + 2] = Math.sin(ang) * 1.9 * s;
    }

    // wave grid (a flowing data surface)
    const gx = (i % side) / side - 0.5;
    const gz = Math.floor(i / side) / side - 0.5;
    const wx = gx * 11, wz = gz * 11;
    wave[i3] = wx;
    wave[i3 + 1] = Math.sin(wx * 0.9) * 0.6 + Math.cos(wz * 0.8) * 0.6;
    wave[i3 + 2] = wz;

    // lattice cube (structure / compliance)
    const cx = i % cubeN, cy = Math.floor(i / cubeN) % cubeN, cz = Math.floor(i / (cubeN * cubeN));
    const sc = 4.4 / cubeN;
    cube[i3] = (cx - cubeN / 2) * sc;
    cube[i3 + 1] = (cy - cubeN / 2) * sc;
    cube[i3 + 2] = (cz - cubeN / 2) * sc;
  }
  return [globe, torus, helix, wave, cube];
}
