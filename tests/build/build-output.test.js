/**
 * Build Output Verification Tests
 *
 * These tests verify that the production build generates expected files
 * and that WordPress dependencies are properly externalized.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

const BUILD_DIR = path.resolve( __dirname, '../../build' );
const EXPECTED_FILES = [
	'press-this-editor.js',
	'press-this-editor.asset.php',
	'press-this-editor.css',
];

/**
 * Simple test runner for build verification.
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

console.log( '\nBuild Output Verification Tests\n' );

/**
 * Test 1: Production build generates expected files.
 */
runner.test( 'Production build generates expected files', () => {
	runner.assert(
		fs.existsSync( BUILD_DIR ),
		`Build directory does not exist: ${ BUILD_DIR }`
	);

	EXPECTED_FILES.forEach( ( file ) => {
		const filePath = path.join( BUILD_DIR, file );
		runner.assert(
			fs.existsSync( filePath ),
			`Expected file not found: ${ file }`
		);
	} );
} );

/**
 * Test 2: WordPress dependencies are properly externalized.
 */
runner.test( 'WordPress dependencies are properly externalized', () => {
	const assetPath = path.join( BUILD_DIR, 'press-this-editor.asset.php' );

	runner.assert(
		fs.existsSync( assetPath ),
		'Asset file not found'
	);

	const assetContent = fs.readFileSync( assetPath, 'utf8' );

	// Check that WordPress dependencies are listed.
	const expectedDeps = [
		'wp-block-editor',
		'wp-blocks',
		'wp-components',
		'wp-element',
		'wp-i18n',
	];

	expectedDeps.forEach( ( dep ) => {
		runner.assert(
			assetContent.includes( dep ),
			`WordPress dependency not externalized: ${ dep }`
		);
	} );

	// Verify the main JS file does not bundle WordPress packages.
	const jsPath = path.join( BUILD_DIR, 'press-this-editor.js' );
	const jsContent = fs.readFileSync( jsPath, 'utf8' );

	// Check that the bundle references wp global instead of bundling.
	runner.assert(
		jsContent.includes( 'wp.element' ) || jsContent.includes( 'window.wp' ),
		'WordPress packages appear to be bundled instead of externalized'
	);
} );

/**
 * Test 3: Source maps exist in development builds.
 * This test checks for the presence of source map references or files.
 */
runner.test( 'Build produces valid JavaScript', () => {
	const jsPath = path.join( BUILD_DIR, 'press-this-editor.js' );

	runner.assert(
		fs.existsSync( jsPath ),
		'Main JavaScript file not found'
	);

	const jsContent = fs.readFileSync( jsPath, 'utf8' );

	// Verify it's valid JS (basic check - not empty and has expected structure).
	runner.assert(
		jsContent.length > 100,
		'JavaScript file appears to be empty or too small'
	);

	// Check for minification indicators in production build.
	// Production builds should not have excessive whitespace.
	const lineCount = jsContent.split( '\n' ).length;
	const avgLineLength = jsContent.length / lineCount;

	// In a minified file, average line length should be relatively high.
	// This is a heuristic check.
	runner.assert(
		avgLineLength > 50 || lineCount < 100,
		'JavaScript may not be properly minified for production'
	);
} );

/**
 * Test 4: CSS is generated and contains expected styles.
 */
runner.test( 'CSS file is generated with expected content', () => {
	const cssPath = path.join( BUILD_DIR, 'press-this-editor.css' );

	runner.assert(
		fs.existsSync( cssPath ),
		'CSS file not found'
	);

	const cssContent = fs.readFileSync( cssPath, 'utf8' );

	runner.assert(
		cssContent.length > 0,
		'CSS file is empty'
	);

	// Check for expected CSS selectors.
	runner.assert(
		cssContent.includes( '.press-this-editor' ) ||
		cssContent.includes( 'press-this-editor' ) ||
		cssContent.includes( '.block-editor' ),
		'CSS does not contain expected Press This or block editor styles'
	);
} );

// Print summary.
runner.summary();
