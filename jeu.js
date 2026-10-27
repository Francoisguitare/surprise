'use strict';
/* Une grande nouvelle… — petit jeu 3D pour annoncer le sexe du bébé.
   Quatre pièces : les biberons, le cadenas, la berceuse, le cadeau. */

// ===================== À personnaliser =====================
const CONFIG = {
  signature: 'Les futurs parents',                 // signé en bas du message final
  message: 'Nous avons tellement hâte de vous la présenter !',
  arrivee: '',                                      // ex. 'Arrivée prévue : mars 2027' (vide = rien)
  code: [2, 5, 3],                                  // nounours, canards, ballons de la salle de jeux
};
// ===========================================================

const DEBUG = /[?&]debug/.test(location.search);
const TACTILE = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const H = 3, PORTE = 2.4, OEIL = 1.5, RAYON = 0.3, VITESSE = 2.4;
const POLICE = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", "Trebuchet MS", sans-serif';
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lisse = (t) => t * t * (3 - 2 * t);
function hasard(graine) { let s = graine >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = hasard(2027);
const decor = {};   // objets animés du décor

// ===================== Rendu =====================
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let ratioMax = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(ratioMax);
const scene = new THREE.Scene();
const FOND = new THREE.Color(0xfff3e6);
scene.background = FOND.clone();
scene.fog = new THREE.Fog(FOND.clone(), 13, 34);
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 60);
camera.rotation.order = 'YXZ';

const ciel = new THREE.HemisphereLight(0xffffff, 0xfff0e2, 0.95);
scene.add(ciel);
const soleil = new THREE.DirectionalLight(0xfff0dc, 0.3);
soleil.position.set(3, 8, 5);
scene.add(soleil);
// lumière de la révélation : créée dès le départ (intensité 0) pour ne rien recompiler au grand moment
const lumRose = new THREE.PointLight(0xff5c9a, 0, 16, 1.4);
lumRose.position.set(0, 2.6, -36);
scene.add(lumRose);

function redim() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const champ = 2 * Math.atan(Math.tan(41 * Math.PI / 180) / camera.aspect) * 180 / Math.PI;
  camera.fov = clamp(champ, 56, 92);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', redim);
window.addEventListener('orientationchange', () => setTimeout(redim, 250));
redim();

// ===================== Briques =====================
const cacheMat = new Map();
function mat(couleur) {
  if (!cacheMat.has(couleur)) cacheMat.set(couleur, new THREE.MeshLambertMaterial({ color: couleur }));
  return cacheMat.get(couleur);
}
const GEO = {
  boite: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 20, 14),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
};
function boite(w, h, d, c, x, y, z, parent) {
  const m = new THREE.Mesh(GEO.boite, typeof c === 'number' ? mat(c) : c);
  m.scale.set(w, h, d); m.position.set(x, y, z); (parent || scene).add(m); return m;
}
function sphere(r, c, x, y, z, parent) {
  const m = new THREE.Mesh(GEO.sphere, typeof c === 'number' ? mat(c) : c);
  m.scale.setScalar(r); m.position.set(x, y, z); (parent || scene).add(m); return m;
}
function cylindre(r, h, c, x, y, z, parent) {
  const m = new THREE.Mesh(GEO.cyl, typeof c === 'number' ? mat(c) : c);
  m.scale.set(r, h, r); m.position.set(x, y, z); (parent || scene).add(m); return m;
}
function fil(a, b, c, r, parent) {
  const d = new THREE.Vector3().subVectors(b, a), l = d.length();
  const m = cylindre(r || 0.006, l, c || 0xffffff, 0, 0, 0, parent);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
function groupe(x, y, z, parent) { const g = new THREE.Group(); g.position.set(x, y, z); (parent || scene).add(g); return g; }

// ----- collisions (rectangles sur le sol) -----
const solides = [];
function solide(x0, x1, z0, z1, mur) {
  const s = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), actif: true, mur: !!mur };
  solides.push(s); return s;
}

// ===================== Textures dessinées =====================
function toile(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function texture(c, repete) {
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  if (repete) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function arrondi(x, X, Y, w, h, r) {
  x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
  x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
}
// petits dessins
function dEtoile(x, cx, cy, r, c) {
  x.fillStyle = c; x.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
}
function dNuage(x, cx, cy, s, c) {
  x.fillStyle = c; x.beginPath();
  x.arc(cx - s * 0.6, cy + s * 0.1, s * 0.45, 0, 7); x.arc(cx, cy - s * 0.2, s * 0.6, 0, 7);
  x.arc(cx + s * 0.6, cy + s * 0.1, s * 0.45, 0, 7); x.fill();
  x.fillRect(cx - s * 0.6, cy + s * 0.05, s * 1.2, s * 0.5);
}
function dCoeur(x, cx, cy, s, c) {
  x.fillStyle = c; x.beginPath(); x.moveTo(cx, cy + s * 0.9);
  x.bezierCurveTo(cx - s * 1.3, cy, cx - s * 0.6, cy - s * 0.95, cx, cy - s * 0.35);
  x.bezierCurveTo(cx + s * 0.6, cy - s * 0.95, cx + s * 1.3, cy, cx, cy + s * 0.9); x.fill();
}
function dLune(x, cx, cy, r, c, fond) {
  x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  x.fillStyle = fond; x.beginPath(); x.arc(cx + r * 0.45, cy - r * 0.25, r * 0.85, 0, 7); x.fill();
}
function dNote(x, cx, cy, s, c) {
  x.fillStyle = c; x.strokeStyle = c; x.lineWidth = s * 0.14;
  x.beginPath(); x.ellipse(cx, cy, s * 0.32, s * 0.24, -0.4, 0, 7); x.fill();
  x.beginPath(); x.moveTo(cx + s * 0.28, cy - s * 0.05); x.lineTo(cx + s * 0.28, cy - s); x.quadraticCurveTo(cx + s * 0.6, cy - s * 0.75, cx + s * 0.7, cy - s * 0.45); x.stroke();
}
function dNounours(x, cx, cy, s) {
  const b = '#b07a4f', cl = '#e6c49d';
  x.fillStyle = b;
  x.beginPath(); x.arc(cx - s * 0.36, cy - s * 0.38, s * 0.18, 0, 7); x.arc(cx + s * 0.36, cy - s * 0.38, s * 0.18, 0, 7); x.fill();
  x.beginPath(); x.ellipse(cx, cy + s * 0.55, s * 0.42, s * 0.4, 0, 0, 7); x.fill();
  x.beginPath(); x.arc(cx, cy, s * 0.42, 0, 7); x.fill();
  x.fillStyle = cl; x.beginPath(); x.ellipse(cx, cy + s * 0.12, s * 0.2, s * 0.15, 0, 0, 7); x.fill();
  x.beginPath(); x.ellipse(cx, cy + s * 0.6, s * 0.22, s * 0.22, 0, 0, 7); x.fill();
  x.fillStyle = '#3b2a20'; x.beginPath(); x.arc(cx - s * 0.15, cy - s * 0.08, s * 0.05, 0, 7); x.arc(cx + s * 0.15, cy - s * 0.08, s * 0.05, 0, 7); x.fill();
  x.beginPath(); x.ellipse(cx, cy + s * 0.07, s * 0.07, s * 0.05, 0, 0, 7); x.fill();
}
function dCanard(x, cx, cy, s) {
  x.fillStyle = '#ffd23f';
  x.beginPath(); x.ellipse(cx, cy + s * 0.35, s * 0.55, s * 0.32, 0, 0, 7); x.fill();
  x.beginPath(); x.moveTo(cx - s * 0.5, cy + s * 0.2); x.lineTo(cx - s * 0.75, cy - s * 0.05); x.lineTo(cx - s * 0.4, cy + s * 0.35); x.fill();
  x.beginPath(); x.arc(cx + s * 0.22, cy - s * 0.12, s * 0.28, 0, 7); x.fill();
  x.fillStyle = '#ff8a3d'; x.beginPath(); x.moveTo(cx + s * 0.45, cy - s * 0.12); x.lineTo(cx + s * 0.75, cy - s * 0.02); x.lineTo(cx + s * 0.45, cy + s * 0.06); x.fill();
  x.fillStyle = '#3b2a20'; x.beginPath(); x.arc(cx + s * 0.28, cy - s * 0.2, s * 0.05, 0, 7); x.fill();
}
function dBallon(x, cx, cy, s, c) {
  x.strokeStyle = '#8a7a6a'; x.lineWidth = s * 0.04;
  x.beginPath(); x.moveTo(cx, cy + s * 0.55); x.quadraticCurveTo(cx - s * 0.2, cy + s * 0.8, cx, cy + s); x.stroke();
  x.fillStyle = c; x.beginPath(); x.ellipse(cx, cy, s * 0.38, s * 0.48, 0, 0, 7); x.fill();
  x.beginPath(); x.moveTo(cx, cy + s * 0.45); x.lineTo(cx - s * 0.07, cy + s * 0.58); x.lineTo(cx + s * 0.07, cy + s * 0.58); x.fill();
  x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(cx - s * 0.13, cy - s * 0.2, s * 0.07, s * 0.13, -0.5, 0, 7); x.fill();
}
function dBiberon(x, cx, cy, s) {
  x.fillStyle = '#f3d9a4'; x.beginPath(); x.ellipse(cx, cy - s * 0.62, s * 0.1, s * 0.16, 0, 0, 7); x.fill();
  x.fillStyle = '#ffd36b'; arrondi(x, cx - s * 0.22, cy - s * 0.5, s * 0.44, s * 0.16, s * 0.05); x.fill();
  x.fillStyle = '#ffffff'; x.strokeStyle = '#c9b8a6'; x.lineWidth = s * 0.04;
  arrondi(x, cx - s * 0.2, cy - s * 0.34, s * 0.4, s * 0.9, s * 0.1); x.fill(); x.stroke();
  x.fillStyle = '#9fdcc0'; x.fillRect(cx - s * 0.2, cy + s * 0.05, s * 0.4, s * 0.1);
}

// papier peint : 2 m de large, toute la hauteur (lambris, cimaise, plinthe)
function papier(fond, lambris, motif, cm) {
  const [c, x] = toile(256, 512);
  const haut = 512 * (1 - 1 / H);
  x.fillStyle = fond; x.fillRect(0, 0, 256, 512);
  const r = hasard(motif.length * 97);
  const aux = (px, py, f) => { f(px, py); if (px < 40) f(px + 256, py); if (px > 216) f(px - 256, py); };
  for (let ligne = 0; ligne < 4; ligne++) {
    const py = 44 + ligne * 80;
    for (const px of (ligne % 2 ? [0, 128] : [64, 192])) {
      aux(px, py, (X, Y) => {
        if (motif === 'nuages') dNuage(x, X, Y, 20, cm);
        else if (motif === 'pois') { x.fillStyle = cm[(ligne + px) % cm.length]; x.beginPath(); x.arc(X, Y, 10, 0, 7); x.fill(); }
        else if (motif === 'notes') dNote(x, X - 8, Y + 14, 34, cm);
        else if (motif === 'etoiles') dEtoile(x, X, Y, 13, cm);
        else if (motif === 'fete') { if ((ligne + px / 64) % 2) dEtoile(x, X, Y, 14, '#ffd36b'); else { x.fillStyle = ligne % 2 ? '#9fdcc0' : '#d8c4f2'; x.font = `bold 40px ${POLICE}`; x.textAlign = 'center'; x.fillText('?', X, Y + 14); } }
        else if (motif === 'rayures') { /* rien, rayures dessinées après */ }
      });
    }
  }
  if (motif === 'rayures') { x.fillStyle = cm; for (let i = 0; i < 256; i += 64) x.fillRect(i, 0, 22, haut); }
  void r;
  x.fillStyle = lambris; x.fillRect(0, haut, 256, 512 - haut);
  x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 4;
  for (let i = 0; i < 2; i++) { arrondi(x, i * 128 + 14, haut + 24, 100, 512 - haut - 66, 8); x.stroke(); }
  x.fillStyle = '#ffffff'; x.fillRect(0, haut - 7, 256, 13); x.fillRect(0, 512 - 18, 256, 18);
  x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(0, haut + 6, 256, 3); x.fillRect(0, 512 - 20, 256, 2);
  return texture(c, true);
}
function texParquet() {
  const [c, x] = toile(256, 256), r = hasard(11);
  for (let i = 0; i < 4; i++) {
    let y = -r() * 200;
    while (y < 256) {
      const l = 90 + r() * 120, t = 0.9 + r() * 0.14;
      x.fillStyle = `rgb(${232 * t | 0},${201 * t | 0},${158 * t | 0})`;
      x.fillRect(i * 64, y, 64, l);
      x.strokeStyle = 'rgba(150,110,70,.12)'; x.lineWidth = 2;
      for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(i * 64 + 10 + k * 18 + r() * 6, y); x.lineTo(i * 64 + 12 + k * 18 + r() * 6, y + l); x.stroke(); }
      x.fillStyle = 'rgba(120,85,50,.35)'; x.fillRect(i * 64, y, 64, 2);
      y += l;
    }
    x.fillStyle = 'rgba(120,85,50,.3)'; x.fillRect(i * 64, 0, 2, 256);
  }
  return texture(c, true);
}
function texTapis(couleurs) {
  const [c, x] = toile(256, 256);
  couleurs.forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(128, 128, 128 - i * 26, 0, 7); x.fill(); });
  return texture(c);
}
function texFenetre() {
  const [c, x] = toile(256, 256);
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#9fd3f5'); g.addColorStop(1, '#fdf1dc');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#fff4c2'; x.beginPath(); x.arc(196, 62, 26, 0, 7); x.fill();
  dNuage(x, 70, 80, 30, '#ffffff'); dNuage(x, 170, 150, 22, '#ffffff');
  x.fillStyle = '#b9e3c6'; x.beginPath(); x.ellipse(70, 280, 160, 80, 0, 0, 7); x.fill();
  x.fillStyle = '#a3d9b4'; x.beginPath(); x.ellipse(220, 290, 140, 90, 0, 0, 7); x.fill();
  return texture(c);
}
function texEtincelle() {
  const [c, x] = toile(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.25, 'rgba(255,215,110,.75)'); g.addColorStop(1, 'rgba(255,200,80,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath();
  x.moveTo(64, 4); x.quadraticCurveTo(68, 60, 124, 64); x.quadraticCurveTo(68, 68, 64, 124); x.quadraticCurveTo(60, 68, 4, 64); x.quadraticCurveTo(60, 60, 64, 4); x.fill();
  return texture(c);
}
// panneau : dessin libre sur une carte arrondie
function panneau(w, h, fond, dessin) {
  const W = 512, Hh = Math.round(512 * h / w);
  const [c, x] = toile(W, Hh);
  x.fillStyle = '#ffffff'; arrondi(x, 0, 0, W, Hh, 36); x.fill();
  x.fillStyle = fond; arrondi(x, 12, 12, W - 24, Hh - 24, 28); x.fill();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#5a4636';
  dessin(x, W, Hh);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: texture(c), transparent: true }));
  return m;
}
function texte(x, t, X, Y, taille, couleur) { x.font = `bold ${taille}px ${POLICE}`; x.fillStyle = couleur || '#5a4636'; x.fillText(t, X, Y); }

// ===================== Les pièces =====================
const PIECES = [
  { id: 'chambre', x0: -4, x1: 4, zs: 4, zn: -4, tex: papier('#d9f1e5', '#bfe3d1', 'nuages', '#ffffff') },
  { id: 'jeux', x0: -4.5, x1: 4.5, zs: -7, zn: -16, tex: papier('#fff2c9', '#ffe29a', 'pois', ['#ffd36b', '#b9e6cf', '#ffc9a3']) },
  { id: 'musique', x0: -4, x1: 4, zs: -19, zn: -27, tex: papier('#ffe6d6', '#f9cdb0', 'notes', '#f4b48f') },
  { id: 'fete', x0: -6, x1: 6, zs: -30, zn: -42, tex: papier('#fff8e8', '#f1e3c2', 'fete', '#ffd36b') },
];
const TEX_COULOIR = papier('#fdf6ec', '#eadbc6', 'rayures', '#f6ead8');
// frontières (z) entre zones : pièce, couloir, pièce…
const FRONT = [-4, -7, -16, -19, -27, -30];
const zoneDe = (z) => FRONT.filter((b) => z < b).length;
const texSol = texParquet();
const matPlafond = new THREE.MeshBasicMaterial({ color: 0xf8f0e6 });
const matsMur = new Map();
function matMur(tex) { if (!matsMur.has(tex)) matsMur.set(tex, new THREE.MeshLambertMaterial({ map: tex })); return matsMur.get(tex); }
const matSol = new THREE.MeshLambertMaterial({ map: texSol });

function mur(cx, cz, long, rot, y0, y1, tex) {
  const g = new THREE.PlaneGeometry(long, y1 - y0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * long / 2, (y0 + uv.getY(i) * (y1 - y0)) / H);
  const m = new THREE.Mesh(g, matMur(tex));
  m.position.set(cx, (y0 + y1) / 2, cz); m.rotation.y = rot; scene.add(m);
  return m;
}
function sol(cx, cz, w, d, segs) {
  const g = new THREE.PlaneGeometry(w, d, segs || 1, segs || 1);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 2, uv.getY(i) * d / 2);
  const m = new THREE.Mesh(g, matSol); m.rotation.x = -Math.PI / 2; m.position.set(cx, 0, cz);
  m.userData.sol = true; scene.add(m);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matPlafond); p.rotation.x = Math.PI / 2; p.position.set(cx, H, cz); scene.add(p);
  return m;
}
const matPlafonnier = new THREE.MeshBasicMaterial({ color: 0xfffbe6 });
function plafonnier(x, z) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.38, 28), matPlafonnier); m.rotation.x = Math.PI / 2; m.position.set(x, H - 0.01, z); scene.add(m);
  const b = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.46, 28), new THREE.MeshBasicMaterial({ color: 0xffffff })); b.rotation.x = Math.PI / 2; b.position.set(x, H - 0.012, z); scene.add(b);
}
// mur nord ou sud, avec ou sans ouverture de porte
function murTravers(p, z, rot, ouvert) {
  const tex = p.tex;
  if (!ouvert) { mur((p.x0 + p.x1) / 2, z, p.x1 - p.x0, rot, 0, H, tex); return; }
  const a = -PORTE / 2, b = PORTE / 2;
  mur((p.x0 + a) / 2, z, a - p.x0, rot, 0, H, tex);
  mur((b + p.x1) / 2, z, p.x1 - b, rot, 0, H, tex);
}
const matCadre = mat(0xffffff);
function cadrePorte(z) {
  boite(0.14, 2.6, 0.3, matCadre, -PORTE / 2 - 0.02, 1.3, z);
  boite(0.14, 2.6, 0.3, matCadre, PORTE / 2 + 0.02, 1.3, z);
  boite(PORTE + 0.32, 0.4, 0.3, matCadre, 0, 2.8, z);
}

PIECES.forEach((p, i) => {
  const w = p.x1 - p.x0, d = p.zs - p.zn, cz = (p.zs + p.zn) / 2;
  sol((p.x0 + p.x1) / 2, cz, w, d, p.id === 'fete' ? 24 : 1);
  murTravers(p, p.zs, Math.PI, i > 0);
  murTravers(p, p.zn, 0, i < PIECES.length - 1);
  mur(p.x0, cz, d, Math.PI / 2, 0, H, p.tex);
  mur(p.x1, cz, d, -Math.PI / 2, 0, H, p.tex);
  // collisions des murs
  if (i > 0) { solide(p.x0 - 0.3, -PORTE / 2, p.zs, p.zs + 0.3, 1); solide(PORTE / 2, p.x1 + 0.3, p.zs, p.zs + 0.3, 1); }
  else solide(p.x0 - 0.3, p.x1 + 0.3, p.zs, p.zs + 0.3, 1);
  if (i < PIECES.length - 1) { solide(p.x0 - 0.3, -PORTE / 2, p.zn - 0.3, p.zn, 1); solide(PORTE / 2, p.x1 + 0.3, p.zn - 0.3, p.zn, 1); }
  else solide(p.x0 - 0.3, p.x1 + 0.3, p.zn - 0.3, p.zn, 1);
  solide(p.x0 - 0.3, p.x0, p.zn, p.zs, 1);
  solide(p.x1, p.x1 + 0.3, p.zn, p.zs, 1);
  plafonnier(0, cz);
  // couloir vers la pièce suivante
  const q = PIECES[i + 1];
  if (q) {
    const l = p.zn - q.zs, c = (p.zn + q.zs) / 2;
    sol(0, c, PORTE, l);
    mur(-PORTE / 2, c, l, Math.PI / 2, 0, H, TEX_COULOIR);
    mur(PORTE / 2, c, l, -Math.PI / 2, 0, H, TEX_COULOIR);
    solide(-PORTE / 2 - 0.3, -PORTE / 2, q.zs, p.zn, 1);
    solide(PORTE / 2, PORTE / 2 + 0.3, q.zs, p.zn, 1);
    cadrePorte(p.zn); cadrePorte(q.zs);
  }
});

// ===================== Objets interactifs =====================
const inters = [];
const texBrille = texEtincelle();
function interactif(obj, o) {
  o.obj = obj; o.reach = o.reach || 1.5;
  obj.traverse((m) => { m.userData.inter = o; });
  obj.updateMatrixWorld(true);
  if (!o.pos) o.pos = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
  if (o.brille) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrille, depthTest: false, depthWrite: false, transparent: true, fog: false }));
    s.renderOrder = 10; s.userData.inter = o; s.userData.etincelle = true; s.visible = false; scene.add(s);
    o.etincelle = s; o.phase = rnd() * 6;
  }
  inters.push(o); return o;
}

// ----- portes -----
const texPorte = (() => {
  const [c, x] = toile(256, 512);
  x.fillStyle = '#fffaf2'; x.fillRect(0, 0, 256, 512);
  x.strokeStyle = '#f0e2cf'; x.lineWidth = 8;
  arrondi(x, 28, 30, 200, 190, 16); x.stroke(); arrondi(x, 28, 250, 200, 220, 16); x.stroke();
  dEtoile(x, 128, 125, 46, '#ffd36b');
  x.fillStyle = '#e8c27a'; x.beginPath(); x.arc(212, 290, 12, 0, 7); x.fill();
  return texture(c);
})();
const matPorte = new THREE.MeshLambertMaterial({ map: texPorte });
const portes = {};
function porte(nom, z, message) {
  const m = boite(PORTE - 0.04, 2.6, 0.1, matPorte, 0, 1.3, z);
  const p = { m, s: solide(-PORTE / 2, PORTE / 2, z - 0.08, z + 0.08, 1), ouverte: false, z };
  interactif(m, { reach: 2.2, actif: () => !p.ouverte, use() { toast(message()); son('faux'); } });
  portes[nom] = p; return p;
}
function ouvrir(p) {
  if (p.ouverte) return;
  p.ouverte = true; p.s.actif = false; son('porte'); vibrer(60);
  let t = 0;
  anims.push((dt) => { t += dt / 1.3; p.m.position.y = 1.3 + lisse(Math.min(t, 1)) * 3.4; return t < 1; });
}
const porteBloquee = (i) => (i === 0 && !portes.a.ouverte) || (i === 2 && !portes.b.ouverte) || (i === 4 && !portes.c.ouverte);

// ===================== Pièce 1 : la chambre (biberons) =====================
let biberons = 0;
const BIBERONS = [];
function biberon(x, y, z, lieu) {
  const g = groupe(x, y, z);
  g.scale.setScalar(1.6);
  cylindre(0.06, 0.2, 0xffffff, 0, 0.1, 0, g);
  cylindre(0.062, 0.05, 0x9fdcc0, 0, 0.11, 0, g);
  cylindre(0.066, 0.04, 0xffd36b, 0, 0.22, 0, g);
  const t = sphere(0.04, 0xf3d9a4, 0, 0.27, 0, g); t.scale.set(0.035, 0.06, 0.035);
  BIBERONS.push({ g, lieu });
  interactif(g, {
    reach: 1.7, brille: () => etape === 'biberons' && g.visible, actif: () => g.visible,
    use() { prendreBiberon(g); },
  });
  return g;
}
function prendreBiberon(g) {
  if (!g.visible || g.userData.pris) return;
  g.userData.pris = true; biberons++;
  son('pop'); vibrer(30);
  let t = 0; const depart = g.position.clone();
  anims.push((dt) => {
    t += dt / 0.55;
    const cible = camera.position.clone().add(new THREE.Vector3(0, -0.3, 0));
    g.position.lerpVectors(depart, cible, lisse(Math.min(t, 1)));
    g.position.y += Math.sin(Math.min(t, 1) * Math.PI) * 0.4;
    g.scale.setScalar(1.6 * (1 - Math.min(t, 1) * 0.8));
    g.rotation.y += dt * 8;
    if (t >= 1) { g.visible = false; return false; }
  });
  majObjectif(true);
  if (biberons < 3) toast(['Un biberon ! 🍼', 'Et de deux ! 🍼🍼'][biberons - 1]);
  else {
    plusTard(0.6, () => {
      toast('Miam ! Bébé n’a plus faim.<br>La porte s’ouvre ! 🚪✨', 3.6); son('bravo');
      ouvrir(portes.a); passerA('versJeux');
    });
  }
}
(function chambre() {
  // fenêtre (mur ouest)
  const f = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ map: texFenetre(), fog: false }));
  f.position.set(-3.99, 1.75, -0.6); f.rotation.y = Math.PI / 2; scene.add(f);
  boite(0.08, 0.08, 1.76, 0xffffff, -3.96, 2.39, -0.6); boite(0.08, 0.08, 1.76, 0xffffff, -3.96, 1.11, -0.6);
  boite(0.08, 1.36, 0.08, 0xffffff, -3.96, 1.75, -1.44); boite(0.08, 1.36, 0.08, 0xffffff, -3.96, 1.75, 0.24);
  boite(0.06, 1.2, 0.05, 0xffffff, -3.96, 1.75, -0.6); boite(0.06, 0.05, 1.6, 0xffffff, -3.96, 1.75, -0.6);
  boite(0.22, 0.05, 1.9, 0xffffff, -3.88, 1.09, -0.6);
  // tapis
  const tapis = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), new THREE.MeshLambertMaterial({ map: texTapis(['#ffe7b0', '#fff6e0', '#c9ecdb', '#fff6e0', '#ffd9b8']) }));
  tapis.rotation.x = -Math.PI / 2; tapis.position.set(-0.2, 0.012, 0.6); tapis.userData.sol = true; scene.add(tapis);
  // berceau
  const bx = 2.95, bz = -1.2, L = 1.4, W = 0.78, bois = 0xf6eee2;
  const g = groupe(bx, 0, bz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) boite(0.07, 1.02, 0.07, bois, sx * W / 2, 0.51, sz * L / 2, g);
  boite(W, 0.07, L, bois, 0, 0.36, 0, g);
  boite(W - 0.06, 0.14, L - 0.06, 0xffffff, 0, 0.46, 0, g);
  boite(W - 0.1, 0.05, L * 0.5, 0xffe29a, 0, 0.55, L * 0.2, g);
  boite(0.42, 0.08, 0.24, 0xfffaf0, 0, 0.57, -L / 2 + 0.2, g);
  for (const sx of [-1, 1]) {
    boite(0.06, 0.06, L, bois, sx * W / 2, 0.98, 0, g);
    for (let k = 1; k < 8; k++) boite(0.03, 0.46, 0.03, bois, sx * W / 2, 0.74, -L / 2 + k * L / 8, g);
  }
  for (const sz of [-1, 1]) boite(W, 0.56, 0.04, 0xbfe3d1, 0, 0.72, sz * L / 2, g);
  solide(bx - W / 2 - 0.05, bx + W / 2 + 0.05, bz - L / 2 - 0.05, bz + L / 2 + 0.05);
  // mobile au-dessus du berceau
  const mob = groupe(bx, 2.25, bz);
  fil(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.75, 0), 0xffffff, 0.008, mob);
  boite(0.9, 0.02, 0.02, 0xffffff, 0, 0, 0, mob); boite(0.02, 0.02, 0.9, 0xffffff, 0, 0, 0, mob);
  const formeEtoile = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.05 : 0.11; const X = Math.cos(a) * rr, Y = Math.sin(a) * rr; if (i) formeEtoile.lineTo(X, Y); else formeEtoile.moveTo(X, Y); }
  const geoEt = new THREE.ShapeGeometry(formeEtoile);
  [[0.45, 0, 0xffd36b], [-0.45, 0, 0x9fdcc0], [0, 0.45, 0xffc9a3], [0, -0.45, 0xffffff]].forEach(([x, z, c]) => {
    fil(new THREE.Vector3(x, -0.3, z), new THREE.Vector3(x, 0, z), 0xffffff, 0.004, mob);
    const e = new THREE.Mesh(geoEt, new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })); e.position.set(x, -0.38, z); mob.add(e);
  });
  decor.mobile = mob;
  // fauteuil
  const fx = -3.15, fz = 3.1, fa = groupe(fx, 0, fz);
  boite(0.95, 0.42, 0.85, 0xffc9a3, 0, 0.21, 0, fa); boite(0.95, 0.75, 0.22, 0xffc9a3, 0, 0.75, 0.33, fa);
  boite(0.18, 0.62, 0.85, 0xffb98c, -0.47, 0.42, 0, fa); boite(0.18, 0.62, 0.85, 0xffb98c, 0.47, 0.42, 0, fa);
  boite(0.6, 0.1, 0.55, 0xfff1e2, 0, 0.47, -0.08, fa);
  solide(fx - 0.6, fx + 0.6, fz - 0.45, fz + 0.5);
  // lampe
  const lx = 3.35, lz = 3.3;
  cylindre(0.18, 0.04, 0xffffff, lx, 0.02, lz); cylindre(0.025, 1.35, 0xffffff, lx, 0.7, lz);
  const abat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.3, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1c6, side: THREE.DoubleSide }));
  abat.position.set(lx, 1.45, lz); scene.add(abat);
  solide(lx - 0.25, lx + 0.25, lz - 0.25, lz + 0.25);
  // étagère et livres
  boite(0.3, 0.04, 1.3, 0xffffff, 3.84, 1.45, 1.4); boite(0.3, 0.04, 1.3, 0xffffff, 3.84, 1.95, 1.4);
  [0xffd36b, 0x9fdcc0, 0xffc9a3, 0xfff1e2, 0xd8c4f2, 0xbfe3d1].forEach((c, k) => boite(0.2, 0.3 + (k % 3) * 0.04, 0.07, c, 3.84, 1.63 + (k % 3) * 0.02, 0.95 + k * 0.1));
  sphere(0.11, 0xffd36b, 3.84, 2.08, 1.8); sphere(0.07, 0x9fdcc0, 3.84, 2.04, 1.55);
  // coffre à jouets
  const cx = -3.5, cz = -2.8;
  boite(0.6, 0.5, 1.1, 0x9fdcc0, cx, 0.25, cz); boite(0.66, 0.08, 1.16, 0x86cfae, cx, 0.54, cz);
  const ec = panneau(0.5, 0.36, '#9fdcc0', (x, W, Hh) => dEtoile(x, W / 2, Hh / 2, Hh * 0.35, '#ffd36b'));
  ec.position.set(cx + 0.31, 0.27, cz); ec.rotation.y = Math.PI / 2; scene.add(ec);
  solide(cx - 0.35, cx + 0.35, cz - 0.6, cz + 0.6);
  // cubes de décor
  boite(0.25, 0.25, 0.25, 0xffd36b, 1.2, 0.125, 2.2).rotation.y = 0.4;
  boite(0.25, 0.25, 0.25, 0xffc9a3, 1.45, 0.125, 1.95).rotation.y = -0.3;
  boite(0.25, 0.25, 0.25, 0x9fdcc0, 1.3, 0.375, 2.08).rotation.y = 0.1;
  // panneau près de la porte
  const pan = panneau(1.3, 0.95, '#fff6e0', (x, W, Hh) => {
    texte(x, 'Bébé a faim !', W / 2, 62, 50);
    for (let k = 0; k < 3; k++) dBiberon(x, W / 2 + (k - 1) * 110, 200, 100);
    texte(x, 'Trouve les 3 biberons', W / 2, Hh - 55, 36, '#8a6a4e');
  });
  pan.position.set(2.45, 1.6, -3.98); scene.add(pan);
  // les trois biberons
  biberon(-0.7, 0.02, 0.5, 'sur le tapis');
  biberon(bx, 0.52, bz + 0.15, 'dans le berceau');
  biberon(fx, 0.52, fz - 0.1, 'sur le fauteuil (derrière toi au départ)');
})();

// ===================== Pièce 2 : la salle de jeux (cadenas) =====================
function nounours(x, y, z, rotY, parent) {
  const g = groupe(x, y, z, parent); g.rotation.y = rotY || 0;
  const b = 0xb07a4f, cl = 0xe6c49d, n = 0x3b2a20;
  sphere(0.2, b, 0, 0.2, 0, g).scale.set(0.2, 0.23, 0.18);
  sphere(0.11, cl, 0, 0.2, 0.12, g).scale.set(0.11, 0.13, 0.06);
  sphere(0.15, b, 0, 0.5, 0.01, g);
  sphere(0.05, b, -0.11, 0.62, 0, g); sphere(0.05, b, 0.11, 0.62, 0, g);
  sphere(0.06, cl, 0, 0.47, 0.13, g).scale.set(0.065, 0.05, 0.05);
  sphere(0.018, n, -0.055, 0.54, 0.135, g); sphere(0.018, n, 0.055, 0.54, 0.135, g);
  sphere(0.022, n, 0, 0.49, 0.18, g);
  sphere(0.06, b, -0.2, 0.26, 0.04, g).scale.set(0.06, 0.1, 0.06); sphere(0.06, b, 0.2, 0.26, 0.04, g).scale.set(0.06, 0.1, 0.06);
  sphere(0.07, b, -0.1, 0.05, 0.12, g).scale.set(0.07, 0.06, 0.09); sphere(0.07, b, 0.1, 0.05, 0.12, g).scale.set(0.07, 0.06, 0.09);
  return g;
}
function canard(x, y, z, rotY, parent) {
  const g = groupe(x, y, z, parent); g.rotation.y = rotY || 0;
  sphere(0.13, 0xffd23f, 0, 0.09, 0, g).scale.set(0.12, 0.09, 0.15);
  sphere(0.08, 0xffd23f, 0, 0.21, 0.07, g);
  const bec = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 12), mat(0xff8a3d)); bec.rotation.x = Math.PI / 2; bec.position.set(0, 0.2, 0.17); g.add(bec);
  sphere(0.014, 0x3b2a20, -0.04, 0.24, 0.13, g); sphere(0.014, 0x3b2a20, 0.04, 0.24, 0.13, g);
  const q = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 10), mat(0xffd23f)); q.rotation.x = -2.2; q.position.set(0, 0.15, -0.15); g.add(q);
  return g;
}
const matsBallon = {};
function matBallon(c) { if (!matsBallon[c]) matsBallon[c] = new THREE.MeshPhongMaterial({ color: c, shininess: 90, specular: 0x666666 }); return matsBallon[c]; }
function ballon(c, x, y, z, longFil, parent) {
  const g = groupe(x, y, z, parent);
  const b = new THREE.Mesh(GEO.sphere, matBallon(c)); b.scale.set(0.24, 0.29, 0.24); g.add(b);
  const k = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 10), matBallon(c)); k.position.y = -0.3; g.add(k);
  if (longFil) fil(new THREE.Vector3(0, -0.32, 0), new THREE.Vector3(0, -0.32 - longFil, 0), 0xf7f0e6, 0.005, g);
  return g;
}
(function salleDeJeux() {
  // tapis carré
  const [c, x] = toile(256, 256);
  x.fillStyle = '#fff6e0'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { x.fillStyle = ['#c9ecdb', '#ffe29a'][(i + j * 3) % 2]; x.fillRect(i * 64, j * 64, 64, 64); }
  const tapis = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshLambertMaterial({ map: texture(c) }));
  tapis.rotation.x = -Math.PI / 2; tapis.position.set(-0.3, 0.012, -11.3); tapis.userData.sol = true; scene.add(tapis);
  // fauteuil + nounours 1
  const fx = -3.75, fz = -9.6, fa = groupe(fx, 0, fz); fa.rotation.y = Math.PI / 2;
  boite(0.95, 0.42, 0.85, 0x9fdcc0, 0, 0.21, 0, fa); boite(0.95, 0.75, 0.22, 0x9fdcc0, 0, 0.75, -0.33, fa);
  boite(0.18, 0.62, 0.85, 0x86cfae, -0.47, 0.42, 0, fa); boite(0.18, 0.62, 0.85, 0x86cfae, 0.47, 0.42, 0, fa);
  nounours(0, 0.42, -0.08, 0, fa);
  solide(fx - 0.5, fx + 0.45, fz - 0.6, fz + 0.6);
  // étagère + nounours 2
  boite(0.35, 0.04, 1.6, 0xffffff, 4.3, 1.1, -12.6); boite(0.35, 0.04, 1.6, 0xffffff, 4.3, 1.75, -12.6);
  nounours(4.3, 1.12, -12.9, -Math.PI / 2);
  [0xffd36b, 0xffc9a3, 0x9fdcc0].forEach((cc, k) => boite(0.22, 0.32, 0.08, cc, 4.3, 1.93, -13.1 + k * 0.12));
  boite(0.28, 0.2, 0.28, 0xffc9a3, 4.3, 1.22, -12.1);
  // bassine + 3 canards
  const tx = 2.9, tz = -9.4;
  const bas = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.52, 0.45, 28, 1, true), new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  bas.position.set(tx, 0.225, tz); scene.add(bas);
  const bord = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 32), mat(0xffffff)); bord.rotation.x = Math.PI / 2; bord.position.set(tx, 0.45, tz); scene.add(bord);
  const eau = new THREE.Mesh(new THREE.CircleGeometry(0.6, 28), new THREE.MeshLambertMaterial({ color: 0xbfe9f5 })); eau.rotation.x = -Math.PI / 2; eau.position.set(tx, 0.36, tz); scene.add(eau);
  decor.canardsBain = [canard(tx - 0.22, 0.33, tz + 0.12, 0.6), canard(tx + 0.24, 0.33, tz + 0.05, -1.2), canard(tx, 0.33, tz - 0.27, 2.6)];
  solide(tx - 0.65, tx + 0.65, tz - 0.65, tz + 0.65);
  // 2 canards de plus
  canard(-0.6, 0.012, -11.6, 0.3);
  canard(-1.9, 0.0, -15.2, 0.6);
  // coffre + 3 ballons
  const kx = -3.4, kz = -14.6;
  boite(1.2, 0.55, 0.65, 0xffd36b, kx, 0.275, kz); boite(1.26, 0.08, 0.7, 0xffc94d, kx, 0.59, kz);
  solide(kx - 0.65, kx + 0.65, kz - 0.35, kz + 0.35);
  decor.ballonsJeux = [
    ballon(0xffd23f, kx - 0.35, 2.25, kz + 0.1, 1.33),
    ballon(0x9fdcc0, kx + 0.05, 2.45, kz - 0.1, 1.53),
    ballon(0xffa45c, kx + 0.4, 2.2, kz + 0.15, 1.28),
  ];
  decor.ballonsJeux.forEach((b) => { b.userData.base = b.position.clone(); });
  // petits cubes de construction (non comptés)
  boite(0.22, 0.22, 0.22, 0xffffff, 1.5, 0.11, -12.4).rotation.y = 0.3;
  boite(0.22, 0.22, 0.22, 0xffe29a, 1.75, 0.11, -12.2).rotation.y = 0.8;
  // affiche du code
  const aff = panneau(1.5, 1.15, '#fff6e0', (x, W, Hh) => {
    texte(x, 'Le code secret', W / 2, 58, 48);
    dNounours(x, W / 2 - 150, 175, 74); dCanard(x, W / 2, 182, 74); dBallon(x, W / 2 + 150, 165, 74, '#ffd23f');
    for (let k = -1; k <= 1; k++) { x.fillStyle = '#ffffff'; arrondi(x, W / 2 + k * 150 - 40, 262, 80, 70, 14); x.fill(); texte(x, '?', W / 2 + k * 150, 300, 52, '#e09a2e'); }
    texte(x, 'Compte-les dans la pièce !', W / 2, Hh - 40, 32, '#8a6a4e');
  });
  aff.position.set(-2.65, 1.55, -15.98); scene.add(aff);
  interactif(aff, { reach: 3.2, brille: () => etape === 'code' && !aideCode.vu, use() { aideCode.vu = true; toast('Compte les nounours 🧸, les canards 🦆 et les ballons 🎈 de cette pièce.<br>Puis touche le cadenas à droite de la porte !', 5); son('clic'); } });
  // cadenas (digicode)
  const cad = groupe(1.9, 1.35, -15.93);
  boite(0.5, 0.66, 0.1, 0xffd36b, 0, 0, 0, cad);
  const ecran = panneau(0.42, 0.56, '#fff6e0', (x, W, Hh) => {
    texte(x, '🔒', W / 2, 80, 80);
    for (let k = 0; k < 3; k++) { x.fillStyle = '#ffffff'; arrondi(x, W / 2 - 165 + k * 115, 170, 100, 120, 16); x.fill(); texte(x, '?', W / 2 - 115 + k * 115, 232, 70, '#e09a2e'); }
    for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) { x.fillStyle = '#ffe7b0'; arrondi(x, W / 2 - 165 + k * 115, 340 + r * 130, 100, 100, 50); x.fill(); }
  });
  ecran.position.z = 0.06; cad.add(ecran);
  interactif(cad, { reach: 2.3, brille: () => etape === 'code', actif: () => etape === 'code' || etape === 'versJeux', use() { if (etape === 'code' || etape === 'versJeux') ouvrirCode(); } });
})();

// ===================== Pièce 3 : la boîte à musique (berceuse) =====================
const NOTES = { C3: 130.81, F3: 174.61, G3: 196, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5 };
const CUBES = [
  { nom: 'étoile', emoji: '⭐', fond: '#ffd36b', f: NOTES.C5, dessin: (x, W) => dEtoile(x, W / 2, W / 2 + 6, 82, '#ffffff') },
  { nom: 'lune', emoji: '🌙', fond: '#8fd3b6', f: NOTES.E5, dessin: (x, W) => dLune(x, W / 2 - 10, W / 2, 70, '#ffffff', '#8fd3b6') },
  { nom: 'cœur', emoji: '🧡', fond: '#ffab7a', f: NOTES.G5, dessin: (x, W) => dCoeur(x, W / 2, W / 2 - 4, 70, '#ffffff') },
  { nom: 'nuage', emoji: '☁️', fond: '#c3d96b', f: NOTES.A5, dessin: (x, W) => dNuage(x, W / 2, W / 2 + 10, 58, '#ffffff') },
];
const SEQUENCE = [0, 2, 3, 2, 1];
const simon = { phase: 'attente', progres: 0, erreurs: 0 };
let boiteMusique;
(function salleMusique() {
  // boîte à musique sur son socle
  const mx = -2.5, mz = -22.2;
  cylindre(0.34, 0.85, 0xffffff, mx, 0.425, mz); cylindre(0.4, 0.06, 0xf6eee2, mx, 0.88, mz);
  const g = groupe(mx, 0.91, mz);
  boite(0.56, 0.3, 0.4, 0xc98f5a, 0, 0.15, 0, g); boite(0.6, 0.04, 0.44, 0xe8c27a, 0, 0.3, 0, g);
  const cou = groupe(0, 0.32, -0.2, g); boite(0.56, 0.04, 0.4, 0xc98f5a, 0, 0, 0.2, cou); cou.rotation.x = -1.1; cou.children[0].position.set(0, 0, 0.2);
  // manivelle
  cylindre(0.015, 0.12, 0xe8c27a, 0.34, 0.15, 0, g).rotation.z = Math.PI / 2;
  decor.manivelle = groupe(0.4, 0.15, 0, g); boite(0.02, 0.14, 0.03, 0xe8c27a, 0, 0.06, 0, decor.manivelle); sphere(0.03, 0xffffff, 0, 0.13, 0, decor.manivelle);
  // petite étoile qui tourne dessus
  const forme = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.045 : 0.1; const X = Math.cos(a) * rr, Y = Math.sin(a) * rr; if (i) forme.lineTo(X, Y); else forme.moveTo(X, Y); }
  const et = new THREE.Mesh(new THREE.ExtrudeGeometry(forme, { depth: 0.03, bevelEnabled: false }), mat(0xffd36b));
  et.position.set(0, 0.48, 0); g.add(et); decor.etoileBoite = et;
  cylindre(0.01, 0.16, 0xe8c27a, 0, 0.38, 0, g);
  solide(mx - 0.4, mx + 0.4, mz - 0.4, mz + 0.4);
  boiteMusique = interactif(g, {
    reach: 2.0, brille: () => etape === 'musique' && simon.phase === 'attente', actif: () => etape === 'musique' || etape === 'versMusique',
    use() { if (etape !== 'musique') return; if (simon.phase === 'ecoute') return; lancerSimon(); },
  });
  // le banc et les quatre cubes
  boite(3.0, 0.4, 0.7, 0xffffff, 0, 0.2, -24.6); boite(3.08, 0.04, 0.78, 0xf6eee2, 0, 0.42, -24.6);
  solide(-1.6, 1.6, -25.0, -24.2);
  CUBES.forEach((cu, i) => {
    const [c, x] = toile(256, 256);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = cu.fond; arrondi(x, 10, 10, 236, 236, 30); x.fill();
    cu.dessin(x, 256);
    const m = new THREE.Mesh(GEO.boite, new THREE.MeshLambertMaterial({ map: texture(c), emissive: 0x000000 }));
    const px = -1.05 + i * 0.7, pz = -24.6;
    m.scale.setScalar(0.56); m.position.set(px, 0.72, pz); m.rotation.y = (i - 1.5) * 0.08; scene.add(m);
    cu.m = m; cu.y0 = 0.72; cu.lum = 0;
    interactif(m, {
      reach: 9, brille: () => etape === 'musique' && simon.phase === 'joue' && simon.erreurs >= 3 && SEQUENCE[simon.progres] === i,
      actif: () => etape === 'musique', use() { toucherCube(i); }, sansRegard: true,
    });
  });
  // panneau
  const pan = panneau(1.35, 1.0, '#fff6e0', (x, W, Hh) => {
    texte(x, 'La berceuse', W / 2, 60, 48);
    dNote(x, W / 2 - 120, 200, 90, '#f4b48f'); dNote(x, W / 2 + 10, 180, 70, '#ffd36b'); dNote(x, W / 2 + 120, 210, 80, '#8fd3b6');
    texte(x, 'Écoute… puis rejoue-la', W / 2, Hh - 92, 34, '#8a6a4e');
    texte(x, 'avec les cubes !', W / 2, Hh - 50, 34, '#8a6a4e');
  });
  pan.position.set(-2.5, 1.6, -26.98); scene.add(pan);
  // un petit piano jouet pour le décor
  const px = 3.2, pz = -20.4;
  boite(1.0, 0.5, 0.5, 0xffc9a3, px, 0.25, pz); boite(0.9, 0.04, 0.2, 0xffffff, px, 0.52, pz + 0.08);
  for (let k = 0; k < 6; k++) boite(0.05, 0.05, 0.12, 0x5a4636, px - 0.33 + k * 0.13 + (k > 2 ? 0.07 : 0), 0.55, pz + 0.04);
  solide(px - 0.55, px + 0.55, pz - 0.3, pz + 0.3);
})();

// ===================== Pièce 4 : la fête (le cadeau) =====================
const cadeau = {};
let banniere, texFille, matMurFete;
(function salleFete() {
  // fanions le long des murs
  const formeF = new THREE.Shape(); formeF.moveTo(-0.16, 0); formeF.lineTo(0.16, 0); formeF.lineTo(0, -0.3); formeF.closePath();
  const geoF = new THREE.ShapeGeometry(formeF);
  const coulF = [0xffd36b, 0x9fdcc0, 0xffffff, 0xffc9a3, 0xd8c4f2];
  const guirlande = (a, b, n) => {
    for (let k = 0; k <= n; k++) {
      const t = k / n, p = new THREE.Vector3().lerpVectors(a, b, t); p.y -= Math.sin(t * Math.PI) * 0.35;
      const f = new THREE.Mesh(geoF, new THREE.MeshLambertMaterial({ color: coulF[k % coulF.length], side: THREE.DoubleSide }));
      f.position.copy(p); f.lookAt(p.x + (b.z - a.z), p.y, p.z - (b.x - a.x)); scene.add(f);
    }
  };
  guirlande(new THREE.Vector3(-5.95, 2.7, -30.3), new THREE.Vector3(-5.95, 2.7, -41.7), 18);
  guirlande(new THREE.Vector3(5.95, 2.7, -30.3), new THREE.Vector3(5.95, 2.7, -41.7), 18);
  guirlande(new THREE.Vector3(-5.9, 2.85, -33), new THREE.Vector3(5.9, 2.85, -41), 20);
  guirlande(new THREE.Vector3(5.9, 2.85, -33), new THREE.Vector3(-5.9, 2.85, -41), 20);
  // estrade et cadeau
  const X = 0, Z = -37;
  cylindre(1.45, 0.14, 0xffffff, X, 0.07, Z); cylindre(1.5, 0.04, 0xffd36b, X, 0.02, Z);
  const [c, x] = toile(256, 256);
  x.fillStyle = '#fff6dd'; x.fillRect(0, 0, 256, 256);
  const r = hasard(5);
  for (let k = 0; k < 14; k++) { const px = r() * 256, py = r() * 256; if (k % 2) dEtoile(x, px, py, 12, '#ffd36b'); else { x.font = `bold 34px ${POLICE}`; x.textAlign = 'center'; x.fillStyle = ['#9fdcc0', '#d8c4f2', '#ffc9a3'][k % 3]; x.fillText('?', px, py); } }
  const papierCadeau = texture(c, true);
  const matC = new THREE.MeshLambertMaterial({ map: papierCadeau, side: THREE.DoubleSide });
  const invisible = new THREE.MeshBasicMaterial({ visible: false });
  const g = groupe(X, 0.14, Z);
  const corps = new THREE.Mesh(GEO.boite, [matC, matC, invisible, matC, matC, matC]); corps.scale.set(1.5, 1.5, 1.5); corps.position.y = 0.75; g.add(corps);
  const ruban = 0xf5b942;
  boite(0.24, 1.5, 0.02, ruban, 0, 0.75, 0.76, g); boite(0.24, 1.5, 0.02, ruban, 0, 0.75, -0.76, g);
  boite(0.02, 1.5, 0.24, ruban, 0.76, 0.75, 0, g); boite(0.02, 1.5, 0.24, ruban, -0.76, 0.75, 0, g);
  const cou = groupe(0, 1.6, 0, g);
  boite(1.62, 0.22, 1.62, matC, 0, 0, 0, cou);
  boite(0.26, 0.24, 1.64, ruban, 0, 0, 0, cou); boite(1.64, 0.24, 0.26, ruban, 0, 0, 0, cou);
  const geoN = new THREE.TorusGeometry(0.2, 0.065, 10, 24);
  for (const s of [-1, 1]) { const n = new THREE.Mesh(geoN, mat(ruban)); n.position.set(s * 0.2, 0.25, 0); n.rotation.set(0, s * 0.35, s * 0.5); n.scale.set(1, 0.8, 0.7); cou.add(n); }
  sphere(0.09, ruban, 0, 0.17, 0, cou);
  cadeau.g = g; cadeau.cou = cou; cadeau.pos = new THREE.Vector3(X, 1, Z);
  solide(X - 0.95, X + 0.95, Z - 0.95, Z + 0.95);
  interactif(g, {
    reach: 3.0, brille: () => etape === 'final', actif: () => etape === 'final',
    pos: new THREE.Vector3(X, 1.2, Z), use() { if (etape === 'final') ouvrirModal('m-prono'); },
  });
  // ballons roses cachés dans le cadeau
  cadeau.ballons = [];
  const roses = [0xff6fa3, 0xff8fb8, 0xffb3cf, 0xff5c94, 0xffc4d9, 0xffffff];
  for (let k = 0; k < 34; k++) {
    const b = ballon(roses[k % roses.length], X, 0.8, Z, 0.7 + rnd() * 0.5);
    b.visible = false; b.userData.noRay = true; b.traverse((m) => { m.userData.noRay = true; });
    const a = rnd() * Math.PI * 2, d = 1.4 + rnd() * 3.6;
    b.userData.cible = new THREE.Vector3(X + Math.cos(a) * d * 1.15, 2.35 + rnd() * 0.3, Z + Math.sin(a) * d * 0.95);
    b.userData.retard = k * 0.045; b.userData.phase = rnd() * 6;
    cadeau.ballons.push(b);
  }
  // banderole
  const fabrique = (fond, dessin) => { const [cc, xx] = toile(1024, 256); xx.fillStyle = '#ffffff'; arrondi(xx, 0, 0, 1024, 256, 40); xx.fill(); xx.fillStyle = fond; arrondi(xx, 14, 14, 996, 228, 30); xx.fill(); xx.textAlign = 'center'; xx.textBaseline = 'middle'; dessin(xx); return texture(cc); };
  const texQ = fabrique('#fff6dd', (xx) => { texte(xx, 'Fille ou garçon ?', 512, 130, 104, '#5a4636'); dEtoile(xx, 70, 128, 40, '#ffd36b'); dEtoile(xx, 954, 128, 40, '#ffd36b'); });
  texFille = fabrique('#ffd3e4', (xx) => { texte(xx, 'C’EST UNE FILLE !', 512, 132, 110, '#e94f8a'); dCoeur(xx, 70, 124, 44, '#ff6fa3'); dCoeur(xx, 954, 124, 44, '#ff6fa3'); });
  banniere = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshLambertMaterial({ map: texQ, transparent: true }));
  banniere.position.set(0, 2.4, -41.97); scene.add(banniere);
  // grands points d'interrogation aux murs
  for (const s of [-1, 1]) {
    const q = panneau(1.0, 1.0, s < 0 ? '#c9ecdb' : '#ffe7b0', (xx, W, Hh) => texte(xx, '?', W / 2, Hh / 2 + 10, 300, '#ffffff'));
    q.position.set(s * 5.98, 1.6, -36); q.rotation.y = -s * Math.PI / 2; scene.add(q);
  }
  matMurFete = matMur(PIECES[3].tex);
  plafonnier(-3, -33); plafonnier(3, -33); plafonnier(-3, -40); plafonnier(3, -40);
})();

// portes (après la construction des pièces)
porte('a', -4, () => biberons < 3 ? `Fermé ! Bébé a faim : trouve d’abord les 3 biberons (${biberons}/3) 🍼` : 'La porte s’ouvre…');
porte('b', -16, () => 'Fermé à clé ! Touche le cadenas jaune, à droite 🔒');
porte('c', -27, () => 'Fermé ! Joue d’abord la berceuse 🎵');

// ===================== Confettis =====================
const NB_CONF = 420;
const confettis = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.09), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), NB_CONF);
confettis.userData.noRay = true; confettis.visible = false; confettis.frustumCulled = false;
const confData = [];
{
  const cols = [0xff6fa3, 0xffb3cf, 0xffffff, 0xffd36b, 0xff8fb8, 0xffc4d9].map((c) => new THREE.Color(c));
  for (let i = 0; i < NB_CONF; i++) {
    confettis.setColorAt(i, cols[i % cols.length]);
    confData.push({ p: new THREE.Vector3(0, -5, 0), v: new THREE.Vector3(), r: new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6), w: new THREE.Vector3(rnd() * 8 - 4, rnd() * 8 - 4, rnd() * 8 - 4), pose: false });
  }
  scene.add(confettis);
}
const mConf = new THREE.Matrix4(), qConf = new THREE.Quaternion(), unConf = new THREE.Vector3(1, 1, 1);
function lancerConfettis() {
  confettis.visible = true;
  confData.forEach((d, i) => {
    if (i < NB_CONF * 0.55) {
      d.p.set((rnd() - 0.5) * 1.2, 1.9, -37 + (rnd() - 0.5) * 1.2);
      const a = rnd() * Math.PI * 2, f = 1 + rnd() * 3.2;
      d.v.set(Math.cos(a) * f, 5 + rnd() * 4, Math.sin(a) * f);
    } else {
      d.p.set((rnd() - 0.5) * 11, 2.95 + rnd() * 3, -36 + (rnd() - 0.5) * 11);
      d.v.set(0, -0.3, 0); d.pluie = true;
    }
  });
}
function majConfettis(dt) {
  if (!confettis.visible) return;
  confData.forEach((d, i) => {
    if (!d.pose) {
      d.v.y -= 6 * dt; d.v.multiplyScalar(Math.pow(0.12, dt));
      if (d.v.y < -0.9) d.v.y = -0.9;
      d.v.x += Math.sin(temps * 2 + i) * dt * 0.6;
      d.p.addScaledVector(d.v, dt);
      d.r.x += d.w.x * dt; d.r.y += d.w.y * dt; d.r.z += d.w.z * dt;
      if (d.p.y <= 0.015) {
        if (d.pluie && rnd() < 0.5) { d.p.set((rnd() - 0.5) * 11, 3.0, -36 + (rnd() - 0.5) * 11); d.v.set(0, -0.3, 0); }
        else { d.p.y = 0.015 + (i % 7) * 0.001; d.r.set(-Math.PI / 2, 0, d.r.z); d.pose = true; }
      }
    }
    qConf.setFromEuler(d.r); mConf.compose(d.p, qConf, unConf); confettis.setMatrixAt(i, mConf);
  });
  confettis.instanceMatrix.needsUpdate = true;
}

// ===================== Joueur =====================
const J = { x: 0, z: 2.6, yaw: 0, pitch: -0.1, chemin: [], cible: null, viseYaw: null, visePitch: null, pas: 0, bloqueT: 0, zone: 0 };
const anims = [];
const minuteurs = [];
let temps = 0;
function plusTard(s, fn) { minuteurs.push({ t: temps + s, fn }); }

function collisions() {
  for (let it = 0; it < 2; it++) for (const s of solides) {
    if (!s.actif) continue;
    const nx = clamp(J.x, s.x0, s.x1), nz = clamp(J.z, s.z0, s.z1);
    const dx = J.x - nx, dz = J.z - nz, d2 = dx * dx + dz * dz;
    if (d2 >= RAYON * RAYON) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); J.x = nx + dx / d * RAYON; J.z = nz + dz / d * RAYON; }
    else {
      const l = J.x - s.x0, r = s.x1 - J.x, b = J.z - s.z0, t = s.z1 - J.z, m = Math.min(l, r, b, t);
      if (m === l) J.x = s.x0 - RAYON; else if (m === r) J.x = s.x1 + RAYON; else if (m === b) J.z = s.z0 - RAYON; else J.z = s.z1 + RAYON;
    }
  }
}
// trajet : passe par le milieu des portes ; s'arrête devant une porte fermée
function chemin(tx, tz) {
  const za = zoneDe(J.z), zb = zoneDe(tz);
  if (za === zb) return { pts: [{ x: tx, z: tz }], bloque: false };
  const dir = zb > za ? 1 : -1, pts = [];
  for (let i = dir > 0 ? za : za - 1; dir > 0 ? i < zb : i >= zb; i += dir) {
    const b = FRONT[i];
    if (porteBloquee(i)) { pts.push({ x: clamp(J.x, -0.8, 0.8), z: b + 0.65 * dir }); return { pts, bloque: true }; }
    pts.push({ x: 0, z: b + 0.6 * dir }); pts.push({ x: 0, z: b - 0.6 * dir });
  }
  pts.push({ x: tx, z: tz });
  return { pts, bloque: false };
}
function trajet(tx, tz) {
  const r = chemin(tx, tz), pts = [];
  let prec = { x: J.x, z: J.z };
  for (const p of r.pts) { pts.push(...contourner(prec, p, 0)); prec = p; }
  return { pts, bloque: r.bloque };
}
// contourner les meubles : un ou deux coins de détour par obstacle
function dansRect(x, z, s, m) { return x > s.x0 - m && x < s.x1 + m && z > s.z0 - m && z < s.z1 + m; }
function coupe(a, b, s, m) {
  if (dansRect(a.x, a.z, s, m) || dansRect(b.x, b.z, s, m)) return false;
  const dx = b.x - a.x, dz = b.z - a.z;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, a.x - (s.x0 - m)], [dx, (s.x1 + m) - a.x], [-dz, a.z - (s.z0 - m)], [dz, (s.z1 + m) - a.z]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}
const longueur = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
function pointLibre(p) { return !solides.some((s) => s.actif && dansRect(p.x, p.z, s, RAYON)); }
function contourner(a, b, prof) {
  const s = solides.find((o) => o.actif && !o.mur && coupe(a, b, o, RAYON + 0.02));
  if (!s || prof > 3) return [b];
  const m = RAYON + 0.25;
  const coins = [[s.x0 - m, s.z0 - m], [s.x1 + m, s.z0 - m], [s.x1 + m, s.z1 + m], [s.x0 - m, s.z1 + m]].map(([x, z]) => ({ x, z })).map((c) => (pointLibre(c) ? c : null));
  let meilleur = null, lm = Infinity;
  for (const c of coins) {
    if (!c || coupe(a, c, s, RAYON) || coupe(c, b, s, RAYON)) continue;
    const l = longueur(a, c) + longueur(c, b); if (l < lm) { lm = l; meilleur = [c]; }
  }
  if (!meilleur) for (let i = 0; i < 4; i++) {
    for (const [p, q] of [[coins[i], coins[(i + 1) % 4]], [coins[(i + 1) % 4], coins[i]]]) {
      if (!p || !q || coupe(a, p, s, RAYON) || coupe(q, b, s, RAYON)) continue;
      const l = longueur(a, p) + longueur(p, q) + longueur(q, b); if (l < lm) { lm = l; meilleur = [p, q]; }
    }
  }
  if (!meilleur) return [b];
  const res = []; let prec = a;
  for (const c of meilleur) { res.push(...contourner(prec, c, prof + 1)); prec = c; }
  res.push(...contourner(prec, b, prof + 1));
  return res;
}
function dist2D(p) { return Math.hypot(p.x - J.x, p.z - J.z); }
function marcherVers(x, z) {
  const r = trajet(x, z);
  J.chemin = r.pts; J.cible = null; J.bloqueT = 0;
  if (r.bloque) toast('Cette porte est encore fermée 🔒');
  else marqueur(x, z);
  premierPas();
}
function allerVers(it) {
  if (dist2D(it.pos) <= it.reach) { utiliser(it); return; }
  const r = trajet(it.pos.x, it.pos.z);
  J.chemin = r.pts; J.cible = r.bloque ? null : it; J.bloqueT = 0;
  if (r.bloque) toast('Cette porte est encore fermée 🔒');
  premierPas();
}
function utiliser(it) {
  J.chemin = []; J.cible = null;
  if (!it.sansRegard) regarder(it.pos);
  it.use();
}
function regarder(pos, pitchMin) {
  const dx = pos.x - J.x, dz = pos.z - J.z, d = Math.hypot(dx, dz);
  J.viseYaw = Math.atan2(-dx, -dz);
  J.visePitch = clamp(Math.atan2(pos.y - OEIL, Math.max(d, 0.5)) * 0.85, -0.75, 0.45);
  if (pitchMin !== undefined) J.visePitch = Math.max(J.visePitch, pitchMin);
}
function angleVers(a, b, max) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + clamp(d, -max, max); }

const touches = {};
window.addEventListener('keydown', (e) => { touches[e.code] = true; if (e.code.startsWith('Arrow')) e.preventDefault(); });
window.addEventListener('keyup', (e) => { touches[e.code] = false; });

function deplacer(dt) {
  if (bloquerJeu()) return;
  // clavier
  let av = 0, lat = 0, tourne = 0;
  if (touches.KeyW || touches.ArrowUp) av += 1;
  if (touches.KeyS || touches.ArrowDown) av -= 1;
  if (touches.KeyA) lat -= 1;
  if (touches.KeyD) lat += 1;
  if (touches.ArrowLeft || touches.KeyQ && !touches.KeyA) tourne += 1;
  if (touches.ArrowRight || touches.KeyE) tourne -= 1;
  if (tourne) { J.yaw += tourne * 2.2 * dt; J.viseYaw = null; }
  const x0 = J.x, z0 = J.z;
  if (av || lat) {
    J.chemin = []; J.cible = null; premierPas();
    const n = Math.hypot(av, lat), s = Math.sin(J.yaw), c = Math.cos(J.yaw);
    J.x += ((-s) * av + c * lat) / n * VITESSE * dt;
    J.z += ((-c) * av - s * lat) / n * VITESSE * dt;
  } else if (J.chemin.length) {
    const wp = J.chemin[0], dernier = J.chemin.length === 1;
    if (dernier && J.cible && dist2D(J.cible.pos) <= J.cible.reach) { utiliser(J.cible); }
    else {
      const dx = wp.x - J.x, dz = wp.z - J.z, d = Math.hypot(dx, dz);
      if (d < (dernier ? 0.08 : 0.25)) { J.chemin.shift(); }
      else {
        const v = Math.min(VITESSE * dt, d);
        J.x += dx / d * v; J.z += dz / d * v;
        if (d > 0.5 && !glisse.actif) { J.viseYaw = Math.atan2(-dx, -dz); if (J.visePitch === null && J.pitch < -0.35) J.visePitch = -0.15; }
      }
    }
  }
  collisions();
  const bouge = Math.hypot(J.x - x0, J.z - z0);
  if (J.chemin.length && !av && !lat) {
    if (bouge < VITESSE * dt * 0.25) J.bloqueT += dt; else J.bloqueT = 0;
    if (J.bloqueT > 0.4) {
      const c = J.cible;
      J.chemin = []; J.cible = null; J.bloqueT = 0;
      if (c && dist2D(c.pos) < c.reach + 1.2) utiliser(c);
    }
  }
  J.pas += bouge * 6.5;
  // zones
  const z = zoneDe(J.z);
  if (z !== J.zone) { J.zone = z; entrerZone(z); }
}
function appliquerCamera(dt) {
  if (J.viseYaw !== null) {
    J.yaw = angleVers(J.yaw, J.viseYaw, 3.2 * dt * (1 + Math.abs(J.viseYaw - J.yaw)));
    if (Math.abs(((J.viseYaw - J.yaw) % (Math.PI * 2))) < 0.003) J.viseYaw = null;
  }
  if (J.visePitch !== null) {
    J.pitch += clamp(J.visePitch - J.pitch, -2 * dt, 2 * dt);
    if (Math.abs(J.visePitch - J.pitch) < 0.003) J.visePitch = null;
  }
  camera.position.set(J.x, OEIL + Math.sin(J.pas) * 0.035, J.z);
  camera.rotation.set(J.pitch, J.yaw, 0);
}

// ===================== Toucher, glisser =====================
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const glisse = { actif: false, id: null, x: 0, y: 0, x0: 0, y0: 0, t0: 0, bouge: false };
function visibleChaine(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
function bloquerJeu() { return etape === 'titre' || document.querySelector('.modal.visible:not(#fin)') !== null || etape === 'revelation'; }
canvas.addEventListener('pointerdown', (e) => {
  if (glisse.id !== null) return;
  audioInit();
  glisse.id = e.pointerId; glisse.x = glisse.x0 = e.clientX; glisse.y = glisse.y0 = e.clientY; glisse.t0 = performance.now(); glisse.bouge = false;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* rien */ }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== glisse.id) return;
  const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
  glisse.x = e.clientX; glisse.y = e.clientY;
  if (!glisse.bouge && Math.hypot(e.clientX - glisse.x0, e.clientY - glisse.y0) > 9) glisse.bouge = true;
  if (glisse.bouge && etape !== 'titre') {
    glisse.actif = true;
    const k = 1.0 * Math.PI / Math.max(window.innerWidth, 320);
    J.yaw += dx * k; J.pitch = clamp(J.pitch + dy * k, -0.8, 0.6);
    J.viseYaw = null; J.visePitch = null;
    if (Math.abs(dx) > 1) aGlisse();
  }
});
function finGlisse(e) {
  if (e.pointerId !== glisse.id) return;
  const court = performance.now() - glisse.t0 < 600;
  if (!glisse.bouge && court && e.type === 'pointerup') toucher(e.clientX, e.clientY);
  glisse.id = null; glisse.actif = false;
}
canvas.addEventListener('pointerup', finGlisse);
canvas.addEventListener('pointercancel', finGlisse);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function toucher(cx, cy) {
  if (bloquerJeu() && etape !== 'fin') return;
  if (etape === 'revelation') return;
  const rect = canvas.getBoundingClientRect();
  ndc.set((cx - rect.left) / rect.width * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(scene.children, true);
  // une étincelle touchée (même à travers un mur) : on y va
  const et = hits.find((h) => h.object.userData.etincelle && h.object.visible);
  if (et) { allerVers(et.object.userData.inter); return; }
  for (const h of hits) {
    const o = h.object;
    if (o.userData.noRay || !visibleChaine(o)) continue;
    const it = o.userData.inter;
    if (it && (!it.actif || it.actif())) { allerVers(it); return; }
    const n = h.face ? h.face.normal.clone().transformDirection(o.matrixWorld) : null;
    const p = h.point.clone();
    if (!(n && n.y > 0.7)) {
      const dx = camera.position.x - p.x, dz = camera.position.z - p.z, d = Math.hypot(dx, dz) || 1;
      const recul = Math.min(0.55, d);
      p.x += dx / d * recul; p.z += dz / d * recul;
    }
    // touché à côté d'un objet qui brille : c'est sûrement lui qu'on visait
    const proche = inters.find((i) => i.etincelle && i.etincelle.visible && Math.hypot(i.pos.x - p.x, i.pos.z - p.z) < 0.7);
    if (proche) { allerVers(proche); return; }
    const dx = p.x - J.x, dz = p.z - J.z, d = Math.hypot(dx, dz);
    if (d > 14) { p.x = J.x + dx / d * 14; p.z = J.z + dz / d * 14; }
    marcherVers(p.x, p.z);
    return;
  }
}
// petit rond qui s'efface à l'endroit touché
const rond = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
rond.rotation.x = -Math.PI / 2; rond.userData.noRay = true; scene.add(rond);
let rondT = 1;
function marqueur(x, z) { rond.position.set(x, 0.03, z); rondT = 0; }

// ===================== Étapes du jeu =====================
let etape = 'titre';
const ETAPES = ['biberons', 'code', 'musique', 'final'];
const OBJECTIFS = {
  biberons: () => `Trouve les 3 biberons 🍼 <b>${biberons}/3</b>`,
  versJeux: () => 'La porte est ouverte : avance ! ➜',
  code: () => 'Trouve le code du cadenas 🔒',
  versMusique: () => 'La porte est ouverte : avance ! ➜',
  musique: () => simon.phase === 'joue' ? 'À toi ! Touche les cubes dans l’ordre 🎵' : 'Touche la boîte à musique 🎵',
  versFete: () => 'La porte est ouverte : avance ! ➜',
  final: () => 'Ouvre le grand cadeau 🎁',
  revelation: () => 'Roulement de tambour… 🥁',
  fin: () => 'C’est une fille ! 💗',
};
const aideCode = { vu: false, erreurs: 0 };
function indice() {
  switch (etape) {
    case 'biberons': {
      const restants = BIBERONS.filter((b) => b.g.visible).map((b) => b.lieu);
      return `Les biberons brillent ✨<br>Il en reste ${restants.length} : ${restants.join(', ')}.<br>Glisse le doigt pour regarder autour de toi !`;
    }
    case 'versJeux': case 'versMusique': case 'versFete': return 'Touche le sol de l’autre côté de la porte ouverte pour avancer !';
    case 'code':
      if (aideCode.erreurs >= 2) return `Psst… ${CONFIG.code[0]} nounours, ${CONFIG.code[1]} canards et ${CONFIG.code[2]} ballons !`;
      return 'Compte les nounours 🧸, les canards 🦆 (regarde dans la bassine !) et les ballons 🎈.<br>Puis touche le cadenas jaune à droite de la porte.';
    case 'musique':
      if (simon.erreurs >= 2) return 'L’ordre : ' + SEQUENCE.map((i) => CUBES[i].emoji + ' ' + CUBES[i].nom).join(' → ');
      return 'Touche la boîte à musique, écoute bien quels cubes s’allument, puis touche-les dans le même ordre.';
    case 'final': return 'Touche le gros cadeau au milieu de la pièce ! 🎁';
    default: return 'Profite de la fête ! 🎉';
  }
}
function passerA(e) {
  etape = e; majObjectif(true); majEtapes();
}
function majEtapes() {
  const idx = { biberons: 0, versJeux: 1, code: 1, versMusique: 2, musique: 2, versFete: 3, final: 3, revelation: 3, fin: 4 }[etape] ?? 0;
  document.querySelectorAll('.etape').forEach((el, i) => { el.classList.toggle('fait', i < idx); el.classList.toggle('encours', i === idx); });
}
let objTexte = '';
function majObjectif(anime) {
  const f = OBJECTIFS[etape]; const t = f ? f() : '';
  if (t === objTexte) return;
  objTexte = t; const el = $('objectif'); el.innerHTML = t;
  if (anime) { el.classList.remove('change'); void el.offsetWidth; el.classList.add('change'); }
}
const visites = {};
function entrerZone(z) {
  if (visites[z]) return;
  visites[z] = true;
  if (z === 2 && etape === 'versJeux') { passerA('code'); toast('La salle de jeux 🧸<br>Il faut trouver le code du cadenas !', 4); son('ok'); }
  if (z === 4 && etape === 'versMusique') { passerA('musique'); toast('La salle de musique 🎵<br>Écoute la boîte à musique…', 4); son('ok'); }
  if (z === 6 && etape === 'versFete') { passerA('final'); toast('La grande salle 🎁<br>La réponse est dans le cadeau !', 4); son('ok'); }
}

// ----- le cadenas -----
const codeSaisi = [0, 0, 0];
(function construireRoues() {
  const icones = ['🧸', '🦆', '🎈'];
  const roues = $('roues');
  icones.forEach((ic, i) => {
    const r = document.createElement('div'); r.className = 'roue';
    r.innerHTML = `<div class="icone">${ic}</div><button aria-label="plus">▲</button><div class="chiffre">0</div><button aria-label="moins">▼</button>`;
    const [plus, moins] = r.querySelectorAll('button'), ch = r.querySelector('.chiffre');
    plus.onclick = () => { codeSaisi[i] = (codeSaisi[i] + 1) % 10; ch.textContent = codeSaisi[i]; son('clic'); };
    moins.onclick = () => { codeSaisi[i] = (codeSaisi[i] + 9) % 10; ch.textContent = codeSaisi[i]; son('clic'); };
    roues.appendChild(r);
  });
})();
function ouvrirCode() { $('code-msg').textContent = ''; ouvrirModal('m-code'); }
$('b-ouvrir').onclick = () => {
  if (codeSaisi.every((v, i) => v === CONFIG.code[i])) {
    fermerModal('m-code'); son('bravo'); vibrer([40, 40, 80]);
    toast('Clic ! Le cadenas s’ouvre 🔓', 3);
    ouvrir(portes.b); passerA('versMusique');
  } else {
    aideCode.erreurs++; son('faux'); vibrer(120);
    const c = document.querySelector('#m-code .carte'); c.classList.remove('secoue'); void c.offsetWidth; c.classList.add('secoue');
    const faux = codeSaisi.map((v, i) => v !== CONFIG.code[i]);
    const noms = ['les nounours', 'les canards', 'les ballons'].filter((_, i) => faux[i]);
    $('code-msg').innerHTML = aideCode.erreurs >= 2
      ? `Petit coup de pouce : ${CONFIG.code[0]} 🧸, ${CONFIG.code[1]} 🦆, ${CONFIG.code[2]} 🎈`
      : noms.length === 3 ? 'Pas encore… Compte bien chaque chose dans la pièce 🔍'
      : `Presque ! Recompte ${noms.join(' et ')} 🔍`;
  }
};

// ----- la berceuse (Simon) -----
function lancerSimon() {
  if (simon.phase === 'ecoute') return;
  simon.phase = 'ecoute'; simon.progres = 0; majObjectif(true);
  regarder(new THREE.Vector3(0, 0.6, -24.6));
  musique(false);
  if (!simon.dejaVu) { toast('Écoute bien… 👂', 2); simon.dejaVu = true; }
  SEQUENCE.forEach((i, k) => plusTard(0.9 + k * 0.75, () => allumerCube(i)));
  plusTard(0.9 + SEQUENCE.length * 0.75 + 0.2, () => {
    simon.phase = 'joue'; majObjectif(true);
    toast('À toi ! Touche les cubes<br>dans le même ordre 🎵', 2.6);
  });
}
function allumerCube(i) {
  const cu = CUBES[i]; cu.lum = 1; jouerNote(cu.f, 0.35);
}
function toucherCube(i) {
  if (simon.phase === 'ecoute') { toast('Écoute d’abord… 👂', 1.4); return; }
  if (simon.phase !== 'joue') { allumerCube(i); if (simon.phase === 'attente') toast('Touche d’abord la boîte à musique 🎵', 2.2); return; }
  allumerCube(i);
  if (SEQUENCE[simon.progres] === i) {
    simon.progres++;
    if (simon.progres === SEQUENCE.length) {
      simon.phase = 'fini';
      plusTard(0.5, () => {
        son('berceuse'); toast('Bravo ! Quelle jolie berceuse 🎶<br>La porte s’ouvre !', 3.6);
        ouvrir(portes.c); passerA('versFete'); musique(true, 4);
      });
    }
  } else {
    simon.erreurs++; simon.phase = 'erreur'; son('faux'); vibrer(120);
    toast(simon.erreurs >= 2 ? 'Oups ! Je te remontre… (💡 donne l’ordre)' : 'Oups ! On réécoute… 👂', 2);
    plusTard(1.3, () => { simon.phase = 'attente'; lancerSimon(); });
  }
}

// ----- le grand final -----
let prono = null;
$('p-garcon').onclick = () => choisir('garçon');
$('p-fille').onclick = () => choisir('fille');
function choisir(c) {
  prono = c; fermerModal('m-prono'); son('clic');
  passerA('revelation');
  musique(false);
  J.chemin = []; J.cible = null;
  // reculer un peu pour bien voir
  const d = dist2D(cadeau.pos);
  if (d < 5) {
    const dx = J.x - cadeau.pos.x, dz = J.z - cadeau.pos.z, n = Math.hypot(dx, dz) || 1;
    const fx = clamp(cadeau.pos.x + dx / n * 5.2, -5.3, 5.3), fz = clamp(cadeau.pos.z + dz / n * 5.2, -41.3, -30.7);
    let t = 0; const x0 = J.x, z0 = J.z;
    anims.push((dt) => { t += dt / 1.1; const k = lisse(Math.min(t, 1)); J.x = x0 + (fx - x0) * k; J.z = z0 + (fz - z0) * k; collisions(); return t < 1; });
  }
  regarder(new THREE.Vector3(cadeau.pos.x, 1.3, cadeau.pos.z));
  toast(c === 'fille' ? 'Une fille ? Voyons voir… 🥁' : 'Un garçon ? Voyons voir… 🥁', 2.4);
  son('roulement');
  let t = 0;
  anims.push((dt) => {
    t += dt; const a = Math.min(t / 2.8, 1);
    cadeau.g.rotation.z = Math.sin(t * 38) * 0.05 * a; cadeau.g.rotation.x = Math.cos(t * 31) * 0.03 * a;
    cadeau.cou.position.y = 1.6 + Math.max(0, Math.sin(t * 22)) * 0.06 * a;
    if (t >= 2.9) { cadeau.g.rotation.set(0, 0, 0); return false; }
  });
  plusTard(3.0, boum);
}
function boum() {
  son('boum'); vibrer([80, 40, 160, 40, 260]);
  // le couvercle s'envole et retombe à côté de l'estrade
  {
    const a = cadeau.cou.position.clone(), b = new THREE.Vector3(2.3, -0.03, 0.7);
    let t = 0;
    anims.push((dt) => {
      t = Math.min(1, t + dt / 1.5);
      cadeau.cou.position.lerpVectors(a, b, t);
      cadeau.cou.position.y += 4 * 1.1 * t * (1 - t);
      cadeau.cou.rotation.set(lisse(t) * Math.PI * 2, t * 0.5, Math.sin(t * Math.PI) * 0.8);
      return t < 1;
    });
  }
  // ballons
  cadeau.ballons.forEach((b) => {
    let t = -b.userData.retard;
    const depart = new THREE.Vector3(cadeau.pos.x + (rnd() - 0.5) * 0.8, 0.9, cadeau.pos.z + (rnd() - 0.5) * 0.8);
    b.position.copy(depart); b.scale.setScalar(0.3);
    anims.push((dt) => {
      t += dt; if (t < 0) return true;
      b.visible = true;
      const k = Math.min(t / 2.4, 1), e = 1 - Math.pow(1 - k, 3);
      const c = b.userData.cible;
      b.position.x = depart.x + (c.x - depart.x) * e + Math.sin(temps * 1.3 + b.userData.phase) * 0.06;
      b.position.z = depart.z + (c.z - depart.z) * e;
      b.position.y = depart.y + (c.y - depart.y) * (1 - Math.pow(1 - k, 2)) + Math.sin(temps * 1.7 + b.userData.phase) * 0.04 * k;
      b.rotation.z = Math.sin(temps * 1.1 + b.userData.phase) * 0.12;
      b.scale.setScalar(0.3 + 0.7 * Math.min(t / 0.5, 1));
      return true;
    });
  });
  lancerConfettis();
  // tout devient rose
  const c0 = { fond: scene.background.clone(), ciel: ciel.color.clone(), sol: ciel.groundColor.clone(), mur: matMurFete.color.clone() };
  const c1 = { fond: new THREE.Color(0xffe1ee), ciel: new THREE.Color(0xffe6f0), sol: new THREE.Color(0xf7c9dc), mur: new THREE.Color(0xffd0e3) };
  let t = 0;
  anims.push((dt) => {
    t += dt / 2.2; const k = lisse(Math.min(t, 1));
    scene.background.copy(c0.fond).lerp(c1.fond, k); scene.fog.color.copy(scene.background);
    ciel.color.copy(c0.ciel).lerp(c1.ciel, k); ciel.groundColor.copy(c0.sol).lerp(c1.sol, k);
    matMurFete.color.copy(c0.mur).lerp(c1.mur, k);
    lumRose.intensity = 1.5 * k;
    return t < 1;
  });
  banniere.material.map = texFille;
  plusTard(0.4, () => { J.visePitch = 0.2; });
  plusTard(0.3, () => son('fanfare'));
  plusTard(2.6, () => { passerA('fin'); afficherFin(); });
  plusTard(9, () => musique(true, 6, true));
}
function afficherFin() {
  $('fin-prono').textContent = prono === 'fille' ? 'Tu avais deviné ! Bravo 🎉' : prono === 'garçon' ? 'Raté pour le pronostic… mais quelle jolie surprise ! 😄' : '';
  $('fin-message').textContent = [CONFIG.message, CONFIG.arrivee].filter(Boolean).join(' ');
  $('fin-signature').textContent = CONFIG.signature ? '— ' + CONFIG.signature + ' 💗' : '';
  ouvrirModal('fin');
  pluieDeCoeurs();
}
function pluieDeCoeurs() {
  const zone = $('coeurs');
  const em = ['💗', '💖', '🎀', '💕', '✨', '🎈'];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.textContent = em[i % em.length];
    s.style.left = (Math.random() * 96) + '%';
    s.style.fontSize = (22 + Math.random() * 26) + 'px';
    s.style.animationDuration = (4 + Math.random() * 4) + 's';
    s.style.animationDelay = (Math.random() * 2.5) + 's';
    zone.appendChild(s);
    setTimeout(() => s.remove(), 11000);
  }
}
$('b-fete').onclick = () => { fermerModal('fin'); $('b-revoir').style.display = 'block'; };
$('b-revoir').onclick = () => { $('b-revoir').style.display = 'none'; ouvrirModal('fin'); pluieDeCoeurs(); son('ok'); };
$('b-rejouer').onclick = () => location.reload();
$('b-partager').onclick = async () => {
  const url = location.href.split('#')[0].split('?')[0];
  const txt = 'Un petit jeu de 5 minutes pour découvrir une grande nouvelle… 🍼✨ Joue jusqu’au bout !';
  try {
    if (navigator.share) { await navigator.share({ title: 'Une grande nouvelle…', text: txt, url }); return; }
  } catch (_) { return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(txt + ' ' + url), '_blank');
};

// ===================== Interface =====================
function ouvrirModal(id) { $(id).classList.add('visible'); J.chemin = []; J.cible = null; $('toast').classList.remove('visible'); }
function fermerModal(id) { $(id).classList.remove('visible'); }
document.querySelectorAll('[data-ferme]').forEach((b) => { b.onclick = () => fermerModal(b.dataset.ferme); });
let toastMin = null;
function toast(html, duree) {
  const el = $('toast'); el.innerHTML = html; el.classList.add('visible');
  clearTimeout(toastMin); toastMin = setTimeout(() => el.classList.remove('visible'), (duree || 2.6) * 1000);
}
$('b-indice').onclick = () => { audioInit(); son('clic'); toast('💡 ' + indice(), 5.5); };
$('b-son').onclick = () => { audioInit(); muet = !muet; $('b-son').textContent = muet ? '🔇' : '🔊'; if (maitre) maitre.gain.value = muet ? 0 : 0.9; };
function vibrer(m) { try { if (navigator.vibrate) navigator.vibrate(m); } catch (_) { /* rien */ } }

// aides de départ
const aide = { pas: false, glisse: false };
function montrerAide(t, glisseAnim) { $('aide-texte').textContent = t; $('aide').classList.toggle('glisse', !!glisseAnim); $('aide').classList.add('visible'); }
function cacherAide() { $('aide').classList.remove('visible'); }
function premierPas() {
  if (aide.pas) return; aide.pas = true; cacherAide();
  plusTard(2.2, () => { if (!aide.glisse) montrerAide(TACTILE ? 'Glisse le doigt pour regarder autour' : 'Fais glisser la souris pour regarder autour', true); });
  plusTard(10, () => { if (!aide.glisse) { aide.glisse = true; cacherAide(); } });
}
function aGlisse() { if (aide.glisse) return; aide.glisse = true; if (aide.pas) cacherAide(); }

if (!TACTILE) {
  $('r1').textContent = 'Clique sur le sol pour marcher (ou flèches du clavier)';
  $('r2').textContent = 'Clique sur ce qui brille';
  $('r3').textContent = 'Fais glisser la souris pour regarder autour';
}

function commencer() {
  audioInit(); son('ok');
  fermerModal('titre');
  $('hud').classList.add('visible');
  J.yaw = 0; J.pitch = -0.1;
  passerA('biberons');
  musique(true, 1.5);
  plusTard(0.6, () => toast('Bienvenue dans la chambre de bébé !<br>Bébé a faim : trouve les 3 biberons 🍼', 4.5));
  plusTard(1.2, () => { if (!aide.pas) montrerAide(TACTILE ? 'Touche le sol pour marcher' : 'Clique sur le sol pour marcher'); });
}
$('b-jouer').onclick = commencer;

// ===================== Sons (tout est synthétisé) =====================
let AC = null, maitre = null, gMus = null, bruitBuf = null, muet = false;
function audioInit() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  if (AC) { if (AC.state !== 'running') AC.resume(); return; }
  AC = new C();
  maitre = AC.createGain(); maitre.gain.value = muet ? 0 : 0.9;
  const comp = AC.createDynamicsCompressor(); maitre.connect(comp); comp.connect(AC.destination);
  gMus = AC.createGain(); gMus.gain.value = 0;
  // musique feutrée : filtre doux + petit écho pour l'espace
  const filtre = AC.createBiquadFilter(); filtre.type = 'lowpass'; filtre.frequency.value = 1800; filtre.Q.value = 0.3;
  const echo = AC.createDelay(1); echo.delayTime.value = 0.48;
  const retour = AC.createGain(); retour.gain.value = 0.32;
  const humide = AC.createGain(); humide.gain.value = 0.35;
  gMus.connect(filtre); filtre.connect(maitre);
  filtre.connect(echo); echo.connect(retour); retour.connect(echo); echo.connect(humide); humide.connect(maitre);
  bruitBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
  const d = bruitBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = AC.createBufferSource(); s.buffer = AC.createBuffer(1, 1, 22050); s.connect(AC.destination); s.start(0);
  setInterval(planifierMusique, 200);
}
document.addEventListener('visibilitychange', () => { if (!AC) return; if (document.hidden) AC.suspend(); else AC.resume(); });
function clochette(f, t, vol, dur, dest) {
  dur = dur || 1.5; vol = vol || 0.2;
  const g = AC.createGain(); g.connect(dest || maitre);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + dur + 0.05);
  const g2 = AC.createGain(); g2.connect(dest || maitre);
  g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(vol * 0.15, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.3);
  const o2 = AC.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 3.01; o2.connect(g2); o2.start(t); o2.stop(t + dur * 0.3 + 0.05);
}
function souffle(t, dur, vol, type, f0, f1) {
  const s = AC.createBufferSource(); s.buffer = bruitBuf; s.loop = true;
  const fi = AC.createBiquadFilter(); fi.type = type; fi.frequency.setValueAtTime(f0, t); fi.frequency.exponentialRampToValueAtTime(f1 || f0, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fi); fi.connect(g); g.connect(maitre); s.start(t); s.stop(t + dur + 0.05);
}
function bip(f0, f1, t, dur, vol, type) {
  const o = AC.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(maitre); o.start(t); o.stop(t + dur + 0.05);
}
function jouerNote(f, vol) { if (!AC) return; clochette(f, AC.currentTime + 0.01, vol || 0.3, 1.6); }
function son(nom) {
  if (!AC) return;
  const t = AC.currentTime + 0.01;
  switch (nom) {
    case 'pop': bip(420, 980, t, 0.14, 0.25); clochette(NOTES.C6, t + 0.08, 0.16, 0.8); clochette(NOTES.G5 * 2, t + 0.16, 0.12, 0.8); break;
    case 'clic': clochette(1568, t, 0.07, 0.18); break;
    case 'ok': [NOTES.C5, NOTES.E5, NOTES.G5].forEach((f, i) => clochette(f, t + i * 0.08, 0.14, 1)); break;
    case 'bravo': [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f, i) => clochette(f, t + i * 0.1, 0.2, 1.4)); break;
    case 'faux': bip(330, 300, t, 0.18, 0.12, 'triangle'); bip(250, 200, t + 0.18, 0.3, 0.12, 'triangle'); break;
    case 'porte': souffle(t, 1.3, 0.1, 'lowpass', 300, 2000); [NOTES.C5, NOTES.G5, NOTES.C6].forEach((f, i) => clochette(f, t + 0.2 + i * 0.12, 0.12, 1.6)); break;
    case 'berceuse': ['C5', 'C5', 'G5', 'G5', 'A5', 'A5', 'G5'].forEach((n, i) => clochette(NOTES[n], t + i * 0.28, 0.2, 1.4)); break;
    case 'roulement': {
      let x = 0, ecart = 0.11;
      while (x < 2.85) { souffle(t + x, 0.06, 0.05 + 0.25 * (x / 2.85), 'bandpass', 1500, 1200); x += ecart; ecart = Math.max(0.035, ecart * 0.94); }
      bip(80, 120, t, 2.9, 0.12, 'sine');
      break;
    }
    case 'boum':
      souffle(t, 0.9, 0.5, 'lowpass', 2500, 120); bip(140, 45, t, 0.7, 0.5); souffle(t + 0.05, 2.4, 0.12, 'highpass', 4000, 9000);
      [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6].forEach((f) => clochette(f, t + 0.02, 0.18, 2.5));
      break;
    case 'fanfare': {
      const m = ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], d = [0.14, 0.14, 0.14, 0.4, 0.16, 0.9];
      let x = 0; m.forEach((n, i) => { clochette(NOTES[n], t + x, 0.22, 1.6); bip(NOTES[n], NOTES[n], t + x, d[i] + 0.1, 0.05, 'triangle'); x += d[i]; });
      [NOTES.C3 * 2, NOTES.G3 * 2, NOTES.C3 * 4].forEach((f) => bip(f, f, t + 0.56, 1.8, 0.06, 'triangle'));
      break;
    }
    default: break;
  }
}
// musique de fond : nappes d'accords lentes et quelques notes de boîte à musique au hasard,
// très espacées (rien qui tourne en boucle)
const F = (n) => 440 * Math.pow(2, n / 12);   // n = demi-tons depuis La 440
const ACCORDS = [
  { nappe: [-21, -17, -14, -10], notes: [3, 7, 10, 14, 15] },    // Do maj7
  { nappe: [-24, -21, -17, -14], notes: [0, 3, 7, 12, 15] },     // La m7
  { nappe: [-28, -24, -21, -17], notes: [-4, 0, 3, 8, 12] },     // Fa maj7
  { nappe: [-26, -22, -19, -17], notes: [-2, 2, 5, 7, 10] },     // Sol 6
];
const mus = { on: false, prochain: 0, i: 0, duree: 8, joyeuse: false };
function nappe(f, t, dur, vol) {
  const g = AC.createGain(); g.connect(gMus);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 2.5);
  g.gain.setValueAtTime(vol, t + dur - 2.5); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.5);
  for (const [type, desacc, v] of [['sine', 0, 1], ['triangle', 4, 0.35]]) {
    const o = AC.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = desacc;
    const gv = AC.createGain(); gv.gain.value = v; o.connect(gv); gv.connect(g);
    o.start(t); o.stop(t + dur + 1.6);
  }
}
function goutte(f, t, vol) {
  const g = AC.createGain(); g.connect(gMus);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
  const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 3.1);
}
function musique(on, delai, joyeuse) {
  if (!AC) { mus.on = on; return; }
  const t = AC.currentTime;
  gMus.gain.cancelScheduledValues(t); gMus.gain.setValueAtTime(gMus.gain.value, t);
  if (on) {
    if (!mus.on) mus.prochain = t + (delai || 0.2);
    mus.on = true; mus.joyeuse = !!joyeuse;
    gMus.gain.linearRampToValueAtTime(1, t + 3);
  } else {
    mus.on = false; gMus.gain.linearRampToValueAtTime(0, t + 0.8);
  }
}
function planifierMusique() {
  if (!AC || !mus.on || AC.state !== 'running') return;
  const now = AC.currentTime;
  if (mus.prochain < now - 1) mus.prochain = now + 0.1;
  while (mus.prochain < now + 0.6) {
    const t = mus.prochain, a = ACCORDS[mus.i % ACCORDS.length];
    a.nappe.forEach((n, k) => nappe(F(n), t, mus.duree, k === 0 ? 0.03 : 0.018));
    // une à trois notes douces, placées au hasard dans l'accord (parfois aucune)
    const nb = Math.random() < 0.2 ? 0 : 1 + Math.floor(Math.random() * (mus.joyeuse ? 3 : 2));
    let x = 1 + Math.random() * 2;
    for (let k = 0; k < nb && x < mus.duree - 1; k++) {
      goutte(F(a.notes[Math.floor(Math.random() * a.notes.length)]), t + x, 0.035);
      x += 1.5 + Math.random() * 2.5;
    }
    mus.i++; mus.prochain += mus.duree;
  }
}

// ===================== Boucle =====================
const tmp = new THREE.Vector3();
function majEtincelles() {
  for (const it of inters) {
    const s = it.etincelle; if (!s) continue;
    const on = it.brille() && visibleChaine(it.obj);
    s.visible = on;
    if (on) {
      it.obj.getWorldPosition(tmp);
      const haut = it.pos.y + 0.35;
      s.position.set(it.pos.x, haut + Math.sin(temps * 2.4 + it.phase) * 0.06, it.pos.z);
      const d = camera.position.distanceTo(s.position);
      s.scale.setScalar((0.28 + Math.sin(temps * 5 + it.phase) * 0.06) * clamp(d / 4, 0.8, 2.2));
      s.material.rotation = temps * 0.8 + it.phase;
    }
  }
}
function update(dt) {
  temps += dt;
  for (let i = minuteurs.length - 1; i >= 0; i--) if (temps >= minuteurs[i].t) { const f = minuteurs[i].fn; minuteurs.splice(i, 1); f(); }
  for (let i = anims.length - 1; i >= 0; i--) if (anims[i](dt) === false) anims.splice(i, 1);
  if (etape === 'titre') {
    J.yaw = Math.sin(temps * 0.22) * 0.5; J.pitch = -0.08;
  } else deplacer(dt);
  appliquerCamera(dt);
  // décor vivant
  if (decor.mobile) decor.mobile.rotation.y += dt * 0.35;
  decor.ballonsJeux.forEach((b, k) => { b.position.y = b.userData.base.y + Math.sin(temps * 1.2 + k * 2) * 0.04; b.rotation.z = Math.sin(temps * 0.9 + k) * 0.06; });
  decor.canardsBain.forEach((c, k) => { c.position.y = 0.33 + Math.sin(temps * 2 + k * 2.1) * 0.012; c.rotation.y += dt * 0.15 * (k % 2 ? 1 : -1); });
  if (decor.etoileBoite) decor.etoileBoite.rotation.y += dt * (simon.phase === 'ecoute' || simon.phase === 'fini' ? 4 : 0.6);
  if (decor.manivelle) decor.manivelle.rotation.x += dt * (simon.phase === 'ecoute' ? 6 : 0);
  CUBES.forEach((cu) => {
    if (cu.lum > 0) cu.lum = Math.max(0, cu.lum - dt * 1.8);
    const k = cu.lum;
    cu.m.material.emissive.setRGB(k * 0.55, k * 0.5, k * 0.4);
    cu.m.position.y = cu.y0 + Math.sin(Math.min(k, 1) * Math.PI) * 0.12;
  });
  if (rondT < 1) { rondT = Math.min(1, rondT + dt / 0.8); rond.material.opacity = (1 - rondT) * 0.9; rond.scale.setScalar(1 + rondT * 0.8); }
  majEtincelles();
  majConfettis(dt);
  majObjectif(false);
}

// qualité adaptative : si ça rame, on baisse la résolution
const perf = { t: 0, n: 0, fait: false };
function surveiller(dt) {
  if (perf.fait || etape === 'titre') return;
  perf.t += dt; perf.n++;
  if (perf.t > 3) {
    if (perf.n / perf.t < 30 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); redim(); }
    perf.fait = true;
  }
}

renderer.compile(scene, camera);
let dernier = performance.now();
function boucle(now) {
  const dt = Math.min(0.05, (now - dernier) / 1000); dernier = now;
  update(dt); surveiller(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(boucle);
}
if (DEBUG) {
  window.__jeu = {
    J, inters, portes, CUBES, SEQUENCE, simon, cadeau, get etape() { return etape; },
    step(n, dt) { for (let i = 0; i < n; i++) update(dt || 1 / 30); renderer.render(scene, camera); },
    rendre() { renderer.render(scene, camera); },
    commencer, toucher, marcherVers, allerVers, utiliser, choisir, codeSaisi, toucherCube,
    infos() { return renderer.info.programs.length; },
    ecran(i) { const v = inters[i].pos.clone().project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; },
    get biberons() { return biberons; },
  };
  appliquerCamera(0); renderer.render(scene, camera);
} else requestAnimationFrame(boucle);
