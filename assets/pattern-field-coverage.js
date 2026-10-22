const DEFAULT_STRENGTH = .65;
const DEFAULT_MIX = .42;

export const coverageMix = (strength, trail = 0) => trail > 0 ? 0 : DEFAULT_MIX * Math.min(1, Math.max(0, strength) / DEFAULT_STRENGTH);

// Four coincident layers approximate the midpoint toward stationary Trail 1%, without changing RGB.
export const coverageAlpha = (alpha, mix = DEFAULT_MIX) => alpha + mix * (1 - (1 - alpha) ** 4 - alpha);

export const createFrameCoverage = (createCanvas = () => document.createElement("canvas")) => {
  let frame, stack, frameContext, stackContext, destination, mix = 0;
  const reset = (ctx) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };
  return {
    begin(output, width, height, strength, trail) {
      destination = output;
      mix = coverageMix(strength, trail);
      if (!mix) return output;
      if (!frame) {
        frame = createCanvas(); stack = createCanvas();
        frameContext = frame.getContext("2d"); stackContext = stack.getContext("2d");
      }
      for (const buffer of [frame, stack]) if (buffer.width !== width || buffer.height !== height) {
        buffer.width = width; buffer.height = height;
      }
      reset(frameContext);
      frameContext.clearRect(0, 0, width, height);
      return frameContext;
    },
    finish() {
      if (!mix) return destination;
      reset(stackContext);
      stackContext.clearRect(0, 0, stack.width, stack.height);
      stackContext.drawImage(frame, 0, 0);
      stackContext.drawImage(frame, 0, 0);
      stackContext.drawImage(stack, 0, 0);
      stackContext.globalCompositeOperation = "destination-over";
      stackContext.fillStyle = "#000";
      stackContext.fillRect(0, 0, stack.width, stack.height);
      reset(destination);
      destination.drawImage(frame, 0, 0);
      destination.globalAlpha = mix;
      destination.drawImage(stack, 0, 0);
      destination.globalAlpha = 1;
      return destination;
    },
    dispose() {
      if (frame) frame.width = frame.height = stack.width = stack.height = 1;
      frame = stack = frameContext = stackContext = destination = null;
    },
  };
};
