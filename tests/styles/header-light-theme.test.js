/**
 * Header Light Theme Tests
 *
 * Tests for header styling changes to match Gutenberg's light theme.
 * Verifies CSS values for header background, text colors, and input styling.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Header Light Theme', () => {
	let scssContent;

	beforeAll( () => {
		const scssPath = path.resolve( __dirname, '../../src/styles/partials/_app-layout.scss' );
		scssContent = fs.readFileSync( scssPath, 'utf8' );
	} );

	test( 'Header has white background and bottom border', () => {
		// Check for white background.
		expect( scssContent ).toMatch( /\.press-this-header\s*\{[^}]*background:\s*#fff/ );

		// Check for border-bottom.
		expect( scssContent ).toContain( 'border-bottom: 1px solid #e0e0e0' );
	} );

	test( 'Header text colors are dark for light background', () => {
		// Check header base color is dark.
		expect( scssContent ).toMatch( /\.press-this-header\s*\{[^}]*color:\s*#1e1e1e/ );

		// Check site link color is dark.
		expect( scssContent ).toMatch( /\.press-this-header__site-link\s*\{[^}]*color:\s*#1e1e1e/ );
	} );

	test( 'URL scanner input styled for light theme', () => {
		// Check input has white background (or transparent, since white on white is OK).
		const hasLightInput = scssContent.includes( '.press-this-header__scanner' );
		expect( hasLightInput ).toBe( true );

		// Check input border color is light gray.
		expect( scssContent ).toContain( 'border-color: #ddd' );

		// Check placeholder color is #757575.
		expect( scssContent ).toContain( '#757575' );
	} );

	test( 'Hover and focus states use WordPress blue', () => {
		// Check that WordPress blue is used for hover/focus states.
		expect( scssContent ).toContain( '#007cba' );

		// Check site link hover color.
		expect( scssContent ).toMatch( /&:hover,\s*\n?\s*&:focus\s*\{[^}]*color:\s*#007cba/ );
	} );

	test( 'Sidebar toggle button styled for light theme', () => {
		// Check toggle button section exists.
		expect( scssContent ).toContain( '.press-this-header__sidebar-toggle' );

		// Check dashicons color is dark.
		expect( scssContent ).toMatch( /\.press-this-header__sidebar-toggle[^{]*\{[^}]*\.dashicons\s*\{[^}]*color:\s*#1e1e1e/ );
	} );
} );
