/* =========================================================================
   OPERATION DEEP SALVAGE — 3-Station Virtual Physics Lab
   Interactive HTML5 Canvas + Pointer Drag-and-Drop Engine
   All solid material densities taken directly from:
   https://en.wikipedia.org/wiki/Density#Various_materials
   ========================================================================= */

const G = 9.81; // m/s^2
const WIKI_URL = "https://en.wikipedia.org/wiki/Density#Various_materials";

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

// Deterministic seeded PRNG (Mulberry32) so all 9 crew members on different devices share one mission
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

  // 1. Pick site fluid
  const fluid = SITE_FLUIDS[Math.floor(rand() * SITE_FLUIDS.length)];

  // 2. Pick a sunken material guaranteed to sink cleanly in this fluid
  const eligible = WIKI_MATERIALS.filter((m) => m.density > fluid.density + 110);
  const material = eligible[Math.floor(rand() * eligible.length)];

  // 3. Size the artifact volume so true mass lands in a realistic 4,200 - 9,500 kg salvage window
  const targetMass = 4200 + rand() * 5300;
  const rawVol = targetMass / material.density;
  const artifactVol = Math.max(0.18, Math.min(4.5, Math.round(rawVol * 1000) / 1000));
  const artifactMass = material.density * artifactVol;
  const artifactApparentW = (artifactMass - fluid.density * artifactVol) * G;
  const idealBagVol = artifactApparentW / (fluid.density * G);

  // 4. Design Station 3 Barge so adding the artifact ALWAYS exceeds dSafe
  const lengths = [6.0, 6.5, 7.0];
  const widths = [3.0, 3.5, 4.0];
  const bargeL = lengths[Math.floor(rand() * lengths.length)];
  const bargeW = widths[Math.floor(rand() * widths.length)];
  const bargeArea = bargeL * bargeW;
  const bargeHullHeight = 2.2;
  const bargeDSafe = 1.5;
  const bargeDMin = 1.32;

  const cargoDraftDelta = artifactMass / (fluid.density * bargeArea);
  // Ensure unpumped loaded draft lands between 1.68 m and 1.94 m (clearly over 1.50 m red line)
  const targetUnpumped = 1.68 + rand() * 0.24;
  const targetEmptyD0 = Math.max(0.85, Math.min(1.42, targetUnpumped - cargoDraftDelta));
  const bargeMb = Math.round((fluid.density * bargeArea * targetEmptyD0) / 10) * 10;

  const actualEmptyD0 = bargeMb / (fluid.density * bargeArea);
  const unpumpedLoadedD = (bargeMb + artifactMass) / (fluid.density * bargeArea);
  const idealPumpVol = bargeArea * (unpumpedLoadedD - bargeDSafe);
  // Make tank hold enough extra water that draining it completely makes barge ride too high (< dMin)
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

  // Reset crew progress
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
}

function updateCommsUI() {
  const rhoEl = document.getElementById("comms-rho");
  const massEl = document.getElementById("comms-mass");
  const matEl = document.getElementById("comms-mat");
  const statusEl = document.getElementById("comms-status");

  if (crewProgress.s1Done && crewProgress.s1Rho !== null) {
    rhoEl.textContent = `${crewProgress.s1Rho.toFixed(1)} kg/m³`;
    rhoEl.className = "comms-value ok";
  } else {
    rhoEl.textContent = "Awaiting Lab Data";
    rhoEl.className = "comms-value pending";
  }

  if (crewProgress.s2MaterialDone && crewProgress.s2Mass !== null) {
    massEl.textContent = `${crewProgress.s2Mass.toFixed(1)} kg`;
    massEl.className = "comms-value ok";
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
    statusEl.textContent = "Barge Secured (Verify S1/S2 logs)";
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
    `Seed ${mission.seed}: Site fluid was ${mission.fluid.density} kg/m³ (Team 1 error: ${rhoErr.toFixed(2)}%). ` +
    `Recovered artifact was ${mission.material.name} (${mission.material.density} kg/m³, true mass ${mission.artifactMass.toFixed(1)} kg; Team 2 mass error: ${massErr.toFixed(2)}%). ` +
    `Team 3 successfully trimmed ballast and secured the cargo safely on the barge deck!`;
  banner.classList.remove("hidden");
}

/* =========================================================================
   CANVAS UTILITIES
   ========================================================================= */
const CW = 820;
const CH = 480;

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
   ========================================================================= */
const s1Canvas = document.getElementById("canvas-s1");
const s1Ctx = initHiDPICanvas(s1Canvas);

const S1_CONST = {
  hydroBaseMass: 0.5, // kg
  hydroArea: 0.005, // m^2
  hydroHeightM: 0.45, // m
  refVol: 0.0012, // m^3
  refDensity: 8600, // Brass reference block
  refMass: 0.0012 * 8600, // 10.32 kg
  pxPerMeter: 560, // vertical scale for hydrometer ruler
  leftTank: { x: 165, y: 120, w: 185, h: 320, waterTopY: 185 },
  rightTank: { x: 540, y: 245, w: 195, h: 195, baseWaterY: 295 }
};

let s1State = null;

function resetStation1() {
  s1State = {
    weights: [
      { id: "w1", mass: 0.2, label: "0.20 kg", trayX: 38, trayY: 215, x: 38, y: 215, w: 72, h: 28, onPan: false },
      { id: "w2", mass: 0.3, label: "0.30 kg", trayX: 38, trayY: 260, x: 38, y: 260, w: 78, h: 30, onPan: false },
      { id: "w3", mass: 0.4, label: "0.40 kg", trayX: 38, trayY: 308, x: 38, y: 308, w: 84, h: 32, onPan: false },
      { id: "w4", mass: 0.5, label: "0.50 kg", trayX: 38, trayY: 358, x: 38, y: 358, w: 90, h: 34, onPan: false }
    ],
    hydroSubM: 0.1,
    hydroVel: 0,
    sightlineY: S1_CONST.leftTank.waterTopY,
    // Method 2: Reference block & winch
    blockHooked: false,
    blockX: 430,
    blockY: 388,
    blockHomeX: 430,
    blockHomeY: 388,
    winchY: 138, // top of scale hook travel (138 = in air, 275 = fully submerged)
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
  return { x: cx - 50, y: hydroTopY - 12, w: 100, h: 12, cx, hydroTopY, hydroBottomY };
}

function getS1BlockSubmergedFraction() {
  if (!s1State.blockHooked) return 0;
  const blockTopY = s1State.winchY + 58;
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

  // Smooth spring-damper buoyancy for hydrometer
  const totalMass = getS1HydrometerTotalMass();
  const targetSubM = totalMass / (mission.fluid.density * S1_CONST.hydroArea);
  const k = 42;
  const damping = 7.5;
  const acc = (targetSubM - s1State.hydroSubM) * k - s1State.hydroVel * damping;
  s1State.hydroVel += acc * dt;
  s1State.hydroSubM += s1State.hydroVel * dt;

  // Stack weights visually on pan
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

  // Update block position if hooked
  const hookX = S1_CONST.rightTank.x + S1_CONST.rightTank.w / 2;
  if (s1State.blockHooked && (!s1State.dragging || s1State.dragging.type !== "block")) {
    s1State.blockX = hookX - 27;
    s1State.blockY = s1State.winchY + 58;
  } else if (!s1State.blockHooked && (!s1State.dragging || s1State.dragging.type !== "block")) {
    s1State.blockX += (s1State.blockHomeX - s1State.blockX) * Math.min(1, dt * 12);
    s1State.blockY += (s1State.blockHomeY - s1State.blockY) * Math.min(1, dt * 12);
  }

  // Update HUD
  document.getElementById("s1-hud-mass").textContent = `${totalMass.toFixed(2)} kg`;
  const depthAtSightM = Math.max(0, (pan.hydroBottomY - s1State.sightlineY) / S1_CONST.pxPerMeter);
  document.getElementById("s1-hud-depth").textContent = `${depthAtSightM.toFixed(3)} m (${(depthAtSightM * 100).toFixed(1)} cm)`;
  document.getElementById("s1-hud-scale").textContent = `${getS1SpringScaleReading().toFixed(2)} N`;
}

function drawStation1() {
  const ctx = s1Ctx;
  ctx.clearRect(0, 0, CW, CH);

  // Lab backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0, "#0c192b");
  bg.addColorStop(1, "#091220");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CW, CH);

  // Benchtop
  ctx.fillStyle = "#1d2c42";
  ctx.fillRect(0, 440, CW, 40);
  ctx.strokeStyle = "#354d70";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 440);
  ctx.lineTo(CW, 440);
  ctx.stroke();

  // Section titles
  ctx.fillStyle = "#9db2ce";
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.fillText("METHOD 1: FLOATING HYDROMETER", 150, 26);
  ctx.fillText("METHOD 2: SUBMERGED REFERENCE BLOCK", 500, 26);

  // Brass weight shelf on left
  ctx.fillStyle = "#162439";
  drawRoundedRect(ctx, 18, 175, 128, 250, 10);
  ctx.fill();
  ctx.strokeStyle = "#2d4466";
  ctx.stroke();
  ctx.fillStyle = "#8ca5c6";
  ctx.font = "600 11px system-ui, sans-serif";
  ctx.fillText("DRAG WEIGHTS", 38, 198);

  // ---- LEFT TANK (HYDROMETER) ----
  const lt = S1_CONST.leftTank;
  // Fluid inside left tank
  ctx.fillStyle = mission.fluid.tint;
  ctx.fillRect(lt.x + 4, lt.waterTopY, lt.w - 8, lt.y + lt.h - lt.waterTopY - 4);

  // Animated fluid meniscus surface
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = lt.x + 4; x <= lt.x + lt.w - 4; x += 6) {
    const wave = Math.sin(x * 0.08 + s1State.time * 3) * 1.4;
    if (x === lt.x + 4) ctx.moveTo(x, lt.waterTopY + wave);
    else ctx.lineTo(x, lt.waterTopY + wave);
  }
  ctx.stroke();

  // Hydrometer cylinder
  const pan = getS1PanRect();
  const cylW = 54;
  const cylX = pan.cx - cylW / 2;
  const cylH = pan.hydroBottomY - pan.hydroTopY;

  // Weighted ballast tip at bottom of hydrometer
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
  ctx.fillRect(cylX + 2, pan.hydroBottomY - 18, cylW - 4, 16);

  // Ruler ticks on hydrometer (cm from bottom)
  ctx.fillStyle = "#0f172a";
  ctx.strokeStyle = "#0f172a";
  ctx.font = "600 9px monospace";
  for (let cm = 5; cm <= 40; cm += 1) {
    const ty = pan.hydroBottomY - (cm / 100) * S1_CONST.pxPerMeter;
    if (ty < pan.hydroTopY + 6) continue;
    const isMajor = cm % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(cylX + 4, ty);
    ctx.lineTo(cylX + (isMajor ? 18 : 11), ty);
    ctx.lineWidth = isMajor ? 1.5 : 1;
    ctx.stroke();
    if (isMajor) {
      ctx.fillText(`${cm}`, cylX + 21, ty + 3);
    }
  }

  // Top weight pan
  ctx.fillStyle = "#e2e8f0";
  drawRoundedRect(ctx, pan.x, pan.y, pan.w, pan.h, 4);
  ctx.fill();
  ctx.strokeStyle = "#64748b";
  ctx.stroke();

  // Drop zone glow when dragging a weight
  if (s1State.dragging && s1State.dragging.type === "weight") {
    ctx.save();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    drawRoundedRect(ctx, pan.x - 10, pan.y - 75, pan.w + 20, 82, 8);
    ctx.stroke();
    ctx.restore();
  }

  // Tank glass outline
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(lt.x, lt.y);
  ctx.lineTo(lt.x, lt.y + lt.h);
  ctx.lineTo(lt.x + lt.w, lt.y + lt.h);
  ctx.lineTo(lt.x + lt.w, lt.y);
  ctx.stroke();

  // Draggable Red Sightline Caliper on Left Tank
  ctx.save();
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(lt.x - 10, s1State.sightlineY);
  ctx.lineTo(lt.x + lt.w + 22, s1State.sightlineY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sightline grab tab
  ctx.fillStyle = "#f43f5e";
  drawRoundedRect(ctx, lt.x + lt.w + 8, s1State.sightlineY - 12, 68, 24, 6);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 10px system-ui, sans-serif";
  const readingCm = Math.max(0, ((pan.hydroBottomY - s1State.sightlineY) / S1_CONST.pxPerMeter) * 100);
  ctx.fillText(`${readingCm.toFixed(1)} cm`, lt.x + lt.w + 17, s1State.sightlineY + 4);
  ctx.restore();

  // Draw Brass Calibration Weights
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
  const rt = S1_CONST.rightTank;
  const hookX = rt.x + rt.w / 2;
  const subFrac = getS1BlockSubmergedFraction();
  const waterRise = subFrac * 14;
  const currentRightWaterY = rt.baseWaterY - waterRise;

  // Support Gantry Stand
  ctx.fillStyle = "#334155";
  ctx.fillRect(rt.x + rt.w + 26, 60, 12, 380);
  ctx.fillRect(hookX - 10, 60, rt.x + rt.w + 42 - hookX, 12);

  // Winch vertical rail
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(hookX, 72);
  ctx.lineTo(hookX, s1State.winchY);
  ctx.stroke();

  // Digital Spring Scale body (draggable vertically!)
  const scaleY = s1State.winchY - 34;
  ctx.fillStyle = "#1e293b";
  drawRoundedRect(ctx, hookX - 42, scaleY, 84, 52, 8);
  ctx.fill();
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Scale screen
  ctx.fillStyle = "#06111e";
  ctx.fillRect(hookX - 34, scaleY + 8, 68, 22);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "700 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${getS1SpringScaleReading().toFixed(2)} N`, hookX, scaleY + 23);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 9px system-ui, sans-serif";
  ctx.fillText("DRAG UP/DOWN", hookX, scaleY + 43);
  ctx.textAlign = "left";

  // Hook line below scale
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hookX, scaleY + 52);
  ctx.lineTo(hookX, s1State.winchY + 52);
  ctx.arc(hookX, s1State.winchY + 57, 6, -Math.PI / 2, Math.PI, false);
  ctx.stroke();

  // Drop zone hint if dragging block
  if (s1State.dragging && s1State.dragging.type === "block" && !s1State.blockHooked) {
    ctx.save();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(hookX, s1State.winchY + 60, 34, 0, Math.PI * 2);
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

  // Eye ring on block
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
  ctx.textAlign = "left";

  if (!s1State.blockHooked) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.fillText("Drag to hook", bx - 5, by + bh + 16);
  } else {
    ctx.fillStyle = subFrac === 1 ? "#4ade80" : subFrac === 0 ? "#38bdf8" : "#f59e0b";
    ctx.font = "700 11px system-ui, sans-serif";
    const statusLabel = subFrac === 1 ? "FULLY SUBMERGED" : subFrac === 0 ? "SUSPENDED IN AIR" : "PARTIALLY SUBMERGED";
    ctx.fillText(statusLabel, rt.x + 36, rt.y - 12);
  }

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

  // 1. Check Sightline grab tab
  const lt = S1_CONST.leftTank;
  if (
    pos.x >= lt.x + lt.w &&
    pos.x <= lt.x + lt.w + 82 &&
    Math.abs(pos.y - s1State.sightlineY) <= 18
  ) {
    s1State.dragging = { type: "sightline" };
    return;
  }

  // 2. Check Weights (topmost first)
  for (let i = s1State.weights.length - 1; i >= 0; i--) {
    const w = s1State.weights[i];
    if (pos.x >= w.x && pos.x <= w.x + w.w && pos.y >= w.y && pos.y <= w.y + w.h) {
      s1State.dragging = { type: "weight", obj: w };
      s1State.dragOffX = pos.x - w.x;
      s1State.dragOffY = pos.y - w.y;
      return;
    }
  }

  // 3. Check Reference Block
  if (
    pos.x >= s1State.blockX &&
    pos.x <= s1State.blockX + 54 &&
    pos.y >= s1State.blockY - 12 &&
    pos.y <= s1State.blockY + 54
  ) {
    if (s1State.blockHooked) {
      // Dragging the hooked block vertically moves the winch!
      s1State.dragging = { type: "winch" };
      s1State.dragOffY = pos.y - s1State.winchY;
    } else {
      s1State.dragging = { type: "block" };
      s1State.dragOffX = pos.x - s1State.blockX;
      s1State.dragOffY = pos.y - s1State.blockY;
    }
    return;
  }

  // 4. Check Spring Scale / Winch body
  const hookX = S1_CONST.rightTank.x + S1_CONST.rightTank.w / 2;
  if (
    Math.abs(pos.x - hookX) <= 46 &&
    pos.y >= s1State.winchY - 38 &&
    pos.y <= s1State.winchY + 56
  ) {
    s1State.dragging = { type: "winch" };
    s1State.dragOffY = pos.y - s1State.winchY;
  }
});

s1Canvas.addEventListener("pointermove", (e) => {
  const pos = getPointerPos(s1Canvas, e);
  if (!s1State.dragging) {
    // Update hover cursor
    const lt = S1_CONST.leftTank;
    const hookX = S1_CONST.rightTank.x + S1_CONST.rightTank.w / 2;
    const overSight = pos.x >= lt.x + lt.w && pos.x <= lt.x + lt.w + 82 && Math.abs(pos.y - s1State.sightlineY) <= 18;
    const overWeight = s1State.weights.some((w) => pos.x >= w.x && pos.x <= w.x + w.w && pos.y >= w.y && pos.y <= w.y + w.h);
    const overBlock = pos.x >= s1State.blockX && pos.x <= s1State.blockX + 54 && pos.y >= s1State.blockY - 12 && pos.y <= s1State.blockY + 54;
    const overWinch = Math.abs(pos.x - hookX) <= 46 && pos.y >= s1State.winchY - 38 && pos.y <= s1State.winchY + 56;
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
    s1State.winchY = clamp(pos.y - s1State.dragOffY, 128, 290);
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
      wCx >= pan.x - 24 && wCx <= pan.x + pan.w + 24 && wCy >= pan.y - 120 && wCy <= pan.y + 45;
    if (insidePanZone && !w.onPan) {
      w.onPan = true;
      s1State.hydroVel += 0.14; // small splash impulse
    } else if (!insidePanZone && w.onPan) {
      w.onPan = false;
      s1State.hydroVel -= 0.1;
    }
  } else if (s1State.dragging.type === "block") {
    const hookX = S1_CONST.rightTank.x + S1_CONST.rightTank.w / 2;
    const hookY = s1State.winchY + 58;
    const dist = Math.hypot(s1State.blockX + 27 - hookX, s1State.blockY - hookY);
    if (dist < 62) {
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
  waterSurfaceY: 66,
  seabedY: 422,
  targetTopY: 185,
  targetBottomY: 285,
  craneX: 430,
  artW: 76,
  artH: 56
};

let s2State = null;

function resetStation2() {
  s2State = {
    artY: S2_CONST.seabedY - S2_CONST.artH,
    artVel: 0,
    hookY: 145,
    hookAttached: false,
    craneReleased: false,
    // Draggable Sonar ROV
    rovX: 62,
    rovY: 135,
    rovHomeX: 62,
    rovHomeY: 135,
    scanProgress: 0,
    scanned: false,
    // Draggable Lift Bag
    bagRigged: false,
    bagX: 68,
    bagY: 295,
    bagHomeX: 68,
    bagHomeY: 295,
    bagVol: 0,
    // Release pin slider on right panel (0..1)
    releasePinProgress: 0,
    hoverTimer: 0,
    outcome: "idle", // idle, hovering, success, sunk, surfaced
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
  // Apparent weight reduced by any lift bag air already inflated
  const bagLift = mission.fluid.density * s2State.bagVol * G;
  return Math.max(0, mission.artifactApparentW - bagLift);
}

function triggerS2Release() {
  if (!s2State.hookAttached) {
    setFeedback("s2-feedback", "warn", "Attach the crane hook and lift the artifact slightly off the seabed first.");
    return;
  }
  if (!s2State.bagRigged) {
    setFeedback("s2-feedback", "warn", "Drag the orange salvage lift bag onto the artifact's shackle before releasing!");
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

  // Sonar ROV scanning while hovering over artifact
  const artCx = S2_CONST.craneX;
  const artCy = s2State.artY + S2_CONST.artH / 2;
  const rovDist = Math.hypot(s2State.rovX + 34 - artCx, s2State.rovY + 20 - artCy);
  if (rovDist < 95 && !s2State.scanned) {
    s2State.scanProgress = Math.min(1, s2State.scanProgress + dt * 0.9);
    if (s2State.scanProgress >= 1) {
      s2State.scanned = true;
      document.getElementById("s2-hud-vol").textContent = `${mission.artifactVol.toFixed(3)} m³`;
    }
  }

  // Return unrigged bag / ROV softly when not dragged
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

  // Physics after crane release
  if (s2State.craneReleased) {
    const netBuoyantN = mission.fluid.density * (mission.artifactVol + s2State.bagVol) * G - mission.artifactMass * G;
    const relError = Math.abs(s2State.bagVol - mission.idealBagVol) / mission.idealBagVol;

    // Gentle drift if within 2.5% neutral buoyancy tolerance; dramatic rise/sink otherwise
    let accelPx;
    if (relError <= 0.025) {
      // Pull gently toward center of recovery zone & hover stably!
      const targetCenterY = (S2_CONST.targetTopY + S2_CONST.targetBottomY) / 2 - S2_CONST.artH / 2;
      accelPx = (targetCenterY - s2State.artY) * 2.2 - s2State.artVel * 2.6;
      s2State.hoverTimer += dt;
      if (s2State.hoverTimer >= 1.8 && s2State.outcome !== "success") {
        s2State.outcome = "success";
        crewProgress.s2HoverDone = true;
        setFeedback(
          "s2-feedback",
          "success",
          `Neutral buoyancy achieved! V_bag = ${s2State.bagVol.toFixed(3)} m³ is within ${(relError * 100).toFixed(2)}% of equilibrium. Now finish identifying the material and send m_o to Station 3.`
        );
        updateCommsUI();
      }
    } else {
      const aMeters = netBuoyantN / mission.artifactMass;
      // Negative Y is upward on canvas
      accelPx = -aMeters * 45 - s2State.artVel * 1.4;
    }

    s2State.artVel += accelPx * dt;
    s2State.artY += s2State.artVel * dt;

    // Check seabed crash
    if (s2State.artY >= S2_CONST.seabedY - S2_CONST.artH) {
      s2State.artY = S2_CONST.seabedY - S2_CONST.artH;
      s2State.artVel = 0;
      if (s2State.outcome !== "sunk" && relError > 0.025) {
        s2State.outcome = "sunk";
        setFeedback(
          "s2-feedback",
          "error",
          "Too little air! The artifact sank back into the seabed mud. Click 'Reset Salvage' and recalculate V_bag = W_app / (rho_f * g)."
        );
      }
    }

    // Check surface breach
    if (s2State.artY <= S2_CONST.waterSurfaceY + 8) {
      s2State.artY = S2_CONST.waterSurfaceY + 8;
      s2State.artVel = 0;
      if (s2State.outcome !== "surfaced" && relError > 0.025) {
        s2State.outcome = "surfaced";
        setFeedback(
          "s2-feedback",
          "error",
          "Uncontrolled Ascent Warning! Too much air in the lift bag caused the artifact to rocket to the surface. Click 'Reset Salvage' and recalculate."
        );
      }
    }
  } else if (s2State.hookAttached) {
    s2State.artY = clamp(s2State.hookY + 12, S2_CONST.targetTopY + 15, S2_CONST.seabedY - S2_CONST.artH);
    s2State.hookY = s2State.artY - 12;
  }

  // Ambient bubbles when inflating or floating
  if (s2State.bagRigged && s2State.bagVol > 0.05 && Math.random() < 0.25) {
    s2State.bubbles.push({
      x: S2_CONST.craneX + (Math.random() - 0.5) * 34,
      y: s2State.artY - 22,
      r: 2 + Math.random() * 3,
      vy: 35 + Math.random() * 30
    });
  }
  s2State.bubbles = s2State.bubbles.filter((b) => {
    b.y -= b.vy * dt;
    return b.y > S2_CONST.waterSurfaceY;
  });

  // Update HUD
  document.getElementById("s2-hud-load").textContent = `${getS2LoadCellN().toFixed(1)} N`;
  document.getElementById("s2-hud-bag").textContent = `${s2State.bagVol.toFixed(3)} m³`;
}

function drawStation2() {
  const ctx = s2Ctx;
  ctx.clearRect(0, 0, CW, CH);

  // Sky above waterline
  ctx.fillStyle = "#102138";
  ctx.fillRect(0, 0, CW, S2_CONST.waterSurfaceY);

  // Deep ocean gradient
  const sea = ctx.createLinearGradient(0, S2_CONST.waterSurfaceY, 0, CH);
  sea.addColorStop(0, "#0b3657");
  sea.addColorStop(0.55, "#072038");
  sea.addColorStop(1, "#04111f");
  ctx.fillStyle = sea;
  ctx.fillRect(0, S2_CONST.waterSurfaceY, CW, CH - S2_CONST.waterSurfaceY);

  // Surface wave line
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = 0; x <= CW; x += 10) {
    const wy = S2_CONST.waterSurfaceY + Math.sin(x * 0.04 + s2State.time * 2.5) * 2.5;
    if (x === 0) ctx.moveTo(x, wy);
    else ctx.lineTo(x, wy);
  }
  ctx.stroke();

  // Mid-water Target Neutral Buoyancy Recovery Zone
  ctx.fillStyle = s2State.outcome === "success" ? "rgba(34, 197, 94, 0.22)" : "rgba(34, 197, 94, 0.11)";
  ctx.fillRect(195, S2_CONST.targetTopY, 450, S2_CONST.targetBottomY - S2_CONST.targetTopY);
  ctx.save();
  ctx.strokeStyle = "rgba(74, 222, 128, 0.65)";
  ctx.setLineDash([7, 5]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(195, S2_CONST.targetTopY, 450, S2_CONST.targetBottomY - S2_CONST.targetTopY);
  ctx.restore();
  ctx.fillStyle = "#86efac";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.fillText("TARGET NEUTRAL BUOYANCY ZONE", 206, S2_CONST.targetTopY + 18);

  // Seabed mud
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
  drawRoundedRect(ctx, 16, 86, 152, 314, 10);
  ctx.fill();
  ctx.strokeStyle = "#2b4264";
  ctx.stroke();
  ctx.fillStyle = "#9db2ce";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.fillText("SALVAGE GEAR BAY", 34, 108);
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.fillText("Drag ROV over relic:", 32, 128);
  ctx.fillText("Drag Lift Bag to relic:", 32, 278);

  // Right Compressor & Release Pin Panel on Canvas
  const pX = 668;
  ctx.fillStyle = "rgba(15, 28, 46, 0.9)";
  drawRoundedRect(ctx, pX, 86, 136, 314, 10);
  ctx.fill();
  ctx.strokeStyle = "#2b4264";
  ctx.stroke();
  ctx.fillStyle = "#9db2ce";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.fillText("AIR COMPRESSOR", pX + 16, 108);

  // Air valve vertical track
  const trackX = pX + 68;
  const trackTop = 128;
  const trackH = 150;
  ctx.fillStyle = "#091322";
  drawRoundedRect(ctx, trackX - 6, trackTop, 12, trackH, 6);
  ctx.fill();
  const maxBag = parseFloat(document.getElementById("s2-bag-slider").max) || 15;
  const bagRatio = clamp(s2State.bagVol / maxBag, 0, 1);
  const leverY = trackTop + trackH - bagRatio * trackH;

  ctx.fillStyle = "#38bdf8";
  drawRoundedRect(ctx, trackX - 6, leverY, 12, trackTop + trackH - leverY, 6);
  ctx.fill();

  // Draggable valve knob
  ctx.fillStyle = s2State.bagRigged ? "#f59e0b" : "#475569";
  drawRoundedRect(ctx, trackX - 24, leverY - 10, 48, 20, 6);
  ctx.fill();
  ctx.fillStyle = "#0b1320";
  ctx.font = "700 9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("AIR", trackX, leverY + 3);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 11px monospace";
  ctx.fillText(`${s2State.bagVol.toFixed(2)} m³`, trackX, trackTop + trackH + 18);

  // Draggable Red Release Pin Slide Track
  const pinTrackX = pX + 16;
  const pinTrackY = 342;
  const pinTrackW = 104;
  ctx.fillStyle = "#091322";
  drawRoundedRect(ctx, pinTrackX, pinTrackY, pinTrackW, 30, 15);
  ctx.fill();
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const pinKnobX = pinTrackX + 15 + s2State.releasePinProgress * (pinTrackW - 30);
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(pinKnobX, pinTrackY + 15, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 9px system-ui, sans-serif";
  ctx.fillText(s2State.craneReleased ? "FREE" : "SLIDE", trackX, pinTrackY - 8);
  ctx.textAlign = "left";

  // Crane Cable & Load Cell
  const cx = S2_CONST.craneX;
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, s2State.hookY - 26);
  ctx.stroke();

  // Load Cell box on cable (draggable up/down)
  ctx.fillStyle = "#1e293b";
  drawRoundedRect(ctx, cx - 42, s2State.hookY - 38, 84, 34, 6);
  ctx.fill();
  ctx.strokeStyle = s2State.hookAttached ? "#22c55e" : "#38bdf8";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#38bdf8";
  ctx.font = "700 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${getS2LoadCellN().toFixed(0)} N`, cx, s2State.hookY - 17);
  ctx.textAlign = "left";

  // Hook jaw
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, s2State.hookY - 4);
  ctx.lineTo(cx, s2State.hookY + 6);
  ctx.arc(cx, s2State.hookY + 12, 7, -Math.PI / 2, Math.PI, false);
  ctx.stroke();

  // Rigged Lift Bag floating above artifact
  if (s2State.bagRigged) {
    const scaleR = 16 + Math.pow(s2State.bagVol, 0.45) * 18;
    const bagCenterY = s2State.artY - 26 - scaleR * 0.7;

    // Rigging straps
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 18, s2State.artY);
    ctx.lineTo(cx - scaleR * 0.55, bagCenterY + scaleR * 0.5);
    ctx.moveTo(cx + 18, s2State.artY);
    ctx.lineTo(cx + scaleR * 0.55, bagCenterY + scaleR * 0.5);
    ctx.stroke();

    // Parachute lift bag dome
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

  // Bubbles
  ctx.fillStyle = "rgba(186, 230, 253, 0.55)";
  s2State.bubbles.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Sunken Mystery Artifact
  const ax = cx - S2_CONST.artW / 2;
  const ay = s2State.artY;

  // Lifting shackle ring on top of artifact
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

  // Rivets & label
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MYSTERY", cx, ay + 24);
  ctx.fillText("ARTIFACT", cx, ay + 40);
  ctx.textAlign = "left";

  // Drop target circle when dragging hook or bag
  if (s2State.dragging && (s2State.dragging.type === "bag" || (s2State.dragging.type === "hook" && !s2State.hookAttached))) {
    ctx.save();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(cx, ay + 12, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Unrigged Lift Bag in Gear Bay
  if (!s2State.bagRigged) {
    ctx.fillStyle = "#ea580c";
    drawRoundedRect(ctx, s2State.bagX, s2State.bagY, 72, 46, 10);
    ctx.fill();
    ctx.strokeStyle = "#fed7aa";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "700 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LIFT BAG", s2State.bagX + 36, s2State.bagY + 27);
    ctx.textAlign = "left";
  }

  // Draggable Yellow Sonar ROV
  const rx = s2State.rovX;
  const ry = s2State.rovY;
  // Sonar beam when close to artifact
  const rovDist = Math.hypot(rx + 34 - cx, ry + 20 - (ay + S2_CONST.artH / 2));
  if (rovDist < 105 && !s2State.scanned) {
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
    ctx.lineWidth = 2;
    const pulse = (s2State.time * 60) % 55;
    ctx.beginPath();
    ctx.arc(cx, ay + S2_CONST.artH / 2, 18 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#38bdf8";
    ctx.font = "700 11px monospace";
    ctx.fillText(`SCANNING ${Math.round(s2State.scanProgress * 100)}%`, cx - 44, ay - 22);
    ctx.restore();
  }

  ctx.fillStyle = "#eab308";
  drawRoundedRect(ctx, rx, ry, 68, 40, 10);
  ctx.fill();
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SONAR", rx + 34, ry + 18);
  ctx.fillText(s2State.scanned ? "DONE" : "ROV", rx + 34, ry + 31);
  ctx.textAlign = "left";
}

// Station 2 Pointer Drag Events
s2Canvas.addEventListener("pointerdown", (e) => {
  const pos = getPointerPos(s2Canvas, e);
  s2Canvas.setPointerCapture(e.pointerId);

  // 1. Check Sonar ROV
  if (pos.x >= s2State.rovX && pos.x <= s2State.rovX + 68 && pos.y >= s2State.rovY && pos.y <= s2State.rovY + 40) {
    s2State.dragging = { type: "rov" };
    s2State.dragOffX = pos.x - s2State.rovX;
    s2State.dragOffY = pos.y - s2State.rovY;
    return;
  }

  // 2. Check Unrigged Lift Bag
  if (!s2State.bagRigged && pos.x >= s2State.bagX && pos.x <= s2State.bagX + 72 && pos.y >= s2State.bagY && pos.y <= s2State.bagY + 46) {
    s2State.dragging = { type: "bag" };
    s2State.dragOffX = pos.x - s2State.bagX;
    s2State.dragOffY = pos.y - s2State.bagY;
    return;
  }

  // 3. Check Air Compressor Lever
  const trackX = 668 + 68;
  if (s2State.bagRigged && !s2State.craneReleased && Math.abs(pos.x - trackX) <= 32 && pos.y >= 118 && pos.y <= 290) {
    s2State.dragging = { type: "airValve" };
    return;
  }

  // 4. Check Red Release Pin Slider
  if (!s2State.craneReleased && pos.x >= 680 && pos.x <= 795 && pos.y >= 334 && pos.y <= 380) {
    s2State.dragging = { type: "releasePin" };
    return;
  }

  // 5. Check Crane Hook / Load Cell (drag down to latch, drag up to lift)
  const cx = S2_CONST.craneX;
  if (!s2State.craneReleased && Math.abs(pos.x - cx) <= 48 && pos.y >= s2State.hookY - 42 && pos.y <= s2State.hookY + 32) {
    s2State.dragging = { type: "hook" };
    s2State.dragOffY = pos.y - s2State.hookY;
  }
});

s2Canvas.addEventListener("pointermove", (e) => {
  const pos = getPointerPos(s2Canvas, e);
  if (!s2State.dragging) {
    const cx = S2_CONST.craneX;
    const overRov = pos.x >= s2State.rovX && pos.x <= s2State.rovX + 68 && pos.y >= s2State.rovY && pos.y <= s2State.rovY + 40;
    const overBag = !s2State.bagRigged && pos.x >= s2State.bagX && pos.x <= s2State.bagX + 72 && pos.y >= s2State.bagY && pos.y <= s2State.bagY + 46;
    const overHook = !s2State.craneReleased && Math.abs(pos.x - cx) <= 48 && pos.y >= s2State.hookY - 42 && pos.y <= s2State.hookY + 32;
    const overAir = s2State.bagRigged && !s2State.craneReleased && Math.abs(pos.x - 736) <= 32 && pos.y >= 118 && pos.y <= 290;
    const overPin = !s2State.craneReleased && pos.x >= 680 && pos.x <= 795 && pos.y >= 334 && pos.y <= 380;
    s2Canvas.style.cursor = overHook || overAir ? "ns-resize" : overRov || overBag || overPin ? "grab" : "default";
    return;
  }

  s2Canvas.style.cursor = "grabbing";
  if (s2State.dragging.type === "rov") {
    s2State.rovX = clamp(pos.x - s2State.dragOffX, 10, CW - 78);
    s2State.rovY = clamp(pos.y - s2State.dragOffY, S2_CONST.waterSurfaceY + 8, S2_CONST.seabedY - 44);
  } else if (s2State.dragging.type === "bag") {
    s2State.bagX = clamp(pos.x - s2State.dragOffX, 10, CW - 82);
    s2State.bagY = clamp(pos.y - s2State.dragOffY, S2_CONST.waterSurfaceY + 8, S2_CONST.seabedY - 50);
  } else if (s2State.dragging.type === "hook") {
    const maxHookY = s2State.artY - 10;
    const minHookY = s2State.hookAttached ? S2_CONST.targetTopY + 8 : 110;
    s2State.hookY = clamp(pos.y - s2State.dragOffY, minHookY, s2State.hookAttached ? S2_CONST.seabedY - S2_CONST.artH - 12 : maxHookY + 12);
    // Auto-latch when hook reaches artifact lifting ring
    if (!s2State.hookAttached && Math.abs(s2State.hookY - (s2State.artY - 12)) < 18) {
      s2State.hookAttached = true;
    }
  } else if (s2State.dragging.type === "airValve") {
    const trackTop = 128;
    const trackH = 150;
    const ratio = clamp(1 - (pos.y - trackTop) / trackH, 0, 1);
    const maxBag = parseFloat(document.getElementById("s2-bag-slider").max) || 15;
    s2State.bagVol = Math.round(ratio * maxBag * 1000) / 1000;
    document.getElementById("s2-bag-slider").value = s2State.bagVol;
    document.getElementById("s2-bag-number").value = s2State.bagVol;
  } else if (s2State.dragging.type === "releasePin") {
    const pinTrackX = 668 + 16;
    const pinTrackW = 104;
    s2State.releasePinProgress = clamp((pos.x - (pinTrackX + 15)) / (pinTrackW - 30), 0, 1);
    if (s2State.releasePinProgress >= 0.92) {
      s2State.dragging = null;
      triggerS2Release();
    }
  }
});

function releaseS2Drag() {
  if (!s2State.dragging) return;
  if (s2State.dragging.type === "bag") {
    const dist = Math.hypot(s2State.bagX + 36 - S2_CONST.craneX, s2State.bagY + 23 - (s2State.artY + 12));
    if (dist < 85) {
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
  waterlineY: 270,
  pxPerMeter: 86,
  bargeX: 225,
  bargePxW: 370,
  wheelCx: 725,
  wheelCy: 175,
  wheelR: 46
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
    cargoX: 72,
    cargoY: 112,
    cargoHomeX: 72,
    cargoHomeY: 112,
    caliperY: S3_CONST.waterlineY,
    wheelAngle: 0,
    lastPointerAngle: 0,
    sprayTimer: 0,
    outcome: "empty", // empty, safe, swamped, topheavy
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
  document.getElementById("s3-spec-W").textContent = `${b.W.toFixed(1)} m (Area = ${b.area.toFixed(1)} m²)`;
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
      `Barge Swamped! Loaded draft reached ${eqDraft.toFixed(3)} m, crossing the ${b.dSafe.toFixed(2)} m red danger line. Click 'Reset Barge' and pump out more ballast.`
    );
  } else if (eqDraft < b.dMin - 0.005) {
    s3State.outcome = "topheavy";
    setFeedback(
      "s3-feedback",
      "warn",
      `Stability Warning — Excessive Freeboard! Loaded draft (${eqDraft.toFixed(3)} m) is too high (below ${b.dMin.toFixed(2)} m), making the barge top-heavy. Reset and pump closer to your exact V_pump.`
    );
  } else {
    s3State.outcome = "safe";
    crewProgress.s3Done = true;
    setFeedback(
      "s3-feedback",
      "success",
      `Artifact safely secured! Final loaded draft is ${eqDraft.toFixed(3)} m — right inside the green safe zone (${b.dMin.toFixed(2)} m to ${b.dSafe.toFixed(2)} m).`
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
    targetDraft = b.hullHeight + 0.35; // sinks below deck
    s3State.tiltRad += (0.24 - s3State.tiltRad) * Math.min(1, dt * 1.8);
  } else if (s3State.outcome === "topheavy") {
    s3State.tiltRad = Math.sin(s3State.time * 4.5) * 0.14; // unstable rolling
  } else {
    s3State.tiltRad = Math.sin(s3State.time * 1.6) * 0.012;
  }

  // Smooth buoyant bobbing
  const acc = (targetDraft - s3State.draftM) * 24 - s3State.draftVel * 5.2;
  s3State.draftVel += acc * dt;
  s3State.draftM += s3State.draftVel * dt;

  // Snap unplaced cargo back to crane hook
  if (!s3State.cargoLoaded && (!s3State.dragging || s3State.dragging.type !== "cargo")) {
    s3State.cargoX += (s3State.cargoHomeX - s3State.cargoX) * Math.min(1, dt * 10);
    s3State.cargoY += (s3State.cargoHomeY - s3State.cargoY) * Math.min(1, dt * 10);
  }

  // HUD updates
  const hullBottomY = S3_CONST.waterlineY + s3State.draftM * S3_CONST.pxPerMeter;
  const caliperDraftM = Math.max(0, (hullBottomY - s3State.caliperY) / S3_CONST.pxPerMeter);
  document.getElementById("s3-hud-caliper").textContent = `${caliperDraftM.toFixed(3)} m`;
  document.getElementById("s3-hud-pumped").textContent = `${s3State.pumpedVol.toFixed(2)} m³`;

  const statusLabels = {
    empty: `Empty (Draft ~${s3State.draftM.toFixed(2)} m)`,
    safe: `SAFE LOADED (${getS3EquilibriumDraft().toFixed(2)} m)`,
    swamped: "SWAMPED — OVER RED LINE",
    topheavy: "UNSTABLE — TOO HIGH"
  };
  document.getElementById("s3-hud-draft").textContent = statusLabels[s3State.outcome];
}

function drawStation3() {
  const ctx = s3Ctx;
  ctx.clearRect(0, 0, CW, CH);
  const b = mission.barge;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, S3_CONST.waterlineY);
  sky.addColorStop(0, "#0d1b2e");
  sky.addColorStop(1, "#183150");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, S3_CONST.waterlineY);

  // Back water layer
  ctx.fillStyle = "#0a2a47";
  ctx.fillRect(0, S3_CONST.waterlineY, CW, CH - S3_CONST.waterlineY);

  // Barge Geometry
  const hullPxH = b.hullHeight * S3_CONST.pxPerMeter;
  const hullBottomY = S3_CONST.waterlineY + s3State.draftM * S3_CONST.pxPerMeter;
  const hullTopY = hullBottomY - hullPxH;
  const bx = S3_CONST.bargeX;
  const bw = S3_CONST.bargePxW;
  const bcx = bx + bw / 2;
  const bcy = hullTopY + hullPxH / 2;

  // Gantry crane arm holding unplaced artifact on left
  if (!s3State.cargoLoaded) {
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(20, 44);
    ctx.lineTo(130, 44);
    ctx.stroke();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s3State.cargoX + 38, 44);
    ctx.lineTo(s3State.cargoX + 38, s3State.cargoY);
    ctx.stroke();
  }

  // Draw Barge (with subtle wave tilt)
  ctx.save();
  ctx.translate(bcx, bcy);
  ctx.rotate(s3State.tiltRad);
  ctx.translate(-bcx, -bcy);

  // Hull outer shell
  ctx.fillStyle = "#334155";
  drawRoundedRect(ctx, bx, hullTopY, bw, hullPxH, 6);
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Deck rail
  ctx.fillStyle = "#475569";
  ctx.fillRect(bx - 6, hullTopY - 8, bw + 12, 10);

  // Interior cutaway Ballast Tank showing remaining water
  const tankX = bx + 54;
  const tankW = bw - 108;
  const tankH = hullPxH - 36;
  const tankY = hullTopY + 22;
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

  // Green Safe Draft Band on Hull Exterior (left & right edges)
  const safeRedY = hullBottomY - b.dSafe * S3_CONST.pxPerMeter;
  const minYelY = hullBottomY - b.dMin * S3_CONST.pxPerMeter;
  ctx.fillStyle = "rgba(34, 197, 94, 0.45)";
  ctx.fillRect(bx + 2, safeRedY, 44, minYelY - safeRedY);

  // Red Max Safe Draft Line across hull
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx - 4, safeRedY);
  ctx.lineTo(bx + 52, safeRedY);
  ctx.moveTo(bx + bw - 52, safeRedY);
  ctx.lineTo(bx + bw + 4, safeRedY);
  ctx.stroke();

  // Yellow Min Stable Draft Line
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx, minYelY);
  ctx.lineTo(bx + 46, minYelY);
  ctx.stroke();

  // Draft ruler markings on left side of hull (meters from bottom)
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
      ctx.fillText(`${m.toFixed(1)}m`, bx + 18, my + 3);
    }
  }

  // Deck Landing Pad (Drop Zone for Artifact!)
  const padX = bcx - 52;
  const padY = hullTopY - 66;
  if (!s3State.cargoLoaded) {
    ctx.save();
    ctx.strokeStyle = s3State.dragging && s3State.dragging.type === "cargo" ? "#4ade80" : "#38bdf8";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    drawRoundedRect(ctx, padX, padY, 104, 58, 8);
    ctx.stroke();
    ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#bae6fd";
    ctx.font = "700 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DROP ARTIFACT", bcx, padY + 26);
    ctx.fillText("HERE ON DECK", bcx, padY + 41);
    ctx.textAlign = "left";
  } else {
    // Artifact sitting on deck!
    const ax = bcx - 38;
    const ay = hullTopY - 64;
    ctx.fillStyle = "#94a3b8";
    drawRoundedRect(ctx, ax, ay, 76, 56, 7);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SECURED", bcx, ay + 25);
    ctx.fillText("ARTIFACT", bcx, ay + 40);
    ctx.textAlign = "left";
  }

  // Water discharge spray animation while pumping
  if (s3State.sprayTimer > 0) {
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx + bw, hullTopY + 38);
    ctx.quadraticCurveTo(bx + bw + 32, hullTopY + 42, bx + bw + 52, S3_CONST.waterlineY);
    ctx.stroke();
  }

  ctx.restore();

  // Translucent front ocean surface over submerged hull
  ctx.fillStyle = mission.fluid.tint;
  ctx.fillRect(0, S3_CONST.waterlineY, CW, CH - S3_CONST.waterlineY);

  // Surface wave crest
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = 0; x <= CW; x += 10) {
    const wy = S3_CONST.waterlineY + Math.sin(x * 0.045 + s3State.time * 3) * 2.5;
    if (x === 0) ctx.moveTo(x, wy);
    else ctx.lineTo(x, wy);
  }
  ctx.stroke();

  // Draggable Unplaced Artifact (if not yet dropped on deck)
  if (!s3State.cargoLoaded) {
    const ax = s3State.cargoX;
    const ay = s3State.cargoY;
    ctx.fillStyle = "#94a3b8";
    drawRoundedRect(ctx, ax, ay, 76, 56, 7);
    ctx.fill();
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DRAG TO", ax + 38, ay + 24);
    ctx.fillText("DECK", ax + 38, ay + 39);
    ctx.textAlign = "left";
  }

  // Draggable Red Waterline Caliper on Left of Barge
  ctx.save();
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(bx - 12, s3State.caliperY);
  ctx.lineTo(bx + 80, s3State.caliperY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#f43f5e";
  drawRoundedRect(ctx, bx - 84, s3State.caliperY - 12, 74, 24, 6);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 10px monospace";
  const calDraft = Math.max(0, (hullBottomY - s3State.caliperY) / S3_CONST.pxPerMeter);
  ctx.fillText(`${calDraft.toFixed(2)} m`, bx - 74, s3State.caliperY + 4);
  ctx.restore();

  // Draggable Rotary Ballast Pump Wheel on Right
  const wx = S3_CONST.wheelCx;
  const wy = S3_CONST.wheelCy;
  const wr = S3_CONST.wheelR;

  ctx.fillStyle = "rgba(15, 28, 46, 0.9)";
  drawRoundedRect(ctx, wx - 72, wy - 84, 144, 174, 12);
  ctx.fill();
  ctx.strokeStyle = "#2b4264";
  ctx.stroke();

  ctx.fillStyle = "#9db2ce";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BALLAST PUMP WHEEL", wx, wy - 62);

  // Rotary wheel graphic
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
  // Grab handle peg
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(wr, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 11px monospace";
  ctx.fillText(`Pumped: ${s3State.pumpedVol.toFixed(2)} m³`, wx, wy + 68);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 9px system-ui, sans-serif";
  ctx.fillText("Turn CW to pump out", wx, wy + 82);
  ctx.textAlign = "left";
}

// Station 3 Pointer Drag Events
s3Canvas.addEventListener("pointerdown", (e) => {
  const pos = getPointerPos(s3Canvas, e);
  s3Canvas.setPointerCapture(e.pointerId);

  // 1. Check Artifact Cargo drag
  if (
    !s3State.cargoLoaded &&
    pos.x >= s3State.cargoX &&
    pos.x <= s3State.cargoX + 76 &&
    pos.y >= s3State.cargoY &&
    pos.y <= s3State.cargoY + 56
  ) {
    s3State.dragging = { type: "cargo" };
    s3State.dragOffX = pos.x - s3State.cargoX;
    s3State.dragOffY = pos.y - s3State.cargoY;
    return;
  }

  // 2. Check Waterline Caliper
  const bx = S3_CONST.bargeX;
  if (pos.x >= bx - 88 && pos.x <= bx - 4 && Math.abs(pos.y - s3State.caliperY) <= 18) {
    s3State.dragging = { type: "caliper" };
    return;
  }

  // 3. Check Rotary Ballast Wheel
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
    const overCargo = !s3State.cargoLoaded && pos.x >= s3State.cargoX && pos.x <= s3State.cargoX + 76 && pos.y >= s3State.cargoY && pos.y <= s3State.cargoY + 56;
    const overCal = pos.x >= bx - 88 && pos.x <= bx - 4 && Math.abs(pos.y - s3State.caliperY) <= 18;
    const overWheel = !s3State.cargoLoaded && Math.hypot(pos.x - S3_CONST.wheelCx, pos.y - S3_CONST.wheelCy) <= S3_CONST.wheelR + 18;
    s3Canvas.style.cursor = overCal ? "ns-resize" : overCargo || overWheel ? "grab" : "default";
    return;
  }

  s3Canvas.style.cursor = "grabbing";
  if (s3State.dragging.type === "cargo") {
    s3State.cargoX = clamp(pos.x - s3State.dragOffX, 10, CW - 86);
    s3State.cargoY = clamp(pos.y - s3State.dragOffY, 10, S3_CONST.waterlineY - 20);
  } else if (s3State.dragging.type === "caliper") {
    s3State.caliperY = clamp(pos.y, 120, CH - 20);
  } else if (s3State.dragging.type === "wheel") {
    const ang = Math.atan2(pos.y - S3_CONST.wheelCy, pos.x - S3_CONST.wheelCx);
    let delta = ang - s3State.lastPointerAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    s3State.lastPointerAngle = ang;
    s3State.wheelAngle += delta;

    // 1 full clockwise revolution pumps 2.5 m^3
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
    const cargoCx = s3State.cargoX + 38;
    const cargoCy = s3State.cargoY + 28;

    const onDeck =
      Math.abs(cargoCx - bcx) <= 135 && cargoCy >= hullTopY - 125 && cargoCy <= hullTopY + 30;
    if (onDeck) {
      s3State.cargoLoaded = true;
      s3State.draftVel += 0.65; // splash impulse when artifact sets down
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

// Station 1 Transmit
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
      `QC Check Failed: Method 1 (${m1}) and Method 2 (${m2}) differ by ${pctDiff.toFixed(1)}%. Re-check your measurements until they agree within 2.5%.`
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
    `QC Passed (${pctDiff.toFixed(2)}% agreement)! Transmitted rho_f = ${avg.toFixed(1)} kg/m³ to Stations 2 & 3. Station 3 can now cross-check this against their empty barge draft!`
  );
  updateCommsUI();
});

// Station 2 Sliders & Release
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

// Station 2 Material Verification (accepts any Wikipedia material matching density within tolerance)
document.getElementById("s2-btn-verify").addEventListener("click", () => {
  const massIn = parseFloat(document.getElementById("s2-input-mass").value);
  const rhoIn = parseFloat(document.getElementById("s2-input-density").value);
  const rawName = document.getElementById("s2-input-material").value.trim().toLowerCase();

  if (Number.isNaN(massIn) || Number.isNaN(rhoIn) || !rawName) {
    setFeedback("s2-feedback", "warn", "Fill in calculated mass, calculated density, and the material name from the Wikipedia popup.");
    return;
  }

  const matchedEntry = WIKI_MATERIALS.find(
    (m) => m.name.toLowerCase() === rawName || m.aliases.includes(rawName)
  );
  if (!matchedEntry) {
    setFeedback(
      "s2-feedback",
      "warn",
      `"${rawName}" wasn't found in the Wikipedia 'Various materials' table. Click 'Look Up' to check the exact material name.`
    );
    return;
  }

  const densityErr = Math.abs(matchedEntry.density - mission.material.density) / mission.material.density;
  const massErr = Math.abs(massIn - mission.artifactMass) / mission.artifactMass;

  if (densityErr > 0.03) {
    setFeedback(
      "s2-feedback",
      "error",
      `${matchedEntry.name} has a Wikipedia density of ${matchedEntry.density.toLocaleString()} kg/m³, which doesn't match the sunken artifact's real density. Double-check Station 1's rho_f and your calculation.`
    );
    return;
  }

  if (massErr > 0.035) {
    setFeedback(
      "s2-feedback",
      "warn",
      `Material matches, but your calculated mass (${massIn.toFixed(1)} kg) is off by more than 3.5%. Re-check m_o = W_app/g + rho_f * V_o.`
    );
    return;
  }

  // Check if multiple Wikipedia materials share that exact density
  const tied = WIKI_MATERIALS.filter((m) => m.density === mission.material.density).map((m) => m.name);
  const tieNote = tied.length > 1 ? ` (Note: ${tied.join(", ")} share ${mission.material.density.toLocaleString()} kg/m³ on Wikipedia.)` : "";

  crewProgress.s2MaterialDone = true;
  crewProgress.s2Mass = massIn;
  crewProgress.s2MaterialName = matchedEntry.name;
  document.getElementById("s3-input-mass-rx").value = massIn.toFixed(1);

  setFeedback(
    "s2-feedback",
    "success",
    `Material Verified: ${matchedEntry.name} (${matchedEntry.density.toLocaleString()} kg/m³)!${tieNote} Sent m_o = ${massIn.toFixed(1)} kg to Station 3.`
  );
  updateCommsUI();
});

// Station 3 Pump Slider Sync
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

// Reset Buttons
document.getElementById("s1-btn-reset").addEventListener("click", resetStation1);
document.getElementById("s2-btn-reset").addEventListener("click", resetStation2);
document.getElementById("s3-btn-reset").addEventListener("click", resetStation3);

// Station Tab Switching
[1, 2, 3].forEach((n) => {
  document.getElementById(`tab-btn-${n}`).addEventListener("click", () => {
    activeStation = n;
    [1, 2, 3].forEach((k) => {
      document.getElementById(`tab-btn-${k}`).classList.toggle("active", k === n);
      document.getElementById(`tab-btn-${k}`).setAttribute("aria-selected", String(k === n));
      document.getElementById(`station-${k}`).classList.toggle("active", k === n);
    });
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

// Instructor Key (hidden behind confirmation dialog)
document.getElementById("btn-instructor-key").addEventListener("click", () => {
  if (!confirm("Show the Instructor Answer Key for the current Mission Seed?")) return;
  const m = mission;
  const b = m.barge;
  alert(
    `INSTRUCTOR KEY — Seed: ${m.seed}\n\n` +
      `Station 1 (Fluid):\n` +
      `  • Fluid: ${m.fluid.label}\n` +
      `  • Density (rho_f): ${m.fluid.density} kg/m³\n\n` +
      `Station 2 (Artifact):\n` +
      `  • Material: ${m.material.name} (${m.material.density} kg/m³)\n` +
      `  • Volume (V_o): ${m.artifactVol.toFixed(3)} m³\n` +
      `  • True Mass (m_o): ${m.artifactMass.toFixed(1)} kg\n` +
      `  • Apparent Weight (W_app): ${m.artifactApparentW.toFixed(1)} N\n` +
      `  • Neutral Lift Bag Volume (V_bag): ${m.idealBagVol.toFixed(3)} m³\n\n` +
      `Station 3 (Recovery Barge):\n` +
      `  • Empty Draft (d_0): ${b.d0.toFixed(3)} m\n` +
      `  • Unpumped Loaded Draft (d_loaded): ${b.unpumpedLoadedD.toFixed(3)} m\n` +
      `  • Exact Ballast to Pump for d_safe (${b.dSafe.toFixed(2)} m): ${b.idealPumpVol.toFixed(2)} m³\n` +
      `  • Safe Pump Window: ${b.idealPumpVol.toFixed(2)} m³ to ${(b.area * (b.unpumpedLoadedD - b.dMin)).toFixed(2)} m³`
  );
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

// Close modal when clicking outside backdrop
wikiDialog.addEventListener("click", (e) => {
  const rect = wikiDialog.getBoundingClientRect();
  const clickedInside =
    e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!clickedInside) wikiDialog.close();
});

/* =========================================================================
   MAIN ANIMATION LOOP
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

// Boot default mission
generateMission("ALPHA-01");
requestAnimationFrame(animate);