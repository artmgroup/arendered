const SOUNDTRACKS = Object.freeze({
  coast: { preview: 'assets/audio/pattern-field-pulse-depth-v21b-loop-300.m4a', exportSrc: 'assets/audio/pattern-field-pulse-depth-v21b-loop-300.m4a', loopSrc: 'assets/audio/pattern-field-pulse-depth-v21b-loop-300.m4a', duration: 300, title: 'Gentle Variations · Wind / Coast v2.1 · 88 BPM · 5 MIN' },
  spatial2: { preview: 'assets/audio/pattern-field-spatial-v2-loop-300.m4a', exportSrc: 'assets/audio/pattern-field-spatial-v2-loop-300.m4a', loopSrc: 'assets/audio/pattern-field-spatial-v2-loop-300.m4a', duration: 300, title: 'Gentle Variations · Spatial v2 · 88 BPM · 5 MIN' },
  spatial: { preview: 'assets/audio/pattern-field-spatial-v1-loop-300.m4a', exportSrc: 'assets/audio/pattern-field-spatial-v1-loop-300.m4a', loopSrc: 'assets/audio/pattern-field-spatial-v1-loop-300.m4a', duration: 300, title: 'Gentle Variations · Spatial v1 · 88 BPM · 5 MIN' },
  original: { preview: 'assets/audio/pattern-field-gentle-variations-v10-1.mp3', exportSrc: 'assets/audio/pattern-field-gentle-variations-v10-1.m4a', loopSrc: 'assets/audio/pattern-field-gentle-variations-loop-300.m4a', duration: 360, title: 'Gentle Variations v10.1 · 88 BPM · 6 MIN' },
  formation: { preview: 'assets/audio/pattern-field-formation-warm-v5-loop-300.m4a', exportSrc: 'assets/audio/pattern-field-formation-warm-v5-loop-300.m4a', loopSrc: 'assets/audio/pattern-field-formation-warm-v5-loop-300.m4a', duration: 300, title: 'Gentle Variations + Formation v5 · 88 BPM · 5 MIN' },
});

export const mountPatternSound = (root, playback) => {
  const audio = root.querySelector('[data-pattern-field-audio]');
  const toggle = root.querySelector('[data-pattern-field-sound]');
  const restart = root.querySelector('[data-pattern-field-sound-restart]');
  const volume = root.querySelector('[data-pattern-field-volume]');
  const status = root.querySelector('[data-pattern-field-sound-status]');
  const clock = root.querySelector('[data-pattern-field-sound-time]');
  const version = root.querySelector('[data-pattern-field-sound-version]');
  const description = root.querySelector('[data-pattern-field-sound-description]');
  const selected = () => SOUNDTRACKS[version.value] || SOUNDTRACKS.coast;
  const text = (ko, en, ja = en) => document.documentElement.lang === 'ko' ? ko : document.documentElement.lang === 'ja' ? ja : en;
  let enabled = false; let running = false; let disposed = false; let request = 0; let alignOnPlay = false;
  audio.volume = Number(volume.value) / 100;
  const showTime = () => { const seconds = Math.floor(audio.currentTime || 0); clock.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')} / ${String(selected().duration / 60).padStart(2, '0')}:00`; };
  const showSelection = () => { audio.dataset.src = selected().preview; description.textContent = selected().title; showTime(); };
  const showToggle = () => { toggle.textContent = `SOUND / ${enabled ? 'ON' : 'OFF'}`; toggle.setAttribute('aria-pressed', String(enabled)); };
  const fail = () => {
    if (disposed) return;
    enabled = false; running = false; request += 1; audio.pause(); showToggle();
    status.textContent = text('음원을 재생하지 못했습니다. SOUND를 눌러 다시 시도해주세요.', 'Audio could not play. Press SOUND to retry.', '音声を再生できません。SOUNDで再試行してください。');
  };
  const update = (active) => {
    const wanted = enabled && active && !document.hidden && !disposed;
    if (wanted === running) return;
    running = wanted; const revision = ++request;
    if (!wanted) { audio.pause(); if (!disposed) status.textContent = enabled ? text('영상과 함께 일시정지', 'Paused with preview', '映像と一時停止中') : text('소리 꺼짐', 'Sound off', '消音'); return; }
    if (!audio.getAttribute('src')) audio.src = audio.dataset.src;
    else if (audio.error) audio.load();
    status.textContent = text('음원 불러오는 중…', 'Loading soundtrack…', '音声を読み込み中…');
    audio.play().then(() => { if (revision !== request || disposed) return; if (alignOnPlay) { alignOnPlay = false; playback.restart(); } status.textContent = text('영상과 함께 재생 중 · 88 BPM', 'Playing with preview · 88 BPM', '映像と再生中 · 88 BPM'); }).catch(() => { if (revision === request) fail(); });
  };
  const rewind = () => { update(false); if (audio.getAttribute('src')) audio.currentTime = 0; showTime(); };
  const enable = () => { enabled = !enabled; showToggle(); if (enabled) { if (selected().duration === 300 && (!audio.getAttribute('src') || audio.currentTime === 0)) alignOnPlay = true; playback.play(); } update(playback.active()); };
  const startOver = () => { rewind(); playback.restart(); alignOnPlay = true; enabled = true; showToggle(); playback.play(); update(playback.active()); };
  const changeVersion = () => {
    request += 1; running = false; audio.pause(); audio.removeAttribute('src'); audio.load();
    alignOnPlay = true; showSelection(); playback.restart();
    status.textContent = text('음악을 변경했습니다. 영상과 음악을 처음부터 맞춥니다.', 'Soundtrack changed. Video and music restart together.', '音楽を変更しました。映像と音楽を最初から合わせます。');
    update(playback.active());
  };
  const changeVolume = () => { audio.volume = Number(volume.value) / 100; root.querySelector('[data-pattern-field-volume-output]').textContent = `${volume.value}%`; };
  const visibility = () => update(playback.active());
  toggle.addEventListener('click', enable); restart.addEventListener('click', startOver); volume.addEventListener('input', changeVolume);
  version.addEventListener('change', changeVersion); showSelection();
  audio.addEventListener('timeupdate', showTime); audio.addEventListener('error', fail); document.addEventListener('visibilitychange', visibility);
  return { update, rewind, selection: () => version.value, exportTrack: (fromStart) => ({ src: selected().exportSrc, loopSrc: selected().loopSrc, offset: fromStart ? 0 : audio.currentTime }), dispose: () => {
    disposed = true; request += 1; audio.pause();
    toggle.removeEventListener('click', enable); restart.removeEventListener('click', startOver); volume.removeEventListener('input', changeVolume);
    version.removeEventListener('change', changeVersion);
    audio.removeEventListener('timeupdate', showTime); audio.removeEventListener('error', fail); document.removeEventListener('visibilitychange', visibility);
    audio.removeAttribute('src'); audio.load();
  } };
};
