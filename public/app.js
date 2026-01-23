// State
let currentUser = null;
let notes = [];
let currentEditingNote = null;
let selectedColor = '#ffffff';
let isChecklistMode = false;
let showingArchived = false;
let showingShared = false;
let ws = null;
let csrfToken = null;
let newNoteImages = []; // Filenames of images uploaded for new note
let editNoteImages = []; // Filenames of images for editing note
let showCreatedDate = localStorage.getItem('showCreatedDate') === 'true'; // User preference for showing created date
let renderedNotesMap = new Map(); // Cache of rendered notes by ID for incremental updates

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', async () => {
  await fetchCSRFToken();
  await checkEmailConfig();
  checkForResetToken();
  await checkAuth();
  setupColorPickers();
});

// ===== CSRF TOKEN =====
async function fetchCSRFToken() {
  try {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
}

function getCSRFHeaders() {
  return csrfToken ? { 'CSRF-Token': csrfToken } : {};
}

// ===== AUTH FUNCTIONS =====
async function checkAuth() {
  try {
    const response = await fetch('/api/me', {
      credentials: 'include'
    });
    if (response.ok) {
      const user = await response.json();
      currentUser = user;
      showApp();
      loadNotes();
      connectWebSocket();
      updateProfilePicture();
    } else {
      currentUser = null; // Clear user on auth failure
      showAuthScreen();
    }
  } catch (error) {
    currentUser = null; // Clear user on error
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
  document.getElementById('forgot-password-form').style.display = 'none';
  document.getElementById('reset-password-form').style.display = 'none';
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-success').style.display = 'none';
}

function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
  document.getElementById('forgot-password-form').style.display = 'none';
  document.getElementById('reset-password-form').style.display = 'none';
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-success').style.display = 'none';
}

function showForgotPassword() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('forgot-password-form').style.display = 'block';
  document.getElementById('reset-password-form').style.display = 'none';
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-success').style.display = 'none';
}

function showResetPassword() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('forgot-password-form').style.display = 'none';
  document.getElementById('reset-password-form').style.display = 'block';
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-success').style.display = 'none';
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
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      currentUser = data;
      showApp();
      loadNotes();
      connectWebSocket();
      updateProfilePicture();
    } else {
      showAuthError(data.error || 'Inloggning misslyckades');
      // Refresh CSRF token on auth failure
      await fetchCSRFToken();
    }
  } catch (error) {
    showAuthError('Nätverksfel. Kontrollera din anslutning.');
  }
}

async function register() {
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-password-confirm').value;

  if (!username || !password || !confirmPassword) {
    showAuthError('Fyll i användarnamn och lösenord');
    return;
  }

  if (password !== confirmPassword) {
    showAuthError('Lösenorden matchar inte');
    return;
  }

  // Client-side validation matching server requirements
  if (password.length < 12) {
    showAuthError('Lösenordet måste vara minst 12 tecken');
    return;
  }
  if (!/[A-Z]/.test(password)) {
    showAuthError('Lösenordet måste innehålla minst en stor bokstav');
    return;
  }
  if (!/[a-z]/.test(password)) {
    showAuthError('Lösenordet måste innehålla minst en liten bokstav');
    return;
  }
  if (!/[0-9]/.test(password)) {
    showAuthError('Lösenordet måste innehålla minst en siffra');
    return;
  }

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({ username, password, email: email || null })
    });

    const data = await response.json();

    if (response.ok) {
      currentUser = data;
      showApp();
      loadNotes();
      connectWebSocket();
      updateProfilePicture();
    } else {
      showAuthError(data.error || 'Registrering misslyckades');
      // Refresh CSRF token on auth failure
      await fetchCSRFToken();
    }
  } catch (error) {
    showAuthError('Nätverksfel. Kontrollera din anslutning.');
  }
}

async function logout() {
  await fetch('/api/logout', {
    method: 'POST',
    credentials: 'include'
  });
  if (ws) ws.close();
  currentUser = null;
  notes = [];
  showAuthScreen();
}

function showAuthError(message) {
  const errorElement = document.getElementById('auth-error');
  errorElement.textContent = message;
  document.getElementById('auth-success').style.display = 'none';

  // Add error styling to input fields
  const visibleForms = ['login-form', 'register-form', 'forgot-password-form', 'reset-password-form'];
  let visibleForm = null;
  for (const formId of visibleForms) {
    if (document.getElementById(formId).style.display !== 'none') {
      visibleForm = formId;
      break;
    }
  }

  if (visibleForm) {
    const inputs = document.querySelectorAll(`#${visibleForm} input`);
    inputs.forEach(input => {
      input.style.borderColor = '#d93025';
      input.style.backgroundColor = '#fef7f7';
    });

    // Remove error styling when user starts typing
    inputs.forEach(input => {
      input.addEventListener('input', function clearError() {
        input.style.borderColor = '';
        input.style.backgroundColor = '';
        input.removeEventListener('input', clearError);
      }, { once: true });
    });
  }
}

function showAuthSuccess(message) {
  const successElement = document.getElementById('auth-success');
  successElement.textContent = message;
  successElement.style.display = 'block';
  document.getElementById('auth-error').textContent = '';
}

// ===== PASSWORD RESET =====

// Check if email is configured on the server
async function checkEmailConfig() {
  try {
    const response = await fetch('/api/password-reset/check-config', {
      credentials: 'include'
    });
    const data = await response.json();

    // Show/hide "Forgot password" link based on email configuration
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (data.emailConfigured) {
      forgotPasswordLink.style.display = 'block';
    } else {
      forgotPasswordLink.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to check email configuration:', error);
    // Hide forgot password link on error (graceful fallback)
    document.getElementById('forgot-password-link').style.display = 'none';
  }
}

// Check if there's a reset token in the URL
function checkForResetToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('reset_token');

  if (resetToken) {
    // Store token and show reset password form
    sessionStorage.setItem('resetToken', resetToken);
    showResetPassword();

    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Request password reset
async function requestPasswordReset() {
  const usernameOrEmail = document.getElementById('forgot-password-input').value;

  if (!usernameOrEmail || !usernameOrEmail.trim()) {
    showAuthError('Ange ditt användarnamn eller e-post');
    return;
  }

  try {
    const response = await fetch('/api/password-reset/request', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({ usernameOrEmail: usernameOrEmail.trim() })
    });

    const data = await response.json();

    if (response.ok) {
      showAuthSuccess(data.message);
      // Clear input
      document.getElementById('forgot-password-input').value = '';
    } else if (response.status === 503 && data.emailNotConfigured) {
      showAuthError('E-post är inte konfigurerat. Kontakta din familjeadministratör för att aktivera lösenordsåterställning.');
    } else {
      showAuthError(data.error || 'Ett fel uppstod');
    }

    // Refresh CSRF token
    await fetchCSRFToken();
  } catch (error) {
    showAuthError('Nätverksfel. Kontrollera din anslutning.');
  }
}

// Reset password with token
async function resetPassword() {
  const token = sessionStorage.getItem('resetToken');
  const newPassword = document.getElementById('reset-password-new').value;
  const confirmPassword = document.getElementById('reset-password-confirm').value;

  if (!token) {
    showAuthError('Ogiltig återställningslänk. Begär en ny.');
    return;
  }

  if (!newPassword || !confirmPassword) {
    showAuthError('Fyll i båda fälten');
    return;
  }

  if (newPassword !== confirmPassword) {
    showAuthError('Lösenorden matchar inte');
    return;
  }

  // Client-side validation matching server requirements
  if (newPassword.length < 12) {
    showAuthError('Lösenordet måste vara minst 12 tecken');
    return;
  }
  if (!/[A-Z]/.test(newPassword)) {
    showAuthError('Lösenordet måste innehålla minst en stor bokstav');
    return;
  }
  if (!/[a-z]/.test(newPassword)) {
    showAuthError('Lösenordet måste innehålla minst en liten bokstav');
    return;
  }
  if (!/[0-9]/.test(newPassword)) {
    showAuthError('Lösenordet måste innehålla minst en siffra');
    return;
  }

  try {
    const response = await fetch('/api/password-reset/verify', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({ token, newPassword })
    });

    const data = await response.json();

    if (response.ok) {
      // Clear token
      sessionStorage.removeItem('resetToken');

      // Show success and redirect to login
      showAuthSuccess(data.message);

      // Clear form
      document.getElementById('reset-password-new').value = '';
      document.getElementById('reset-password-confirm').value = '';

      // Redirect to login after 2 seconds
      setTimeout(() => {
        showLogin();
      }, 2000);
    } else {
      showAuthError(data.error || 'Återställning misslyckades');
    }

    // Refresh CSRF token
    await fetchCSRFToken();
  } catch (error) {
    showAuthError('Nätverksfel. Kontrollera din anslutning.');
  }
}

// ===== WEBSOCKET =====
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'note_created' || data.type === 'note_updated') {
        const existingIndex = notes.findIndex(n => n.id === data.note.id);
        if (existingIndex >= 0) {
          notes[existingIndex] = data.note;
        } else {
          notes.unshift(data.note);
        }
        // Use incremental update for better performance
        updateSingleNote(data.note);
      } else if (data.type === 'note_deleted' || data.type === 'note_unshared') {
        notes = notes.filter(n => n.id !== data.noteId);
        removeSingleNote(data.noteId);
      } else if (data.type === 'note_shared') {
        // Reload notes to show newly shared note
        if (showingShared) {
          loadNotes();
        }
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  };

  ws.onclose = (event) => {
    console.log('WebSocket disconnected', event.code, event.reason);
    // Don't reconnect if server rejected (auth error)
    if (event.code === 1008) {
      console.log('WebSocket closed by server - authentication required');
      currentUser = null; // Clear user on auth failure
      showAuthScreen();
      return;
    }
    // Only reconnect if user is still logged in
    if (currentUser) {
      console.log('Reconnecting in 5 seconds...');
      setTimeout(connectWebSocket, 5000);
    } else {
      console.log('Not reconnecting - user not logged in');
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// ===== PROFILE PICTURE (AVATAR) =====
function updateProfilePicture() {
  const profilePicElement = document.getElementById('user-profile-pic');
  if (currentUser) {
    const initials = currentUser.username.substring(0, 2).toUpperCase();
    const avatarColor = currentUser.avatarColor || '#1a73e8';
    profilePicElement.innerHTML = initials;
    profilePicElement.style.backgroundColor = avatarColor;
  } else {
    profilePicElement.innerHTML = '??';
    profilePicElement.style.backgroundColor = '#e8eaed';
  }
}

function openProfileModal() {
  // Update profile info
  const profileUsername = document.getElementById('profile-username');
  if (profileUsername && currentUser) {
    profileUsername.textContent = currentUser.username;
  }

  // Update created date toggle
  const dateToggle = document.getElementById('show-created-date-toggle');
  if (dateToggle) {
    dateToggle.checked = showCreatedDate;
  }

  // Update profile picture preview with initials and color
  const profilePicPreview = document.getElementById('profile-picture-preview');
  if (profilePicPreview && currentUser) {
    const initials = currentUser.username.substring(0, 2).toUpperCase();
    const avatarColor = currentUser.avatarColor || '#1a73e8';
    profilePicPreview.innerHTML = initials;
    profilePicPreview.style.backgroundColor = avatarColor;

    // Highlight selected avatar color
    updateSelectedAvatarColor(avatarColor);
  }

  document.getElementById('profile-modal').classList.add('active');
}

function toggleShowCreatedDate() {
  showCreatedDate = !showCreatedDate;
  localStorage.setItem('showCreatedDate', showCreatedDate);
  renderNotes(); // Re-render notes to show/hide dates
}

function closeProfileModal(event) {
  if (event && event.target.id !== 'profile-modal') return;
  document.getElementById('profile-modal').classList.remove('active');
}

// ===== AVATAR COLOR =====
async function selectAvatarColor(color) {
  try {
    const response = await fetch('/api/profile/avatar-color', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({ avatarColor: color })
    });

    if (response.ok) {
      currentUser.avatarColor = color;
      updateProfilePicture();
      updateSelectedAvatarColor(color);
    } else {
      alert('Kunde inte uppdatera avatarfärg');
    }
  } catch (error) {
    alert('Nätverksfel');
  }
}

function updateSelectedAvatarColor(color) {
  // Remove selected class from all color options
  document.querySelectorAll('.avatar-color-option').forEach(btn => {
    btn.classList.remove('selected');
  });

  // Add selected class to the chosen color
  const selectedBtn = document.querySelector(`.avatar-color-option[data-color="${color}"]`);
  if (selectedBtn) {
    selectedBtn.classList.add('selected');
  }
}

// Format created date for display
function formatCreatedDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // If today, show time
  if (diffDays === 0) {
    return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  }
  // If this year, show date without year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
  }
  // Otherwise show full date
  return date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ===== NOTES FUNCTIONS =====

// Incremental update: Update or add a single note without full re-render
function updateSingleNote(note) {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();

  // Check if note matches current search/filter
  const matchesSearch = !searchTerm ||
    note.title.toLowerCase().includes(searchTerm) ||
    note.content.toLowerCase().includes(searchTerm);

  if (!matchesSearch) {
    removeSingleNote(note.id);
    return;
  }

  const isPinned = note.is_pinned;
  const container = isPinned
    ? document.getElementById('pinned-notes-grid')
    : document.getElementById('notes-grid');

  // Find existing card
  const existingCard = container.querySelector(`[data-note-id="${note.id}"]`);

  // Render note HTML
  const noteHtml = renderNoteHTML(note);

  if (existingCard) {
    // Update existing card
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = noteHtml;
    const newCard = tempDiv.firstElementChild;
    existingCard.replaceWith(newCard);

    // Re-calculate grid span for the updated card
    requestAnimationFrame(() => calculateCardLayout(newCard));
  } else {
    // Add new card at the beginning
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = noteHtml;
    const newCard = tempDiv.firstElementChild;
    container.insertBefore(newCard, container.firstChild);

    // Calculate grid span for new card
    requestAnimationFrame(() => calculateCardLayout(newCard));
  }

  // Update section visibility
  updateSectionVisibility();
}

// Remove a single note from DOM
function removeSingleNote(noteId) {
  const card = document.querySelector(`[data-note-id="${noteId}"]`);
  if (card) {
    card.remove();
    updateSectionVisibility();
  }
}

// Calculate grid layout for a single card
function calculateCardLayout(card) {
  const cardHeight = card.getBoundingClientRect().height;
  const rowHeight = 10;
  const gap = 16;
  const rowSpan = Math.ceil((cardHeight + gap) / (rowHeight + gap));
  card.style.gridRowEnd = `span ${rowSpan}`;

  // Check truncation
  if (card.scrollHeight > card.clientHeight) {
    card.classList.add('truncated');
    const bgColor = window.getComputedStyle(card).backgroundColor;
    const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      card.style.setProperty('--card-color-r', r);
      card.style.setProperty('--card-color-g', g);
      card.style.setProperty('--card-color-b', b);
    }
  }
}

// Update visibility of pinned/regular sections
function updateSectionVisibility() {
  const pinnedSection = document.getElementById('pinned-section');
  const pinnedGrid = document.getElementById('pinned-notes-grid');
  const otherLabel = document.getElementById('other-label');
  const regularGrid = document.getElementById('notes-grid');

  const hasPinned = pinnedGrid.children.length > 0;
  const hasRegular = regularGrid.children.length > 0;

  pinnedSection.style.display = hasPinned ? 'block' : 'none';
  otherLabel.style.display = (hasPinned && hasRegular) ? 'block' : 'none';
}

// Render a single note's HTML (extracted from renderNotes)
function renderNoteHTML(note) {
  let contentHtml = '';
  let shareIndicator = '';
  let ownerIndicator = '';
  let pinIndicator = '';

  // Show pin indicator if pinned
  if (note.is_pinned) {
    pinIndicator = '<div class="pin-indicator">📌</div>';
  }

  // Show owner if this is a shared note
  if (note.isShared && note.owner_username) {
    const initials = note.owner_username.substring(0, 2).toUpperCase();
    const avatarColor = note.owner_avatar_color || '#1a73e8';
    const ownerAvatar = `<div class="profile-initials-small" style="background-color: ${avatarColor};">${initials}</div>`;

    ownerIndicator = `
      <div class="note-owner">
        ${ownerAvatar}
        <span>${note.owner_username}</span>
      </div>
    `;
  }

  // Show share count if owned by user
  if (!note.isShared && note.share_count > 0) {
    shareIndicator = `<span class="share-indicator" title="Delad med ${note.share_count} ${note.share_count === 1 ? 'person' : 'personer'}">👥 ${note.share_count}</span>`;
  }

  if (note.is_checklist && note.checklist_items) {
    const items = Array.isArray(note.checklist_items)
      ? note.checklist_items
      : JSON.parse(note.checklist_items || '[]');

    contentHtml = `
      <ul class="checklist">
        ${items.map(item => `
          <li class="${item.checked ? 'checked' : ''}">
            <input type="checkbox" ${item.checked ? 'checked' : ''} disabled>
            <span>${linkify(item.text)}</span>
          </li>
        `).join('')}
      </ul>
    `;
  } else {
    contentHtml = `<p>${linkify(note.content)}</p>`;
  }

  // Render images with lazy loading
  let imagesHtml = '';
  if (note.images && Array.isArray(note.images) && note.images.length > 0) {
    imagesHtml = `
      <div class="note-images" onclick="event.stopPropagation()">
        ${note.images.map(img => `
          <img src="/api/notes/image/${img}" alt="Note image" loading="lazy" onclick="openImageModal('${img}')">
        `).join('')}
      </div>
    `;
  }

  // Format created date if enabled
  let dateHtml = '';
  if (showCreatedDate && note.created_at) {
    const formattedDate = formatCreatedDate(note.created_at);
    dateHtml = `<div class="note-created-date">${formattedDate}</div>`;
  }

  return `
    <div class="note-card" data-note-id="${note.id}" style="background-color: ${escapeHtml(note.color)}" onclick="openEditModal(${note.id})">
      ${pinIndicator}
      ${ownerIndicator}
      ${note.title ? `<h3>${escapeHtml(note.title)}${dateHtml}</h3>` : dateHtml}
      ${contentHtml}
      ${imagesHtml}
      ${shareIndicator}
    </div>
  `;
}

async function loadNotes() {
  try {
    const url = showingArchived
      ? '/api/notes?archived=true'
      : showingShared
        ? '/api/notes?shared=true'
        : '/api/notes';

    const response = await fetch(url, {
      credentials: 'include'
    });
    if (response.ok) {
      notes = await response.json();
      renderNotes();
    }
  } catch (error) {
    console.error('Failed to load notes:', error);
  }
}

function renderNotes() {
  const regularContainer = document.getElementById('notes-grid');
  const pinnedContainer = document.getElementById('pinned-notes-grid');
  const pinnedSection = document.getElementById('pinned-section');
  const otherLabel = document.getElementById('other-label');
  const searchTerm = document.getElementById('search-input').value.toLowerCase();

  const filteredNotes = notes.filter(note => {
    if (searchTerm) {
      const titleMatch = note.title.toLowerCase().includes(searchTerm);
      const contentMatch = note.content.toLowerCase().includes(searchTerm);
      return titleMatch || contentMatch;
    }
    return true;
  });

  // Separate pinned and regular notes
  const pinnedNotes = filteredNotes.filter(note => note.is_pinned);
  const regularNotes = filteredNotes.filter(note => !note.is_pinned);

  // Sort each group by updated_at descending (newest first)
  pinnedNotes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  regularNotes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  // Show/hide sections
  if (pinnedNotes.length > 0) {
    pinnedSection.style.display = 'block';
    // Show "ANDRA" label only if there are both pinned and regular notes
    otherLabel.style.display = regularNotes.length > 0 ? 'block' : 'none';
  } else {
    pinnedSection.style.display = 'none';
    otherLabel.style.display = 'none';
  }

  if (filteredNotes.length === 0) {
    const emptyMessage = showingShared
      ? 'Inga delade anteckningar ännu'
      : showingArchived
        ? 'Inga arkiverade anteckningar'
        : 'Inga anteckningar ännu';
    regularContainer.innerHTML = `<p style="text-align: center; color: #5f6368; grid-column: 1/-1;">${emptyMessage}</p>`;
    pinnedContainer.innerHTML = '';
    return;
  }

  // Render pinned and regular notes in their respective containers
  pinnedContainer.innerHTML = pinnedNotes.map(note => renderNoteHTML(note)).join('');
  regularContainer.innerHTML = regularNotes.map(note => renderNoteHTML(note)).join('');

  // Use requestAnimationFrame for smooth DOM updates after render
  requestAnimationFrame(() => {
    const allCards = [
      ...pinnedContainer.querySelectorAll('.note-card'),
      ...regularContainer.querySelectorAll('.note-card')
    ];

    allCards.forEach((card, index) => {
      // Calculate grid-row span based on card height
      // Each grid row unit is 10px, gap is 16px
      const cardHeight = card.getBoundingClientRect().height;
      const rowHeight = 10; // Must match grid-auto-rows in CSS
      const gap = 16; // Must match gap in CSS
      const rowSpan = Math.ceil((cardHeight + gap) / (rowHeight + gap));
      card.style.gridRowEnd = `span ${rowSpan}`;

      // Check if card content is truncated (scrollHeight > clientHeight)
      if (card.scrollHeight > card.clientHeight) {
        card.classList.add('truncated');

        // Use CSS custom properties for gradient color
        const bgColor = window.getComputedStyle(card).backgroundColor;
        const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const [, r, g, b] = rgbMatch;
          card.style.setProperty('--card-color-r', r);
          card.style.setProperty('--card-color-g', g);
          card.style.setProperty('--card-color-b', b);
        }
      }
    });
  });
}

async function saveNote() {
  const title = document.getElementById('new-note-title').value.trim();
  const content = document.getElementById('new-note-content').value.trim();

  let checklistItems = null;
  if (isChecklistMode) {
    checklistItems = getChecklistItems('checklist-items');
  }

  if (!title && !content && (!checklistItems || checklistItems.length === 0) && newNoteImages.length === 0) {
    return;
  }

  try {
    const response = await fetch('/api/notes', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({
        title,
        content,
        color: selectedColor,
        is_checklist: isChecklistMode,
        checklist_items: checklistItems,
        images: newNoteImages
      })
    });

    if (response.ok) {
      document.getElementById('new-note-title').value = '';
      document.getElementById('new-note-content').value = '';
      selectedColor = '#ffffff';
      isChecklistMode = false;
      newNoteImages = [];
      document.getElementById('checklist-container').style.display = 'none';
      document.getElementById('images-container').style.display = 'none';
      document.getElementById('images-preview').innerHTML = '';
      document.getElementById('new-note-form').style.backgroundColor = '#ffffff';
      document.getElementById('checklist-items').innerHTML = '';
      loadNotes();
    } else if (response.status === 403) {
      // CSRF token expired, refresh and retry
      await fetchCSRFToken();
      alert('Session expired, please try again');
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

  // Show/hide edit options based on permission
  const canEdit = !note.isShared || note.permission === 'edit';
  const canDelete = !note.isShared; // Only owner can delete
  const canShare = !note.isShared; // Only owner can share

  document.getElementById('edit-note-title').disabled = !canEdit;
  document.getElementById('edit-note-content').disabled = !canEdit;
  document.getElementById('edit-checklist-toggle').disabled = !canEdit;
  document.getElementById('update-note-btn').style.display = canEdit ? 'inline-block' : 'none';
  document.getElementById('delete-note-btn').style.display = canDelete ? 'inline-block' : 'none';
  document.getElementById('archive-note-btn').style.display = canEdit ? 'inline-block' : 'none';
  document.getElementById('share-note-btn').style.display = canShare ? 'inline-block' : 'none';

  // Pin button - only owner can pin
  const pinBtn = document.getElementById('pin-note-btn');
  if (pinBtn) {
    pinBtn.style.display = canDelete ? 'inline-block' : 'none'; // Same as delete - only owner
    pinBtn.textContent = note.is_pinned ? '📍' : '📌'; // 📍 = pinned, 📌 = unpinned
    pinBtn.title = note.is_pinned ? 'Avfästa' : 'Fäst';
  }

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
        <input type="checkbox" ${item.checked ? 'checked' : ''} ${!canEdit ? 'disabled' : ''} onchange="updateEditChecklistItem(${index})">
        <input type="text" value="${escapeHtml(item.text)}" ${!canEdit ? 'disabled' : ''} onchange="updateEditChecklistItem(${index})">
        ${canEdit ? `<button onclick="removeEditChecklistItem(${index})">×</button>` : ''}
      </div>
    `).join('');
  } else {
    document.getElementById('edit-checklist-container').style.display = 'none';
    document.getElementById('edit-note-content').style.display = 'block';
    document.getElementById('edit-checklist-toggle').textContent = '☐';
  }

  // Handle images
  editNoteImages = note.images && Array.isArray(note.images) ? [...note.images] : [];
  if (editNoteImages.length > 0) {
    document.getElementById('edit-images-container').style.display = 'block';
    renderImagePreview('edit-images-preview', editNoteImages, canEdit);
  } else {
    document.getElementById('edit-images-container').style.display = 'none';
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
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({
        title,
        content,
        color: currentEditingNote.color,
        is_checklist: isChecklist,
        checklist_items: checklistItems,
        is_archived: currentEditingNote.is_archived,
        images: editNoteImages
      })
    });

    if (response.ok) {
      closeEditModal();
      loadNotes();
    } else if (response.status === 403) {
      await fetchCSRFToken();
      alert('Session expired, please try again');
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
      method: 'DELETE',
      credentials: 'include',
      headers: getCSRFHeaders()
    });

    if (response.ok) {
      closeEditModal();
      loadNotes();
    } else if (response.status === 403) {
      await fetchCSRFToken();
      alert('Session expired, please try again');
    }
  } catch (error) {
    console.error('Failed to delete note:', error);
  }
}

async function togglePinNote() {
  if (!currentEditingNote) return;

  try {
    const response = await fetch(`/api/notes/${currentEditingNote.id}/pin`, {
      method: 'POST',
      credentials: 'include',
      headers: getCSRFHeaders()
    });

    if (response.ok) {
      const data = await response.json();
      currentEditingNote.is_pinned = data.is_pinned;

      // Update pin button icon in modal
      const pinBtn = document.getElementById('pin-note-btn');
      if (pinBtn) {
        pinBtn.textContent = data.is_pinned ? '📍' : '📌'; // 📍 = pinned, 📌 = unpinned
        pinBtn.title = data.is_pinned ? 'Avfästa' : 'Fäst';
      }

      loadNotes();
    } else if (response.status === 403) {
      await fetchCSRFToken();
      alert('Session expired, please try again');
    }
  } catch (error) {
    console.error('Failed to pin note:', error);
  }
}

async function toggleArchiveNote() {
  if (!currentEditingNote) return;

  currentEditingNote.is_archived = currentEditingNote.is_archived ? 0 : 1;

  try {
    const response = await fetch(`/api/notes/${currentEditingNote.id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({
        ...currentEditingNote,
        is_checklist: currentEditingNote.is_checklist ? 1 : 0
      })
    });

    if (response.ok) {
      closeEditModal();
      loadNotes();
    } else if (response.status === 403) {
      await fetchCSRFToken();
      alert('Session expired, please try again');
    }
  } catch (error) {
    console.error('Failed to archive note:', error);
  }
}

function toggleArchived() {
  showingArchived = !showingArchived;
  showingShared = false;
  document.getElementById('archive-toggle-text').textContent =
    showingArchived ? 'Visa aktiva' : 'Visa arkiv';
  document.getElementById('shared-toggle-text').textContent = 'Visa delade';
  loadNotes();
}

function toggleShared() {
  showingShared = !showingShared;
  showingArchived = false;
  document.getElementById('shared-toggle-text').textContent =
    showingShared ? 'Visa mina' : 'Visa delade';
  document.getElementById('archive-toggle-text').textContent = 'Visa arkiv';
  loadNotes();
}

// Debounced search to avoid rendering on every keystroke
let searchTimeout = null;
function searchNotes() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    renderNotes();
  }, 150); // Wait 150ms after last keystroke
}

// ===== SHARING FUNCTIONS =====
let availableUsers = [];

async function openShareModal() {
  if (!currentEditingNote) return;

  try {
    // Load available users
    const usersResponse = await fetch('/api/users', {
      credentials: 'include'
    });
    if (usersResponse.ok) {
      availableUsers = await usersResponse.json();
    }

    // Load current shares
    const sharesResponse = await fetch(`/api/notes/${currentEditingNote.id}/shares`, {
      credentials: 'include'
    });
    if (sharesResponse.ok) {
      const shares = await sharesResponse.json();
      renderShareModal(shares);
    }

    document.getElementById('share-modal').classList.add('active');
  } catch (error) {
    console.error('Failed to load sharing data:', error);
  }
}

function closeShareModal(event) {
  if (event && event.target.id !== 'share-modal') return;
  document.getElementById('share-modal').classList.remove('active');
}

function renderShareModal(currentShares) {
  const usersContainer = document.getElementById('share-users-list');
  const sharesContainer = document.getElementById('current-shares-list');

  // Render available users
  usersContainer.innerHTML = availableUsers.map(user => {
    const isShared = currentShares.some(s => s.shared_with_user_id === user.id);
    const initials = user.username.substring(0, 2).toUpperCase();
    const avatarColor = user.avatar_color || '#1a73e8';
    const profileAvatar = `<div class="profile-initials-small" style="background-color: ${avatarColor};">${initials}</div>`;

    return `
      <div class="share-user-item ${isShared ? 'shared' : ''}" onclick="toggleShare(${user.id}, '${user.username}', ${isShared})">
        ${profileAvatar}
        <span>${escapeHtml(user.username)}</span>
        ${isShared ? '<span class="share-check">✓</span>' : ''}
      </div>
    `;
  }).join('');

  // Render current shares
  if (currentShares.length > 0) {
    sharesContainer.innerHTML = currentShares.map(share => {
      const initials = share.username.substring(0, 2).toUpperCase();
      const avatarColor = share.avatar_color || '#1a73e8';
      const profileAvatar = `<div class="profile-initials-small" style="background-color: ${avatarColor};">${initials}</div>`;

      return `
        <div class="current-share-item">
          ${profileAvatar}
          <span>${escapeHtml(share.username)}</span>
          <select onchange="updateSharePermission(${share.shared_with_user_id}, this.value)">
            <option value="view" ${share.permission === 'view' ? 'selected' : ''}>Visa</option>
            <option value="edit" ${share.permission === 'edit' ? 'selected' : ''}>Redigera</option>
          </select>
          <button onclick="removeShare(${share.shared_with_user_id}, '${share.username}')" class="btn-icon">🗑️</button>
        </div>
      `;
    }).join('');
  } else {
    sharesContainer.innerHTML = '<p style="text-align: center; color: #5f6368;">Ingen delning ännu</p>';
  }
}

async function toggleShare(userId, username, isCurrentlyShared) {
  if (!currentEditingNote) return;

  if (isCurrentlyShared) {
    await removeShare(userId, username);
  } else {
    await addShare(userId, username);
  }
}

async function addShare(userId, username) {
  if (!currentEditingNote) return;

  try {
    const response = await fetch(`/api/notes/${currentEditingNote.id}/share`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({
        userId: userId,
        permission: 'view'
      })
    });

    if (response.ok) {
      // Reload share modal
      const sharesResponse = await fetch(`/api/notes/${currentEditingNote.id}/shares`, {
        credentials: 'include'
      });
      if (sharesResponse.ok) {
        const shares = await sharesResponse.json();
        renderShareModal(shares);
      }
    } else if (response.status === 403) {
      await fetchCSRFToken();
      alert('Session expired, please try again');
    }
  } catch (error) {
    console.error('Failed to share note:', error);
  }
}

async function removeShare(userId, username) {
  if (!currentEditingNote) return;

  if (!confirm(`Ta bort delning med ${username}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/notes/${currentEditingNote.id}/share/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getCSRFHeaders()
    });

    if (response.ok) {
      // Reload share modal
      const sharesResponse = await fetch(`/api/notes/${currentEditingNote.id}/shares`, {
        credentials: 'include'
      });
      if (sharesResponse.ok) {
        const shares = await sharesResponse.json();
        renderShareModal(shares);
      }
    } else if (response.status === 403) {
      await fetchCSRFToken();
      alert('Session expired, please try again');
    }
  } catch (error) {
    console.error('Failed to remove share:', error);
  }
}

async function updateSharePermission(userId, permission) {
  if (!currentEditingNote) return;

  try {
    const response = await fetch(`/api/notes/${currentEditingNote.id}/share`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({
        userId: userId,
        permission: permission
      })
    });

    if (response.ok) {
      console.log('Permission updated');
    } else if (response.status === 403) {
      await fetchCSRFToken();
      alert('Session expired, please try again');
    }
  } catch (error) {
    console.error('Failed to update permission:', error);
  }
}

// ===== CHECKLIST FUNCTIONS =====
function toggleChecklist() {
  isChecklistMode = !isChecklistMode;
  const container = document.getElementById('checklist-container');
  const contentArea = document.getElementById('new-note-content');
  const toggle = document.getElementById('checklist-toggle');
  const itemsContainer = document.getElementById('checklist-items');

  if (isChecklistMode) {
    // Switching TO checklist mode
    const existingContent = contentArea.value.trim();

    // Warn user if converting existing text to checklist
    if (existingContent && itemsContainer.children.length === 0) {
      const confirmed = confirm('Detta omvandlar befintlig text till checklista. Vill du fortsätta?');
      if (!confirmed) {
        // User cancelled, revert the toggle
        isChecklistMode = false;
        return;
      }
    }

    container.style.display = 'block';
    contentArea.style.display = 'none';
    toggle.textContent = '☑';

    // Convert existing text content to checklist items
    if (existingContent && itemsContainer.children.length === 0) {
      // Split content by newlines and create checklist items
      const lines = existingContent.split('\n').filter(line => line.trim() !== '');
      lines.forEach(line => {
        const item = document.createElement('div');
        item.className = 'checklist-item';
        item.innerHTML = `
          <input type="checkbox">
          <input type="text" value="${escapeHtml(line.trim())}" placeholder="Listpunkt">
          <button onclick="removeChecklistItem(this)">×</button>
        `;
        itemsContainer.appendChild(item);
      });

      // Clear the textarea since content is now in checklist
      contentArea.value = '';
    } else if (itemsContainer.children.length === 0) {
      // No existing content, add empty checklist item
      addChecklistItem();
    }
  } else {
    // Switching FROM checklist mode back to text mode
    // Convert checklist items back to text
    const items = [];
    itemsContainer.querySelectorAll('.checklist-item').forEach(item => {
      const textInput = item.querySelector('input[type="text"]');
      if (textInput && textInput.value.trim()) {
        items.push(textInput.value.trim());
      }
    });

    // If there are checklist items and no text content, convert them to text
    if (items.length > 0 && !contentArea.value.trim()) {
      contentArea.value = items.join('\n');
    }

    // Clear checklist items
    itemsContainer.innerHTML = '';

    container.style.display = 'none';
    contentArea.style.display = 'block';
    toggle.textContent = '☐';
  }
}

function addChecklistItem() {
  const container = document.getElementById('checklist-items');

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
  const itemsContainer = document.getElementById('edit-checklist-items');

  if (container.style.display === 'none') {
    // Switching TO checklist mode
    const existingContent = contentArea.value.trim();

    // Warn user if converting existing text to checklist
    if (existingContent && itemsContainer.children.length === 0) {
      const confirmed = confirm('Detta omvandlar befintlig text till checklista. Vill du fortsätta?');
      if (!confirmed) {
        // User cancelled, don't switch to checklist mode
        return;
      }
    }

    container.style.display = 'block';
    contentArea.style.display = 'none';
    toggle.textContent = '☑';

    // Convert existing text content to checklist items
    if (existingContent && itemsContainer.children.length === 0) {
      // Split content by newlines and create checklist items
      const lines = existingContent.split('\n').filter(line => line.trim() !== '');
      lines.forEach(line => {
        const item = document.createElement('div');
        item.className = 'checklist-item';
        item.innerHTML = `
          <input type="checkbox">
          <input type="text" value="${escapeHtml(line.trim())}" placeholder="Listpunkt">
          <button onclick="removeEditChecklistItem(${itemsContainer.children.length})">×</button>
        `;
        itemsContainer.appendChild(item);
      });

      // Clear the textarea since content is now in checklist
      contentArea.value = '';
    } else if (itemsContainer.children.length === 0) {
      // No existing content, add empty checklist item
      addEditChecklistItem();
    }
  } else {
    // Switching FROM checklist mode back to text mode
    // Convert checklist items back to text
    const items = [];
    itemsContainer.querySelectorAll('.checklist-item').forEach(item => {
      const textInput = item.querySelector('input[type="text"]');
      if (textInput && textInput.value.trim()) {
        items.push(textInput.value.trim());
      }
    });

    // If there are checklist items and no text content, convert them to text
    if (items.length > 0 && !contentArea.value.trim()) {
      contentArea.value = items.join('\n');
    }

    // Clear checklist items
    itemsContainer.innerHTML = '';

    container.style.display = 'none';
    contentArea.style.display = 'block';
    toggle.textContent = '☐';
  }
}

function addEditChecklistItem() {
  const container = document.getElementById('edit-checklist-items');

  const item = document.createElement('div');
  item.className = 'checklist-item';
  item.innerHTML = `
    <input type="checkbox">
    <input type="text" placeholder="Listpunkt">
    <button onclick="removeEditChecklistItem(${container.children.length})">×</button>
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
  // Handle color picker toggle buttons
  document.querySelectorAll('.color-picker > .btn-icon').forEach(toggleBtn => {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const colorPicker = toggleBtn.closest('.color-picker');

      // Close all other color pickers
      document.querySelectorAll('.color-picker').forEach(picker => {
        if (picker !== colorPicker) {
          picker.classList.remove('active');
        }
      });

      // Toggle this color picker
      colorPicker.classList.toggle('active');
    });
  });

  // Handle color button clicks
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

      // Close the color picker after selecting a color
      btn.closest('.color-picker').classList.remove('active');
    });
  });

  // Close color pickers when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.color-picker')) {
      document.querySelectorAll('.color-picker').forEach(picker => {
        picker.classList.remove('active');
      });
    }
  });
}

// ===== IMPORT FUNCTIONS =====
let selectedImportFile = null;

function openImportModal() {
  // Close profile modal if it's open to prevent z-index layering issues
  document.getElementById('profile-modal').classList.remove('active');

  document.getElementById('import-modal').classList.add('active');
  selectedImportFile = null;
  document.getElementById('import-file-name').textContent = '';
  document.getElementById('import-button').disabled = true;
  document.getElementById('import-instructions').style.display = 'block';
  document.getElementById('import-progress').style.display = 'none';
  document.getElementById('import-results').style.display = 'none';
}

function closeImportModal(event) {
  if (event && event.target.id !== 'import-modal') return;
  document.getElementById('import-modal').classList.remove('active');
  selectedImportFile = null;
}

function handleImportFile() {
  const fileInput = document.getElementById('import-file-input');
  const file = fileInput.files[0];

  if (file) {
    if (!file.name.endsWith('.zip')) {
      alert('Vänligen välj en .zip fil');
      return;
    }

    selectedImportFile = file;
    document.getElementById('import-file-name').textContent = `Vald fil: ${file.name} (${formatFileSize(file.size)})`;
    document.getElementById('import-button').disabled = false;
  }
}

async function startImport() {
  if (!selectedImportFile) return;

  document.getElementById('import-instructions').style.display = 'none';
  document.getElementById('import-progress').style.display = 'block';
  document.getElementById('import-button').disabled = true;

  const formData = new FormData();
  formData.append('zipfile', selectedImportFile);

  try {
    updateImportProgress(0, 'Laddar upp fil...');

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 50;
        updateImportProgress(percent, 'Laddar upp fil...');
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const result = JSON.parse(xhr.responseText);
        updateImportProgress(100, 'Import klar!');
        showImportResults(result);
        loadNotes();
      } else {
        const error = JSON.parse(xhr.responseText);
        updateImportProgress(0, 'Fel vid import');
        alert(`Import misslyckades: ${error.message || error.error}`);
        document.getElementById('import-instructions').style.display = 'block';
        document.getElementById('import-progress').style.display = 'none';
        document.getElementById('import-button').disabled = false;
      }
    });

    xhr.addEventListener('error', () => {
      updateImportProgress(0, 'Nätverksfel');
      alert('Nätverksfel vid import. Försök igen.');
      document.getElementById('import-instructions').style.display = 'block';
      document.getElementById('import-progress').style.display = 'none';
      document.getElementById('import-button').disabled = false;
    });

    xhr.open('POST', '/api/import/keep');
    xhr.send(formData);

    setTimeout(() => updateImportProgress(60, 'Extraherar filer...'), 500);
    setTimeout(() => updateImportProgress(80, 'Importerar anteckningar...'), 1500);

  } catch (error) {
    console.error('Import error:', error);
    alert('Ett fel uppstod vid import.');
    document.getElementById('import-instructions').style.display = 'block';
    document.getElementById('import-progress').style.display = 'none';
    document.getElementById('import-button').disabled = false;
  }
}

function updateImportProgress(percent, status) {
  document.getElementById('import-progress-bar').style.width = percent + '%';
  document.getElementById('import-status').textContent = status;
}

function showImportResults(result) {
  document.getElementById('import-progress').style.display = 'none';
  document.getElementById('import-results').style.display = 'block';

  const stats = result.stats;
  const statsHtml = `
    <p><strong>✅ Importerade anteckningar:</strong> ${result.imported}</p>
    <p><strong>📝 Totalt från Google Keep:</strong> ${stats.totalNotes}</p>
    <p><strong>☑️ Checklistor:</strong> ${stats.checklistNotes}</p>
    <p><strong>📎 Bilagor:</strong> ${stats.attachments}</p>
    ${stats.missingAttachments > 0 ? `<p><strong>⚠️ Saknade bilagor:</strong> ${stats.missingAttachments}</p>` : ''}
    ${result.failed > 0 ? `<p style="color: #d93025;"><strong>❌ Misslyckades:</strong> ${result.failed}</p>` : ''}
  `;

  document.getElementById('import-stats').innerHTML = statsHtml;

  if (stats.errors && stats.errors.length > 0) {
    const errorsDiv = document.getElementById('import-errors');
    errorsDiv.style.display = 'block';
    errorsDiv.innerHTML = '<strong>Varningar/Fel:</strong><ul style="margin: 8px 0 0 20px;">' +
      stats.errors.slice(0, 10).map(e => `<li>${escapeHtml(e.file || e.note || 'Okänd')}: ${escapeHtml(e.error)}</li>`).join('') +
      (stats.errors.length > 10 ? `<li>... och ${stats.errors.length - 10} fler</li>` : '') +
      '</ul>';
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ===== EXPORT FUNCTIONS =====
async function exportBackup() {
  if (!confirm('Vill du exportera en backup av alla dina anteckningar?')) {
    return;
  }

  try {
    const response = await fetch('/api/backup/export', {
      method: 'GET',
      credentials: 'include',
      headers: getCSRFHeaders()
    });

    if (response.ok) {
      // Get filename from Content-Disposition header or use default
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'keep-clone-backup.zip';
      if (disposition && disposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Backup exporterad!');
    } else if (response.status === 403) {
      await fetchCSRFToken();
      alert('Session expired, please try again');
    } else {
      throw new Error('Export failed');
    }
  } catch (error) {
    console.error('Export error:', error);
    alert('Kunde inte exportera backup. Kontrollera att du är inloggad.');
  }
}

// ===== UTILITY =====
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Convert URLs in text to clickable links
function linkify(text) {
  if (typeof text !== 'string') return '';

  // First escape HTML to prevent XSS
  let escaped = escapeHtml(text);

  // Regex to match URLs
  // Matches: http://..., https://..., www....
  const urlRegex = /(?:(?:https?:\/\/)|(?:www\.))[^\s<>]+/gi;

  // Replace URLs with clickable links
  escaped = escaped.replace(urlRegex, (url) => {
    // Add protocol if missing (for www. links)
    let href = url;
    if (url.startsWith('www.')) {
      href = 'https://' + url;
    }

    // Security: target="_blank" opens in new tab
    // rel="noopener noreferrer" prevents tab-nabbing and tracking
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  return escaped;
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
    closeImportModal();
    closeProfileModal();
    closeShareModal();
    closeImageModal();
  }
});

// ===== IMAGE HANDLING =====

// Handle new note image selection
async function handleNewNoteImageSelect() {
  const input = document.getElementById('new-note-image-input');
  const files = Array.from(input.files);

  if (files.length === 0) return;

  // Max 10 images per note
  const remainingSlots = 10 - newNoteImages.length;
  if (files.length > remainingSlots) {
    alert(`Du kan bara lägga till ${remainingSlots} till bilder (max 10 per anteckning)`);
    return;
  }

  try {
    for (const file of files) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert(`Bilden "${file.name}" är för stor (max 10MB)`);
        continue;
      }

      // Upload image
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/notes/image', {
        method: 'POST',
        credentials: 'include',
        headers: getCSRFHeaders(),
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        newNoteImages.push(data.filename);
      } else if (response.status === 403) {
        await fetchCSRFToken();
        alert('Session expired, please try again');
        return;
      } else {
        throw new Error('Failed to upload image');
      }
    }

    // Show images container and render previews
    if (newNoteImages.length > 0) {
      document.getElementById('images-container').style.display = 'block';
      renderImagePreview('images-preview', newNoteImages, true);
    }

    // Reset input
    input.value = '';
  } catch (error) {
    console.error('Failed to upload images:', error);
    alert('Kunde inte ladda upp bilder');
  }
}

// Handle edit note image selection
async function handleEditNoteImageSelect() {
  const input = document.getElementById('edit-note-image-input');
  const files = Array.from(input.files);

  if (files.length === 0) return;

  const remainingSlots = 10 - editNoteImages.length;
  if (files.length > remainingSlots) {
    alert(`Du kan bara lägga till ${remainingSlots} till bilder (max 10 per anteckning)`);
    return;
  }

  try {
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Bilden "${file.name}" är för stor (max 10MB)`);
        continue;
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/notes/image', {
        method: 'POST',
        credentials: 'include',
        headers: getCSRFHeaders(),
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        editNoteImages.push(data.filename);
      } else if (response.status === 403) {
        await fetchCSRFToken();
        alert('Session expired, please try again');
        return;
      } else {
        throw new Error('Failed to upload image');
      }
    }

    // Show images container and render previews
    if (editNoteImages.length > 0) {
      document.getElementById('edit-images-container').style.display = 'block';
      const canEdit = !currentEditingNote.isShared || currentEditingNote.permission === 'edit';
      renderImagePreview('edit-images-preview', editNoteImages, canEdit);
    }

    input.value = '';
  } catch (error) {
    console.error('Failed to upload images:', error);
    alert('Kunde inte ladda upp bilder');
  }
}

// Render image preview
function renderImagePreview(containerId, images, canRemove) {
  const container = document.getElementById(containerId);
  container.innerHTML = images.map((img, index) => `
    <div class="image-preview-item">
      <img src="/api/notes/image/${img}" alt="Preview">
      ${canRemove ? `<button class="remove-image" onclick="removeImage('${containerId}', ${index})">✕</button>` : ''}
    </div>
  `).join('');
}

// Remove image from preview
function removeImage(containerId, index) {
  if (containerId === 'images-preview') {
    newNoteImages.splice(index, 1);
    if (newNoteImages.length === 0) {
      document.getElementById('images-container').style.display = 'none';
    }
    renderImagePreview('images-preview', newNoteImages, true);
  } else if (containerId === 'edit-images-preview') {
    editNoteImages.splice(index, 1);
    if (editNoteImages.length === 0) {
      document.getElementById('edit-images-container').style.display = 'none';
    }
    const canEdit = !currentEditingNote.isShared || currentEditingNote.permission === 'edit';
    renderImagePreview('edit-images-preview', editNoteImages, canEdit);
  }
}

// Open image modal for full view
function openImageModal(filename) {
  const modal = document.getElementById('image-modal');
  const img = document.getElementById('image-modal-img');
  img.src = `/api/notes/image/${filename}`;
  modal.classList.add('active');
}

// Close image modal
function closeImageModal() {
  const modal = document.getElementById('image-modal');
  modal.classList.remove('active');
}
