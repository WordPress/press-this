/**
 * Content Scraping E2E Tests (P0)
 *
 * Verifies that the URL scraping functionality works correctly,
 * including URL parameter handling, manual scanning, and error states.
 */
const { test, expect } = require( './utils/auth' );

test.describe( 'Content Scraping', () => {
	test( 'URL passed via GET populates title', async ( {
		loggedInPage: page,
	} ) => {
		// Navigate with a URL parameter and title.
		await page.goto(
			'/wp-admin/press-this.php?u=https%3A%2F%2Fexample.com&t=Example%20Title'
		);

		// The title input should be populated.
		const titleInput = page.getByLabel( 'Post title' );
		await expect( titleInput ).toHaveValue( 'Example Title', {
			timeout: 10000,
		} );
	} );

	test( 'URL scanner accepts input and triggers scan', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// The scanner should be visible (proxy is enabled via mu-plugin).
		const scanInput = page.getByLabel( 'URL to scan' );
		await expect( scanInput ).toBeVisible();

		// Enter a URL into the scanner.
		await scanInput.fill( 'https://example.com' );
		await expect( scanInput ).toHaveValue( 'https://example.com' );

		// The Scan button should be enabled now.
		const scanButton = page.getByRole( 'button', { name: 'Scan' } );
		await expect( scanButton ).toBeEnabled();
	} );

	test( 'scan populates editor with scraped content', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		const scanInput = page.getByLabel( 'URL to scan' );
		await scanInput.fill( 'https://example.com' );

		// Intercept the scrape API call (matches both pretty and ugly permalinks).
		await page.route( /press-this\/v1\/scrape/, async ( route ) => {
			await route.fulfill( {
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify( {
					title: 'Example Domain',
					description:
						'This domain is for use in illustrative examples.',
					images: [],
					embeds: [],
					canonical: 'https://example.com',
					final_url: 'https://example.com',
				} ),
			} );
		} );

		// Click Scan.
		await page.getByRole( 'button', { name: 'Scan' } ).click();

		// Title should be populated with scraped title.
		const titleInput = page.getByLabel( 'Post title' );
		await expect( titleInput ).toHaveValue( 'Example Domain', {
			timeout: 10000,
		} );
	} );

	test( 'scan error shows notice for invalid URL', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		const scanInput = page.getByLabel( 'URL to scan' );
		await scanInput.fill( 'https://invalid.test.example' );

		// Intercept and return an error.
		await page.route( /press-this\/v1\/scrape/, async ( route ) => {
			await route.fulfill( {
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify( {
					message: 'Failed to fetch URL',
				} ),
			} );
		} );

		await page.getByRole( 'button', { name: 'Scan' } ).click();

		// An error notice should appear (use .first() to avoid a11y live region duplicate).
		await expect(
			page.getByText( 'Failed to fetch URL' ).first()
		).toBeVisible( { timeout: 10000 } );
	} );
} );
