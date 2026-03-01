# Keyboard Shortcuts

Press This uses `BlockEditorProvider` directly rather than the full Gutenberg `EditorProvider`. This means not all keyboard shortcuts from the standard WordPress editor are available. This document tracks what's supported and what isn't.

Modifier key conventions: "Primary" is Ctrl on Windows/Linux, Cmd on macOS. "Access" is Ctrl+Alt on Windows/Linux, Ctrl+Option on macOS. "Secondary" is Ctrl+Shift on Windows/Linux, Cmd+Shift on macOS.

## Rich Text Format Shortcuts

Provided by `@wordpress/format-library`. These work inside any rich text block (paragraphs, headings, quotes, lists).

| Shortcut | Action | Status |
|----------|--------|--------|
| Primary+B | Bold | Available |
| Primary+I | Italic | Available |
| Primary+K | Insert/edit link | Available |
| Primary+Shift+K | Remove link | Available |
| Primary+U | Underline | Available |
| Access+D | Strikethrough | Available |
| Access+X | Inline code | Available |

## Block Editing Shortcuts

Provided by `BlockEditorKeyboardShortcuts` from `@wordpress/block-editor`. These operate on selected blocks.

| Shortcut | Action | Status |
|----------|--------|--------|
| Primary+A | Select all text, then all blocks | Available |
| Primary+C | Copy selected block(s) | Available |
| Primary+X | Cut selected block(s) | Available |
| Primary+V | Paste | Available |
| Primary+Shift+D | Duplicate selected block(s) | Available |
| Access+Z | Remove selected block(s) | Available |
| Primary+Alt+V | Paste styles | Available |
| Primary+Alt+T | Insert block before | Available |
| Primary+Alt+Y | Insert block after | Available |
| Secondary+T | Move block up | Available |
| Secondary+Y | Move block down | Available |
| Primary+G | Group selected blocks | Available |
| Primary+Shift+H | Toggle block visibility | Available |
| Primary+Alt+R | Rename block | Available |
| Escape | Clear selection / stop editing | Available |
| Alt+F10 | Focus toolbar | Available |
| / | Open block inserter (in empty paragraph) | Available |

## Block Transform Shortcuts

Provided by `@wordpress/block-library`. These convert between block types.

| Shortcut | Action | Status |
|----------|--------|--------|
| Access+0 | Transform to paragraph | Available |
| Access+1 through Access+6 | Transform to heading (level 1-6) | Available |
| Access+7 | Transform to paragraph (alias) | Available |

## Editor-Level Shortcuts (Not Available)

These shortcuts are registered by `EditorKeyboardShortcuts` in `@wordpress/editor`, which Press This doesn't use. Some are handled through alternative implementations.

| Shortcut | Action | Status | Notes |
|----------|--------|--------|-------|
| Primary+Z | Undo | Not available | See [#75](https://github.com/WordPress/press-this/issues/75), [PR #78](https://github.com/WordPress/press-this/pull/78) |
| Primary+Shift+Z | Redo | Not available | See [#75](https://github.com/WordPress/press-this/issues/75), [PR #78](https://github.com/WordPress/press-this/pull/78) |
| Primary+Y | Redo (Windows/Linux) | Not available | See [#75](https://github.com/WordPress/press-this/issues/75), [PR #78](https://github.com/WordPress/press-this/pull/78) |
| Primary+S | Save | Not available | |
| Secondary+M | Toggle code editor | Not available | Not applicable to Press This |
| Access+O | Toggle list view | Not available | |
| Primary+Shift+, | Toggle settings panel | Not available | |
| Primary+Shift+\ | Distraction-free mode | Not available | |
| Access+H | Show keyboard shortcuts | Not available | |

## Legacy Shortcuts (Not Available)

These shortcuts existed in the classic TinyMCE editor but were never part of the block editor.

| Shortcut | Action | Notes |
|----------|--------|-------|
| Ctrl+Alt+Q | Toggle blockquote | Classic editor only. In the block editor, use Access+0 to transform to paragraph or the block toolbar to convert to a quote block. See [#81](https://github.com/WordPress/press-this/issues/81). |
