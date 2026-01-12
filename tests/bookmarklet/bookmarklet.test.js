/**
 * Bookmarklet Functionality Tests
 *
 * These tests verify the Press This bookmarklet correctly extracts
 * page data, filters images by dimensions, and handles various submission modes.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

const BOOKMARKLET_PATH = path.resolve( __dirname, '../../assets/bookmarklet.js' );

/**
 * Simple test runner for bookmarklet verification.
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

	summary() {
		console.log( '\n-------------------' );
		console.log( `Tests: ${ this.passed } passed, ${ this.failed } failed` );

		if ( this.failed > 0 ) {
			process.exit( 1 );
		}
	}
}

const runner = new TestRunner();

console.log( '\nBookmarklet Functionality Tests\n' );

// Load the bookmarklet source code for analysis.
let bookmarkletSource = '';
try {
	bookmarkletSource = fs.readFileSync( BOOKMARKLET_PATH, 'utf8' );
} catch ( error ) {
	console.error( 'Could not load bookmarklet source:', error.message );
	process.exit( 1 );
}

/**
 * Test 1: Bookmarklet creates POST form for data submission.
 *
 * Verifies that the bookmarklet creates a form element and sets it to
 * use POST method for submitting scraped data to the Press This app.
 */
runner.test( 'POST form submission pattern exists', () => {
	// Check that form is created.
	runner.assert(
		bookmarkletSource.includes( "document.createElement( 'form' )" ) ||
		bookmarkletSource.includes( "document.createElement('form')" ),
		'Bookmarklet should create a form element'
	);

	// Check that POST method is set.
	runner.assert(
		bookmarkletSource.includes( "'method', 'POST'" ) ||
		bookmarkletSource.includes( '"method", "POST"' ) ||
		bookmarkletSource.includes( "'POST'" ),
		'Form should use POST method'
	);

	// Check for hidden input creation pattern.
	runner.assert(
		bookmarkletSource.includes( "type = 'hidden'" ) ||
		bookmarkletSource.includes( 'type="hidden"' ) ||
		bookmarkletSource.includes( "input.type = 'hidden'" ),
		'Bookmarklet should create hidden inputs for data'
	);

	// Check that form is submitted.
	runner.assert(
		bookmarkletSource.includes( 'form.submit()' ) ||
		bookmarkletSource.includes( '.submit()' ),
		'Form should be submitted'
	);
} );

/**
 * Test 2: Legacy GET fallback for HTTPS-to-HTTP scenarios.
 *
 * When the source page is HTTPS and Press This URL is HTTP,
 * POST won't work due to mixed content restrictions.
 * The bookmarklet should fall back to GET parameters.
 */
runner.test( 'Legacy GET fallback for HTTPS-to-HTTP scenarios', () => {
	// Check for canPost flag that determines submission method.
	runner.assert(
		bookmarkletSource.includes( 'canPost' ),
		'Bookmarklet should have canPost flag for submission method detection'
	);

	// Check for HTTPS detection.
	runner.assert(
		bookmarkletSource.includes( 'https:' ) ||
		bookmarkletSource.includes( '/^https/' ),
		'Bookmarklet should detect HTTPS protocol'
	);

	// Check for GET parameter fallback (u=, t=, s= params).
	runner.assert(
		bookmarkletSource.includes( "'&u='" ) ||
		bookmarkletSource.includes( '"&u="' ) ||
		bookmarkletSource.includes( '&u=' ),
		'Bookmarklet should support URL parameter (u=) for GET fallback'
	);

	runner.assert(
		bookmarkletSource.includes( "'&t='" ) ||
		bookmarkletSource.includes( '"&t="' ) ||
		bookmarkletSource.includes( '&t=' ),
		'Bookmarklet should support title parameter (t=) for GET fallback'
	);

	runner.assert(
		bookmarkletSource.includes( "'&s='" ) ||
		bookmarkletSource.includes( '"&s="' ) ||
		bookmarkletSource.includes( '&s=' ),
		'Bookmarklet should support selection parameter (s=) for GET fallback'
	);

	// Check for window.open fallback when canPost is false.
	runner.assert(
		bookmarkletSource.includes( 'window.open' ),
		'Bookmarklet should use window.open for fallback'
	);
} );

/**
 * Test 3: Image dimension filtering.
 *
 * The bookmarklet should skip images that are too small to be meaningful content:
 * - Width less than 256 pixels
 * - Height less than 128 pixels
 * This filters out avatars, icons, buttons, and tracking pixels.
 */
runner.test( 'Image dimension filtering (skip < 256w or < 128h)', () => {
	// Check for width threshold.
	runner.assert(
		bookmarkletSource.includes( '256' ) ||
		bookmarkletSource.includes( 'width < 256' ) ||
		bookmarkletSource.includes( 'img.width' ),
		'Bookmarklet should check image width (256px threshold)'
	);

	// Check for height threshold.
	runner.assert(
		bookmarkletSource.includes( '128' ) ||
		bookmarkletSource.includes( 'height < 128' ) ||
		bookmarkletSource.includes( 'img.height' ),
		'Bookmarklet should check image height (128px threshold)'
	);

	// Check for avatar filtering.
	runner.assert(
		bookmarkletSource.includes( 'avatar' ),
		'Bookmarklet should filter out avatar images'
	);

	// Check for image iteration.
	runner.assert(
		bookmarkletSource.includes( "getElementsByTagName( 'img' )" ) ||
		bookmarkletSource.includes( "getElementsByTagName('img')" ),
		'Bookmarklet should iterate through images'
	);

	// Check for _images[] POST data.
	runner.assert(
		bookmarkletSource.includes( '_images[]' ) ||
		bookmarkletSource.includes( "'_images[]'" ),
		'Bookmarklet should collect images as _images[] array'
	);
} );

/**
 * Test 4: Meta tag extraction.
 *
 * The bookmarklet should extract meta tags from the page head,
 * including Open Graph, Twitter Card, and standard meta tags.
 */
runner.test( 'Meta tag extraction for title, description, and social data', () => {
	// Check for meta tag iteration.
	runner.assert(
		bookmarkletSource.includes( "getElementsByTagName( 'meta' )" ) ||
		bookmarkletSource.includes( "getElementsByTagName('meta')" ),
		'Bookmarklet should get meta tags from page'
	);

	// Check for name attribute extraction.
	runner.assert(
		bookmarkletSource.includes( "getAttribute( 'name' )" ) ||
		bookmarkletSource.includes( "getAttribute('name')" ),
		'Bookmarklet should extract meta name attribute'
	);

	// Check for property attribute extraction (Open Graph).
	runner.assert(
		bookmarkletSource.includes( "getAttribute( 'property' )" ) ||
		bookmarkletSource.includes( "getAttribute('property')" ),
		'Bookmarklet should extract meta property attribute (for Open Graph)'
	);

	// Check for content attribute extraction.
	runner.assert(
		bookmarkletSource.includes( "getAttribute( 'content' )" ) ||
		bookmarkletSource.includes( "getAttribute('content')" ),
		'Bookmarklet should extract meta content attribute'
	);

	// Check for _meta[] POST data.
	runner.assert(
		bookmarkletSource.includes( '_meta[' ) ||
		bookmarkletSource.includes( "'_meta['" ),
		'Bookmarklet should collect meta data as _meta[] object'
	);

	// Check for link tag extraction (canonical, shortlink).
	runner.assert(
		bookmarkletSource.includes( "getElementsByTagName( 'link' )" ) ||
		bookmarkletSource.includes( "getElementsByTagName('link')" ),
		'Bookmarklet should get link tags for canonical URL'
	);

	// Check for canonical/shortlink detection.
	runner.assert(
		bookmarkletSource.includes( 'canonical' ) ||
		bookmarkletSource.includes( 'shortlink' ),
		'Bookmarklet should extract canonical or shortlink URLs'
	);
} );

/**
 * Test 5: Bookmarklet includes version number in POST data.
 *
 * The bookmarklet should include a version number (pt_version) that is sent
 * as POST data to detect outdated bookmarklets and prompt users to upgrade.
 */
runner.test( 'Bookmarklet version detection mechanism', () => {
	// Check for PT_VERSION constant.
	runner.assert(
		bookmarkletSource.includes( 'PT_VERSION' ),
		'Bookmarklet should define PT_VERSION constant'
	);

	// Check for pt_version POST parameter.
	runner.assert(
		bookmarkletSource.includes( 'pt_version' ),
		'Bookmarklet should send pt_version in POST data'
	);

	// Verify version is sent via add() function.
	runner.assert(
		bookmarkletSource.includes( "add( 'pt_version'" ) ||
		bookmarkletSource.includes( "add('pt_version'" ),
		'Bookmarklet should use add() to send version'
	);
} );

/**
 * Test 6: Window sizing calculations.
 *
 * The bookmarklet should calculate appropriate popup window dimensions
 * based on the user's screen size (70% width, 90% height with min/max bounds).
 */
runner.test( 'Window sizing calculations for popup', () => {
	// Check for viewport width detection.
	runner.assert(
		bookmarkletSource.includes( 'outerWidth' ) ||
		bookmarkletSource.includes( 'clientWidth' ),
		'Bookmarklet should detect viewport width'
	);

	// Check for viewport height detection.
	runner.assert(
		bookmarkletSource.includes( 'outerHeight' ) ||
		bookmarkletSource.includes( 'clientHeight' ),
		'Bookmarklet should detect viewport height'
	);

	// Check for width calculation (70% = 0.7).
	runner.assert(
		bookmarkletSource.includes( '0.7' ) ||
		bookmarkletSource.includes( '* 0.7' ) ||
		bookmarkletSource.includes( '.7' ),
		'Bookmarklet should calculate 70% of viewport width'
	);

	// Check for height calculation (90% = 0.9).
	runner.assert(
		bookmarkletSource.includes( '0.9' ) ||
		bookmarkletSource.includes( '* 0.9' ) ||
		bookmarkletSource.includes( '.9' ),
		'Bookmarklet should calculate 90% of viewport height'
	);

	// Check for default dimensions.
	runner.assert(
		bookmarkletSource.includes( '600' ) && bookmarkletSource.includes( '700' ),
		'Bookmarklet should have default dimensions (600x700)'
	);

	// Check for window features.
	runner.assert(
		bookmarkletSource.includes( 'resizable' ) &&
		bookmarkletSource.includes( 'scrollbars' ),
		'Bookmarklet popup should be resizable with scrollbars'
	);
} );

/**
 * Test 7: Embed/iframe extraction.
 *
 * The bookmarklet should extract iframe sources for potential embeds
 * (YouTube, Vimeo, etc.).
 */
runner.test( 'Embed/iframe extraction for video content', () => {
	// Check for iframe iteration.
	runner.assert(
		bookmarkletSource.includes( "getElementsByTagName( 'iframe' )" ) ||
		bookmarkletSource.includes( "getElementsByTagName('iframe')" ),
		'Bookmarklet should get iframes from page'
	);

	// Check for _embeds[] POST data.
	runner.assert(
		bookmarkletSource.includes( '_embeds[]' ) ||
		bookmarkletSource.includes( "'_embeds[]'" ),
		'Bookmarklet should collect embeds as _embeds[] array'
	);
} );

/**
 * Test 8: Text selection capture.
 *
 * The bookmarklet should capture any text the user has selected on the page
 * to use as a quote in the Press This post.
 */
runner.test( 'Text selection capture', () => {
	// Check for selection API usage.
	runner.assert(
		bookmarkletSource.includes( 'getSelection' ) ||
		bookmarkletSource.includes( 'selection' ),
		'Bookmarklet should capture text selection'
	);

	// Check for selection as 's' parameter.
	runner.assert(
		bookmarkletSource.includes( "'s'" ) ||
		bookmarkletSource.includes( '"s"' ) ||
		bookmarkletSource.includes( "add( 's'" ),
		'Bookmarklet should send selection as "s" parameter'
	);
} );

/**
 * Test 9: Enhanced data extraction - Open Graph video metadata.
 *
 * The bookmarklet should extract Open Graph video metadata (og:video)
 * for better embed detection.
 */
runner.test( 'Enhanced data extraction - Open Graph video', () => {
	// Check for og:video detection.
	runner.assert(
		bookmarkletSource.includes( 'og:video' ),
		'Bookmarklet should detect og:video metadata'
	);

	// Check for _og_video POST data.
	runner.assert(
		bookmarkletSource.includes( '_og_video[]' ) ||
		bookmarkletSource.includes( "'_og_video[]'" ),
		'Bookmarklet should collect og:video URLs'
	);
} );

/**
 * Test 10: Enhanced data extraction - JSON-LD structured data.
 *
 * The bookmarklet should extract JSON-LD structured data when available
 * for improved content extraction.
 */
runner.test( 'Enhanced data extraction - JSON-LD structured data', () => {
	// Check for JSON-LD script tag query.
	runner.assert(
		bookmarkletSource.includes( 'application/ld+json' ),
		'Bookmarklet should query for JSON-LD scripts'
	);

	// Check for JSON.parse usage.
	runner.assert(
		bookmarkletSource.includes( 'JSON.parse' ),
		'Bookmarklet should parse JSON-LD content'
	);

	// Check for _jsonld POST data.
	runner.assert(
		bookmarkletSource.includes( '_jsonld[' ) ||
		bookmarkletSource.includes( "'_jsonld['" ),
		'Bookmarklet should collect JSON-LD data'
	);

	// Check for VideoObject handling.
	runner.assert(
		bookmarkletSource.includes( 'VideoObject' ),
		'Bookmarklet should handle VideoObject schema type'
	);
} );

// Print summary.
runner.summary();
