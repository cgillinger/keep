// ===== SECRET KREEP MODE =====
// Check URL parameter and localStorage for secret kreep mode
function initKreepMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const kreepParam = urlParams.get('kreep');

  if (kreepParam === '1') {
    localStorage.setItem('kreep', '1');
  } else if (kreepParam === '0') {
    localStorage.removeItem('kreep');
  }

  return localStorage.getItem('kreep') === '1';
}

function isKreepMode() {
  return localStorage.getItem('kreep') === '1';
}

function getAppName() {
  return isKreepMode() ? 'Kreep' : 'Keep Clone';
}

// Initialize kreep mode on load
const kreepModeEnabled = initKreepMode();

// ===== INTERNATIONALIZATION (i18n) =====
// Cache-busting token — keep in sync with package.json "version". Appended to
// asset URLs so a new release forces browsers to refetch (dislodges anything a
// browser cached under an older, long-lived Cache-Control).
const APP_VERSION = '1.4.0';
let currentLocale = localStorage.getItem('locale') || 'en'; // Default to English
let translations = {};

// Replace app name in translations based on kreep mode
function applyAppNameToTranslations(obj) {
  if (!isKreepMode()) return obj;

  const appName = getAppName();
  const replaceInString = (str) => str.replace(/Keep Clone/g, appName);

  const processValue = (value) => {
    if (typeof value === 'string') {
      return replaceInString(value);
    } else if (Array.isArray(value)) {
      return value.map(processValue);
    } else if (typeof value === 'object' && value !== null) {
      const result = {};
      for (const key in value) {
        result[key] = processValue(value[key]);
      }
      return result;
    }
    return value;
  };

  return processValue(obj);
}

// Load translation file for current locale
async function loadTranslations(locale) {
  try {
    const response = await fetch(`/locales/${locale}.json?v=${APP_VERSION}`);
    if (response.ok) {
      let loadedTranslations = await response.json();
      translations = applyAppNameToTranslations(loadedTranslations);
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
    if (lis.length >= 1) {
      lis[0].textContent = t('auth.password_req_length');
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
  document.querySelector('#dismiss-share-btn').title = t('share.dismiss_title');
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
  // Import/Export buttons already have emojis in HTML, just update text
  const importBtn = document.querySelector('button[onclick="openImportModal()"]');
  if (importBtn) {
    importBtn.innerHTML = `📥 ${t('profile.import_from_keep')}`;
  }
  const exportBtn = document.querySelector('button[onclick="exportBackup()"]');
  if (exportBtn) {
    exportBtn.innerHTML = `📤 ${t('profile.export_backup')}`;
  }
  // Profile modal now only has X button in top-right corner (no footer close button)

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
let originalEditState = null; // Store original values to detect changes
let snapshotLocked = false; // Prevent false-positive dirty detection during initialization
let selectedColor = '#ffffff';
let isChecklistMode = false;
let showingArchived = false;
let showingShared = false;
let ws = null;
let csrfToken = null;
let newNoteImages = []; // Filenames of images uploaded for new note
let editNoteImages = []; // Filenames of images for editing note
let maxImagesPerNote = 30; // Fallback om servern ej returnerar värdet
let showCreatedDate = localStorage.getItem('showCreatedDate') === 'true'; // User preference for showing created date
let renderedNotesMap = new Map(); // Cache of rendered notes by ID for incremental updates

// ===== NOTES CACHE & PAGINATION =====
const PAGE_SIZE = 20; // Notes per page (matches server DEFAULT_PAGE_SIZE)
const notesCache = {
  all: { notes: [], hasMore: true, total: 0 },
  archived: { notes: [], hasMore: true, total: 0 },
  shared: { notes: [], hasMore: true, total: 0 },
  timestamp: {}
};
const CACHE_TTL = 90000; // Cache valid for 90 seconds (WebSocket invalidates on changes)
let isLoadingNotes = false; // Prevent multiple simultaneous loads
// In-flight guards so a slow NAS round-trip can't be double-submitted into
// duplicate writes when an impatient user clicks again.
let isSavingNote = false;
let isUpdatingNote = false;
let isDeletingNote = false;
let isPinningNote = false;
let isArchivingNote = false;
let currentOffset = 0; // Current pagination offset
let hasMoreNotes = true; // Whether there are more notes to load
let scrollObserver = null; // Intersection Observer for infinite scroll

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
  // UI text first so whichever screen we land on is already translated.
  await loadTranslations(currentLocale);
  updateUITranslations();

  checkForResetToken();

  // Decide the screen as early as possible: checkAuth (GET /api/me) only needs
  // the session cookie, so run it together with the CSRF fetch instead of
  // serially behind it. Whichever screen wins, the splash is swapped exactly
  // once when these resolve — no more login flash before the app appears.
  await Promise.all([fetchCSRFToken(), checkAuth()]);

  setupColorPickers();

  // Non-critical: only toggles the login screen's "forgot password" link.
  // Fire-and-forget after the UI is shown so it never blocks first paint.
  checkEmailConfig();
});

// ===== CSRF TOKEN =====
function getCSRFHeaders() {
  return csrfToken ? { 'CSRF-Token': csrfToken } : {};
}

async function fetchCSRFToken() {
  try {
    const response = await apiFetch('/api/csrf-token', {
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

// ===== API FETCH WRAPPER =====
// Global fetch wrapper that always includes credentials for session cookies
async function apiFetch(url, options = {}) {
  const defaultOptions = {
    credentials: 'include', // Always include cookies/session
    headers: {
      'Content-Type': 'application/json',
      ...getCSRFHeaders(), // Include CSRF token if available
      ...(options.headers || {})
    },
    ...options
  };

  // If body is provided and is an object, stringify it
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    defaultOptions.body = JSON.stringify(options.body);
  }

  return fetch(url, defaultOptions);
}

// ===== AUTH FUNCTIONS =====
async function checkAuth() {
  try {
    const response = await apiFetch('/api/me');
    if (response.ok) {
      const user = await response.json();
      currentUser = user;
      maxImagesPerNote = user.maxImages || 30;
      showApp();
      loadNotes();
      connectWebSocket();
      updateProfilePicture();
      applyBackgroundTheme(user.backgroundTheme || 'default');
      // Pre-fetch archived notes in background for faster switching
      setTimeout(prefetchArchivedNotes, 2000);
    } else {
      currentUser = null; // Clear user on auth failure
      showAuthScreen();
    }
  } catch (error) {
    currentUser = null; // Clear user on error
    showAuthScreen();
  }
}

// Remove the startup splash once the real screen (app or login) is ready.
function hideLoadingSplash() {
  const splash = document.getElementById('loading-splash');
  if (splash) splash.style.display = 'none';
}

function showAuthScreen() {
  hideLoadingSplash();
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  hideLoadingSplash();
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
  console.log('[LOGIN] Function called');

  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const rememberEl = document.getElementById('login-remember');
  const rememberMe = rememberEl ? rememberEl.checked : false;

  console.log('[LOGIN] Username:', username, 'Password length:', password.length);

  if (!username || !password) {
    showAuthError('Fyll i användarnamn och lösenord');
    return;
  }

  try {
    console.log('[LOGIN] Sending login request...');
    const response = await apiFetch('/api/login', {
      method: 'POST',
      body: { username, password, rememberMe }
    });

    console.log('[LOGIN] Response status:', response.status);
    const data = await response.json();
    console.log('[LOGIN] Response data:', data);

    if (response.ok) {
      console.log('[LOGIN] Login successful, setting currentUser');
      // Set current user immediately so session is available
      currentUser = data;
      maxImagesPerNote = data.maxImages || 30;

      // Clear password field for security
      document.getElementById('login-password').value = '';

      console.log('[LOGIN] Transitioning to app...');
      // Show app immediately
      showApp();
      loadNotes();
      connectWebSocket();
      updateProfilePicture();
      applyBackgroundTheme(data.backgroundTheme || 'default');

      // Show success message after transition
      showAuthSuccess(t('messages.login_success'));
    } else {
      console.log('[LOGIN] Login failed:', data.error);
      showAuthError(data.error || t('messages.login_failed'));
      // Refresh CSRF token on auth failure
      await fetchCSRFToken();
    }
  } catch (error) {
    console.error('[LOGIN] Error:', error);
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
  if (password.length < 5) {
    showAuthError('Lösenordet måste vara minst 5 tecken');
    return;
  }

  try {
    const response = await apiFetch('/api/register', {
      method: 'POST',
      body: { username, password, email: email || null }
    });

    const data = await response.json();

    if (response.ok) {
      // Set current user immediately so session is available
      currentUser = data;
      maxImagesPerNote = data.maxImages || 30;

      // Clear form fields
      document.getElementById('register-username').value = '';
      document.getElementById('register-email').value = '';
      document.getElementById('register-password').value = '';
      document.getElementById('register-password-confirm').value = '';

      // Show app immediately
      showApp();
      loadNotes();
      connectWebSocket();
      updateProfilePicture();
      applyBackgroundTheme(data.backgroundTheme || 'default');

      // Show success message after transition
      showAuthSuccess(t('messages.register_success'));
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
  await apiFetch('/api/logout', {
    method: 'POST'
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
    const response = await apiFetch('/api/password-reset/check-config');
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

  // Immediate feedback + guard against double-submits (avoids sending
  // several reset mails when the request takes a moment).
  const btn = document.querySelector('#forgot-password-form button[onclick="requestPasswordReset()"]');
  const originalLabel = btn ? btn.textContent : null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = t('auth.sending_reset_link');
  }
  showAuthSuccess(t('auth.sending_reset_link'));

  try {
    const response = await apiFetch('/api/password-reset/request', {
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
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
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
  if (newPassword.length < 5) {
    showAuthError('Lösenordet måste vara minst 5 tecken');
    return;
  }

  const rpBtn = document.querySelector('#reset-password-form button[onclick="resetPassword()"]');
  setBtnBusy(rpBtn, 'Återställer…');

  try {
    const response = await apiFetch('/api/password-reset/verify', {
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
  } finally {
    clearBtnBusy(rpBtn);
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
        // A note was shared with us - show notification and reload if viewing shared
        showToast('Ny anteckning delad med dig', 'info');
        if (showingShared) {
          loadNotes();
        }
      } else if (data.type === 'share_count_updated') {
        // Our note's share count changed - reload to update the indicator
        if (!showingShared && !showingArchived) {
          loadNotes();
        }
      } else if (data.type === 'permission_changed') {
        // Our permission on a shared note changed
        const noteIndex = notes.findIndex(n => n.id === data.noteId);
        if (noteIndex >= 0) {
          notes[noteIndex].permission = data.permission;
          // If we're currently editing this note, update the UI
          if (currentEditingNote && currentEditingNote.id === data.noteId) {
            currentEditingNote.permission = data.permission;
            // Re-render edit modal to reflect new permissions
            openEditModal(data.noteId);
          }
          showToast(`Din behörighet ändrades till: ${data.permission === 'edit' ? 'Redigera' : 'Visa'}`, 'info');
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
  loadNotes({ forceRefresh: true }); // Re-fetch notes with correct sort order
}

function closeProfileModal(event) {
  if (event && event.target.id !== 'profile-modal') return;
  document.getElementById('profile-modal').classList.remove('active');
}

// ===== AVATAR COLOR =====
async function selectAvatarColor(color) {
  try {
    const response = await apiFetch('/api/profile/avatar-color', {
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
      showToast('Kunde inte uppdatera avatarfärg', 'error');
    }
  } catch (error) {
    showToast('Nätverksfel', 'error');
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
    const response = await apiFetch('/api/profile/background-theme', {
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
      showToast('Kunde inte uppdatera bakgrundstema', 'error');
    }
  } catch (error) {
    showToast('Nätverksfel', 'error');
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
  if (newPassword.length < 5) {
    messageDiv.textContent = t('auth.password_min_12');
    messageDiv.className = 'message error-message';
    return;
  }

  const cpBtn = document.querySelector('button[onclick="changePassword()"]');
  setBtnBusy(cpBtn);

  try {
    const response = await apiFetch('/api/profile/change-password', {
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
  } finally {
    clearBtnBusy(cpBtn);
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

  // Show owner and green share indicator if this is a note shared WITH me
  if (note.isShared && note.owner_username) {
    const initials = note.owner_username.substring(0, 2).toUpperCase();
    const avatarColor = note.owner_avatar_color || '#1a73e8';
    const ownerAvatar = `<div class="profile-initials-small" style="background-color: ${avatarColor};">${initials}</div>`;

    ownerIndicator = `
      <div class="note-owner">
        ${ownerAvatar}
        <span>${escapeHtml(note.owner_username)}</span>
      </div>
    `;
    // Green share indicator for notes shared with me
    shareIndicator = `<span class="share-indicator share-indicator--received" title="${t('notes.shared_by')} ${escapeHtml(note.owner_username)}">👥</span>`;
  }

  // Show blue share count if owned by user and shared with others
  if (!note.isShared && note.share_count > 0) {
    shareIndicator = `<span class="share-indicator share-indicator--sent" title="${t('notes.shared_with')} ${note.share_count} ${note.share_count === 1 ? t('notes.person') : t('notes.persons')}">👥 ${note.share_count}</span>`;
  }

  if (note.is_checklist && note.checklist_items) {
    const items = Array.isArray(note.checklist_items)
      ? note.checklist_items
      : JSON.parse(note.checklist_items || '[]');

    contentHtml = `
      <ul class="checklist">
        ${items.map(item => {
          if (isHeaderItem(item)) {
            return `<li class="checklist-header"><span>${linkify(item.text)}</span></li>`;
          }
          return `
          <li class="${item.checked ? 'checked' : ''}">
            <input type="checkbox" ${item.checked ? 'checked' : ''} disabled>
            <span>${linkify(item.text)}</span>
            ${confidenceBadgeHTML(item.confidence)}
          </li>
        `;
        }).join('')}
      </ul>
    `;
  } else {
    contentHtml = `<p>${linkify(note.content)}</p>`;
  }

  // Render images with lazy loading
  let imagesHtml = '';
  if (note.images && Array.isArray(note.images) && note.images.length > 0) {
    const imagesJson = JSON.stringify(note.images).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    imagesHtml = `
      <div class="note-images" onclick="event.stopPropagation()">
        ${note.images.map(img => `
          <img src="/api/notes/image/${img}" alt="Note image" loading="lazy" onclick="openImageModal('${img}', JSON.parse(this.parentElement.dataset.images))" >
        `).join('')}
      </div>
    `.replace('<div class="note-images"', `<div class="note-images" data-images="${imagesJson}"`);
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

async function loadNotes(options = {}) {
  const { forceRefresh = false, showLoading = true, append = false } = options;

  // Determine which cache key to use
  const cacheKey = showingArchived ? 'archived' : showingShared ? 'shared' : 'all';

  // Reset pagination when not appending
  if (!append) {
    currentOffset = 0;
  }

  // Build URL with pagination
  let url = showingArchived
    ? '/api/notes?archived=true'
    : showingShared
      ? '/api/notes?shared=true'
      : '/api/notes';

  // Add pagination params (use ? or & depending on existing params)
  const separator = url.includes('?') ? '&' : '?';
  url += `${separator}limit=${PAGE_SIZE}&offset=${currentOffset}`;
  if (showCreatedDate) {
    url += '&sortBy=created_at';
  }

  // Check cache first (if not forcing refresh and not appending)
  const cachedData = notesCache[cacheKey];
  const cacheTime = notesCache.timestamp[cacheKey] || 0;
  const cacheValid = cachedData.notes.length > 0 && (Date.now() - cacheTime < CACHE_TTL) && !forceRefresh && !append;

  if (cacheValid) {
    // Use cached data immediately
    notes = cachedData.notes;
    hasMoreNotes = cachedData.hasMore;
    renderNotes();
    setupScrollObserver();
    return;
  }

  // Prevent multiple simultaneous loads
  if (isLoadingNotes) return;
  isLoadingNotes = true;

  // Show loading indicator
  if (showLoading && !append) {
    showNotesLoading();
  } else if (append) {
    showLoadingMore();
  }

  try {
    const response = await apiFetch(url);
    if (response.ok) {
      const data = await response.json();

      if (append) {
        // Append new notes to existing
        notes = [...notes, ...data.notes];
      } else {
        // Replace notes
        notes = data.notes;
      }

      hasMoreNotes = data.hasMore;
      currentOffset += data.notes.length;

      // Update cache
      notesCache[cacheKey] = { notes, hasMore: hasMoreNotes, total: data.total };
      notesCache.timestamp[cacheKey] = Date.now();

      renderNotes({ append });
      setupScrollObserver();
    } else if (!append) {
      // Clear the skeletons so users aren't stuck staring at a shimmer forever.
      showToast('Kunde inte ladda anteckningar', 'error');
      renderNotes();
    }
  } catch (error) {
    console.error('Failed to load notes:', error);
    if (!append) {
      showToast('Kunde inte ladda anteckningar', 'error');
      renderNotes();
    }
  } finally {
    isLoadingNotes = false;
    hideLoadingMore();
  }
}

// Load more notes (called by infinite scroll)
async function loadMoreNotes() {
  if (!hasMoreNotes || isLoadingNotes) return;
  await loadNotes({ append: true, showLoading: false });
}

// Show loading state in notes grid (initial load)
function showNotesLoading() {
  const regularContainer = document.getElementById('notes-grid');
  const pinnedSection = document.getElementById('pinned-section');

  // Hide pinned section during load
  pinnedSection.style.display = 'none';

  // Show skeleton loading cards
  regularContainer.innerHTML = `
    <div class="note-card skeleton-card"></div>
    <div class="note-card skeleton-card"></div>
    <div class="note-card skeleton-card"></div>
    <div class="note-card skeleton-card"></div>
  `;
}

// Show loading indicator for "load more"
function showLoadingMore() {
  const sentinel = document.getElementById('scroll-sentinel');
  if (sentinel) {
    sentinel.innerHTML = `
      <div class="loading-more">
        <div class="note-card skeleton-card"></div>
        <div class="note-card skeleton-card"></div>
      </div>
    `;
  }
}

// Hide loading indicator for "load more"
function hideLoadingMore() {
  const sentinel = document.getElementById('scroll-sentinel');
  if (sentinel) {
    sentinel.innerHTML = '';
  }
}

// Setup Intersection Observer for infinite scroll
function setupScrollObserver() {
  // Cleanup existing observer
  if (scrollObserver) {
    scrollObserver.disconnect();
  }

  const sentinel = document.getElementById('scroll-sentinel');
  if (!sentinel || !hasMoreNotes) return;

  scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && hasMoreNotes && !isLoadingNotes) {
        loadMoreNotes();
      }
    });
  }, {
    rootMargin: '200px' // Start loading 200px before reaching the sentinel
  });

  scrollObserver.observe(sentinel);
}

// Invalidate cache for a specific key or all
function invalidateNotesCache(cacheKey = null) {
  if (cacheKey) {
    notesCache[cacheKey] = { notes: [], hasMore: true, total: 0 };
    notesCache.timestamp[cacheKey] = 0;
  } else {
    // Invalidate all caches
    notesCache.all = { notes: [], hasMore: true, total: 0 };
    notesCache.archived = { notes: [], hasMore: true, total: 0 };
    notesCache.shared = { notes: [], hasMore: true, total: 0 };
    notesCache.timestamp = {};
  }
}

// Pre-fetch archived notes in background (for faster switching)
function prefetchArchivedNotes() {
  if (notesCache.archived.notes.length > 0) return; // Already cached

  // Fetch silently in background (just first page)
  apiFetch(`/api/notes?archived=true&limit=${PAGE_SIZE}&offset=0`)
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      if (data) {
        notesCache.archived = { notes: data.notes, hasMore: data.hasMore, total: data.total };
        notesCache.timestamp.archived = Date.now();
      }
    })
    .catch(() => {}); // Silently ignore errors
}

function renderNotes(options = {}) {
  const { append = false } = options;
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

  // Sort each group by date descending (newest first)
  const sortField = showCreatedDate ? 'created_at' : 'updated_at';
  pinnedNotes.sort((a, b) => new Date(b[sortField]) - new Date(a[sortField]));
  regularNotes.sort((a, b) => new Date(b[sortField]) - new Date(a[sortField]));

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

  if (append) {
    // Append mode: Only add new notes that aren't already rendered
    const existingIds = new Set(
      [...regularContainer.querySelectorAll('.note-card'), ...pinnedContainer.querySelectorAll('.note-card')]
        .map(card => parseInt(card.dataset.noteId))
    );

    const newPinnedNotes = pinnedNotes.filter(note => !existingIds.has(note.id));
    const newRegularNotes = regularNotes.filter(note => !existingIds.has(note.id));

    // Append new notes
    if (newPinnedNotes.length > 0) {
      pinnedContainer.insertAdjacentHTML('beforeend', newPinnedNotes.map(note => renderNoteHTML(note)).join(''));
    }
    if (newRegularNotes.length > 0) {
      regularContainer.insertAdjacentHTML('beforeend', newRegularNotes.map(note => renderNoteHTML(note)).join(''));
    }
  } else {
    // Full render mode: Replace all notes
    pinnedContainer.innerHTML = pinnedNotes.map(note => renderNoteHTML(note)).join('');
    regularContainer.innerHTML = regularNotes.map(note => renderNoteHTML(note)).join('');
  }

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

  if (isSavingNote) return;
  isSavingNote = true;
  const saveBtn = document.getElementById('save-note-btn');
  setBtnBusy(saveBtn, 'Sparar…');

  try {
    const response = await apiFetch('/api/notes', {
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
      const result = await response.json();
      if (result.duplicatesSkipped > 0) {
        showToast(
          result.duplicatesSkipped === 1
            ? '1 dubblett ignorerades'
            : `${result.duplicatesSkipped} dubbletter ignorerades`,
          'info'
        );
      }
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
      invalidateNotesCache();
      loadNotes({ forceRefresh: true });
      showToast('Anteckning sparad', 'success');
    } else if (response.status === 403) {
      // CSRF token expired
      await fetchCSRFToken();
      showToast('Sessionen gick ut, försök igen', 'error');
    } else {
      showToast('Kunde inte spara anteckningen', 'error');
    }
  } catch (error) {
    console.error('Failed to save note:', error);
    showToast('Kunde inte spara anteckningen', 'error');
  } finally {
    isSavingNote = false;
    clearBtnBusy(saveBtn);
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

  // Dismiss share button - only for recipients of shared notes
  document.getElementById('dismiss-share-btn').style.display = note.isShared ? 'inline-block' : 'none';

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
    container.innerHTML = items.map((item, index) => {
      if (isHeaderItem(item)) {
        return `
      <div class="checklist-item checklist-header" data-header="true">
        <input type="text" value="${escapeHtml(item.text)}" ${!canEdit ? 'disabled' : ''} onchange="updateEditChecklistItem(${index})">
        ${canEdit ? `<button onclick="removeEditChecklistItem(${index})">×</button>` : ''}
      </div>
    `;
      }
      const confAttr = Number.isInteger(item.confidence) ? ` data-confidence="${item.confidence}"` : '';
      return `
      <div class="checklist-item"${confAttr}>
        <input type="checkbox" ${item.checked ? 'checked' : ''} ${!canEdit ? 'disabled' : ''} onchange="updateEditChecklistItem(${index})">
        <input type="text" value="${escapeHtml(item.text)}" ${!canEdit ? 'disabled' : ''} onchange="updateEditChecklistItem(${index})">
        ${confidenceBadgeHTML(item.confidence)}
        ${canEdit ? `<button onclick="removeEditChecklistItem(${index})">×</button>` : ''}
      </div>
    `;
    }).join('');
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

  // Reset snapshot lock during initialization
  snapshotLocked = false;
  originalEditState = null;

  document.getElementById('edit-modal').classList.add('active');

  // Take snapshot AFTER DOM is fully stabilized (double rAF)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      originalEditState = {
        title: document.getElementById('edit-note-title').value,
        content: document.getElementById('edit-note-content').value,
        isChecklist: document.getElementById('edit-checklist-container').style.display !== 'none',
        checklistItems: JSON.stringify(getChecklistItems('edit-checklist-items')),
        images: [...editNoteImages]
      };
      snapshotLocked = true;
    });
  });
}

// Check if there are unsaved changes in the edit modal
function hasUnsavedChanges() {
  // Don't report changes until snapshot is locked (after initialization)
  if (!snapshotLocked || !currentEditingNote || !originalEditState) return false;

  const currentTitle = document.getElementById('edit-note-title').value;
  const currentContent = document.getElementById('edit-note-content').value;
  const isChecklist = document.getElementById('edit-checklist-container').style.display !== 'none';

  // Check title and content
  if (currentTitle !== originalEditState.title) return true;
  if (currentContent !== originalEditState.content) return true;

  // Check checklist mode
  if (isChecklist !== originalEditState.isChecklist) return true;

  // Check checklist items if in checklist mode
  if (isChecklist) {
    const currentItems = JSON.stringify(getChecklistItems('edit-checklist-items'));
    if (currentItems !== originalEditState.checklistItems) return true;
  }

  // Check images
  if (JSON.stringify(editNoteImages) !== JSON.stringify(originalEditState.images)) return true;

  return false;
}

function closeEditModal(event) {
  // Allow closing from backdrop click or direct call (X button)
  // If event exists and target is not the modal backdrop, it's a click inside - ignore
  if (event && event.target && event.target.id !== 'edit-modal') {
    // But allow if it's the close button being clicked
    if (!event.target.classList.contains('modal-close-btn') &&
        !event.target.closest('.modal-close-btn')) {
      return;
    }
  }

  // Check for unsaved changes
  if (hasUnsavedChanges()) {
    showUnsavedChangesDialog();
    return;
  }

  // No changes, just close
  forceCloseEditModal();
}

function forceCloseEditModal() {
  document.getElementById('edit-modal').classList.remove('active');
  currentEditingNote = null;
  originalEditState = null;
  snapshotLocked = false;
}

function showUnsavedChangesDialog() {
  // Create a polished confirmation dialog
  const existingDialog = document.getElementById('unsaved-changes-dialog');
  if (existingDialog) existingDialog.remove();

  const dialog = document.createElement('div');
  dialog.id = 'unsaved-changes-dialog';
  dialog.className = 'modal active';
  dialog.style.cssText = 'z-index: 1001; display: flex; align-items: center; justify-content: center;';
  dialog.innerHTML = `
    <div class="modal-content modal-content--small unsaved-dialog-content" onclick="event.stopPropagation()">
      <h3 class="unsaved-dialog-title">Osparade ändringar</h3>
      <p class="unsaved-dialog-text">Du har ändringar som inte sparats. Vill du slänga dem?</p>
      <div class="unsaved-dialog-buttons">
        <button class="btn-secondary unsaved-dialog-btn" onclick="closeUnsavedChangesDialog()">Avbryt</button>
        <button class="btn-danger unsaved-dialog-btn" onclick="discardChangesAndClose()">Släng ändringar</button>
      </div>
    </div>
  `;
  dialog.onclick = (e) => {
    if (e.target.id === 'unsaved-changes-dialog') {
      closeUnsavedChangesDialog();
    }
  };
  document.body.appendChild(dialog);
}

function closeUnsavedChangesDialog() {
  document.getElementById('unsaved-changes-dialog')?.remove();
}

function discardChangesAndClose() {
  document.getElementById('unsaved-changes-dialog')?.remove();
  forceCloseEditModal();
}

async function saveChangesAndClose() {
  document.getElementById('unsaved-changes-dialog')?.remove();
  await updateNote();
  // updateNote will close the modal on success
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

  if (isUpdatingNote) return;
  isUpdatingNote = true;
  const updateBtn = document.getElementById('update-note-btn');
  setBtnBusy(updateBtn, 'Uppdaterar…');

  try {
    const response = await apiFetch(`/api/notes/${currentEditingNote.id}`, {
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
      const result = await response.json();
      if (result.duplicatesSkipped > 0) {
        showToast(
          result.duplicatesSkipped === 1
            ? '1 dubblett ignorerades'
            : `${result.duplicatesSkipped} dubbletter ignorerades`,
          'info'
        );
      }
      forceCloseEditModal();
      invalidateNotesCache();
      loadNotes({ forceRefresh: true });
      showToast('Anteckning uppdaterad', 'success');
    } else if (response.status === 403) {
      await fetchCSRFToken();
      showToast('Sessionen gick ut, försök igen', 'error');
    } else {
      showToast('Kunde inte uppdatera anteckningen', 'error');
    }
  } catch (error) {
    console.error('Failed to update note:', error);
    showToast('Kunde inte uppdatera anteckningen', 'error');
  } finally {
    isUpdatingNote = false;
    clearBtnBusy(updateBtn);
  }
}

async function deleteNote() {
  if (!currentEditingNote) return;

  if (!confirm('Är du säker på att du vill ta bort denna anteckning?')) {
    return;
  }

  if (isDeletingNote) return;
  isDeletingNote = true;
  const deleteBtn = document.getElementById('delete-note-btn');
  setBtnBusy(deleteBtn);

  try {
    const response = await apiFetch(`/api/notes/${currentEditingNote.id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getCSRFHeaders()
    });

    if (response.ok) {
      forceCloseEditModal();
      invalidateNotesCache();
      loadNotes({ forceRefresh: true });
      showToast('Anteckning borttagen', 'success');
    } else if (response.status === 403) {
      await fetchCSRFToken();
      showToast('Sessionen gick ut, försök igen', 'error');
    } else {
      showToast('Kunde inte ta bort anteckningen', 'error');
    }
  } catch (error) {
    console.error('Failed to delete note:', error);
    showToast('Kunde inte ta bort anteckningen', 'error');
  } finally {
    isDeletingNote = false;
    clearBtnBusy(deleteBtn);
  }
}

async function dismissShare() {
  if (!currentEditingNote) return;

  if (!confirm(t('share.confirm_dismiss'))) {
    return;
  }

  try {
    const response = await apiFetch(`/api/notes/${currentEditingNote.id}/dismiss-share`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getCSRFHeaders()
    });

    if (response.ok) {
      forceCloseEditModal();
      invalidateNotesCache();
      loadNotes({ forceRefresh: true });
    } else if (response.status === 403) {
      await fetchCSRFToken();
      showToast('Session expired, please try again', 'error');
    }
  } catch (error) {
    console.error('Failed to dismiss share:', error);
  }
}

async function togglePinNote() {
  if (!currentEditingNote) return;

  if (isPinningNote) return;
  isPinningNote = true;
  const pinBtn = document.getElementById('pin-note-btn');
  setBtnBusy(pinBtn);

  try {
    const response = await apiFetch(`/api/notes/${currentEditingNote.id}/pin`, {
      method: 'POST',
      credentials: 'include',
      headers: getCSRFHeaders()
    });

    if (response.ok) {
      const data = await response.json();
      currentEditingNote.is_pinned = data.is_pinned;

      // Update pin button icon in modal
      if (pinBtn) {
        pinBtn.textContent = data.is_pinned ? '📍' : '📌'; // 📍 = pinned, 📌 = unpinned
        pinBtn.title = data.is_pinned ? 'Avfästa' : 'Fäst';
      }

      loadNotes();
      showToast(data.is_pinned ? 'Anteckning fäst' : 'Anteckning avfäst', 'success');
    } else if (response.status === 403) {
      await fetchCSRFToken();
      showToast('Sessionen gick ut, försök igen', 'error');
    } else {
      showToast('Kunde inte fästa anteckningen', 'error');
    }
  } catch (error) {
    console.error('Failed to pin note:', error);
    showToast('Kunde inte fästa anteckningen', 'error');
  } finally {
    isPinningNote = false;
    clearBtnBusy(pinBtn);
  }
}

async function toggleArchiveNote() {
  if (!currentEditingNote) return;

  if (isArchivingNote) return;
  isArchivingNote = true;
  const archiveBtn = document.getElementById('archive-note-btn');
  setBtnBusy(archiveBtn);

  const willArchive = currentEditingNote.is_archived ? 0 : 1;
  currentEditingNote.is_archived = willArchive;

  try {
    const response = await apiFetch(`/api/notes/${currentEditingNote.id}`, {
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
      forceCloseEditModal();
      invalidateNotesCache(); // Both active and archived views need refresh
      loadNotes({ forceRefresh: true });
      showToast(willArchive ? 'Anteckning arkiverad' : 'Anteckning återställd', 'success');
    } else if (response.status === 403) {
      currentEditingNote.is_archived = willArchive ? 0 : 1; // revert optimistic change
      await fetchCSRFToken();
      showToast('Sessionen gick ut, försök igen', 'error');
    } else {
      currentEditingNote.is_archived = willArchive ? 0 : 1; // revert optimistic change
      showToast('Kunde inte arkivera anteckningen', 'error');
    }
  } catch (error) {
    currentEditingNote.is_archived = willArchive ? 0 : 1; // revert optimistic change
    console.error('Failed to archive note:', error);
    showToast('Kunde inte arkivera anteckningen', 'error');
  } finally {
    isArchivingNote = false;
    clearBtnBusy(archiveBtn);
  }
}

function toggleArchived() {
  showingArchived = !showingArchived;
  showingShared = false;
  document.getElementById('archive-toggle-text').textContent =
    showingArchived ? t('header.show_active') : t('header.show_archive');
  document.getElementById('shared-toggle-text').textContent = t('header.show_shared');
  loadNotes();
}

function toggleShared() {
  showingShared = !showingShared;
  showingArchived = false;
  document.getElementById('shared-toggle-text').textContent =
    showingShared ? t('header.show_all') : t('header.show_shared');
  document.getElementById('archive-toggle-text').textContent = t('header.show_archive');
  loadNotes();
}

// Toggle mobile menu
function toggleMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const headerActions = document.getElementById('header-actions');

  menuBtn.classList.toggle('active');
  headerActions.classList.toggle('mobile-open');
}

// Close mobile menu when clicking outside or selecting an option
function closeMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const headerActions = document.getElementById('header-actions');

  if (menuBtn && headerActions) {
    menuBtn.classList.remove('active');
    headerActions.classList.remove('mobile-open');
  }
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
// State management for sharing
let availableUsers = [];
let originalShares = []; // Shares as they exist on server
let pendingShares = [];  // Current state in the modal (what will be saved)
let shareModalNoteId = null; // Track which note we're sharing

async function openShareModal() {
  if (!currentEditingNote) return;

  shareModalNoteId = currentEditingNote.id;

  // Open the modal immediately with a spinner instead of blocking on the
  // network calls — otherwise the share button feels dead for a few seconds.
  const usersList = document.getElementById('share-users-list');
  if (usersList) usersList.innerHTML = '<div class="spinner" style="margin:24px auto;"></div>';
  document.getElementById('share-modal').classList.add('active');

  try {
    // Load users and current shares in parallel (halves the wait).
    const [usersResponse, sharesResponse] = await Promise.all([
      apiFetch('/api/users', { credentials: 'include' }),
      apiFetch(`/api/notes/${shareModalNoteId}/shares`, { credentials: 'include' })
    ]);

    if (usersResponse.ok) {
      availableUsers = await usersResponse.json();
    }

    if (sharesResponse.ok) {
      originalShares = await sharesResponse.json();
      // Deep copy to pending shares
      pendingShares = originalShares.map(s => ({
        shared_with_user_id: s.shared_with_user_id,
        username: s.username,
        avatar_color: s.avatar_color,
        permission: s.permission
      }));
    } else {
      originalShares = [];
      pendingShares = [];
    }

    renderShareModal();
    updatePendingChangesIndicator();

    // Setup event delegation for user list clicks
    setupShareModalEventListeners();
  } catch (error) {
    console.error('Failed to load sharing data:', error);
    showToast('Kunde inte ladda delningsinformation', 'error');
  }
}

function setupShareModalEventListeners() {
  // Event delegation for user list
  const usersContainer = document.getElementById('share-users-list');
  usersContainer.onclick = function(e) {
    const userItem = e.target.closest('.share-user-item');
    if (userItem) {
      const userId = parseInt(userItem.dataset.userId, 10);
      const username = userItem.dataset.username;
      toggleSharePending(userId, username);
    }
  };

  // Event delegation for current shares
  const sharesContainer = document.getElementById('current-shares-list');
  sharesContainer.onclick = function(e) {
    // Handle remove button click
    const removeBtn = e.target.closest('.share-remove-btn');
    if (removeBtn) {
      const userId = parseInt(removeBtn.dataset.userId, 10);
      removeSharePending(userId);
      return;
    }
  };

  sharesContainer.onchange = function(e) {
    // Handle permission change
    if (e.target.tagName === 'SELECT') {
      const userId = parseInt(e.target.dataset.userId, 10);
      const permission = e.target.value;
      updateSharePermissionPending(userId, permission);
    }
  };
}

function closeShareModal(event) {
  if (event && event.target.id !== 'share-modal') return;
  document.getElementById('share-modal').classList.remove('active');
  resetShareModalState();
}

function cancelShareModal() {
  // Check if there are unsaved changes
  if (hasShareChanges()) {
    if (!confirm('Du har osparade ändringar. Vill du stänga utan att spara?')) {
      return;
    }
  }
  document.getElementById('share-modal').classList.remove('active');
  resetShareModalState();
}

function resetShareModalState() {
  shareModalNoteId = null;
  originalShares = [];
  pendingShares = [];
  availableUsers = [];
}

function hasShareChanges() {
  if (originalShares.length !== pendingShares.length) return true;

  for (const pending of pendingShares) {
    const original = originalShares.find(o => o.shared_with_user_id === pending.shared_with_user_id);
    if (!original) return true; // New share
    if (original.permission !== pending.permission) return true; // Permission changed
  }

  for (const original of originalShares) {
    const pending = pendingShares.find(p => p.shared_with_user_id === original.shared_with_user_id);
    if (!pending) return true; // Share removed
  }

  return false;
}

function updatePendingChangesIndicator() {
  const indicator = document.getElementById('share-pending-changes');
  const saveBtn = document.getElementById('save-shares-btn');

  if (hasShareChanges()) {
    indicator.style.display = 'flex';
    saveBtn.disabled = false;
    saveBtn.classList.add('btn-primary');
    saveBtn.classList.remove('btn-secondary');
  } else {
    indicator.style.display = 'none';
    saveBtn.disabled = false;
    saveBtn.classList.remove('btn-primary');
    saveBtn.classList.add('btn-secondary');
  }
}

function renderShareModal() {
  const usersContainer = document.getElementById('share-users-list');
  const sharesContainer = document.getElementById('current-shares-list');
  const sharesSection = document.getElementById('current-shares-section');

  // Render available users with data attributes (no inline onclick - XSS safe)
  usersContainer.innerHTML = availableUsers.map(user => {
    const isPending = pendingShares.some(s => s.shared_with_user_id === user.id);
    const wasOriginal = originalShares.some(s => s.shared_with_user_id === user.id);
    const initials = user.username.substring(0, 2).toUpperCase();
    const avatarColor = user.avatar_color || '#1a73e8';

    // Determine visual state
    let stateClass = '';
    if (isPending && !wasOriginal) {
      stateClass = 'pending-add'; // Will be added
    } else if (!isPending && wasOriginal) {
      stateClass = 'pending-remove'; // Will be removed
    } else if (isPending) {
      stateClass = 'shared'; // Already shared
    }

    return `
      <div class="share-user-item ${stateClass}"
           data-user-id="${user.id}"
           data-username="${escapeHtml(user.username)}">
        <div class="profile-initials-small" style="background-color: ${avatarColor};">${initials}</div>
        <span class="username">${escapeHtml(user.username)}</span>
        ${isPending ? '<span class="share-check">✓</span>' : ''}
      </div>
    `;
  }).join('');

  // Render current/pending shares
  if (pendingShares.length > 0) {
    sharesSection.style.display = 'block';
    sharesContainer.innerHTML = pendingShares.map(share => {
      const initials = share.username.substring(0, 2).toUpperCase();
      const avatarColor = share.avatar_color || '#1a73e8';
      const isNew = !originalShares.some(o => o.shared_with_user_id === share.shared_with_user_id);

      return `
        <div class="current-share-item ${isNew ? 'pending-add' : ''}">
          <div class="profile-initials-small" style="background-color: ${avatarColor};">${initials}</div>
          <span class="username">${escapeHtml(share.username)}</span>
          <select data-user-id="${share.shared_with_user_id}">
            <option value="view" ${share.permission === 'view' ? 'selected' : ''}>Kan visa</option>
            <option value="edit" ${share.permission === 'edit' ? 'selected' : ''}>Kan redigera</option>
          </select>
          <button class="btn-icon share-remove-btn" data-user-id="${share.shared_with_user_id}" title="Ta bort delning">✕</button>
        </div>
      `;
    }).join('');
  } else {
    sharesSection.style.display = 'none';
    sharesContainer.innerHTML = '';
  }
}

function toggleSharePending(userId, username) {
  const existingIndex = pendingShares.findIndex(s => s.shared_with_user_id === userId);

  if (existingIndex >= 0) {
    // Remove from pending
    pendingShares.splice(existingIndex, 1);
  } else {
    // Add to pending with default permission
    const user = availableUsers.find(u => u.id === userId);
    pendingShares.push({
      shared_with_user_id: userId,
      username: username,
      avatar_color: user?.avatar_color || '#1a73e8',
      permission: 'view'
    });
  }

  renderShareModal();
  updatePendingChangesIndicator();
}

function removeSharePending(userId) {
  pendingShares = pendingShares.filter(s => s.shared_with_user_id !== userId);
  renderShareModal();
  updatePendingChangesIndicator();
}

function updateSharePermissionPending(userId, permission) {
  const share = pendingShares.find(s => s.shared_with_user_id === userId);
  if (share) {
    share.permission = permission;
  }
  updatePendingChangesIndicator();
}

async function saveShares() {
  if (!shareModalNoteId) return;

  const saveBtn = document.getElementById('save-shares-btn');
  const originalBtnText = saveBtn.textContent;
  saveBtn.textContent = 'Sparar...';
  saveBtn.disabled = true;

  try {
    // Determine what to add, remove, and update
    const toAdd = pendingShares.filter(p =>
      !originalShares.some(o => o.shared_with_user_id === p.shared_with_user_id)
    );
    const toRemove = originalShares.filter(o =>
      !pendingShares.some(p => p.shared_with_user_id === o.shared_with_user_id)
    );
    const toUpdate = pendingShares.filter(p => {
      const original = originalShares.find(o => o.shared_with_user_id === p.shared_with_user_id);
      return original && original.permission !== p.permission;
    });

    let successCount = 0;
    let errorCount = 0;

    // Process additions and updates
    for (const share of [...toAdd, ...toUpdate]) {
      try {
        const response = await apiFetch(`/api/notes/${shareModalNoteId}/share`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getCSRFHeaders()
          },
          body: JSON.stringify({
            userId: share.shared_with_user_id,
            permission: share.permission
          })
        });

        if (response.ok) {
          successCount++;
        } else if (response.status === 403) {
          await fetchCSRFToken();
          errorCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('Failed to save share:', error);
        errorCount++;
      }
    }

    // Process removals
    for (const share of toRemove) {
      try {
        const response = await apiFetch(`/api/notes/${shareModalNoteId}/share/${share.shared_with_user_id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: getCSRFHeaders()
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('Failed to remove share:', error);
        errorCount++;
      }
    }

    // Show result and close modal
    if (errorCount === 0) {
      const totalChanges = toAdd.length + toRemove.length + toUpdate.length;
      if (totalChanges > 0) {
        showToast('Delningar sparade', 'success');
      }
      document.getElementById('share-modal').classList.remove('active');
      resetShareModalState();
      // Reload notes to update share_count indicator
      loadNotes();
    } else {
      showToast(`${errorCount} fel uppstod vid sparning`, 'error');
      // Reload shares to get current state
      const sharesResponse = await apiFetch(`/api/notes/${shareModalNoteId}/shares`, {
        credentials: 'include'
      });
      if (sharesResponse.ok) {
        originalShares = await sharesResponse.json();
        pendingShares = originalShares.map(s => ({
          shared_with_user_id: s.shared_with_user_id,
          username: s.username,
          avatar_color: s.avatar_color,
          permission: s.permission
        }));
        renderShareModal();
        updatePendingChangesIndicator();
      }
    }
  } catch (error) {
    console.error('Failed to save shares:', error);
    showToast('Kunde inte spara delningar', 'error');
  } finally {
    saveBtn.textContent = originalBtnText;
    saveBtn.disabled = false;
  }
}

// Toast notification system
function showToast(message, type = 'info') {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Put a button into a busy state (disabled + optional "working…" label) and
// restore it afterwards. For icon buttons omit busyText to keep the icon.
function setBtnBusy(btn, busyText) {
  if (!btn) return;
  if (busyText) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = busyText;
  }
  btn.disabled = true;
  btn.classList.add('btn-busy');
}

function clearBtnBusy(btn) {
  if (!btn) return;
  if (btn.dataset.originalText !== undefined) {
    btn.textContent = btn.dataset.originalText;
    delete btn.dataset.originalText;
  }
  btn.disabled = false;
  btn.classList.remove('btn-busy');
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
    const textInput = item.querySelector('input[type="text"]');
    const text = textInput.value.trim();
    if (!text) return;

    if (item.dataset.header === 'true') {
      items.push({ text, checked: false, isHeader: true });
      return;
    }

    const checkbox = item.querySelector('input[type="checkbox"]');
    const entry = { text, checked: checkbox ? checkbox.checked : false };
    const conf = parseInt(item.dataset.confidence, 10);
    if (Number.isInteger(conf) && conf >= 1 && conf <= 10) {
      entry.confidence = conf;
    }
    items.push(entry);
  });

  return items;
}

// Header items get `isHeader: true` from the backend. Legacy notes (created
// before that flag existed) are detected by their "── X ──" text pattern.
function isHeaderItem(item) {
  return item.isHeader === true || /^── .+ ──$/.test(item.text || '');
}

function confidenceBadgeHTML(confidence) {
  if (!Number.isInteger(confidence) || confidence < 1 || confidence > 10) return '';
  return `<span class="confidence-badge confidence-${confidence}" title="Säkerhetsfaktor: ${confidence}/10">${confidence}</span>`;
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
      showToast('Vänligen välj en .zip fil', 'error');
      return;
    }

    selectedImportFile = file;
    document.getElementById('import-file-name').textContent = `Vald fil: ${file.name} (${formatFileSize(file.size)})`;
    document.getElementById('import-button').disabled = false;
  }
}

async function startImport() {
  if (!selectedImportFile) return;

  // Show upload progress
  document.getElementById('import-instructions').style.display = 'none';
  document.getElementById('import-progress').style.display = 'block';
  document.getElementById('import-processing').style.display = 'none';
  document.getElementById('import-button').disabled = true;

  const formData = new FormData();
  formData.append('zipfile', selectedImportFile);

  try {
    updateImportProgress(0, t('messages.import_uploading'));

    const xhr = new XMLHttpRequest();

    // Upload progress (0-100%)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        updateImportProgress(percent, t('messages.import_uploading'));
      }
    });

    // When upload is complete, show processing state
    xhr.upload.addEventListener('load', () => {
      // Upload done, now server is processing
      document.getElementById('import-progress').style.display = 'none';
      document.getElementById('import-processing').style.display = 'block';
      document.getElementById('import-processing-status').textContent = t('messages.import_processing');
    });

    // When server responds
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const result = JSON.parse(xhr.responseText);
        // Hide processing, show results
        document.getElementById('import-processing').style.display = 'none';
        showImportResults(result);
        loadNotes();
      } else {
        const error = JSON.parse(xhr.responseText);
        // Hide processing, show error
        document.getElementById('import-processing').style.display = 'none';
        showToast(`Import misslyckades: ${error.message || error.error}`, 'error');
        document.getElementById('import-instructions').style.display = 'block';
        document.getElementById('import-button').disabled = false;
      }
    });

    xhr.addEventListener('error', () => {
      document.getElementById('import-processing').style.display = 'none';
      showToast('Nätverksfel vid import. Försök igen.', 'error');
      document.getElementById('import-instructions').style.display = 'block';
      document.getElementById('import-button').disabled = false;
    });

    xhr.withCredentials = true; // Include session cookies
    xhr.open('POST', '/api/import/keep');
    xhr.send(formData);

  } catch (error) {
    console.error('Import error:', error);
    showToast('Ett fel uppstod vid import.', 'error');
    document.getElementById('import-instructions').style.display = 'block';
    document.getElementById('import-progress').style.display = 'none';
    document.getElementById('import-processing').style.display = 'none';
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

  const exportBtn = document.querySelector('button[onclick="exportBackup()"]');
  setBtnBusy(exportBtn);
  showToast('Förbereder backup…', 'info');

  try {
    const response = await apiFetch('/api/backup/export', {
      method: 'GET',
      credentials: 'include',
      headers: getCSRFHeaders()
    });

    if (response.ok) {
      // Get filename from Content-Disposition header or use default
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'kreep-backup.zip';
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

      showToast('Backup exporterad!', 'success');
    } else if (response.status === 403) {
      await fetchCSRFToken();
      showToast('Session expired, please try again', 'error');
    } else {
      throw new Error('Export failed');
    }
  } catch (error) {
    console.error('Export error:', error);
    showToast('Kunde inte exportera backup. Kontrollera att du är inloggad.', 'error');
  } finally {
    clearBtnBusy(exportBtn);
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

// Image upload progress UI (shared by new-note and edit handlers).
// prefix is 'new-note' or 'edit-note', matching the element ids in index.html.
function showImageUploadProgress(prefix, total) {
  const wrap = document.getElementById(`${prefix}-image-progress`);
  if (!wrap) return;
  wrap.classList.remove('hidden');
  updateImageUploadProgress(prefix, 0, total);
}

function updateImageUploadProgress(prefix, completed, total) {
  const bar = document.getElementById(`${prefix}-image-progress-bar`);
  const text = document.getElementById(`${prefix}-image-progress-text`);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = `Laddar upp bild ${Math.min(completed + 1, total)} av ${total}…`;
}

function hideImageUploadProgress(prefix) {
  const wrap = document.getElementById(`${prefix}-image-progress`);
  if (wrap) wrap.classList.add('hidden');
}

// Handle new note image selection
async function handleNewNoteImageSelect() {
  const input = document.getElementById('new-note-image-input');
  const files = Array.from(input.files);

  if (files.length === 0) return;

  const remainingSlots = maxImagesPerNote - newNoteImages.length;
  if (files.length > remainingSlots) {
    showToast(`Du kan bara lägga till ${remainingSlots} till bilder (max ${maxImagesPerNote} per anteckning)`, 'error');
    return;
  }

  showImageUploadProgress('new-note', files.length);
  let uploaded = 0;
  try {
    for (const file of files) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        showToast(`Bilden "${file.name}" är för stor (max 10MB)`, 'error');
        continue;
      }

      updateImageUploadProgress('new-note', uploaded, files.length);

      // Upload image
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiFetch('/api/notes/image', {
        method: 'POST',
        credentials: 'include',
        headers: getCSRFHeaders(),
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        newNoteImages.push(data.filename);
        uploaded++;
        updateImageUploadProgress('new-note', uploaded, files.length);
      } else if (response.status === 403) {
        await fetchCSRFToken();
        showToast('Session expired, please try again', 'error');
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
    showToast('Kunde inte ladda upp bilder', 'error');
  } finally {
    hideImageUploadProgress('new-note');
  }
}

// Handle edit note image selection
async function handleEditNoteImageSelect() {
  const input = document.getElementById('edit-note-image-input');
  const files = Array.from(input.files);

  if (files.length === 0) return;

  const remainingSlots = maxImagesPerNote - editNoteImages.length;
  if (files.length > remainingSlots) {
    showToast(`Du kan bara lägga till ${remainingSlots} till bilder (max ${maxImagesPerNote} per anteckning)`, 'error');
    return;
  }

  showImageUploadProgress('edit-note', files.length);
  let uploaded = 0;
  try {
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        showToast(`Bilden "${file.name}" är för stor (max 10MB)`, 'error');
        continue;
      }

      updateImageUploadProgress('edit-note', uploaded, files.length);

      const formData = new FormData();
      formData.append('image', file);

      const response = await apiFetch('/api/notes/image', {
        method: 'POST',
        credentials: 'include',
        headers: getCSRFHeaders(),
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        editNoteImages.push(data.filename);
        uploaded++;
        updateImageUploadProgress('edit-note', uploaded, files.length);
      } else if (response.status === 403) {
        await fetchCSRFToken();
        showToast('Session expired, please try again', 'error');
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
    showToast('Kunde inte ladda upp bilder', 'error');
  } finally {
    hideImageUploadProgress('edit-note');
  }
}

// Render image preview
function renderImagePreview(containerId, images, canRemove) {
  const container = document.getElementById(containerId);
  const imagesJson = JSON.stringify(images).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  container.setAttribute('data-images', imagesJson);
  container.innerHTML = images.map((img, index) => `
    <div class="image-preview-item">
      <img src="/api/notes/image/${img}" alt="Preview" loading="lazy" onclick="openImageModal('${img}', JSON.parse(this.closest('[data-images]').dataset.images))">
      ${canRemove ? `<button class="remove-image" onclick="event.stopPropagation(); removeImage('${containerId}', ${index})">✕</button>` : ''}
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

// Image modal state for navigation
let imageModalImages = [];
let imageModalIndex = 0;

// Open image modal for full view
function openImageModal(filename, noteImages) {
  const modal = document.getElementById('image-modal');
  const img = document.getElementById('image-modal-img');
  const counter = document.getElementById('image-modal-counter');

  // Set up navigation if multiple images
  if (noteImages && noteImages.length > 1) {
    imageModalImages = noteImages;
    imageModalIndex = noteImages.indexOf(filename);
    modal.classList.add('has-nav');
    counter.textContent = `${imageModalIndex + 1} / ${noteImages.length}`;
  } else {
    imageModalImages = [];
    imageModalIndex = 0;
    modal.classList.remove('has-nav');
  }

  img.src = `/api/notes/image/${filename}`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Navigate between images in modal
function navigateImage(direction) {
  if (imageModalImages.length === 0) return;
  imageModalIndex = (imageModalIndex + direction + imageModalImages.length) % imageModalImages.length;
  const img = document.getElementById('image-modal-img');
  const counter = document.getElementById('image-modal-counter');
  img.src = `/api/notes/image/${imageModalImages[imageModalIndex]}`;
  counter.textContent = `${imageModalIndex + 1} / ${imageModalImages.length}`;
}

// Close image modal
function closeImageModal() {
  const modal = document.getElementById('image-modal');
  modal.classList.remove('active');
  modal.classList.remove('has-nav');
  document.body.style.overflow = '';
  imageModalImages = [];
  imageModalIndex = 0;
}

// Keyboard support for image modal
document.addEventListener('keydown', function(e) {
  const modal = document.getElementById('image-modal');
  if (!modal.classList.contains('active')) return;

  if (e.key === 'Escape') {
    closeImageModal();
  } else if (e.key === 'ArrowLeft') {
    navigateImage(-1);
  } else if (e.key === 'ArrowRight') {
    navigateImage(1);
  }
});
