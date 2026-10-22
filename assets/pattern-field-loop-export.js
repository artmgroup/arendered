export const createLoopVideoSource = async (canvas, config, media, signal) => {
  const encoding = { codec: 'avc1.640033', width: config.width, height: config.height, bitrate: config.bitrate, framerate: config.fps, latencyMode: 'realtime', avc: { format: 'avc' } };
  if (!(await VideoEncoder.isConfigSupported(encoding)).supported) throw new Error('Loop export requires desktop Chrome with H.264 support.');
  const source = new media.EncodedVideoPacketSource('avc');
  let first; let firstMetadata; let failure; let pending = Promise.resolve();
  const encoder = new VideoEncoder({
    output: (chunk, metadata) => {
      const packet = media.EncodedPacket.fromEncodedChunk(chunk).clone({ duration: 1 / config.fps });
      if (!first) { first = packet; firstMetadata = metadata; }
      pending = pending.then(() => source.add(packet, metadata)).catch((error) => { failure = error; });
    },
    error: (error) => { failure = error; },
  });
  encoder.configure(encoding);
  return {
    source,
    async add(frame, frames) {
      signal.throwIfAborted();
      if (failure) throw failure;
      if (frame === frames - 1) {
        await encoder.flush(); await pending;
        if (failure) throw failure;
        if (!first || first.type !== 'key') throw new Error('Loop export is missing its opening keyframe.');
        await source.add(first.clone({ timestamp: frame / config.fps, sequenceNumber: -1 }), firstMetadata);
        return;
      }
      const sample = new VideoFrame(canvas, { timestamp: Math.round(frame * 1000000 / config.fps), duration: Math.round(1000000 / config.fps) });
      try { encoder.encode(sample, { keyFrame: frame % (config.fps * 2) === 0 }); }
      finally { sample.close(); }
      if (encoder.encodeQueueSize > 4) await encoder.flush();
      await pending;
      if (failure) throw failure;
    },
    dispose() { if (encoder.state !== 'closed') encoder.close(); },
  };
};

// AAC needs preroll for decoding; an edit list excludes it from the 300-second timeline.
export const trimLoopAudio = (moov, duration, skipSamples) => {
  const data = moov.slice();
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const typeAt = (offset) => String.fromCharCode(...data.subarray(offset + 4, offset + 8));
  const children = (start, end) => {
    const boxes = [];
    for (let at = start; at < end;) {
      const size = view.getUint32(at);
      if (size < 8 || at + size > end) throw new Error('Invalid MP4 metadata.');
      boxes.push({ at, size, type: typeAt(at) }); at += size;
    }
    return boxes;
  };
  const top = children(8, data.length);
  const movie = top.find((box) => box.type === 'mvhd');
  const movieVersion = view.getUint8(movie.at + 8);
  const movieScale = view.getUint32(movie.at + (movieVersion ? 28 : 20));
  const ticks = Math.round(duration * movieScale);
  const setDuration = (box, shortOffset, longOffset) => {
    if (view.getUint8(box.at + 8)) view.setBigUint64(box.at + longOffset, BigInt(ticks));
    else view.setUint32(box.at + shortOffset, ticks);
  };
  setDuration(movie, 24, 32);
  for (const track of top.filter((box) => box.type === 'trak')) {
    const parts = children(track.at + 8, track.at + track.size);
    const mdia = parts.find((box) => box.type === 'mdia');
    const mediaParts = children(mdia.at + 8, mdia.at + mdia.size);
    const handler = mediaParts.find((box) => box.type === 'hdlr');
    if (String.fromCharCode(...data.subarray(handler.at + 16, handler.at + 20)) !== 'soun') continue;
    if (parts.some((box) => box.type === 'edts')) throw new Error('Unexpected existing audio edit list.');
    setDuration(parts.find((box) => box.type === 'tkhd'), 28, 36);
    const edit = new Uint8Array(36); const editView = new DataView(edit.buffer);
    editView.setUint32(0, 36); edit.set(new TextEncoder().encode('edts'), 4);
    editView.setUint32(8, 28); edit.set(new TextEncoder().encode('elst'), 12);
    editView.setUint32(20, 1); editView.setUint32(24, ticks);
    editView.setInt32(28, skipSamples); editView.setInt16(32, 1);
    view.setUint32(track.at, track.size + edit.length); view.setUint32(0, data.length + edit.length);
    const at = track.at + track.size;
    const result = new Uint8Array(data.length + edit.length);
    result.set(data.subarray(0, at)); result.set(edit, at); result.set(data.subarray(at), at + edit.length);
    return result;
  }
  throw new Error('Loop export is missing its audio track.');
};
