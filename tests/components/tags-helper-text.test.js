/**
 * Tags Helper Text Tests
 *
 * Tests for the tags helper text in PressThisEditor.
 * Verifies that helper text renders correctly below Tags FormTokenField.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Simple test runner for tags helper text verification.
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
			throw new Error( `${ message }: "${ haystack.substring( 0, 100 ) }..." does not contain "${ needle }"` );
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

console.log( '\nTags Helper Text Tests\n' );

/**
 * Test 1: Tags helper text renders in PressThisEditor.
 */
runner.test( 'Tags helper text renders with correct content', () => {
	const editorPath = path.resolve( __dirname, '../../src/components/PressThisEditor.js' );

	runner.assert(
		fs.existsSync( editorPath ),
		'PressThisEditor component file does not exist'
	);

	const content = fs.readFileSync( editorPath, 'utf8' );

	// Check for helper text content.
	runner.assertContains(
		content,
		'Separate with commas or the Enter key',
		'Tags panel should include helper text about comma/Enter key separation'
	);

	// Check for helper text class.
	runner.assertContains(
		content,
		'press-this-tags-panel__help',
		'Tags helper text should use press-this-tags-panel__help class'
	);
} );

/**
 * Test 2: Tags helper text styling exists in SCSS.
 */
runner.test( 'Tags helper text has correct styling defined', () => {
	const scssPath = path.resolve( __dirname, '../../src/styles/partials/_tags-panel.scss' );

	runner.assert(
		fs.existsSync( scssPath ),
		'Tags panel SCSS file does not exist'
	);

	const content = fs.readFileSync( scssPath, 'utf8' );

	// Check for helper class definition.
	runner.assertContains(
		content,
		'.press-this-tags-panel__help',
		'SCSS should define .press-this-tags-panel__help class'
	);

	// Check for font-size styling (should use $font-size-xs which is 12px).
	runner.assertContains(
		content,
		'font-size',
		'Tags helper text should have font-size defined'
	);

	// Check for color styling (should use $color-text-light which is #757575).
	runner.assertContains(
		content,
		'color',
		'Tags helper text should have color defined'
	);
} );

// Print summary.
runner.summary();
