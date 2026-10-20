/**
 * Header Site Link Tests
 *
 * Verifies the site name link in the header points to wp-admin
 * (adminUrl) with a front-end fallback, while the View Site menu
 * item keeps using the front-end URL. See GitHub issue #4.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Header Site Link', () => {
	let headerContent;
	let appContent;

	beforeAll( () => {
		const headerPath = path.resolve( __dirname, '../../src/components/Header.js' );
		headerContent = fs.readFileSync( headerPath, 'utf8' );

		const appPath = path.resolve( __dirname, '../../src/App.js' );
		appContent = fs.readFileSync( appPath, 'utf8' );
	} );

	test( 'Header accepts adminUrl prop', () => {
		expect( headerContent ).toContain( 'adminUrl' );
	} );

	test( 'site name link uses adminUrl with siteUrl fallback', () => {
		expect( headerContent ).toContain( 'href={ adminUrl || siteUrl }' );
	} );

	test( 'View Site menu item still uses siteUrl', () => {
		expect( headerContent ).toContain( 'href={ siteUrl }' );
	} );

	test( 'App passes adminUrl from pressThisData to Header', () => {
		expect( appContent ).toContain( 'adminUrl={ data.adminUrl }' );
	} );
} );
