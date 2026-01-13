/**
 * Sidebar Restructure Tests
 *
 * Tests for Task Group 4: Sidebar Restructure (REQ-004).
 * Verifies that publish section is removed from sidebar and panels are in correct order.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Simple test runner for sidebar restructure verification.
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

	summary() {
		console.log( '\n-------------------' );
		console.log( `Tests: ${ this.passed } passed, ${ this.failed } failed` );

		if ( this.failed > 0 ) {
			process.exit( 1 );
		}
	}
}

const runner = new TestRunner();

console.log( '\nSidebar Restructure Tests\n' );

/**
 * Test 1: Publish section is NOT rendered in PressThisEditor sidebar.
 */
runner.test( 'Publish section is NOT rendered in sidebar', () => {
	const editorPath = path.resolve( __dirname, '../../../src/components/PressThisEditor.js' );
	const content = fs.readFileSync( editorPath, 'utf8' );

	// Check that publish-section class is not in the sidebar JSX.
	runner.assertNotContains(
		content,
		'press-this-editor__publish-section',
		'PressThisEditor should not have publish-section in sidebar'
	);

	// Check that publish-actions class is not in the sidebar JSX.
	runner.assertNotContains(
		content,
		'press-this-editor__publish-actions',
		'PressThisEditor should not have publish-actions in sidebar'
	);
} );

/**
 * Test 2: Sidebar panels render in correct order.
 * Order: Block Inspector, Scraped Media, Featured Image, Format, Categories, Tags
 */
runner.test( 'Sidebar panels render in correct order', () => {
	const editorPath = path.resolve( __dirname, '../../../src/components/PressThisEditor.js' );
	const content = fs.readFileSync( editorPath, 'utf8' );

	// Find the sidebar content section.
	const sidebarMatch = content.match( /press-this-editor__sidebar-content[\s\S]*?<\/Panel>/m );
	runner.assert( sidebarMatch, 'Should have sidebar content section with Panel' );

	const sidebarContent = sidebarMatch[ 0 ];

	// Get positions of each panel component in the sidebar.
	const blockInspectorPos = sidebarContent.indexOf( 'SidebarBlockInspector' );
	const scrapedMediaPos = sidebarContent.indexOf( 'ScrapedMediaPanel' );
	const featuredImagePos = sidebarContent.indexOf( 'FeaturedImagePanel' );
	const formatPos = sidebarContent.indexOf( "title={ __( 'Format'" );
	const categoriesPos = sidebarContent.indexOf( "title={ __( 'Categories'" );
	const tagsPos = sidebarContent.indexOf( "title={ __( 'Tags'" );

	// Verify all panels exist.
	runner.assert( blockInspectorPos > -1, 'SidebarBlockInspector should exist in sidebar' );
	runner.assert( scrapedMediaPos > -1, 'ScrapedMediaPanel should exist in sidebar' );
	runner.assert( featuredImagePos > -1, 'FeaturedImagePanel should exist in sidebar' );
	runner.assert( formatPos > -1, 'Format panel should exist in sidebar' );
	runner.assert( categoriesPos > -1, 'Categories panel should exist in sidebar' );
	runner.assert( tagsPos > -1, 'Tags panel should exist in sidebar' );

	// Verify order: Block Inspector < Scraped Media < Featured Image < Format < Categories < Tags.
	runner.assert( blockInspectorPos < scrapedMediaPos, 'Block Inspector should come before Scraped Media' );
	runner.assert( scrapedMediaPos < featuredImagePos, 'Scraped Media should come before Featured Image' );
	runner.assert( featuredImagePos < formatPos, 'Featured Image should come before Format' );
	runner.assert( formatPos < categoriesPos, 'Format should come before Categories' );
	runner.assert( categoriesPos < tagsPos, 'Categories should come before Tags' );
} );

/**
 * Test 3: Publish section CSS has been cleaned up from main.scss.
 */
runner.test( 'Publish section CSS removed from main.scss', () => {
	const mainScssPath = path.resolve( __dirname, '../../../src/styles/main.scss' );
	const content = fs.readFileSync( mainScssPath, 'utf8' );

	// Check that publish-section CSS class is removed.
	runner.assertNotContains(
		content,
		'.press-this-editor__publish-section',
		'main.scss should not have publish-section styles'
	);

	// Check that publish-actions CSS class is removed.
	runner.assertNotContains(
		content,
		'.press-this-editor__publish-actions',
		'main.scss should not have publish-actions styles'
	);
} );

/**
 * Test 4: Mobile responsiveness styles are maintained for sidebar.
 */
runner.test( 'Mobile responsiveness styles maintained for sidebar', () => {
	const mainScssPath = path.resolve( __dirname, '../../../src/styles/main.scss' );
	const content = fs.readFileSync( mainScssPath, 'utf8' );

	// Check that sidebar has mobile breakpoint styles.
	runner.assertContains(
		content,
		'press-this-editor__sidebar',
		'main.scss should have sidebar styles'
	);

	// Check for mobile breakpoint (782px is WordPress admin mobile breakpoint).
	runner.assertContains(
		content,
		'max-width: 782px',
		'main.scss should have mobile breakpoint for sidebar responsiveness'
	);

	// Check for transform/transition for mobile slide-in behavior.
	runner.assertContains(
		content,
		'transform: translateX',
		'main.scss should have transform for mobile sidebar animation'
	);

	// Check for is-open state.
	runner.assertContains(
		content,
		'is-open',
		'main.scss should have is-open state for sidebar visibility toggle'
	);
} );

// Print summary.
runner.summary();
