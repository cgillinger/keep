# Adding New Languages to Kreep

Kreep v1.1.0 includes a complete internationalization (i18n) system that allows users to add and remove translations using JSON files.

## 📋 Current Languages

- **English (en)** - Default language
- **Svenska (sv)** - Swedish
- **Suomi (fi)** - Finnish
- **Norsk (no)** - Norwegian
- **Dansk (da)** - Danish
- **Deutsch (de)** - German
- **Français (fr)** - French

## 🌍 How to Add a New Language

Adding a new language requires 3 simple steps:

### Step 1: Create Language File

1. **Navigate to** `public/locales/`
2. **Copy** the English template:
   ```bash
   cp public/locales/en.json public/locales/[language-code].json
   ```

   **Language codes (ISO 639-1):**
   - German: `de.json`
   - French: `fr.json`
   - Spanish: `es.json`
   - Finnish: `fi.json`
   - Italian: `it.json`
   - Dutch: `nl.json`
   - Norwegian: `no.json`
   - Danish: `da.json`

3. **Translate** all strings in the new file

### Step 2: Add Language to Selector

Edit `public/index.html` and add your language option:

```html
<select id="language-selector" onchange="changeLanguage(this.value)" class="language-selector">
  <option value="en">English</option>
  <option value="sv">Svenska</option>
  <option value="de">Deutsch</option>  <!-- ADD THIS -->
  <option value="fr">Français</option> <!-- OR THIS -->
</select>
```

**Order:** List languages alphabetically by native name.

### Step 3: Test the Language

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Open browser:** `http://localhost:3000`

3. **Test translation:**
   - Open profile modal (click your initials)
   - Select new language from dropdown
   - Verify all UI elements are translated

That's it! No server restart needed.

## 📝 Translation File Structure

The JSON file has the following sections:

```json
{
  "meta": {
    "title": "Page title",
    "description": "SEO description",
    "keywords": "SEO keywords",
    "og_title": "Open Graph title",
    "og_description": "Open Graph description",
    "twitter_title": "Twitter card title",
    "twitter_description": "Twitter card description"
  },
  "auth": {
    "app_name": "Kreep",
    "subtitle": "Tagline",
    "login_title": "Log in form title",
    ...
  },
  "header": {
    "search_placeholder": "Search box placeholder",
    "show_shared": "Show shared button text",
    ...
  },
  "notes": {
    "title_placeholder": "Note title placeholder",
    "content_placeholder": "Note content placeholder",
    ...
  },
  "import": {
    "title": "Import modal title",
    ...
  },
  "profile": {
    "title": "Profile modal title",
    ...
  },
  "share": {
    "title": "Share modal title",
    ...
  },
  "messages": {
    "note_created": "Success message",
    "error": "Error message",
    ...
  },
  "footer": {
    "version": "Kreep v1.1.0",
    "license": "MIT License"
  }
}
```

## ✅ Translation Checklist

When creating a new translation, ensure:

- [ ] All keys from `en.json` are present
- [ ] No keys are missing or extra
- [ ] All strings are translated (not just copied)
- [ ] Special characters are properly escaped
- [ ] Emojis are preserved (📥, 📤, etc.)
- [ ] Brand name "Kreep" remains unchanged
- [ ] Version number matches current version
- [ ] Grammar and spelling are correct
- [ ] Language selector displays native name

## 🔍 Testing Your Translation

### Quick Test

1. Start app: `npm start`
2. Login/register
3. Open profile → Select your language
4. Check these areas:
   - Login/register forms
   - Header buttons
   - Note creation form
   - Profile modal
   - Import modal
   - Share modal
   - Error messages

### Thorough Test

Test all functionality in the new language:
- [ ] User registration
- [ ] Login/logout
- [ ] Create note
- [ ] Edit note
- [ ] Color selection
- [ ] Checklist creation
- [ ] Pin/unpin note
- [ ] Archive/unarchive note
- [ ] Search notes
- [ ] Share note
- [ ] Toggle shared/archived views
- [ ] Profile customization
- [ ] Import from Google Keep
- [ ] Export backup
- [ ] Password reset flow

## 🐛 Common Issues

### Language not appearing in dropdown

**Problem:** New language doesn't show in selector

**Solution:**
- Check that you added `<option value="[code]">[Name]</option>` to `index.html`
- Verify the value matches the filename (without .json)
- Refresh browser (Ctrl+F5 / Cmd+Shift+R)

### Partial translation

**Problem:** Some text remains in English

**Solution:**
- Compare your file with `en.json` to find missing keys
- Ensure all nested objects have all keys
- Check console for "Translation missing for key: X" warnings

### Special characters broken

**Problem:** Ö, Ä, Å, é, ñ, etc. display incorrectly

**Solution:**
- Ensure your JSON file is saved as UTF-8
- Use `\"` for quotes inside strings
- Escape backslashes: `\\`

### Language not persisting

**Problem:** Language resets to English on reload

**Solution:**
- Check browser console for errors
- Verify `localStorage` is enabled
- Test in incognito/private mode (localStorage might be disabled)

## 💡 Translation Tips

### Keep Consistent

- Use same terminology throughout (e.g., don't mix "note" and "memo")
- Match Google Keep's terminology in your language (users are familiar)
- Keep button labels short (max 2-3 words)

### Cultural Adaptations

- Adapt date formats to local conventions
- Consider formal vs informal language ("du" vs "Sie", "tu" vs "vous")
- Use culturally appropriate greetings

### Technical Terms

These should generally NOT be translated:
- Google Keep (brand name)
- Kreep (brand name)
- GitHub (brand name)
- CSRF, XSS, SQL (security terms)
- WebSocket (technology)
- Docker (technology)

## 📤 Contributing Translations

We welcome community translations! To contribute:

1. **Fork** the repository
2. **Create** your language file
3. **Test** thoroughly
4. **Add** language to selector
5. **Open Pull Request** with:
   - Title: "Add [Language] translation"
   - Description: Test results and native speaker verification
   - Screenshot of UI in new language

### Quality Standards

For PR acceptance:
- ✅ Native speaker reviewed
- ✅ No machine translation artifacts
- ✅ Complete (100% of strings)
- ✅ Tested in app
- ✅ Proper grammar and spelling

## 🗺️ Planned Languages

Help us add these languages:
- [x] German (de) ✅
- [x] French (fr) ✅
- [ ] Spanish (es)
- [x] Finnish (fi) ✅
- [x] Norwegian (no) ✅
- [x] Danish (da) ✅
- [ ] Italian (it)
- [ ] Dutch (nl)
- [ ] Portuguese (pt)
- [ ] Polish (pl)

## 🛠️ Advanced: Right-to-Left (RTL) Languages

For RTL languages (Arabic, Hebrew, etc.), additional CSS changes are needed:

1. Add `dir="rtl"` support
2. Mirror UI elements
3. Adjust padding/margins

This requires code changes beyond JSON files. Open an issue to discuss implementation.

## 📚 Resources

**Language Codes:**
- [ISO 639-1 list](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)

**Translation Tools:**
- [DeepL](https://www.deepl.com/) - High-quality machine translation (for reference)
- [Google Translate](https://translate.google.com/) - Quick reference
- **Note:** Always have native speaker verify machine translations!

**Testing Tools:**
- Browser DevTools (F12) → Console (check for translation warnings)
- [JSON Validator](https://jsonlint.com/) - Verify JSON syntax

## 📧 Questions?

- Open an [Issue](https://github.com/cgillinger/keep/issues) with the "translation" label
- Tag your language in the issue title: `[DE] Translation question`

---

**Thank you for helping make Kreep accessible to more people! 🌍**
