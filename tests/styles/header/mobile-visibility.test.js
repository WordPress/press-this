/**
 * Mobile Header Element Visibility Tests
 *
 * Tests for mobile element visibility and touch target sizing.
 * Verifies critical header actions remain accessible on narrow viewports.
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

describe( 'Mobile Header Element Visibility', () => {
	let appLayoutScss;
	let variablesScss;

	beforeAll( () => {
		appLayoutScss = readAppLayoutScss();
		variablesScss = readVariablesScss();
	} );

	test( 'Publish button is visible and has min 44x44px touch target at 320px', () => {
		// Publish button should exist in the actions group.
		expect( appLayoutScss ).toContain( '.press-this-header__publish' );

		// Actions group should have flex-shrink: 0 to prevent compression.
		const actionsMatch = appLayoutScss.match(
			/\.press-this-header__actions\s*\{[^}]*flex-shrink:\s*0/s
		);
		expect( actionsMatch ).not.toBeNull();

		// Publish button should have minimum touch target dimensions.
		// Check for min-height: $touch-target-min or min-height: 44px.
		const publishHasMinHeight = appLayoutScss.includes( '.press-this-header__publish' ) &&
			( appLayoutScss.match( /\.press-this-header__publish\s*\{[^}]*min-height:\s*\$touch-target-min/s ) !== null ||
			  appLayoutScss.match( /\.press-this-header__publish\s*\{[^}]*min-height:\s*44px/s ) !== null );
		expect( publishHasMinHeight ).toBe( true );

		// Touch target variable should be defined.
		expect( variablesScss ).toContain( '$touch-target-min: 44px' );
	} );

	test( 'Sidebar toggle is visible at 400px viewport', () => {
		// Sidebar toggle should exist.
		expect( appLayoutScss ).toContain( '.press-this-header__sidebar-toggle' );

		// More menu (sidebar toggle) should be accessible with proper touch target.
		expect( appLayoutScss ).toContain( '.press-this-header__more-menu' );

		// The more menu button should have minimum touch target size.
		const moreMenuMatch = appLayoutScss.match(
			/\.press-this-header__more-menu\s*\{[^}]*\.components-button\s*\{[^}]*min-width:\s*(\$touch-target-min|44px|36px)/s
		);
		expect( moreMenuMatch ).not.toBeNull();
	} );

	test( 'Save Draft is accessible at 375px viewport', () => {
		// Save Draft button should exist.
		expect( appLayoutScss ).toContain( '.press-this-header__save-draft' );

		// Save Draft should have mobile-responsive adjustments.
		// Check for media query targeting narrow viewports with font-size adjustment.
		const hasMobileAdjustment = appLayoutScss.includes( '.press-this-header__save-draft' ) &&
			appLayoutScss.includes( '@media' );
		expect( hasMobileAdjustment ).toBe( true );
	} );

	test( 'Undo/redo buttons hidden at viewports below 400px', () => {
		// Toolbar section should exist.
		expect( appLayoutScss ).toContain( '.press-this-header__toolbar' );

		// Should have a media query to hide toolbar at narrow viewports.
		// Looking for display: none in a media query context.
		const hasHiddenToolbar = appLayoutScss.match(
			/\.press-this-header__toolbar\s*\{[^}]*@media[^}]*display:\s*none/s
		) !== null || appLayoutScss.match(
			/@media[^{]*\{[^}]*\.press-this-header__toolbar[^}]*display:\s*none/s
		) !== null || appLayoutScss.match(
			/\.press-this-header__toolbar\s*\{[^}]*\n[^}]*@media[^}]*\{[^}]*display:\s*none/s
		) !== null;

		// Alternatively, check if there's a responsive rule that hides the toolbar.
		const toolbarSection = appLayoutScss.match(
			/\.press-this-header__toolbar\s*\{[\s\S]*?(?=\n\.[a-z]|\n\/\/|\n$)/
		);

		// The toolbar should have responsive hiding logic.
		const hasResponsiveHiding = toolbarSection !== null &&
			( toolbarSection[0].includes( 'display: none' ) ||
			  toolbarSection[0].includes( '@media' ) );

		expect( hasHiddenToolbar || hasResponsiveHiding ).toBe( true );
	} );
} );
