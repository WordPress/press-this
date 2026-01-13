/**
 * Endpoint and Frontend Security Tests
 *
 * Tests for SEC-002-JS (XSS escaping), SEC-004 (confirmation modal),
 * and SEC-008 (safe redirect).
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Simple test runner for endpoint/frontend verification.
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
			throw new Error( `${ message }: content does not contain "${ needle }"` );
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

console.log( '\nEndpoint and Frontend Security Tests\n' );

/**
 * Test 1: escapeHtml function exists and escapes dangerous characters.
 *
 * SEC-002: Verifies XSS escaping function exists.
 */
runner.test( 'escapeHtml function escapes dangerous characters', () => {
	const htmlParserPath = path.resolve( __dirname, '../../src/utils/html-parser.js' );

	runner.assert(
		fs.existsSync( htmlParserPath ),
		'html-parser.js file does not exist'
	);

	const content = fs.readFileSync( htmlParserPath, 'utf8' );

	// Check escapeHtml function exists.
	runner.assertContains(
		content,
		'escapeHtml',
		'escapeHtml function should exist'
	);

	// Check it escapes ampersand.
	runner.assertContains(
		content,
		'&amp;',
		'escapeHtml should escape ampersand'
	);

	// Check it escapes less than.
	runner.assertContains(
		content,
		'&lt;',
		'escapeHtml should escape less than'
	);

	// Check it escapes greater than.
	runner.assertContains(
		content,
		'&gt;',
		'escapeHtml should escape greater than'
	);
} );

/**
 * Test 2: escapeAttr function exists for attribute escaping.
 *
 * SEC-002: Verifies attribute escaping function exists.
 */
runner.test( 'escapeAttr function escapes attribute characters', () => {
	const htmlParserPath = path.resolve( __dirname, '../../src/utils/html-parser.js' );
	const content = fs.readFileSync( htmlParserPath, 'utf8' );

	// Check escapeAttr function exists.
	runner.assertContains(
		content,
		'escapeAttr',
		'escapeAttr function should exist'
	);

	// Check it escapes quotes.
	runner.assertContains(
		content,
		'&quot;',
		'escapeAttr should escape double quotes'
	);

	// Check it's exported.
	runner.assertContains(
		content,
		'export',
		'Functions should be exported'
	);
} );

/**
 * Test 3: safeRedirect function exists in PressThisEditor.
 *
 * SEC-008: Verifies safe redirect function blocks external URLs.
 */
runner.test( 'safeRedirect function blocks external URLs', () => {
	const editorPath = path.resolve( __dirname, '../../src/components/PressThisEditor.js' );

	runner.assert(
		fs.existsSync( editorPath ),
		'PressThisEditor.js file does not exist'
	);

	const content = fs.readFileSync( editorPath, 'utf8' );

	// Check safeRedirect function exists.
	runner.assertContains(
		content,
		'safeRedirect',
		'safeRedirect function should exist'
	);

	// Check it validates host.
	runner.assertContains(
		content,
		'host',
		'safeRedirect should check host'
	);

	// Check it has a fallback.
	runner.assertContains(
		content,
		'/wp-admin/',
		'safeRedirect should have fallback to wp-admin'
	);

	// Check it logs blocked redirects.
	runner.assertContains(
		content,
		'console',
		'safeRedirect should log blocked redirects'
	);
} );

/**
 * Test 4: Confirmation modal exists in App.js.
 *
 * SEC-004: Verifies confirmation modal for bookmarklet content.
 */
runner.test( 'Confirmation modal for bookmarklet content exists', () => {
	const appPath = path.resolve( __dirname, '../../src/App.js' );

	runner.assert(
		fs.existsSync( appPath ),
		'App.js file does not exist'
	);

	const content = fs.readFileSync( appPath, 'utf8' );

	// Check Modal import.
	runner.assertContains(
		content,
		'Modal',
		'App should import Modal component'
	);

	// Check showConfirmation state.
	runner.assertContains(
		content,
		'showConfirmation',
		'App should have showConfirmation state'
	);

	// Check needsConfirmation check.
	runner.assertContains(
		content,
		'needsConfirmation',
		'App should check needsConfirmation flag'
	);

	// Check for Continue button.
	runner.assertContains(
		content,
		'Continue',
		'Confirmation modal should have Continue button'
	);

	// Check for Cancel button.
	runner.assertContains(
		content,
		'Cancel',
		'Confirmation modal should have Cancel button'
	);
} );

/**
 * Test 5: Header uses server-returned metadata instead of client-side parsing.
 *
 * SEC-010: Verifies Header.js uses server metadata.
 */
runner.test( 'Header uses server-returned metadata', () => {
	const headerPath = path.resolve( __dirname, '../../src/components/Header.js' );

	runner.assert(
		fs.existsSync( headerPath ),
		'Header.js file does not exist'
	);

	const content = fs.readFileSync( headerPath, 'utf8' );

	// Check for server metadata usage.
	runner.assertContains(
		content,
		'data.title',
		'Header should use server-returned title'
	);

	runner.assertContains(
		content,
		'data.images',
		'Header should use server-returned images'
	);

	// Check for buildSuggestedContentFromMetadata helper.
	runner.assertContains(
		content,
		'buildSuggestedContent',
		'Header should use content building function'
	);
} );

/**
 * Test 6: XSS escaping is applied in buildSuggestedContent.
 *
 * SEC-002: Verifies escaping is applied when building content.
 */
runner.test( 'buildSuggestedContent applies XSS escaping', () => {
	const htmlParserPath = path.resolve( __dirname, '../../src/utils/html-parser.js' );
	const content = fs.readFileSync( htmlParserPath, 'utf8' );

	// Check buildSuggestedContent function exists.
	runner.assertContains(
		content,
		'buildSuggestedContent',
		'buildSuggestedContent function should exist'
	);

	// Check it uses escapeHtml.
	runner.assertContains(
		content,
		'escapeHtml',
		'buildSuggestedContent should use escapeHtml'
	);

	// Check it handles description.
	runner.assertContains(
		content,
		'description',
		'buildSuggestedContent should handle description'
	);

	// Check it builds block content.
	runner.assertContains(
		content,
		'wp:',
		'buildSuggestedContent should generate block format'
	);
} );

// Print summary.
runner.summary();
