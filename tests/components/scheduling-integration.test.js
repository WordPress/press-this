/**
 * Scheduling Integration Tests
 *
 * Cross-cutting integration tests for the post-scheduling feature.
 * Verifies the full workflow from UI through data threading to save handler,
 * filling gaps not covered by the individual unit test files.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Scheduling Integration', () => {
	let headerContent;
	let editorContent;
	let appContent;

	beforeAll( () => {
		headerContent = fs.readFileSync(
			path.resolve( __dirname, '../../src/components/Header.js' ),
			'utf8'
		);
		editorContent = fs.readFileSync(
			path.resolve(
				__dirname,
				'../../src/components/PressThisEditor.js'
			),
			'utf8'
		);
		appContent = fs.readFileSync(
			path.resolve( __dirname, '../../src/App.js' ),
			'utf8'
		);
	} );

	test( 'full scheduling workflow: menu item -> popover -> date selection -> confirm -> REST request -> snackbar', () => {
		// 1. Schedule MenuItem exists and opens the popover.
		expect( headerContent ).toMatch( /setIsScheduleOpen\(\s*true\s*\)/ );

		// 2. DateTimePicker is rendered in the popover with onChange wired to setScheduleDate.
		expect( headerContent ).toMatch(
			/DateTimePicker[\s\S]*?onChange=\{\s*setScheduleDate\s*\}/
		);

		// 3. Confirmation button calls handleScheduleConfirm.
		expect( headerContent ).toMatch(
			/onClick=\{[\s\S]*?handleScheduleConfirm/
		);

		// 4. handleScheduleConfirm calls onSave('future', { date: scheduleDate }).
		expect( headerContent ).toMatch(
			/onSave\(\s*'future'\s*,\s*\{\s*date:\s*scheduleDate\s*\}\s*\)/
		);

		// 5. App.js wires onSave to saveState.handleSave from PressThisEditor.
		expect( appContent ).toMatch( /onSave=\{\s*saveState\.handleSave\s*\}/ );

		// 6. PressThisEditor's handleSave includes date in the REST body.
		expect( editorContent ).toMatch( /date:\s*options\.date/ );

		// 7. On success with no redirect and 'future' status, snackbar is shown.
		expect( editorContent ).toMatch(
			/status\s*===\s*'future'\s*&&\s*options\.date/
		);
		expect( editorContent ).toMatch( /Post scheduled for %s/ );
	} );

	test( 'post saved with future status does not trigger a redirect', () => {
		// The save handler checks result.redirect first, and the future status
		// branch is in an 'else if' -- meaning it only runs when there is NO redirect.
		// This ensures scheduled posts stay in Press This instead of redirecting.

		// Verify the 'else if' chain: redirect check followed by future status check.
		expect( editorContent ).toMatch(
			/if\s*\(\s*result\.redirect\s*\)\s*\{[\s\S]*?\}\s*else\s+if\s*\(\s*status\s*===\s*'future'/
		);

		// The future branch shows a snackbar instead of redirecting.
		expect( editorContent ).toMatch(
			/status\s*===\s*'future'[\s\S]*?setNotice\(\s*\{[\s\S]*?status:\s*'success'/
		);

		// Verify that performSafeRedirect is NOT called in the future branch --
		// it only appears in the redirect branch.
		const futureBlock = editorContent.match(
			/else\s+if\s*\(\s*status\s*===\s*'future'\s*&&\s*options\.date\s*\)\s*\{([\s\S]*?)\}\s*else\s*\{/
		);
		expect( futureBlock ).not.toBeNull();
		expect( futureBlock[ 1 ] ).not.toContain( 'performSafeRedirect' );
	} );

	test( 'Schedule menu item is hidden when canPublish is false', () => {
		// The Schedule MenuGroup is wrapped in a conditional on capabilities.canPublish.
		// Verify the conditional rendering pattern wraps the MenuGroup containing Schedule.
		expect( headerContent ).toMatch(
			/capabilities\.canPublish\s*&&\s*\(\s*\n?\s*<MenuGroup>/
		);

		// Verify the Schedule/Reschedule label is inside that conditional block.
		const conditionalMatch = headerContent.match(
			/capabilities\.canPublish\s*&&\s*\(([\s\S]*?)<\/MenuGroup>/
		);
		expect( conditionalMatch ).not.toBeNull();
		expect( conditionalMatch[ 1 ] ).toContain( 'scheduleMenuLabel' );
	} );

	test( 'snackbar shows correctly formatted date with timezone', () => {
		// formatScheduleDate function exists and uses Intl.DateTimeFormat.
		expect( editorContent ).toMatch(
			/function\s+formatScheduleDate\s*\(\s*dateString\s*,\s*timezone\s*\)/
		);

		// It passes the timezone to Intl.DateTimeFormat options.
		expect( editorContent ).toMatch(
			/options\.timeZone\s*=\s*timezone/
		);

		// It uses timeZoneName: 'short' to include timezone abbreviation.
		expect( editorContent ).toMatch(
			/timeZoneName:\s*'short'/
		);

		// The formatted result is used in the snackbar message via sprintf.
		expect( editorContent ).toMatch(
			/sprintf\(\s*\n?\s*\/\*[\s\S]*?\*\/\s*\n?\s*__\(\s*'Post scheduled for %s\.'/
		);
	} );

	test( 'date exactly at the 1-minute buffer threshold is treated as not-future', () => {
		// The isFutureDate function uses a strict greater-than comparison with ONE_MINUTE.
		// It now accepts a tz parameter to compare in the site timezone.
		const isFutureFn = headerContent.match(
			/function\s+isFutureDate\s*\(\s*dateString\s*,\s*tz\s*\)\s*\{([\s\S]*?)\n\}/
		);
		expect( isFutureFn ).not.toBeNull();

		const fnBody = isFutureFn[ 1 ];

		// Uses getCurrentDateInTimezone for current time reference instead of Date.now().
		expect( fnBody ).toContain( 'getCurrentDateInTimezone' );

		// Computes difference as selectedMs - nowMs.
		expect( fnBody ).toMatch( /selectedMs\s*-\s*nowMs/ );

		// Uses strict greater-than with ONE_MINUTE (not >=).
		// This means a date exactly ONE_MINUTE from now returns false (not future).
		expect( fnBody ).toMatch( />\s*ONE_MINUTE/ );
		expect( fnBody ).not.toMatch( />=\s*ONE_MINUTE/ );
	} );

	test( 'popover re-opens cleanly after a previous schedule action', () => {
		// After handleScheduleConfirm, the popover is closed.
		expect( headerContent ).toMatch(
			/handleScheduleConfirm[\s\S]*?setIsScheduleOpen\(\s*false\s*\)/
		);

		// When the Schedule menu item is clicked again, the date resets
		// to either the post's scheduled date or the current time.
		const menuItemClick = headerContent.match(
			/setIsScheduleOpen\(\s*true\s*\)[\s\S]*?setScheduleDate\(/
		);
		expect( menuItemClick ).not.toBeNull();

		// The date is freshly computed via getCurrentDateInTimezone on re-open
		// (not stale from the previous session).
		expect( headerContent ).toMatch(
			/setScheduleDate\(\s*\n?\s*postStatus\s*===\s*'future'\s*&&\s*postDate[\s\S]*?getCurrentDateInTimezone/
		);
	} );

	test( 'DateTimePicker defaults to current date/time on first open', () => {
		// The scheduleDate state initializer calls getCurrentDateInTimezone
		// when there is no existing scheduled post.
		expect( headerContent ).toMatch(
			/useState\(\s*\(\)\s*=>\s*\{[\s\S]*?getCurrentDateInTimezone\(\s*timezone\s*\)/
		);

		// getCurrentDateInTimezone uses Intl.DateTimeFormat with the site timezone.
		expect( headerContent ).toMatch(
			/function\s+getCurrentDateInTimezone\s*\(\s*tz\s*\)/
		);

		// It formats in ISO 8601 pattern (YYYY-MM-DDTHH:MM:SS).
		expect( headerContent ).toMatch(
			/get\(\s*'year'\s*\)[\s\S]*?get\(\s*'month'\s*\)[\s\S]*?get\(\s*'day'\s*\)/
		);

		// DateTimePicker receives scheduleDate as currentDate.
		expect( headerContent ).toMatch(
			/DateTimePicker[\s\S]*?currentDate=\{\s*scheduleDate\s*\}/
		);
	} );

	test( 'post status updates in App.js after scheduling', () => {
		// App.js maintains postStatus and postDate as React state.
		expect( appContent ).toMatch( /\[\s*postStatus\s*,\s*setPostStatus\s*\]/ );
		expect( appContent ).toMatch( /\[\s*postDate\s*,\s*setPostDate\s*\]/ );

		// App.js passes onPostStatusChange callback to PressThisEditor.
		expect( appContent ).toMatch(
			/onPostStatusChange=\{\s*handlePostStatusChange\s*\}/
		);

		// App.js passes postStatus and postDate to Header from state (not static data).
		expect( appContent ).toMatch( /postStatus=\{\s*postStatus\s*\}/ );
		expect( appContent ).toMatch( /postDate=\{\s*postDate\s*\}/ );

		// PressThisEditor calls onPostStatusChange after a successful future save.
		expect( editorContent ).toMatch( /onPostStatusChange\(/ );
	} );

	test( 'schedule popover has accessible aria-label', () => {
		// The Popover should have an aria-label for accessibility.
		expect( headerContent ).toMatch(
			/Popover[\s\S]*?aria-label=\{\s*__\(\s*'Schedule post'/
		);
	} );

	test( 'snackbar message uses sprintf for translatable formatting', () => {
		// The snackbar message should use sprintf with __() instead of a template literal.
		expect( editorContent ).toContain( 'sprintf' );
		expect( editorContent ).toMatch(
			/import\s*\{[^}]*sprintf[^}]*\}\s*from\s*'@wordpress\/i18n'/
		);
		expect( editorContent ).toMatch(
			/sprintf\(\s*\n?\s*\/\*[\s\S]*?\*\/\s*\n?\s*__\(\s*'Post scheduled for %s\.'/
		);
	} );

	test( 'formatScheduleDate uses browser default locale', () => {
		// formatScheduleDate should use undefined (browser default) instead of 'en-US'.
		expect( editorContent ).toMatch(
			/new\s+Intl\.DateTimeFormat\(\s*undefined\s*,/
		);
		// It should NOT hardcode 'en-US'.
		const formatFn = editorContent.match(
			/function\s+formatScheduleDate[\s\S]*?\n\}/
		);
		expect( formatFn ).not.toBeNull();
		expect( formatFn[ 0 ] ).not.toMatch( /DateTimeFormat\(\s*'en-US'/ );
	} );
} );
