/**
 * Link Escape Fix
 *
 * Workaround for a Gutenberg bug where pressing Escape to close the link
 * popover (Ctrl+K / Cmd+K) causes the cursor to jump to position 0.
 *
 * Root cause: when the contenteditable regains focus after the popover closes,
 * the rich-text onFocus handler calls applyRecord with domOnly:true, which
 * skips DOM selection restoration. The browser defaults the cursor to
 * position 0 if the selection wasn't preserved during the focus transfer.
 *
 * Press This uses a controlled BlockEditorProvider (value/onInput/onChange)
 * that does not sync rich-text cursor positions to the block-editor store,
 * so store-based selectors like getSelectionStart return empty values for
 * caret offsets within a block. This fix therefore works entirely at the
 * DOM level: it tracks the character offset of the caret via the
 * selectionchange event, and restores it after the link popover closes.
 *
 * The restored position is always a collapsed caret (not a range selection)
 * because applying a link collapses the selection to the end of the anchor.
 *
 * TODO: Add upstream Gutenberg issue link once filed, then remove this
 * file after the host WordPress version includes the fix.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useEffect, useRef } from '@wordpress/element';

export default function LinkEscapeFix() {
	const ref = useRef();

	useEffect( () => {
		let lastCharOffset = null;
		let lastEditable = null;
		let rafId = null;

		/**
		 * Return the ownerDocument and its defaultView, using our ref
		 * so we satisfy the no-global-get-selection lint rule.
		 * Falls back to globals before the ref attaches (initial render).
		 */
		function getDoc() {
			return ref.current?.ownerDocument || document;
		}
		function getWindow() {
			return getDoc().defaultView || window;
		}

		/**
		 * Track the character offset of the caret within the nearest
		 * contenteditable. Stores the offset in closure variables
		 * (lastCharOffset / lastEditable) for later restoration.
		 *
		 * Only tracks editables inside this editor instance to avoid
		 * capturing selections from unrelated contenteditables on the
		 * page (e.g. title field, other plugins).
		 *
		 * Uses a temporary range from the start of the editable to the
		 * selection end-point and measures text length. This is
		 * tag-agnostic: wrapping a word in <a> doesn't shift offsets.
		 */
		function handleSelectionChange() {
			const sel = getWindow().getSelection();
			if ( ! sel.rangeCount ) {
				return;
			}

			const range = sel.getRangeAt( 0 );
			const node = range.startContainer;

			const editable =
				node.nodeType === 1
					? node.closest?.( '[contenteditable="true"]' )
					: node.parentElement?.closest?.(
							'[contenteditable="true"]'
					  );
			if ( ! editable ) {
				return;
			}

			// Scope to this editor instance so we don't capture
			// selections from unrelated contenteditables (e.g. title).
			const root = ref.current?.closest( '.press-this-editor__content' );
			if ( root && ! root.contains( editable ) ) {
				return;
			}

			try {
				const doc = getDoc();
				const pre = doc.createRange();
				pre.selectNodeContents( editable );
				pre.setEnd( range.endContainer, range.endOffset );
				lastCharOffset = pre.toString().length;
				lastEditable = editable;
			} catch ( e ) {
				// DOM mutations between reading the selection and
				// creating the range can cause InvalidStateError.
				// Clear stale state so we never restore a wrong offset.
				lastCharOffset = null;
				lastEditable = null;
			}
		}

		/**
		 * Walk text nodes to place the caret at a given character offset.
		 * If offset exceeds total text length, clamps to the end of the
		 * last text node so the cursor doesn't fall back to position 0.
		 *
		 * @param {Element} editable The contenteditable element.
		 * @param {number}  offset   Character offset to place the caret at.
		 */
		function setCharOffset( editable, offset ) {
			if ( ! editable.isConnected ) {
				return;
			}

			try {
				const win = getWindow();
				const doc = getDoc();
				const walker = doc.createTreeWalker(
					editable,
					win.NodeFilter.SHOW_TEXT
				);
				let remaining = offset;
				let lastTextNode = null;
				while ( walker.nextNode() ) {
					lastTextNode = walker.currentNode;
					if ( remaining <= lastTextNode.length ) {
						const range = doc.createRange();
						range.setStart( lastTextNode, remaining );
						range.collapse( true );
						const sel = win.getSelection();
						sel.removeAllRanges();
						sel.addRange( range );
						return;
					}
					remaining -= lastTextNode.length;
				}
				// Offset exceeded text length — clamp to end.
				if ( lastTextNode ) {
					const range = doc.createRange();
					range.setStart( lastTextNode, lastTextNode.length );
					range.collapse( true );
					const sel = win.getSelection();
					sel.removeAllRanges();
					sel.addRange( range );
				}
			} catch ( e ) {
				// DOM likely changed between keydown and rAF.
			}
		}

		function handleKeyDown( event ) {
			if ( event.key !== 'Escape' ) {
				return;
			}

			// Only act when focus is inside the link control popover.
			const doc = getDoc();
			if (
				! doc.activeElement?.closest( '.block-editor-link-control' )
			) {
				return;
			}

			if ( lastCharOffset === null || ! lastEditable ) {
				return;
			}

			// Capture values now — subsequent selectionchange events
			// (fired when focus returns to the contenteditable at
			// position 0) must not overwrite what we restore.
			const offset = lastCharOffset;
			const editable = lastEditable;

			// Use rAF so we run after all synchronous + microtask work
			// from the Escape handler chain (popover close, focus
			// transfer, rich-text onFocus, queued handleSelectionChange).
			rafId = getWindow().requestAnimationFrame( () => {
				rafId = null;
				setCharOffset( editable, offset );
			} );
		}

		// Capture phase so we read state BEFORE the popover's
		// own Escape handler fires.
		document.addEventListener( 'keydown', handleKeyDown, true );
		document.addEventListener( 'selectionchange', handleSelectionChange );
		return () => {
			document.removeEventListener( 'keydown', handleKeyDown, true );
			document.removeEventListener(
				'selectionchange',
				handleSelectionChange
			);
			if ( rafId !== null ) {
				getWindow().cancelAnimationFrame( rafId );
			}
		};
	}, [] );

	return <span ref={ ref } style={ { display: 'none' } } />;
}
