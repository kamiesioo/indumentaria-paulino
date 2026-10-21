/* Utilidades compartidas por todas las plantillas vintage.
   Los datos vienen de ../data/catalog.js (generado por build_vintage_catalog.py a partir de la API del Met). */
(function () {
  const GROUPS = [
    ['Vestidos', /dress|gown|robe|evening/i],
    ['Abrigos y chaquetas', /coat|jacket|cape|cloak|bolero|mantle|wrap|vest/i],
    ['Blusas y camisas', /blouse|shirt|top|bodice|chemise/i],
    ['Faldas y pantalones', /skirt|trouser|pants|shorts|breeches/i],
    ['Trajes', /suit|ensemble|uniform|jumpsuit/i],
    ['Sombreros', /hat|cap|bonnet|turban|hood/i],
    ['Calzado', /shoe|boot|sandal|slipper|pump/i],
    ['Accesorios', /scarf|shawl|glove|bag|purse|belt|tie|stole|collar|fan|muff|stocking|sweater|cardigan/i],
  ];

  function group(it) {
    const t = (it.category + ' ' + it.title);
    for (const [name, re] of GROUPS) if (re.test(t)) return name;
    return 'Otros';
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function prepare() {
    return (window.CATALOG || []).map(it => Object.assign({}, it, {
      group: group(it),
      img: it.local_image ? '../data/' + it.local_image : (it.image_web || it.image_full),
      name: it.title || it.category || 'Sin título',
      year: it.date || '',
    }));
  }

  /* Filtros: devuelve la lista de categorías con conteo */
  function groups(items) {
    const m = {};
    items.forEach(i => m[i.group] = (m[i.group] || 0) + 1);
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  /* Ficha en ventana modal; las clases las estiliza cada plantilla (.v-modal) */
  function modal(it) {
    const d = document.createElement('div');
    d.className = 'v-modal';
    d.innerHTML = `<div class="v-modal-box" role="dialog" aria-modal="true">
      <button class="v-close" aria-label="Cerrar">×</button>
      <img src="${esc(it.image_full || it.img)}" alt="${esc(it.name)}" onerror="this.src='${esc(it.img)}'">
      <div class="v-modal-info">
        <h3>${esc(it.name)}</h3>
        <p>${esc(it.year)}${it.culture ? ' · ' + esc(it.culture) : ''}</p>
        ${it.designer ? `<p><em>${esc(it.designer)}</em></p>` : ''}
        ${it.medium ? `<p class="small">${esc(it.medium)}</p>` : ''}
        <p class="small">${esc(it.credit_line)}</p>
        <a href="${esc(it.source_url)}" target="_blank" rel="noopener">Ver foto en Unsplash ↗</a>
        <p class="small">Licencia Unsplash</p>
      </div></div>`;
    const close = () => { d.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => e.key === 'Escape' && close();
    d.addEventListener('click', e => { if (e.target === d || e.target.classList.contains('v-close')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(d);
  }

  /* Monta un catálogo: opts.render(item) -> html de cada tarjeta; opts.chips/opts.search/opts.grid son selectores */
  function mount(opts) {
    const items = prepare();
    const grid = document.querySelector(opts.grid);
    const chipsBox = opts.chips && document.querySelector(opts.chips);
    const search = opts.search && document.querySelector(opts.search);
    const count = opts.count && document.querySelector(opts.count);
    let active = 'Todo';

    if (!items.length) {
      grid.innerHTML = '<p style="padding:2rem;text-align:center">Todavía no hay catálogo. Ejecutá <code>python3 build_unsplash_catalog.py</code>.</p>';
      return;
    }

    function draw() {
      const q = search ? search.value.trim().toLowerCase() : '';
      const list = items.filter(i => (active === 'Todo' || i.group === active) &&
        (!q || (i.name + ' ' + i.year + ' ' + i.culture + ' ' + i.designer).toLowerCase().includes(q)));
      grid.innerHTML = list.map((i, n) => opts.render(i, n)).join('') || '<p style="padding:2rem">Sin resultados.</p>';
      if (count) count.textContent = list.length;
      grid.querySelectorAll('[data-id]').forEach(el => el.addEventListener('click', e => {
        e.preventDefault();
        modal(items.find(i => String(i.id) === el.dataset.id));
      }));
    }

    if (chipsBox) {
      const all = [['Todo', items.length]].concat(groups(items));
      chipsBox.innerHTML = all.map(([g, n]) =>
        `<button type="button" class="chip${g === 'Todo' ? ' on' : ''}" data-g="${esc(g)}">${esc(g)} <small>${n}</small></button>`).join('');
      chipsBox.addEventListener('click', e => {
        const b = e.target.closest('.chip'); if (!b) return;
        active = b.dataset.g;
        chipsBox.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
        draw();
      });
    }
    if (search) search.addEventListener('input', draw);
    draw();
  }

  /* Estilos base del modal, comunes a todas (cada plantilla los puede sobrescribir con variables) */
  const st = document.createElement('style');
  st.textContent = `
  .v-modal{position:fixed;inset:0;background:rgba(20,12,6,.78);display:flex;align-items:center;justify-content:center;padding:16px;z-index:99}
  .v-modal-box{position:relative;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:0;max-width:900px;width:100%;max-height:92vh;overflow:auto;
    background:var(--m-bg,#f5ecd9);color:var(--m-fg,#2b2016);border:var(--m-border,3px double #6b4a2b);box-shadow:0 20px 60px #0008}
  .v-modal-box img{width:100%;height:100%;max-height:88vh;object-fit:contain;background:#0001;display:block}
  .v-modal-info{padding:24px;font-family:var(--m-font,Georgia,serif)}
  .v-modal-info h3{margin:0 0 8px;font-size:1.4rem;line-height:1.2}
  .v-modal-info p{margin:.4rem 0}.v-modal-info .small{font-size:.8rem;opacity:.75}
  .v-modal-info a{color:var(--m-accent,#8a3b1f)}
  .v-close{position:absolute;top:6px;right:10px;z-index:2;background:none;border:0;font-size:2rem;line-height:1;cursor:pointer;color:var(--m-accent,#8a3b1f)}
  @media(max-width:820px){.v-modal-box{grid-template-columns:1fr;max-width:520px}.v-modal-box img{max-height:55vh;height:auto}.v-modal-info{padding:18px}}
  @media(max-width:480px){.v-modal{padding:8px;align-items:flex-end}.v-modal-box{max-height:94vh}.v-close{top:2px;right:6px;background:#fffc;border-radius:50%;width:38px;height:38px;font-size:1.6rem}}`;
  document.head.appendChild(st);

  window.Vintage = { mount, esc };
})();
