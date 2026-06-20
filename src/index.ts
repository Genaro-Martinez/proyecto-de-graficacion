import { Obj3D } from './Obj3D.js';
import { CvZbuf } from './CvZbuf.js';

let canvas: HTMLCanvasElement;
let graphics: CanvasRenderingContext2D;

canvas = <HTMLCanvasElement>document.getElementById('circlechart');
graphics = canvas.getContext('2d');

let cv: CvZbuf;
let obj: Obj3D;

let baseObj: Obj3D | null = null;
let movilObj: Obj3D | null = null;

function repaintAll() {
  if (!cv) cv = new CvZbuf(graphics, canvas);
  cv = new CvZbuf(graphics, canvas);
  
  if (baseObj) cv.addObj(baseObj);
  if (movilObj) cv.addObj(movilObj);
  
  if (baseObj) obj = baseObj;
  else if (movilObj) obj = movilObj;
  
  let totalVerts = 0;
  let totalTris = 0;
  
  if (baseObj) {
    totalVerts += baseObj.w.length - 1;
    totalTris += baseObj.getPolyList().length;
  }
  if (movilObj) {
    totalVerts += movilObj.w.length - 1;
    totalTris += movilObj.getPolyList().length;
  }
  
  const vEl = document.getElementById('stat-verts');
  if (vEl) vEl.innerText = totalVerts.toString();
  const tEl = document.getElementById('stat-tris');
  if (tEl) tEl.innerText = totalTris.toString();
  
  cv.paint();
}

function leerArchivoBase(e:any) {
  var archivo = e.target.files[0];
  if (!archivo) return;
  document.getElementById('file-name-base').innerText = archivo.name;
  var lector = new FileReader();
  lector.onload = function(ev) {
    var contenido = ev.target.result as string;
    const rawEl = document.getElementById('raw-base') as HTMLTextAreaElement;
    if (rawEl) rawEl.value = contenido;
    
    let tempObj = new Obj3D();
    if (tempObj.read(contenido)) {
      tempObj.baseColorR = 190; tempObj.baseColorG = 190; tempObj.baseColorB = 190;
      baseObj = tempObj;
      repaintAll();
    }
  };
  lector.readAsText(archivo);
}

function leerArchivoMovil(e:any) {
  var archivo = e.target.files[0];
  if (!archivo) return;
  document.getElementById('file-name-movil').innerText = archivo.name;
  var lector = new FileReader();
  lector.onload = function(ev) {
    var contenido = ev.target.result as string;
    const rawEl = document.getElementById('raw-movil') as HTMLTextAreaElement;
    if (rawEl) rawEl.value = contenido;
    
    let tempObj = new Obj3D();
    if (tempObj.read(contenido)) {
      tempObj.baseColorR = 190; tempObj.baseColorG = 190; tempObj.baseColorB = 190;
      tempObj.pivotX = 0; tempObj.pivotY = 0; tempObj.pivotZ = 0;
      movilObj = tempObj;
      repaintAll();
    }
  };
  lector.readAsText(archivo);
}

function vp(dTheta:number, dPhi:number, fRho:number):void{
  if (cv && cv.getObjs().length > 0) {
    cv.getObjs().forEach(o => o.vp(cv, dTheta, dPhi, fRho));
  }
}

// Eventos
document.getElementById('file-input-base')?.addEventListener('change', leerArchivoBase, false);
document.getElementById('file-input-movil')?.addEventListener('change', leerArchivoMovil, false);

let autoRotating: boolean = true;
let animationFrameId: number;

function toggleAutoRotate() {
  autoRotating = !autoRotating;
  const btn = document.getElementById('btn-auto-rotate');
  
  if (btn) {
    if (autoRotating) {
      btn.innerHTML = '■ DETENER';
      rotateLoop();
    } else {
      btn.innerHTML = '▶ ANIMAR';
      cancelAnimationFrame(animationFrameId);
    }
  }
}

function rotateLoop() {
  if (!autoRotating) return;
  let dTheta = 45 * 0.0005;
  vp(dTheta, 0, 1);
  animationFrameId = requestAnimationFrame(rotateLoop);
}

document.getElementById('btn-auto-rotate')?.addEventListener('click', toggleAutoRotate, false);

let Pix: number, Piy: number;
let Pfx: number, Pfy: number;
let flag: boolean = false;

// Manipulación 360 (Ratón)
function handleMouse(evento: any) {
  Pix = evento.offsetX;
  Piy = evento.offsetY;
  flag = true;
  // Al hacer click, cerrar la pinza
  if (cv && cv.getObjs().length > 1) {
     let movil = cv.getObjs()[1];
     movil.localRotZ = -(25 * Math.PI) / 180.0;
     const apSlider = <HTMLInputElement>document.getElementById('input-apertura');
     if (apSlider) {
       apSlider.value = '25';
       document.getElementById('val-apertura').innerText = '25°';
     }
     cv.paint();
  }
}

function makeVizualization(evento: any) {
  if (flag && obj) {
    Pfx = evento.offsetX;
    Pfy = evento.offsetY;
    let difX = Pfx - Pix;
    let difY = Pfy - Piy;
    
    // Mejor sensibilidad para 360 grados
    vp(-difX * 0.01, difY * 0.01, 1);
    
    Pix = Pfx;
    Piy = Pfy;
  }
}

function noDraw() {
  flag = false;
  // Al soltar el click, abrir la pinza
  if (cv && cv.getObjs().length > 1) {
     let movil = cv.getObjs()[1];
     movil.localRotZ = 0;
     const apSlider = <HTMLInputElement>document.getElementById('input-apertura');
     if (apSlider) {
       apSlider.value = '0';
       document.getElementById('val-apertura').innerText = '0°';
     }
     cv.paint();
  }
}

canvas.addEventListener('mousedown', handleMouse);
canvas.addEventListener('mouseup', noDraw);
canvas.addEventListener('mousemove', makeVizualization);
canvas.addEventListener('mouseleave', noDraw);


// Resize handling básico
function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  if (container) {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (obj && cv) {
      cv.paint();
    }
  }
}

window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

// D-Pad Rotation Handling
let manualRotationInterval: number;

function startManualRotation(dTheta: number, dPhi: number, fRho: number = 1) {
  if (!obj) return;
  // Rotate/zoom once immediately
  vp(dTheta, dPhi, fRho);
  // Then start interval for continuous action
  clearInterval(manualRotationInterval);
  manualRotationInterval = window.setInterval(() => {
    vp(dTheta, dPhi, fRho);
  }, 30); // 30ms for smooth ~30fps
}

function stopManualRotation() {
  clearInterval(manualRotationInterval);
}

function setupDPad() {
  const btnUp = document.getElementById('btn-rot-up');
  const btnDown = document.getElementById('btn-rot-down');
  const btnLeft = document.getElementById('btn-rot-left');
  const btnRight = document.getElementById('btn-rot-right');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');

  const addHoldEvents = (btn: HTMLElement, dTheta: number, dPhi: number, fRho: number = 1) => {
    if (!btn) return;
    btn.addEventListener('mousedown', () => startManualRotation(dTheta, dPhi, fRho));
    btn.addEventListener('mouseup', stopManualRotation);
    btn.addEventListener('mouseleave', stopManualRotation);
    
    // Touch support for mobile
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); startManualRotation(dTheta, dPhi, fRho); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); stopManualRotation(); });
    btn.addEventListener('touchcancel', (e) => { e.preventDefault(); stopManualRotation(); });
  };

  const rotSpeed = 0.05; // Base rotation speed for D-pad
  addHoldEvents(btnUp, 0, rotSpeed);
  addHoldEvents(btnDown, 0, -rotSpeed);
  addHoldEvents(btnLeft, -rotSpeed, 0);
  addHoldEvents(btnRight, rotSpeed, 0);
  
  // Zoom functionality for buttons (continuous)
  addHoldEvents(btnZoomIn, 0, 0, 0.95);
  addHoldEvents(btnZoomOut, 0, 0, 1.05);
}
setupDPad();

// Mouse wheel zoom
canvas.addEventListener('wheel', (e) => {
  e.preventDefault(); // Stop page from scrolling
  if (!obj) return;
  if (e.deltaY < 0) {
    vp(0, 0, 0.9); // Zoom in
  } else {
    vp(0, 0, 1.1); // Zoom out
  }
});

// Cargar pinza por defecto al iniciar
window.addEventListener('load', () => {
  cv = new CvZbuf(graphics, canvas);
  Promise.all([
    fetch('./pinza_base.txt?v=' + Date.now()).then(r => r.ok ? r.text() : ""),
    fetch('./pinza_movil.txt?v=' + Date.now()).then(r => r.ok ? r.text() : "")
  ]).then(([baseData, movilData]) => {
    
    if (baseData) {
      let tempObj = new Obj3D();
      if (tempObj.read(baseData)) {
        tempObj.baseColorR = 190; tempObj.baseColorG = 190; tempObj.baseColorB = 190;
        baseObj = tempObj;
        const rawEl = document.getElementById('raw-base') as HTMLTextAreaElement;
        if (rawEl) rawEl.value = baseData;
        const nameEl = document.getElementById('file-name-base');
        if (nameEl) nameEl.innerText = 'pinza_base.txt';
      }
    }
    
    if (movilData) {
      let tempObj = new Obj3D();
      if (tempObj.read(movilData)) {
        tempObj.baseColorR = 190; tempObj.baseColorG = 190; tempObj.baseColorB = 190;
        tempObj.pivotX = 0; tempObj.pivotY = 0; tempObj.pivotZ = 0;
        movilObj = tempObj;
        const rawEl = document.getElementById('raw-movil') as HTMLTextAreaElement;
        if (rawEl) rawEl.value = movilData;
        const nameEl = document.getElementById('file-name-movil');
        if (nameEl) nameEl.innerText = 'pinza_movil.txt';
      }
    }
    
    repaintAll();
    
    if (autoRotating) {
      const btn = document.getElementById('btn-auto-rotate');
      if (btn) btn.innerHTML = '■ DETENER';
      rotateLoop();
    }
  }).catch(err => console.error('Error loading default model:', err));
});