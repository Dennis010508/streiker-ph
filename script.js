'use strict';
/* ================================================================
   CRIMSON STRIKER — script.js  (versión con obstáculos)
   Clases: Obstacle · Player · Enemy · Projectile · Game
   ================================================================ */

// ── Utilidades ──────────────────────────────────────────────────
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const dist  = (a, b)      => Math.hypot(a.x - b.x, a.y - b.y);
const circlesCollide = (a, b) => dist(a, b) < a.radius + b.radius;
const rndInt = (n) => Math.floor(Math.random() * n);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ================================================================
// OBSTACLE — pared rectangular sólida que bloquea jugador y enemigos
// ================================================================
class Obstacle {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
  }

  /** Devuelve true si el círculo (cx,cy,r) toca este rectángulo. */
  hits(cx, cy, r) {
    const nx = clamp(cx, this.x, this.x + this.w);
    const ny = clamp(cy, this.y, this.y + this.h);
    return Math.hypot(cx - nx, cy - ny) < r;
  }

  /**
   * Empuja la entidad circular fuera del obstáculo.
   * Se llama cada frame para jugador y enemigos.
   */
  push(entity) {
    if (!this.hits(entity.x, entity.y, entity.radius)) return;
    const nx = clamp(entity.x, this.x, this.x + this.w);
    const ny = clamp(entity.y, this.y, this.y + this.h);
    const dx = entity.x - nx;
    const dy = entity.y - ny;
    const d  = Math.hypot(dx, dy);
    if (d > 0) {
      // Centro fuera pero círculo solapado: empujar hacia afuera
      const ovlp = entity.radius - d + 0.6;
      entity.x += (dx / d) * ovlp;
      entity.y += (dy / d) * ovlp;
    } else {
      // Centro dentro del rectángulo: salir por el lado más cercano
      const tL = entity.x - this.x;
      const tR = (this.x + this.w) - entity.x;
      const tT = entity.y - this.y;
      const tB = (this.y + this.h) - entity.y;
      const m  = Math.min(tL, tR, tT, tB);
      if      (m === tL) entity.x = this.x           - entity.radius - 0.6;
      else if (m === tR) entity.x = this.x + this.w  + entity.radius + 0.6;
      else if (m === tT) entity.y = this.y           - entity.radius - 0.6;
      else               entity.y = this.y + this.h  + entity.radius + 0.6;
    }
  }

  draw(ctx) {
    ctx.save();
    // Contorno y sombra crimson
    ctx.shadowColor = '#ff2741';
    ctx.shadowBlur  = 12;

    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.strokeStyle = 'rgba(255,39,65,0.85)';
    ctx.lineWidth   = 2.5;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    // Relleno interior muy sutil
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = 'rgba(255,39,65,0.07)';
    ctx.fillRect(this.x + 2, this.y + 2, this.w - 4, this.h - 4);

    // Puntos de esquina tipo conector táctico
    ctx.fillStyle = '#ff2741';
    [[this.x + 4,       this.y + 4],
     [this.x + this.w - 4, this.y + 4],
     [this.x + 4,       this.y + this.h - 4],
     [this.x + this.w - 4, this.y + this.h - 4]].forEach(([px, py]) => {
      ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
    });

    // Línea central (decorativa, proporcional al lado más largo)
    ctx.strokeStyle = 'rgba(255,39,65,0.25)';
    ctx.lineWidth   = 1;
    if (this.w > this.h) {
      const cy = this.y + this.h / 2;
      ctx.beginPath(); ctx.moveTo(this.x + 8, cy); ctx.lineTo(this.x + this.w - 8, cy);
      ctx.stroke();
    } else {
      const cx = this.x + this.w / 2;
      ctx.beginPath(); ctx.moveTo(cx, this.y + 8); ctx.lineTo(cx, this.y + this.h - 8);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ================================================================
// PERSONAJES — 6 formas del jugador
// ================================================================
const CHARACTERS = [
  // 0 · SCOUT — disponible desde el inicio
  {
    id:'scout', name:'Scout', unlockAt:0, color:'#2ee6ff',
    desc:'El explorador original.',
    draw(ctx, x, y, r, angle, flash) {
      ctx.save(); ctx.translate(x, y);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = flash ? '#fff' : '#2ee6ff'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#08121a'; ctx.stroke();
      ctx.rotate(angle);
      ctx.beginPath(); ctx.moveTo(r+6,0); ctx.lineTo(r-6,-7); ctx.lineTo(r-6,7);
      ctx.closePath(); ctx.fillStyle = '#e8fbff'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#08121a'; ctx.stroke();
      ctx.restore();
    }
  },
  // 1 · CABALLERO — 700 pts
  {
    id:'knight', name:'Caballero', unlockAt:700, color:'#b0bec5',
    desc:'Guerrero de acero.',
    draw(ctx, x, y, r, angle, flash) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0,-(r+5)); ctx.lineTo(r+5,0); ctx.lineTo(0,r+5); ctx.lineTo(-(r+5),0);
      ctx.closePath();
      ctx.fillStyle = flash ? '#fff' : '#90a4ae'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#1a1a2e'; ctx.stroke();
      ctx.fillStyle = '#455a64';
      ctx.fillRect(-2.5, -(r-2), 5, (r-2)*2);
      ctx.fillRect(-(r-2), -2.5, (r-2)*2, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.moveTo(0,-(r+5)); ctx.lineTo(r+5,0); ctx.lineTo(0,0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  },
  // 2 · FANTASMA — 900 pts
  {
    id:'phantom', name:'Fantasma', unlockAt:900, color:'#ce93d8',
    desc:'Espiritu veloz.',
    draw(ctx, x, y, r, angle, flash) {
      ctx.save(); ctx.translate(x, y);
      const back = angle + Math.PI;
      [back-0.45, back, back+0.45].forEach((wa, i) => {
        ctx.beginPath();
        ctx.moveTo(Math.cos(back)*r*0.55, Math.sin(back)*r*0.55);
        ctx.quadraticCurveTo(Math.cos(wa)*r*1.35, Math.sin(wa)*r*1.35,
                             Math.cos(wa)*r*1.9,  Math.sin(wa)*r*1.9);
        ctx.lineWidth = 4 - i*1.2;
        ctx.strokeStyle = `rgba(171,71,188,${0.65-i*0.15})`; ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
      ctx.fillStyle = flash ? '#fff' : '#ab47bc'; ctx.fill();
      ctx.lineWidth = 3.5; ctx.strokeStyle = '#1a0030'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r*0.55, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(206,147,216,0.45)'; ctx.fill();
      const fx = Math.cos(angle), fy = Math.sin(angle);
      const px = -Math.sin(angle)*r*0.27, py = Math.cos(angle)*r*0.27;
      [[fx*r*0.28+px, fy*r*0.28+py],[fx*r*0.28-px, fy*r*0.28-py]].forEach(([ex,ey]) => {
        ctx.beginPath(); ctx.arc(ex, ey, r*0.19, 0, Math.PI*2);
        ctx.fillStyle = '#e040fb'; ctx.fill();
        ctx.beginPath(); ctx.arc(ex+fx*r*0.07, ey+fy*r*0.07, r*0.09, 0, Math.PI*2);
        ctx.fillStyle = '#fff'; ctx.fill();
      });
      ctx.restore();
    }
  },
  // 3 · MECH — 1000 pts
  {
    id:'mech', name:'Mech', unlockAt:1000, color:'#ffa726',
    desc:'Robot de combate.',
    draw(ctx, x, y, r, angle, flash) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2 - Math.PI/6;
        i===0 ? ctx.moveTo(Math.cos(a)*(r+3), Math.sin(a)*(r+3))
              : ctx.lineTo(Math.cos(a)*(r+3), Math.sin(a)*(r+3));
      }
      ctx.closePath();
      ctx.fillStyle = flash ? '#fff' : '#e65100'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#3e1700'; ctx.stroke();
      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(-(r+2), -r*0.22, (r+2)*2, r*0.44);
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillRect(-r*0.55, -r*0.12, r*0.25, r*0.22);
      ctx.strokeStyle = '#3e1700'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0,-(r+3)); ctx.lineTo(0,-(r+14)); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,-(r+16),3.5,0,Math.PI*2);
      ctx.fillStyle = '#ff5722'; ctx.fill();
      ctx.restore();
    }
  },
  // 4 · DRAGON — 1200 pts
  {
    id:'dragon', name:'Dragon', unlockAt:1200, color:'#66bb6a',
    desc:'Bestia ancestral.',
    draw(ctx, x, y, r, angle, flash) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.beginPath(); ctx.ellipse(0,0,r*1.05,r*0.88,0,0,Math.PI*2);
      ctx.fillStyle = flash ? '#fff' : '#388e3c'; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#1b5e20'; ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.5;
      [[-r*0.32,r*0.12,r*0.38],[r*0.08,-r*0.22,r*0.32],[-r*0.08,r*0.42,r*0.28]].forEach(([sx,sy,sr])=>{
        ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI); ctx.stroke();
      });
      ctx.fillStyle = '#1b5e20'; ctx.strokeStyle = '#0a3d12'; ctx.lineWidth = 2;
      [[-r*0.3,-(r+2)],[r*0.15,-(r+2)]].forEach(([hx,hy])=>{
        ctx.beginPath(); ctx.moveTo(hx,hy+r*0.28); ctx.lineTo(hx-r*0.13,hy-r*0.2);
        ctx.lineTo(hx+r*0.13,hy-r*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      ctx.beginPath(); ctx.ellipse(r*0.28,-r*0.18,r*0.2,r*0.22,0,0,Math.PI*2);
      ctx.fillStyle = '#ff6f00'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(r*0.3,-r*0.18,r*0.09,r*0.14,0,0,Math.PI*2);
      ctx.fillStyle = '#212121'; ctx.fill();
      ctx.beginPath(); ctx.arc(r*0.26,-r*0.22,r*0.05,0,Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();
    }
  },
  // 5 · VELOZ — 1500 pts (Sonic-like)
  {
    id:'veloz', name:'Veloz', unlockAt:1500, color:'#1976d2',
    desc:'Ni el viento lo alcanza.',
    draw(ctx, x, y, r, angle, flash) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      // Puas traseras
      const spikeAngles = [-2.75,-2.95,Math.PI,2.95,2.75];
      ctx.fillStyle = '#0d1b4b';
      spikeAngles.forEach((sa, i) => {
        const len = r*(i===2?1.25:0.95), hw = 0.19;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa-hw)*r*0.68, Math.sin(sa-hw)*r*0.68);
        ctx.lineTo(Math.cos(sa)*(r+len*0.65), Math.sin(sa)*(r+len*0.65));
        ctx.lineTo(Math.cos(sa+hw)*r*0.68, Math.sin(sa+hw)*r*0.68);
        ctx.closePath(); ctx.fill();
      });
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
      ctx.fillStyle = flash ? '#fff' : '#1976d2'; ctx.fill();
      ctx.lineWidth = 3.5; ctx.strokeStyle = '#0d1b4b'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(r*0.1,r*0.22,r*0.46,r*0.4,0,0,Math.PI*2);
      ctx.fillStyle = '#e8f4fd'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(r*0.38,-r*0.16,r*0.28,r*0.22,-0.28,0,Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(r*0.42,-r*0.17,r*0.18,r*0.16,-0.28,0,Math.PI*2);
      ctx.fillStyle = '#00c853'; ctx.fill();
      ctx.beginPath(); ctx.arc(r*0.44,-r*0.18,r*0.1,0,Math.PI*2);
      ctx.fillStyle = '#111'; ctx.fill();
      ctx.beginPath(); ctx.arc(r*0.38,-r*0.23,r*0.05,0,Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
      [-r*0.32, r*0.32].forEach(sx => {
        ctx.beginPath(); ctx.ellipse(sx,r*0.98,r*0.25,r*0.16,0,0,Math.PI*2);
        ctx.fillStyle = '#c62828'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#4a0000'; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(sx,r*0.94,r*0.18,r*0.06,0,0,Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
      });
      ctx.restore();
    }
  },
];

// ================================================================
// SKINS DE ENEMIGOS — 4 tipos
// ================================================================
const ENEMY_SKINS = [
  // 0 · ERIZO — oleada 1+
  {
    id:'erizo', name:'Erizo', waveMin:1,
    baseRadius:16, speedMult:1.0, damage:10,
    draw(ctx, x, y, r, angle) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI/2);
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i/7)*Math.PI*2;
        const bx=Math.cos(a)*(r+6), by=Math.sin(a)*(r+6);
        const ia=a+Math.PI/7;
        const ix=Math.cos(ia)*(r-3), iy=Math.sin(ia)*(r-3);
        i===0 ? ctx.moveTo(bx,by) : ctx.lineTo(bx,by);
        ctx.lineTo(ix,iy);
      }
      ctx.closePath();
      ctx.fillStyle='#ff2741'; ctx.fill();
      ctx.lineWidth=3.5; ctx.strokeStyle='#3a0008'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0,0,r*0.48,0,Math.PI*2);
      ctx.fillStyle='#7a0e1d'; ctx.fill();
      ctx.restore();
    }
  },
  // 1 · ESPECTRO — oleada 3+, rapido, bajo daño
  {
    id:'espectro', name:'Espectro', waveMin:3,
    baseRadius:15, speedMult:1.4, damage:8,
    draw(ctx, x, y, r, angle) {
      ctx.save(); ctx.translate(x, y);
      const back = angle + Math.PI;
      [back-0.5, back, back+0.5].forEach((wa, i) => {
        ctx.beginPath();
        ctx.moveTo(Math.cos(back)*r*0.5, Math.sin(back)*r*0.5);
        ctx.quadraticCurveTo(Math.cos(wa)*r*1.3, Math.sin(wa)*r*1.3,
                             Math.cos(wa)*r*2.0, Math.sin(wa)*r*2.0);
        ctx.lineWidth = 3.5 - i;
        ctx.strokeStyle = `rgba(156,39,176,${0.55-i*0.15})`; ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
      ctx.fillStyle='#7b1fa2'; ctx.fill();
      ctx.lineWidth=3; ctx.strokeStyle='#1a0030'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0,0,r*0.52,0,Math.PI*2);
      ctx.fillStyle='rgba(225,190,231,0.55)'; ctx.fill();
      const fx=Math.cos(angle)*r*0.28, fy=Math.sin(angle)*r*0.28;
      const px=-Math.sin(angle)*r*0.24, py=Math.cos(angle)*r*0.24;
      [[fx+px,fy+py],[fx-px,fy-py]].forEach(([ex,ey]) => {
        ctx.beginPath(); ctx.arc(ex,ey,r*0.2,0,Math.PI*2);
        ctx.fillStyle='#ea80fc'; ctx.fill();
        ctx.beginPath(); ctx.arc(ex+Math.cos(angle)*r*0.07, ey+Math.sin(angle)*r*0.07, r*0.1, 0, Math.PI*2);
        ctx.fillStyle='#fff'; ctx.fill();
      });
      ctx.restore();
    }
  },
  // 2 · ESCARABAJO — oleada 5+, lento, daño alto
  {
    id:'escarabajo', name:'Escarabajo', waveMin:5,
    baseRadius:19, speedMult:0.75, damage:18,
    draw(ctx, x, y, r, angle) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle - Math.PI/2);
      ctx.beginPath(); ctx.ellipse(0,0,r*0.72,r,0,0,Math.PI*2);
      ctx.fillStyle='#2e7d32'; ctx.fill();
      ctx.lineWidth=3.5; ctx.strokeStyle='#071a07'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,-r*0.85); ctx.lineTo(0,r*0.65);
      ctx.lineWidth=2; ctx.strokeStyle='#1b5e20'; ctx.stroke();
      ctx.strokeStyle='rgba(0,0,0,0.28)'; ctx.lineWidth=1.5;
      [[-r*0.22,0,r*0.4,r*0.62],[r*0.22,0,r*0.4,r*0.62]].forEach(([ex,ey,ew,eh]) => {
        ctx.beginPath(); ctx.ellipse(ex,ey,ew,eh,0,0,Math.PI*2); ctx.stroke();
      });
      ctx.fillStyle='#1b5e20'; ctx.strokeStyle='#071a07'; ctx.lineWidth=2;
      [[-r*0.3,-(r+5)],[r*0.3,-(r+5)]].forEach(([px,py]) => {
        ctx.beginPath(); ctx.arc(px,py,r*0.2,0,Math.PI*2); ctx.fill(); ctx.stroke();
      });
      [[-r*0.27,-r*0.72],[r*0.27,-r*0.72]].forEach(([ex,ey]) => {
        ctx.beginPath(); ctx.arc(ex,ey,r*0.17,0,Math.PI*2);
        ctx.fillStyle='#ff6f00'; ctx.fill();
      });
      ctx.restore();
    }
  },
  // 3 · BRUTO — oleada 8+, enorme, muy peligroso
  {
    id:'bruto', name:'Bruto', waveMin:8,
    baseRadius:24, speedMult:0.65, damage:28,
    draw(ctx, x, y, r, angle) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI/2);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a=(i/5)*Math.PI*2;
        const bx=Math.cos(a)*(r+11), by=Math.sin(a)*(r+11);
        const ia=a+Math.PI/5;
        const ix=Math.cos(ia)*(r-4), iy=Math.sin(ia)*(r-4);
        i===0 ? ctx.moveTo(bx,by) : ctx.lineTo(bx,by);
        ctx.lineTo(ix,iy);
      }
      ctx.closePath();
      ctx.fillStyle='#bf360c'; ctx.fill();
      ctx.lineWidth=4.5; ctx.strokeStyle='#3e1400'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0,0,r*0.6,0,Math.PI*2);
      ctx.fillStyle='#e64a19'; ctx.fill();
      [[-r*0.22,-r*0.12],[r*0.22,-r*0.12]].forEach(([ex,ey]) => {
        ctx.beginPath(); ctx.arc(ex,ey,r*0.14,0,Math.PI*2);
        ctx.fillStyle='#fff176'; ctx.fill();
        ctx.beginPath(); ctx.arc(ex,ey+r*0.04,r*0.07,0,Math.PI*2);
        ctx.fillStyle='#1a1a1a'; ctx.fill();
      });
      ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-r*0.36,-r*0.26); ctx.lineTo(-r*0.08,-r*0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r*0.36,-r*0.26); ctx.lineTo(r*0.08,-r*0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,r*0.15,r*0.22,0.25,Math.PI-0.25);
      ctx.lineWidth=2.5; ctx.stroke();
      ctx.restore();
    }
  },
];

// ================================================================
// PLAYER
// ================================================================
class Player {
  constructor(x, y, charIdx) {
    this.x = x; this.y = y;
    this.radius = 18;
    this.maxHealth = 100; this.health = 100;
    this.facingAngle = -Math.PI / 2;
    this.invulnerableUntil = 0;
    this.hitFlashUntil = 0;
    this.setCharacter(charIdx);
  }
  setCharacter(idx) {
    this.charIdx = clamp(idx, 0, CHARACTERS.length - 1);
    this.char    = CHARACTERS[this.charIdx];
    this.speed   = this.charIdx === 5 ? 300 : 240;
  }
  get isInvulnerable() { return performance.now() < this.invulnerableUntil; }
  takeDamage(amount) {
    if (this.isInvulnerable) return;
    this.health = clamp(this.health - amount, 0, this.maxHealth);
    this.invulnerableUntil = performance.now() + 800;
    this.hitFlashUntil     = performance.now() + 150;
  }
  /**
   * Mueve al jugador según un vector de movimiento (mvx, mvy).
   * El vector puede venir del teclado (componentes -1/0/1) o del joystick
   * táctil (analógico, magnitud entre 0 y 1). Si la magnitud supera 1
   * (ej. diagonal de teclado) se normaliza; si es analógica y menor a 1
   * se respeta para permitir movimiento lento y preciso desde el joystick.
   */
  update(dt, mvx, mvy, bounds, obstacles) {
    let dx = mvx, dy = mvy;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    if (len > 0.001) this.facingAngle = Math.atan2(dy, dx);
    this.x += dx * this.speed * dt;
    this.y += dy * this.speed * dt;
    // Límites del canvas
    this.x = clamp(this.x, this.radius, bounds.width  - this.radius);
    this.y = clamp(this.y, this.radius, bounds.height - this.radius);
    // Colisión con obstáculos (2 pasos para robustez)
    for (let it = 0; it < 2; it++)
      for (const obs of obstacles) obs.push(this);
    this.x = clamp(this.x, this.radius, bounds.width  - this.radius);
    this.y = clamp(this.y, this.radius, bounds.height - this.radius);
  }
  draw(ctx) {
    const flash = performance.now() < this.hitFlashUntil;
    this.char.draw(ctx, this.x, this.y, this.radius, this.facingAngle, flash);
    if (this.isInvulnerable) {
      ctx.save();
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.restore();
    }
  }
}

// ================================================================
// ENEMY
// ================================================================
class Enemy {
  constructor(x, y, baseSpeed, skin) {
    this.x = x; this.y = y;
    this.skin   = skin;
    this.radius = skin.baseRadius;
    this.speed  = baseSpeed * skin.speedMult;
    this.damage = skin.damage;
    this.angle  = 0;
  }
  update(dt, target, obstacles) {
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    // Colisión con obstáculos — crea el efecto de "rodear" como Pac-Man
    for (let it = 0; it < 2; it++)
      for (const obs of obstacles) obs.push(this);
  }
  draw(ctx) { this.skin.draw(ctx, this.x, this.y, this.radius, this.angle); }
}

// ================================================================
// PROJECTILE
// ================================================================
class Projectile {
  constructor(x, y, angle, speed = 630, radius = 5) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = radius;
  }
  update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; }
  isOffscreen(w, h) { return this.x<-20||this.x>w+20||this.y<-20||this.y>h+20; }
  draw(ctx) {
    ctx.save();
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
    ctx.fillStyle='#fff58a'; ctx.shadowColor='#ffe45e'; ctx.shadowBlur=8; ctx.fill();
    ctx.lineWidth=2; ctx.strokeStyle='#7a5b00'; ctx.stroke();
    ctx.restore();
  }
}

// ================================================================
// GAME
// ================================================================
class Game {
  static STATE = {MENU:'menu',SELECT:'select',PLAYING:'playing',PAUSED:'paused',GAMEOVER:'gameover'};

  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.W = canvas.width; this.H = canvas.height;

    this.keys        = new Set();
    this.player      = null;
    this.enemies     = [];
    this.projectiles = [];

    this.score = 0; this.wave = 1;
    this.highScore       = parseInt(localStorage.getItem('cs_hs')   || '0', 10);
    this.selectedCharIdx = parseInt(localStorage.getItem('cs_char') || '0', 10);

    // ── Parámetros de oleadas ──
    this.baseSpawnInterval = 2000; this.minSpawnInterval = 650;
    this.spawnInterval = this.baseSpawnInterval;
    this.waveDuration  = 15000;
    this.timeSinceSpawn = 0; this.waveTimer = 0;
    this.shootCooldown = 140; this.nextShot = 0;

    // ── Obstáculos ──
    this.obstacles         = [];
    this.obstaclesActive   = false;
    this.nextObstacleRegen = 1000; // primer umbral: 1000 pts de la partida actual
    this.obstacleFlash     = null; // { start, dur }
    this.sparks            = [];   // partículas de impacto bala-pared (existe desde el inicio)

    // ── Notificaciones ──
    this.shownUnlocks  = new Set();
    this.isNewRecord   = false;
    this.bannerQueue   = [];
    this.currentBanner = null;
    this.sysNotif      = null; // { text, color, until }

    // ── Controles táctiles (joystick + botón de disparo) ──
    this.joystick = { active: false, dx: 0, dy: 0, pointerId: null };
    this.fireHeld = false;

    this.state = Game.STATE.MENU;
    this.lastTimestamp = null;

    this.ui = {
      healthFill: document.getElementById('healthFill'),
      healthValue:document.getElementById('healthValue'),
      scoreValue: document.getElementById('scoreValue'),
      waveValue:  document.getElementById('waveValue'),
      bestValue:  document.getElementById('bestValue'),
      reconValue: document.getElementById('reconValue'),
      dangerVignette: document.getElementById('dangerVignette'),

      startScreen:   document.getElementById('startScreen'),
      menuHighScore: document.getElementById('menuHighScore'),
      startBtn:      document.getElementById('startBtn'),
      menuSelectBtn: document.getElementById('menuSelectBtn'),

      selectScreen:    document.getElementById('selectScreen'),
      charGrid:        document.getElementById('charGrid'),
      selectHighScore: document.getElementById('selectHighScore'),
      selectPlayBtn:   document.getElementById('selectPlayBtn'),
      selectBackBtn:   document.getElementById('selectBackBtn'),

      pauseScreen:     document.getElementById('pauseScreen'),
      resumeBtn:       document.getElementById('resumeBtn'),
      pauseRestartBtn: document.getElementById('pauseRestartBtn'),

      gameOverScreen:  document.getElementById('gameOverScreen'),
      finalScore:      document.getElementById('finalScore'),
      newRecordBanner: document.getElementById('newRecordBanner'),
      retryBtn:        document.getElementById('retryBtn'),
      goToSelectBtn:   document.getElementById('goToSelectBtn'),

      actionBar:  document.getElementById('actionBar'),
      pauseBtn:   document.getElementById('pauseBtn'),
      restartBtn: document.getElementById('restartBtn'),

      // Controles táctiles
      joystickZone: document.getElementById('joystickZone'),
      joystickKnob: document.getElementById('joystickKnob'),
      fireButton:   document.getElementById('fireButton'),
    };

    this._bindInput();
    this._bindButtons();
    this._bindMobileControls();
    this._syncScreens();
  }

  // ── Input ─────────────────────────────────────────────────────
  _bindInput() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase(); this.keys.add(k);
      if (k === 'escape' || k === 'p') this.togglePause();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    this.canvas.addEventListener('click', e => {
      if (this.state !== Game.STATE.PLAYING) return;
      const r = this.canvas.getBoundingClientRect();
      this._shootAt(
        (e.clientX - r.left) * (this.W / r.width),
        (e.clientY - r.top)  * (this.H / r.height)
      );
    });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  // ── Controles táctiles: joystick analógico + botón de disparo ──
  // Usa la Pointer Events API (funciona con dedo, mouse o lápiz con el
  // mismo código), así que también sirve para probar desde escritorio.
  _bindMobileControls() {
    const zone = this.ui.joystickZone;
    const knob = this.ui.joystickKnob;
    const maxR = 38; // radio máximo de desplazamiento del joystick, en px CSS

    const moveKnob = (dx, dy) => {
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    const onMove = (e) => {
      if (!this.joystick.active || e.pointerId !== this.joystick.pointerId) return;
      e.preventDefault();
      let dx = e.clientX - this.joystick.originX;
      let dy = e.clientY - this.joystick.originY;
      const d = Math.hypot(dx, dy);
      if (d > maxR) { dx = (dx / d) * maxR; dy = (dy / d) * maxR; }
      moveKnob(dx, dy);
      this.joystick.dx = dx / maxR; // componente -1..1
      this.joystick.dy = dy / maxR;
    };

    const onEnd = (e) => {
      if (e.pointerId !== this.joystick.pointerId) return;
      this.joystick.active = false;
      this.joystick.dx = 0; this.joystick.dy = 0;
      moveKnob(0, 0);
    };

    zone.addEventListener('pointerdown', e => {
      e.preventDefault();
      zone.setPointerCapture?.(e.pointerId);
      const rect = zone.getBoundingClientRect();
      this.joystick.active    = true;
      this.joystick.pointerId = e.pointerId;
      this.joystick.originX   = rect.left + rect.width / 2;
      this.joystick.originY   = rect.top  + rect.height / 2;
      onMove(e);
    });
    window.addEventListener('pointermove',  onMove);
    window.addEventListener('pointerup',    onEnd);
    window.addEventListener('pointercancel',onEnd);

    // Botón de disparo: mientras se mantiene presionado, dispara
    // automáticamente hacia donde está orientado el jugador (su
    // facingAngle, que sigue al joystick o a la última tecla usada).
    const fireBtn = this.ui.fireButton;
    const press   = (e) => { e.preventDefault(); this.fireHeld = true;  fireBtn.classList.add('pressed'); };
    const release = ()  => { this.fireHeld = false; fireBtn.classList.remove('pressed'); };
    fireBtn.addEventListener('pointerdown',   press);
    fireBtn.addEventListener('pointerup',     release);
    fireBtn.addEventListener('pointerleave',  release);
    fireBtn.addEventListener('pointercancel', release);
  }

  _bindButtons() {
    this.ui.startBtn.addEventListener('click',       () => this.startGame());
    this.ui.menuSelectBtn.addEventListener('click',  () => this._showSelect());
    this.ui.selectPlayBtn.addEventListener('click',  () => this.startGame());
    this.ui.selectBackBtn.addEventListener('click',  () => { this.state=Game.STATE.MENU; this._syncScreens(); });
    this.ui.resumeBtn.addEventListener('click',      () => this.resume());
    this.ui.pauseRestartBtn.addEventListener('click',() => this.startGame());
    this.ui.retryBtn.addEventListener('click',       () => this.startGame());
    this.ui.goToSelectBtn.addEventListener('click',  () => this._showSelect());
    this.ui.pauseBtn.addEventListener('click',       () => this.togglePause());
    this.ui.restartBtn.addEventListener('click',     () => this.startGame());
  }

  // ── Selección de personaje ────────────────────────────────────
  _showSelect() {
    this.state = Game.STATE.SELECT;
    this._renderCharGrid();
    this._syncScreens();
  }
  _renderCharGrid() {
    const grid = this.ui.charGrid;
    grid.innerHTML = '';
    this.ui.selectHighScore.textContent = this.highScore;
    CHARACTERS.forEach((char, i) => {
      const unlocked = this.highScore >= char.unlockAt;
      const selected = i === this.selectedCharIdx;
      const card = document.createElement('div');
      card.className = ['char-card', unlocked?'unlocked':'locked', selected?'selected':''].join(' ');
      const mc = document.createElement('canvas');
      mc.width = mc.height = 70; mc.className = 'char-preview';
      const mctx = mc.getContext('2d');
      mctx.fillStyle = unlocked ? '#0d0d1e' : '#111';
      mctx.fillRect(0, 0, 70, 70);
      if (unlocked) char.draw(mctx, 35, 38, 21, -Math.PI/2, false);
      else {
        mctx.font='28px sans-serif'; mctx.textAlign='center';
        mctx.textBaseline='middle'; mctx.globalAlpha=0.5;
        mctx.fillStyle='#aaa'; mctx.fillText('?', 35, 35);
      }
      const info = document.createElement('div');
      info.className = 'char-info';
      info.innerHTML =
        '<span class="char-name">'+char.name+'</span>'+
        '<span class="char-req '+(unlocked?'req-ok':'req-locked')+'">'+
          (unlocked ? '&#10003; Desbloqueado' : '&#128274; '+char.unlockAt+' pts')+
        '</span>'+
        '<span class="char-desc">'+char.desc+'</span>';
      card.appendChild(mc); card.appendChild(info);
      if (unlocked) card.addEventListener('click', () => {
        this.selectedCharIdx = i;
        localStorage.setItem('cs_char', i);
        this._renderCharGrid();
      });
      grid.appendChild(card);
    });
  }

  // ── Transiciones de estado ────────────────────────────────────
  startGame() {
    this._resetState();
    this.state = Game.STATE.PLAYING;
    this.lastTimestamp = null;
    this._syncScreens();
  }
  togglePause() {
    if      (this.state===Game.STATE.PLAYING) this.pause();
    else if (this.state===Game.STATE.PAUSED)  this.resume();
  }
  pause()  { if(this.state!==Game.STATE.PLAYING) return; this.state=Game.STATE.PAUSED;  this._syncScreens(); }
  resume() {
    if(this.state!==Game.STATE.PAUSED) return;
    this.state=Game.STATE.PLAYING; this.lastTimestamp=null; this._syncScreens();
  }
  triggerGameOver() {
    this.state = Game.STATE.GAMEOVER;
    this.ui.finalScore.textContent = this.score;
    this.ui.newRecordBanner.style.display = this.isNewRecord ? 'block' : 'none';
    this._syncScreens();
  }
  _syncScreens() {
    const S=Game.STATE;
    this.ui.startScreen.classList.toggle('visible',   this.state===S.MENU);
    this.ui.selectScreen.classList.toggle('visible',  this.state===S.SELECT);
    this.ui.pauseScreen.classList.toggle('visible',   this.state===S.PAUSED);
    this.ui.gameOverScreen.classList.toggle('visible',this.state===S.GAMEOVER);
    const showBar = this.state===S.PLAYING || this.state===S.PAUSED;
    this.ui.actionBar.classList.toggle('hidden', !showBar);
    this.ui.pauseBtn.textContent = this.state===S.PAUSED ? '\u25B6 REANUDAR' : '\u23F8 PAUSAR';
    this.ui.menuHighScore.textContent = this.highScore;
    this.canvas.style.cursor = this.state===S.PLAYING ? 'crosshair' : 'default';
  }

  // ── Obstáculos ────────────────────────────────────────────────
  /**
   * Genera un conjunto nuevo de obstáculos.
   * Zona permitida: centro y alrededores cercanos, fuera de las esquinas.
   */
  _generateObstacles() {
    const W=this.W, H=this.H;
    const EDGE  = 72;   // margen desde cada borde
    const CORNER= 215;  // caja de exclusión en cada esquina

    // ¿Está el punto (cx,cy) en zona permitida?
    const allowed = (cx, cy) => {
      if (cx < EDGE || cx > W-EDGE) return false;
      if (cy < EDGE || cy > H-EDGE) return false;
      // Excluir las cuatro esquinas
      if (cx < CORNER && cy < CORNER)         return false; // arriba-izq
      if (cx > W-CORNER && cy < CORNER)       return false; // arriba-der
      if (cx < CORNER && cy > H-CORNER)       return false; // abajo-izq
      if (cx > W-CORNER && cy > H-CORNER)     return false; // abajo-der
      // Dejar espacio libre alrededor de la posición actual del jugador
      if (this.player && Math.hypot(cx-this.player.x, cy-this.player.y) < 115) return false;
      return true;
    };

    // ¿Solapa con otra ya colocada? (margen 20px)
    const overlaps = (x, y, w, h, list) =>
      list.some(o => x < o.x+o.w+20 && x+w+20 > o.x && y < o.y+o.h+20 && y+h+20 > o.y);

    const result = [];
    const target = 9 + rndInt(4); // 9–12 obstáculos
    let attempts = 0;

    while (result.length < target && attempts < 350) {
      attempts++;
      const horiz  = Math.random() > 0.35;
      const w = horiz ? 60 + rndInt(75) : 18 + rndInt(6);
      const h = horiz ? 18 + rndInt(6)  : 60 + rndInt(75);

      // Sesgar hacia el centro: 60% zona central, 40% zona extendida
      let x, y;
      if (Math.random() < 0.6) {
        // Zona central
        x = 220 + rndInt(W - 440 - w);
        y = 140 + rndInt(H - 280 - h);
      } else {
        x = EDGE + rndInt(W - 2*EDGE - w);
        y = EDGE + rndInt(H - 2*EDGE - h);
      }

      const cx = x + w/2, cy = y + h/2;
      if (!allowed(cx, cy))           continue;
      if (overlaps(x, y, w, h, result)) continue;
      result.push(new Obstacle(x, y, w, h));
    }

    this.obstacles = result;

    // Empujar enemigos fuera de los obstáculos recién generados
    for (const enemy of this.enemies)
      for (let it = 0; it < 3; it++)
        for (const obs of this.obstacles) obs.push(enemy);

    // Flash de reconfiguración
    this.obstacleFlash = { start: performance.now(), dur: 650 };
  }

  _showSysNotif(text, color) {
    this.sysNotif = { text, color, until: performance.now() + 2400 };
  }

  // ── Spawning ──────────────────────────────────────────────────
  _skinForWave() {
    const el = ENEMY_SKINS.filter(s => s.waveMin <= this.wave);
    return el[rndInt(el.length)];
  }
  _perSpawn()   { return clamp(1 + Math.floor((this.wave-1)/2), 1, 6); }
  _maxEnemies() { return Math.min(65, 14 + this.wave*4); }
  _spawnWave() {
    const free = this._maxEnemies() - this.enemies.length;
    const n = clamp(Math.min(this._perSpawn(), free), 0, 8);
    for (let i = 0; i < n; i++) this._spawnOne();
  }
  _spawnOne() {
    const edge = rndInt(4);
    let x, y;
    switch(edge){
      case 0: x=Math.random()*this.W; y=-22; break;
      case 1: x=this.W+22; y=Math.random()*this.H; break;
      case 2: x=Math.random()*this.W; y=this.H+22; break;
      default: x=-22; y=Math.random()*this.H;
    }
    const speed = clamp(60 + this.wave*6 + Math.random()*20, 0, 210);
    this.enemies.push(new Enemy(x, y, speed, this._skinForWave()));
  }

  // ── Disparo ───────────────────────────────────────────────────
  _shootAt(tx, ty) {
    const now = performance.now();
    if (now < this.nextShot) return;
    this.nextShot = now + this.shootCooldown;
    const a = Math.atan2(ty - this.player.y, tx - this.player.x);
    this.projectiles.push(new Projectile(this.player.x, this.player.y, a));
  }

  // ── Colisiones ────────────────────────────────────────────────
  _checkCollisions() {
    outer: for (let i = this.projectiles.length-1; i >= 0; i--) {
      const p = this.projectiles[i];
      for (let j = this.enemies.length-1; j >= 0; j--) {
        if (circlesCollide(p, this.enemies[j])) {
          this.score += 10;
          this.enemies.splice(j, 1);
          this.projectiles.splice(i, 1);
          continue outer;
        }
      }
    }
    for (const e of this.enemies) {
      if (circlesCollide(e, this.player)) {
        const a = Math.atan2(e.y-this.player.y, e.x-this.player.x);
        const push = this.player.radius + e.radius + 14;
        e.x = this.player.x + Math.cos(a)*push;
        e.y = this.player.y + Math.sin(a)*push;
        if (!this.player.isInvulnerable) {
          this.player.takeDamage(e.damage);
          if (this.player.health <= 0 && this.state===Game.STATE.PLAYING)
            this.triggerGameOver();
        }
      }
    }
  }

  // ── Desbloqueos ───────────────────────────────────────────────
  _checkUnlocks(prevHS) {
    CHARACTERS.forEach(ch => {
      if (ch.unlockAt>0 && prevHS<ch.unlockAt && this.highScore>=ch.unlockAt && !this.shownUnlocks.has(ch.id)) {
        this.shownUnlocks.add(ch.id);
        this.bannerQueue.push(ch);
      }
    });
  }

  // ── Update principal ──────────────────────────────────────────
  update(dt) {
    if (this.state !== Game.STATE.PLAYING) return;

    // Vector de movimiento: el joystick táctil tiene prioridad si está
    // activo y desplazado lo suficiente; si no, se usa el teclado.
    let mvx = 0, mvy = 0;
    const jx = this.joystick.dx, jy = this.joystick.dy;
    if (this.joystick.active && Math.hypot(jx, jy) > 0.08) {
      mvx = jx; mvy = jy;
    } else {
      if (this.keys.has('w') || this.keys.has('arrowup'))    mvy -= 1;
      if (this.keys.has('s') || this.keys.has('arrowdown'))  mvy += 1;
      if (this.keys.has('a') || this.keys.has('arrowleft'))  mvx -= 1;
      if (this.keys.has('d') || this.keys.has('arrowright')) mvx += 1;
    }
    this.player.update(dt, mvx, mvy, {width:this.W, height:this.H}, this.obstacles);

    // Botón de disparo táctil: fuego continuo hacia donde mira el jugador
    if (this.fireHeld) {
      const fx = this.player.x + Math.cos(this.player.facingAngle) * 200;
      const fy = this.player.y + Math.sin(this.player.facingAngle) * 200;
      this._shootAt(fx, fy);
    }

    this.timeSinceSpawn += dt*1000;
    this.waveTimer      += dt*1000;

    if (this.timeSinceSpawn >= this.spawnInterval) {
      this.timeSinceSpawn = 0; this._spawnWave();
    }
    if (this.waveTimer >= this.waveDuration) {
      this.waveTimer = 0; this.wave++;
      this.spawnInterval = Math.max(this.minSpawnInterval, this.baseSpawnInterval-(this.wave-1)*110);
    }

    for (const e of this.enemies)     e.update(dt, this.player, this.obstacles);
    for (const p of this.projectiles) p.update(dt);

    // Colisión bala ↔ obstáculo: la bala desaparece y emite chispas
    this.projectiles = this.projectiles.filter(p => {
      if (p.isOffscreen(this.W, this.H)) return false;
      for (const obs of this.obstacles) {
        if (obs.hits(p.x, p.y, p.radius)) {
          this._emitSparks(p.x, p.y);
          return false;        // eliminar proyectil
        }
      }
      return true;
    });

    // Actualizar chispas
    for (const s of this.sparks) {
      s.x    += s.vx * dt;
      s.y    += s.vy * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter(s => s.life > 0);

    this._checkCollisions();

    // Record
    if (this.score > this.highScore) {
      const prev = this.highScore;
      this.highScore = this.score; this.isNewRecord = true;
      localStorage.setItem('cs_hs', this.highScore);
      this._checkUnlocks(prev);
    }

    // ── Activación de obstáculos al llegar a 1000 pts EN ESTA PARTIDA ──
    if (!this.obstaclesActive && this.score >= this.nextObstacleRegen) {
      this.obstaclesActive    = true;
      this.nextObstacleRegen += 350;
      this._generateObstacles();
      this._showSysNotif('⚡  OBSTACULOS ACTIVADOS', '#ff9800');
    }

    // ── Reconfiguración cada 350 puntos a partir de ahí ──
    if (this.obstaclesActive) {
      while (this.score >= this.nextObstacleRegen) {
        this.nextObstacleRegen += 350;
        this._generateObstacles();
        this._showSysNotif('\u21BA  NUEVA CONFIGURACION', '#2ee6ff');
      }
    }

    this._updateHUD();
  }

  // ── HUD ───────────────────────────────────────────────────────
  _updateHUD() {
    const pct = clamp((this.player.health/this.player.maxHealth)*100, 0, 100);
    this.ui.healthFill.style.width  = pct+'%';
    this.ui.healthValue.textContent = Math.ceil(this.player.health);
    this.ui.scoreValue.textContent  = this.score;
    this.ui.waveValue.textContent   = this.wave;
    this.ui.bestValue.textContent   = 'REC: '+this.highScore;
    this.ui.dangerVignette.classList.toggle('active', pct<=30 && pct>0);
    if (this.obstaclesActive) {
      this.ui.reconValue.textContent = 'RECON \u25B8 '+this.nextObstacleRegen;
      this.ui.reconValue.style.display = 'block';
    } else {
      this.ui.reconValue.style.display = 'none';
    }
  }

  // ── Renderizado ───────────────────────────────────────────────
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.fillStyle = '#0c0c10'; ctx.fillRect(0, 0, this.W, this.H);
    this._drawGrid(ctx);
    this._drawObstacles(ctx);     // obstáculos DETRÁS de entidades
    for (const e of this.enemies)     e.draw(ctx);
    for (const p of this.projectiles) p.draw(ctx);
    if (this.player) this.player.draw(ctx);
    this._drawSparks(ctx);        // chispas encima de entidades, debajo de UI
    this._drawBanner(ctx);
    this._drawSysNotif(ctx);
  }

  _drawGrid(ctx) {
    ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
    for (let x=40; x<this.W; x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,this.H); ctx.stroke(); }
    for (let y=40; y<this.H; y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(this.W,y); ctx.stroke(); }
    ctx.restore();
  }

  // ── Dibujar obstáculos con flash de reconfiguración ──────────
  _drawObstacles(ctx) {
    if (!this.obstacles.length) return;

    let flashA = 0;
    if (this.obstacleFlash) {
      const el = performance.now() - this.obstacleFlash.start;
      if (el < this.obstacleFlash.dur) flashA = 1 - el / this.obstacleFlash.dur;
      else this.obstacleFlash = null;
    }

    ctx.save();
    for (const obs of this.obstacles) obs.draw(ctx);

    // Superponer destello blanco
    if (flashA > 0) {
      ctx.globalAlpha = flashA * 0.55;
      ctx.fillStyle   = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur  = 22;
      for (const obs of this.obstacles)
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    }
    ctx.restore();
  }

  // ── Chispas de impacto bala-pared ────────────────────────────
  _emitSparks(x, y) {
    const count = 4 + rndInt(4); // 4–7 partículas
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 140;
      const life  = 0.16 + Math.random() * 0.2;
      this.sparks.push({ x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life, maxLife: life });
    }
  }

  _drawSparks(ctx) {
    for (const s of this.sparks) {
      const t = s.life / s.maxLife;       // 1 → 0
      const r = 3.5 * t;
      ctx.save();
      ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(r, 0.5), 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(255,${Math.floor(180 + 75 * t)},60,${t})`;
      ctx.shadowColor = '#ffe45e';
      ctx.shadowBlur  = 8 * t;
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Banner de desbloqueo de personaje ────────────────────────
  _drawBanner(ctx) {
    if (!this.currentBanner && this.bannerQueue.length)
      this.currentBanner = { char:this.bannerQueue.shift(), start:performance.now(), dur:3200 };
    if (!this.currentBanner) return;

    const el = performance.now() - this.currentBanner.start;
    if (el > this.currentBanner.dur) { this.currentBanner=null; return; }
    const fade = el<350 ? el/350 : el>this.currentBanner.dur-350 ? (this.currentBanner.dur-el)/350 : 1;
    const ch   = this.currentBanner.char;
    const bw=360, bh=76, bx=(this.W-bw)/2, by=Math.round(this.H*0.27);

    ctx.save(); ctx.globalAlpha = fade;
    roundRect(ctx, bx, by, bw, bh, 9);
    ctx.fillStyle='rgba(8,8,18,0.93)'; ctx.fill();
    ctx.strokeStyle='#ffd700'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#ffd700';
    roundRect(ctx, bx, by, 5, bh, 9); ctx.fill();
    roundRect(ctx, bx+bw-5, by, 5, bh, 9); ctx.fill();
    ctx.textAlign='center';
    ctx.fillStyle='#ffd700'; ctx.font='bold 11px Orbitron,sans-serif';
    ctx.fillText('\u2605 PERSONAJE DESBLOQUEADO \u2605', this.W/2, by+24);
    ctx.fillStyle=ch.color; ctx.font='bold 20px Orbitron,sans-serif';
    ctx.shadowColor=ch.color; ctx.shadowBlur=10;
    ctx.fillText(ch.name.toUpperCase(), this.W/2, by+56);
    ctx.restore();
  }

  // ── Notificación de sistema (obstáculos) ─────────────────────
  _drawSysNotif(ctx) {
    if (!this.sysNotif) return;
    const now = performance.now();
    if (now > this.sysNotif.until) { this.sysNotif=null; return; }
    const t     = (this.sysNotif.until - now) / 2400;
    const alpha = t < 0.12 ? (1-t)/0.12 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Orbitron,sans-serif';
    ctx.fillStyle   = this.sysNotif.color;
    ctx.shadowColor = this.sysNotif.color;
    ctx.shadowBlur  = 12;
    ctx.fillText(this.sysNotif.text, this.W/2, this.H - 28);
    ctx.restore();
  }

  // ── Reset de partida ──────────────────────────────────────────
  _resetState() {
    const idx = this.highScore >= CHARACTERS[this.selectedCharIdx].unlockAt
      ? this.selectedCharIdx : 0;
    this.player      = new Player(this.W/2, this.H/2, idx);
    this.enemies     = [];
    this.projectiles = [];
    this.score=0; this.wave=1;
    this.spawnInterval   = this.baseSpawnInterval;
    this.timeSinceSpawn  = 0; this.waveTimer = 0;
    this.nextShot        = 0;
    this.shownUnlocks    = new Set();
    this.isNewRecord     = false;
    this.bannerQueue     = []; this.currentBanner = null;
    this.sysNotif        = null;
    this.sparks          = [];          // partículas de impacto bala-pared

    // Obstáculos: SIEMPRE inactivos al empezar una partida nueva.
    // Se activarán cuando el score de ESTA partida llegue a 1000.
    this.obstacles         = [];
    this.obstacleFlash     = null;
    this.obstaclesActive   = false;
    this.nextObstacleRegen = 1000;
    this._updateHUD();
  }

  // ── Bucle principal ───────────────────────────────────────────
  loop(ts) {
    if (this.lastTimestamp===null) this.lastTimestamp=ts;
    const dt = Math.min((ts-this.lastTimestamp)/1000, 1/30);
    this.lastTimestamp=ts;
    this.update(dt); this.draw();
    requestAnimationFrame(t => this.loop(t));
  }
  start() { requestAnimationFrame(t => this.loop(t)); }
}

// ── Init ─────────────────────────────────────────────────────────
document.fonts.ready.then(() => {
  const game = new Game(document.getElementById('gameCanvas'));
  game.start();
});