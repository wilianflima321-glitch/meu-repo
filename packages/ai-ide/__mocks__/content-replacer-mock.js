// Minimal ContentReplacer mock used by file-changeset functions
class ContentReplacer {
  constructor() {}
  // Newer implementations call applyReplacements(...) and older ones call replace(...)
  applyReplacements(content, replacements) {
    const errors = [];
    let result = typeof content === 'string' ? content : String(content || '');
    for (const r of replacements || []) {
      if (!r || typeof r.oldContent === 'undefined' || typeof r.newContent === 'undefined') {
        errors.push('invalid replacement tuple');
        continue;
      }
      // Use oldContent/newContent names used by file-changeset functions
      const oldText = r.oldContent !== undefined ? r.oldContent : r.oldText;
      const newText = r.newContent !== undefined ? r.newContent : r.newText;
      if (oldText === undefined) {
        errors.push('missing old content');
        continue;
      }
      result = result.split(oldText).join(newText);
    }
    return { updatedContent: result, errors };
  }
  replace(content, replacements) {
    // backwards-compatible: call applyReplacements and return string
    return this.applyReplacements(content, replacements).updatedContent;
  }
}

// Export multiple shapes to be tolerant of different import/interop styles
module.exports = { ContentReplacer };
module.exports.ContentReplacer = ContentReplacer;
module.exports.default = ContentReplacer;
// Debugging: log the exported shape so we can diagnose "not a constructor" failures
try {
  // eslint-disable-next-line no-console
  console.error('[content-replacer-mock] loaded, typeof ContentReplacer =', typeof module.exports.ContentReplacer);
}
catch (e) { }
