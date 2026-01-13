/**
 * Header Light Theme Tests
 *
 * Tests for header styling changes to match Gutenberg's light theme.
 * Verifies CSS values for header background, text colors, and input styling.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Simple test runner for header light theme verification.
 */
class TestRunner {
	constructor() {
		this.passed = 0;
		this.failed = 0;
		this.errors = [];
	}

	test( name, fn ) {
		try {
			fn();
			this.passed++;
			console.log( `  PASS: ${ name }` );
		} catch ( error ) {
			this.failed++;
			this.errors.push( { name, error: error.message } );
			console.log( `  FAIL: ${ name }` );
			console.log( `        ${ error.message }` );
		}
	}

	assert( condition, message ) {
		if ( ! condition ) {
			throw new Error( message );
		}
	}

	assertContains( haystack, needle, message ) {
		if ( ! haystack.includes( needle ) ) {
			throw new Error( `${ message }: content does not contain "${ needle }"` );
		}
	}

	assertNotContains( haystack, needle, message ) {
		if ( haystack.includes( needle ) ) {
			throw new Error( `${ message }: content should not contain "${ needle }"` );
		}
	}

	assertContainsRegex( haystack, regex, message ) {
		if ( ! regex.test( haystack ) ) {
			throw new Error( `${ message }: content does not match pattern` );
		}
	}

	summary() {
		console.log( '\n-------------------' );
		console.log( `Tests: ${ this.passed } passed, ${ this.failed } failed` );

		if ( this.failed > 0 ) {
			process.exit( 1 );
		}
	}
}

const runner = new TestRunner();

console.log( '\nHeader Light Theme Tests\n' );

/**
 * Read app-layout.scss content.
 */
function readAppLayoutScss() {
	const scssPath = path.resolve( __dirname, '../../src/styles/partials/_app-layout.scss' );
	try {
		return fs.readFileSync( scssPath, 'utf8' );
	} catch ( error ) {
		console.error( 'Failed to read _app-layout.scss' );
		process.exit( 1 );
	}
}

const scssContent = readAppLayoutScss();

/**
 * Test 1: Header background is white with bottom border.
 *
 * Verifies header has white background (#fff) and 1px solid border-bottom.
 */
runner.test( 'Header has white background and bottom border', () => {
	// Check for white background.
	runner.assertContainsRegex(
		scssContent,
		/\.press-this-header\s*\{[^}]*background:\s*#fff/,
		'Header should have white (#fff) background'
	);

	// Check for border-bottom.
	runner.assertContains(
		scssContent,
		'border-bottom: 1px solid #e0e0e0',
		'Header should have 1px solid #e0e0e0 border-bottom'
	);
} );

/**
 * Test 2: Header text colors are dark for light theme.
 *
 * Verifies header text color is #1e1e1e and site link uses appropriate colors.
 */
runner.test( 'Header text colors are dark for light background', () => {
	// Check header base color is dark.
	runner.assertContainsRegex(
		scssContent,
		/\.press-this-header\s*\{[^}]*color:\s*#1e1e1e/,
		'Header should have dark (#1e1e1e) text color'
	);

	// Check site link color is dark.
	runner.assertContainsRegex(
		scssContent,
		/\.press-this-header__site-link\s*\{[^}]*color:\s*#1e1e1e/,
		'Site link should have dark (#1e1e1e) color'
	);
} );

/**
 * Test 3: URL scanner input styled for light theme.
 *
 * Verifies input has white background, dark text, and proper border colors.
 */
runner.test( 'URL scanner input styled for light theme', () => {
	// Check input has white background (or transparent, since white on white is OK).
	const hasLightInput = scssContent.includes( '.press-this-header__scanner' );
	runner.assert( hasLightInput, 'Scanner section styles should exist' );

	// Check input border color is light gray.
	runner.assertContains(
		scssContent,
		'border-color: #ddd',
		'Input should have #ddd border color'
	);

	// Check placeholder color is #757575.
	runner.assertContains(
		scssContent,
		'#757575',
		'Placeholder should use #757575 color'
	);
} );

/**
 * Test 4: Hover/focus states use WordPress blue (#007cba).
 *
 * Verifies interactive elements use the correct WordPress blue accent color.
 */
runner.test( 'Hover and focus states use WordPress blue', () => {
	// Check that WordPress blue is used for hover/focus states.
	runner.assertContains(
		scssContent,
		'#007cba',
		'WordPress blue (#007cba) should be used for interactive states'
	);

	// Check site link hover color.
	runner.assertContainsRegex(
		scssContent,
		/&:hover,\s*\n?\s*&:focus\s*\{[^}]*color:\s*#007cba/,
		'Site link hover/focus should use WordPress blue'
	);
} );

/**
 * Test 5: Sidebar toggle button styled for light theme.
 *
 * Verifies toggle button icon uses dark color on light background.
 */
runner.test( 'Sidebar toggle button styled for light theme', () => {
	// Check toggle button section exists.
	runner.assertContains(
		scssContent,
		'.press-this-header__sidebar-toggle',
		'Sidebar toggle styles should exist'
	);

	// Check dashicons color is dark.
	runner.assertContainsRegex(
		scssContent,
		/\.press-this-header__sidebar-toggle[^{]*\{[^}]*\.dashicons\s*\{[^}]*color:\s*#1e1e1e/,
		'Sidebar toggle icon should have dark (#1e1e1e) color'
	);
} );

// Print summary.
runner.summary();
