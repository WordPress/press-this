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

describe( 'Build Output Verification', () => {
	test( 'Production build generates expected files', () => {
		expect( fs.existsSync( BUILD_DIR ) ).toBe( true );

		EXPECTED_FILES.forEach( ( file ) => {
			const filePath = path.join( BUILD_DIR, file );
			expect( fs.existsSync( filePath ) ).toBe( true );
		} );
	} );

	test( 'WordPress dependencies are properly externalized', () => {
		const assetPath = path.join( BUILD_DIR, 'press-this-editor.asset.php' );

		expect( fs.existsSync( assetPath ) ).toBe( true );

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
			expect( assetContent ).toContain( dep );
		} );

		// Verify the main JS file does not bundle WordPress packages.
		const jsPath = path.join( BUILD_DIR, 'press-this-editor.js' );
		const jsContent = fs.readFileSync( jsPath, 'utf8' );

		// Check that the bundle references wp global instead of bundling.
		expect(
			jsContent.includes( 'wp.element' ) || jsContent.includes( 'window.wp' )
		).toBe( true );
	} );

	test( 'Build produces valid JavaScript', () => {
		const jsPath = path.join( BUILD_DIR, 'press-this-editor.js' );

		expect( fs.existsSync( jsPath ) ).toBe( true );

		const jsContent = fs.readFileSync( jsPath, 'utf8' );

		// Verify it's valid JS (basic check - not empty and has expected structure).
		expect( jsContent.length ).toBeGreaterThan( 100 );

		// Check for minification indicators in production build.
		// Production builds should not have excessive whitespace.
		const lineCount = jsContent.split( '\n' ).length;
		const avgLineLength = jsContent.length / lineCount;

		// In a minified file, average line length should be relatively high.
		// This is a heuristic check.
		expect( avgLineLength > 50 || lineCount < 100 ).toBe( true );
	} );

	test( 'CSS file is generated with expected content', () => {
		const cssPath = path.join( BUILD_DIR, 'press-this-editor.css' );

		expect( fs.existsSync( cssPath ) ).toBe( true );

		const cssContent = fs.readFileSync( cssPath, 'utf8' );

		expect( cssContent.length ).toBeGreaterThan( 0 );

		// Check for expected CSS selectors.
		expect(
			cssContent.includes( '.press-this-editor' ) ||
			cssContent.includes( 'press-this-editor' ) ||
			cssContent.includes( '.block-editor' )
		).toBe( true );
	} );
} );
