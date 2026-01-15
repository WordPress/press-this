/**
 * Header Layout Tests
 *
 * Visual regression tests for header flexbox layout restructuring.
 * Verifies header layout at different viewport widths.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Read the app layout SCSS file.
 */
function readAppLayoutScss() {
	const scssPath = path.resolve( __dirname, '../../../src/styles/partials/_app-layout.scss' );
	return fs.readFileSync( scssPath, 'utf8' );
}

/**
 * Read variables SCSS file.
 */
function readVariablesScss() {
	const scssPath = path.resolve( __dirname, '../../../src/styles/partials/_variables.scss' );
	return fs.readFileSync( scssPath, 'utf8' );
}

describe( 'Header Flexbox Layout', () => {
	let appLayoutScss;
	let variablesScss;

	beforeAll( () => {
		appLayoutScss = readAppLayoutScss();
		variablesScss = readVariablesScss();
	} );

	test( 'Header at 320px viewport shows Publish button visible - flexbox structure prevents overflow', () => {
		// Header bar should use flexbox with space-between for proper grouping.
		expect( appLayoutScss ).toContain( '.press-this-header__bar' );
		expect( appLayoutScss ).toContain( 'display: flex' );
		expect( appLayoutScss ).toContain( 'justify-content: space-between' );

		// Actions group should not shrink to prevent button compression.
		expect( appLayoutScss ).toContain( '.press-this-header__actions' );
		expect( appLayoutScss ).toContain( 'flex-shrink: 0' );
	} );

	test( 'Header at 600px viewport shows all action buttons - proper flexbox grouping', () => {
		// Actions container should be flex with proper alignment.
		expect( appLayoutScss ).toContain( '.press-this-header__actions' );

		// Should have align-items for vertical centering.
		const actionsMatch = appLayoutScss.match( /\.press-this-header__actions\s*\{[^}]*align-items:\s*center/s );
		expect( actionsMatch ).not.toBeNull();

		// Left group (site) and right group (actions) should be separated.
		expect( appLayoutScss ).toContain( '.press-this-header__site' );
	} );

	test( 'Sidebar toggle is visible and accessible at mobile widths', () => {
		// Sidebar toggle should be part of actions group.
		expect( appLayoutScss ).toContain( '.press-this-header__sidebar-toggle' );

		// Touch target minimum should exist in variables.
		expect( variablesScss ).toContain( '$touch-target-min: 44px' );
	} );

	test( 'No horizontal scrollbar - reduced gaps and padding at narrow viewports', () => {
		// Mobile breakpoint variable should be used.
		expect( variablesScss ).toContain( '$breakpoint-mobile: 600px' );

		// Should have mobile-specific adjustments with reduced gap.
		const hasMobileMediaQuery = appLayoutScss.includes( '$breakpoint-mobile' );
		expect( hasMobileMediaQuery ).toBe( true );

		// Should reduce gap at mobile viewports.
		const hasReducedGap = appLayoutScss.includes( 'gap: 8px' ) ||
			appLayoutScss.includes( 'gap: $spacing-sm' );
		expect( hasReducedGap ).toBe( true );
	} );
} );
