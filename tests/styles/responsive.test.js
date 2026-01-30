/**
 * Responsive Design Tests
 *
 * Tests for responsive behavior at different viewport sizes.
 * Verifies CSS media queries and responsive layout patterns.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Read all SCSS files from the styles directory and partials.
 */
function readAllScssFiles() {
	const stylesDir = path.resolve( __dirname, '../../src/styles' );
	const partialsDir = path.resolve( stylesDir, 'partials' );
	let combinedContent = '';

	try {
		combinedContent += fs.readFileSync( path.join( stylesDir, 'main.scss' ), 'utf8' );
	} catch ( error ) {
		// Main file may not exist.
	}

	try {
		const partialFiles = fs.readdirSync( partialsDir );
		for ( const file of partialFiles ) {
			if ( file.endsWith( '.scss' ) ) {
				combinedContent += '\n' + fs.readFileSync( path.join( partialsDir, file ), 'utf8' );
			}
		}
	} catch ( error ) {
		// Partials directory may not exist.
	}

	return combinedContent;
}

describe( 'Responsive Design', () => {
	let scssContent;

	beforeAll( () => {
		scssContent = readAllScssFiles();
	} );

	test( 'Mobile viewport (320px) breakpoint styles exist', () => {
		expect( scssContent ).toContain( '$breakpoint-small: 320px' );

		const hasMobileQuery = scssContent.includes( '$breakpoint-small' ) ||
			scssContent.includes( 'max-width: 320px' );
		expect( hasMobileQuery ).toBe( true );

		expect( scssContent ).toContain( '.press-this-admin-bar' );
		expect( scssContent ).toContain( 'grid-template-columns: repeat(2, 1fr)' );
	} );

	test( 'Tablet viewport (600px-900px) breakpoint styles exist', () => {
		expect( scssContent ).toContain( '$breakpoint-mobile: 600px' );
		expect( scssContent ).toContain( '$breakpoint-tablet: 900px' );
		expect( scssContent ).toContain( '$breakpoint-tablet' );
		expect( scssContent ).toContain( 'grid-template-columns: repeat(4, 1fr)' );
	} );

	test( 'Desktop viewport (900px+) base styles exist', () => {
		expect( scssContent ).toContain( 'grid-template-columns: repeat(6, 1fr)' );
		expect( scssContent ).toContain( '$options-panel-width: 320px' );
		expect( scssContent ).toContain( '.press-this-editor' );
		expect( scssContent ).toContain( '$spacing-lg: 16px' );
	} );

	test( 'Sidebar becomes full-width on mobile', () => {
		const hasOptionsPanel = scssContent.includes( '.press-this-options-panel' );
		const hasFullWidth = scssContent.includes( 'width: 100%' );
		const hasMobileBreakpoint = scssContent.includes( '$breakpoint-mobile' );

		expect( hasOptionsPanel && hasFullWidth && hasMobileBreakpoint ).toBe( true );
		expect( scssContent ).toContain( 'position: fixed' );
		expect( scssContent ).toMatch( /@media\s*\(\s*max-width:\s*\$breakpoint-mobile\s*\)/ );
	} );
} );
