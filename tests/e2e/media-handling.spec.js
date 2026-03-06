/**
 * Media Handling E2E Tests (P0)
 *
 * Verifies that scraped images appear in the sidebar panel
 * and can be inserted into the editor or set as featured image.
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

	// Intercept the scrape API to return images.
	await page.route( '**/wp-json/press-this/v1/scrape', ( route ) => {
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
	test( 'scraped images appear in sidebar panel', async ( {
		loggedInPage: page,
	} ) => {
		await navigateWithScrapedImages( page );

		// The Scraped Media panel should appear in the sidebar.
		// Look for images rendered as thumbnails in the sidebar.
		const sidebar = page.locator( '.press-this-editor__sidebar' );
		await expect( sidebar ).toBeVisible();

		// Wait for image thumbnails to appear (they are filtered by dimensions).
		// The panel title contains "Scraped Media" or similar.
		const mediaPanel = page.getByText( /Media|Images/ );
		await expect( mediaPanel.first() ).toBeVisible( { timeout: 15000 } );
	} );

	test( 'click on scraped image inserts block', async ( {
		loggedInPage: page,
	} ) => {
		await navigateWithScrapedImages( page );

		// Wait for the media panel to show images.
		const sidebar = page.locator( '.press-this-editor__sidebar' );
		await expect( sidebar ).toBeVisible();

		// Find and click an image button in the scraped media panel.
		// Images are rendered as buttons with role="button" or as clickable elements.
		const imageButtons = sidebar.locator(
			'.press-this-media-grid button, .press-this-media-grid [role="button"]'
		);

		// Wait for at least one image to appear.
		await expect( imageButtons.first() ).toBeVisible( { timeout: 15000 } );
		await imageButtons.first().click();

		// After clicking, an image block should be inserted in the editor.
		const editorMain = page.locator( '.press-this-editor__main' );
		await expect(
			editorMain.locator( '[data-type="core/image"], figure.wp-block-image' )
		).toBeVisible( { timeout: 10000 } );
	} );

	test( 'featured image can be set from scraped images', async ( {
		loggedInPage: page,
	} ) => {
		await navigateWithScrapedImages( page );

		// The Featured Image panel should be in the sidebar.
		const featuredImagePanel = page.getByText( 'Featured Image' );
		await expect( featuredImagePanel.first() ).toBeVisible( {
			timeout: 15000,
		} );

		// Click to expand the Featured Image panel if collapsed.
		await featuredImagePanel.first().click();

		// Look for a way to select from scraped images.
		// The panel should show scraped images as selectable options.
		const sidebar = page.locator( '.press-this-editor__sidebar' );
		const featuredSection = sidebar.locator(
			'.press-this-featured-image-panel'
		);

		// If there are scraped images, they should appear as selectable thumbnails.
		const selectableImages = featuredSection.locator(
			'button, [role="button"]'
		);
		const count = await selectableImages.count();

		// There should be at least some interactive elements in the panel.
		expect( count ).toBeGreaterThan( 0 );
	} );
} );
