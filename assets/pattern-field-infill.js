// Conservative silhouette enclosure keeps open facial and petal details unfilled.
export const enclosedSilhouette = (rgba, size) => {
  const solid = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    let first = size, last = -1;
    for (let x = 0; x < size; x += 1) if (rgba[(y * size + x) * 4 + 3] > 16) { first = Math.min(first, x); last = x; }
    for (let x = first; x <= last; x += 1) solid[y * size + x] = 1;
  }
  for (let x = 0; x < size; x += 1) {
    let first = size, last = -1;
    for (let y = 0; y < size; y += 1) if (rgba[(y * size + x) * 4 + 3] > 16) { first = Math.min(first, y); last = y; }
    for (let y = first; y <= last; y += 1) solid[y * size + x] = 1;
  }
  const protectedArea = new Uint8Array(solid.length);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (solid[y * size + x]) {
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      if (x + dx >= 0 && x + dx < size && y + dy >= 0 && y + dy < size) protectedArea[(y + dy) * size + x + dx] = 255;
    }
  }
  return protectedArea;
};

export const createExteriorInfill = () => {
  const layer = document.createElement("canvas");
  const context = layer.getContext("2d");
  const blend = document.createElement("canvas"); blend.width = blend.height = 128;
  const blendContext = blend.getContext("2d");
  const masks = new WeakMap();
  const maskFor = (source) => {
    if (masks.has(source)) return masks.get(source);
    const mask = document.createElement("canvas"); mask.width = mask.height = 128;
    const maskContext = mask.getContext("2d", { willReadFrequently: true });
    maskContext.drawImage(source, 0, 0, 128, 128);
    const pixels = maskContext.getImageData(0, 0, 128, 128);
    const protection = enclosedSilhouette(pixels.data, 128);
    for (let i = 0; i < protection.length; i += 1) pixels.data[i * 4 + 3] = protection[i];
    maskContext.putImageData(pixels, 0, 0); masks.set(source, mask); return mask;
  };
  return {
    begin(width, height) {
      if (layer.width !== width || layer.height !== height) { layer.width = width; layer.height = height; }
      context.setTransform(1, 0, 0, 1, 0, 0); context.globalCompositeOperation = "source-over"; context.globalAlpha = 1;
      context.clearRect(0, 0, width, height);
    },
    paint(child, mix) {
      if (!child.tile || child.alpha <= 0) return;
      context.setTransform(child.rotationCos, child.rotationSin, -child.rotationSin, child.rotationCos, child.x, child.y);
      const draw = (tile, alpha) => {
        context.globalAlpha = alpha;
        context.drawImage(tile.canvas, tile.x, tile.y, tile.size, tile.size, -child.size / 2, -child.size / 2, child.size, child.size);
      };
      draw(child.tile, child.alpha * (child.nextTile ? 1 - mix : 1));
      if (child.nextTile) draw(child.nextTile, child.alpha * mix);
    },
    protect(prepared) {
      if (!prepared.infillSource) return;
      context.globalCompositeOperation = "destination-out";
      context.setTransform(prepared.rotationCos, prepared.rotationSin, -prepared.rotationSin, prepared.rotationCos, prepared.x, prepared.y);
      context.globalAlpha = 1;
      let mask = maskFor(prepared.infillSource);
      if (prepared.infillTarget) {
        blendContext.clearRect(0, 0, 128, 128);
        blendContext.globalCompositeOperation = "source-over"; blendContext.globalAlpha = 1 - prepared.tileMix;
        blendContext.drawImage(mask, 0, 0);
        blendContext.globalCompositeOperation = "lighter"; blendContext.globalAlpha = prepared.tileMix;
        blendContext.drawImage(maskFor(prepared.infillTarget), 0, 0); mask = blend;
      }
      context.drawImage(mask, -prepared.size / 2, -prepared.size / 2, prepared.size, prepared.size);
    },
    composite(target) {
      target.setTransform(1, 0, 0, 1, 0, 0); target.globalAlpha = 1; target.drawImage(layer, 0, 0);
    },
    dispose() { layer.width = layer.height = blend.width = blend.height = 1; },
  };
};
