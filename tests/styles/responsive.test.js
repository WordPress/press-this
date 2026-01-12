/**
 * Responsive Design Tests
 *
 * Tests for responsive behavior at different viewport sizes.
 * Verifies CSS media queries and responsive layout patterns.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Simple test runner for responsive behavior verification.
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

console.log( '\nResponsive Design Tests\n' );

/**
 * Read all SCSS files from the styles directory and partials.
 * This allows testing against the modular SCSS structure.
 */
function readAllScssFiles() {
	const stylesDir = path.resolve( __dirname, '../../src/styles' );
	const partialsDir = path.resolve( stylesDir, 'partials' );
	let combinedContent = '';

	// Read main.scss.
	try {
		combinedContent += fs.readFileSync( path.join( stylesDir, 'main.scss' ), 'utf8' );
	} catch ( error ) {
		console.warn( 'Warning: Could not read main.scss' );
	}

	// Read all partials.
	try {
		const partialFiles = fs.readdirSync( partialsDir );
		for ( const file of partialFiles ) {
			if ( file.endsWith( '.scss' ) ) {
				combinedContent += '\n' + fs.readFileSync( path.join( partialsDir, file ), 'utf8' );
			}
		}
	} catch ( error ) {
		console.warn( 'Warning: Could not read partials directory' );
	}

	return combinedContent;
}

// Read all SCSS content.
const scssContent = readAllScssFiles();

if ( ! scssContent ) {
	console.error( 'Failed to read SCSS files' );
	process.exit( 1 );
}

// Read the built CSS file for compiled output verification.
const builtCssPath = path.resolve( __dirname, '../../build/press-this-editor.css' );
let cssContent = '';

try {
	cssContent = fs.readFileSync( builtCssPath, 'utf8' );
} catch ( error ) {
	console.warn( 'Warning: Could not read built CSS file. Some tests may be skipped.' );
}

/**
 * Test 1: Mobile viewport breakpoint (320px) styles exist.
 *
 * Verifies that styles for very small mobile screens (320px) are defined.
 */
runner.test( 'Mobile viewport (320px) breakpoint styles exist', () => {
	// Check SCSS has 320px breakpoint variable defined.
	runner.assertContains(
		scssContent,
		'$breakpoint-small: 320px',
		'SCSS should define $breakpoint-small at 320px'
	);

	// Check for mobile-specific media queries (using variable or direct).
	const hasMobileQuery = scssContent.includes( '$breakpoint-small' ) ||
		scssContent.includes( 'max-width: 320px' );
	runner.assert(
		hasMobileQuery,
		'SCSS should have mobile breakpoint styles'
	);

	// Verify mobile adjustments for admin bar.
	runner.assertContains(
		scssContent,
		'.press-this-admin-bar',
		'Admin bar styles should be defined'
	);

	// Verify mobile adjustments for media grid (2 columns on smallest screens).
	runner.assertContains(
		scssContent,
		'grid-template-columns: repeat(2, 1fr)',
		'Media grid should show 2 columns on smallest screens'
	);
} );

/**
 * Test 2: Tablet viewport breakpoint (600px-900px) styles exist.
 *
 * Verifies that styles for tablet screens are properly defined.
 */
runner.test( 'Tablet viewport (600px-900px) breakpoint styles exist', () => {
	// Check SCSS has breakpoint variables defined.
	runner.assertContains(
		scssContent,
		'$breakpoint-mobile: 600px',
		'SCSS should define $breakpoint-mobile at 600px'
	);

	runner.assertContains(
		scssContent,
		'$breakpoint-tablet: 900px',
		'SCSS should define $breakpoint-tablet at 900px'
	);

	// Check for tablet-specific media queries.
	runner.assertContains(
		scssContent,
		'$breakpoint-tablet',
		'SCSS should use $breakpoint-tablet in styles'
	);

	// Verify tablet adjustments for media grid (4 columns).
	runner.assertContains(
		scssContent,
		'grid-template-columns: repeat(4, 1fr)',
		'Media grid should show 4 columns on tablet screens'
	);
} );

/**
 * Test 3: Desktop viewport (900px+) base styles exist.
 *
 * Verifies that desktop/default styles are properly defined.
 */
runner.test( 'Desktop viewport (900px+) base styles exist', () => {
	// Check for desktop media grid (6 columns).
	runner.assertContains(
		scssContent,
		'grid-template-columns: repeat(6, 1fr)',
		'Media grid should show 6 columns on desktop'
	);

	// Check for proper sidebar width on desktop.
	runner.assertContains(
		scssContent,
		'$options-panel-width: 320px',
		'Options panel width variable should be defined'
	);

	// Verify desktop has editor styles.
	runner.assertContains(
		scssContent,
		'.press-this-editor',
		'Editor styles should be defined'
	);

	// Verify proper spacing on desktop.
	runner.assertContains(
		scssContent,
		'$spacing-lg: 16px',
		'Standard spacing should be 16px'
	);
} );

/**
 * Test 4: Sidebar becomes full-width on mobile.
 *
 * Verifies that the options panel takes full width on mobile screens.
 */
runner.test( 'Sidebar becomes full-width on mobile', () => {
	// Check for mobile sidebar styling.
	const hasOptionsPanel = scssContent.includes( '.press-this-options-panel' );
	const hasFullWidth = scssContent.includes( 'width: 100%' );
	const hasMobileBreakpoint = scssContent.includes( '$breakpoint-mobile' );

	runner.assert(
		hasOptionsPanel && hasFullWidth && hasMobileBreakpoint,
		'Options panel should have mobile full-width styles defined'
	);

	// Verify mobile sidebar is positioned fixed.
	runner.assertContains(
		scssContent,
		'position: fixed',
		'Options panel should be fixed positioned'
	);

	// Verify the panel has responsive mobile styling.
	runner.assertContainsRegex(
		scssContent,
		/@media\s*\(\s*max-width:\s*\$breakpoint-mobile\s*\)/,
		'SCSS should have mobile breakpoint media query'
	);
} );

// Print summary.
runner.summary();
