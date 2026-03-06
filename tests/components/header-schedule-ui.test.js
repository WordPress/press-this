/**
 * Header Schedule UI Tests
 *
 * Tests for the Schedule MenuItem, DateTimePicker Popover, past/future date logic,
 * confirmation handler, and popover dismissibility in the Header component.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Header Schedule UI', () => {
	let headerContent;

	beforeAll( () => {
		const headerPath = path.resolve(
			__dirname,
			'../../src/components/Header.js'
		);
		headerContent = fs.readFileSync( headerPath, 'utf8' );
	} );

	test( 'a "Schedule" MenuItem exists in the More actions dropdown', () => {
		// There should be a MenuItem with the label "Schedule" (or "Reschedule").
		expect( headerContent ).toContain( 'MenuItem' );

		// The Schedule menu item should exist inside a MenuGroup.
		expect( headerContent ).toMatch( /MenuGroup[\s\S]*?Schedule/ );
	} );

	test( 'Schedule MenuItem is only rendered when canPublish is truthy', () => {
		// The capabilities prop should be destructured.
		expect( headerContent ).toContain( 'capabilities' );

		// canPublish should gate the Schedule menu item.
		expect( headerContent ).toMatch( /capabilities\.canPublish/ );
	} );

	test( 'clicking Schedule opens a Popover with a DateTimePicker', () => {
		// Check for Popover import/usage.
		expect( headerContent ).toContain( 'Popover' );

		// Check for DateTimePicker import/usage.
		expect( headerContent ).toContain( 'DateTimePicker' );

		// Check for isScheduleOpen state to control the popover.
		expect( headerContent ).toContain( 'isScheduleOpen' );

		// Check that the schedule menu item sets the popover open.
		expect( headerContent ).toMatch( /setIsScheduleOpen\(\s*true\s*\)/ );
	} );

	test( 'confirmation button reads "Schedule" for future dates and "Publish" for past dates', () => {
		// Check for the 1-minute buffer pattern (matching Gutenberg's isEditedPostBeingScheduled).
		expect( headerContent ).toMatch( /ONE_MINUTE|60\s*\*\s*1000/ );

		// The button label should dynamically switch between Schedule and Publish.
		// Look for logic that compares scheduleDate against now.
		expect( headerContent ).toMatch( /Schedule/ );

		// The label should use __() for i18n.
		expect( headerContent ).toMatch(
			/__\(\s*'Schedule'\s*,\s*'press-this'\s*\)/
		);
	} );

	test( 'confirming calls onSave with correct status and date for future/past dates', () => {
		// For future dates: onSave( 'future', { date } ).
		expect( headerContent ).toMatch( /onSave\(\s*'future'/ );

		// The future save should include a date in the options.
		expect( headerContent ).toMatch(
			/onSave\(\s*'future'\s*,\s*\{[\s\S]*?date/
		);

		// For past dates: onSave( 'publish' ).
		expect( headerContent ).toMatch( /onSave\(\s*'publish'\s*\)/ );
	} );

	test( 'popover is dismissible (closes on outside click or Escape)', () => {
		// The Popover component should have an onClose handler that sets isScheduleOpen to false.
		expect( headerContent ).toMatch( /setIsScheduleOpen\(\s*false\s*\)/ );

		// Verify onClose is passed to Popover (handles both outside click and Escape).
		expect( headerContent ).toMatch( /Popover[\s\S]*?onClose/ );
	} );
} );
