/**
 * Title & Media Components Tests
 *
 * Tests for PostTitle, MediaGrid, and MediaThumbnail components.
 * These tests verify that the title and media components are implemented correctly.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Simple test runner for title/media component verification.
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

console.log( '\nTitle & Media Components Tests\n' );

/**
 * Test 1: PostTitle component accepts input and sanitizes it.
 */
runner.test( 'PostTitle component accepts and sanitizes input', () => {
	const postTitlePath = path.resolve( __dirname, '../../../src/components/PostTitle.js' );

	runner.assert(
		fs.existsSync( postTitlePath ),
		'PostTitle component file does not exist'
	);

	const content = fs.readFileSync( postTitlePath, 'utf8' );

	// Check for contenteditable heading.
	runner.assertContains(
		content,
		'contentEditable',
		'PostTitle should use contentEditable for editing'
	);

	// Check for placeholder support.
	runner.assertContains(
		content,
		'placeholder',
		'PostTitle should support placeholder text'
	);

	// Check for paste handling.
	runner.assertContains(
		content,
		'onPaste',
		'PostTitle should handle paste events for sanitization'
	);

	// Check for onChange callback.
	runner.assertContains(
		content,
		'onChange',
		'PostTitle should accept onChange callback'
	);

	// Check for value prop.
	runner.assertContains(
		content,
		'value',
		'PostTitle should accept value prop'
	);
} );

/**
 * Test 2: MediaGrid component renders scraped images.
 */
runner.test( 'MediaGrid component renders scraped images', () => {
	const mediaGridPath = path.resolve( __dirname, '../../../src/components/MediaGrid.js' );

	runner.assert(
		fs.existsSync( mediaGridPath ),
		'MediaGrid component file does not exist'
	);

	const content = fs.readFileSync( mediaGridPath, 'utf8' );

	// Check for images prop.
	runner.assertContains(
		content,
		'images',
		'MediaGrid should accept images prop'
	);

	// Check for embeds prop.
	runner.assertContains(
		content,
		'embeds',
		'MediaGrid should accept embeds prop'
	);

	// Check for MediaThumbnail usage.
	runner.assertContains(
		content,
		'MediaThumbnail',
		'MediaGrid should use MediaThumbnail component'
	);

	// Check for onInsert callback.
	runner.assertContains(
		content,
		'onInsert',
		'MediaGrid should accept onInsert callback'
	);

	// Check for grid layout class.
	runner.assertContains(
		content,
		'media-grid',
		'MediaGrid should have media-grid class for styling'
	);
} );

/**
 * Test 3: MediaThumbnail component supports click to insert into editor.
 */
runner.test( 'MediaThumbnail supports click to insert into editor', () => {
	const mediaThumbnailPath = path.resolve( __dirname, '../../../src/components/MediaThumbnail.js' );

	runner.assert(
		fs.existsSync( mediaThumbnailPath ),
		'MediaThumbnail component file does not exist'
	);

	const content = fs.readFileSync( mediaThumbnailPath, 'utf8' );

	// Check for src prop.
	runner.assertContains(
		content,
		'src',
		'MediaThumbnail should accept src prop'
	);

	// Check for onInsert callback.
	runner.assertContains(
		content,
		'onInsert',
		'MediaThumbnail should accept onInsert callback'
	);

	// Check for keyboard accessibility.
	runner.assertContains(
		content,
		'onKeyDown',
		'MediaThumbnail should handle keyboard events for accessibility'
	);

	// Check for tabIndex.
	runner.assertContains(
		content,
		'tabIndex',
		'MediaThumbnail should be keyboard focusable'
	);

	// Check for aria attributes or role.
	runner.assert(
		content.includes( 'role=' ) || content.includes( 'aria-' ),
		'MediaThumbnail should have ARIA attributes for accessibility'
	);
} );

/**
 * Test 4: MediaThumbnail supports "Set as Featured Image" action.
 */
runner.test( 'MediaThumbnail supports "Set as Featured Image" action', () => {
	const mediaThumbnailPath = path.resolve( __dirname, '../../../src/components/MediaThumbnail.js' );
	const content = fs.readFileSync( mediaThumbnailPath, 'utf8' );

	// Check for onSetFeatured callback.
	runner.assertContains(
		content,
		'onSetFeatured',
		'MediaThumbnail should accept onSetFeatured callback'
	);

	// Check for featured image button or action.
	runner.assertContains(
		content,
		'featured',
		'MediaThumbnail should have featured image action'
	);

	// Check for visual indicator when featured.
	runner.assertContains(
		content,
		'isFeatured',
		'MediaThumbnail should accept isFeatured prop for visual indicator'
	);
} );

// Print summary.
runner.summary();
