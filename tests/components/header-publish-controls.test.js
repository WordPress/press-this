/**
 * Header Publish Controls Tests
 *
 * Tests for the publish controls relocated to the header.
 * Verifies Save Draft, Publish buttons, dropdown menu, and callback handling.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Simple test runner for header publish controls verification.
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

	assertEqual( actual, expected, message ) {
		if ( actual !== expected ) {
			throw new Error( `${ message }: expected "${ expected }", got "${ actual }"` );
		}
	}

	assertContains( haystack, needle, message ) {
		if ( ! haystack.includes( needle ) ) {
			throw new Error( `${ message }: "${ haystack.substring( 0, 100 ) }..." does not contain "${ needle }"` );
		}
	}

	assertNotContains( haystack, needle, message ) {
		if ( haystack.includes( needle ) ) {
			throw new Error( `${ message }: content should not contain "${ needle }"` );
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

console.log( '\nHeader Publish Controls Tests\n' );

/**
 * Test 1: Header accepts onSave, isSaving, and publishLabel props.
 */
runner.test( 'Header accepts publish-related props', () => {
	const headerPath = path.resolve( __dirname, '../../src/components/Header.js' );
	const content = fs.readFileSync( headerPath, 'utf8' );

	// Check for onSave prop.
	runner.assertContains(
		content,
		'onSave',
		'Header should accept onSave callback prop'
	);

	// Check for isSaving prop.
	runner.assertContains(
		content,
		'isSaving',
		'Header should accept isSaving prop for loading state'
	);

	// Check for publishLabel prop.
	runner.assertContains(
		content,
		'publishLabel',
		'Header should accept publishLabel prop for button text'
	);
} );

/**
 * Test 2: Header renders publish button with primary variant.
 */
runner.test( 'Header renders Publish button with primary styling', () => {
	const headerPath = path.resolve( __dirname, '../../src/components/Header.js' );
	const content = fs.readFileSync( headerPath, 'utf8' );

	// Check for Button component import.
	runner.assertContains(
		content,
		'Button',
		'Header should import Button component'
	);

	// Check for primary variant button for publish.
	runner.assertContains(
		content,
		'variant="primary"',
		'Header should have a primary variant button for Publish'
	);

	// Check that publishLabel is used.
	runner.assertContains(
		content,
		'publishLabel',
		'Header should use publishLabel for the Publish button text'
	);
} );

/**
 * Test 3: Header renders Save Draft button.
 */
runner.test( 'Header renders Save Draft button as secondary/tertiary style', () => {
	const headerPath = path.resolve( __dirname, '../../src/components/Header.js' );
	const content = fs.readFileSync( headerPath, 'utf8' );

	// Check for Save Draft text or call.
	runner.assertContains(
		content,
		'Save Draft',
		'Header should have Save Draft option'
	);

	// Check for tertiary or link variant (secondary text style).
	runner.assert(
		content.includes( 'variant="tertiary"' ) || content.includes( 'variant="link"' ),
		'Header should have tertiary or link variant for Save Draft button'
	);
} );

/**
 * Test 4: Header has dropdown menu with "Continue in Standard Editor" option.
 */
runner.test( 'Header has dropdown menu with Continue in Standard Editor', () => {
	const headerPath = path.resolve( __dirname, '../../src/components/Header.js' );
	const content = fs.readFileSync( headerPath, 'utf8' );

	// Check for DropdownMenu import or usage.
	runner.assertContains(
		content,
		'DropdownMenu',
		'Header should use DropdownMenu component'
	);

	// Check for Continue in Standard Editor option.
	runner.assertContains(
		content,
		'Continue in Standard Editor',
		'Header should have Continue in Standard Editor menu item'
	);
} );

/**
 * Test 5: Header calls onSave with correct status parameters.
 */
runner.test( 'Header calls onSave with correct status parameters', () => {
	const headerPath = path.resolve( __dirname, '../../src/components/Header.js' );
	const content = fs.readFileSync( headerPath, 'utf8' );

	// Check for onSave('draft') call.
	runner.assertContains(
		content,
		"onSave( 'draft'",
		'Header should call onSave with draft status for Save Draft'
	);

	// Check for onSave('publish') call.
	runner.assertContains(
		content,
		"onSave( 'publish'",
		'Header should call onSave with publish status for Publish'
	);

	// Check for forceRedirect option for Continue in Standard Editor.
	runner.assertContains(
		content,
		'forceRedirect',
		'Header should pass forceRedirect option for Continue in Standard Editor'
	);
} );

/**
 * Test 6: Header actions section has correct structure and styling class.
 */
runner.test( 'Header has actions section with correct class', () => {
	const headerPath = path.resolve( __dirname, '../../src/components/Header.js' );
	const content = fs.readFileSync( headerPath, 'utf8' );

	// Check for actions container class.
	runner.assertContains(
		content,
		'press-this-header__actions',
		'Header should have press-this-header__actions container'
	);

	// Check for isBusy prop to show loading state.
	runner.assertContains(
		content,
		'isBusy',
		'Header should use isBusy for button loading state'
	);

	// Check for disabled state.
	runner.assertContains(
		content,
		'disabled',
		'Header should disable buttons when saving'
	);
} );

// Print summary.
runner.summary();
