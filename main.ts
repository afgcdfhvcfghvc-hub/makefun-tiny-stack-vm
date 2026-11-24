// Tiny stack VM: exact interpreter for make.fun's ISA v1 (kit ISA.md; vm.mjs is the rule).
// Faithful where the baseline is not: wrapping MUL, INT_MIN/-1, unsigned DIVU/MODU/LTU,
// shifts masked to 5 bits, PUSH8 sign extension, EXIT low byte, all ten traps with their
// codes, step (1,000,000) and output (65,536) limits, traps keep prior output.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(p, inp) {
  const n = p.length;
  const D = new Int32Array(256);
  let sp = 0;
  const C = new Int32Array(64);
  let cp = 0;
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let ol = 0, ip = 0, pc = 0, steps = 0;
  const done = (code) => ({ out: out.slice(0, ol), code });
  for (;;) {
    if (steps === 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const op = p[pc];
    const imm = op === 1 ? 1 : op === 2 ? 4 : op >= 0x30 && op <= 0x33 ? 2 : 0;
    if (pc + imm >= n) return done(9);
    steps++;
    const nx = pc + 1 + imm;
    pc = nx;
    switch (op) {
      case 0x00: return done(0);
      case 0x01:
        if (sp >= 256) return done(3);
        D[sp++] = (p[nx - 1] << 24) >> 24;
        break;
      case 0x02:
        if (sp >= 256) return done(3);
        D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24);
        break;
      case 0x03:
        if (sp < 1) return done(2);
        sp--;
        break;
      case 0x04:
        if (sp < 1) return done(2);
        if (sp >= 256) return done(3);
        D[sp] = D[sp - 1]; sp++;
        break;
      case 0x05: {
        if (sp < 2) return done(2);
        const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t;
        break;
      }
      case 0x06:
        if (sp < 2) return done(2);
        if (sp >= 256) return done(3);
        D[sp] = D[sp - 2]; sp++;
        break;
      case 0x07: {
        if (sp < 3) return done(2);
        const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a;
        break;
      }
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e: case 0x20: case 0x21: case 0x22: {
        if (sp < 2) return done(2);
        const b = D[sp - 1], a = D[sp - 2];
        let r;
        if (op === 0x10) r = (a + b) | 0;
        else if (op === 0x11) r = (a - b) | 0;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) { if (b === 0) return done(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
        else if (op === 0x14) { if (b === 0) return done(4); r = b === -1 ? 0 : (a % b) | 0; }
        else if (op === 0x15) { if (b === 0) return done(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (op === 0x16) { if (b === 0) return done(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
        else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2; D[sp++] = r;
        break;
      }
      case 0x17:
        if (sp < 1) return done(2);
        D[sp - 1] = (-D[sp - 1]) | 0;
        break;
      case 0x1b:
        if (sp < 1) return done(2);
        D[sp - 1] = ~D[sp - 1];
        break;
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        if (op === 0x30) { pc = nx + rel; break; }
        if (sp < 1) return done(2);
        const v = D[--sp];
        if ((op === 0x31) === (v === 0)) pc = nx + rel;
        break;
      }
      case 0x33:
        if (cp === 64) return done(7);
        C[cp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 0x34:
        if (cp === 0) return done(8);
        pc = C[--cp];
        break;
      case 0x40: {
        if (sp < 1) return done(2);
        const a = D[sp - 1];
        if (a < 0 || a >= 256) return done(6);
        D[sp - 1] = M[a];
        break;
      }
      case 0x41: {
        if (sp < 2) return done(2);
        const a = D[sp - 1], v = D[sp - 2];
        if (a < 0 || a >= 256) return done(6);
        sp -= 2; M[a] = v;
        break;
      }
      case 0x50: {
        if (sp < 1) return done(2);
        const v = D[sp - 1];
        let m = v < 0 ? -v : v;
        let len = v < 0 ? 1 : 0;
        let t = m;
        do { len++; t = Math.floor(t / 10); } while (t > 0);
        if (ol + len > 65536) return done(11);
        sp--;
        let i = ol + len;
        do { out[--i] = 48 + (m % 10); m = Math.floor(m / 10); } while (m > 0);
        if (v < 0) out[ol] = 45;
        ol += len;
        break;
      }
      case 0x51:
        if (sp < 1) return done(2);
        if (ol + 1 > 65536) return done(11);
        out[ol++] = D[--sp] & 255;
        break;
      case 0x52:
        if (sp >= 256) return done(3);
        D[sp++] = ip < inp.length ? inp[ip++] : -1;
        break;
      case 0x53:
        if (sp < 1) return done(2);
        return done(D[--sp] & 255);
      default:
        return done(5);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
