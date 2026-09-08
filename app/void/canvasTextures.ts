import * as THREE from "three";
import { voidDisposition, voidNotice } from "../content/void";

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  return { canvas, ctx };
}

function asTexture(canvas: HTMLCanvasElement, repeat = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.needsUpdate = true;
  return texture;
}

export function createBrickTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = "#2a1b16";
  ctx.fillRect(0, 0, 512, 512);

  const brickW = 86;
  const brickH = 34;
  for (let y = 0, row = 0; y < 520; y += brickH + 6, row += 1) {
    const offset = row % 2 === 0 ? 0 : -brickW / 2;
    for (let x = offset; x < 520; x += brickW + 6) {
      const shade = 70 + Math.floor(Math.random() * 36);
      ctx.fillStyle = `rgb(${shade + 28},${shade - 6},${shade - 14})`;
      ctx.fillRect(x, y, brickW, brickH);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(x, y + brickH - 6, brickW, 6);
    }
  }
  ctx.fillStyle = "rgba(8,4,6,0.28)";
  ctx.fillRect(0, 0, 512, 512);
  return asTexture(canvas, 3);
}

export function createStoneTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  ctx.fillStyle = "#161114";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 18 + Math.random() * 28;
    ctx.fillStyle = `rgba(${v + 8},${v},${v + 12},${0.18 + Math.random() * 0.3})`;
    ctx.fillRect(x, y, 2 + Math.random() * 6, 1 + Math.random() * 3);
  }
  ctx.strokeStyle = "rgba(90,70,110,0.22)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath();
    ctx.moveTo(40 + i * 26, 20);
    ctx.lineTo(20 + i * 24, 500);
    ctx.stroke();
  }
  return asTexture(canvas, 2);
}

export function createGlyphTexture() {
  const { canvas, ctx } = makeCanvas(512, 768);
  ctx.fillStyle = "#0c0a0e";
  ctx.fillRect(0, 0, 512, 768);
  ctx.strokeStyle = "rgba(186,140,255,0.35)";
  ctx.fillStyle = "rgba(186,140,255,0.45)";
  ctx.lineWidth = 2;
  const marks = ["I", "II", "V", "X", "|", "||", "Δ", "○", "+", "T"];
  for (let col = 0; col < 8; col += 1) {
    for (let row = 0; row < 12; row += 1) {
      ctx.globalAlpha = 0.25 + Math.random() * 0.55;
      ctx.font = `${16 + ((col + row) % 3) * 6}px Georgia`;
      ctx.fillText(marks[(col * 13 + row) % marks.length], 28 + col * 60, 50 + row * 58);
    }
  }
  ctx.globalAlpha = 1;
  return asTexture(canvas, 1);
}

function paintNotice(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  header: string,
  kind: string,
  lines: readonly string[],
  stamp: string,
  paper: string,
) {
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, width - 32, height - 32);
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  ctx.fillStyle = "#1a120c";
  ctx.textAlign = "center";
  ctx.font = "700 34px Georgia, serif";
  ctx.fillText(header, width / 2, 92);
  ctx.beginPath();
  ctx.moveTo(70, 112);
  ctx.lineTo(width - 70, 112);
  ctx.stroke();
  ctx.font = "20px Georgia, serif";
  ctx.fillText(kind, width / 2, 156);

  ctx.font = "26px Georgia, serif";
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, 250 + index * 42);
  });

  ctx.save();
  ctx.translate(width / 2, height - 170);
  ctx.rotate(-0.28);
  ctx.strokeStyle = "#c1121f";
  ctx.fillStyle = "#c1121f";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 0, 88, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "800 42px Impact, Arial Black, sans-serif";
  ctx.fillText(stamp, 0, 14);
  ctx.restore();
}

export function createRegistryNoticeTexture() {
  const { canvas, ctx } = makeCanvas(512, 720);
  paintNotice(ctx, 512, 720, voidNotice.header, voidNotice.kind, voidNotice.lines, voidNotice.stamp, "#efe6d4");
  const texture = asTexture(canvas, 1);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createVoidNoticeTexture() {
  const { canvas, ctx } = makeCanvas(512, 720);
  paintNotice(
    ctx,
    512,
    720,
    voidDisposition.header,
    voidDisposition.kind,
    voidDisposition.lines,
    voidDisposition.stamp,
    "#e8dcc6",
  );
  const texture = asTexture(canvas, 1);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createDoorNumberTexture() {
  const { canvas, ctx } = makeCanvas(256, 128);
  ctx.clearRect(0, 0, 256, 128);
  ctx.fillStyle = "#e8dcc8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 92px Impact, Arial Black, sans-serif";
  ctx.fillText("22", 128, 68);
  const texture = asTexture(canvas, 1);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
