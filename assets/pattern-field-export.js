import { createLoopVideoSource, trimLoopAudio } from './pattern-field-loop-export.js?v=20260926-loop-1';

const MEMORY_LIMIT = 240000000;
const AUDIO_BITRATE = 256000;
const SOUNDTRACK_LABELS = Object.freeze({ original: 'ORIGINAL', formation: 'FORMATION_V5', spatial: 'SPATIAL_V1', spatial2: 'SPATIAL_V2', coast: 'WIND_COAST_V21' });
const yieldToPage = () => new Promise((resolve) => setTimeout(resolve, 0));

export const prepareSoundtrack = async (soundtrack, length, media, signal, seamless) => {
  const response = await fetch(seamless ? soundtrack.loopSrc : soundtrack.src, { signal });
  if (!response.ok) throw new Error(`Soundtrack download failed (${response.status}). Please retry.`);
  const bytes = await response.arrayBuffer(); signal.throwIfAborted();
  const input = new media.Input({ source: new media.BufferSource(bytes), formats: [media.MP4] });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || await track.getCodec() !== 'aac') throw new Error('AAC soundtrack is unavailable.');
    const decoderConfig = await track.getDecoderConfig();
    const loopDuration = await track.computeDuration();
    const sink = new media.EncodedPacketSink(track);
    const source = new media.EncodedAudioPacketSource('aac');
    if (seamless) {
      let packet = await sink.getFirstPacket();
      if (!packet) throw new Error('Loop soundtrack has no audio packets.');
      const preroll = -Math.min(0, packet.timestamp);
      return {
        source, skipSamples: Math.round(preroll * decoderConfig.sampleRate),
        addUntil: async (until) => {
          while (packet && packet.timestamp < Math.min(until, length) - 1e-9) {
            signal.throwIfAborted();
            await source.add(packet.clone({ timestamp: packet.timestamp + preroll }), { decoderConfig });
            packet = await sink.getNextPacket(packet);
          }
        },
        dispose: () => input.dispose(),
      };
    }
    let packet = await sink.getPacket(soundtrack.offset % loopDuration);
    if (!packet) throw new Error('Soundtrack has no audio packets.');
    if (packet.timestamp < 0) packet = await sink.getNextPacket(packet);
    let shift = -packet.timestamp;
    return {
      source,
      addUntil: async (until) => {
        while (packet && packet.timestamp + shift < Math.min(until, length) - 1e-9) {
          signal.throwIfAborted();
          const timestamp = Math.max(0, packet.timestamp + shift);
          const duration = Math.min(packet.duration, loopDuration - packet.timestamp, length - timestamp);
          await source.add(packet.clone({ timestamp, duration }), { decoderConfig });
          packet = await sink.getNextPacket(packet);
          if (!packet) { shift += loopDuration; packet = await sink.getPacket(0); if (packet?.timestamp < 0) packet = await sink.getNextPacket(packet); }
        }
      },
      dispose: () => input.dispose(),
    };
  } catch (error) { input.dispose(); throw error; }
};

export const mountVideoExport = (root, renderer) => {
  const button = root.querySelector('[data-pattern-field-export]');
  const cancel = root.querySelector('[data-pattern-field-export-cancel]');
  const duration = root.querySelector('[data-pattern-field-export-duration]');
  const secondsInput = root.querySelector('[data-pattern-field-export-seconds]');
  const start = root.querySelector('[data-pattern-field-export-start]');
  const summary = root.querySelector('[data-pattern-field-export-summary]');
  const status = root.querySelector('[data-pattern-field-export-status]');
  const progress = root.querySelector('[data-pattern-field-export-progress]');
  const download = root.querySelector('[data-pattern-field-export-download]');
  const text = (ko, en, ja = en) => document.documentElement.lang === 'ko' ? ko : document.documentElement.lang === 'ja' ? ja : en;
  let ready = false; let busy = false; let disposed = false; let controller; let resultUrl;
  const seconds = () => duration.value === 'full' ? renderer.config().cycleSeconds : duration.value === 'custom' ? Number(secondsInput.value) : Number(duration.value);
  const isSeamless = (config, length) => config.autoSequence && start.value === 'first' && length === 300 && config.cycleSeconds === 300;
  const refresh = () => {
    if (busy || disposed) return;
    const config = renderer.config(); const length = seconds();
    secondsInput.closest('label').hidden = duration.value !== 'custom';
    const full = duration.querySelector('[value="full"]');
    full.disabled = !config.autoSequence;
    full.textContent = text(`전체 순서 · ${config.scenes}장면 / ${config.cycleSeconds}초`, `FULL SEQUENCE · ${config.scenes} SCENES / ${config.cycleSeconds}s`, `全シーン · ${config.scenes} / ${config.cycleSeconds}秒`);
    const valid = Number.isInteger(length) && length >= 1 && length <= 1800 && (duration.value !== 'full' || config.autoSequence);
    const fitsMemory = typeof window.showSaveFilePicker === 'function' || (config.bitrate + AUDIO_BITRATE) * length / 8 <= MEMORY_LIMIT;
    button.disabled = !ready || !config.assetsReady || !valid || !fitsMemory || !window.VideoEncoder;
    summary.textContent = config.assetError ? text('이미지를 불러오지 못했습니다. 페이지를 새로고침해주세요.', 'Images could not load. Please reload the page.', '画像を読み込めませんでした。ページを再読み込みしてください。') : !window.VideoEncoder ? text('MP4 인코딩을 지원하는 데스크탑 Chrome에서 열어주세요.', 'Open in desktop Chrome with MP4 encoding support.') : !valid ? text('영상 길이는 1–1800초이며, 전체 순서는 AUTO SEQUENCE를 켜야 합니다.', 'Use 1–1800 seconds; full sequence requires AUTO SEQUENCE.') : !fitsMemory ? text('긴 영상은 파일 직접 저장을 지원하는 데스크탑 Chrome에서 출력하세요. 이 브라우저는 예상 240MB까지 가능합니다.', 'Use desktop Chrome direct-to-file export for long videos. This browser is limited to an estimated 240MB.') : text(`${length}초 · ${(length * config.fps).toLocaleString()}프레임 · 예상 ${((config.bitrate + AUDIO_BITRATE) * length / 8000000).toFixed(0)}MB · 음악 포함 / AAC`, `${length}s · ${(length * config.fps).toLocaleString()} frames · estimated ${((config.bitrate + AUDIO_BITRATE) * length / 8000000).toFixed(0)}MB · music included / AAC`, `${length}秒 · ${(length * config.fps).toLocaleString()}フレーム · 約${((config.bitrate + AUDIO_BITRATE) * length / 8000000).toFixed(0)}MB · 音楽付き / AAC`);
    if (valid && fitsMemory && isSeamless(config, length)) summary.textContent += text(' · 반복 연결용 / 영상·음악 루프', ' · SEAMLESS VIDEO + MUSIC LOOP', ' · 映像・音楽ループ');
  };
  const beforeUnload = (event) => { if (busy) { event.preventDefault(); event.returnValue = ''; } };
  const run = async () => {
    if (busy || button.disabled) return;
    busy = true; controller = new AbortController(); const signal = controller.signal;
    const config = renderer.config(); const length = seconds(); const frames = Math.round(length * config.fps);
    const seamless = isSeamless(config, length);
    const filename = `PatternField_${config.library}_${config.mode}_${config.width}x${config.height}_${config.fps}fps_${length}s${seamless ? '_LOOP' : ''}_${SOUNDTRACK_LABELS[config.soundtrack] || 'WIND_COAST_V21'}_${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`;
    const controls = [...root.querySelectorAll('button, input, select')].filter((element) => element !== cancel).map((element) => [element, element.disabled]);
    controls.forEach(([element]) => { element.disabled = true; });
    cancel.hidden = false; cancel.disabled = false; progress.hidden = false; progress.value = 0;
    status.textContent = text('출력 준비 중…', 'Preparing export…', '書き出しを準備中…');
    cancel.focus();
    let output; let writable; let session; let soundtrack; let loopVideo; let metadata; let bytes = 0; let wakeLock;
    try {
      session = renderer.begin(start.value === 'first', { seamless, length, frames });
      const directToFile = (config.bitrate + AUDIO_BITRATE) * length / 8 > MEMORY_LIMIT && typeof window.showSaveFilePicker === 'function';
      if (directToFile) status.textContent = text('큰 영상입니다. MP4를 저장할 위치를 선택해주세요.', 'Large video: choose where to save the MP4.', '大きな動画です。MP4の保存先を選択してください。');
      const handle = directToFile ? await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }] }) : null;
      signal.throwIfAborted();
      const media = await import('./vendor/mediabunny-1.55.7.min.mjs');
      const { Output, Mp4OutputFormat, BufferTarget, StreamTarget, CanvasSource, Quality, canEncodeVideo } = media;
      signal.throwIfAborted();
      const quality = new Quality({ bitrate: config.bitrate, bitrateMode: 'variable' });
      if (!await canEncodeVideo('avc', { width: config.width, height: config.height, quality, latencyMode: 'quality' })) throw new Error(text(`이 브라우저는 ${config.width}×${config.height} H.264 출력을 지원하지 않습니다. 데스크탑 Chrome 또는 FHD 설정을 사용해주세요.`, `This browser cannot encode ${config.width}×${config.height} H.264. Try desktop Chrome or the FHD preset.`));
      status.textContent = text('음악 준비 중… · AAC 오디오 포함', 'Preparing soundtrack… · AAC audio included', '音楽を準備中… · AAC音声付き');
      soundtrack = await prepareSoundtrack(session.soundtrack, length, media, signal, seamless);
      signal.throwIfAborted();
      if (handle) writable = await handle.createWritable();
      signal.throwIfAborted();
      const target = writable ? new StreamTarget(new WritableStream({ write: async (chunk) => { signal.throwIfAborted(); await writable.write(chunk); bytes = Math.max(bytes, chunk.position + chunk.data.byteLength); } }), { chunked: true, chunkSize: 4 * 1024 * 1024 }) : new BufferTarget();
      output = new Output({ format: new Mp4OutputFormat({ fastStart: false, ...(seamless ? { onMoov: (data, position) => { metadata = { data: data.slice(), position }; } } : {}) }), target });
      loopVideo = seamless ? await createLoopVideoSource(session.canvas, config, media, signal) : null;
      const source = loopVideo || new CanvasSource(session.canvas, { codec: 'avc', quality, latencyMode: 'quality', keyFrameInterval: 2 });
      output.addVideoTrack(loopVideo ? loopVideo.source : source, { frameRate: config.fps });
      output.addAudioTrack(soundtrack.source);
      await output.start();
      if (navigator.wakeLock) { try { wakeLock = await navigator.wakeLock.request('screen'); } catch { /* Export also works without a screen wake lock. */ } }
      const began = performance.now(); let lastUpdate = -Infinity;
      for (let frame = 0; frame < frames; frame += 1) {
        signal.throwIfAborted();
        session.render(frame);
        if (loopVideo) await loopVideo.add(frame, frames);
        else await source.add(frame / config.fps, 1 / config.fps);
        await soundtrack.addUntil((frame + 1) / config.fps);
        if (performance.now() - lastUpdate >= 200 || frame === frames - 1) {
          const percent = Math.floor((frame + 1) / frames * 100); progress.value = percent;
          const elapsed = (performance.now() - began) / 1000;
          const remaining = Math.ceil(elapsed / (frame + 1) * (frames - frame - 1));
          status.textContent = text(`렌더링 ${percent}% · ${frame + 1}/${frames} 프레임 · 약 ${remaining}초 남음`, `Rendering ${percent}% · ${frame + 1}/${frames} frames · about ${remaining}s left`, `生成中 ${percent}% · ${frame + 1}/${frames}フレーム · 残り約${remaining}秒`);
          lastUpdate = performance.now();
          await yieldToPage();
        }
      }
      signal.throwIfAborted();
      status.textContent = text('MP4 파일 마무리 중…', 'Finalizing MP4…', 'MP4を仕上げ中…');
      await output.finalize();
      signal.throwIfAborted();
      let result;
      if (seamless) {
        if (!metadata) throw new Error('Loop export metadata is missing.');
        const trimmed = trimLoopAudio(metadata.data, length, soundtrack.skipSamples);
        if (writable) {
          await writable.write({ type: 'write', position: metadata.position, data: trimmed });
          bytes = metadata.position + trimmed.byteLength;
          await writable.truncate(bytes);
        } else result = new Blob([target.buffer.slice(0, metadata.position), trimmed], { type: 'video/mp4' });
      }
      if (writable) { await writable.close(); writable = null; }
      else { result ||= new Blob([target.buffer], { type: 'video/mp4' }); bytes = result.size; }
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = result ? URL.createObjectURL(result) : null;
      download.hidden = !result; download.removeAttribute('href');
      if (result) { download.href = resultUrl; download.download = filename; download.click(); }
      progress.value = 100;
      const details = `${config.width}×${config.height} · ${config.fps}fps · ${length}s · ${(bytes / 1000000).toFixed(1)}MB`;
      status.textContent = text(`${result ? 'MP4 완성 · 다운로드 버튼으로 다시 저장할 수 있습니다.' : 'MP4 파일 저장 완료.'} ${details} · 파일 평균 ${(bytes * 8 / length / 1000000).toFixed(1)}Mbps (목표 ${config.bitrate / 1000000}Mbps)`, `${result ? 'MP4 ready; use Download to save again.' : 'MP4 file saved.'} ${details} · file average ${(bytes * 8 / length / 1000000).toFixed(1)}Mbps (target ${config.bitrate / 1000000}Mbps)`);
    } catch (error) {
      if (output && output.state !== 'finalized' && output.state !== 'canceled') { try { await output.cancel(); } catch { /* Preserve the original export failure. */ } }
      if (writable) { try { await writable.abort(); } catch { /* A failed disk write may already have closed the stream. */ } }
      if (!disposed) status.textContent = signal.aborted || error?.name === 'AbortError' ? text('출력을 취소했습니다. 기존 설정으로 돌아갑니다.', 'Export canceled. Preview settings restored.', '書き出しをキャンセルしました。') : text(`출력 실패: ${error.message || '브라우저 또는 저장 공간을 확인해주세요.'}`, `Export failed: ${error.message || 'Check browser support and available storage.'}`);
    } finally {
      if (wakeLock) await wakeLock.release().catch(() => {});
      loopVideo?.dispose(); soundtrack?.dispose(); session?.restore();
      busy = false;
      if (!disposed) { controls.forEach(([element, disabled]) => { element.disabled = disabled; }); cancel.hidden = true; refresh(); button.focus(); }
    }
  };
  const cancelRun = () => { controller?.abort(); cancel.disabled = true; status.textContent = text('취소 중…', 'Canceling…', 'キャンセル中…'); };
  const refreshAfterChange = () => queueMicrotask(refresh);
  button.addEventListener('click', run); cancel.addEventListener('click', cancelRun);
  root.addEventListener('change', refreshAfterChange); root.addEventListener('input', refreshAfterChange); root.addEventListener('click', refreshAfterChange);
  window.addEventListener('beforeunload', beforeUnload); refresh();
  return {
    refresh,
    ready: () => { ready = true; refresh(); },
    dispose: () => { disposed = true; controller?.abort(); if (resultUrl) URL.revokeObjectURL(resultUrl); window.removeEventListener('beforeunload', beforeUnload); root.removeEventListener('change', refreshAfterChange); root.removeEventListener('input', refreshAfterChange); root.removeEventListener('click', refreshAfterChange); },
  };
};
