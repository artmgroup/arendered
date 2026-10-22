const DEFAULT_PROJECTION_STRENGTH = .65;
const TRAIL_ONE_PERCENT_FADE = .16 - .01 * .12;
const TEXTURE_COVERAGE_GAIN = (1 / TRAIL_ONE_PERCENT_FADE - 1) / DEFAULT_PROJECTION_STRENGTH;
const smooth = (low, high, value) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

export const projectionPigmentGain = (color, boost, strength) => {
  const peak = Math.max(1, ...color), exposure = 1 + boost * .24;
  const oldPeak = Math.min(255, peak * exposure);
  if (!strength || peak * exposure <= 192) return Math.min(exposure, 255 / peak);
  const shoulder = 192 + 63 * (1 - Math.exp(-(peak * exposure - 192) / 63)) / (1 - Math.exp(-(255 * exposure - 192) / 63));
  return (oldPeak + (shoulder - oldPeak) * Math.max(0, Math.min(1, strength))) / peak;
};

export const updateProjectionLuts = (colorLut, alphaLut, gainLut, contrast, strength) => {
  const amount = Math.max(0, Math.min(1, strength));
  const fade = 1 / (1 + 4 * TEXTURE_COVERAGE_GAIN * amount);
  for (let value = 0; value < 256; value += 1) {
    const normalized = value / 255;
    const exponent = 1 / (1 + .9 * amount * smooth(8, 48, value));
    colorLut[value] = Math.max(0, Math.min(255, Math.round((value - 127.5) * contrast + 127.5)));
    gainLut[value] = amount === 0 || value === 0 ? 1 : Math.min(255 / value, normalized ** (exponent - 1));
    alphaLut[value] = amount === 0 ? value : Math.round(255 * normalized / (fade + (1 - fade) * normalized));
  }
};

export const applyProjectionColor = (rgba, index, gainLut, strength = 0) => {
  const peak = Math.max(rgba[index], rgba[index + 1], rgba[index + 2]);
  const low = Math.min(rgba[index], rgba[index + 1], rgba[index + 2]);
  const saturation = peak ? (peak - low) / peak : 0;
  const gain = gainLut[peak];
  const luminance = (.2126 * rgba[index] + .7152 * rgba[index + 1] + .0722 * rgba[index + 2]) * gain;
  const requestedChroma = 1 + Math.max(0, Math.min(1, strength)) * .8 * (1 - saturation) * smooth(.04, .2, saturation);
  const chroma = peak === low ? 1 : Math.max(1, Math.min(requestedChroma, (255 - luminance) / (peak * gain - luminance), luminance / (luminance - low * gain)));
  rgba[index] = Math.round(luminance + (rgba[index] * gain - luminance) * chroma);
  rgba[index + 1] = Math.round(luminance + (rgba[index + 1] * gain - luminance) * chroma);
  rgba[index + 2] = Math.round(luminance + (rgba[index + 2] * gain - luminance) * chroma);
};
