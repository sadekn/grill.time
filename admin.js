import { supabase } from './supabase-config.js';

const STORAGE_BUCKET = 'menu-images';

const $ = (sel) => document.querySelector(sel);

const loginSection = $('#loginSection');
const manageSection = $('#manageSection');
const itemFormSection = $('#itemFormSection');
const signOutBtn = $('#signOutBtn');

const loginForm = $('#loginForm');
const loginError = $('#loginError');

const itemsList = $('#itemsList');
const listEmpty = $('#listEmpty');
const newItemBtn = $('#newItemBtn');

const itemForm = $('#itemForm');
const itemFormTitle = $('#itemFormTitle');
const cancelItemBtn = $('#cancelItemBtn');
const itemError = $('#itemError');
const itemSaving = $('#itemSaving');
const currentImage = $('#currentImage');

// ---------- view state ----------

function show(view) {
  loginSection.hidden = view !== 'login';
  manageSection.hidden = view !== 'list';
  itemFormSection.hidden = view !== 'form';
  signOutBtn.hidden = view === 'login';
}

function setError(el, msg) {
  if (!msg) {
    el.hidden = true;
    el.textContent = '';
  } else {
    el.hidden = false;
    el.textContent = msg;
  }
}

// ---------- session ----------

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    show('list');
    await loadItems();
  } else {
    show('login');
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setError(loginError, '');
  const fd = new FormData(loginForm);
  const { error } = await supabase.auth.signInWithPassword({
    email: fd.get('email'),
    password: fd.get('password'),
  });
  if (error) {
    setError(loginError, error.message);
    return;
  }
  loginForm.reset();
  show('list');
  await loadItems();
});

signOutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  show('login');
});

// ---------- list ----------

async function loadItems() {
  itemsList.innerHTML = '<p class="admin-muted">Loading…</p>';
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    itemsList.innerHTML = `<p class="admin-error">${error.message}</p>`;
    return;
  }

  itemsList.innerHTML = '';
  if (!data || data.length === 0) {
    listEmpty.hidden = false;
    return;
  }
  listEmpty.hidden = true;

  let lastCategory = null;
  for (const item of data) {
    if (item.category !== lastCategory) {
      const h = document.createElement('h3');
      h.className = 'items-list__cat';
      h.textContent = item.category === 'chicken' ? 'Chicken' : 'Meat';
      itemsList.appendChild(h);
      lastCategory = item.category;
    }
    itemsList.appendChild(itemRow(item));
  }
}

function itemRow(item) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.id = item.id;

  const img = document.createElement('div');
  img.className = 'item-row__img';
  if (item.image_url) img.style.backgroundImage = `url('${item.image_url}')`;

  const main = document.createElement('div');
  main.className = 'item-row__main';
  main.innerHTML = `
    <strong>${escapeText(item.tag)} · ${escapeText(item.title)}</strong>
    <small>$${Number(item.price).toFixed(2)}${item.is_featured ? ' · Featured' : ''}${item.ribbon ? ' · ' + escapeText(item.ribbon) : ''}</small>
    <p>${escapeText(item.description)}</p>
  `;

  const actions = document.createElement('div');
  actions.className = 'item-row__actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'admin-btn admin-btn--ghost';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => openForm(item));

  const delBtn = document.createElement('button');
  delBtn.className = 'admin-btn admin-btn--danger';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', () => deleteItem(item));

  actions.append(editBtn, delBtn);
  row.append(img, main, actions);
  return row;
}

function escapeText(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

async function deleteItem(item) {
  if (!confirm(`Delete "${item.title}"?`)) return;
  const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
  if (error) {
    alert(error.message);
    return;
  }
  await loadItems();
}

newItemBtn.addEventListener('click', () => openForm(null));

// ---------- form ----------

function openForm(item) {
  itemForm.reset();
  setError(itemError, '');
  itemSaving.hidden = true;

  if (item) {
    itemFormTitle.textContent = 'Edit Item';
    itemForm.elements.id.value = item.id;
    itemForm.elements.existing_image_url.value = item.image_url || '';
    itemForm.elements.category.value = item.category;
    itemForm.elements.tag.value = item.tag || '';
    itemForm.elements.title.value = item.title || '';
    itemForm.elements.title_ar.value = item.title_ar || '';
    itemForm.elements.description.value = item.description || '';
    itemForm.elements.price.value = item.price ?? '';
    itemForm.elements.sort_order.value = item.sort_order ?? 100;
    itemForm.elements.is_featured.checked = !!item.is_featured;
    itemForm.elements.ribbon.value = item.ribbon || '';
    currentImage.textContent = item.image_url
      ? `Current image set. Choose a file only if you want to replace it.`
      : 'No image yet.';
  } else {
    itemFormTitle.textContent = 'New Item';
    itemForm.elements.id.value = '';
    itemForm.elements.existing_image_url.value = '';
    itemForm.elements.sort_order.value = 100;
    currentImage.textContent = '';
  }
  show('form');
}

cancelItemBtn.addEventListener('click', () => {
  show('list');
});

itemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setError(itemError, '');
  itemSaving.hidden = false;

  try {
    const fd = new FormData(itemForm);
    const id = fd.get('id') || null;
    const file = fd.get('image');
    const existingUrl = fd.get('existing_image_url') || null;

    let imageUrl = existingUrl;

    if (file && file instanceof File && file.size > 0) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }

    if (!id && !imageUrl) {
      throw new Error('Image is required for new items.');
    }

    const payload = {
      category: fd.get('category'),
      tag: (fd.get('tag') || '').trim(),
      title: (fd.get('title') || '').trim(),
      title_ar: (fd.get('title_ar') || '').trim() || null,
      description: (fd.get('description') || '').trim(),
      price: parseFloat(fd.get('price')),
      sort_order: parseInt(fd.get('sort_order') || '100', 10),
      is_featured: fd.get('is_featured') === 'on',
      ribbon: (fd.get('ribbon') || '').trim() || null,
      image_url: imageUrl,
    };

    let result;
    if (id) {
      result = await supabase.from('menu_items').update(payload).eq('id', id);
    } else {
      result = await supabase.from('menu_items').insert(payload);
    }
    if (result.error) throw result.error;

    show('list');
    await loadItems();
  } catch (err) {
    setError(itemError, err.message || String(err));
  } finally {
    itemSaving.hidden = true;
  }
});

// ---------- boot ----------

init();

// React to auth changes (e.g. token refresh expiry)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    show('login');
  }
});
