// ===== INTERNATIONALIZATION (i18n) =====
let currentLocale = localStorage.getItem('locale') || 'en'; // Default to English
let translations = {};

// Load translation file for current locale
async function loadTranslations(locale) {
  try {
    const response = await fetch(`/locales/${locale}.json`);
    if (response.ok) {
      translations = await response.json();
      currentLocale = locale;
      localStorage.setItem('locale', locale);
      return true;
    }
  } catch (error) {
    console.error(`Failed to load translations for ${locale}:`, error);
  }
  return false;
}

// Translate function - supports nested keys like "auth.login_title"
function t(key) {
  const keys = key.split('.');
  let value = translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation missing for key: ${key}`);
      return key; // Return key if translation not found
    }
  }

  return value;
}

// Update meta tags with translated content
function updateMetaTags() {
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]').setAttribute('content', t('meta.description'));
  document.querySelector('meta[name="keywords"]').setAttribute('content', t('meta.keywords'));
  document.querySelector('meta[property="og:title"]').setAttribute('content', t('meta.og_title'));
  document.querySelector('meta[property="og:description"]').setAttribute('content', t('meta.og_description'));
  document.querySelector('meta[name="twitter:title"]').setAttribute('content', t('meta.twitter_title'));
  document.querySelector('meta[name="twitter:description"]').setAttribute('content', t('meta.twitter_description'));
  document.documentElement.setAttribute('lang', currentLocale);
}

// Update all UI text elements with translations
function updateUITranslations() {
  // Auth screen
  document.querySelector('.auth-container h1').textContent = t('auth.app_name');
  document.querySelector('.auth-container .subtitle').textContent = t('auth.subtitle');

  // Login form
  document.querySelector('#login-form h2').textContent = t('auth.login_title');
  document.querySelector('#login-username').placeholder = t('auth.username_placeholder');
  document.querySelector('#login-password').placeholder = t('auth.password_placeholder');
  document.querySelector('#login-form button[onclick="login()"]').textContent = t('auth.login_button');
  document.querySelector('#login-form .auth-switch').innerHTML =
    `${t('auth.new_user')} <a href="#" onclick="showRegister(); return false;">${t('auth.register_link')}</a>`;
  document.querySelector('#forgot-password-link a').textContent = t('auth.forgot_password_link');

  // Register form
  document.querySelector('#register-form h2').textContent = t('auth.register_title');
  document.querySelector('#register-username').placeholder = t('auth.username_register_placeholder');
  document.querySelector('#register-email').placeholder = t('auth.email_placeholder');
  document.querySelector('#register-password').placeholder = t('auth.password_placeholder');
  document.querySelector('#register-password-confirm').placeholder = t('auth.confirm_password_placeholder');

  const passwordReqs = document.querySelectorAll('.password-requirements');
  passwordReqs.forEach(reqDiv => {
    const p = reqDiv.querySelector('p:first-child');
    if (p) p.textContent = t('auth.password_requirements');
    const lis = reqDiv.querySelectorAll('li');
    if (lis.length >= 4) {
      lis[0].textContent = t('auth.password_req_length');
      lis[1].textContent = t('auth.password_req_uppercase');
      lis[2].textContent = t('auth.password_req_lowercase');
      lis[3].textContent = t('auth.password_req_number');
    }
    const tip = reqDiv.querySelector('.tip');
    if (tip) tip.innerHTML = t('auth.password_tip');
  });

  document.querySelector('#register-form button[onclick="register()"]').textContent = t('auth.register_button');
  document.querySelector('#register-form .auth-switch').innerHTML =
    `${t('auth.already_have_account')} <a href="#" onclick="showLogin(); return false;">${t('auth.login_link')}</a>`;

  // Forgot password form
  document.querySelector('#forgot-password-form h2').textContent = t('auth.forgot_password_title');
  document.querySelector('#forgot-password-form .help-text').textContent = t('auth.forgot_password_help');
  document.querySelector('#forgot-password-input').placeholder = t('auth.username_or_email_placeholder');
  document.querySelector('#forgot-password-form button[onclick="requestPasswordReset()"]').textContent = t('auth.send_reset_link_button');
  document.querySelector('#forgot-password-form .auth-switch a').textContent = t('auth.back_to_login');

  // Reset password form
  document.querySelector('#reset-password-form h2').textContent = t('auth.reset_password_title');
  document.querySelector('#reset-password-form .help-text').textContent = t('auth.reset_password_help');
  document.querySelector('#reset-password-new').placeholder = t('auth.new_password_placeholder');
  document.querySelector('#reset-password-confirm').placeholder = t('auth.confirm_new_password_placeholder');
  document.querySelector('#reset-password-form button[onclick="resetPassword()"]').textContent = t('auth.reset_password_button');
  document.querySelector('#reset-password-form .auth-switch a').textContent = t('auth.back_to_login');

  // Header
  document.querySelector('header h1').textContent = t('auth.app_name');
  document.querySelector('#search-input').placeholder = t('header.search_placeholder');
  document.querySelector('#shared-toggle-text').textContent = showingShared ? t('header.hide_shared') : t('header.show_shared');
  document.querySelector('#archive-toggle-text').textContent = showingArchived ? t('header.hide_archive') : t('header.show_archive');
  document.querySelector('header button[onclick="logout()"]').textContent = t('header.logout_button');

  // New note form
  document.querySelector('#new-note-title').placeholder = t('notes.title_placeholder');
  document.querySelector('#new-note-content').placeholder = t('notes.content_placeholder');
  document.querySelector('#checklist-container button').textContent = t('notes.add_checklist_item');
  document.querySelector('#new-note-form button.btn-icon[title]').title = t('notes.add_image_title');
  document.querySelector('#new-note-form button[onclick="toggleChecklist()"]').title = t('notes.checklist_title');
  document.querySelector('#new-note-form .color-picker button').title = t('notes.color_title');
  document.querySelector('#new-note-form button.btn-primary').textContent = t('notes.save_button');

  // Section labels
  document.querySelector('#pinned-section .section-label').textContent = t('notes.pinned_label');
  document.querySelector('#other-label').textContent = t('notes.other_label');

  // Edit modal
  document.querySelector('#edit-note-title').placeholder = t('notes.title_placeholder');
  document.querySelector('#edit-note-content').placeholder = t('notes.content_placeholder');
  document.querySelector('#edit-checklist-container button').textContent = t('notes.add_checklist_item');
  document.querySelector('#edit-modal button.btn-icon[title]').title = t('notes.add_image_title');
  document.querySelector('#edit-modal button[onclick="toggleEditChecklist()"]').title = t('notes.checklist_title');
  document.querySelector('#edit-modal .color-picker button').title = t('notes.color_title');
  document.querySelector('#share-note-btn').title = t('notes.share_title');
  document.querySelector('#pin-note-btn').title = t('notes.pin_title');
  document.querySelector('#archive-note-btn').title = t('notes.archive_title');
  document.querySelector('#delete-note-btn').title = t('notes.delete_title');
  document.querySelector('#update-note-btn').textContent = t('notes.update_button');

  // Import modal
  document.querySelector('#import-modal h2').textContent = t('import.title');
  document.querySelector('#import-instructions h3').textContent = t('import.instructions_title');
  const importSteps = document.querySelectorAll('#import-instructions ol li');
  if (importSteps.length >= 5) {
    importSteps[0].innerHTML = `${t('import.step1')} <a href="https://takeout.google.com/" target="_blank" rel="noopener">Google Takeout</a>`;
    importSteps[1].textContent = t('import.step2');
    importSteps[2].textContent = t('import.step3');
    importSteps[3].textContent = t('import.step4');
    importSteps[4].textContent = t('import.step5');
  }
  document.querySelector('#import-modal button.btn-primary:not(#import-button)').textContent = t('import.select_file_button');
  document.querySelector('#import-modal button.btn-secondary').textContent = t('import.close_button');
  document.querySelector('#import-button').textContent = t('import.import_button');

  // Profile modal
  document.querySelector('#profile-modal h2').textContent = t('profile.title');
  document.querySelectorAll('#profile-modal .settings-label')[0].textContent = t('profile.select_avatar_color');
  document.querySelectorAll('#profile-modal .settings-label')[1].textContent = t('profile.select_background');

  // Background theme labels
  const themeLabels = document.querySelectorAll('.theme-label');
  const themeKeys = ['default', 'beige', 'blue', 'green', 'lavender', 'dark'];
  themeLabels.forEach((label, index) => {
    if (index < themeKeys.length) {
      label.textContent = t(`profile.theme_${themeKeys[index]}`);
    }
  });

  document.querySelector('#show-created-date-toggle + span').textContent = t('profile.show_created_date');

  // Change password section
  const changePasswordSection = document.querySelector('#change-password-form').parentElement;
  const changePasswordHeading = changePasswordSection.querySelector('h3.settings-heading');
  if (changePasswordHeading) {
    changePasswordHeading.textContent = t('profile.change_password_title');
  }
  document.querySelector('#current-password').placeholder = t('profile.current_password_placeholder');
  document.querySelector('#new-password').placeholder = t('profile.new_password_placeholder');
  document.querySelector('#confirm-new-password').placeholder = t('profile.confirm_new_password_placeholder');
  document.querySelector('button[onclick="changePassword()"]').textContent = t('profile.change_password_button');

  // Data and backup section
  const settingsHeadings = document.querySelectorAll('#profile-modal .settings-heading');
  // Find the "Data och backup" heading (it should be the last one or the one after language selector)
  if (settingsHeadings.length >= 2) {
    settingsHeadings[settingsHeadings.length - 1].textContent = t('profile.data_backup_title');
  }
  document.querySelector('button[onclick="openImportModal()"]').textContent = t('profile.import_from_keep');
  document.querySelector('button[onclick="exportBackup()"]').textContent = t('profile.export_backup');
  document.querySelector('#profile-modal button.btn-secondary').textContent = t('profile.close_button');

  // Share modal
  document.querySelector('#share-modal h2').textContent = t('share.title');
  const shareHeadings = document.querySelectorAll('#share-modal .settings-heading');
  if (shareHeadings.length >= 2) {
    shareHeadings[0].textContent = t('share.share_with_member');
    shareHeadings[1].textContent = t('share.currently_shared_with');
  }
  document.querySelector('#share-modal button.btn-secondary').textContent = t('share.close_button');

  // Footer
  document.querySelector('.app-footer p').innerHTML = `${t('footer.version')} | <a href="https://github.com/cgillinger/keep" target="_blank" rel="noopener">GitHub</a> | ${t('footer.license')}`;

  // Attribution
  const attributionText = document.getElementById('icon-attribution-text');
  if (attributionText) {
    attributionText.textContent = t('attribution.icon_credit');
  }

  // Update meta tags
  updateMetaTags();
}

// Change language and update UI
async function changeLanguage(locale) {
  const success = await loadTranslations(locale);
  if (success) {
    updateUITranslations();
    renderNotes(); // Re-render notes with new language
  }
}

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

// ===== COLOR THEME MAPPING =====
// Maps light note colors to dark mode equivalents (following WCAG accessibility guidelines)
function getThemeAwareColor(lightColor) {
  // Check if dark mode is active
  const isDarkMode = document.body.classList.contains('theme-dark');

  if (!isDarkMode) {
    return lightColor; // Return original color in light mode
  }

  // Dark mode color mapping (matches base.css dark theme variables)
  const darkModeColors = {
    '#ffffff': '#303134',   // white → dark gray
    '#f28b82': '#8c2f24',   // red → dark red
    '#fbbc04': '#996600',   // orange → dark orange
    '#fff475': '#7f6f0a',   // yellow → dark yellow
    '#ccff90': '#345920',   // green → dark green
    '#a7ffeb': '#0e5454',   // teal → dark teal
    '#cbf0f8': '#1e4a52',   // cyan → dark cyan
    '#aecbfa': '#1e3a5f',   // blue → dark blue
    '#d7aefb': '#42275e',   // purple → dark purple
    '#fdcfe8': '#5b2245',   // pink → dark pink
    '#e6c9a8': '#442f19',   // brown → dark brown
    '#e8eaed': '#3c3f43'    // gray → dark gray
  };

  return darkModeColors[lightColor] || lightColor;
}

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', async () => {
  // Load translations first
  await loadTranslations(currentLocale);
  updateUITranslations();

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
      applyBackgroundTheme(user.backgroundTheme || 'default');
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
      // Set current user immediately so session is available
      currentUser = data;

      // Show success message
      showAuthSuccess(t('messages.login_success'));

      // Clear password field for security
      document.getElementById('login-password').value = '';

      // Brief delay before transitioning to app to show success message
      setTimeout(() => {
        showApp();
        loadNotes();
        connectWebSocket();
        updateProfilePicture();
        applyBackgroundTheme(data.backgroundTheme || 'default');
      }, 800);
    } else {
      showAuthError(data.error || t('messages.login_failed'));
      // Refresh CSRF token on auth failure
      await fetchCSRFToken();
    }
  } catch (error) {
    showAuthError(t('messages.network_error'));
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
      // Set current user immediately so session is available
      currentUser = data;

      // Show success message
      showAuthSuccess(t('messages.register_success') + ' ' + t('messages.login_success'));

      // Clear form fields
      document.getElementById('register-username').value = '';
      document.getElementById('register-email').value = '';
      document.getElementById('register-password').value = '';
      document.getElementById('register-password-confirm').value = '';

      // Brief delay before transitioning to app to show success message
      setTimeout(() => {
        showApp();
        loadNotes();
        connectWebSocket();
        updateProfilePicture();
        applyBackgroundTheme(data.backgroundTheme || 'default');
      }, 1500);
    } else {
      showAuthError(data.error || t('messages.register_failed'));
      // Refresh CSRF token on auth failure
      await fetchCSRFToken();
    }
  } catch (error) {
    showAuthError(t('messages.network_error'));
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

  // Update language selector
  const languageSelector = document.getElementById('language-selector');
  if (languageSelector) {
    languageSelector.value = currentLocale;
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

    // Highlight selected background theme
    const backgroundTheme = currentUser.backgroundTheme || 'default';
    updateSelectedTheme(backgroundTheme);
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

// ===== BACKGROUND THEME FUNCTIONS =====

async function selectBackgroundTheme(theme) {
  try {
    const response = await fetch('/api/profile/background-theme', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({ theme })
    });

    if (response.ok) {
      currentUser.backgroundTheme = theme;
      applyBackgroundTheme(theme);
      updateSelectedTheme(theme);
    } else {
      alert('Kunde inte uppdatera bakgrundstema');
    }
  } catch (error) {
    alert('Nätverksfel');
  }
}

function applyBackgroundTheme(theme) {
  const body = document.body;

  // Remove all theme classes
  body.classList.remove('theme-dark');

  // Apply theme-specific styles
  const themeColors = {
    'default': '#ffffff',
    'warm-beige': '#f5f1e8',
    'soft-blue': '#e8f4f8',
    'mint-green': '#e8f5e9',
    'light-lavender': '#f3e5f5',
    'dark': '#1e1e1e'
  };

  if (theme === 'dark') {
    // Add dark theme class (this sets all CSS variables)
    body.classList.add('theme-dark');
    // Remove inline style to let CSS class take precedence
    body.style.removeProperty('--bg-main');
  } else {
    // Set background color for light themes
    const color = themeColors[theme] || themeColors['default'];
    body.style.setProperty('--bg-main', color);
  }

  // Re-render notes to update colors when theme changes
  if (notes && notes.length > 0) {
    renderNotes();
  }

  // Update new note form color
  const newNoteForm = document.getElementById('new-note-form');
  if (newNoteForm && selectedColor) {
    newNoteForm.style.backgroundColor = getThemeAwareColor(selectedColor);
  }

  // Update modal content color if open
  if (currentEditingNote) {
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.backgroundColor = getThemeAwareColor(currentEditingNote.color);
    }
  }
}

function updateSelectedTheme(theme) {
  // Remove selected class from all theme options
  document.querySelectorAll('.bg-color-option').forEach(btn => {
    btn.classList.remove('selected');
  });

  // Add selected class to the chosen theme
  const selectedBtn = document.querySelector(`.bg-color-option[data-theme="${theme}"]`);
  if (selectedBtn) {
    selectedBtn.classList.add('selected');
  }
}

// Change password
async function changePassword() {
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmNewPassword = document.getElementById('confirm-new-password').value;
  const messageDiv = document.getElementById('change-password-message');

  // Clear previous messages
  messageDiv.className = 'message hidden';
  messageDiv.textContent = '';

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    messageDiv.textContent = t('profile.password_all_fields_required');
    messageDiv.className = 'message error-message';
    return;
  }

  if (newPassword !== confirmNewPassword) {
    messageDiv.textContent = t('profile.password_mismatch');
    messageDiv.className = 'message error-message';
    return;
  }

  // Client-side validation matching server requirements
  if (newPassword.length < 12) {
    messageDiv.textContent = t('auth.password_min_12');
    messageDiv.className = 'message error-message';
    return;
  }
  if (!/[A-Z]/.test(newPassword)) {
    messageDiv.textContent = t('auth.password_uppercase');
    messageDiv.className = 'message error-message';
    return;
  }
  if (!/[a-z]/.test(newPassword)) {
    messageDiv.textContent = t('auth.password_lowercase');
    messageDiv.className = 'message error-message';
    return;
  }
  if (!/[0-9]/.test(newPassword)) {
    messageDiv.textContent = t('auth.password_number');
    messageDiv.className = 'message error-message';
    return;
  }

  try {
    const response = await fetch('/api/profile/change-password', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getCSRFHeaders()
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.textContent = t('profile.password_changed_success');
      messageDiv.className = 'message success-message';
      // Clear form
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value = '';
      document.getElementById('confirm-new-password').value = '';
    } else {
      messageDiv.textContent = data.error || t('profile.password_change_failed');
      messageDiv.className = 'message error-message';
    }
  } catch (error) {
    messageDiv.textContent = t('errors.network_error');
    messageDiv.className = 'message error-message';
  }
}

// Toggle password visibility
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const container = input.parentElement;
  const button = container.querySelector('.password-toggle-btn');

  if (input.type === 'password') {
    input.type = 'text';
    button.classList.add('active');
  } else {
    input.type = 'password';
    button.classList.remove('active');
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

  const themeColor = getThemeAwareColor(note.color);

  return `
    <div class="note-card" data-note-id="${note.id}" style="background-color: ${escapeHtml(themeColor)}" onclick="openEditModal(${note.id})">
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
      document.getElementById('new-note-form').style.backgroundColor = getThemeAwareColor('#ffffff');
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
  document.getElementById('modal-content').style.backgroundColor = getThemeAwareColor(note.color);

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
          document.querySelector('.modal-content').style.backgroundColor = getThemeAwareColor(color);
        }
      } else {
        selectedColor = color;
        document.getElementById('new-note-form').style.backgroundColor = getThemeAwareColor(color);
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
