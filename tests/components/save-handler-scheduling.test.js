/**
 * Save Handler Scheduling Tests
 *
 * Behavioral tests for the formatScheduleDate utility function in PressThisEditor.
 * Verifies date formatting, timezone label appending, and error handling.
 *
 * @package press-this
 */

import { formatScheduleDate } from '../../src/components/PressThisEditor';

// Mock all @wordpress/* dependencies so the module loads without React/DOM.
jest.mock( '@wordpress/element', () => ( {
	useMemo: ( fn ) => fn(),
	useCallback: ( fn ) => fn,
	useState: ( init ) => [ typeof init === 'function' ? init() : init, jest.fn() ],
	useEffect: jest.fn(),
	useRef: ( val ) => ( { current: val } ),
} ) );

jest.mock( '@wordpress/data', () => ( {
	useSelect: jest.fn( () => false ),
	useDispatch: jest.fn( () => ( {} ) ),
} ) );

jest.mock( '@wordpress/blocks', () => ( {
	parse: jest.fn( () => [] ),
	registerCoreBlocks: jest.fn(),
} ) );

jest.mock( '@wordpress/block-library', () => ( {
	registerCoreBlocks: jest.fn(),
} ) );

jest.mock( '@wordpress/block-editor', () => ( {
	BlockEditorProvider: 'BlockEditorProvider',
	BlockList: 'BlockList',
	BlockTools: 'BlockTools',
	WritingFlow: 'WritingFlow',
	ObserveTyping: 'ObserveTyping',
	BlockEditorKeyboardShortcuts: { Register: 'Register' },
	BlockToolbar: 'BlockToolbar',
	BlockInspector: 'BlockInspector',
	Inserter: 'Inserter',
	store: { name: 'core/block-editor' },
} ) );

jest.mock( '@wordpress/components', () => ( {
	SlotFillProvider: 'SlotFillProvider',
	Popover: Object.assign( () => null, { Slot: 'Slot' } ),
	Button: 'Button',
	Spinner: 'Spinner',
	Snackbar: 'Snackbar',
	Panel: 'Panel',
	PanelBody: 'PanelBody',
	FormTokenField: 'FormTokenField',
} ) );

jest.mock( '@wordpress/i18n', () => ( {
	__: ( text ) => text,
	sprintf: ( fmt, ...args ) => {
		let result = fmt;
		args.forEach( ( arg ) => {
			result = result.replace( '%s', arg );
		} );
		return result;
	},
} ) );

// Mock internal component imports to prevent cascading dependency issues.
jest.mock( '../../src/components/BlockTransformShortcuts', () => 'BlockTransformShortcuts' );
jest.mock( '../../src/components/ScrapedMediaPanel', () => 'ScrapedMediaPanel' );
jest.mock( '../../src/components/FeaturedImagePanel', () => 'FeaturedImagePanel' );
jest.mock( '../../src/components/CategoryPanel', () => 'CategoryPanel' );

describe( 'formatScheduleDate', () => {
	test( 'formats a naive ISO datetime into a human-readable string', () => {
		const result = formatScheduleDate( '2026-06-15T14:30:00', '' );
		// Verify date components are present (locale-agnostic).
		expect( result ).toMatch( /15/ );
		expect( result ).toMatch( /2026/ );
		expect( result ).toMatch( /2:30/ );
	} );

	test( 'appends timezone identifier when provided', () => {
		const result = formatScheduleDate( '2026-06-15T14:30:00', 'America/New_York' );
		expect( result ).toContain( 'America/New_York' );
	} );

	test( 'appends fixed-offset timezone string', () => {
		const result = formatScheduleDate( '2026-06-15T14:30:00', 'UTC+2' );
		expect( result ).toContain( 'UTC+2' );
	} );

	test( 'does not append timezone when empty', () => {
		const result = formatScheduleDate( '2026-06-15T14:30:00', '' );
		// Should not have trailing whitespace from empty timezone.
		expect( result ).toBe( result.trim() );
	} );

	test( 'returns the raw string for unparseable input', () => {
		const result = formatScheduleDate( 'not-a-date', 'UTC' );
		expect( result ).toBe( 'not-a-date' );
	} );

	test( 'handles space separator in datetime', () => {
		const result = formatScheduleDate( '2026-06-15 14:30:00', '' );
		expect( result ).toMatch( /15/ );
		expect( result ).toMatch( /2026/ );
	} );

	test( 'formats correctly for different months', () => {
		// Locale-agnostic: verify numeric day/year components differ.
		const jan = formatScheduleDate( '2026-01-05T09:00:00', '' );
		expect( jan ).toMatch( /2026/ );
		expect( jan ).toMatch( /5/ );

		const dec = formatScheduleDate( '2026-12-25T18:00:00', '' );
		expect( dec ).toMatch( /2026/ );
		expect( dec ).toMatch( /25/ );
	} );
} );
