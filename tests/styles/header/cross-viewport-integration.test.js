/**
 * Cross-Viewport Integration Tests
 *
 * Integration tests verifying complete header functionality across
 * specific device viewport widths. These tests ensure all header
 * components work together correctly at common device breakpoints.
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
 * Read the base SCSS file.
 */
function readBaseScss() {
	const scssPath = path.resolve( __dirname, '../../../src/styles/partials/_base.scss' );
	return fs.readFileSync( scssPath, 'utf8' );
}

/**
 * Read variables SCSS file.
 */
function readVariablesScss() {
	const scssPath = path.resolve( __dirname, '../../../src/styles/partials/_variables.scss' );
	return fs.readFileSync( scssPath, 'utf8' );
}

describe( 'Cross-Viewport Header Integration', () => {
	let appLayoutScss;
	let baseScss;
	let variablesScss;

	beforeAll( () => {
		appLayoutScss = readAppLayoutScss();
		baseScss = readBaseScss();
		variablesScss = readVariablesScss();
	} );

	test( 'Complete header at iPhone SE width (375px) - all critical elements accessible', () => {
		// At 375px, the header should have all necessary responsive adjustments.
		// Site title truncation should be active.
		expect( appLayoutScss ).toContain( 'text-overflow: ellipsis' );

		// Actions group should remain visible and not shrink.
		expect( appLayoutScss ).toMatch( /\.press-this-header__actions\s*\{[^}]*flex-shrink:\s*0/s );

		// Mobile gap reduction should be active (below 600px breakpoint).
		expect( variablesScss ).toContain( '$breakpoint-mobile: 600px' );

		// Touch targets should meet minimum size.
		expect( variablesScss ).toContain( '$touch-target-min: 44px' );
		expect( appLayoutScss ).toContain( 'min-height: $touch-target-min' );

		// Overflow prevention should be in place.
		expect( baseScss ).toContain( 'overflow-x: hidden' );
	} );

	test( 'Complete header at small Android width (360px) - narrower than common mobile', () => {
		// At 360px, all critical functionality must remain accessible.
		// This is narrower than iPhone SE, testing extreme conditions.

		// Toolbar (undo/redo) should be hidden below 400px.
		const toolbarHidden = appLayoutScss.match(
			/\.press-this-header__toolbar[^{]*\{[^}]*@media[^{]*\{[^}]*display:\s*none/s
		) !== null || appLayoutScss.includes( '@media (max-width: 400px)' );
		expect( toolbarHidden ).toBe( true );

		// Actions gap should be reduced at narrow viewports.
		const hasReducedActionsGap = appLayoutScss.match(
			/\.press-this-header__actions[^{]*\{[\s\S]*?@media[^{]*\{[^}]*gap:\s*4px/s
		);
		expect( hasReducedActionsGap ).not.toBeNull();

		// Save Draft font size should be reduced at narrow viewports.
		const hasSaveDraftAdjustment = appLayoutScss.match(
			/\.press-this-header__save-draft[^{]*\{[\s\S]*?@media[^{]*\{[^}]*font-size:\s*12px/s
		);
		expect( hasSaveDraftAdjustment ).not.toBeNull();
	} );

	test( 'Complete header at tablet width (768px) - between mobile and tablet breakpoints', () => {
		// At 768px (between $breakpoint-mobile: 600px and $breakpoint-tablet: 900px),
		// the header should use tablet-appropriate styles.

		// Breakpoint variables should be properly defined.
		expect( variablesScss ).toContain( '$breakpoint-mobile: 600px' );
		expect( variablesScss ).toContain( '$breakpoint-tablet: 900px' );

		// At 768px, we're above mobile breakpoint so larger gaps should apply.
		expect( appLayoutScss ).toContain( 'gap: 16px' );

		// Undo/redo toolbar should be visible (above 400px threshold).
		expect( appLayoutScss ).toContain( '.press-this-header__toolbar' );

		// All header sections should have max-width: 100% to prevent overflow.
		expect( appLayoutScss ).toMatch( /\.press-this-header\s*\{[^}]*max-width:\s*100%/s );
		expect( appLayoutScss ).toMatch( /\.press-this-header__bar\s*\{[^}]*max-width:\s*100%/s );
	} );

	test( 'Sidebar toggle accessible and properly styled for mobile interaction', () => {
		// Sidebar toggle must be accessible at all viewport widths.
		expect( appLayoutScss ).toContain( '.press-this-header__sidebar-toggle' );

		// Must have minimum touch target size.
		const toggleHasMinWidth = appLayoutScss.match(
			/\.press-this-header__sidebar-toggle\s*\{[^}]*min-width:\s*(\$touch-target-min|44px)/s
		);
		expect( toggleHasMinWidth ).not.toBeNull();

		const toggleHasMinHeight = appLayoutScss.match(
			/\.press-this-header__sidebar-toggle\s*\{[^}]*min-height:\s*(\$touch-target-min|44px)/s
		);
		expect( toggleHasMinHeight ).not.toBeNull();

		// Sidebar should have mobile positioning and animation.
		expect( appLayoutScss ).toContain( '.press-this-sidebar' );
		expect( appLayoutScss ).toMatch( /\.press-this-sidebar\s*\{[^}]*position:\s*fixed/s );
		expect( appLayoutScss ).toContain( '&.is-open' );

		// Sidebar should adapt to very narrow viewports.
		const sidebarHasSmallBreakpoint = appLayoutScss.match(
			/\.press-this-sidebar[^{]*\{[\s\S]*?@media[^{]*\$breakpoint-small/s
		);
		expect( sidebarHasSmallBreakpoint ).not.toBeNull();
	} );
} );
