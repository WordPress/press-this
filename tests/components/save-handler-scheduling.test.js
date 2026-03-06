/**
 * Save Handler and Data Threading Tests
 *
 * Tests for scheduling support in the save handler and timezone data threading.
 * Verifies that handleSave passes date in the REST body, the schedule-specific
 * snackbar displays correctly, timezone flows through the component tree, and
 * no redirect occurs for 'future' status.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Save Handler: scheduling support', () => {
	let editorContent;

	beforeAll( () => {
		const editorPath = path.resolve(
			__dirname,
			'../../src/components/PressThisEditor.js'
		);
		editorContent = fs.readFileSync( editorPath, 'utf8' );
	} );

	test( 'handleSave includes date in the REST request body when options.date is provided', () => {
		// The JSON.stringify body should include a date field sourced from options.date.
		expect( editorContent ).toMatch( /date:\s*options\.date/ );

		// Verify it is inside the JSON.stringify call alongside other body fields.
		const bodyMatch = editorContent.match(
			/body:\s*JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/
		);
		expect( bodyMatch ).not.toBeNull();
		expect( bodyMatch[ 1 ] ).toContain( 'date' );
	} );

	test( 'successful schedule response shows a snackbar with the formatted date', () => {
		// Check for 'future' status detection in the success handler.
		expect( editorContent ).toMatch( /status\s*===\s*'future'/ );

		// Check for Intl.DateTimeFormat usage for date formatting.
		expect( editorContent ).toContain( 'Intl.DateTimeFormat' );

		// Check for the schedule-specific snackbar message using sprintf.
		expect( editorContent ).toMatch( /Post scheduled for %s/ );
		expect( editorContent ).toMatch(
			/sprintf\(\s*\n?\s*\/\*[\s\S]*?\*\/\s*\n?\s*__\(\s*'Post scheduled for %s\.'/
		);
	} );

	test( 'no redirect occurs when status is future (response has no redirect key)', () => {
		// The existing success handler shows a notice when result.redirect is falsy.
		// For 'future' status, the server returns no redirect, so the no-redirect
		// branch executes. Verify the no-redirect branch sets a notice (not a redirect).
		expect( editorContent ).toMatch(
			/if\s*\(\s*result\.redirect\s*\)/
		);

		// The else branch (no redirect) sets a notice -- this covers 'future' status.
		expect( editorContent ).toMatch(
			/setNotice\(\s*\{[\s\S]*?status:\s*'success'/
		);
	} );
} );

describe( 'Data Threading: timezone from App to components', () => {
	let appContent;
	let editorContent;
	let headerContent;

	beforeAll( () => {
		const appPath = path.resolve( __dirname, '../../src/App.js' );
		const editorPath = path.resolve(
			__dirname,
			'../../src/components/PressThisEditor.js'
		);
		const headerPath = path.resolve(
			__dirname,
			'../../src/components/Header.js'
		);
		appContent = fs.readFileSync( appPath, 'utf8' );
		editorContent = fs.readFileSync( editorPath, 'utf8' );
		headerContent = fs.readFileSync( headerPath, 'utf8' );
	} );

	test( 'App.js reads timezone from pressThisData and threads it to PressThisEditor and Header', () => {
		// App.js reads data.timezone.
		expect( appContent ).toContain( 'data.timezone' );

		// App.js passes timezone prop to PressThisEditor.
		expect( appContent ).toMatch( /<PressThisEditor[\s\S]*?timezone/ );

		// App.js passes timezone prop to Header.
		expect( appContent ).toMatch( /<Header[\s\S]*?timezone/ );

		// PressThisEditor accepts timezone in props.
		const editorPropsMatch = editorContent.match(
			/export\s+default\s+function\s+PressThisEditor\(\s*\{([\s\S]*?)\}\s*\)/
		);
		expect( editorPropsMatch ).not.toBeNull();
		expect( editorPropsMatch[ 1 ] ).toContain( 'timezone' );

		// Header accepts timezone in props.
		const headerPropsMatch = headerContent.match(
			/export\s+default\s+function\s+Header\(\s*\{([\s\S]*?)\}\s*\)/
		);
		expect( headerPropsMatch ).not.toBeNull();
		expect( headerPropsMatch[ 1 ] ).toContain( 'timezone' );
	} );
} );
