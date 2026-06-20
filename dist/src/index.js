var _a;
import { Obj3D } from './Obj3D.js';
import { CvZbuf } from './CvZbuf.js';
import { fanBase, fanRotor } from './fanModels.js';
let canvas;
let graphics;
canvas = document.getElementById('circlechart');
graphics = canvas.getContext('2d');
let cv;
let loadedObjects = [];
let backups = [];
let baseRho = 1.0;
function repaintAll() {
    if (!cv)
        cv = new CvZbuf(graphics, canvas);
    cv = new CvZbuf(graphics, canvas);
    for (let i = 0; i < loadedObjects.length; i++) {
        cv.addObj(loadedObjects[i]);
    }
    cv.paint();
}
function vp(dTheta, dPhi, fRho) {
    if (!cv || loadedObjects.length === 0)
        return;
    for (let obj of loadedObjects) {
        obj.vp(cv, dTheta, dPhi, fRho);
    }
}
let autoRotating = false;
let animationFrameId;
function toggleAutoRotate() {
    autoRotating = !autoRotating;
    const btn = document.getElementById('btn-auto-rotate');
    if (btn) {
        if (autoRotating) {
            btn.innerHTML = 'HALT ANIMACION';
            rotateLoop();
        }
        else {
            btn.innerHTML = 'EXE ANIMACION';
            cancelAnimationFrame(animationFrameId);
        }
    }
}
let fanAngle = 0;
function updateFan() {
    if (loadedObjects.length < 2)
        return;
    // Obj 0: Base, Obj 1: Rotor
    fanAngle -= 0.15; // Speed of the fan
    loadedObjects[1].localRotZ = fanAngle;
    // Re-project with updated localRot
    vp(0, 0, 1);
}
function rotateLoop() {
    if (autoRotating) {
        let dTheta = 45 * 0.0005;
        vp(dTheta, 0, 1);
    }
    updateFan();
    animationFrameId = requestAnimationFrame(rotateLoop);
}
(_a = document.getElementById('btn-auto-rotate')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', toggleAutoRotate, false);
let Pix, Piy;
let Pfx, Pfy;
let flag = false;
function handleMouse(evento) {
    Pix = evento.offsetX;
    Piy = evento.offsetY;
    flag = true;
}
function makeVizualization(evento) {
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
        if (cv)
            cv.paint();
    }
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);
let manualRotationInterval;
function startManualRotation(dTheta, dPhi, fRho = 1) {
    if (loadedObjects.length === 0)
        return;
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
    const addHoldEvents = (btn, dTheta, dPhi, fRho = 1) => {
        if (!btn)
            return;
        btn.addEventListener('mousedown', () => startManualRotation(dTheta, dPhi, fRho));
        btn.addEventListener('mouseup', stopManualRotation);
        btn.addEventListener('mouseleave', stopManualRotation);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); startManualRotation(dTheta, dPhi, fRho); });
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
    if (loadedObjects.length === 0)
        return;
    if (e.deltaY < 0) {
        vp(0, 0, 0.9);
    }
    else {
        vp(0, 0, 1.1);
    }
});
function leerArchivoGenerico(e, isBase) {
    let archivo = e.target.files[0];
    if (!archivo)
        return;
    let lector = new FileReader();
    lector.onload = function (e) {
        let contenido = e.target.result;
        let tempObj = new Obj3D();
        if (tempObj.read(contenido)) {
            if (isBase) {
                loadedObjects = [tempObj];
                let sx = tempObj.xMax - tempObj.xMin;
                let sy = tempObj.yMax - tempObj.yMin;
                let sz = tempObj.zMax - tempObj.zMin;
                baseRho = 0.6 * Math.sqrt(sx * sx + sy * sy + sz * sz);
                tempObj.rhoMin = baseRho;
                tempObj.rhoMax = 1000 * tempObj.rhoMin;
                tempObj.rho = 3.5 * tempObj.rhoMin;
                tempObj.baseColorR = 30;
                tempObj.baseColorG = 30;
                tempObj.baseColorB = 30;
                tempObj.targetX = 1.0;
                const lbl = document.getElementById('file-name-base');
                if (lbl)
                    lbl.innerText = "> " + archivo.name;
            }
            else {
                // Append
                let i = loadedObjects.length;
                loadedObjects.push(tempObj);
                tempObj.rhoMin = baseRho;
                tempObj.rhoMax = 1000 * tempObj.rhoMin;
                tempObj.rho = 3.5 * tempObj.rhoMin;
                tempObj.baseColorR = 213;
                tempObj.baseColorG = 0;
                tempObj.baseColorB = 0;
                tempObj.targetX = 1.0;
                const lbl = document.getElementById('file-name-movil');
                if (lbl)
                    lbl.innerText = "> " + archivo.name;
            }
            vp(0, 0, 1);
            repaintAll();
        }
    };
    lector.readAsText(archivo);
}
window.addEventListener('load', () => {
    cv = new CvZbuf(graphics, canvas);
    const parts = [fanBase, fanRotor];
    const colors = [
        { r: 30, g: 30, b: 30 }, // Base: Dark grey
        { r: 213, g: 0, b: 0 }, // Rotor: Aggressive Red
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
                if (tempObj.xMin < minX)
                    minX = tempObj.xMin;
                if (tempObj.xMax > maxX)
                    maxX = tempObj.xMax;
                if (tempObj.yMin < minY)
                    minY = tempObj.yMin;
                if (tempObj.yMax > maxY)
                    maxY = tempObj.yMax;
                if (tempObj.zMin < minZ)
                    minZ = tempObj.zMin;
                if (tempObj.zMax > maxZ)
                    maxZ = tempObj.zMax;
            }
        }
    });
    let sx = maxX - minX;
    let sy = maxY - minY;
    let sz = maxZ - minZ;
    baseRho = 0.6 * Math.sqrt(sx * sx + sy * sy + sz * sz);
    for (let i = 0; i < loadedObjects.length; i++) {
        let obj = loadedObjects[i];
        obj.rhoMin = baseRho;
        obj.rhoMax = 1000 * obj.rhoMin;
        obj.rho = 2.5 * obj.rhoMin;
        obj.sunX = 0.5;
        // Centrar la figura desplazándola hacia arriba (la mitad de su altura en X que es 2.0)
        obj.targetX = 1.0;
        // Forzar la matriz absoluta: Vista frontal perfecta
        obj.theta = 0;
        obj.phi = 0;
    }
    // Le damos un ligerísimo toque isométrico a la vista frontal
    vp(-0.2, 0.2, 1.0);
    repaintAll();
    // Set up loop for fan and possible auto-rotation
    rotateLoop();
    // Panel Listeners
    const lightDirX = document.getElementById('light-dir-x');
    const valLightDirX = document.getElementById('val-light-dir-x');
    lightDirX === null || lightDirX === void 0 ? void 0 : lightDirX.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (valLightDirX)
            valLightDirX.innerText = val.toFixed(1);
        for (let obj of loadedObjects) {
            obj.sunX = val;
        }
        repaintAll();
    });
    const lightBright = document.getElementById('light-bright');
    const valLightBright = document.getElementById('val-light-bright');
    lightBright === null || lightBright === void 0 ? void 0 : lightBright.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (valLightBright)
            valLightBright.innerText = val.toFixed(1);
        for (let obj of loadedObjects) {
            obj.lightBright = val * 50;
        }
        repaintAll();
    });
    const lightShadow = document.getElementById('light-shadow');
    const valLightShadow = document.getElementById('val-light-shadow');
    lightShadow === null || lightShadow === void 0 ? void 0 : lightShadow.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (valLightShadow)
            valLightShadow.innerText = val.toFixed(1);
        for (let obj of loadedObjects) {
            obj.lightShadow = val;
        }
        repaintAll();
    });
    const camZoom = document.getElementById('cam-zoom');
    const valCamZoom = document.getElementById('val-cam-zoom');
    camZoom === null || camZoom === void 0 ? void 0 : camZoom.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (valCamZoom)
            valCamZoom.innerText = val.toFixed(1);
        for (let obj of loadedObjects) {
            obj.rho = val * baseRho;
        }
        vp(0, 0, 1);
        repaintAll();
    });
    const fileBase = document.getElementById('file-input-base');
    fileBase === null || fileBase === void 0 ? void 0 : fileBase.addEventListener('change', (e) => leerArchivoGenerico(e, true), false);
    const fileMovil = document.getElementById('file-input-movil');
    fileMovil === null || fileMovil === void 0 ? void 0 : fileMovil.addEventListener('change', (e) => leerArchivoGenerico(e, false), false);
});
