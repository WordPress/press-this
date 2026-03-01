/**
 * Block Transform Keyboard Shortcuts
 *
 * Registers keyboard shortcuts for transforming blocks between types.
 * Mirrors the behavior of @wordpress/block-library's internal
 * BlockKeyboardShortcuts component, which Press This doesn't render
 * since it uses BlockEditorProvider directly.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import {
	useShortcut,
	store as keyboardShortcutsStore,
} from '@wordpress/keyboard-shortcuts';
import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';
import { store as blockEditorStore } from '@wordpress/block-editor';

/**
 * Register all block transform shortcuts and bind their handlers.
 *
 * Shortcuts registered:
 * - Access+1 through Access+6: Transform paragraph/heading to heading level 1-6
 * - Access+0 (and Access+7 alias): Transform heading back to paragraph
 * - Access+Q: Toggle between paragraph and quote
 *
 * @return {null} This component renders nothing.
 */
export default function BlockTransformShortcuts() {
	const { registerShortcut } = useDispatch( keyboardShortcutsStore );
	const { replaceBlocks } = useDispatch( blockEditorStore );
	const {
		getBlockName,
		getSelectedBlockClientId,
		getBlockAttributes,
		getBlock,
	} = useSelect( blockEditorStore );

	/**
	 * Transform the selected block between paragraph and heading.
	 *
	 * @param {Event}  event Keyboard event.
	 * @param {number} level Heading level (1-6), or 0 for paragraph.
	 */
	const handleHeadingTransform = ( event, level ) => {
		event.preventDefault();

		const currentClientId = getSelectedBlockClientId();
		if ( currentClientId === null ) {
			return;
		}

		const blockName = getBlockName( currentClientId );
		const isParagraph = blockName === 'core/paragraph';
		const isHeading = blockName === 'core/heading';

		if ( ! isParagraph && ! isHeading ) {
			return;
		}

		const attributes = getBlockAttributes( currentClientId );

		// Avoid unnecessary transform to the same type/level.
		if (
			( isParagraph && level === 0 ) ||
			( isHeading && attributes.level === level )
		) {
			return;
		}

		const destinationBlockName =
			level === 0 ? 'core/paragraph' : 'core/heading';

		const newAttributes = {
			content: attributes.content,
		};

		if ( destinationBlockName === 'core/heading' ) {
			newAttributes.level = level;
		}

		// Preserve text alignment.
		const sourceTextAlign =
			attributes.textAlign || attributes.style?.typography?.textAlign;
		if ( sourceTextAlign ) {
			newAttributes.style = {
				typography: {
					textAlign: sourceTextAlign,
				},
			};
		}

		replaceBlocks(
			currentClientId,
			createBlock( destinationBlockName, newAttributes )
		);
	};

	/**
	 * Toggle the selected block between paragraph and quote.
	 *
	 * @param {Event} event Keyboard event.
	 */
	const handleQuoteToggle = ( event ) => {
		event.preventDefault();

		const currentClientId = getSelectedBlockClientId();
		if ( currentClientId === null ) {
			return;
		}

		const blockName = getBlockName( currentClientId );

		if ( blockName === 'core/paragraph' ) {
			const attributes = getBlockAttributes( currentClientId );
			// Paragraph -> Quote: wrap content as an inner paragraph block.
			replaceBlocks(
				currentClientId,
				createBlock( 'core/quote', {}, [
					createBlock( 'core/paragraph', {
						content: attributes.content,
					} ),
				] )
			);
		} else if ( blockName === 'core/quote' ) {
			// Quote -> Paragraph(s): extract inner blocks.
			// Modern quote blocks use inner blocks for content.
			const quoteBlock = getBlock( currentClientId );
			const innerBlocks = quoteBlock?.innerBlocks || [];

			if ( innerBlocks.length > 0 ) {
				// Replace the quote with its inner blocks directly.
				const replacementBlocks = innerBlocks.map( ( inner ) =>
					createBlock( inner.name, { ...inner.attributes } )
				);
				replaceBlocks( currentClientId, replacementBlocks );
			} else {
				// Fallback for older quote format using value attribute.
				const attributes = getBlockAttributes( currentClientId );
				replaceBlocks(
					currentClientId,
					createBlock( 'core/paragraph', {
						content: attributes.value || '',
					} )
				);
			}
		}
	};

	// Register shortcut metadata.
	useEffect( () => {
		registerShortcut( {
			name: 'press-this/transform-heading-to-paragraph',
			category: 'block-library',
			description: __( 'Transform heading to paragraph.', 'press-this' ),
			keyCombination: {
				modifier: 'access',
				character: '0',
			},
			aliases: [
				{
					modifier: 'access',
					character: '7',
				},
			],
		} );

		[ 1, 2, 3, 4, 5, 6 ].forEach( ( level ) => {
			registerShortcut( {
				name: `press-this/transform-paragraph-to-heading-${ level }`,
				category: 'block-library',
				description: __(
					'Transform paragraph to heading.',
					'press-this'
				),
				keyCombination: {
					modifier: 'access',
					character: `${ level }`,
				},
			} );
		} );

		registerShortcut( {
			name: 'press-this/transform-quote-toggle',
			category: 'block-library',
			description: __(
				'Toggle between paragraph and quote.',
				'press-this'
			),
			keyCombination: {
				modifier: 'access',
				character: 'q',
			},
		} );
	}, [ registerShortcut ] );

	// Bind shortcut handlers.
	useShortcut( 'press-this/transform-heading-to-paragraph', ( event ) =>
		handleHeadingTransform( event, 0 )
	);
	useShortcut( 'press-this/transform-paragraph-to-heading-1', ( event ) =>
		handleHeadingTransform( event, 1 )
	);
	useShortcut( 'press-this/transform-paragraph-to-heading-2', ( event ) =>
		handleHeadingTransform( event, 2 )
	);
	useShortcut( 'press-this/transform-paragraph-to-heading-3', ( event ) =>
		handleHeadingTransform( event, 3 )
	);
	useShortcut( 'press-this/transform-paragraph-to-heading-4', ( event ) =>
		handleHeadingTransform( event, 4 )
	);
	useShortcut( 'press-this/transform-paragraph-to-heading-5', ( event ) =>
		handleHeadingTransform( event, 5 )
	);
	useShortcut( 'press-this/transform-paragraph-to-heading-6', ( event ) =>
		handleHeadingTransform( event, 6 )
	);
	useShortcut( 'press-this/transform-quote-toggle', handleQuoteToggle );

	return null;
}
