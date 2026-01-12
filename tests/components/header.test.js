/**
 * Header Components Tests
 *
 * Tests for AdminBar, ScanBar, and UpgradePrompt components.
 * These tests verify that the header components are implemented correctly.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Simple test runner for header component verification.
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

console.log( '\nHeader Components Tests\n' );

/**
 * Test 1: AdminBar component exists and renders site name.
 */
runner.test( 'AdminBar component exists and renders site name', () => {
	const adminBarPath = path.resolve( __dirname, '../../src/components/AdminBar.js' );

	runner.assert(
		fs.existsSync( adminBarPath ),
		'AdminBar component file does not exist'
	);

	const content = fs.readFileSync( adminBarPath, 'utf8' );

	// Check for site name rendering.
	runner.assertContains(
		content,
		'siteName',
		'AdminBar should accept siteName prop'
	);

	// Check for WordPress logo.
	runner.assertContains(
		content,
		'dashicons-wordpress',
		'AdminBar should render WordPress logo'
	);

	// Check for export.
	runner.assertContains(
		content,
		'export default',
		'AdminBar should be exported'
	);

	// Check for dark header color.
	runner.assertContains(
		content,
		'admin-bar',
		'AdminBar should have proper class naming'
	);
} );

/**
 * Test 2: AdminBar options toggle button exists and is functional.
 */
runner.test( 'AdminBar has options toggle button', () => {
	const adminBarPath = path.resolve( __dirname, '../../src/components/AdminBar.js' );
	const content = fs.readFileSync( adminBarPath, 'utf8' );

	// Check for options toggle.
	runner.assertContains(
		content,
		'onOptionsToggle',
		'AdminBar should accept onOptionsToggle callback prop'
	);

	// Check for button element.
	runner.assertContains(
		content,
		'button',
		'AdminBar should have a button for options toggle'
	);

	// Check for tag icon.
	runner.assertContains(
		content,
		'dashicons-tag',
		'AdminBar should have tag icon for options toggle'
	);
} );

/**
 * Test 3: UpgradePrompt component displays for legacy bookmarklet.
 */
runner.test( 'UpgradePrompt displays for legacy bookmarklet', () => {
	const upgradePath = path.resolve( __dirname, '../../src/components/UpgradePrompt.js' );

	runner.assert(
		fs.existsSync( upgradePath ),
		'UpgradePrompt component file does not exist'
	);

	const content = fs.readFileSync( upgradePath, 'utf8' );

	// Check for isLegacy prop.
	runner.assertContains(
		content,
		'isLegacy',
		'UpgradePrompt should accept isLegacy prop'
	);

	// Check for dismissible functionality.
	runner.assertContains(
		content,
		'onDismiss',
		'UpgradePrompt should have dismiss functionality'
	);

	// Check for upgrade link.
	runner.assertContains(
		content,
		'update',
		'UpgradePrompt should mention updating the bookmarklet'
	);

	// Check it returns null when not legacy.
	runner.assertContains(
		content,
		'return null',
		'UpgradePrompt should return null when not applicable'
	);
} );

/**
 * Test 4: ScanBar component exists with URL input and scan functionality.
 */
runner.test( 'ScanBar component has URL input and scan button', () => {
	const scanBarPath = path.resolve( __dirname, '../../src/components/ScanBar.js' );

	runner.assert(
		fs.existsSync( scanBarPath ),
		'ScanBar component file does not exist'
	);

	const content = fs.readFileSync( scanBarPath, 'utf8' );

	// Check for URL input.
	runner.assertContains(
		content,
		'type="url"',
		'ScanBar should have a URL input field'
	);

	// Check for scan button.
	runner.assertContains(
		content,
		'onScan',
		'ScanBar should accept onScan callback prop'
	);

	// Check for placeholder.
	runner.assertContains(
		content,
		'placeholder',
		'ScanBar should have a placeholder for the URL input'
	);

	// Check for loading state.
	runner.assertContains(
		content,
		'isLoading',
		'ScanBar should handle loading state'
	);

	// Check that it hides when URL exists.
	runner.assertContains(
		content,
		'hasUrl',
		'ScanBar should hide when URL parameter exists'
	);
} );

// Print summary.
runner.summary();
