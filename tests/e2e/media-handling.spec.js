/**
 * Media Handling E2E Tests (P0)
 *
 * Verifies that the media panels appear in the sidebar
 * after a successful scrape with images.
 */
const { test, expect } = require( './utils/auth' );

/**
 * Navigate to Press This with a mocked scrape that returns images.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 */
async function navigateWithScrapedImages( page ) {
	await page.goto( '/wp-admin/press-this.php' );

	// Wait for editor to be ready.
	await expect(
		page.getByLabel( 'URL to scan' )
	).toBeVisible( { timeout: 10000 } );

	// Intercept the scrape API to return images (regex matches both permalink formats).
	await page.route( /press-this\/v1\/scrape/, ( route ) => {
		route.fulfill( {
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify( {
				title: 'Test Page',
				description: 'A test page with images.',
				images: [
					'https://picsum.photos/id/1/300/200',
					'https://picsum.photos/id/2/300/200',
				],
				embeds: [],
				canonical: 'https://example.com/test',
				final_url: 'https://example.com/test',
			} ),
		} );
	} );

	// Trigger a scan.
	const scanInput = page.getByLabel( 'URL to scan' );
	await scanInput.fill( 'https://example.com/test' );
	await page.getByRole( 'button', { name: 'Scan' } ).click();

	// Wait for the title to be populated (indicating scrape completed).
	await expect( page.getByLabel( 'Post title' ) ).toHaveValue(
		'Test Page',
		{ timeout: 10000 }
	);
}

test.describe( 'Media Handling', () => {
	test( 'scrape result populates title and sidebar is visible', async ( {
		loggedInPage: page,
	} ) => {
		await navigateWithScrapedImages( page );

		// The sidebar should be visible after scraping.
		const sidebar = page.locator( '.press-this-editor__sidebar' );
		await expect( sidebar ).toBeVisible();

		// The Featured Image panel should appear in the sidebar.
		const featuredImagePanel = page.getByText( 'Featured Image' );
		await expect( featuredImagePanel.first() ).toBeVisible( {
			timeout: 5000,
		} );
	} );
} );
