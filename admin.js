const dashboard = document.getElementById('dashboard');
const itemForm = document.getElementById('item-form');
const listingList = document.getElementById('listing-list');
const formMessage = document.getElementById('form-message');
let editingId = null;

const categoryNames = {
  'phone-sales': 'Phone sales',
  'phone-repairs': 'Phone repairs',
  'laptop-sales': 'Laptop sales',
  'laptop-repairs': 'Laptop repairs',
  gadgets: 'Gadgets & accessories',
  'phone-parts': 'Phone spare parts',
  'home-showcase': 'Homepage highlights'
};

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { credentials: 'same-origin', ...options });
  } catch {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    throw new Error(isLocal
      ? 'The local server is unavailable. Start it with start-local.bat and try again.'
      : 'The hosted admin service could not be reached. Try again, or contact the site administrator.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

async function initialize() {
  dashboard.hidden = false;
  document.getElementById('server-retry').hidden = true;
  formMessage.textContent = '';
  if (window.location.protocol === 'file:') {
    document.getElementById('dashboard-count').textContent = 'Local server required';
    const message = document.createElement('p');
    message.className = 'hint';
    message.textContent =
      'The admin page was opened as a file, so it cannot reach the catalog. Start the local server with start-local.bat, then open http://127.0.0.1:8765/admin.';
    listingList.replaceChildren(message);
    itemForm.querySelectorAll('input, select, textarea, button').forEach(control => {
      control.disabled = true;
    });
    return;
  }
  try {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isLocal) await api('/api/local-session', { method: 'POST' });
    await showDashboard(isLocal ? 'Local editor' : 'Public editor');
  } catch (error) {
    formMessage.textContent = error.message;
    document.getElementById('server-retry').hidden = false;
  }
}

async function showDashboard(editorLabel) {
  document.getElementById('editor-label').textContent = editorLabel;
  try {
    await refreshListings();
  } catch (error) {
    formMessage.textContent = `Listings could not be loaded: ${error.message}`;
    document.getElementById('server-retry').hidden = false;
  }
}

async function refreshListings() {
  const items = await api('/api/admin/items');
  listingList.replaceChildren();
  document.getElementById('dashboard-count').textContent =
    `${items.length} ${items.length === 1 ? 'listing' : 'listings'}`;
  if (!items.length) {
    const message = document.createElement('p');
    message.className = 'hint';
    message.textContent = 'No listings yet. Add one above to publish it to the matching storefront section.';
    listingList.append(message);
    return;
  }

  for (const item of items) {
    const row = document.createElement('article');
    row.className = 'listing';
    const image = document.createElement('img');
    image.alt = '';
    image.src = item.image || '';
    image.hidden = !item.image;
    const details = document.createElement('div');
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = categoryNames[item.category] || item.category;
    const title = document.createElement('h3');
    title.textContent = item.title;
    const description = document.createElement('p');
    description.textContent = [
      item.price,
      item.model,
      item.stock,
      item.visible ? '' : 'Hidden',
      item.description
    ].filter(Boolean).join(' · ');
    details.append(badge, title, description);
    const actions = document.createElement('div');
    actions.className = 'listing-actions';
    const edit = document.createElement('button');
    edit.className = 'secondary';
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => editListing(item));
    const remove = document.createElement('button');
    remove.className = 'danger';
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => deleteListing(item));
    actions.append(edit, remove);
    row.append(image, details, actions);
    listingList.append(row);
  }
}

function editListing(item) {
  editingId = item.id;
  document.getElementById('editor-title').textContent = 'Edit listing';
  document.getElementById('category').value = item.category;
  document.getElementById('title').value = item.title;
  document.getElementById('description').value = item.description;
  document.getElementById('price').value = item.price;
  document.getElementById('model').value = item.model;
  document.getElementById('part-category').value = item.part_category;
  document.getElementById('target').value = item.target;
  document.getElementById('stock').value = item.stock;
  document.getElementById('visible').checked = Boolean(item.visible);
  document.getElementById('image-file').value = '';
  itemForm.dataset.image = item.image;
  syncEditorForCategory();
  document.getElementById('cancel-edit').hidden = false;
  document.getElementById('save-button').textContent = 'Update listing';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function syncEditorForCategory() {
  const section = document.getElementById('category').value;
  const partCategoryField = document.getElementById('part-category').closest('label');
  const targetField = document.getElementById('target').closest('label');
  const target = document.getElementById('target');

  if (section === 'phone-parts') {
    partCategoryField.hidden = false;
    target.value = 'phones';
  } else {
    partCategoryField.hidden = true;
    if (section === 'phone-sales') target.value = 'phones';
    else if (section === 'phone-repairs') target.value = 'repairs';
    else if (section === 'laptop-sales' || section === 'laptop-repairs') target.value = 'laptops';
    else if (section === 'gadgets') target.value = 'gadgets';
    else target.value = 'phones';
  }

  if (targetField) {
    targetField.hidden = section === 'home-showcase';
  }
}

function resetEditor() {
  editingId = null;
  itemForm.reset();
  itemForm.dataset.image = '';
  document.getElementById('visible').checked = true;
  document.getElementById('part-category').value = 'Accessories';
  document.getElementById('target').value = 'phones';
  syncEditorForCategory();
  document.getElementById('editor-title').textContent = 'Add a listing';
  document.getElementById('cancel-edit').hidden = true;
  document.getElementById('save-button').textContent = 'Save listing';
  formMessage.textContent = '';
  formMessage.className = '';
}

document.getElementById('category').addEventListener('change', syncEditorForCategory);

document.getElementById('server-retry').addEventListener('click', initialize);
async function uploadImage(file) {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocal) {
    const upload = new FormData();
    upload.append('image', file);
    const result = await api('/api/upload', { method: 'POST', body: upload });
    return result.image;
  }

  const uploadInfo = await api('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size
    })
  });
  const body = new FormData();
  body.append('cacheControl', '3600');
  body.append('', file);
  let response;
  try {
    response = await fetch(uploadInfo.signedUrl, {
      method: 'PUT',
      headers: { 'x-upsert': 'false' },
      body
    });
  } catch {
    throw new Error('The image storage service could not be reached.');
  }
  if (!response.ok) {
    throw new Error(`Image upload failed (${response.status}). Check the Supabase storage setup and try again.`);
  }
  return uploadInfo.image;
}

itemForm.addEventListener('submit', async event => {
  event.preventDefault();
  formMessage.textContent = '';
  formMessage.className = '';
  const saveButton = document.getElementById('save-button');
  saveButton.disabled = true;
  try {
    let image = itemForm.dataset.image || '';
    const file = document.getElementById('image-file').files[0];
    if (file) {
      image = await uploadImage(file);
    }
    const listing = {
      category: document.getElementById('category').value,
      title: document.getElementById('title').value,
      description: document.getElementById('description').value,
      price: document.getElementById('price').value,
      model: document.getElementById('model').value,
      part_category: document.getElementById('part-category').value,
      target: document.getElementById('target').value,
      stock: document.getElementById('stock').value,
      image,
      visible: document.getElementById('visible').checked
    };
    await api(editingId ? `/api/items/${editingId}` : '/api/items', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listing)
    });
    resetEditor();
    formMessage.textContent = 'Listing saved. It is now available in its storefront section.';
    formMessage.className = 'success';
    await refreshListings();
  } catch (error) {
    formMessage.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
});

document.getElementById('cancel-edit').addEventListener('click', resetEditor);

syncEditorForCategory();

async function deleteListing(item) {
  if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
  try {
    await api(`/api/items/${item.id}`, { method: 'DELETE' });
    await refreshListings();
  } catch (error) {
    window.alert(error.message);
  }
}

initialize();
