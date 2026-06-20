import { Obj3D } from './Obj3D.js';
import { CvZbuf } from './CvZbuf.js';
import { Point3D } from './point3D.js';
import { clockBase, clockHour, clockMinute, clockSecond } from './clockModels.js';

let canvas: HTMLCanvasElement;
let graphics: CanvasRenderingContext2D;

canvas = <HTMLCanvasElement>document.getElementById('circlechart');
graphics = canvas.getContext('2d');

let cv: CvZbuf;
let loadedObjects: Obj3D[] = [];
let backups: (Point3D | null)[][] = [];

let baseRho = 1.0;

function repaintAll() {
  if (!cv) cv = new CvZbuf(graphics, canvas);
  cv = new CvZbuf(graphics, canvas);
  
  for (let i = 0; i < loadedObjects.length; i++) {
    cv.addObj(loadedObjects[i]);
  }
  cv.paint();
}

function vp(dTheta: number, dPhi: number, fRho: number) {
  if (!cv || loadedObjects.length === 0) return;
  for (let obj of loadedObjects) {
    obj.vp(cv, dTheta, dPhi, fRho);
  }
}

let autoRotating = false;
let animationFrameId: number;

function toggleAutoRotate() {
  autoRotating = !autoRotating;
  const btn = document.getElementById('btn-auto-rotate');
  
  if (btn) {
    if (autoRotating) {
      btn.innerHTML = '[ DETENER MATRIZ ]';
      rotateLoop();
    } else {
      btn.innerHTML = '[ ANIMAR MATRIZ ]';
      cancelAnimationFrame(animationFrameId);
    }
  }
}

function updateClock() {
  if (loadedObjects.length < 4) return;
  
  const now = new Date();
  const ms = now.getMilliseconds();
  const sec = now.getSeconds() + ms / 1000;
  const min = now.getMinutes() + sec / 60;
  const hour = now.getHours() % 12 + min / 60;

  // Obj 1: Hour, Obj 2: Min, Obj 3: Sec
  // We negate the angle because Math.cos/sin in localRotZ might rotate counter-clockwise by default
  loadedObjects[1].localRotZ = -hour * (Math.PI * 2 / 12);
  loadedObjects[2].localRotZ = -min * (Math.PI * 2 / 60);
  loadedObjects[3].localRotZ = -sec * (Math.PI * 2 / 60);
  
  // Re-project with updated localRotZ
  vp(0,0,1);
}

function rotateLoop() {
  if (autoRotating) {
    let dTheta = 45 * 0.0005;
    vp(dTheta, 0, 1);
  }
  
  updateClock();
  animationFrameId = requestAnimationFrame(rotateLoop);
}

document.getElementById('btn-auto-rotate')?.addEventListener('click', toggleAutoRotate, false);

let Pix: number, Piy: number;
let Pfx: number, Pfy: number;
let flag: boolean = false;

function handleMouse(evento: any) {
  Pix = evento.offsetX;
  Piy = evento.offsetY;
  flag = true;
}

function makeVizualization(evento: any) {
  if (flag && loadedObjects.length > 0) {
    Pfx = evento.offsetX;
    Pfy = evento.offsetY;
    let difX = Pfx - Pix;
    let difY = Pfy - Piy;
    
    vp(-difX * 0.01, difY * 0.01, 1);
    
    Pix = Pfx;
    Piy = Pfy;
  }
}

function noDraw() {
  flag = false;
}

canvas.addEventListener('mousedown', handleMouse);
canvas.addEventListener('mouseup', noDraw);
canvas.addEventListener('mousemove', makeVizualization);
canvas.addEventListener('mouseleave', noDraw);

function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  if (container) {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    if (cv) cv.paint();
  }
}

window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

let manualRotationInterval: number;

function startManualRotation(dTheta: number, dPhi: number, fRho: number = 1) {
  if (loadedObjects.length === 0) return;
  vp(dTheta, dPhi, fRho);
  clearInterval(manualRotationInterval);
  manualRotationInterval = window.setInterval(() => {
    vp(dTheta, dPhi, fRho);
  }, 30);
}

function stopManualRotation() {
  clearInterval(manualRotationInterval);
}

function setupDPad() {
  const btnUp = document.getElementById('btn-rot-up');
  const btnDown = document.getElementById('btn-rot-down');
  const btnLeft = document.getElementById('btn-rot-left');
  const btnRight = document.getElementById('btn-rot-right');

  const addHoldEvents = (btn: HTMLElement, dTheta: number, dPhi: number, fRho: number = 1) => {
    if (!btn) return;
    btn.addEventListener('mousedown', () => startManualRotation(dTheta, dPhi, fRho));
    btn.addEventListener('mouseup', stopManualRotation);
    btn.addEventListener('mouseleave', stopManualRotation);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); startManualRotation(dTheta, dPhi, fRho); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); stopManualRotation(); });
    btn.addEventListener('touchcancel', (e) => { e.preventDefault(); stopManualRotation(); });
  };

  const rotSpeed = 0.05;
  addHoldEvents(btnUp, 0, rotSpeed);
  addHoldEvents(btnDown, 0, -rotSpeed);
  addHoldEvents(btnLeft, -rotSpeed, 0);
  addHoldEvents(btnRight, rotSpeed, 0);
}
setupDPad();

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (loadedObjects.length === 0) return;
  if (e.deltaY < 0) {
    vp(0, 0, 0.9);
  } else {
    vp(0, 0, 1.1);
  }
});

function leerArchivoGenerico(e: any, isBase: boolean) {
    let archivo = e.target.files[0];
    if (!archivo) return;
    let lector = new FileReader();
    lector.onload = function(e: any) {
      let contenido = e.target.result;
      
      let tempObj = new Obj3D();
      if (tempObj.read(contenido)) {
         if (isBase) {
             loadedObjects = [tempObj];
             
             let sx = tempObj.xMax - tempObj.xMin;
             let sy = tempObj.yMax - tempObj.yMin;
             let sz = tempObj.zMax - tempObj.zMin;
             baseRho = 0.6 * Math.sqrt(sx*sx + sy*sy + sz*sz);
             tempObj.rhoMin = baseRho;
             tempObj.rhoMax = 1000 * tempObj.rhoMin;
             tempObj.rho = 3.5 * tempObj.rhoMin;
             
             const lbl = document.getElementById('file-name-base');
             if (lbl) lbl.innerText = "> " + archivo.name;
         } else {
             // Append
             let i = loadedObjects.length;
             loadedObjects.push(tempObj);
             tempObj.rhoMin = baseRho;
             tempObj.rhoMax = 1000 * tempObj.rhoMin;
             tempObj.rho = 3.5 * tempObj.rhoMin;
             
             const lbl = document.getElementById('file-name-movil');
             if (lbl) lbl.innerText = "> " + archivo.name;
         }
         
         vp(0,0,1);
         repaintAll();
      }
    };
    lector.readAsText(archivo);
}

window.addEventListener('load', () => {
  cv = new CvZbuf(graphics, canvas);
  
  const parts = [clockBase, clockHour, clockMinute, clockSecond];
  const colors = [
    {r: 255, g: 228, b: 243}, // Base: Soft pastel pink
    {r: 255, g: 133, b: 192}, // Hour: Vibrant pink
    {r: 240, g: 98, b: 146},  // Minute: Dark pink
    {r: 154, g: 123, b: 155}  // Second: Muted purple
  ];

  let minX = 9999, maxX = -9999;
  let minY = 9999, maxY = -9999;
  let minZ = 9999, maxZ = -9999;

  parts.forEach((data, i) => {
    if (data) {
      let tempObj = new Obj3D();
      if (tempObj.read(data)) {
        tempObj.baseColorR = colors[i].r;
        tempObj.baseColorG = colors[i].g;
        tempObj.baseColorB = colors[i].b;
        loadedObjects.push(tempObj);

        if (tempObj.xMin < minX) minX = tempObj.xMin;
        if (tempObj.xMax > maxX) maxX = tempObj.xMax;
        if (tempObj.yMin < minY) minY = tempObj.yMin;
        if (tempObj.yMax > maxY) maxY = tempObj.yMax;
        if (tempObj.zMin < minZ) minZ = tempObj.zMin;
        if (tempObj.zMax > maxZ) maxZ = tempObj.zMax;
      }
    }
  });

  let dx = (maxX + minX) / 2.0;
  let dy = (maxY + minY) / 2.0;
  let dz = (maxZ + minZ) / 2.0;
  
  let sx = maxX - minX; let sy = maxY - minY; let sz = maxZ - minZ;
  baseRho = 0.6 * Math.sqrt(sx*sx + sy*sy + sz*sz);

  for (let i=0; i<loadedObjects.length; i++) {
     let obj = loadedObjects[i];
     // Do not shift to global origin so they keep their local coordinate centers (pivots)
     obj.rhoMin = baseRho;
     obj.rhoMax = 1000 * obj.rhoMin;
     obj.rho = 1.0 * obj.rhoMin; 
  }
  
  vp(0,0,1);
  repaintAll();
  
  // Set up loop for clock and possible auto-rotation
  rotateLoop();
  
  // Panel Listeners
  const lightDirX = document.getElementById('light-dir-x') as HTMLInputElement;
  const valLightDirX = document.getElementById('val-light-dir-x');
  lightDirX?.addEventListener('input', (e) => {
    let val = parseFloat((e.target as HTMLInputElement).value);
    if (valLightDirX) valLightDirX.innerText = val.toFixed(1);
    for(let obj of loadedObjects) { obj.sunX = val; }
    repaintAll();
  });
  
  const lightBright = document.getElementById('light-bright') as HTMLInputElement;
  const valLightBright = document.getElementById('val-light-bright');
  lightBright?.addEventListener('input', (e) => {
    let val = parseFloat((e.target as HTMLInputElement).value);
    if (valLightBright) valLightBright.innerText = val.toFixed(1);
    for(let obj of loadedObjects) { obj.lightBright = val * 50; }
    repaintAll();
  });
  
  const lightShadow = document.getElementById('light-shadow') as HTMLInputElement;
  const valLightShadow = document.getElementById('val-light-shadow');
  lightShadow?.addEventListener('input', (e) => {
    let val = parseFloat((e.target as HTMLInputElement).value);
    if (valLightShadow) valLightShadow.innerText = val.toFixed(1);
    for(let obj of loadedObjects) { obj.lightShadow = val; }
    repaintAll();
  });

  const camZoom = document.getElementById('cam-zoom') as HTMLInputElement;
  const valCamZoom = document.getElementById('val-cam-zoom');
  camZoom?.addEventListener('input', (e) => {
    let val = parseFloat((e.target as HTMLInputElement).value);
    if (valCamZoom) valCamZoom.innerText = val.toFixed(1);
    for(let obj of loadedObjects) { obj.rho = val * baseRho; }
    vp(0,0,1);
    repaintAll();
  });

  const fileBase = document.getElementById('file-input-base');
  fileBase?.addEventListener('change', (e) => leerArchivoGenerico(e, true), false);

  const fileMovil = document.getElementById('file-input-movil');
  fileMovil?.addEventListener('change', (e) => leerArchivoGenerico(e, false), false);
});
