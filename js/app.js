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

  /* ---------- Схемы отделений (SVG) ---------- */

  // Колонки: [ширина, количество ячеек]
  const SCHEMES = {
    one: [[62, 1]],
    two: [[62, 1], [36, 3]],
    three: [[36, 2], [62, 1], [36, 3]],
  };

  function shape(x, y, w, h, r, kind) {
    if (kind === 'barrel') {
      const b = Math.min(w * 0.1, 7);
      return `<path d="M${x + b} ${y}H${x + w - b}Q${x + w + b} ${y + h / 2} ${x + w - b} ${y + h}H${x + b}Q${x - b} ${y + h / 2} ${x + b} ${y}Z"/>`;
    }
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
  }

  function schemeSvg(name, kind) {
    const cols = SCHEMES[name] || SCHEMES.one;
    const P = 9, G = 7, H = 116;
    const W = cols.reduce((s, [w]) => s + w, 0) + G * (cols.length - 1) + P * 2;
    let body = shape(1, 1, W - 2, H - 2, 14, kind);
    let x = P;
    cols.forEach(([w, n]) => {
      const ch = (H - P * 2 - G * (n - 1)) / n;
      for (let i = 0; i < n; i++) body += shape(x, P + i * (ch + G), w, ch, 8, kind);
      x += w + G;
    });
    return { w: W, svg: `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${body}</svg>` };
  }

  /* ---------- Галерея ---------- */

  function renderGallery(photos, label) {
    const wrap = el('div', 'gallery');
    const track = el('div', 'gallery__track');
    const items = photos.length ? photos : Array.from({ length: SITE.placeholderCount }, () => null);

    items.forEach((src, i) => {
      const slide = el('figure', 'slide');
      if (src) {
        const img = el('img');
        img.src = src;
        img.loading = 'lazy';
        img.alt = `${label} — фото ${i + 1}`;
        slide.append(img);
      } else {
        slide.classList.add('slide--ph');
        slide.innerHTML = `<span>фото ${i + 1}</span>`;
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

  function openViewer(photos, start) {
    vTrack.innerHTML = '';
    photos.forEach((src, i) => {
      const f = el('figure', 'viewer__slide');
      if (src) {
        const img = el('img');
        img.src = src;
        img.alt = '';
        // нажатие по фото — увеличить / уменьшить
        img.addEventListener('click', (e) => { e.stopPropagation(); toggleZoom(f, e); });
        f.append(img);
      } else {
        f.append(el('div', 'viewer__ph', `<span>фото ${i + 1}</span>`));
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
    vTrack.querySelectorAll('.is-zoomed').forEach((s) => s.classList.remove('is-zoomed'));
    viewer.classList.remove('is-zoomed');
    viewer.hidden = true;
    document.body.style.overflow = '';
  }

  function updateViewer() {
    const n = vTrack.children.length;
    const i = Math.round(vTrack.scrollLeft / vTrack.clientWidth);
    vCounter.textContent = n > 1 ? `${i + 1} / ${n}` : '';
  }

  vTrack.addEventListener('scroll', () => requestAnimationFrame(updateViewer), { passive: true });
  $('#viewer-close').addEventListener('click', closeViewer);
  vTrack.addEventListener('click', (e) => { if (e.target === vTrack || e.target.classList.contains('viewer__slide')) closeViewer(); });
  document.addEventListener('keydown', (e) => {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') vTrack.scrollBy({ left: vTrack.clientWidth, behavior: 'smooth' });
    if (e.key === 'ArrowLeft') vTrack.scrollBy({ left: -vTrack.clientWidth, behavior: 'smooth' });
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

  async function share(sec) {
    const url = location.origin + location.pathname + '#' + sec.id;
    if (navigator.share) {
      try { await navigator.share({ title: sec.title, url }); } catch (_) {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Ссылка скопирована');
    } catch (_) {
      prompt('Ссылка на раздел:', url);
    }
  }

  /* ---------- Разделы и модели ---------- */

  function renderModel(model, sec) {
    const box = el('div', 'model');

    if (model.name) {
      box.append(el('h3', 'model__title', `<b>Модель:</b> <i>${model.name}</i>`));
    }

    if (model.variants && model.variants.length) {
      const row = el('div', 'variants');
      model.variants.forEach((v) => {
        const { w, svg } = schemeSvg(v.scheme, model.shape);
        const item = el('div', 'variant', `<div class="price">${v.price}<small>${SITE.currency}</small></div>${svg}`);
        item.style.flexGrow = w;
        row.append(item);
      });
      box.append(row);
    }

    if (model.custom) {
      const c = model.custom;
      box.append(el('div', 'custom-price',
        `<span class="custom-price__note">${c.note.join('<br>')}</span>` +
        `<span class="price">${c.price}<small>${SITE.currency}</small></span>`));
    }

    box.append(renderGallery(model.photos || [], model.name ? `${sec.title} ${model.name}` : sec.title));
    return box;
  }

  function renderSection(sec) {
    const s = el('section', 'section');
    s.id = sec.id;

    const head = el('div', 'section__head');
    head.append(el('h2', 'section__title', sec.title));
    const btn = el('button', 'share', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/></svg>');
    btn.setAttribute('aria-label', `Поделиться ссылкой на раздел «${sec.title}»`);
    btn.addEventListener('click', () => share(sec));
    head.append(btn);
    s.append(head);

    sec.models.forEach((m) => s.append(renderModel(m, sec)));
    return s;
  }

  /* ---------- Сборка страницы ---------- */

  const nav = $('#nav');
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

  // Открытие по ссылке вида #salfetnitsy (контент строится скриптом,
  // поэтому прокручиваем вручную после загрузки шрифтов)
  function goToHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id && document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'instant' });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(goToHash);
})();
