(function () {
  'use strict';

  const SITE = window.SITE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const isVideo = (src) => /\.(mp4|webm|mov)$/i.test(src);
  const priceHtml = (p) => `<span class="price">${p}<small>${SITE.currency}</small></span>`;

  /* ---------- Видео: грузим и играем только когда видно ---------- */

  const videoIO = new IntersectionObserver((entries) => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, { threshold: 0.5 });

  function makeVideo(src, inViewer) {
    const v = el('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'none';
    if (inViewer) {
      v.controls = true;
      v.src = src;
    } else {
      v.dataset.src = src;
      videoIO.observe(v);
    }
    return v;
  }

  /* ---------- Галерея ---------- */

  function renderGallery(items, label) {
    const wrap = el('div', 'gallery');
    const track = el('div', 'gallery__track');

    items.forEach((src, i) => {
      const slide = el('figure', 'slide');
      if (isVideo(src)) {
        slide.classList.add('slide--video');
        slide.append(makeVideo(src, false));
      } else {
        const img = el('img');
        img.src = src;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = `${label} — фото ${i + 1}`;
        slide.append(img);
      }
      slide.addEventListener('click', () => openViewer(items, i));
      track.append(slide);
    });

    const prev = el('button', 'gallery__arrow gallery__arrow--prev');
    const next = el('button', 'gallery__arrow gallery__arrow--next');
    prev.setAttribute('aria-label', 'Предыдущее фото');
    next.setAttribute('aria-label', 'Следующее фото');

    const slides = [...track.children];
    const step = () => (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth);
    const atEnd = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;

    const update = () => {
      const start = track.scrollLeft < 4;
      const end = atEnd();
      prev.hidden = start;
      next.hidden = end;
      wrap.classList.toggle('is-start', start);
      wrap.classList.toggle('is-end', end);
    };

    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    requestAnimationFrame(update);

    wrap.append(track, prev, next);
    return wrap;
  }

  /* ---------- Полноэкранный просмотр ---------- */

  const viewer = $('#viewer');
  const vTrack = $('#viewer-track');
  const vCounter = $('#viewer-counter');
  const vPrev = $('#viewer-prev');
  const vNext = $('#viewer-next');

  function openViewer(items, start) {
    vTrack.innerHTML = '';
    items.forEach((src) => {
      const f = el('figure', 'viewer__slide');
      if (isVideo(src)) {
        f.append(makeVideo(src, true));
      } else {
        const img = el('img');
        img.src = src;
        img.alt = '';
        img.loading = 'lazy';
        // нажатие по фото — увеличить / уменьшить
        img.addEventListener('click', (e) => { e.stopPropagation(); toggleZoom(f, e); });
        f.append(img);
      }
      vTrack.append(f);
    });
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    vTrack.scrollLeft = start * vTrack.clientWidth;
    updateViewer();
  }

  function toggleZoom(slide, e) {
    const img = slide.querySelector('img');
    const zoom = !slide.classList.contains('is-zoomed');
    // точка нажатия в долях от размера картинки
    const r = img.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    slide.classList.toggle('is-zoomed', zoom);
    viewer.classList.toggle('is-zoomed', zoom);
    if (zoom) {
      slide.scrollLeft = fx * slide.scrollWidth - slide.clientWidth / 2;
      slide.scrollTop = fy * slide.scrollHeight - slide.clientHeight / 2;
    }
  }

  function closeViewer() {
    vTrack.innerHTML = '';
    viewer.classList.remove('is-zoomed');
    viewer.hidden = true;
    document.body.style.overflow = '';
  }

  function updateViewer() {
    const slides = vTrack.children;
    const n = slides.length;
    const i = Math.round(vTrack.scrollLeft / vTrack.clientWidth);
    vCounter.textContent = n > 1 ? `${i + 1} / ${n}` : '';
    vPrev.hidden = i <= 0;
    vNext.hidden = i >= n - 1;
    // видео играет только на текущем слайде
    [...slides].forEach((s, k) => {
      const v = s.querySelector('video');
      if (v) k === i ? v.play().catch(() => {}) : v.pause();
    });
  }

  const viewerGo = (dir) => {
    if (viewer.classList.contains('is-zoomed')) return;
    vTrack.scrollBy({ left: dir * vTrack.clientWidth, behavior: 'smooth' });
  };
  vPrev.addEventListener('click', () => viewerGo(-1));
  vNext.addEventListener('click', () => viewerGo(1));

  vTrack.addEventListener('scroll', () => requestAnimationFrame(updateViewer), { passive: true });
  $('#viewer-close').addEventListener('click', closeViewer);
  vTrack.addEventListener('click', (e) => { if (e.target === vTrack || e.target.classList.contains('viewer__slide')) closeViewer(); });
  document.addEventListener('keydown', (e) => {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') viewerGo(1);
    if (e.key === 'ArrowLeft') viewerGo(-1);
  });

  /* ---------- Поделиться ссылкой на раздел ---------- */

  const toast = $('#toast');
  let toastTimer;
  function showToast(text) {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 1800);
  }

  async function share(title, id) {
    const url = location.origin + location.pathname + '#' + id;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch (_) {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Ссылка скопирована');
    } catch (_) {
      prompt('Ссылка:', url);
    }
  }

  const SHARE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/></svg>';
  function shareButton(title, id) {
    const btn = el('button', 'share', SHARE_ICON);
    btn.setAttribute('aria-label', `Поделиться ссылкой: ${title}`);
    btn.addEventListener('click', () => share(title, id));
    return btn;
  }

  /* ---------- Тексты ---------- */

  function renderText(paragraphs, tagline) {
    const box = el('div', 'text');
    if (tagline) box.append(el('p', 'text__tagline', tagline));
    (paragraphs || []).forEach((p) => {
      if (Array.isArray(p)) {
        const ul = el('ul');
        p.forEach((li) => ul.append(el('li', null, li)));
        box.append(ul);
      } else {
        box.append(el('p', null, p));
      }
    });
    return box;
  }

  /* ---------- Разделы и модели ---------- */

  function renderModel(model, sec) {
    const box = el('div', 'model');
    if (model.id) box.id = `${sec.id}-${model.id}`;

    const title = model.heading || (model.name ? `Модель: ${model.name}` : '');
    if (title) {
      const head = el('div', 'model__head');
      head.append(el('h3', 'model__title', model.heading
        ? `<b>${model.heading}</b>`
        : `<b>Модель:</b> <i>${model.name}</i>`));
      if (model.id) head.append(shareButton(`${sec.title} — ${model.heading || model.name}`, box.id));
      box.append(head);
    }

    if (model.tagline || model.text) box.append(renderText(model.text, model.tagline));

    if (model.variants && model.variants.length) {
      const row = el('div', 'variants');
      model.variants.forEach((v) => {
        const item = el('div', 'variant', `<div>${priceHtml(v.price)}</div>`);
        const img = el('img');
        img.src = v.icon;
        img.alt = '';
        // ширина колонки пропорциональна ширине иконки
        img.addEventListener('load', () => (item.style.flexGrow = img.naturalWidth));
        item.append(img);
        row.append(item);
      });
      box.append(row);
    }

    if (model.price) box.append(el('div', 'single-price', priceHtml(model.price)));

    if (model.custom) {
      const c = model.custom;
      box.append(el('div', 'custom-price',
        `<span class="custom-price__note">${c.note.join('<br>')}</span>${priceHtml(c.price)}`));
    }

    const photos = model.photos || [];
    if (photos.length) {
      box.append(renderGallery(photos, model.name ? `${sec.title} ${model.name}` : sec.title));
    }
    return box;
  }

  function renderSection(sec) {
    const s = el('section', 'section');
    s.id = sec.id;

    const head = el('div', 'section__head');
    head.append(el('h2', 'section__title', sec.title));
    head.append(shareButton(sec.title, sec.id));
    s.append(head);

    if (sec.heading || sec.text) {
      const intro = el('div', 'model');
      if (sec.heading) intro.append(el('div', 'model__head', `<h3 class="model__title"><b>${sec.heading}</b></h3>`));
      if (sec.text) intro.append(renderText(sec.text));
      s.append(intro);
    }

    sec.models.forEach((m) => s.append(renderModel(m, sec)));
    return s;
  }

  /* ---------- Сборка страницы ---------- */

  const nav = $('#nav-links');
  const main = $('#main');

  SITE.sections.forEach((sec) => {
    const a = el('a', null, sec.navTitle || sec.title);
    a.href = '#' + sec.id;
    nav.append(a);
    main.append(renderSection(sec));
  });

  // Подсветка текущего раздела в меню
  const links = [...nav.querySelectorAll('a')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => {
        const on = a.hash === '#' + en.target.id;
        a.classList.toggle('active', on);
        // прокручиваем только меню по горизонтали, не трогая страницу
        if (on) nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('.section').forEach((s) => io.observe(s));

  // Открытие по ссылке вида #salfetnitsy или #salfetnitsy-status (контент строится
  // скриптом, поэтому прокручиваем вручную после загрузки шрифтов)
  function goToHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'instant' });
  }
  // ждём шрифты и иконки моделей — они меняют высоту страницы
  const icons = [...document.querySelectorAll('.variant img')].map((img) => img.decode().catch(() => {}));
  Promise.all([document.fonts ? document.fonts.ready : null, ...icons]).then(() => requestAnimationFrame(goToHash));
})();
