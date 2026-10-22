const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const smooth = (low, high, value) => { const t = clamp((value - low) / (high - low), 0, 1); return t * t * (3 - 2 * t); };

export const daySkyGain = (pixels, grid) => {
  const saturation = [];
  for (let y = 0; y < Math.ceil(grid * .22); y += 1) for (let x = 0; x < grid; x += 1) {
    const at = (y * grid + x) * 4;
    const r = pixels[at], g = pixels[at + 1], b = pixels[at + 2];
    if (b > r + 20 && b > g + 8 && b > 120) saturation.push((b - Math.min(r, g)) / b);
  }
  if (saturation.length < grid) return 1;
  saturation.sort((a, b) => a - b);
  return clamp(.68 / saturation[Math.floor(saturation.length / 2)], .95, 1.55);
};

// Adjust sampled pigment, never the source image or motif alpha; shared by preview and export.
export const matchDayTone = (color, y, skyGain, amount) => {
  if (!amount) return color;
  const max = Math.max(...color), min = Math.min(...color);
  if (max === min) return color;
  const saturation = (max - min) / max;
  const sky = (1 - smooth(.35, .65, y)) * smooth(12, 40, color[2] - color[0]) * smooth(0, 25, color[2] - color[1]) * smooth(.1, .35, saturation);
  const vibrance = 1 + .1 * (1 - saturation) * smooth(.04, .18, saturation);
  const gain = Math.min(1 + amount * (vibrance - 1 + (skyGain - vibrance) * sky), Math.max(1, .88 / saturation));
  return color.map((value) => clamp(max - (max - value) * gain, 0, 255));
};
