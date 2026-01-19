// State
let currentUser = null;
let notes = [];
let currentEditingNote = null;
let selectedColor = '#ffffff';
let isChecklistMode = false;
let showingArchived = false;
let ws = null;

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupColorPickers();
});

// ===== AUTH FUNCTIONS =====
async function checkAuth() {
  try {
    const response = await fetch('/api/me');
    if (response.ok) {
      const user = await response.json();
      currentUser = user;
      showApp();
      loadNotes();
      connectWebSocket();
    } else {
      showAuthScreen();
    }
  } catch (error) {
    showAuthScreen();
  }
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('user-info').textContent = currentUser.username;
}

function showLogin() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('auth-error').textContent = '';
}

function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
  document.getElementById('auth-error').textContent = '';
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showAuthError('Fyll i användarnamn och lösenord');
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const user = await response.json();
      currentUser = user;
      showApp();
      loadNotes();
      connectWebSocket();
    } else {
      const error = await response.json();
      showAuthError(error.error || 'Inloggning misslyckades');
    }
  } catch (error) {
    showAuthError('Nätverksfel. Kontrollera din anslutning.');
  }
}

async function register() {
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-password-confirm').value;

  if (!username || !password || !confirmPassword) {
    showAuthError('Fyll i alla fält');
    return;
  }

  if (password !== confirmPassword) {
    showAuthError('Lösenorden matchar inte');
    return;
  }

  if (password.length < 4) {
    showAuthError('Lösenordet måste vara minst 4 tecken');
    return;
  }

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const user = await response.json();
      currentUser = user;
      showApp();
      loadNotes();
      connectWebSocket();
    } else {
      const error = await response.json();
      showAuthError(error.error || 'Registrering misslyckades');
    }
  } catch (error) {
    showAuthError('Nätverksfel. Kontrollera din anslutning.');
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  if (ws) ws.close();
  currentUser = null;
  notes = [];
  showAuthScreen();
}

function showAuthError(message) {
  document.getElementById('auth-error').textContent = message;
}

// ===== WEBSOCKET =====
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'auth', userId: currentUser.id }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'note_created' || data.type === 'note_updated') {
      const existingIndex = notes.findIndex(n => n.id === data.note.id);
      if (existingIndex >= 0) {
        notes[existingIndex] = data.note;
      } else {
        notes.unshift(data.note);
      }
      renderNotes();
    } else if (data.type === 'note_deleted') {
      notes = notes.filter(n => n.id !== data.noteId);
      renderNotes();
    }
  };

  ws.onclose = () => {
    setTimeout(connectWebSocket, 5000);
  };
}

// ===== NOTES FUNCTIONS =====
async function loadNotes() {
  try {
    const response = await fetch(`/api/notes?archived=${showingArchived}`);
    if (response.ok) {
      notes = await response.json();
      renderNotes();
    }
  } catch (error) {
    console.error('Failed to load notes:', error);
  }
}

function renderNotes() {
  const container = document.getElementById('notes-grid');
  const searchTerm = document.getElementById('search-input').value.toLowerCase();

  const filteredNotes = notes.filter(note => {
    if (searchTerm) {
      const titleMatch = note.title.toLowerCase().includes(searchTerm);
      const contentMatch = note.content.toLowerCase().includes(searchTerm);
      return titleMatch || contentMatch;
    }
    return true;
  });

  if (filteredNotes.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #5f6368; grid-column: 1/-1;">Inga anteckningar ännu</p>';
    return;
  }

  container.innerHTML = filteredNotes.map(note => {
    let contentHtml = '';

    if (note.is_checklist && note.checklist_items) {
      const items = Array.isArray(note.checklist_items)
        ? note.checklist_items
        : JSON.parse(note.checklist_items || '[]');

      contentHtml = `
        <ul class="checklist">
          ${items.map(item => `
            <li class="${item.checked ? 'checked' : ''}">
              <input type="checkbox" ${item.checked ? 'checked' : ''} disabled>
              <span>${escapeHtml(item.text)}</span>
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      contentHtml = `<p>${escapeHtml(note.content)}</p>`;
    }

    return `
      <div class="note-card" style="background-color: ${note.color}" onclick="openEditModal(${note.id})">
        ${note.title ? `<h3>${escapeHtml(note.title)}</h3>` : ''}
        ${contentHtml}
      </div>
    `;
  }).join('');
}

async function saveNote() {
  const title = document.getElementById('new-note-title').value.trim();
  const content = document.getElementById('new-note-content').value.trim();

  let checklistItems = null;
  if (isChecklistMode) {
    checklistItems = getChecklistItems('checklist-items');
  }

  if (!title && !content && (!checklistItems || checklistItems.length === 0)) {
    return;
  }

  try {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        color: selectedColor,
        is_checklist: isChecklistMode,
        checklist_items: checklistItems
      })
    });

    if (response.ok) {
      document.getElementById('new-note-title').value = '';
      document.getElementById('new-note-content').value = '';
      selectedColor = '#ffffff';
      isChecklistMode = false;
      document.getElementById('checklist-container').style.display = 'none';
      document.getElementById('new-note-form').style.backgroundColor = '#ffffff';
      document.getElementById('checklist-items').innerHTML = '';
      loadNotes();
    }
  } catch (error) {
    console.error('Failed to save note:', error);
  }
}

function openEditModal(noteId) {
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  currentEditingNote = note;

  document.getElementById('edit-note-title').value = note.title || '';
  document.getElementById('edit-note-content').value = note.content || '';
  document.getElementById('modal-content').style.backgroundColor = note.color;

  if (note.is_checklist && note.checklist_items) {
    const items = Array.isArray(note.checklist_items)
      ? note.checklist_items
      : JSON.parse(note.checklist_items || '[]');

    document.getElementById('edit-checklist-container').style.display = 'block';
    document.getElementById('edit-note-content').style.display = 'none';
    document.getElementById('edit-checklist-toggle').textContent = '☑';

    const container = document.getElementById('edit-checklist-items');
    container.innerHTML = items.map((item, index) => `
      <div class="checklist-item">
        <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="updateEditChecklistItem(${index})">
        <input type="text" value="${escapeHtml(item.text)}" onchange="updateEditChecklistItem(${index})">
        <button onclick="removeEditChecklistItem(${index})">×</button>
      </div>
    `).join('');
  } else {
    document.getElementById('edit-checklist-container').style.display = 'none';
    document.getElementById('edit-note-content').style.display = 'block';
    document.getElementById('edit-checklist-toggle').textContent = '☐';
  }

  document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal(event) {
  if (event && event.target.id !== 'edit-modal') return;
  document.getElementById('edit-modal').classList.remove('active');
  currentEditingNote = null;
}

async function updateNote() {
  if (!currentEditingNote) return;

  const title = document.getElementById('edit-note-title').value.trim();
  const content = document.getElementById('edit-note-content').value.trim();
  const isChecklist = document.getElementById('edit-checklist-container').style.display !== 'none';

  let checklistItems = null;
  if (isChecklist) {
    checklistItems = getChecklistItems('edit-checklist-items');
  }

  try {
    const response = await fetch(`/api/notes/${currentEditingNote.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        color: currentEditingNote.color,
        is_checklist: isChecklist,
        checklist_items: checklistItems,
        is_archived: currentEditingNote.is_archived
      })
    });

    if (response.ok) {
      closeEditModal();
      loadNotes();
    }
  } catch (error) {
    console.error('Failed to update note:', error);
  }
}

async function deleteNote() {
  if (!currentEditingNote) return;

  if (!confirm('Är du säker på att du vill ta bort denna anteckning?')) {
    return;
  }

  try {
    const response = await fetch(`/api/notes/${currentEditingNote.id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      closeEditModal();
      loadNotes();
    }
  } catch (error) {
    console.error('Failed to delete note:', error);
  }
}

async function toggleArchiveNote() {
  if (!currentEditingNote) return;

  currentEditingNote.is_archived = currentEditingNote.is_archived ? 0 : 1;

  try {
    const response = await fetch(`/api/notes/${currentEditingNote.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...currentEditingNote,
        is_checklist: currentEditingNote.is_checklist ? 1 : 0
      })
    });

    if (response.ok) {
      closeEditModal();
      loadNotes();
    }
  } catch (error) {
    console.error('Failed to archive note:', error);
  }
}

function toggleArchived() {
  showingArchived = !showingArchived;
  document.getElementById('archive-toggle-text').textContent =
    showingArchived ? 'Visa aktiva' : 'Visa arkiv';
  loadNotes();
}

function searchNotes() {
  renderNotes();
}

// ===== CHECKLIST FUNCTIONS =====
function toggleChecklist() {
  isChecklistMode = !isChecklistMode;
  const container = document.getElementById('checklist-container');
  const contentArea = document.getElementById('new-note-content');
  const toggle = document.getElementById('checklist-toggle');

  if (isChecklistMode) {
    container.style.display = 'block';
    contentArea.style.display = 'none';
    toggle.textContent = '☑';
    if (document.getElementById('checklist-items').children.length === 0) {
      addChecklistItem();
    }
  } else {
    container.style.display = 'none';
    contentArea.style.display = 'block';
    toggle.textContent = '☐';
  }
}

function addChecklistItem() {
  const container = document.getElementById('checklist-items');
  const index = container.children.length;

  const item = document.createElement('div');
  item.className = 'checklist-item';
  item.innerHTML = `
    <input type="checkbox">
    <input type="text" placeholder="Listpunkt">
    <button onclick="removeChecklistItem(this)">×</button>
  `;

  container.appendChild(item);
  item.querySelector('input[type="text"]').focus();
}

function removeChecklistItem(button) {
  button.parentElement.remove();
}

function getChecklistItems(containerId) {
  const container = document.getElementById(containerId);
  const items = [];

  container.querySelectorAll('.checklist-item').forEach(item => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    const textInput = item.querySelector('input[type="text"]');
    const text = textInput.value.trim();

    if (text) {
      items.push({
        text,
        checked: checkbox.checked
      });
    }
  });

  return items;
}

function toggleEditChecklist() {
  const container = document.getElementById('edit-checklist-container');
  const contentArea = document.getElementById('edit-note-content');
  const toggle = document.getElementById('edit-checklist-toggle');

  if (container.style.display === 'none') {
    container.style.display = 'block';
    contentArea.style.display = 'none';
    toggle.textContent = '☑';

    const itemsContainer = document.getElementById('edit-checklist-items');
    if (itemsContainer.children.length === 0) {
      addEditChecklistItem();
    }
  } else {
    container.style.display = 'none';
    contentArea.style.display = 'block';
    toggle.textContent = '☐';
  }
}

function addEditChecklistItem() {
  const container = document.getElementById('edit-checklist-items');
  const index = container.children.length;

  const item = document.createElement('div');
  item.className = 'checklist-item';
  item.innerHTML = `
    <input type="checkbox">
    <input type="text" placeholder="Listpunkt">
    <button onclick="removeEditChecklistItem(${index})">×</button>
  `;

  container.appendChild(item);
  item.querySelector('input[type="text"]').focus();
}

function removeEditChecklistItem(index) {
  const container = document.getElementById('edit-checklist-items');
  const items = container.querySelectorAll('.checklist-item');
  if (items[index]) {
    items[index].remove();
  }
}

function updateEditChecklistItem(index) {
  // Just triggers re-render on change
}

// ===== COLOR PICKER =====
function setupColorPickers() {
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const color = btn.getAttribute('data-color');

      if (btn.classList.contains('edit-color-btn')) {
        if (currentEditingNote) {
          currentEditingNote.color = color;
          document.querySelector('.modal-content').style.backgroundColor = color;
        }
      } else {
        selectedColor = color;
        document.getElementById('new-note-form').style.backgroundColor = color;
      }
    });
  });
}

// ===== UTILITY =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Enter key handling
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'login-password') {
    login();
  }
  if (e.key === 'Enter' && e.target.id === 'register-password-confirm') {
    register();
  }
  if (e.key === 'Escape') {
    closeEditModal();
  }
});
