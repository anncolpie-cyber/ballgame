export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

export function randVelocity(speed) {
  const angle = Math.random() * Math.PI * 2;
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
  };
}

export function normalizeSpeed(body, minSpeed, maxSpeed) {
  const speed = Math.hypot(body.vx, body.vy);
  if (speed < 0.001) {
    const angle = Math.random() * Math.PI * 2;
    body.vx = Math.cos(angle) * minSpeed;
    body.vy = Math.sin(angle) * minSpeed;
    return;
  }
  if (speed < minSpeed || speed > maxSpeed) {
    const target = clamp(speed, minSpeed, maxSpeed);
    body.vx = body.vx / speed * target;
    body.vy = body.vy / speed * target;
  }
}

export function bounceBody(body, radius, arenaSize) {
  const max = arenaSize - radius * 2;
  if (body.x < 0) { body.x = 0; body.vx = Math.abs(body.vx); }
  if (body.y < 0) { body.y = 0; body.vy = Math.abs(body.vy); }
  if (body.x > max) { body.x = max; body.vx = -Math.abs(body.vx); }
  if (body.y > max) { body.y = max; body.vy = -Math.abs(body.vy); }
}

export function rotatePointAround(x, y, px, py, angle) {
  const dx = x - px;
  const dy = y - py;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: px + dx * c - dy * s, y: py + dx * s + dy * c };
}

export function circleHitsSegment(cx, cy, radius, x1, y1, x2, y2, padding = 0) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.001) return distance(cx, cy, x1, y1) <= radius + padding;
  const t = clamp(((cx - x1) * dx + (cy - y1) * dy) / lenSq, 0, 1);
  const hitX = x1 + dx * t;
  const hitY = y1 + dy * t;
  return distance(cx, cy, hitX, hitY) <= radius + padding;
}

export function localPointToWorld(originX, originY, originLocalX, originLocalY, localX, localY, angle) {
  return rotatePointAround(
    originX + localX - originLocalX,
    originY + localY - originLocalY,
    originX,
    originY,
    angle
  );
}
