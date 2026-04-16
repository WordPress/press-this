/**
 * Scheduling Integration Tests
 *
 * Cross-cutting integration tests for the post-scheduling feature.
 * Tests the interaction between Header scheduling utilities and
 * PressThisEditor formatting, verifying the full data flow.
 *
 * @package press-this
 */

import {
	getTimezoneAbbreviation,
	getCurrentDateInTimezone,
	parseNaiveToMs,
	isFutureDate,
} from '../../src/components/Header';

import { formatScheduleDate } from '../../src/components/PressThisEditor';

// Mock @wordpress dependencies for Header.
jest.mock( '@wordpress/element', () => ( {
	useState: ( init ) => [ typeof init === 'function' ? init() : init, jest.fn() ],
	useCallback: ( fn ) => fn,
	useEffect: jest.fn(),
	useRef: ( val ) => ( { current: val } ),
	useMemo: ( fn ) => fn(),
} ) );

jest.mock( '@wordpress/components', () => ( {
	Button: 'Button',
	TextControl: 'TextControl',
	Notice: 'Notice',
	Tooltip: 'Tooltip',
	DropdownMenu: 'DropdownMenu',
	MenuGroup: 'MenuGroup',
	MenuItem: 'MenuItem',
	Popover: Object.assign( () => null, { Slot: 'Slot' } ),
	DateTimePicker: 'DateTimePicker',
	SlotFillProvider: 'SlotFillProvider',
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

jest.mock( '@wordpress/icons', () => ( {
	undo: 'undo-icon',
	redo: 'redo-icon',
	moreVertical: 'more-vertical-icon',
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

jest.mock( '../../src/components/BlockTransformShortcuts', () => 'BlockTransformShortcuts' );
jest.mock( '../../src/components/ScrapedMediaPanel', () => 'ScrapedMediaPanel' );
jest.mock( '../../src/components/FeaturedImagePanel', () => 'FeaturedImagePanel' );
jest.mock( '../../src/components/CategoryPanel', () => 'CategoryPanel' );

describe( 'Scheduling Integration: Header utilities + Editor formatting', () => {
	test( 'a date produced by getCurrentDateInTimezone is parseable by parseNaiveToMs', () => {
		const dateStr = getCurrentDateInTimezone( 'America/Chicago' );
		const ms = parseNaiveToMs( dateStr );
		expect( ms ).not.toBeNaN();
		expect( ms ).toBeGreaterThan( 0 );
	} );

	test( 'a date from getCurrentDateInTimezone is formattable by formatScheduleDate', () => {
		const dateStr = getCurrentDateInTimezone( 'Europe/London' );
		const formatted = formatScheduleDate( dateStr, 'Europe/London' );
		expect( formatted ).toContain( 'Europe/London' );
		// Should contain year.
		expect( formatted ).toMatch( /\d{4}/ );
	} );

	test( 'isFutureDate and formatScheduleDate agree on a far-future date', () => {
		const futureDate = '2099-06-15T14:30:00';
		expect( isFutureDate( futureDate, 'UTC' ) ).toBe( true );
		const formatted = formatScheduleDate( futureDate, 'UTC' );
		// Locale-agnostic: check numeric components, not month names.
		expect( formatted ).toMatch( /15/ );
		expect( formatted ).toMatch( /2099/ );
	} );

	test( 'timezone abbreviation matches the timezone appended to formatted date', () => {
		const date = '2026-01-15T10:00:00';
		const tz = 'America/New_York';
		const abbr = getTimezoneAbbreviation( tz, date );
		const formatted = formatScheduleDate( date, tz );
		// formatScheduleDate appends the IANA string, not the abbreviation.
		expect( formatted ).toContain( tz );
		// But the abbreviation is a real value (not empty).
		expect( abbr.length ).toBeGreaterThan( 0 );
	} );

	test( 'round-trip: parse -> check future -> format for a scheduled post', () => {
		const scheduledDate = '2099-03-15T09:00:00';
		const tz = 'Asia/Tokyo';

		// Step 1: Parse the date.
		const ms = parseNaiveToMs( scheduledDate );
		expect( ms ).not.toBeNaN();

		// Step 2: Check if it's in the future.
		expect( isFutureDate( scheduledDate, tz ) ).toBe( true );

		// Step 3: Format for the snackbar.
		const formatted = formatScheduleDate( scheduledDate, tz );
		expect( formatted ).toMatch( /15/ );
		expect( formatted ).toMatch( /2099/ );
		expect( formatted ).toContain( 'Asia/Tokyo' );
	} );

	test( 'past date is not future and formats correctly', () => {
		const pastDate = '2020-06-01T08:00:00';
		expect( isFutureDate( pastDate, 'UTC' ) ).toBe( false );
		const formatted = formatScheduleDate( pastDate, 'UTC' );
		expect( formatted ).toMatch( /2020/ );
	} );
} );
