import { supabase } from './supabase-config.js';

const CATEGORY_ORDER = ['chicken', 'meat'];
const CATEGORY_NAMES = {
  chicken: 'Chicken',
  meat: 'Meat',
};

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const escapeAttr = (s) => escapeHtml(s).replace(/`/g, '&#96;');

const formatPrice = (n) => `$${Number(n).toFixed(2)}`;

function renderItem(item) {
  const wide = !!item.is_featured;
  const ribbon = item.ribbon
    ? `<span class="dish__ribbon">${escapeHtml(item.ribbon)}</span>`
    : '';
  const arabic = item.title_ar
    ? `<p class="dish__title-ar" lang="ar" dir="rtl">${escapeHtml(item.title_ar)}</p>`
    : '';
  const imgUrl = item.image_url || '';

  return `
    <article class="dish${wide ? ' dish--wide' : ''}">
      <div class="dish__media" style="background-image:url('${escapeAttr(imgUrl)}')"></div>
      <div class="dish__body">
        ${wide ? ribbon : ''}
        <p class="dish__tag">${escapeHtml(item.tag)}</p>
        <h3 class="dish__title">${escapeHtml(item.title)}</h3>
        ${arabic}
        <p class="dish__desc">${escapeHtml(item.description)}</p>
        ${!wide ? ribbon : ''}
        <p class="dish__price">${formatPrice(item.price)}</p>
      </div>
    </article>
  `;
}

async function loadMenu() {
  const container = document.querySelector('#menu .container');
  if (!container) return;

  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('Menu: keeping static fallback (Supabase error):', error.message);
    return;
  }
  if (!data || data.length === 0) {
    console.warn('Menu: keeping static fallback (no rows in menu_items)');
    return;
  }

  // Group by category
  const groups = {};
  for (const item of data) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }

  const head = container.querySelector('.section-head');
  const headHtml = head ? head.outerHTML : '';

  const parts = [headHtml];

  for (const cat of CATEGORY_ORDER) {
    const items = groups[cat];
    if (!items || !items.length) continue;

    parts.push(`<h3 class="menu__category">${escapeHtml(CATEGORY_NAMES[cat] || cat)}</h3>`);

    const featured = items.filter((i) => i.is_featured);
    const regular = items.filter((i) => !i.is_featured);

    for (const f of featured) {
      parts.push(renderItem(f));
    }

    if (regular.length) {
      parts.push('<div class="menu__grid">');
      for (const r of regular) parts.push(renderItem(r));
      parts.push('</div>');
    }
  }

  container.innerHTML = parts.join('\n');

  // Make new dishes immediately visible (the page-load reveal observer
  // was bound to the original DOM; replacements skip the animation).
  container.querySelectorAll('.dish').forEach((el) => {
    el.classList.add('reveal', 'is-in');
  });
}

loadMenu();
