/**
 * Block Transform Keyboard Shortcuts Tests
 *
 * @package press-this
 */

/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import { useShortcut } from '@wordpress/keyboard-shortcuts';
import { createBlock } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import BlockTransformShortcuts from '../../src/components/BlockTransformShortcuts';

// Store sentinels for routing mock returns.
const BLOCK_EDITOR_STORE = { name: 'core/block-editor' };
const KEYBOARD_SHORTCUTS_STORE = { name: 'core/keyboard-shortcuts' };

jest.mock( '@wordpress/block-editor', () => ( {
	store: BLOCK_EDITOR_STORE,
} ) );

jest.mock( '@wordpress/keyboard-shortcuts', () => ( {
	useShortcut: jest.fn(),
	store: KEYBOARD_SHORTCUTS_STORE,
} ) );

jest.mock( '@wordpress/data', () => ( {
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	createBlock: jest.fn( ( name, attrs, innerBlocks ) => ( {
		name,
		attributes: attrs || {},
		innerBlocks: innerBlocks || [],
	} ) ),
} ) );

jest.mock( '@wordpress/element', () => ( {
	useEffect: ( fn ) => fn(),
} ) );

jest.mock( '@wordpress/i18n', () => ( {
	__: ( text ) => text,
} ) );

describe( 'BlockTransformShortcuts', () => {
	let registerShortcut;
	let replaceBlocks;
	let getSelectedBlockClientId;
	let getBlockName;
	let getBlockAttributes;
	let getBlock;

	// Captured useShortcut handlers keyed by shortcut name.
	let shortcutHandlers;

	beforeEach( () => {
		jest.clearAllMocks();

		registerShortcut = jest.fn();
		replaceBlocks = jest.fn();
		getSelectedBlockClientId = jest.fn( () => null );
		getBlockName = jest.fn();
		getBlockAttributes = jest.fn( () => ( {} ) );
		getBlock = jest.fn();

		shortcutHandlers = {};

		useDispatch.mockImplementation( ( store ) => {
			if ( store === KEYBOARD_SHORTCUTS_STORE ) {
				return { registerShortcut };
			}
			if ( store === BLOCK_EDITOR_STORE ) {
				return { replaceBlocks };
			}
			return {};
		} );

		useSelect.mockReturnValue( {
			getSelectedBlockClientId,
			getBlockName,
			getBlockAttributes,
			getBlock,
		} );

		useShortcut.mockImplementation( ( name, handler ) => {
			shortcutHandlers[ name ] = handler;
		} );
	} );

	function renderComponent() {
		BlockTransformShortcuts();
	}

	function fireShortcut( name, event ) {
		const handler = shortcutHandlers[ name ];
		expect( handler ).toBeDefined();
		handler( event || { preventDefault: jest.fn() } );
	}

	// -------------------------------------------------------------------------
	// Shortcut registration
	// -------------------------------------------------------------------------

	describe( 'Shortcut Registration', () => {
		test( 'registers heading-to-paragraph shortcut with Access+0 and Access+7 alias', () => {
			renderComponent();

			expect( registerShortcut ).toHaveBeenCalledWith(
				expect.objectContaining( {
					name: 'press-this/transform-heading-to-paragraph',
					keyCombination: { modifier: 'access', character: '0' },
					aliases: [ { modifier: 'access', character: '7' } ],
				} )
			);
		} );

		test( 'registers heading level 1-6 shortcuts', () => {
			renderComponent();

			for ( let level = 1; level <= 6; level++ ) {
				expect( registerShortcut ).toHaveBeenCalledWith(
					expect.objectContaining( {
						name: `press-this/transform-paragraph-to-heading-${ level }`,
						keyCombination: {
							modifier: 'access',
							character: `${ level }`,
						},
					} )
				);
			}
		} );

		test( 'registers quote toggle shortcut with Access+Q', () => {
			renderComponent();

			expect( registerShortcut ).toHaveBeenCalledWith(
				expect.objectContaining( {
					name: 'press-this/transform-quote-toggle',
					keyCombination: { modifier: 'access', character: 'q' },
				} )
			);
		} );

		test( 'registers exactly 8 shortcuts total', () => {
			renderComponent();

			// 1 (heading-to-paragraph) + 6 (heading levels) + 1 (quote) = 8
			expect( registerShortcut ).toHaveBeenCalledTimes( 8 );
		} );

		test( 'binds all 8 useShortcut handlers', () => {
			renderComponent();

			expect( useShortcut ).toHaveBeenCalledTimes( 8 );
			expect( Object.keys( shortcutHandlers ) ).toHaveLength( 8 );
		} );
	} );

	// -------------------------------------------------------------------------
	// Heading transform — early exits
	// -------------------------------------------------------------------------

	describe( 'Heading Transform — Early Exits', () => {
		test( 'does nothing when no block is selected', () => {
			getSelectedBlockClientId.mockReturnValue( null );
			renderComponent();

			fireShortcut( 'press-this/transform-paragraph-to-heading-1' );

			expect( replaceBlocks ).not.toHaveBeenCalled();
		} );

		test( 'does nothing for unsupported block types', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/image' );
			renderComponent();

			fireShortcut( 'press-this/transform-paragraph-to-heading-1' );

			expect( replaceBlocks ).not.toHaveBeenCalled();
		} );

		test( 'does nothing when paragraph is already selected and level is 0', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/paragraph' );
			getBlockAttributes.mockReturnValue( { content: 'Hello' } );
			renderComponent();

			fireShortcut( 'press-this/transform-heading-to-paragraph' );

			expect( replaceBlocks ).not.toHaveBeenCalled();
		} );

		test( 'does nothing when heading is already at target level', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/heading' );
			getBlockAttributes.mockReturnValue( {
				content: 'Hello',
				level: 3,
			} );
			renderComponent();

			fireShortcut( 'press-this/transform-paragraph-to-heading-3' );

			expect( replaceBlocks ).not.toHaveBeenCalled();
		} );
	} );

	// -------------------------------------------------------------------------
	// Heading transform — paragraph to heading
	// -------------------------------------------------------------------------

	describe( 'Heading Transform — Paragraph to Heading', () => {
		test( 'transforms paragraph to heading with correct level', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/paragraph' );
			getBlockAttributes.mockReturnValue( { content: 'Hello world' } );
			renderComponent();

			fireShortcut( 'press-this/transform-paragraph-to-heading-2' );

			expect( createBlock ).toHaveBeenCalledWith( 'core/heading', {
				content: 'Hello world',
				level: 2,
			} );
			expect( replaceBlocks ).toHaveBeenCalledWith(
				'block-1',
				expect.objectContaining( { name: 'core/heading' } )
			);
		} );

		test( 'transforms heading to a different heading level', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/heading' );
			getBlockAttributes.mockReturnValue( {
				content: 'Title',
				level: 2,
			} );
			renderComponent();

			fireShortcut( 'press-this/transform-paragraph-to-heading-4' );

			expect( createBlock ).toHaveBeenCalledWith( 'core/heading', {
				content: 'Title',
				level: 4,
			} );
		} );
	} );

	// -------------------------------------------------------------------------
	// Heading transform — heading to paragraph
	// -------------------------------------------------------------------------

	describe( 'Heading Transform — Heading to Paragraph', () => {
		test( 'transforms heading to paragraph', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/heading' );
			getBlockAttributes.mockReturnValue( {
				content: 'Title',
				level: 2,
			} );
			renderComponent();

			fireShortcut( 'press-this/transform-heading-to-paragraph' );

			expect( createBlock ).toHaveBeenCalledWith(
				'core/paragraph',
				expect.objectContaining( { content: 'Title' } )
			);
			// Paragraph should not have a level attribute.
			expect( createBlock.mock.calls[ 0 ][ 1 ] ).not.toHaveProperty(
				'level'
			);
		} );
	} );

	// -------------------------------------------------------------------------
	// Heading transform — alignment preservation
	// -------------------------------------------------------------------------

	describe( 'Heading Transform — Alignment Preservation', () => {
		test( 'preserves textAlign attribute', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/paragraph' );
			getBlockAttributes.mockReturnValue( {
				content: 'Centered',
				textAlign: 'center',
			} );
			renderComponent();

			fireShortcut( 'press-this/transform-paragraph-to-heading-1' );

			expect( createBlock ).toHaveBeenCalledWith(
				'core/heading',
				expect.objectContaining( {
					style: { typography: { textAlign: 'center' } },
				} )
			);
		} );

		test( 'preserves style.typography.textAlign format', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/heading' );
			getBlockAttributes.mockReturnValue( {
				content: 'Right-aligned',
				level: 2,
				style: { typography: { textAlign: 'right' } },
			} );
			renderComponent();

			fireShortcut( 'press-this/transform-heading-to-paragraph' );

			expect( createBlock ).toHaveBeenCalledWith(
				'core/paragraph',
				expect.objectContaining( {
					style: { typography: { textAlign: 'right' } },
				} )
			);
		} );

		test( 'does not add style when no alignment exists', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/paragraph' );
			getBlockAttributes.mockReturnValue( { content: 'Plain' } );
			renderComponent();

			fireShortcut( 'press-this/transform-paragraph-to-heading-1' );

			expect( createBlock.mock.calls[ 0 ][ 1 ] ).not.toHaveProperty(
				'style'
			);
		} );
	} );

	// -------------------------------------------------------------------------
	// Quote toggle — paragraph to quote
	// -------------------------------------------------------------------------

	describe( 'Quote Toggle — Paragraph to Quote', () => {
		test( 'wraps paragraph content in a quote with inner paragraph', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/paragraph' );
			getBlockAttributes.mockReturnValue( {
				content: 'Quoted text',
			} );
			renderComponent();

			fireShortcut( 'press-this/transform-quote-toggle' );

			// Inner paragraph created first.
			expect( createBlock ).toHaveBeenCalledWith( 'core/paragraph', {
				content: 'Quoted text',
			} );
			// Outer quote wraps the inner paragraph.
			expect( createBlock ).toHaveBeenCalledWith(
				'core/quote',
				{},
				expect.arrayContaining( [
					expect.objectContaining( { name: 'core/paragraph' } ),
				] )
			);
			expect( replaceBlocks ).toHaveBeenCalledWith(
				'block-1',
				expect.objectContaining( { name: 'core/quote' } )
			);
		} );
	} );

	// -------------------------------------------------------------------------
	// Quote toggle — quote to paragraphs (modern format)
	// -------------------------------------------------------------------------

	describe( 'Quote Toggle — Quote to Paragraphs (Modern)', () => {
		test( 'extracts inner blocks from quote', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/quote' );
			getBlock.mockReturnValue( {
				innerBlocks: [
					{
						name: 'core/paragraph',
						attributes: { content: 'First' },
						innerBlocks: [],
					},
					{
						name: 'core/paragraph',
						attributes: { content: 'Second' },
						innerBlocks: [],
					},
				],
			} );
			renderComponent();

			fireShortcut( 'press-this/transform-quote-toggle' );

			expect( replaceBlocks ).toHaveBeenCalledWith(
				'block-1',
				expect.arrayContaining( [
					expect.objectContaining( {
						name: 'core/paragraph',
						attributes: expect.objectContaining( {
							content: 'First',
						} ),
					} ),
					expect.objectContaining( {
						name: 'core/paragraph',
						attributes: expect.objectContaining( {
							content: 'Second',
						} ),
					} ),
				] )
			);
		} );

		test( 'preserves nested innerBlocks when unwrapping quote', () => {
			const nestedInnerBlocks = [
				{
					name: 'core/list-item',
					attributes: { content: 'item' },
					innerBlocks: [],
				},
			];
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/quote' );
			getBlock.mockReturnValue( {
				innerBlocks: [
					{
						name: 'core/list',
						attributes: {},
						innerBlocks: nestedInnerBlocks,
					},
				],
			} );
			renderComponent();

			fireShortcut( 'press-this/transform-quote-toggle' );

			// createBlock should receive the nested innerBlocks as third arg.
			expect( createBlock ).toHaveBeenCalledWith(
				'core/list',
				expect.any( Object ),
				nestedInnerBlocks
			);
		} );
	} );

	// -------------------------------------------------------------------------
	// Quote toggle — quote to paragraph (legacy format)
	// -------------------------------------------------------------------------

	describe( 'Quote Toggle — Quote to Paragraph (Legacy)', () => {
		test( 'falls back to value attribute when innerBlocks is empty', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/quote' );
			getBlock.mockReturnValue( { innerBlocks: [] } );
			getBlockAttributes.mockReturnValue( {
				value: 'Legacy quote content',
			} );
			renderComponent();

			fireShortcut( 'press-this/transform-quote-toggle' );

			expect( createBlock ).toHaveBeenCalledWith( 'core/paragraph', {
				content: 'Legacy quote content',
			} );
		} );

		test( 'uses empty string when no value attribute exists', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/quote' );
			getBlock.mockReturnValue( { innerBlocks: [] } );
			getBlockAttributes.mockReturnValue( {} );
			renderComponent();

			fireShortcut( 'press-this/transform-quote-toggle' );

			expect( createBlock ).toHaveBeenCalledWith( 'core/paragraph', {
				content: '',
			} );
		} );
	} );

	// -------------------------------------------------------------------------
	// Quote toggle — no-op for other block types
	// -------------------------------------------------------------------------

	describe( 'Quote Toggle — No-op', () => {
		test( 'does nothing for non-paragraph/quote blocks', () => {
			getSelectedBlockClientId.mockReturnValue( 'block-1' );
			getBlockName.mockReturnValue( 'core/heading' );
			renderComponent();

			fireShortcut( 'press-this/transform-quote-toggle' );

			expect( replaceBlocks ).not.toHaveBeenCalled();
		} );

		test( 'does nothing when no block is selected', () => {
			getSelectedBlockClientId.mockReturnValue( null );
			renderComponent();

			fireShortcut( 'press-this/transform-quote-toggle' );

			expect( replaceBlocks ).not.toHaveBeenCalled();
		} );
	} );
} );
