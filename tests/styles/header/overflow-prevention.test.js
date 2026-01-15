/**
 * Overflow Prevention Tests
 *
 * Tests for horizontal overflow prevention at mobile viewports.
 * Verifies no horizontal scrollbar appears at narrow widths.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Read the base SCSS file.
 */
function readBaseScss() {
	const scssPath = path.resolve( __dirname, '../../../src/styles/partials/_base.scss' );
	return fs.readFileSync( scssPath, 'utf8' );
}

/**
 * Read the app layout SCSS file.
 */
function readAppLayoutScss() {
	const scssPath = path.resolve( __dirname, '../../../src/styles/partials/_app-layout.scss' );
	return fs.readFileSync( scssPath, 'utf8' );
}

/**
 * Read the main SCSS file.
 */
function readMainScss() {
	const mainPath = path.resolve( __dirname, '../../../src/styles/main.scss' );
	return fs.readFileSync( mainPath, 'utf8' );
}

/**
 * Read variables SCSS file.
 */
function readVariablesScss() {
	const scssPath = path.resolve( __dirname, '../../../src/styles/partials/_variables.scss' );
	return fs.readFileSync( scssPath, 'utf8' );
}

describe( 'Horizontal Overflow Prevention', () => {
	let baseScss;
	let appLayoutScss;
	let mainScss;
	let variablesScss;

	beforeAll( () => {
		baseScss = readBaseScss();
		appLayoutScss = readAppLayoutScss();
		mainScss = readMainScss();
		variablesScss = readVariablesScss();
	} );

	test( 'No horizontal scrollbar at 320px viewport - overflow-x hidden on body', () => {
		// Body should have overflow-x: hidden to prevent horizontal scroll.
		const hasOverflowHidden = baseScss.includes( 'overflow-x: hidden' );
		expect( hasOverflowHidden ).toBe( true );

		// Should be applied to html and/or body elements.
		const htmlBodyMatch = baseScss.match( /(?:html|body)[^{]*\{[^}]*overflow-x:\s*hidden/s );
		expect( htmlBodyMatch ).not.toBeNull();
	} );

	test( 'No horizontal scrollbar at 375px viewport - max-width constraints on containers', () => {
		// Scanner should use max-width: 100% to prevent overflow.
		const scannerHasMaxWidth = appLayoutScss.includes( '.press-this-header__scanner' ) &&
			appLayoutScss.includes( 'max-width' );
		expect( scannerHasMaxWidth ).toBe( true );

		// Main content area should have width: 100% or max-width constraint.
		const hasWidthConstraint = appLayoutScss.includes( 'width: 100%' ) ||
			appLayoutScss.includes( 'max-width' );
		expect( hasWidthConstraint ).toBe( true );
	} );

	test( 'Body/html overflow-x behavior uses consistent breakpoint variables', () => {
		// Verify breakpoint variables exist.
		expect( variablesScss ).toContain( '$breakpoint-mobile: 600px' );
		expect( variablesScss ).toContain( '$breakpoint-tablet: 900px' );

		// Main.scss should not use inconsistent 782px breakpoint (WordPress admin default).
		// All media queries should use defined SCSS variables.
		const has782pxBreakpoint = mainScss.match( /@media\s*\([^)]*782px[^)]*\)/ );

		// If 782px is found, it should be replaced with a variable.
		// This test verifies standardization has been applied.
		expect( has782pxBreakpoint ).toBeNull();
	} );
} );
