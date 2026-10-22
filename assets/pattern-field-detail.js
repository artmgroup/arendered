const ease = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const MAX_DETAIL_MOTION_SPEED = .06;

export const detailBlend = (turbulence, strength, ramp = null) => {
  const progress = ramp === null ? 1 - turbulence : ramp < .58 ? 1 - (ramp - .14) / .42 : (ramp - .60) / .38;
  return strength * Math.min(1, Math.max(0, progress));
};

export const createDetailTiming = (seed) => {
  const random = (salt) => {
    const value = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  return {
    phase: seed * Math.PI * 2, rate: .11 + (.5 + .5 * Math.sin(seed * 17)) * .12,
    moveStart: random(1) * .48, moveSpan: .34 + random(2) * .18,
    sizeStart: random(3) * .48, sizeSpan: .34 + random(4) * .18,
    lightStart: random(5) * .48, lightSpan: .34 + random(6) * .18,
  };
};

const windowProgress = (progress, start, span, nextStart, nextSpan, mix) => ease((progress - start - (nextStart - start) * mix) / (span + (nextSpan - span) * mix));

const limitMotion = (result, x, y, time) => {
  const previousTime = result.motionTime;
  const previousX = result.motionX;
  const previousY = result.motionY;
  const elapsed = time - previousTime;
  if (!Number.isFinite(previousTime) || !Number.isFinite(previousX) || !Number.isFinite(previousY) || elapsed <= 0 || elapsed > .25) {
    result.motionTime = time;
    result.motionX = x;
    result.motionY = y;
    return;
  }
  const deltaX = x - previousX;
  const deltaY = y - previousY;
  const distance = Math.hypot(deltaX, deltaY);
  const maxDistance = MAX_DETAIL_MOTION_SPEED * elapsed;
  if (distance <= maxDistance) {
    result.motionTime = time;
    result.motionX = x;
    result.motionY = y;
    return;
  }
  const ratio = maxDistance / distance;
  const limitedX = previousX + deltaX * ratio;
  const limitedY = previousY + deltaY * ratio;
  result.motionTime = time;
  result.motionX = limitedX;
  result.motionY = limitedY;
};

const driftPose = (seed, time, timing) => {
  const { phase, rate } = timing;
  return {
    x: Math.sin(time * rate + phase) * .075 + Math.cos(time * rate * .61 + phase * 3) * .035,
    y: Math.cos(time * rate * .83 + phase * 2) * .075 + Math.sin(time * rate * .47 - phase) * .035,
    rotation: Math.sin(time * rate * .7 + phase) * .6 + (seed - .5) * .7,
    pulse: Math.sin(time * (.8 + seed * .5) + phase),
  };
};

export const detailPose = (progress, seed, quadrant, result, time, timing, nextTiming = timing, mix = 0, fromSeed = seed, nextSeed = seed, settledScale = .5) => {
  const arrival = windowProgress(progress, timing.moveStart, timing.moveSpan, nextTiming.moveStart, nextTiming.moveSpan, mix);
  const growth = windowProgress(progress, timing.sizeStart, timing.sizeSpan, nextTiming.sizeStart, nextTiming.sizeSpan, mix);
  const reveal = windowProgress(progress, timing.lightStart, timing.lightSpan, nextTiming.lightStart, nextTiming.lightSpan, mix);
  const free = 1 - arrival;
  // Settled children still pulse and obey the motion limiter, but no longer need a free-flight pose.
  const from = arrival === 1 ? { x: 0, y: 0, rotation: 0, pulse: Math.sin(time * (.8 + fromSeed * .5) + timing.phase) } : driftPose(fromSeed, time, timing);
  const to = fromSeed === nextSeed ? from : arrival === 1 ? { x: 0, y: 0, rotation: 0, pulse: Math.sin(time * (.8 + nextSeed * .5) + nextTiming.phase) } : driftPose(nextSeed, time, nextTiming);
  const depth = 1.8 + seed * 1.8;
  const perspective = 1 / (1 + depth * (1 - growth));
  const drift = free * (quadrant === 0 ? arrival : 1);
  limitMotion(
    result,
    (from.x + (to.x - from.x) * mix) * drift,
    (from.y + (to.y - from.y) * mix) * drift,
    time,
  );
  result.arrival = arrival;
  result.scale = quadrant === 0 ? 1 - (1 - settledScale) * growth : settledScale * perspective;
  result.offset = quadrant === 0 ? arrival : 1;
  result.visibility = quadrant === 0 ? 1 : reveal / (1 + depth * (1 - reveal));
  result.dx = result.motionX;
  result.dy = result.motionY;
  result.rotation = (from.rotation + (to.rotation - from.rotation) * mix) * drift;
  result.pulse = from.pulse + (to.pulse - from.pulse) * mix;
  return result;
};

export const createEdgeFeather = () => {
  const cache = new WeakMap();
  return (context, width, height, amount) => {
    if (!amount) return;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    const band = Math.min(width, height) * amount;
    let entry = cache.get(context);
    if (!entry || entry.width !== width || entry.height !== height || entry.amount !== amount) {
      const edges = [
        [0, 0, band, 0, 0, 0, band, height],
        [width, 0, width - band, 0, width - band, 0, band, height],
        [0, 0, 0, band, 0, 0, width, band],
        [0, height, 0, height - band, 0, height - band, width, band],
      ].map(([x0, y0, x1, y1, x, y, w, h]) => {
        const gradient = context.createLinearGradient(x0, y0, x1, y1);
        for (let step = 0; step <= 16; step += 1) {
          const t = step / 16;
          gradient.addColorStop(t, `rgba(0,0,0,${1 - t * t * (3 - 2 * t)})`);
        }
        return { gradient, x, y, w, h };
      });
      entry = { width, height, amount, edges }; cache.set(context, entry);
    }
    for (const { gradient, x, y, w, h } of entry.edges) {
      context.fillStyle = gradient; context.fillRect(x, y, w, h);
    }
    context.restore();
  };
};
