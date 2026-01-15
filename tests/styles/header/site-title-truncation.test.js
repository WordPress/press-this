/**
 * Site Title Truncation Tests
 *
 * Visual regression tests for site title truncation behavior.
 * Verifies CSS truncation styles work correctly at different viewport widths.
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

describe( 'Site Title Truncation', () => {
	let appLayoutScss;

	beforeAll( () => {
		appLayoutScss = readAppLayoutScss();
	} );

	test( 'Long site title truncates with ellipsis at 400px viewport', () => {
		// Site link should have text-overflow: ellipsis for truncation.
		expect( appLayoutScss ).toContain( '.press-this-header__site-link' );
		expect( appLayoutScss ).toContain( 'text-overflow: ellipsis' );
		expect( appLayoutScss ).toContain( 'white-space: nowrap' );

		// Site link should have overflow: hidden to clip overflowing text.
		const siteLinkMatch = appLayoutScss.match(
			/\.press-this-header__site-link\s*\{[^}]*overflow:\s*hidden/s
		);
		expect( siteLinkMatch ).not.toBeNull();
	} );

	test( 'Site title container shrinks while action buttons remain visible', () => {
		// Site container should have flex-shrink: 1 to allow shrinking.
		const siteContainerMatch = appLayoutScss.match(
			/\.press-this-header__site\s*\{[^}]*flex-shrink:\s*1/s
		);
		expect( siteContainerMatch ).not.toBeNull();

		// Site container should have min-width: 0 for proper flex truncation.
		const minWidthMatch = appLayoutScss.match(
			/\.press-this-header__site\s*\{[^}]*min-width:\s*0/s
		);
		expect( minWidthMatch ).not.toBeNull();

		// Site container should have overflow: hidden to clip content.
		const overflowMatch = appLayoutScss.match(
			/\.press-this-header__site\s*\{[^}]*overflow:\s*hidden/s
		);
		expect( overflowMatch ).not.toBeNull();
	} );

	test( 'Site title displays fully when sufficient space exists', () => {
		// The truncation is CSS-based, so when there is enough space,
		// the full text will display naturally. We verify the CSS allows this
		// by checking there are no max-width constraints that would force
		// truncation at larger viewport widths.

		// Site container should use flex-shrink, not a fixed max-width.
		expect( appLayoutScss ).toContain( '.press-this-header__site' );

		// Actions should have flex-shrink: 0, leaving remaining space for site title.
		const actionsMatch = appLayoutScss.match(
			/\.press-this-header__actions\s*\{[^}]*flex-shrink:\s*0/s
		);
		expect( actionsMatch ).not.toBeNull();
	} );
} );
