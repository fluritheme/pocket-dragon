import type { Config } from "./types.js";
import type { DragonModel } from "./model.js";
const palettes = {
  ember: {
    dark: "#743522",
    body: "#e77c49",
    light: "#ffc17c",
    belly: "#ffe2a6",
    wing: "#ba523d",
    membrane: "#efaa79",
    crest: "#91422c",
  },
  mint: {
    dark: "#224c43",
    body: "#70ac8a",
    light: "#a9dec0",
    belly: "#f7e8bd",
    wing: "#3e796d",
    membrane: "#b5d6bc",
    crest: "#366b59",
  },
  lavender: {
    dark: "#493859",
    body: "#aa8ac8",
    light: "#d9c0e7",
    belly: "#ffe6c7",
    wing: "#765793",
    membrane: "#d7b1d8",
    crest: "#675075",
  },
};
function oval(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string | CanvasGradient,
  stroke?: string,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 1.5;
    c.stroke();
  }
}
function path(
  c: CanvasRenderingContext2D,
  d: () => void,
  fill: string | CanvasGradient,
  stroke?: string,
  width = 1.5,
) {
  c.beginPath();
  d();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.lineJoin = "round";
    c.stroke();
  }
}
export function renderDragon(
  c: CanvasRenderingContext2D,
  m: DragonModel,
  cfg: Config,
) {
  const p = palettes[cfg.preset],
    time = m.age,
    unit = cfg.size / 180,
    egg = m.phase === "egg";
  c.save();
  c.translate(m.x, m.y);
  c.scale(unit, unit);
  const flying = m.phase === "flying";
  const h = flying ? Math.sin(Math.min(m.time / 2.2, 1) * Math.PI) * 60 : 0;
  c.globalAlpha = 0.18;
  c.filter = "blur(5px)";
  oval(c, 0, 8 + h, 56 - h * 0.4, 7 - h * 0.04, p.dark);
  c.filter = "none";
  c.globalAlpha = 1;
  if (egg) {
    const wobble = Math.sin(m.time * 16) * m.eggCrack * 0.12;
    c.translate(0, -36);
    c.rotate(wobble);
    const g = c.createLinearGradient(-27, -40, 24, 30);
    g.addColorStop(0, "#fff0d0");
    g.addColorStop(0.55, "#ebc38a");
    g.addColorStop(1, "#b87d57");
    path(
      c,
      () => {
        c.moveTo(0, -44);
        c.bezierCurveTo(27, -40, 43, 28, 13, 37);
        c.bezierCurveTo(-31, 54, -44, 8, -22, -25);
        c.bezierCurveTo(-15, -38, -7, -44, 0, -44);
      },
      g,
      p.dark,
      2,
    );
    for (let i = 0; i < 10; i++) {
      const a = i * 2.4,
        x = Math.cos(a) * 17,
        y = Math.sin(a) * 25;
      oval(c, x, y, 3 + (i % 3), 2.3, "#b8805a55");
    }
    if (m.eggCrack > 0.22) {
      c.strokeStyle = p.dark;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-7, -24);
      c.lineTo(3, -14);
      c.lineTo(-5, -6);
      c.lineTo(8, 2);
      if (m.eggCrack > 0.6) {
        c.lineTo(-3, 15);
        c.lineTo(6, 22);
      }
      c.stroke();
    }
    c.restore();
    return;
  }
  c.scale(m.direction, 1);
  const sleeping = m.phase === "sleeping";
  const breathe = Math.sin(time * 2.2) * 1.4;
  const walk = m.phase === "walking" ? Math.sin(m.gait) : 0;
  c.translate(0, breathe + Math.abs(walk) * -2);
  c.rotate(m.bodyPitch);
  c.scale(1 + (1 - m.stretch) * 0.3, m.stretch);
  // Tapering tail follows the body with three delayed curls.
  const curl = sleeping ? -0.6 : Math.sin(time * 1.5) * 0.2;
  path(
    c,
    () => {
      c.moveTo(-19, -39);
      c.bezierCurveTo(-59, -43, -69, -18, -93, -31 + curl * 25);
      c.bezierCurveTo(-76, -4, -40, -3, -17, -17);
      c.closePath();
    },
    p.body,
    p.dark,
    2,
  );
  path(
    c,
    () => {
      c.moveTo(-42, -26);
      c.bezierCurveTo(-59, -18, -72, -23, -82, -27);
      c.bezierCurveTo(-62, -15, -49, -13, -30, -24);
    },
    p.light,
  );
  for (let i = 0; i < 4; i++) {
    const x = -36 - i * 11,
      y = -31 - Math.sin(i) * 2;
    path(
      c,
      () => {
        c.moveTo(x - 6, y);
        c.quadraticCurveTo(x - 5, y - 14 + i * 2, x + 2, y - 4);
        c.lineTo(x + 4, y + 3);
      },
      p.crest,
      p.dark,
      1,
    );
  }
  // Far legs with articulated toes.
  const leg = (x: number, front: boolean, far: boolean) => {
    c.save();
    c.translate(
      x + walk * (front ? 4 : -5) * (far ? -1 : 1),
      -13 + Math.max(0, walk * (far ? -1 : 1)) * -5,
    );
    c.rotate(walk * 0.12 * (front ? 1 : -1));
    path(
      c,
      () => {
        c.moveTo(-11, -21);
        c.bezierCurveTo(-18, -7, -15, 1, -18, 7);
        c.quadraticCurveTo(-7, 11, 9, 7);
        c.quadraticCurveTo(11, 1, 1, -3);
        c.lineTo(7, -22);
      },
      far ? p.wing : p.body,
      p.dark,
      2,
    );
    for (let i = 0; i < 3; i++)
      path(
        c,
        () => {
          c.moveTo(-10 + i * 6, 4);
          c.lineTo(-9 + i * 6, 9);
          c.lineTo(-5 + i * 6, 7);
        },
        p.belly,
        p.dark,
        0.8,
      );
    c.restore();
  };
  leg(12, true, true);
  leg(-23, false, true);
  // Far wing, then a shaded pear-shaped torso.
  const wing = (far: boolean) => {
    c.save();
    c.translate(far ? -8 : -12, -54);
    const flap = flying ? m.wing * 0.5 : Math.sin(time * 1.4) * 0.025;
    c.rotate((far ? -0.18 : 0.08) + flap);
    c.scale(far ? 0.79 : 1, far ? 0.8 : 1);
    path(
      c,
      () => {
        c.moveTo(7, 19);
        c.bezierCurveTo(-1, -1, -5, -34, -34, -57);
        c.quadraticCurveTo(-52, -75, -59, -66);
        c.quadraticCurveTo(-39, -32, -51, -9);
        c.quadraticCurveTo(-34, -21, -29, -7);
        c.quadraticCurveTo(-19, -17, -10, 4);
        c.lineTo(7, 19);
      },
      far ? p.wing : p.membrane,
      p.dark,
      2,
    );
    c.strokeStyle = p.wing;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(4, 15);
    c.quadraticCurveTo(-24, -19, -58, -64);
    c.moveTo(-33, -34);
    c.lineTo(-49, -10);
    c.moveTo(-23, -18);
    c.lineTo(-28, -7);
    c.stroke();
    path(
      c,
      () => {
        c.moveTo(-59, -66);
        c.lineTo(-57, -78);
        c.quadraticCurveTo(-48, -73, -50, -62);
      },
      p.belly,
      p.dark,
      1,
    );
    c.restore();
  };
  wing(true);
  const body = c.createRadialGradient(6, -62, 5, -7, -36, 53);
  body.addColorStop(0, p.light);
  body.addColorStop(0.5, p.body);
  body.addColorStop(1, p.wing);
  oval(c, -4, -39, 37, 43, body, p.dark);
  path(
    c,
    () => {
      c.moveTo(11, -67);
      c.bezierCurveTo(-8, -56, -9, -12, 10, -7);
      c.bezierCurveTo(39, -8, 34, -53, 11, -67);
    },
    p.belly,
    p.dark,
    1.3,
  );
  c.strokeStyle = p.dark + "30";
  c.lineWidth = 1.2;
  for (let y = -53; y < -12; y += 9) {
    c.beginPath();
    c.moveTo(3, y);
    c.quadraticCurveTo(14, y + 4, 27, y);
    c.stroke();
  }
  for (let row = 0; row < 4; row++)
    for (let i = 0; i < 3; i++) {
      const x = -27 + i * 9 + (row % 2) * 4,
        y = -62 + row * 10;
      c.strokeStyle = p.dark + "35";
      c.lineWidth = 1.1;
      c.beginPath();
      c.arc(x, y, 3.2, 0.1, Math.PI - 0.1);
      c.stroke();
    }
  wing(false);
  leg(-26, false, false);
  leg(22, true, false);
  // Neck and oversized, expressive head.
  c.save();
  c.translate(29, sleeping ? -48 : -73);
  c.rotate(sleeping ? 0.35 : Math.sin(time * 0.9) * 0.025);
  path(
    c,
    () => {
      c.moveTo(-20, 16);
      c.quadraticCurveTo(-29, -9, -13, -27);
      c.quadraticCurveTo(6, -44, 27, -20);
      c.quadraticCurveTo(45, -16, 42, 3);
      c.quadraticCurveTo(39, 23, 13, 25);
      c.quadraticCurveTo(-5, 31, -20, 16);
    },
    p.body,
    p.dark,
    2,
  );
  const head = c.createRadialGradient(0, -16, 2, 6, -3, 36);
  head.addColorStop(0, p.light);
  head.addColorStop(1, p.body);
  path(
    c,
    () => {
      c.moveTo(-21, 8);
      c.bezierCurveTo(-29, -13, -12, -34, 8, -30);
      c.bezierCurveTo(24, -29, 26, -13, 30, -8);
      c.bezierCurveTo(49, -10, 59, 0, 53, 13);
      c.bezierCurveTo(47, 29, 16, 32, -3, 21);
      c.closePath();
    },
    head,
    p.dark,
    2,
  );
  // Ivory swept horns and ear.
  path(
    c,
    () => {
      c.moveTo(-13, -25);
      c.quadraticCurveTo(-29, -41, -18, -49);
      c.quadraticCurveTo(-19, -36, -4, -28);
    },
    "#ffe8b7",
    p.dark,
    1.8,
  );
  path(
    c,
    () => {
      c.moveTo(9, -29);
      c.quadraticCurveTo(3, -45, 15, -49);
      c.quadraticCurveTo(10, -38, 19, -26);
    },
    "#fff0c8",
    p.dark,
    1.5,
  );
  path(
    c,
    () => {
      c.moveTo(-19, -17);
      c.quadraticCurveTo(-40, -24, -34, -4);
      c.quadraticCurveTo(-25, 4, -14, -3);
    },
    p.light,
    p.dark,
    1.5,
  );
  path(
    c,
    () => {
      c.moveTo(-26, -14);
      c.lineTo(-31, -15);
      c.lineTo(-28, -6);
    },
    p.wing,
  );
  // Eye socket, moving pupil, eyelid and specular highlights.
  oval(c, 15, -9, 12, 14, "#fff5da", p.dark);
  if (sleeping || m.blink) {
    c.fillStyle = p.body;
    c.fillRect(2, -25, 27, 32);
    c.strokeStyle = p.dark;
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(7, -4);
    c.quadraticCurveTo(15, 3, 24, -4);
    c.stroke();
  } else {
    oval(c, 19, -7, 6.4, 9, p.dark);
    oval(c, 21, -11, 2.5, 3, "#fffdf3");
    oval(c, 17, -4, 1, 1.4, p.light);
  }
  oval(c, 39, 2, 2.3, 1.6, p.dark);
  c.strokeStyle = p.dark;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(32, 14);
  c.quadraticCurveTo(42, 18, 48, 12);
  c.stroke();
  oval(c, 10, 11, 9, 5, "#ed8e7060");
  for (let i = 0; i < 3; i++)
    oval(c, -1 + i * 5, 15 + (i % 2) * 2, 1, 1, p.dark + "65");
  if (m.phase === "eating") {
    c.save();
    c.translate(49, 16);
    c.rotate(Math.sin(m.time * 12) * 0.15);
    oval(c, 0, 0, 7, 3, p.dark);
    c.restore();
  }
  if (m.phase === "sneezing" && m.time > 0.28 && m.time < 0.65) {
    const u = (m.time - 0.28) / 0.37;
    c.save();
    c.translate(52, 4);
    c.globalAlpha = 1 - u * 0.5;
    for (let i = 0; i < 5; i++) {
      const l = 20 + Math.sin(i * 2 + time * 18) * 9;
      path(
        c,
        () => {
          c.moveTo(0, -2);
          c.quadraticCurveTo(15, -13 - i * 2, 35 + l * u, -10 + i * 5);
          c.quadraticCurveTo(25, 13, 0, 5);
        },
        i % 2 ? "#ffcf66" : "#f17c42",
      );
    }
    c.restore();
  }
  c.restore();
  if (sleeping) {
    c.save();
    c.scale(m.direction, 1);
    c.fillStyle = p.light;
    c.font = "600 15px Georgia";
    for (let i = 0; i < 3; i++) {
      const t = (time * 0.5 + i * 0.32) % 1;
      c.globalAlpha = Math.sin(t * Math.PI) * 0.8;
      c.fillText("z", 42 + t * 24, -105 - t * 30);
    }
    c.restore();
  }
  if (m.mood > 0.1) {
    c.save();
    c.scale(m.direction, 1);
    c.globalAlpha = m.mood;
    c.fillStyle = p.light;
    c.font = "16px Georgia";
    c.fillText("♥", 34, -126 - (1 - m.mood) * 18);
    c.restore();
  }
  c.restore();
}
export function renderFood(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
) {
  c.save();
  c.translate(x, y - 13 + Math.sin(time * 4) * 2);
  c.rotate(0.15);
  oval(c, 0, 0, 9, 7, "#f8ba69", "#663f30");
  for (let i = 0; i < 4; i++)
    oval(c, (i % 2) * 7 - 4, Math.floor(i / 2) * 6 - 3, 1.2, 1.2, "#9c593b");
  c.restore();
}
