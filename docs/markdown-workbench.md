# Markdown Workbench

- Visual: Tiptap editing.
- Markdown: CodeMirror 6 with persistent theme selection.
- Split: CodeMirror source and read-only Tiptap preview; stacked on narrow screens.
- Valid source changes update the existing composer snapshot and its IndexedDB persistence.
- Invalid documents block publishing and PWA updates while the editor is mounted.
- Multimedia uses stable jardim-media UUID markers.

Acceptance: verify mobile keyboard, theme switching, media round trips, offline reload, and publishing after edits. Markdown cannot represent every rich-text mark losslessly; verify underline, alignment and highlight before relying on conversion.
