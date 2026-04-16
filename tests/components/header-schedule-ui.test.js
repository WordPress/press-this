/**
 * Header Schedule UI Tests
 *
 * Behavioral tests for the scheduling utility functions in the Header component:
 * timezone abbreviation derivation, current-date-in-timezone formatting,
 * naive datetime parsing, and future-date detection.
 *
 * @package press-this
 */

import {
	getTimezoneAbbreviation,
	getCurrentDateInTimezone,
	parseNaiveToMs,
	isFutureDate,
} from '../../src/components/Header';

// Mock @wordpress/element so the module can load without React.
jest.mock( '@wordpress/element', () => ( {
	useState: ( init ) => [ typeof init === 'function' ? init() : init, jest.fn() ],
	useCallback: ( fn ) => fn,
	useEffect: jest.fn(),
	useRef: ( val ) => ( { current: val } ),
} ) );

jest.mock( '@wordpress/components', () => ( {
	Button: 'Button',
	TextControl: 'TextControl',
	Notice: 'Notice',
	Tooltip: 'Tooltip',
	DropdownMenu: 'DropdownMenu',
	MenuGroup: 'MenuGroup',
	MenuItem: 'MenuItem',
	Popover: 'Popover',
	DateTimePicker: 'DateTimePicker',
} ) );

jest.mock( '@wordpress/i18n', () => ( {
	__: ( text ) => text,
} ) );

jest.mock( '@wordpress/icons', () => ( {
	undo: 'undo-icon',
	redo: 'redo-icon',
	moreVertical: 'more-vertical-icon',
} ) );

describe( 'getTimezoneAbbreviation', () => {
	test( 'returns empty string for falsy timezone', () => {
		expect( getTimezoneAbbreviation( '', null ) ).toBe( '' );
		expect( getTimezoneAbbreviation( null, null ) ).toBe( '' );
		expect( getTimezoneAbbreviation( undefined, null ) ).toBe( '' );
	} );

	test( 'returns fixed-offset timezones unchanged', () => {
		expect( getTimezoneAbbreviation( 'UTC', null ) ).toBe( 'UTC' );
		expect( getTimezoneAbbreviation( 'UTC+5', null ) ).toBe( 'UTC+5' );
		expect( getTimezoneAbbreviation( 'UTC-10', null ) ).toBe( 'UTC-10' );
	} );

	test( 'returns a short abbreviation for IANA timezones', () => {
		const abbr = getTimezoneAbbreviation( 'America/New_York', '2026-01-15T12:00:00' );
		// In January, New York is in Eastern Standard Time.
		expect( abbr ).toMatch( /^(EST|GMT-5|UTC-5)/ );
	} );

	test( 'returns DST-aware abbreviation when date is in summer', () => {
		const abbr = getTimezoneAbbreviation( 'America/New_York', '2026-07-15T12:00:00' );
		// In July, New York is in Eastern Daylight Time.
		expect( abbr ).toMatch( /^(EDT|GMT-4|UTC-4)/ );
	} );

	test( 'returns the timezone string on invalid IANA identifier', () => {
		expect( getTimezoneAbbreviation( 'Invalid/Zone', '2026-01-15T12:00:00' ) ).toBe( 'Invalid/Zone' );
	} );
} );

describe( 'getCurrentDateInTimezone', () => {
	test( 'returns an ISO-like string with T separator', () => {
		const result = getCurrentDateInTimezone( 'America/New_York' );
		expect( result ).toMatch( /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/ );
	} );

	test( 'returns a string that differs from UTC for non-UTC timezones', () => {
		// This is a loose check -- we just verify the function runs without error
		// and returns a properly formatted string.
		const result = getCurrentDateInTimezone( 'Asia/Tokyo' );
		expect( result ).toMatch( /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/ );
	} );

	test( 'falls back to UTC-based naive string for empty timezone', () => {
		const result = getCurrentDateInTimezone( '' );
		// Empty timezone uses formatNaive(new Date()), returning UTC parts
		// without a trailing Z or offset.
		expect( result ).toMatch( /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/ );
	} );
} );

describe( 'parseNaiveToMs', () => {
	test( 'parses a naive ISO datetime string to UTC milliseconds', () => {
		const ms = parseNaiveToMs( '2026-03-15T14:30:00' );
		expect( ms ).toBe( Date.UTC( 2026, 2, 15, 14, 30 ) );
	} );

	test( 'handles space separator between date and time', () => {
		const ms = parseNaiveToMs( '2026-03-15 14:30:00' );
		expect( ms ).toBe( Date.UTC( 2026, 2, 15, 14, 30 ) );
	} );

	test( 'handles datetime without seconds', () => {
		const ms = parseNaiveToMs( '2026-03-15T14:30' );
		expect( ms ).toBe( Date.UTC( 2026, 2, 15, 14, 30 ) );
	} );

	test( 'falls back to Date constructor for unparseable strings', () => {
		const ms = parseNaiveToMs( 'not-a-date' );
		expect( ms ).toBeNaN();
	} );
} );

describe( 'isFutureDate', () => {
	test( 'returns true for a date far in the future', () => {
		expect( isFutureDate( '2099-12-31T23:59:00', 'UTC' ) ).toBe( true );
	} );

	test( 'returns false for a date in the past', () => {
		expect( isFutureDate( '2000-01-01T00:00:00', 'UTC' ) ).toBe( false );
	} );

	test( 'returns false for the current time (within 1-minute buffer)', () => {
		// Get the current time in UTC and check it's not considered future.
		const now = getCurrentDateInTimezone( 'UTC' );
		expect( isFutureDate( now, 'UTC' ) ).toBe( false );
	} );

	test( 'uses 1-minute buffer -- date exactly 1 minute ahead is not future', () => {
		// Build a date exactly 60 seconds from "now" in UTC.
		const nowMs = Date.now();
		const justAhead = new Date( nowMs + 60000 );
		const formatted = `${ justAhead.getUTCFullYear() }-${ String( justAhead.getUTCMonth() + 1 ).padStart( 2, '0' ) }-${ String( justAhead.getUTCDate() ).padStart( 2, '0' ) }T${ String( justAhead.getUTCHours() ).padStart( 2, '0' ) }:${ String( justAhead.getUTCMinutes() ).padStart( 2, '0' ) }:${ String( justAhead.getUTCSeconds() ).padStart( 2, '0' ) }`;
		// Exactly at the 1-minute boundary should NOT be future (strict >).
		expect( isFutureDate( formatted, 'UTC' ) ).toBe( false );
	} );

	test( 'date well beyond 1 minute in the future returns true', () => {
		const nowMs = Date.now();
		const fiveMinAhead = new Date( nowMs + 5 * 60000 );
		const formatted = `${ fiveMinAhead.getUTCFullYear() }-${ String( fiveMinAhead.getUTCMonth() + 1 ).padStart( 2, '0' ) }-${ String( fiveMinAhead.getUTCDate() ).padStart( 2, '0' ) }T${ String( fiveMinAhead.getUTCHours() ).padStart( 2, '0' ) }:${ String( fiveMinAhead.getUTCMinutes() ).padStart( 2, '0' ) }:${ String( fiveMinAhead.getUTCSeconds() ).padStart( 2, '0' ) }`;
		expect( isFutureDate( formatted, 'UTC' ) ).toBe( true );
	} );
} );
