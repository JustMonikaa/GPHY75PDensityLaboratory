/* =========================================================================
   OPERATION DEEP SALVAGE — 3-Station Virtual Physics Lab
   Interactive HTML5 Canvas + Pointer Drag-and-Drop Engine
   All solid material densities taken directly from:
   https://en.wikipedia.org/wiki/Density#Various_materials
   ========================================================================= */

const G = 9.81; // m/s^2
const WIKI_URL = "https://en.wikipedia.org/wiki/Density#Various_materials";

// Helper to render KaTeX inside any DOM element safely
function renderMathIn(el) {
  if (!el || typeof renderMathInElement !== "function") return;
  renderMathInElement(el, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false }
    ],
    throwOnError: false
  });
}

// Complete set of 47 dense materials from Wikipedia's "Various materials" table (kg/m^3)
const WIKI_MATERIALS = [
  { name: "Nylon", density: 1150, aliases: ["nylon"] },
  { name: "Plastics", density: 1175, aliases: ["plastic", "plastics", "polypropylene", "pvc", "pete", "pet"] },
  { name: "Sand", density: 1600, aliases: ["sand"] },
  { name: "Magnesium", density: 1740, aliases: ["magnesium", "mg"] },
  { name: "Beryllium", density: 1850, aliases: ["beryllium", "be"] },
  { name: "Silicon", density: 2330, aliases: ["silicon", "si"] },
  { name: "Concrete", density: 2400, aliases: ["concrete"] },
  { name: "Glass", density: 2500, aliases: ["glass"] },
  { name: "Quartzite", density: 2600, aliases: ["quartzite"] },
  { name: "Granite", density: 2700, aliases: ["granite"] },
  { name: "Gneiss", density: 2700, aliases: ["gneiss"] },
  { name: "Aluminium", density: 2700, aliases: ["aluminium", "aluminum", "al"] },
  { name: "Limestone", density: 2750, aliases: ["limestone", "compact limestone"] },
  { name: "Basalt", density: 3000, aliases: ["basalt"] },
  { name: "Diamond", density: 3500, aliases: ["diamond"] },
  { name: "Titanium", density: 4540, aliases: ["titanium", "ti"] },
  { name: "Selenium", density: 4800, aliases: ["selenium", "se"] },
  { name: "Vanadium", density: 6100, aliases: ["vanadium", "v"] },
  { name: "Antimony", density: 6690, aliases: ["antimony", "sb"] },
  { name: "Zinc", density: 7000, aliases: ["zinc", "zn"] },
  { name: "Chromium", density: 7200, aliases: ["chromium", "cr"] },
  { name: "Tin", density: 7310, aliases: ["tin", "sn"] },
  { name: "Manganese", density: 7325, aliases: ["manganese", "mn"] },
  { name: "Mild steel", density: 7850, aliases: ["mild steel", "steel"] },
  { name: "Iron", density: 7870, aliases: ["iron", "fe"] },
  { name: "Niobium", density: 8570, aliases: ["niobium", "nb"] },
  { name: "Brass", density: 8600, aliases: ["brass"] },
  { name: "Cadmium", density: 8650, aliases: ["cadmium", "cd"] },
  { name: "Cobalt", density: 8900, aliases: ["cobalt", "co"] },
  { name: "Nickel", density: 8900, aliases: ["nickel", "ni"] },
  { name: "Copper", density: 8940, aliases: ["copper", "cu"] },
  { name: "Bismuth", density: 9750, aliases: ["bismuth", "bi"] },
  { name: "Molybdenum", density: 10220, aliases: ["molybdenum", "mo"] },
  { name: "Silver", density: 10500, aliases: ["silver", "ag"] },
  { name: "Lead", density: 11340, aliases: ["lead", "pb"] },
  { name: "Thorium", density: 11700, aliases: ["thorium", "th"] },
  { name: "Rhodium", density: 12410, aliases: ["rhodium", "rh"] },
  { name: "Mercury", density: 13546, aliases: ["mercury", "hg", "sealed mercury"] },
  { name: "Tantalum", density: 16600, aliases: ["tantalum", "ta"] },
  { name: "Uranium", density: 19100, aliases: ["uranium", "u"] },
  { name: "Tungsten", density: 19300, aliases: ["tungsten", "w"] },
  { name: "Gold", density: 19320, aliases: ["gold", "au"] },
  { name: "Plutonium", density: 19840, aliases: ["plutonium", "pu"] },
  { name: "Rhenium", density: 21020, aliases: ["rhenium", "re"] },
  { name: "Platinum", density: 21450, aliases: ["platinum", "pt"] },
  { name: "Iridium", density: 22420, aliases: ["iridium", "ir"] },
  { name: "Osmium", density: 22570, aliases: ["osmium", "os"] }
];

const SITE_FLUIDS = [
  { label: "Freshwater Basin", density: 1000, tint: "rgba(38, 166, 232, 0.36)" },
  { label: "Coastal Seawater", density: 1030, tint: "rgba(20, 148, 198, 0.42)" },
  { label: "Hypersaline Lagoon", density: 1120, tint: "rgba(26, 158, 168, 0.46)" },
  { label: "Deep Brine Pool", density: 1210, tint: "rgba(38, 146, 140, 0.50)" },
  { label: "Industrial Glycerol Tank", density: 1261, tint: "rgba(116, 156, 198, 0.48)" }
];

// Deterministic seeded PRNG (Mulberry32) so multiple devices share one mission
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seedInt) {
  let a = seedInt;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* =========================================================================
   GLOBAL MISSION STATE
   ========================================================================= */
let activeStation = 1;
let mission = null;

const crewProgress = {
  s1Done: false,
  s1Rho: null,
  s2HoverDone: false,
  s2MaterialDone: false,
  s2Mass: null,
  s2MaterialName: null,
  s3Done: false
};

function generateMission(seedText) {
  const cleanSeed = (seedText || "ALPHA-01").trim().toUpperCase();
  const seedGen = hashSeed(cleanSeed);
  const rand = mulberry32(seedGen());

  const fluid = SITE_FLUIDS[Math.floor(rand() * SITE_FLUIDS.length)];
  const eligible = WIKI_MATERIALS.filter((m) => m.density > fluid.density + 110);
  const material = eligible[Math.floor(rand() * eligible.length)];

  const targetMass = 4200 + rand() * 5300;
  const rawVol = targetMass / material.density;
  const artifactVol = Math.max(0.18, Math.min(4.5, Math.round(rawVol * 1000) / 1000));
  const artifactMass = material.density * artifactVol;
  const artifactApparentW = (artifactMass - fluid.density * artifactVol) * G;
  const idealBagVol = artifactApparentW / (fluid.density * G);

  const lengths = [6.0, 6.5, 7.0];
  const widths = [3.0, 3.5, 4.0];
  const bargeL = lengths[Math.floor(rand() * lengths.length)];
  const bargeW = widths[Math.floor(rand() * widths.length)];
  const bargeArea = bargeL * bargeW;
  const bargeHullHeight = 2.2;
  const bargeDSafe = 1.5;
  const bargeDMin = 1.32;

  const cargoDraftDelta = artifactMass / (fluid.density * bargeArea);
  const targetUnpumped = 1.68 + rand() * 0.24;
  const targetEmptyD0 = Math.max(0.85, Math.min(1.42, targetUnpumped - cargoDraftDelta));
  const bargeMb = Math.round((fluid.density * bargeArea * targetEmptyD0) / 10) * 10;

  const actualEmptyD0 = bargeMb / (fluid.density * bargeArea);
  const unpumpedLoadedD = (bargeMb + artifactMass) / (fluid.density * bargeArea);
  const idealPumpVol = bargeArea * (unpumpedLoadedD - bargeDSafe);
  const maxBallastVol = Math.ceil((idealPumpVol + bargeArea * 0.34) * 10) / 10;

  mission = {
    seed: cleanSeed,
    fluid,
    material,
    artifactVol,
    artifactMass,
    artifactApparentW,
    idealBagVol,
    barge: {
      L: bargeL,
      W: bargeW,
      area: bargeArea,
      hullHeight: bargeHullHeight,
      dSafe: bargeDSafe,
      dMin: bargeDMin,
      mb: bargeMb,
      d0: actualEmptyD0,
      unpumpedLoadedD,
      idealPumpVol,
      maxBallastVol
    }
  };

  crewProgress.s1Done = false;
  crewProgress.s1Rho = null;
  crewProgress.s2HoverDone = false;
  crewProgress.s2MaterialDone = false;
  crewProgress.s2Mass = null;
  crewProgress.s2MaterialName = null;
  crewProgress.s3Done = false;

  resetStation1();
  resetStation2();
  resetStation3();
  clearAllInputs();
  updateCommsUI();
  updateStation3SpecsUI();
  document.getElementById("mission-complete-banner").classList.add("hidden");
}

function clearAllInputs() {
  [
    "s1-input-m1",
    "s1-input-m2",
    "s2-input-rho-rx",
    "s2-input-mass",
    "s2-input-density",
    "s2-input-material",
    "s3-input-rho-rx",
    "s3-input-mass-rx",
    "s3-input-dloaded",
    "s3-input-vpump"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  ["s1-feedback", "s2-feedback", "s3-feedback"].forEach((id) => {
    const box = document.getElementById(id);
    box.className = "feedback-box";
    box.textContent = "";
  });
}

function setFeedback(id, type, message) {
  const box = document.getElementById(id);
  box.className = `feedback-box show ${type}`;
  box.textContent = message;
  renderMathIn(box);
}

function updateCommsUI() {
  const rhoEl = document.getElementById("comms-rho");
  const massEl = document.getElementById("comms-mass");
  const matEl = document.getElementById("comms-mat");
  const statusEl = document.getElementById("comms-status");

  if (crewProgress.s1Done && crewProgress.s1Rho !== null) {
    rhoEl.textContent = `$${crewProgress.s1Rho.toFixed(1)}\\text{ kg/m}^3$`;
    rhoEl.className = "comms-value ok";
    renderMathIn(rhoEl);
  } else {
    rhoEl.textContent = "Awaiting Data";
    rhoEl.className = "comms-value pending";
  }

  if (crewProgress.s2MaterialDone && crewProgress.s2Mass !== null) {
    massEl.textContent = `$${crewProgress.s2Mass.toFixed(1)}\\text{ kg}$`;
    massEl.className = "comms-value ok";
    renderMathIn(massEl);
    matEl.textContent = crewProgress.s2MaterialName;
    matEl.className = "comms-value ok";
  } else {
    massEl.textContent = "Awaiting Salvage";
    massEl.className = "comms-value pending";
    matEl.textContent = "Unidentified";
    matEl.className = "comms-value pending";
  }

  if (crewProgress.s3Done && crewProgress.s2HoverDone && crewProgress.s2MaterialDone && crewProgress.s1Done) {
    statusEl.textContent = "ALL STATIONS CLEARED";
    statusEl.className = "comms-value ok";
    showMissionCompleteBanner();
  } else if (crewProgress.s3Done) {
    statusEl.textContent = "Barge Secured (Verify S1/S2)";
    statusEl.className = "comms-value status-active";
  } else {
    statusEl.textContent = "In Progress";
    statusEl.className = "comms-value status-active";
  }
}

function showMissionCompleteBanner() {
  const banner = document.getElementById("mission-complete-banner");
  const text = document.getElementById("mission-summary-text");
  const rhoErr = Math.abs((crewProgress.s1Rho - mission.fluid.density) / mission.fluid.density) * 100;
  const massErr = Math.abs((crewProgress.s2Mass - mission.artifactMass) / mission.artifactMass) * 100;
  text.textContent =
    `Seed ${mission.seed}: Site fluid density was $\\rho_f = ${mission.fluid.density}\\text{ kg/m}^3$ (Station 1 error: $${rhoErr.toFixed(2)}\\%$). ` +
    `Recovered artifact was ${mission.material.name} ($\\rho_o = ${mission.material.density}\\text{ kg/m}^3$, true mass $m_o = ${mission.artifactMass.toFixed(1)}\\text{ kg}$; Station 2 error: $${massErr.toFixed(2)}\\%$). ` +
    `Station 3 trimmed ballast and secured the cargo safely on deck!`;
  renderMathIn(text);
  banner.classList.remove("hidden");
}

/* =========================================================================
   CANVAS UTILITIES (Larger Work Area: 920 x 560)
   ========================================================================= */
const CW = 920;
const CH = 560;

function initHiDPICanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = CW * dpr;
  canvas.height = CH * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function getPointerPos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * CW,
    y: ((e.clientY - rect.top) / rect.height) * CH
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/* =========================================================================
   STATION 1 — FLUID ANALYSIS LAB (Hydrometer + Reference Block)
   Recalibrated so cylinder & stacked weights always sit cleanly below titles
   ========================================================================= */
const s1Canvas = document.getElementById("canvas-s1");
const s1Ctx = initHiDPICanvas(s1Canvas);

const S1_CONST = {
  benchY: 524,
  hydroBaseMass: 0.5, // kg
  hydroArea: 0.005, // m^2
  hydroHeightM: 0.4, // m (168 px at 420 px/m -> never clips top or overlaps title)
  refVol: 0.0012, // m^3
  refDensity: 8600,
  refMass: 0.0012 * 8600,
  pxPerMeter: 420,
  leftTank: { x: 195, y: 225, w: 215, h: 299, waterTopY: 285 },
  rightTank: { x: 600, y: 315, w: 210, h: 209, baseWaterY: 365 },
  rodLenBelowWinch: 110,
  winchMinY: 140,
  winchMaxY: 292
};

let s1State = null;

function resetStation1() {
  s1State = {
    weights: [
      { id: "w1", mass: 0.2, label: "0.20 kg", trayX: 40, trayY: 254, x: 40, y: 254, w: 78, h: 28, onPan: false },
      { id: "w2", mass: 0.3, label: "0.30 kg", trayX: 37, trayY: 302, x: 37, y: 302, w: 84, h: 30, onPan: false },
      { id: "w3", mass: 0.4, label: "0.40 kg", trayX: 34, trayY: 354, x: 34, y: 354, w: 90, h: 32, onPan: false },
      { id: "w4", mass: 0.5, label: "0.50 kg", trayX: 31, trayY: 410, x: 31, y: 410, w: 96, h: 34, onPan: false }
    ],
    hydroSubM: 0.1,
    hydroVel: 0,
    sightlineY: S1_CONST.leftTank.waterTopY,
    blockHooked: false,
    blockX: 512,
    blockY: 468,
    blockHomeX: 512,
    blockHomeY: 468,
    winchY: S1_CONST.winchMinY,
    dragging: null,
    dragOffX: 0,
    dragOffY: 0,
    time: 0
  };
  if (mission) {
    s1State.hydroSubM = S1_CONST.hydroBaseMass / (mission.fluid.density * S1_CONST.hydroArea);
  }
}

function getS1HydrometerTotalMass() {
  return s1State.weights.reduce((acc, w) => acc + (w.onPan ? w.mass : 0), S1_CONST.hydroBaseMass);
}

function getS1PanRect() {
  const tank = S1_CONST.leftTank;
  const cx = tank.x + tank.w / 2;
  const hydroBottomY = tank.waterTopY + s1State.hydroSubM * S1_CONST.pxPerMeter;
  const hydroTopY = hydroBottomY - S1_CONST.hydroHeightM * S1_CONST.pxPerMeter;
  return { x: cx - 54, y: hydroTopY - 12, w: 108, h: 12, cx, hydroTopY, hydroBottomY };
}

function getS1BlockSubmergedFraction() {
  if (!s1State.blockHooked) return 0;
  const blockTopY = s1State.winchY + S1_CONST.rodLenBelowWinch;
  const blockH = 54;
  const blockBottomY = blockTopY + blockH;
  const waterY = S1_CONST.rightTank.baseWaterY;
  if (blockBottomY <= waterY) return 0;
  if (blockTopY >= waterY) return 1;
  return clamp((blockBottomY - waterY) / blockH, 0, 1);
}

function getS1SpringScaleReading() {
  if (!s1State.blockHooked) return 0;
  const frac = getS1BlockSubmergedFraction();
  const wAir = S1_CONST.refMass * G;
  const fb = mission.fluid.density * (S1_CONST.refVol * frac) * G;
  return wAir - fb;
}

function updateStation1(dt) {
  if (!s1State || !mission) return;
  s1State.time += dt;

  const totalMass = getS1HydrometerTotalMass();
  const targetSubM = totalMass / (mission.fluid.density * S1_CONST.hydroArea);
  const acc = (targetSubM - s1State.hydroSubM) * 42 - s1State.hydroVel * 7.5;
  s1State.hydroVel += acc * dt;
  s1State.hydroSubM += s1State.hydroVel * dt;

  const pan = getS1PanRect();
  let stackY = pan.y;
  s1State.weights.forEach((w) => {
    if (w.onPan && (!s1State.dragging || s1State.dragging.obj !== w)) {
      w.x = pan.cx - w.w / 2;
      w.y = stackY - w.h;
      stackY -= w.h + 1;
    } else if (!w.onPan && (!s1State.dragging || s1State.dragging.obj !== w)) {
      w.x += (w.trayX - w.x) * Math.min(1, dt * 14);
      w.y += (w.trayY - w.y) * Math.min(1, dt * 14);
    }
  });

  const hookX = S1_CONST.rightTank.x + S1_CONST.rightTank.w / 2;
  if (s1State.blockHooked && (!s1State.dragging || s1State.dragging.type !== "block")) {
    s1State.blockX = hookX - 27;
    s1State.blockY = s1State.winchY + S1_CONST.rodLenBelowWinch;
  } else if (!s1State.blockHooked && (!s1State.dragging || s1State.dragging.type !== "block")) {
    s1State.blockX += (s1State.blockHomeX - s1State.blockX) * Math.min(1, dt * 12);
    s1State.blockY += (s1State.blockHomeY - s1State.blockY) * Math.min(1, dt * 12);
  }

  document.getElementById("s1-hud-mass").textContent = `${totalMass.toFixed(2)} kg`;
  const depthAtSightM = Math.max(0, (pan.hydroBottomY - s1State.sightlineY) / S1_CONST.pxPerMeter);
  document.getElementById("s1-hud-depth").textContent = `${depthAtSightM.toFixed(3)} m (${(depthAtSightM * 100).toFixed(1)} cm)`;
  document.getElementById("s1-hud-scale").textContent = `${getS1SpringScaleReading().toFixed(2)} N`;
}

function drawStation1() {
  const ctx = s1Ctx;
  ctx.clearRect(0, 0, CW, CH);

  const bg = ctx.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0, "#0c192b");
  bg.addColorStop(1, "#091220");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CW, CH);

  // Benchtop
  ctx.fillStyle = "#1d2c42";
  ctx.fillRect(0, S1_CONST.benchY, CW, CH - S1_CONST.benchY);
  ctx.strokeStyle = "#354d70";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, S1_CONST.benchY);
  ctx.lineTo(CW, S1_CONST.benchY);
  ctx.stroke();

  // Section titles cleanly positioned with full clearance
  const lt = S1_CONST.leftTank;
  const rt = S1_CONST.rightTank;
  const leftCenterX = lt.x + lt.w / 2;
  const rightCenterX = rt.x + rt.w / 2;

  ctx.textAlign = "center";
  ctx.fillStyle = "#9db2ce";
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.fillText("METHOD 1: FLOATING HYDROMETER", leftCenterX, 28);
  ctx.fillText("METHOD 2: SUBMERGED REFERENCE BLOCK", rightCenterX, 28);

  // Method 2 Status Text neatly placed directly beneath "METHOD 2" heading
  const subFrac = getS1BlockSubmergedFraction();
  if (!s1State.blockHooked) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.fillText("STATUS: DRAG REFERENCE BLOCK ONTO HOOK", rightCenterX, 50);
  } else {
    ctx.fillStyle = subFrac === 1 ? "#4ade80" : subFrac === 0 ? "#38bdf8" : "#f59e0b";
    ctx.font = "700 12px system-ui, sans-serif";
    const statusLabel =
      subFrac === 1 ? "STATUS: FULLY SUBMERGED" : subFrac === 0 ? "STATUS: SUSPENDED IN AIR" : "STATUS: PARTIALLY SUBMERGED";
    ctx.fillText(statusLabel, rightCenterX, 50);
  }
  ctx.textAlign = "left";

  // Brass weight shelf on left
  ctx.fillStyle = "#162439";
  drawRoundedRect(ctx, 18, 210, 140, 290, 10);
  ctx.fill();
  ctx.strokeStyle = "#2d4466";
  ctx.stroke();
  ctx.fillStyle = "#8ca5c6";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DRAG WEIGHTS", 88, 234);
  ctx.textAlign = "left";

  // ---- LEFT TANK (HYDROMETER) ----
  ctx.fillStyle = mission.fluid.tint;
  ctx.fillRect(lt.x + 4, lt.waterTopY, lt.w - 8, lt.y + lt.h - lt.waterTopY - 4);

  // Animated water surface
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = lt.x + 4; x <= lt.x + lt.w - 4; x += 6) {
    const wave = Math.sin(x * 0.075 + s1State.time * 3) * 1.4;
    if (x === lt.x + 4) ctx.moveTo(x, lt.waterTopY + wave);
    else ctx.lineTo(x, lt.waterTopY + wave);
  }
  ctx.stroke();

  // Hydrometer cylinder
  const pan = getS1PanRect();
  const cylW = 58;
  const cylX = pan.cx - cylW / 2;
  const cylH = pan.hydroBottomY - pan.hydroTopY;

  const bodyGrad = ctx.createLinearGradient(cylX, 0, cylX + cylW, 0);
  bodyGrad.addColorStop(0, "#cbd5e1");
  bodyGrad.addColorStop(0.5, "#f8fafc");
  bodyGrad.addColorStop(1, "#94a3b8");
  ctx.fillStyle = bodyGrad;
  drawRoundedRect(ctx, cylX, pan.hydroTopY, cylW, cylH, 6);
  ctx.fill();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Bottom lead ballast cap
  ctx.fillStyle = "#334155";
  ctx.fillRect(cylX + 2, pan.hydroBottomY - 15, cylW - 4, 13);

  // Ruler ticks (cm from bottom)
  ctx.fillStyle = "#0f172a";
  ctx.strokeStyle = "#0f172a";
  ctx.font = "600 9px monospace";
  for (let cm = 5; cm <= 38; cm += 1) {
    const ty = pan.hydroBottomY - (cm / 100) * S1_CONST.pxPerMeter;
    if (ty < pan.hydroTopY + 6) continue;
    const isMajor = cm % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(cylX + 4, ty);
    ctx.lineTo(cylX + (isMajor ? 18 : 11), ty);
    ctx.lineWidth = isMajor ? 1.5 : 1;
    ctx.stroke();
    if (isMajor) {
      ctx.fillText(`${cm}`, cylX + 22, ty + 3);
    }
  }

  // Top weight pan
  ctx.fillStyle = "#e2e8f0";
  drawRoundedRect(ctx, pan.x, pan.y, pan.w, pan.h, 4);
  ctx.fill();
  ctx.strokeStyle = "#64748b";
  ctx.stroke();

  if (s1State.dragging && s1State.dragging.type === "weight") {
    ctx.save();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    drawRoundedRect(ctx, pan.x - 10, pan.y - 95, pan.w + 20, 102, 8);
    ctx.stroke();
    ctx.restore();
  }

  // Left tank glass outline
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(lt.x, lt.y);
  ctx.lineTo(lt.x, lt.y + lt.h);
  ctx.lineTo(lt.x + lt.w, lt.y + lt.h);
  ctx.lineTo(lt.x + lt.w, lt.y);
  ctx.stroke();

  // Draggable Red Sightline Caliper
  ctx.save();
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(lt.x - 10, s1State.sightlineY);
  ctx.lineTo(lt.x + lt.w + 18, s1State.sightlineY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#f43f5e";
  drawRoundedRect(ctx, lt.x + lt.w + 8, s1State.sightlineY - 12, 72, 24, 6);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 10px monospace";
  ctx.textAlign = "center";
  const readingCm = Math.max(0, ((pan.hydroBottomY - s1State.sightlineY) / S1_CONST.pxPerMeter) * 100);
  ctx.fillText(`${readingCm.toFixed(1)} cm`, lt.x + lt.w + 44, s1State.sightlineY + 4);
  ctx.textAlign = "left";
  ctx.restore();

  // Brass Calibration Weights
  s1State.weights.forEach((w) => {
    const grad = ctx.createLinearGradient(w.x, w.y, w.x + w.w, w.y);
    grad.addColorStop(0, "#b45309");
    grad.addColorStop(0.5, "#f59e0b");
    grad.addColorStop(1, "#92400e");
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, w.x, w.y, w.w, w.h, 5);
    ctx.fill();
    ctx.strokeStyle = "#fef3c7";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.font = "700 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(w.label, w.x + w.w / 2, w.y + w.h / 2 + 4);
    ctx.textAlign = "left";
  });

  // ---- RIGHT TANK (REFERENCE BLOCK & SPRING SCALE) ----
  const hookX = rightCenterX;
  const waterRise = subFrac * 14;
  const currentRightWaterY = rt.baseWaterY - waterRise;

  // Support Gantry Stand (starts well below Method 2 status text)
  ctx.fillStyle = "#334155";
  ctx.fillRect(rt.x + rt.w + 30, 76, 12, S1_CONST.benchY - 76);
  ctx.fillRect(hookX - 10, 76, rt.x + rt.w + 42 - hookX, 12);

  // Winch vertical rail
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(hookX, 88);
  ctx.lineTo(hookX, s1State.winchY - 34);
  ctx.stroke();

  // Digital Spring Scale body
  const scaleY = s1State.winchY - 34;
  ctx.fillStyle = "#1e293b";
  drawRoundedRect(ctx, hookX - 46, scaleY, 92, 54, 8);
  ctx.fill();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#06111e";
  ctx.fillRect(hookX - 38, scaleY + 8, 76, 23);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "700 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${getS1SpringScaleReading().toFixed(2)} N`, hookX, scaleY + 24);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 9px system-ui, sans-serif";
  ctx.fillText("DRAG UP/DOWN", hookX, scaleY + 44);
  ctx.textAlign = "left";

  // Extended suspension rod & hook below scale so scale stays dry when block is submerged
  const hookTipY = s1State.winchY + S1_CONST.rodLenBelowWinch;
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hookX, scaleY + 54);
  ctx.lineTo(hookX, hookTipY - 6);
  ctx.arc(hookX, hookTipY, 6, -Math.PI / 2, Math.PI, false);
  ctx.stroke();

  if (s1State.dragging && s1State.dragging.type === "block" && !s1State.blockHooked) {
    ctx.save();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(hookX, hookTipY + 4, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Fluid inside right tank
  ctx.fillStyle = mission.fluid.tint;
  ctx.fillRect(rt.x + 4, currentRightWaterY, rt.w - 8, rt.y + rt.h - currentRightWaterY - 4);
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rt.x + 4, currentRightWaterY);
  ctx.lineTo(rt.x + rt.w - 4, currentRightWaterY);
  ctx.stroke();

  // Reference Metal Block
  const bx = s1State.blockX;
  const by = s1State.blockY;
  const bw = 54;
  const bh = 54;

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(bx + bw / 2, by - 4, 6, 0, Math.PI * 2);
  ctx.stroke();

  const blkGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  blkGrad.addColorStop(0, "#d97706");
  blkGrad.addColorStop(1, "#78350f");
  ctx.fillStyle = blkGrad;
  drawRoundedRect(ctx, bx, by, bw, bh, 5);
  ctx.fill();
  ctx.strokeStyle = "#fde68a";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "700 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("REF", bx + bw / 2, by + 24);
  ctx.fillText("1.20 L", bx + bw / 2, by + 39);
  if (!s1State.blockHooked) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.fillText("Drag to hook", bx + bw / 2, by + bh + 18);
  }
  ctx.textAlign = "left";

  // Right tank glass outline
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rt.x, rt.y);
  ctx.lineTo(rt.x, rt.y + rt.h);
  ctx.lineTo(rt.x + rt.w, rt.y + rt.h);
  ctx.lineTo(rt.x + rt.w, rt.y);
  ctx.stroke();
}

// Station 1 Pointer Drag Events
s1Canvas.addEventListener("pointerdown", (e) => {
  const pos = getPointerPos(s1Canvas, e);
  s1Canvas.setPointerCapture(e.pointerId);

  const lt = S1_CONST.leftTank;
  if (pos.x >= lt.x + lt.w && pos.x <= lt.x + lt.w + 88 && Math.abs(pos.y - s1State.sightlineY) <= 18) {
    s1State.dragging = { type: "sightline" };
    return;
  }

  for (let i = s1State.weights.length - 1; i >= 0; i--) {
    const w = s1State.weights[i];
    if (pos.x >= w.x && pos.x <= w.x + w.w && pos.y >= w.y && pos.y <= w.y + w.h) {
      s1State.dragging = { type: "weight", obj: w };
      s1State.dragOffX = pos.x - w.x;
      s1State.dragOffY = pos.y - w.y;
      return;
    }
  }

  if (
    pos.x >= s1State.blockX &&
    pos.x <= s1State.blockX + 54 &&
    pos.y >= s1State.blockY - 12 &&
    pos.y <= s1State.blockY + 54
  ) {
    if (s1State.blockHooked) {
      s1State.dragging = { type: "winch" };
      s1State.dragOffY = pos.y - s1State.winchY;
    } else {
      s1State.dragging = { type: "block" };
      s1State.dragOffX = pos.x - s1State.blockX;
      s1State.dragOffY = pos.y - s1State.blockY;
    }
    return;
  }

  const hookX = S1_CONST.rightTank.x + S1_CONST.rightTank.w / 2;
  if (Math.abs(pos.x - hookX) <= 50 && pos.y >= s1State.winchY - 38 && pos.y <= s1State.winchY + 30) {
    s1State.dragging = { type: "winch" };
    s1State.dragOffY = pos.y - s1State.winchY;
  }
});

s1Canvas.addEventListener("pointermove", (e) => {
  const pos = getPointerPos(s1Canvas, e);
  if (!s1State.dragging) {
    const lt = S1_CONST.leftTank;
    const hookX = S1_CONST.rightTank.x + S1_CONST.rightTank.w / 2;
    const overSight = pos.x >= lt.x + lt.w && pos.x <= lt.x + lt.w + 88 && Math.abs(pos.y - s1State.sightlineY) <= 18;
    const overWeight = s1State.weights.some((w) => pos.x >= w.x && pos.x <= w.x + w.w && pos.y >= w.y && pos.y <= w.y + w.h);
    const overBlock = pos.x >= s1State.blockX && pos.x <= s1State.blockX + 54 && pos.y >= s1State.blockY - 12 && pos.y <= s1State.blockY + 54;
    const overWinch = Math.abs(pos.x - hookX) <= 50 && pos.y >= s1State.winchY - 38 && pos.y <= s1State.winchY + 30;
    s1Canvas.style.cursor = overSight || overWinch ? "ns-resize" : overWeight || overBlock ? "grab" : "default";
    return;
  }

  s1Canvas.style.cursor = "grabbing";
  if (s1State.dragging.type === "sightline") {
    s1State.sightlineY = clamp(pos.y, S1_CONST.leftTank.y + 10, S1_CONST.leftTank.y + S1_CONST.leftTank.h - 10);
  } else if (s1State.dragging.type === "weight") {
    const w = s1State.dragging.obj;
    w.x = clamp(pos.x - s1State.dragOffX, 6, CW - w.w - 6);
    w.y = clamp(pos.y - s1State.dragOffY, 6, CH - w.h - 6);
  } else if (s1State.dragging.type === "block") {
    s1State.blockX = clamp(pos.x - s1State.dragOffX, 6, CW - 60);
    s1State.blockY = clamp(pos.y - s1State.dragOffY, 6, CH - 60);
  } else if (s1State.dragging.type === "winch") {
    s1State.winchY = clamp(pos.y - s1State.dragOffY, S1_CONST.winchMinY, S1_CONST.winchMaxY);
  }
});

function releaseS1Drag() {
  if (!s1State.dragging) return;
  if (s1State.dragging.type === "weight") {
    const w = s1State.dragging.obj;
    const pan = getS1PanRect();
    const wCx = w.x + w.w / 2;
    const wCy = w.y + w.h / 2;
    const insidePanZone =
      wCx >= pan.x - 26 && wCx <= pan.x + pan.w + 26 && wCy >= pan.y - 140 && wCy <= pan.y + 45;
    if (insidePanZone && !w.onPan) {
      w.onPan = true;
      s1State.hydroVel += 0.14;
    } else if (!insidePanZone && w.onPan) {
      w.onPan = false;
      s1State.hydroVel -= 0.1;
    }
  } else if (s1State.dragging.type === "block") {
    const hookX = S1_CONST.rightTank.x + S1_CONST.rightTank.w / 2;
    const hookY = s1State.winchY + S1_CONST.rodLenBelowWinch;
    const dist = Math.hypot(s1State.blockX + 27 - hookX, s1State.blockY - hookY);
    if (dist < 68) {
      s1State.blockHooked = true;
    }
  }
  s1State.dragging = null;
  s1Canvas.style.cursor = "default";
}

s1Canvas.addEventListener("pointerup", releaseS1Drag);
s1Canvas.addEventListener("pointercancel", releaseS1Drag);

/* =========================================================================
   STATION 2 — SEABED SALVAGE & NEUTRAL BUOYANCY
   ========================================================================= */
const s2Canvas = document.getElementById("canvas-s2");
const s2Ctx = initHiDPICanvas(s2Canvas);

const S2_CONST = {
  waterSurfaceY: 74,
  seabedY: 496,
  targetTopY: 215,
  targetBottomY: 335,
  craneX: 465,
  artW: 84,
  artH: 60,
  panelX: 754,
  panelW: 148,
  trackTop: 142,
  trackH: 185,
  pinTrackY: 400,
  pinTrackW: 112
};

let s2State = null;

function resetStation2() {
  s2State = {
    artY: S2_CONST.seabedY - S2_CONST.artH,
    artVel: 0,
    hookY: 165,
    hookAttached: false,
    craneReleased: false,
    rovX: 64,
    rovY: 152,
    rovHomeX: 64,
    rovHomeY: 152,
    scanProgress: 0,
    scanned: false,
    bagRigged: false,
    bagX: 62,
    bagY: 336,
    bagHomeX: 62,
    bagHomeY: 336,
    bagVol: 0,
    releasePinProgress: 0,
    hoverTimer: 0,
    outcome: "idle",
    bubbles: [],
    dragging: null,
    dragOffX: 0,
    dragOffY: 0,
    time: 0
  };

  const maxSlider = mission ? Math.max(10, Math.ceil(mission.idealBagVol * 2.1)) : 15;
  const slider = document.getElementById("s2-bag-slider");
  const num = document.getElementById("s2-bag-number");
  slider.max = maxSlider;
  num.max = maxSlider;
  slider.value = 0;
  num.value = 0;
  document.getElementById("s2-hud-vol").textContent = "Not Scanned";
}

function getS2LoadCellN() {
  if (!s2State.hookAttached || s2State.craneReleased) return 0;
  const liftedOffSeabed = s2State.artY < S2_CONST.seabedY - S2_CONST.artH - 4;
  if (!liftedOffSeabed) return 0;
  const bagLift = mission.fluid.density * s2State.bagVol * G;
  return Math.max(0, mission.artifactApparentW - bagLift);
}

function triggerS2Release() {
  if (!s2State.hookAttached) {
    setFeedback("s2-feedback", "warn", "Attach the crane hook and lift the artifact slightly off the seabed first.");
    return;
  }
  if (!s2State.bagRigged) {
    setFeedback("s2-feedback", "warn", "Drag the orange salvage lift bag onto the artifact's shackle before releasing.");
    return;
  }
  if (s2State.artY >= S2_CONST.seabedY - S2_CONST.artH - 6) {
    setFeedback("s2-feedback", "warn", "Lift the artifact slightly off the seabed mud before releasing the crane.");
    return;
  }
  s2State.craneReleased = true;
  s2State.hookAttached = false;
  s2State.releasePinProgress = 1;
  s2State.hoverTimer = 0;
  s2State.outcome = "hovering";
  setFeedback("s2-feedback", "warn", "Crane released! Observing neutral buoyancy stability...");
}

function updateStation2(dt) {
  if (!s2State || !mission) return;
  s2State.time += dt;

  const artCx = S2_CONST.craneX;
  const artCy = s2State.artY + S2_CONST.artH / 2;
  const rovDist = Math.hypot(s2State.rovX + 36 - artCx, s2State.rovY + 21 - artCy);
  if (rovDist < 100 && !s2State.scanned) {
    s2State.scanProgress = Math.min(1, s2State.scanProgress + dt * 0.9);
    if (s2State.scanProgress >= 1) {
      s2State.scanned = true;
      document.getElementById("s2-hud-vol").textContent = `${mission.artifactVol.toFixed(3)} m³`;
    }
  }

  if (!s2State.dragging || s2State.dragging.type !== "rov") {
    if (s2State.scanned) {
      s2State.rovX += (s2State.rovHomeX - s2State.rovX) * Math.min(1, dt * 6);
      s2State.rovY += (s2State.rovHomeY - s2State.rovY) * Math.min(1, dt * 6);
    }
  }
  if (!s2State.bagRigged && (!s2State.dragging || s2State.dragging.type !== "bag")) {
    s2State.bagX += (s2State.bagHomeX - s2State.bagX) * Math.min(1, dt * 10);
    s2State.bagY += (s2State.bagHomeY - s2State.bagY) * Math.min(1, dt * 10);
  }

  if (s2State.craneReleased) {
    const netBuoyantN = mission.fluid.density * (mission.artifactVol + s2State.bagVol) * G - mission.artifactMass * G;
    const relError = Math.abs(s2State.bagVol - mission.idealBagVol) / mission.idealBagVol;

    let accelPx;
    if (relError <= 0.025) {
      const targetCenterY = (S2_CONST.targetTopY + S2_CONST.targetBottomY) / 2 - S2_CONST.artH / 2;
      accelPx = (targetCenterY - s2State.artY) * 2.2 - s2State.artVel * 2.6;
      s2State.hoverTimer += dt;
      if (s2State.hoverTimer >= 1.8 && s2State.outcome !== "success") {
        s2State.outcome = "success";
        crewProgress.s2HoverDone = true;
        setFeedback(
          "s2-feedback",
          "success",
          `Neutral buoyancy achieved! $V_{\\text{bag}} = ${s2State.bagVol.toFixed(3)}\\text{ m}^3$ is within $${(relError * 100).toFixed(2)}\\%$ of equilibrium. Finish identifying the material and transmit $m_o$ to Station 3.`
        );
        updateCommsUI();
      }
    } else {
      const aMeters = netBuoyantN / mission.artifactMass;
      accelPx = -aMeters * 48 - s2State.artVel * 1.4;
    }

    s2State.artVel += accelPx * dt;
    s2State.artY += s2State.artVel * dt;

    if (s2State.artY >= S2_CONST.seabedY - S2_CONST.artH) {
      s2State.artY = S2_CONST.seabedY - S2_CONST.artH;
      s2State.artVel = 0;
      if (s2State.outcome !== "sunk" && relError > 0.025) {
        s2State.outcome = "sunk";
        setFeedback(
          "s2-feedback",
          "error",
          "Too little air! The artifact sank back into the seabed mud. Reset and recalculate $V_{\\text{bag}} = \\dfrac{W_{\\text{app}}}{\\rho_f g}$."
        );
      }
    }

    if (s2State.artY <= S2_CONST.waterSurfaceY + 8) {
      s2State.artY = S2_CONST.waterSurfaceY + 8;
      s2State.artVel = 0;
      if (s2State.outcome !== "surfaced" && relError > 0.025) {
        s2State.outcome = "surfaced";
        setFeedback(
          "s2-feedback",
          "error",
          "Uncontrolled Ascent Warning! Too much air in the lift bag caused the artifact to rocket to the surface. Reset and recalculate $V_{\\text{bag}}$."
        );
      }
    }
  } else if (s2State.hookAttached) {
    s2State.artY = clamp(s2State.hookY + 12, S2_CONST.targetTopY + 15, S2_CONST.seabedY - S2_CONST.artH);
    s2State.hookY = s2State.artY - 12;
  }

  if (s2State.bagRigged && s2State.bagVol > 0.05 && Math.random() < 0.25) {
    s2State.bubbles.push({
      x: S2_CONST.craneX + (Math.random() - 0.5) * 36,
      y: s2State.artY - 22,
      r: 2 + Math.random() * 3,
      vy: 38 + Math.random() * 32
    });
  }
  s2State.bubbles = s2State.bubbles.filter((b) => {
    b.y -= b.vy * dt;
    return b.y > S2_CONST.waterSurfaceY;
  });

  document.getElementById("s2-hud-load").textContent = `${getS2LoadCellN().toFixed(1)} N`;
  document.getElementById("s2-hud-bag").textContent = `${s2State.bagVol.toFixed(3)} m³`;
}

function drawStation2() {
  const ctx = s2Ctx;
  ctx.clearRect(0, 0, CW, CH);

  ctx.fillStyle = "#102138";
  ctx.fillRect(0, 0, CW, S2_CONST.waterSurfaceY);

  const sea = ctx.createLinearGradient(0, S2_CONST.waterSurfaceY, 0, CH);
  sea.addColorStop(0, "#0b3657");
  sea.addColorStop(0.55, "#072038");
  sea.addColorStop(1, "#04111f");
  ctx.fillStyle = sea;
  ctx.fillRect(0, S2_CONST.waterSurfaceY, CW, CH - S2_CONST.waterSurfaceY);

  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = 0; x <= CW; x += 10) {
    const wy = S2_CONST.waterSurfaceY + Math.sin(x * 0.04 + s2State.time * 2.5) * 2.5;
    if (x === 0) ctx.moveTo(x, wy);
    else ctx.lineTo(x, wy);
  }
  ctx.stroke();

  // Mid-water Target Recovery Zone
  ctx.fillStyle = s2State.outcome === "success" ? "rgba(34, 197, 94, 0.22)" : "rgba(34, 197, 94, 0.11)";
  ctx.fillRect(205, S2_CONST.targetTopY, 520, S2_CONST.targetBottomY - S2_CONST.targetTopY);
  ctx.save();
  ctx.strokeStyle = "rgba(74, 222, 128, 0.65)";
  ctx.setLineDash([7, 5]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(205, S2_CONST.targetTopY, 520, S2_CONST.targetBottomY - S2_CONST.targetTopY);
  ctx.restore();
  ctx.fillStyle = "#86efac";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.fillText("TARGET NEUTRAL BUOYANCY ZONE", 218, S2_CONST.targetTopY + 18);

  // Seabed
  ctx.fillStyle = "#2b251f";
  ctx.fillRect(0, S2_CONST.seabedY, CW, CH - S2_CONST.seabedY);
  ctx.strokeStyle = "#4d4236";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, S2_CONST.seabedY);
  ctx.lineTo(CW, S2_CONST.seabedY);
  ctx.stroke();

  // Left Gear Dock
  ctx.fillStyle = "rgba(15, 28, 46, 0.85)";
  drawRoundedRect(ctx, 18, 94, 162, 376, 10);
  ctx.fill();
  ctx.strokeStyle = "#2b4264";
  ctx.stroke();
  ctx.fillStyle = "#9db2ce";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SALVAGE GEAR BAY", 99, 118);
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.fillText("Drag ROV over relic:", 99, 140);
  ctx.fillText("Drag Lift Bag to relic:", 99, 320);
  ctx.textAlign = "left";

  // Right Compressor & Release Panel
  const pX = S2_CONST.panelX;
  const trackX = pX + S2_CONST.panelW / 2;
  ctx.fillStyle = "rgba(15, 28, 46, 0.9)";
  drawRoundedRect(ctx, pX, 94, S2_CONST.panelW, 376, 10);
  ctx.fill();
  ctx.strokeStyle = "#2b4264";
  ctx.stroke();
  ctx.fillStyle = "#9db2ce";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("AIR COMPRESSOR", trackX, 118);

  ctx.fillStyle = "#091322";
  drawRoundedRect(ctx, trackX - 6, S2_CONST.trackTop, 12, S2_CONST.trackH, 6);
  ctx.fill();
  const maxBag = parseFloat(document.getElementById("s2-bag-slider").max) || 15;
  const bagRatio = clamp(s2State.bagVol / maxBag, 0, 1);
  const leverY = S2_CONST.trackTop + S2_CONST.trackH - bagRatio * S2_CONST.trackH;

  ctx.fillStyle = "#38bdf8";
  drawRoundedRect(ctx, trackX - 6, leverY, 12, S2_CONST.trackTop + S2_CONST.trackH - leverY, 6);
  ctx.fill();

  ctx.fillStyle = s2State.bagRigged ? "#f59e0b" : "#475569";
  drawRoundedRect(ctx, trackX - 24, leverY - 10, 48, 20, 6);
  ctx.fill();
  ctx.fillStyle = "#0b1320";
  ctx.font = "700 9px system-ui, sans-serif";
  ctx.fillText("AIR", trackX, leverY + 3);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 11px monospace";
  ctx.fillText(`${s2State.bagVol.toFixed(2)} m³`, trackX, S2_CONST.trackTop + S2_CONST.trackH + 22);

  // Release Pin Slide Track
  const pinTrackX = pX + (S2_CONST.panelW - S2_CONST.pinTrackW) / 2;
  const pinTrackY = S2_CONST.pinTrackY;
  ctx.fillStyle = "#091322";
  drawRoundedRect(ctx, pinTrackX, pinTrackY, S2_CONST.pinTrackW, 30, 15);
  ctx.fill();
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const pinKnobX = pinTrackX + 15 + s2State.releasePinProgress * (S2_CONST.pinTrackW - 30);
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(pinKnobX, pinTrackY + 15, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 9px system-ui, sans-serif";
  ctx.fillText(s2State.craneReleased ? "RELEASED" : "SLIDE TO RELEASE", trackX, pinTrackY - 9);
  ctx.textAlign = "left";

  // Crane Cable & Load Cell
  const cx = S2_CONST.craneX;
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, s2State.hookY - 26);
  ctx.stroke();

  ctx.fillStyle = "#1e293b";
  drawRoundedRect(ctx, cx - 44, s2State.hookY - 38, 88, 34, 6);
  ctx.fill();
  ctx.strokeStyle = s2State.hookAttached ? "#22c55e" : "#38bdf8";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#38bdf8";
  ctx.font = "700 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${getS2LoadCellN().toFixed(0)} N`, cx, s2State.hookY - 17);
  ctx.textAlign = "left";

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, s2State.hookY - 4);
  ctx.lineTo(cx, s2State.hookY + 6);
  ctx.arc(cx, s2State.hookY + 12, 7, -Math.PI / 2, Math.PI, false);
  ctx.stroke();

  // Rigged Lift Bag
  if (s2State.bagRigged) {
    const scaleR = 17 + Math.pow(s2State.bagVol, 0.45) * 19;
    const bagCenterY = s2State.artY - 28 - scaleR * 0.7;

    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 20, s2State.artY);
    ctx.lineTo(cx - scaleR * 0.55, bagCenterY + scaleR * 0.5);
    ctx.moveTo(cx + 20, s2State.artY);
    ctx.lineTo(cx + scaleR * 0.55, bagCenterY + scaleR * 0.5);
    ctx.stroke();

    const bagGrad = ctx.createRadialGradient(cx - 6, bagCenterY - 8, 4, cx, bagCenterY, scaleR);
    bagGrad.addColorStop(0, "#fb923c");
    bagGrad.addColorStop(1, "#c2410c");
    ctx.fillStyle = bagGrad;
    ctx.beginPath();
    ctx.ellipse(cx, bagCenterY, scaleR, scaleR * 0.82, 0, Math.PI, 0, false);
    ctx.lineTo(cx + scaleR * 0.65, bagCenterY + scaleR * 0.55);
    ctx.lineTo(cx - scaleR * 0.65, bagCenterY + scaleR * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffedd5";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(186, 230, 253, 0.55)";
  s2State.bubbles.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Mystery Artifact
  const ax = cx - S2_CONST.artW / 2;
  const ay = s2State.artY;

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, ay - 6, 8, 0, Math.PI * 2);
  ctx.stroke();

  const artGrad = ctx.createLinearGradient(ax, ay, ax + S2_CONST.artW, ay + S2_CONST.artH);
  artGrad.addColorStop(0, "#64748b");
  artGrad.addColorStop(0.5, "#94a3b8");
  artGrad.addColorStop(1, "#334155");
  ctx.fillStyle = artGrad;
  drawRoundedRect(ctx, ax, ay, S2_CONST.artW, S2_CONST.artH, 8);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "800 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MYSTERY", cx, ay + 26);
  ctx.fillText("ARTIFACT", cx, ay + 42);
  ctx.textAlign = "left";

  if (s2State.dragging && (s2State.dragging.type === "bag" || (s2State.dragging.type === "hook" && !s2State.hookAttached))) {
    ctx.save();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(cx, ay + 14, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (!s2State.bagRigged) {
    ctx.fillStyle = "#ea580c";
    drawRoundedRect(ctx, s2State.bagX, s2State.bagY, 74, 48, 10);
    ctx.fill();
    ctx.strokeStyle = "#fed7aa";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "700 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LIFT BAG", s2State.bagX + 37, s2State.bagY + 28);
    ctx.textAlign = "left";
  }

  // Yellow Sonar ROV
  const rx = s2State.rovX;
  const ry = s2State.rovY;
  const rovDist = Math.hypot(rx + 36 - cx, ry + 21 - (ay + S2_CONST.artH / 2));
  if (rovDist < 108 && !s2State.scanned) {
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
    ctx.lineWidth = 2;
    const pulse = (s2State.time * 60) % 58;
    ctx.beginPath();
    ctx.arc(cx, ay + S2_CONST.artH / 2, 20 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#38bdf8";
    ctx.font = "700 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`SCANNING ${Math.round(s2State.scanProgress * 100)}%`, cx, ay - 22);
    ctx.restore();
  }

  ctx.fillStyle = "#eab308";
  drawRoundedRect(ctx, rx, ry, 72, 42, 10);
  ctx.fill();
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SONAR", rx + 36, ry + 19);
  ctx.fillText(s2State.scanned ? "DONE" : "ROV", rx + 36, ry + 32);
  ctx.textAlign = "left";
}

// Station 2 Pointer Events
s2Canvas.addEventListener("pointerdown", (e) => {
  const pos = getPointerPos(s2Canvas, e);
  s2Canvas.setPointerCapture(e.pointerId);

  if (pos.x >= s2State.rovX && pos.x <= s2State.rovX + 72 && pos.y >= s2State.rovY && pos.y <= s2State.rovY + 42) {
    s2State.dragging = { type: "rov" };
    s2State.dragOffX = pos.x - s2State.rovX;
    s2State.dragOffY = pos.y - s2State.rovY;
    return;
  }

  if (!s2State.bagRigged && pos.x >= s2State.bagX && pos.x <= s2State.bagX + 74 && pos.y >= s2State.bagY && pos.y <= s2State.bagY + 48) {
    s2State.dragging = { type: "bag" };
    s2State.dragOffX = pos.x - s2State.bagX;
    s2State.dragOffY = pos.y - s2State.bagY;
    return;
  }

  const trackX = S2_CONST.panelX + S2_CONST.panelW / 2;
  if (
    s2State.bagRigged &&
    !s2State.craneReleased &&
    Math.abs(pos.x - trackX) <= 32 &&
    pos.y >= S2_CONST.trackTop - 12 &&
    pos.y <= S2_CONST.trackTop + S2_CONST.trackH + 12
  ) {
    s2State.dragging = { type: "airValve" };
    return;
  }

  const pinTrackX = S2_CONST.panelX + (S2_CONST.panelW - S2_CONST.pinTrackW) / 2;
  if (
    !s2State.craneReleased &&
    pos.x >= pinTrackX - 6 &&
    pos.x <= pinTrackX + S2_CONST.pinTrackW + 6 &&
    pos.y >= S2_CONST.pinTrackY - 8 &&
    pos.y <= S2_CONST.pinTrackY + 38
  ) {
    s2State.dragging = { type: "releasePin" };
    return;
  }

  const cx = S2_CONST.craneX;
  if (!s2State.craneReleased && Math.abs(pos.x - cx) <= 48 && pos.y >= s2State.hookY - 42 && pos.y <= s2State.hookY + 32) {
    s2State.dragging = { type: "hook" };
    s2State.dragOffY = pos.y - s2State.hookY;
  }
});

s2Canvas.addEventListener("pointermove", (e) => {
  const pos = getPointerPos(s2Canvas, e);
  const trackX = S2_CONST.panelX + S2_CONST.panelW / 2;
  const pinTrackX = S2_CONST.panelX + (S2_CONST.panelW - S2_CONST.pinTrackW) / 2;

  if (!s2State.dragging) {
    const cx = S2_CONST.craneX;
    const overRov = pos.x >= s2State.rovX && pos.x <= s2State.rovX + 72 && pos.y >= s2State.rovY && pos.y <= s2State.rovY + 42;
    const overBag = !s2State.bagRigged && pos.x >= s2State.bagX && pos.x <= s2State.bagX + 74 && pos.y >= s2State.bagY && pos.y <= s2State.bagY + 48;
    const overHook = !s2State.craneReleased && Math.abs(pos.x - cx) <= 48 && pos.y >= s2State.hookY - 42 && pos.y <= s2State.hookY + 32;
    const overAir = s2State.bagRigged && !s2State.craneReleased && Math.abs(pos.x - trackX) <= 32 && pos.y >= S2_CONST.trackTop - 12 && pos.y <= S2_CONST.trackTop + S2_CONST.trackH + 12;
    const overPin = !s2State.craneReleased && pos.x >= pinTrackX - 6 && pos.x <= pinTrackX + S2_CONST.pinTrackW + 6 && pos.y >= S2_CONST.pinTrackY - 8 && pos.y <= S2_CONST.pinTrackY + 38;
    s2Canvas.style.cursor = overHook || overAir ? "ns-resize" : overRov || overBag || overPin ? "grab" : "default";
    return;
  }

  s2Canvas.style.cursor = "grabbing";
  if (s2State.dragging.type === "rov") {
    s2State.rovX = clamp(pos.x - s2State.dragOffX, 10, CW - 82);
    s2State.rovY = clamp(pos.y - s2State.dragOffY, S2_CONST.waterSurfaceY + 8, S2_CONST.seabedY - 46);
  } else if (s2State.dragging.type === "bag") {
    s2State.bagX = clamp(pos.x - s2State.dragOffX, 10, CW - 84);
    s2State.bagY = clamp(pos.y - s2State.dragOffY, S2_CONST.waterSurfaceY + 8, S2_CONST.seabedY - 52);
  } else if (s2State.dragging.type === "hook") {
    const maxHookY = s2State.artY - 10;
    const minHookY = s2State.hookAttached ? S2_CONST.targetTopY + 8 : 115;
    s2State.hookY = clamp(pos.y - s2State.dragOffY, minHookY, s2State.hookAttached ? S2_CONST.seabedY - S2_CONST.artH - 12 : maxHookY + 12);
    if (!s2State.hookAttached && Math.abs(s2State.hookY - (s2State.artY - 12)) < 18) {
      s2State.hookAttached = true;
    }
  } else if (s2State.dragging.type === "airValve") {
    const ratio = clamp(1 - (pos.y - S2_CONST.trackTop) / S2_CONST.trackH, 0, 1);
    const maxBag = parseFloat(document.getElementById("s2-bag-slider").max) || 15;
    s2State.bagVol = Math.round(ratio * maxBag * 1000) / 1000;
    document.getElementById("s2-bag-slider").value = s2State.bagVol;
    document.getElementById("s2-bag-number").value = s2State.bagVol;
  } else if (s2State.dragging.type === "releasePin") {
    s2State.releasePinProgress = clamp((pos.x - (pinTrackX + 15)) / (S2_CONST.pinTrackW - 30), 0, 1);
    if (s2State.releasePinProgress >= 0.92) {
      s2State.dragging = null;
      triggerS2Release();
    }
  }
});

function releaseS2Drag() {
  if (!s2State.dragging) return;
  if (s2State.dragging.type === "bag") {
    const dist = Math.hypot(s2State.bagX + 37 - S2_CONST.craneX, s2State.bagY + 24 - (s2State.artY + 14));
    if (dist < 90) {
      s2State.bagRigged = true;
    }
  } else if (s2State.dragging.type === "releasePin" && !s2State.craneReleased) {
    s2State.releasePinProgress = 0;
  }
  s2State.dragging = null;
  s2Canvas.style.cursor = "default";
}

s2Canvas.addEventListener("pointerup", releaseS2Drag);
s2Canvas.addEventListener("pointercancel", releaseS2Drag);

/* =========================================================================
   STATION 3 — RECOVERY BARGE & BALLAST CONTROL
   ========================================================================= */
const s3Canvas = document.getElementById("canvas-s3");
const s3Ctx = initHiDPICanvas(s3Canvas);

const S3_CONST = {
  waterlineY: 315,
  pxPerMeter: 96,
  bargeX: 245,
  bargePxW: 415,
  wheelCx: 816,
  wheelCy: 205,
  wheelR: 50
};

let s3State = null;

function resetStation3() {
  const b = mission ? mission.barge : { d0: 1.4, maxBallastVol: 14 };
  s3State = {
    pumpedVol: 0,
    draftM: b.d0,
    draftVel: 0,
    tiltRad: 0,
    cargoLoaded: false,
    cargoX: 74,
    cargoY: 122,
    cargoHomeX: 74,
    cargoHomeY: 122,
    caliperY: S3_CONST.waterlineY,
    wheelAngle: 0,
    lastPointerAngle: 0,
    sprayTimer: 0,
    outcome: "empty",
    dragging: null,
    dragOffX: 0,
    dragOffY: 0,
    time: 0
  };

  const slider = document.getElementById("s3-pump-slider");
  const num = document.getElementById("s3-pump-number");
  slider.max = b.maxBallastVol;
  num.max = b.maxBallastVol;
  slider.value = 0;
  num.value = 0;
}

function updateStation3SpecsUI() {
  if (!mission) return;
  const b = mission.barge;
  document.getElementById("s3-spec-L").textContent = `${b.L.toFixed(1)} m`;
  document.getElementById("s3-spec-W").textContent = `${b.W.toFixed(1)} m (${b.area.toFixed(1)} m²)`;
  document.getElementById("s3-spec-mb").textContent = `${b.mb.toLocaleString()} kg`;
  document.getElementById("s3-spec-dsafe").textContent = `${b.dSafe.toFixed(2)} m`;
  document.getElementById("s3-spec-dmin").textContent = `${b.dMin.toFixed(2)} m`;
  document.getElementById("s3-spec-vmax").textContent = `${b.maxBallastVol.toFixed(1)} m³`;
}

function getS3EquilibriumDraft() {
  const b = mission.barge;
  const pumpedMass = mission.fluid.density * s3State.pumpedVol;
  const cargoMass = s3State.cargoLoaded ? mission.artifactMass : 0;
  const totalMass = Math.max(4000, b.mb - pumpedMass + cargoMass);
  return totalMass / (mission.fluid.density * b.area);
}

function evaluateS3Outcome() {
  const b = mission.barge;
  const eqDraft = getS3EquilibriumDraft();
  if (eqDraft > b.dSafe + 0.005) {
    s3State.outcome = "swamped";
    setFeedback(
      "s3-feedback",
      "error",
      `Barge Swamped! Loaded draft reached $${eqDraft.toFixed(3)}\\text{ m}$, crossing $d_{\\text{safe}} = ${b.dSafe.toFixed(2)}\\text{ m}$. Reset and discharge more ballast ($V_{\\text{pump}}$).`
    );
  } else if (eqDraft < b.dMin - 0.005) {
    s3State.outcome = "topheavy";
    setFeedback(
      "s3-feedback",
      "warn",
      `Stability Warning! Loaded draft ($${eqDraft.toFixed(3)}\\text{ m}$) is above $d_{\\text{min}} = ${b.dMin.toFixed(2)}\\text{ m}$, making the hull top-heavy. Reset and pump closer to your calculated $V_{\\text{pump}}$.`
    );
  } else {
    s3State.outcome = "safe";
    crewProgress.s3Done = true;
    setFeedback(
      "s3-feedback",
      "success",
      `Artifact safely secured! Final loaded draft is $${eqDraft.toFixed(3)}\\text{ m}$ — inside the green safe zone ($${b.dMin.toFixed(2)}\\text{ m}$ to $${b.dSafe.toFixed(2)}\\text{ m}$).`
    );
    updateCommsUI();
  }
}

function updateStation3(dt) {
  if (!s3State || !mission) return;
  s3State.time += dt;
  if (s3State.sprayTimer > 0) s3State.sprayTimer = Math.max(0, s3State.sprayTimer - dt);

  const b = mission.barge;
  let targetDraft = getS3EquilibriumDraft();
  if (s3State.outcome === "swamped") {
    targetDraft = b.hullHeight + 0.35;
    s3State.tiltRad += (0.24 - s3State.tiltRad) * Math.min(1, dt * 1.8);
  } else if (s3State.outcome === "topheavy") {
    s3State.tiltRad = Math.sin(s3State.time * 4.5) * 0.14;
  } else {
    s3State.tiltRad = Math.sin(s3State.time * 1.6) * 0.012;
  }

  const acc = (targetDraft - s3State.draftM) * 24 - s3State.draftVel * 5.2;
  s3State.draftVel += acc * dt;
  s3State.draftM += s3State.draftVel * dt;

  if (!s3State.cargoLoaded && (!s3State.dragging || s3State.dragging.type !== "cargo")) {
    s3State.cargoX += (s3State.cargoHomeX - s3State.cargoX) * Math.min(1, dt * 10);
    s3State.cargoY += (s3State.cargoHomeY - s3State.cargoY) * Math.min(1, dt * 10);
  }

  const hullBottomY = S3_CONST.waterlineY + s3State.draftM * S3_CONST.pxPerMeter;
  const caliperDraftM = Math.max(0, (hullBottomY - s3State.caliperY) / S3_CONST.pxPerMeter);
  document.getElementById("s3-hud-caliper").textContent = `${caliperDraftM.toFixed(3)} m`;
  document.getElementById("s3-hud-pumped").textContent = `${s3State.pumpedVol.toFixed(2)} m³`;

  const statusLabels = {
    empty: `Empty (~${s3State.draftM.toFixed(2)} m)`,
    safe: `SAFE (${getS3EquilibriumDraft().toFixed(2)} m)`,
    swamped: "SWAMPED",
    topheavy: "UNSTABLE"
  };
  document.getElementById("s3-hud-draft").textContent = statusLabels[s3State.outcome];
}

function drawStation3() {
  const ctx = s3Ctx;
  ctx.clearRect(0, 0, CW, CH);
  const b = mission.barge;

  const sky = ctx.createLinearGradient(0, 0, 0, S3_CONST.waterlineY);
  sky.addColorStop(0, "#0d1b2e");
  sky.addColorStop(1, "#183150");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, S3_CONST.waterlineY);

  ctx.fillStyle = "#0a2a47";
  ctx.fillRect(0, S3_CONST.waterlineY, CW, CH - S3_CONST.waterlineY);

  const hullPxH = b.hullHeight * S3_CONST.pxPerMeter;
  const hullBottomY = S3_CONST.waterlineY + s3State.draftM * S3_CONST.pxPerMeter;
  const hullTopY = hullBottomY - hullPxH;
  const bx = S3_CONST.bargeX;
  const bw = S3_CONST.bargePxW;
  const bcx = bx + bw / 2;
  const bcy = hullTopY + hullPxH / 2;

  if (!s3State.cargoLoaded) {
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(20, 46);
    ctx.lineTo(140, 46);
    ctx.stroke();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s3State.cargoX + 40, 46);
    ctx.lineTo(s3State.cargoX + 40, s3State.cargoY);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(bcx, bcy);
  ctx.rotate(s3State.tiltRad);
  ctx.translate(-bcx, -bcy);

  ctx.fillStyle = "#334155";
  drawRoundedRect(ctx, bx, hullTopY, bw, hullPxH, 6);
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#475569";
  ctx.fillRect(bx - 6, hullTopY - 8, bw + 12, 10);

  // Ballast tank cutaway
  const tankX = bx + 58;
  const tankW = bw - 116;
  const tankH = hullPxH - 38;
  const tankY = hullTopY + 24;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(tankX, tankY, tankW, tankH);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(tankX, tankY, tankW, tankH);

  const remainFrac = clamp(1 - s3State.pumpedVol / b.maxBallastVol, 0, 1);
  const waterPxH = tankH * remainFrac;
  ctx.fillStyle = "rgba(56, 189, 248, 0.52)";
  ctx.fillRect(tankX + 2, tankY + tankH - waterPxH, tankW - 4, waterPxH);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `BALLAST TANK (${Math.max(0, b.maxBallastVol - s3State.pumpedVol).toFixed(1)} / ${b.maxBallastVol.toFixed(1)} m³)`,
    bcx,
    tankY + 18
  );
  ctx.textAlign = "left";

  // Green Safe Draft Band + Red & Yellow Lines
  const safeRedY = hullBottomY - b.dSafe * S3_CONST.pxPerMeter;
  const minYelY = hullBottomY - b.dMin * S3_CONST.pxPerMeter;
  ctx.fillStyle = "rgba(34, 197, 94, 0.45)";
  ctx.fillRect(bx + 2, safeRedY, 48, minYelY - safeRedY);

  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx - 4, safeRedY);
  ctx.lineTo(bx + 54, safeRedY);
  ctx.moveTo(bx + bw - 54, safeRedY);
  ctx.lineTo(bx + bw + 4, safeRedY);
  ctx.stroke();

  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx, minYelY);
  ctx.lineTo(bx + 50, minYelY);
  ctx.stroke();

  // Draft ruler on hull
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#e2e8f0";
  ctx.font = "600 9px monospace";
  for (let dm = 2; dm <= 20; dm += 1) {
    const m = dm / 10;
    const my = hullBottomY - m * S3_CONST.pxPerMeter;
    if (my < hullTopY + 4) continue;
    const isMajor = dm % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(bx + 2, my);
    ctx.lineTo(bx + (isMajor ? 16 : 9), my);
    ctx.lineWidth = isMajor ? 1.5 : 1;
    ctx.stroke();
    if (isMajor) {
      ctx.fillText(`${m.toFixed(1)}m`, bx + 19, my + 3);
    }
  }

  // Deck Landing Pad
  const padX = bcx - 56;
  const padY = hullTopY - 68;
  if (!s3State.cargoLoaded) {
    ctx.save();
    ctx.strokeStyle = s3State.dragging && s3State.dragging.type === "cargo" ? "#4ade80" : "#38bdf8";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    drawRoundedRect(ctx, padX, padY, 112, 60, 8);
    ctx.stroke();
    ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#bae6fd";
    ctx.font = "700 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DROP ARTIFACT", bcx, padY + 27);
    ctx.fillText("HERE ON DECK", bcx, padY + 42);
    ctx.textAlign = "left";
  } else {
    const ax = bcx - 40;
    const ay = hullTopY - 66;
    ctx.fillStyle = "#94a3b8";
    drawRoundedRect(ctx, ax, ay, 80, 58, 7);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SECURED", bcx, ay + 26);
    ctx.fillText("ARTIFACT", bcx, ay + 41);
    ctx.textAlign = "left";
  }

  if (s3State.sprayTimer > 0) {
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx + bw, hullTopY + 40);
    ctx.quadraticCurveTo(bx + bw + 34, hullTopY + 44, bx + bw + 56, S3_CONST.waterlineY);
    ctx.stroke();
  }

  ctx.restore();

  // Translucent Ocean Surface
  ctx.fillStyle = mission.fluid.tint;
  ctx.fillRect(0, S3_CONST.waterlineY, CW, CH - S3_CONST.waterlineY);

  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = 0; x <= CW; x += 10) {
    const wy = S3_CONST.waterlineY + Math.sin(x * 0.045 + s3State.time * 3) * 2.5;
    if (x === 0) ctx.moveTo(x, wy);
    else ctx.lineTo(x, wy);
  }
  ctx.stroke();

  if (!s3State.cargoLoaded) {
    const ax = s3State.cargoX;
    const ay = s3State.cargoY;
    ctx.fillStyle = "#94a3b8";
    drawRoundedRect(ctx, ax, ay, 80, 58, 7);
    ctx.fill();
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DRAG TO", ax + 40, ay + 25);
    ctx.fillText("DECK", ax + 40, ay + 40);
    ctx.textAlign = "left";
  }

  // Draggable Red Waterline Caliper
  ctx.save();
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(bx - 12, s3State.caliperY);
  ctx.lineTo(bx + 86, s3State.caliperY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#f43f5e";
  drawRoundedRect(ctx, bx - 88, s3State.caliperY - 12, 76, 24, 6);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 10px monospace";
  ctx.textAlign = "center";
  const calDraft = Math.max(0, (hullBottomY - s3State.caliperY) / S3_CONST.pxPerMeter);
  ctx.fillText(`${calDraft.toFixed(2)} m`, bx - 50, s3State.caliperY + 4);
  ctx.textAlign = "left";
  ctx.restore();

  // Rotary Ballast Pump Wheel
  const wx = S3_CONST.wheelCx;
  const wy = S3_CONST.wheelCy;
  const wr = S3_CONST.wheelR;

  ctx.fillStyle = "rgba(15, 28, 46, 0.92)";
  drawRoundedRect(ctx, wx - 78, wy - 90, 156, 186, 12);
  ctx.fill();
  ctx.strokeStyle = "#2b4264";
  ctx.stroke();

  ctx.fillStyle = "#9db2ce";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BALLAST PUMP WHEEL", wx, wy - 66);

  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(s3State.wheelAngle);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, wr, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * wr, Math.sin(ang) * wr);
    ctx.stroke();
  }
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(wr, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 11px monospace";
  ctx.fillText(`Pumped: ${s3State.pumpedVol.toFixed(2)} m³`, wx, wy + 72);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 9px system-ui, sans-serif";
  ctx.fillText("Turn CW to pump out", wx, wy + 87);
  ctx.textAlign = "left";
}

// Station 3 Pointer Events
s3Canvas.addEventListener("pointerdown", (e) => {
  const pos = getPointerPos(s3Canvas, e);
  s3Canvas.setPointerCapture(e.pointerId);

  if (
    !s3State.cargoLoaded &&
    pos.x >= s3State.cargoX &&
    pos.x <= s3State.cargoX + 80 &&
    pos.y >= s3State.cargoY &&
    pos.y <= s3State.cargoY + 58
  ) {
    s3State.dragging = { type: "cargo" };
    s3State.dragOffX = pos.x - s3State.cargoX;
    s3State.dragOffY = pos.y - s3State.cargoY;
    return;
  }

  const bx = S3_CONST.bargeX;
  if (pos.x >= bx - 92 && pos.x <= bx - 4 && Math.abs(pos.y - s3State.caliperY) <= 18) {
    s3State.dragging = { type: "caliper" };
    return;
  }

  const distWheel = Math.hypot(pos.x - S3_CONST.wheelCx, pos.y - S3_CONST.wheelCy);
  if (!s3State.cargoLoaded && distWheel <= S3_CONST.wheelR + 18) {
    s3State.dragging = { type: "wheel" };
    s3State.lastPointerAngle = Math.atan2(pos.y - S3_CONST.wheelCy, pos.x - S3_CONST.wheelCx);
  }
});

s3Canvas.addEventListener("pointermove", (e) => {
  const pos = getPointerPos(s3Canvas, e);
  if (!s3State.dragging) {
    const bx = S3_CONST.bargeX;
    const overCargo = !s3State.cargoLoaded && pos.x >= s3State.cargoX && pos.x <= s3State.cargoX + 80 && pos.y >= s3State.cargoY && pos.y <= s3State.cargoY + 58;
    const overCal = pos.x >= bx - 92 && pos.x <= bx - 4 && Math.abs(pos.y - s3State.caliperY) <= 18;
    const overWheel = !s3State.cargoLoaded && Math.hypot(pos.x - S3_CONST.wheelCx, pos.y - S3_CONST.wheelCy) <= S3_CONST.wheelR + 18;
    s3Canvas.style.cursor = overCal ? "ns-resize" : overCargo || overWheel ? "grab" : "default";
    return;
  }

  s3Canvas.style.cursor = "grabbing";
  if (s3State.dragging.type === "cargo") {
    s3State.cargoX = clamp(pos.x - s3State.dragOffX, 10, CW - 90);
    s3State.cargoY = clamp(pos.y - s3State.dragOffY, 10, S3_CONST.waterlineY - 20);
  } else if (s3State.dragging.type === "caliper") {
    s3State.caliperY = clamp(pos.y, 130, CH - 20);
  } else if (s3State.dragging.type === "wheel") {
    const ang = Math.atan2(pos.y - S3_CONST.wheelCy, pos.x - S3_CONST.wheelCx);
    let delta = ang - s3State.lastPointerAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    s3State.lastPointerAngle = ang;
    s3State.wheelAngle += delta;

    const dVol = (delta / (Math.PI * 2)) * 2.5;
    s3State.pumpedVol = clamp(
      Math.round((s3State.pumpedVol + dVol) * 100) / 100,
      0,
      mission.barge.maxBallastVol
    );
    if (dVol > 0.005) s3State.sprayTimer = 0.25;

    document.getElementById("s3-pump-slider").value = s3State.pumpedVol;
    document.getElementById("s3-pump-number").value = s3State.pumpedVol;
  }
});

function releaseS3Drag() {
  if (!s3State.dragging) return;
  if (s3State.dragging.type === "cargo") {
    const b = mission.barge;
    const hullBottomY = S3_CONST.waterlineY + s3State.draftM * S3_CONST.pxPerMeter;
    const hullTopY = hullBottomY - b.hullHeight * S3_CONST.pxPerMeter;
    const bcx = S3_CONST.bargeX + S3_CONST.bargePxW / 2;
    const cargoCx = s3State.cargoX + 40;
    const cargoCy = s3State.cargoY + 29;

    const onDeck =
      Math.abs(cargoCx - bcx) <= 150 && cargoCy >= hullTopY - 135 && cargoCy <= hullTopY + 35;
    if (onDeck) {
      s3State.cargoLoaded = true;
      s3State.draftVel += 0.65;
      evaluateS3Outcome();
    }
  }
  s3State.dragging = null;
  s3Canvas.style.cursor = "default";
}

s3Canvas.addEventListener("pointerup", releaseS3Drag);
s3Canvas.addEventListener("pointercancel", releaseS3Drag);

/* =========================================================================
   FORM VERIFICATION & UI CONTROLS
   ========================================================================= */

document.getElementById("s1-btn-transmit").addEventListener("click", () => {
  const m1 = parseFloat(document.getElementById("s1-input-m1").value);
  const m2 = parseFloat(document.getElementById("s1-input-m2").value);
  if (Number.isNaN(m1) || Number.isNaN(m2) || m1 <= 0 || m2 <= 0) {
    setFeedback("s1-feedback", "warn", "Enter valid positive densities from both Method 1 and Method 2 before transmitting.");
    return;
  }
  const avg = (m1 + m2) / 2;
  const pctDiff = (Math.abs(m1 - m2) / avg) * 100;
  if (pctDiff > 2.5) {
    setFeedback(
      "s1-feedback",
      "error",
      `QC Check Failed: Method 1 ($${m1}$) and Method 2 ($${m2}$) differ by $${pctDiff.toFixed(1)}\\%$. Re-check your measurements until they agree within $2.5\\%$.`
    );
    return;
  }

  crewProgress.s1Done = true;
  crewProgress.s1Rho = avg;
  document.getElementById("s2-input-rho-rx").value = avg.toFixed(1);
  document.getElementById("s3-input-rho-rx").value = avg.toFixed(1);
  setFeedback(
    "s1-feedback",
    "success",
    `QC Passed ($${pctDiff.toFixed(2)}\\%$ agreement)! Transmitted $\\rho_f = ${avg.toFixed(1)}\\text{ kg/m}^3$ to Stations 2 & 3.`
  );
  updateCommsUI();
});

const s2Slider = document.getElementById("s2-bag-slider");
const s2Number = document.getElementById("s2-bag-number");

function syncS2Bag(val) {
  if (!s2State.bagRigged) {
    setFeedback("s2-feedback", "warn", "Drag the orange Lift Bag onto the sunken artifact first before pumping air.");
    s2Slider.value = 0;
    s2Number.value = 0;
    return;
  }
  if (s2State.craneReleased) return;
  const v = clamp(parseFloat(val) || 0, 0, parseFloat(s2Slider.max));
  s2State.bagVol = v;
  s2Slider.value = v;
  s2Number.value = v;
}
s2Slider.addEventListener("input", (e) => syncS2Bag(e.target.value));
s2Number.addEventListener("input", (e) => syncS2Bag(e.target.value));
document.getElementById("s2-btn-release").addEventListener("click", triggerS2Release);

document.getElementById("s2-btn-verify").addEventListener("click", () => {
  const massIn = parseFloat(document.getElementById("s2-input-mass").value);
  const rhoIn = parseFloat(document.getElementById("s2-input-density").value);
  const rawName = document.getElementById("s2-input-material").value.trim().toLowerCase();

  if (Number.isNaN(massIn) || Number.isNaN(rhoIn) || !rawName) {
    setFeedback("s2-feedback", "warn", "Fill in $m_o$, $\\rho_o$, and the material name from the Wikipedia popup.");
    return;
  }

  const matchedEntry = WIKI_MATERIALS.find(
    (m) => m.name.toLowerCase() === rawName || m.aliases.includes(rawName)
  );
  if (!matchedEntry) {
    setFeedback(
      "s2-feedback",
      "warn",
      `"${rawName}" wasn't found in the Wikipedia 'Various materials' table. Click 'Look Up' to check the exact name.`
    );
    return;
  }

  const densityErr = Math.abs(matchedEntry.density - mission.material.density) / mission.material.density;
  const massErr = Math.abs(massIn - mission.artifactMass) / mission.artifactMass;

  if (densityErr > 0.03) {
    setFeedback(
      "s2-feedback",
      "error",
      `${matchedEntry.name} has a reference density of $${matchedEntry.density.toLocaleString()}\\text{ kg/m}^3$, which does not match the artifact. Re-check $\\rho_f$ and $\\rho_o$.`
    );
    return;
  }

  if (massErr > 0.035) {
    setFeedback(
      "s2-feedback",
      "warn",
      `Material matches, but your calculated mass ($${massIn.toFixed(1)}\\text{ kg}$) is off by more than $3.5\\%$. Re-check $m_o = \\dfrac{W_{\\text{app}}}{g} + \\rho_f V_o$.`
    );
    return;
  }

  const tied = WIKI_MATERIALS.filter((m) => m.density === mission.material.density).map((m) => m.name);
  const tieNote = tied.length > 1 ? ` (Note: ${tied.join(", ")} share $${mission.material.density.toLocaleString()}\\text{ kg/m}^3$.)` : "";

  crewProgress.s2MaterialDone = true;
  crewProgress.s2Mass = massIn;
  crewProgress.s2MaterialName = matchedEntry.name;
  document.getElementById("s3-input-mass-rx").value = massIn.toFixed(1);

  setFeedback(
    "s2-feedback",
    "success",
    `Material Verified: ${matchedEntry.name} ($${matchedEntry.density.toLocaleString()}\\text{ kg/m}^3$)!${tieNote} Sent $m_o = ${massIn.toFixed(1)}\\text{ kg}$ to Station 3.`
  );
  updateCommsUI();
});

const s3Slider = document.getElementById("s3-pump-slider");
const s3Number = document.getElementById("s3-pump-number");

function syncS3Pump(val) {
  if (s3State.cargoLoaded) return;
  const prev = s3State.pumpedVol;
  const v = clamp(parseFloat(val) || 0, 0, mission.barge.maxBallastVol);
  s3State.pumpedVol = v;
  s3State.wheelAngle += ((v - prev) / 2.5) * Math.PI * 2;
  if (v > prev) s3State.sprayTimer = 0.25;
  s3Slider.value = v;
  s3Number.value = v;
}
s3Slider.addEventListener("input", (e) => syncS3Pump(e.target.value));
s3Number.addEventListener("input", (e) => syncS3Pump(e.target.value));

document.getElementById("s1-btn-reset").addEventListener("click", resetStation1);
document.getElementById("s2-btn-reset").addEventListener("click", resetStation2);
document.getElementById("s3-btn-reset").addEventListener("click", resetStation3);

// Station Tab Switching with Subtle Click Glow Pulse
[1, 2, 3].forEach((n) => {
  const btn = document.getElementById(`tab-btn-${n}`);
  btn.addEventListener("click", () => {
    activeStation = n;
    [1, 2, 3].forEach((k) => {
      const tBtn = document.getElementById(`tab-btn-${k}`);
      const isSelected = k === n;
      tBtn.classList.toggle("active", isSelected);
      tBtn.classList.remove("glow-pulse");
      tBtn.setAttribute("aria-selected", String(isSelected));
      document.getElementById(`station-${k}`).classList.toggle("active", isSelected);
    });
    // Force reflow to replay subtle glow animation on every click
    void btn.offsetWidth;
    btn.classList.add("glow-pulse");
  });
});

// Seed Controls
document.getElementById("btn-load-seed").addEventListener("click", () => {
  const val = document.getElementById("seed-input").value.trim() || "ALPHA-01";
  document.getElementById("seed-input").value = val.toUpperCase();
  generateMission(val);
});

document.getElementById("btn-random-seed").addEventListener("click", () => {
  const words = ["ALPHA", "BRAVO", "DELTA", "ORION", "TITAN", "NEREUS", "TRITON", "MARINA"];
  const code = `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(10 + Math.random() * 90)}`;
  document.getElementById("seed-input").value = code;
  generateMission(code);
});

/* =========================================================================
   WIKIPEDIA POPUP DIALOG
   ========================================================================= */
const wikiDialog = document.getElementById("wiki-dialog");
const wikiIframe = document.getElementById("wiki-iframe");
let wikiLoaded = false;

function openWikiPopup() {
  if (!wikiLoaded) {
    wikiIframe.src = WIKI_URL;
    wikiLoaded = true;
  }
  wikiDialog.showModal();
}

document.getElementById("btn-open-wiki").addEventListener("click", openWikiPopup);
document.getElementById("s2-btn-open-wiki-2").addEventListener("click", openWikiPopup);
document.getElementById("btn-close-wiki").addEventListener("click", () => wikiDialog.close());
document.getElementById("btn-wiki-table").addEventListener("click", () => {
  wikiIframe.src = WIKI_URL;
});

wikiDialog.addEventListener("click", (e) => {
  const rect = wikiDialog.getBoundingClientRect();
  const clickedInside =
    e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!clickedInside) wikiDialog.close();
});

/* =========================================================================
   MAIN ANIMATION LOOP & INITIALIZATION
   ========================================================================= */
let lastTs = performance.now();

function animate(now) {
  const dt = Math.min(0.05, (now - lastTs) / 1000);
  lastTs = now;

  if (activeStation === 1) {
    updateStation1(dt);
    drawStation1();
  } else if (activeStation === 2) {
    updateStation2(dt);
    drawStation2();
  } else if (activeStation === 3) {
    updateStation3(dt);
    drawStation3();
  }

  requestAnimationFrame(animate);
}

// Render all static LaTeX across the page and boot default mission
renderMathIn(document.body);
generateMission("ALPHA-01");
requestAnimationFrame(animate);