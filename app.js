(() => {
  'use strict';
  if (location.protocol === 'file:') return;

  const projects = window.ARENDERED_PROJECTS;
  const main = document.querySelector('main');
  const archive = document.querySelector('#archive');
  const projectView = document.querySelector('#project-view');
  const aboutView = document.querySelector('#about-view');
  const contactView = document.querySelector('#contact-view');
  const reel = document.querySelector('#project-reel');
  const continuationList = document.querySelector('#continuation-list');
  const menu = document.querySelector('#index-menu');
  const menuToggle = document.querySelector('.menu-toggle');
  const menuProjects = document.querySelector('#menu-projects');
  let menuCloseTimer = 0;
  let menuOpenFrame = 0;
  let menuOpen = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pageLoader = document.querySelector('#page-loader');
  const positions = new Map();
  let pendingLoad = null;
  let currentProject = null;
  let activeHash = null;
  let touchPoint = null;
  let lastProject = null;
  let scrollAnimation = null;
  let scrollFrame = 0;
  let entranceAnimations = [];
  const scrollStyle = getComputedStyle(document.documentElement);
  const scrollLerp = parseFloat(scrollStyle.getPropertyValue('--scroll-lerp'));
  const wheelMultiplier = parseFloat(scrollStyle.getPropertyValue('--scroll-wheel-multiplier'));
  const coarsePointer = matchMedia('(pointer: coarse)');
  const hoverPointer = matchMedia('(any-hover: hover)');
  const mobileArchive = matchMedia('(max-width: 600px), (max-width: 940px) and (max-aspect-ratio: 3/4) and (pointer: coarse)');
  let archiveInfoFrame = 0;
  const creditPreview = document.querySelector('#credit-preview');
  let previewCard = null;
  let previewAnimation = null;
  let previewLeaving = false;
  history.scrollRestoration = 'manual';

  const themeToggle = document.querySelector('.theme-toggle');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme(theme, preference) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = preference;
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
  }
  applyTheme(document.documentElement.dataset.theme, document.documentElement.dataset.themePreference);
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next, next);
    try { localStorage.setItem('arendered-theme', next); } catch {}
  });
  systemTheme.addEventListener('change', () => {
    if (document.documentElement.dataset.themePreference === 'system') applyTheme(systemTheme.matches ? 'dark' : 'light', 'system');
  });

  function cancelScroll() {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    scrollAnimation = null;
  }

  function cancelEntrance() {
    entranceAnimations.forEach(animation => animation.cancel());
    entranceAnimations = [];
  }

  function enterProject(origin) {
    if (!origin || reducedMotion.matches) return;
    const lead = reel.querySelector('.reel-lead img');
    if (!lead) return;
    const target = lead.getBoundingClientRect();
    if (!origin.width || !target.width) return;
    const style = getComputedStyle(document.documentElement);
    const scale = origin.width / target.width;
    const crop = Math.max(0, (1 - origin.height / (target.height * scale)) / 2);
    const animations = [lead.animate([
      { transform: `translate(${origin.left - target.left}px, ${origin.top - target.top - crop * target.height * scale}px) scale(${scale})`, clipPath: `inset(${crop * 100}% 0)` },
      { transform: 'none', clipPath: 'inset(0)' }
    ], {
      duration: parseFloat(style.getPropertyValue('--project-enter-duration')),
      easing: style.getPropertyValue('--project-enter-easing').trim()
    })];
    const content = reel.querySelectorAll('.reel-title, .reel-intro-copy, .reel-intro > .reel-frame:not(.reel-lead):not(.reel-title), :scope > .reel-frame:not(.reel-intro)');
    for (const node of content) {
      animations.push(node.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: parseFloat(style.getPropertyValue('--project-dissolve-duration')),
        delay: parseFloat(style.getPropertyValue('--project-dissolve-delay')),
        easing: 'ease-in-out',
        fill: 'backwards'
      }));
    }
    entranceAnimations = animations;
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (entranceAnimations === animations) entranceAnimations = [];
    });
  }

  function scrollLimits() {
    const horizontal = currentProject ? Math.max(0, reel.scrollWidth - reel.clientWidth) : 0;
    return { horizontal, total: horizontal + Math.max(0, document.documentElement.scrollHeight - innerHeight) };
  }

  function readingPosition() {
    return currentProject ? (scrollY > 0 ? scrollLimits().horizontal + scrollY : reel.scrollLeft) : scrollY;
  }

  function applyScroll(position, horizontal) {
    if (currentProject) reel.scrollLeft = Math.min(position, horizontal);
    const vertical = Math.max(0, position - horizontal);
    if (Math.abs(scrollY - vertical) > .1) window.scrollTo({ top: vertical, behavior: 'instant' });
  }

  function animateScroll(time) {
    const limits = scrollLimits();
    const animation = scrollAnimation;
    animation.target = Math.min(animation.target, limits.total);
    const elapsed = (time - animation.time) / 1000;
    animation.time = time;
    animation.position += (animation.target - animation.position) * (1 - Math.exp(-60 * scrollLerp * elapsed));
    const settled = Math.abs(animation.target - animation.position) < .5;
    applyScroll(settled ? animation.target : animation.position, limits.horizontal);
    if (settled) cancelScroll();
    else scrollFrame = requestAnimationFrame(animateScroll);
  }

  function scrollToReading(position, smooth = true) {
    const limits = scrollLimits();
    const target = Math.max(0, Math.min(limits.total, position));
    const current = readingPosition();
    if (!smooth || reducedMotion.matches) {
      cancelScroll();
      applyScroll(target, limits.horizontal);
    } else if (scrollAnimation) scrollAnimation.target = target;
    else if (Math.abs(target - current) > .5) {
      scrollAnimation = { position: current, target, time: performance.now() };
      scrollFrame = requestAnimationFrame(animateScroll);
    }
    return Math.abs(target - current) > .5;
  }

  function advance(delta, smooth = false) {
    return scrollToReading((scrollAnimation?.target ?? readingPosition()) + delta, smooth);
  }

  document.addEventListener('pointerdown', cancelScroll, { passive: true });
  document.addEventListener('touchstart', cancelScroll, { passive: true });
  document.addEventListener('focusin', cancelScroll);
  for (const event of ['pointerdown', 'touchstart', 'keydown', 'wheel', 'focusin']) {
    document.addEventListener(event, cancelEntrance, { passive: true });
  }
  window.addEventListener('resize', cancelScroll);
  window.addEventListener('resize', cancelEntrance);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelScroll(); });
  reducedMotion.addEventListener('change', () => {
    cancelEntrance();
    if (scrollAnimation) scrollToReading(scrollAnimation.target, false);
  });

  function showPageLoader(view, initial) {
    pendingLoad?.abort();
    const load = new AbortController();
    pendingLoad = load;
    const started = performance.now();
    const style = getComputedStyle(pageLoader);
    const hold = parseFloat(style.getPropertyValue(initial ? '--loader-first-hold' : '--loader-hold'));
    const fade = parseFloat(style.getPropertyValue('--loader-fade'));
    let settling = false;
    let holdTimer;
    let hideTimer;
    pageLoader.hidden = false;
    pageLoader.classList.add('is-visible');
    pageLoader.setAttribute('aria-hidden', 'false');
    main.setAttribute('aria-busy', 'true');

    function finish() {
      if (load.signal.aborted || settling) return;
      settling = true;
      clearTimeout(fallbackTimer);
      holdTimer = setTimeout(() => {
        pageLoader.classList.remove('is-visible');
        pageLoader.setAttribute('aria-hidden', 'true');
        main.removeAttribute('aria-busy');
        hideTimer = setTimeout(() => {
          pageLoader.hidden = true;
          pendingLoad = null;
          load.abort();
        }, fade);
      }, Math.max(0, hold - (performance.now() - started)));
    }

    const fallbackTimer = setTimeout(finish, 5000);
    load.signal.addEventListener('abort', () => {
      clearTimeout(fallbackTimer);
      clearTimeout(holdTimer);
      clearTimeout(hideTimer);
    }, { once: true });

    const visibleImages = [...view.querySelectorAll('img')].filter(node => {
      const box = node.getBoundingClientRect();
      return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
    });
    Promise.allSettled(visibleImages.map(node => new Promise(resolve => {
      const decoded = () => node.decode().then(resolve, resolve);
      if (node.complete) decoded();
      else {
        node.addEventListener('load', decoded, { once: true, signal: load.signal });
        node.addEventListener('error', resolve, { once: true, signal: load.signal });
        load.signal.addEventListener('abort', resolve, { once: true });
      }
    }))).then(finish);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function image(asset, alt, project, eager = false) {
    const node = element('img');
    node.src = asset.src;
    node.alt = alt;
    node.width = asset.width;
    node.height = asset.height;
    node.loading = eager ? 'eager' : 'lazy';
    node.decoding = 'async';
    if (eager) node.fetchPriority = 'high';
    node.addEventListener('error', () => {
      const message = element('div', 'media-error', 'This image could not be loaded. ');
      const link = element('a', '', 'View the original project');
      link.href = project.source;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      message.append(link);
      node.replaceWith(message);
    }, { once: true });
    return node;
  }

  function projectCard(project, eager = false, root = false) {
    const item = element('article', 'project-item');
    const card = element('a', 'project-card');
    card.href = '#project/' + project.id;
    card.setAttribute('aria-label', project.title + ' — ' + project.subtitle);
    if (root) card.id = 'card-' + project.id;
    if (project.coverPresentation === 'portrait') card.classList.add('project-card--portrait');
    const cover = image(project.cover, project.title, project, eager);
    cover.className = 'project-cover' + (project.coverPresentation === 'portrait' ? ' project-cover--portrait' : '');
    const caption = element('div', 'project-caption');
    caption.append(element('h2', '', project.title), element('span', '', project.subtitle));
    card.append(cover, caption);
    card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && hoverPointer.matches) showCreditPreview(card, project);
    });
    card.addEventListener('pointerleave', () => {
      if (previewCard === card && !card.matches(':focus-visible')) hideCreditPreview();
    });
    card.addEventListener('focus', () => {
      if (card.matches(':focus-visible')) showCreditPreview(card, project);
    });
    card.addEventListener('blur', () => {
      if (previewCard === card) hideCreditPreview();
    });
    const info = element('div', 'mobile-project-info');
    info.append(creditDetails(project));
    item.append(card, info);
    return item;
  }

  function updateArchiveInfo() {
    archiveInfoFrame = 0;
    if (!mobileArchive.matches) return;
    const header = document.querySelector('.studio-header').getBoundingClientRect().bottom;
    const list = currentProject ? continuationList : document.querySelector('#project-list');
    const lastHeight = list.lastElementChild?.getBoundingClientRect().height;
    if (!lastHeight) return;
    const tail = Math.max(0, innerHeight - header - lastHeight) + 'px';
    if (list.style.getPropertyValue('--archive-tail') !== tail) list.style.setProperty('--archive-tail', tail);
    for (const item of list.children) {
      const box = item.getBoundingClientRect();
      const focused = item.querySelector('.project-card').matches(':focus-visible');
      const opacity = reducedMotion.matches || focused ? 1 : Math.max(0, 1 - Math.abs(box.top - header) / box.height);
      item.style.setProperty('--archive-info-opacity', opacity.toFixed(3));
    }
  }

  function queueArchiveInfo() {
    if (!archiveInfoFrame) archiveInfoFrame = requestAnimationFrame(updateArchiveInfo);
  }
  window.addEventListener('scroll', queueArchiveInfo, { passive: true });
  window.addEventListener('resize', queueArchiveInfo);
  document.addEventListener('focusin', queueArchiveInfo);
  document.addEventListener('focusout', queueArchiveInfo);
  mobileArchive.addEventListener('change', queueArchiveInfo);
  reducedMotion.addEventListener('change', queueArchiveInfo);

  function contentFields(project) {
    return [['client:', project.client], ['role:', project.role], ['assets:', project.assets], ['year:', project.year]];
  }

  function positionCreditPreview() {
    if (!previewCard?.isConnected) return false;
    const box = previewCard.getBoundingClientRect();
    const style = getComputedStyle(document.documentElement);
    const edge = parseFloat(style.getPropertyValue('--edge'));
    const header = parseFloat(style.getPropertyValue('--header-height'));
    const available = innerWidth - box.right - edge * 2;
    if (available < parseFloat(style.getPropertyValue('--credit-preview-min-width')) || box.bottom <= header || box.top >= innerHeight) return false;
    const pixel = value => Math.round(value * devicePixelRatio) / devicePixelRatio;
    creditPreview.style.left = pixel(box.right + edge) + 'px';
    creditPreview.style.width = Math.min(innerWidth * .4, available) + 'px';
    creditPreview.style.top = pixel(Math.max(header, Math.min(box.top, innerHeight - creditPreview.offsetHeight - edge))) + 'px';
    return true;
  }

  function showCreditPreview(card, project) {
    if (mobileArchive.matches || menuOpen || previewCard === card && !creditPreview.hidden && !previewLeaving) return;
    previewAnimation?.cancel();
    previewLeaving = false;
    previewCard = card;
    creditPreview.replaceChildren(creditDetails(project));
    creditPreview.hidden = false;
    if (!positionCreditPreview()) { hideCreditPreview(false, true); return; }
    creditPreview.style.opacity = '1';
    if (reducedMotion.matches) return;
    previewAnimation = creditPreview.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: parseFloat(getComputedStyle(creditPreview).getPropertyValue('--credit-preview-in')),
      easing: 'ease-in-out'
    });
  }

  function hideCreditPreview(exit = false, immediate = false) {
    if (previewLeaving && !immediate) return;
    const opacity = getComputedStyle(creditPreview).opacity;
    previewAnimation?.cancel();
    previewAnimation = null;
    previewCard = null;
    previewLeaving = false;
    if (creditPreview.hidden || immediate || reducedMotion.matches) {
      creditPreview.hidden = true;
      return;
    }
    previewLeaving = exit;
    const distance = exit ? innerWidth - creditPreview.getBoundingClientRect().left : 0;
    const animation = creditPreview.animate([
      { opacity, transform: 'translateX(0)' },
      { opacity: 0, transform: `translateX(${distance}px)` }
    ], {
      duration: parseFloat(getComputedStyle(creditPreview).getPropertyValue(exit ? '--credit-preview-exit' : '--credit-preview-out')),
      easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards'
    });
    previewAnimation = animation;
    animation.finished.then(() => {
      if (previewAnimation !== animation) return;
      creditPreview.hidden = true;
      previewLeaving = false;
      previewAnimation = null;
      animation.cancel();
    }, () => {});
  }

  window.addEventListener('scroll', () => {
    if (previewCard && !positionCreditPreview()) hideCreditPreview(false, true);
  }, { passive: true });
  window.addEventListener('resize', () => hideCreditPreview(false, true));
  reducedMotion.addEventListener('change', () => hideCreditPreview(false, true));

  for (const [index, project] of projects.entries()) {
    document.querySelector('#project-list').append(projectCard(project, index < 2, true));
    const item = element('li');
    const link = element('a', 'menu-project');
    link.href = '#project/' + project.id;
    const name = element('span', 'menu-project-name');
    name.append(element('span', '', project.title), element('span', 'menu-project-kind', project.kind));
    link.append(name, element('span', 'menu-project-year', String(project.year)));
    item.append(link);
    menuProjects.append(item);
  }

  function setMenu(open, restoreFocus = false) {
    menuOpen = open;
    window.clearTimeout(menuCloseTimer);
    cancelAnimationFrame(menuOpenFrame);
    if (open) { cancelScroll(); hideCreditPreview(false, true); }
    if (open) {
      menu.hidden = false;
      menuOpenFrame = requestAnimationFrame(() => menu.classList.add('is-open'));
    } else {
      menu.classList.remove('is-open');
      menuCloseTimer = window.setTimeout(() => { menu.hidden = true; }, 340);
    }
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.inert = !open;
    main.inert = open;
    if (restoreFocus) menuToggle.focus();
  }
  menuToggle.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('pointerdown', event => {
    if (menuOpen && !event.target.closest('#index-menu, .studio-header')) setMenu(false, true);
  });
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    main.focus();
  });

  function addPhoto(project, asset, index, target = reel, size = null, align = 'top') {
    const presentation = size || (asset.width >= asset.height ? 'landscape' : index === 0 ? 'full' : 'portrait');
    const frame = element('figure', `reel-frame reel-photo reel-photo--${presentation} reel-photo--${align}`);
    frame.append(image(asset, project.title + ' — photograph ' + (index + 1), project, index < 2));
    target.append(frame);
  }

  function addDescription(project) {
    const panel = element('div', 'reel-frame reel-description');
    for (const paragraph of project.description.split(/\n\s*\n/)) panel.append(element('p', '', paragraph));
    reel.append(panel);
  }

  function projectCopy(project) {
    const panel = element('aside', 'reel-intro-copy');
    const heading = element('h1', 'reel-project-heading');
    heading.id = 'project-title';
    heading.tabIndex = -1;
    heading.append(element('span', '', project.title), element('span', '', project.subtitle));
    panel.append(heading);
    for (const paragraph of project.description.split(/\n\s*\n/)) panel.append(element('p', 'reel-intro-paragraph', paragraph));
    return panel;
  }

  function addEditorialFrame(project, block) {
    if (block.space) {
      const space = element('div', 'reel-frame reel-spacer');
      space.setAttribute('aria-hidden', 'true');
      reel.append(space);
      return;
    }
    if (block.image) {
      addPhoto(project, project.images[block.image - 1], block.image - 1, reel, block.size, block.align);
      return;
    }
    const frame = element('figure', 'reel-frame reel-gallery');
    frame.style.setProperty('--gallery-count', block.images.length);
    const row = element('div', 'gallery-images');
    for (const number of block.images) {
      row.append(image(project.images[number - 1], project.title + ' — photograph ' + number, project));
    }
    frame.append(row, element('figcaption', 'gallery-caption', block.caption));
    reel.append(frame);
  }

  function addVideo(project, target = reel) {
    const frame = element('div', 'reel-frame reel-video');
    const stage = element('div', 'video-stage');
    stage.setAttribute('aria-busy', 'true');
    const player = element('iframe');
    player.title = project.title + ' — film';
    player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    player.allowFullscreen = true;
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    player.src = 'https://www.youtube-nocookie.com/embed/' + project.video + '?autoplay=1&mute=1&playsinline=1&controls=1&rel=0&hl=en&origin=' + encodeURIComponent(location.origin);
    player.addEventListener('load', () => stage.removeAttribute('aria-busy'), { once: true });
    const scrollSpace = element('div', 'player-scroll-space');
    scrollSpace.setAttribute('aria-hidden', 'true');
    stage.append(player, scrollSpace);
    frame.append(stage);
    target.append(frame);
    const buffer = parseFloat(getComputedStyle(stage).getPropertyValue('--player-scroll-buffer'));
    stage.scrollTop = buffer;
    stage.addEventListener('scroll', () => {
      const distance = stage.scrollTop - buffer;
      if (!distance) return;
      stage.scrollTop = buffer;
      if (!currentProject || menuOpen) return;
      cancelEntrance();
      advance(distance * (coarsePointer.matches ? 1 : wheelMultiplier), !coarsePointer.matches);
    }, { passive: true });
  }

  function creditDetails(project, fields = contentFields(project), className = 'project-meta') {
    const list = element('dl', className);
    for (const [key, value] of fields) {
      const row = element('div');
      row.append(element('dt', '', key), element('dd', '', String(value)));
      list.append(row);
    }
    return list;
  }

  function contentDetails(project, className = 'project-meta content-meta') {
    return creditDetails(project, contentFields(project), className);
  }

  function addCredits(project) {
    const credits = element('section', 'reel-frame reel-credits');
    credits.id = 'project-credits';
    credits.setAttribute('aria-label', project.title + ' — credits');
    credits.append(element('h2', 'sr-only', 'Credits'), contentDetails(project));
    reel.append(credits);
  }

  function updateIntroLayout() {
    const intro = reel.querySelector('.reel-intro');
    if (!intro) return;
    const lead = intro.querySelector('.reel-lead-stack');
    const copy = intro.querySelector('.reel-intro-copy');
    const gap = parseFloat(getComputedStyle(intro).rowGap);
    const needsSideCopy = matchMedia('(max-width: 600px)').matches &&
      lead.offsetHeight + gap + copy.scrollHeight > intro.clientHeight + 1;
    intro.classList.toggle('reel-intro--side-copy', needsSideCopy);
  }

  const introResizeObserver = new ResizeObserver(updateIntroLayout);
  document.fonts.ready.then(updateIntroLayout);

  function openProject(project) {
    introResizeObserver.disconnect();
    currentProject = project;
    lastProject = project;
    reel.replaceChildren();
    const intro = element('div', 'reel-frame reel-intro');
    const leadStack = element('div', 'reel-lead-stack');
    const lead = element('figure', 'reel-frame reel-lead');
    if (project.leadPresentation === 'portrait') lead.classList.add('reel-lead--portrait');
    lead.append(image(project.cover, project.title + ' — cover', project, true));
    leadStack.append(lead);
    intro.append(leadStack, projectCopy(project));
    reel.append(intro);
    if (project.video) {
      addVideo(project);
    } else {
      const coverRepeatsFirstImage = project.images[0]?.src === project.cover.src;
      if (project.layout) {
        if (!coverRepeatsFirstImage && project.images[0]) addPhoto(project, project.images[0], 0);
        project.layout.forEach(block => addEditorialFrame(project, block));
      } else {
        const firstBodyIndex = coverRepeatsFirstImage ? 1 : 0;
        project.images.slice(firstBodyIndex).forEach((asset, index) => addPhoto(project, asset, index + firstBodyIndex));
      }
    }
    addCredits(project);
    const index = projects.indexOf(project);
    const following = projects.slice(index + 1).concat(projects.slice(0, index + 1));
    continuationList.replaceChildren(...following.map((item, i) => projectCard(item, i === 0)));
    document.title = project.title + ' — ARENDERED';
    updateIntroLayout();
    for (const panel of [reel, leadStack, intro.querySelector('.reel-intro-copy')]) introResizeObserver.observe(panel);
    document.querySelector('#project-title').focus({ preventScroll: true });
  }

  function savePosition() {
    if (activeHash !== null) positions.set(activeHash, { x: reel.scrollLeft, y: scrollY });
  }

  function route(restore = false, origin = null, exitingPreview = false) {
    cancelEntrance();
    cancelScroll();
    if (!exitingPreview) hideCreditPreview(false, true);
    const initial = activeHash === null;
    savePosition();
    activeHash = location.hash;
    const project = projects.find(item => activeHash === '#project/' + item.id);
    const about = activeHash === '#about';
    const contact = activeHash === '#contact';
    setMenu(false);
    archive.hidden = Boolean(project) || about || contact;
    projectView.hidden = !project;
    aboutView.hidden = !about;
    contactView.hidden = !contact;
    for (const link of menu.querySelectorAll('a')) {
      const selected = link.getAttribute('href') === (activeHash || '#');
      if (selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    currentProject = null;
    if (project) openProject(project);
    else {
      introResizeObserver.disconnect();
      reel.replaceChildren();
      continuationList.replaceChildren();
      document.title = about ? 'About — ARENDERED' : contact ? 'Contact — ARENDERED' : 'ARENDERED — Creative production';
      if (about) document.querySelector('#about-title').focus({ preventScroll: true });
      else if (contact) document.querySelector('#contact-title').focus({ preventScroll: true });
      else if (!initial) main.focus({ preventScroll: true });
    }
    const saved = restore ? positions.get(activeHash) : null;
    reel.scrollLeft = saved?.x || 0;
    window.scrollTo({ top: saved?.y || 0, behavior: 'instant' });
    queueArchiveInfo();
    showPageLoader(project ? projectView : about ? aboutView : contact ? contactView : archive, initial);
    if (project) enterProject(origin);
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('skip-link') || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    savePosition();
    const nextHash = link.getAttribute('href');
    const cover = link.matches('.project-card') ? link.querySelector('.project-cover') : null;
    const origin = cover?.getBoundingClientRect();
    const exitingPreview = Boolean(cover && !creditPreview.hidden && previewCard === link);
    if (exitingPreview) hideCreditPreview(true);
    history.pushState(null, '', nextHash === '#' ? location.pathname + location.search : nextHash);
    route(false, origin, exitingPreview);
  });
  window.addEventListener('popstate', () => route(true));
  window.addEventListener('hashchange', () => {
    if (location.hash !== activeHash) route(true);
  });

  function textCanScroll(target, delta) {
    const panel = target.closest('.reel-intro-copy, .reel-description, .reel-credits, .reel-gallery');
    return panel && panel.scrollHeight > panel.clientHeight + 1 &&
      (delta > 0 ? panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1 : panel.scrollTop > 0);
  }

  document.addEventListener('wheel', event => {
    if (menuOpen || event.ctrlKey || event.target.closest('nav, input, textarea, select')) {
      cancelScroll();
      return;
    }
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    const delta = (horizontal ? event.deltaX : event.deltaY) * unit;
    if (!delta) return;
    if (!horizontal && textCanScroll(event.target, delta)) {
      cancelScroll();
      return;
    }
    if (advance(delta * wheelMultiplier, true)) event.preventDefault();
  }, { passive: false });

  reel.addEventListener('touchstart', event => {
    touchPoint = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  reel.addEventListener('touchmove', event => {
    if (!touchPoint || event.touches.length !== 1 || menuOpen) return;
    const point = event.touches[0];
    const dx = touchPoint.x - point.clientX;
    const dy = touchPoint.y - point.clientY;
    touchPoint = { x: point.clientX, y: point.clientY };
    if (Math.abs(dx) >= Math.abs(dy) || textCanScroll(event.target, dy)) return;
    if (advance(dy)) event.preventDefault();
  }, { passive: false });
  reel.addEventListener('touchend', () => { touchPoint = null; }, { passive: true });
  reel.addEventListener('touchcancel', () => { touchPoint = null; }, { passive: true });

  function moveFrame(direction) {
    const position = scrollAnimation?.target ?? readingPosition();
    const max = scrollLimits().horizontal;
    if (position > max + 1) {
      scrollToReading(position + direction * innerHeight * .8);
      return;
    }
    const edge = parseFloat(getComputedStyle(reel).paddingInlineStart);
    const frames = [...reel.querySelectorAll('.reel-lead-stack, .reel-intro-copy, :scope > .reel-frame:not(.reel-intro):not(.reel-spacer)')];
    const reelLeft = reel.getBoundingClientRect().left;
    const stops = [...new Set(frames.map(frame => Math.max(0, Math.min(max, frame.getBoundingClientRect().left - reelLeft + reel.scrollLeft - edge))))];
    const target = direction > 0
      ? stops.find(stop => stop > position + 2)
      : stops.reverse().find(stop => stop < position - 2);
    if (target !== undefined) scrollToReading(target);
    else if (direction > 0) scrollToReading(position + innerHeight * .8);
  }

  document.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(event.key)) cancelScroll();
    if (event.key === 'Escape') {
      if (menuOpen) setMenu(false, true);
      else if (currentProject || !aboutView.hidden || !contactView.hidden) {
        savePosition();
        history.pushState(null, '', location.pathname + location.search);
        route(true);
        if (lastProject) document.querySelector('#card-' + lastProject.id).focus({ preventScroll: true });
      }
      return;
    }
    if (!currentProject || menuOpen || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('button, a, iframe, input, textarea, select')) {
      cancelScroll();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'PageDown' || event.key === 'PageUp' || event.code === 'Space') {
      const direction = event.key === 'ArrowLeft' || event.key === 'PageUp' || event.shiftKey ? -1 : 1;
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && textCanScroll(event.target, direction)) return;
      event.preventDefault();
      moveFrame(direction);
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      scrollToReading(event.key === 'End' ? scrollLimits().horizontal : 0);
    }
  });

  new ResizeObserver(entries => {
    document.documentElement.style.setProperty('--header-height', entries[0].target.getBoundingClientRect().height + 'px');
    queueArchiveInfo();
  }).observe(document.querySelector('.studio-header'));
  route();
})();
