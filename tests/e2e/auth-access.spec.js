/**
 * Auth & Access Control E2E Tests (P0)
 *
 * Verifies that Press This enforces proper authentication
 * and capability checks for page access and REST endpoints.
 */
const { test, expect, wpLogin, createUser } = require( './utils/auth' );

test.describe( 'Auth & Access Control', () => {
	test.beforeAll( async () => {
		await createUser( 'subscriber', 'subscriber@example.com', 'subscriber' );
	} );

	test( 'unauthenticated user is redirected to login', async ( { page } ) => {
		// Visit Press This without being logged in.
		await page.goto( '/wp-admin/press-this.php' );

		// Should be redirected to the login page.
		await expect( page ).toHaveURL( /wp-login\.php/ );
	} );

	test( 'editor can access press-this.php', async ( { browser } ) => {
		// Log in as admin (who has editor capabilities).
		const context = await browser.newContext();
		const page = await context.newPage();

		await wpLogin( page, 'admin', 'password' );
		await page.goto( '/wp-admin/press-this.php' );

		// The Press This app container should be present.
		await expect( page.locator( '#press-this-app' ) ).toBeVisible();

		await context.close();
	} );

	test( 'subscriber is denied access', async ( { browser } ) => {
		// Attempt to log in as subscriber and access Press This.
		// Subscribers lack edit_posts capability.
		const context = await browser.newContext();
		const page = await context.newPage();

		await wpLogin( page, 'subscriber', 'password' );

		// Navigate to Press This - should get an error or redirect.
		const response = await page.goto( '/wp-admin/press-this.php' );

		// Ensure navigation produced an HTTP response so access control is actually tested.
		expect(
			response,
			'Navigation to /wp-admin/press-this.php returned null; ensure WordPress is reachable.'
		).not.toBeNull();

		// WordPress typically returns 403 or redirects for unauthorized access.
		// It may also return 200 with a wp_die() error page.
		expect( [ 200, 302, 403 ] ).toContain( response.status() );

		// The page should NOT contain the Press This app regardless of HTTP status.
		const appVisible = await page
			.locator( '#press-this-app' )
			.isVisible()
			.catch( () => false );
		expect( appVisible ).toBe( false );

		await context.close();
	} );

	test( 'REST save endpoint rejects unauthenticated requests', async ( {
		page,
	} ) => {
		// Send an unauthenticated request to the save endpoint.
		const response = await page.request.post(
			'/wp-json/press-this/v1/save',
			{
				data: {
					post_id: 1,
					title: 'Test',
					content: '',
					status: 'draft',
				},
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);

		// Should receive a 401, 403, or 404 status.
		// 404 is valid when the REST route requires authentication to be discovered.
		expect( [ 401, 403, 404 ] ).toContain( response.status() );
	} );
} );
