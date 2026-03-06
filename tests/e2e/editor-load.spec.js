/**
 * Editor Load E2E Tests (P0 + P1)
 *
 * Verifies that the Press This editor loads correctly with all
 * essential UI elements visible and functional.
 */
const { test, expect } = require( './utils/auth' );

test.describe( 'Editor Load', () => {
	test( 'editor loads with block editor container', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// The root app container should be present.
		await expect( page.locator( '#press-this-app' ) ).toBeVisible();

		// The block editor area should be present inside it.
		await expect(
			page.locator( '.press-this-editor' )
		).toBeVisible();
	} );

	test( 'title input is visible and editable', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		const titleInput = page.getByLabel( 'Post title' );
		await expect( titleInput ).toBeVisible();

		// Type into the title field.
		await titleInput.fill( 'Test Post Title' );
		await expect( titleInput ).toHaveValue( 'Test Post Title' );
	} );

	test( 'Save Draft and Publish buttons are visible', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// Wait for the editor to fully initialize (save handler becomes available).
		await expect(
			page.getByRole( 'button', { name: 'Save Draft' } )
		).toBeVisible( { timeout: 15000 } );

		await expect(
			page.getByRole( 'button', { name: /Publish|Submit for Review/ } )
		).toBeVisible();
	} );

	test( 'undo and redo buttons are visible and initially disabled', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		const undoButton = page.getByRole( 'button', { name: 'Undo' } );
		const redoButton = page.getByRole( 'button', { name: 'Redo' } );

		await expect( undoButton ).toBeVisible();
		await expect( redoButton ).toBeVisible();

		// Initially disabled because there is no undo/redo history.
		await expect( undoButton ).toBeDisabled();
		await expect( redoButton ).toBeDisabled();
	} );

	test( 'URL scanner input is visible when proxy is enabled', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// The mu-plugin enables the proxy, so the scanner should be visible.
		const scanInput = page.getByLabel( 'URL to scan' );
		await expect( scanInput ).toBeVisible();

		const scanButton = page.getByRole( 'button', { name: 'Scan' } );
		await expect( scanButton ).toBeVisible();
	} );

	test( 'block inserter button is visible', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// The inserter button should be present.
		const inserterButton = page.getByRole( 'button', {
			name: 'Add block',
		} );
		await expect( inserterButton ).toBeVisible();
	} );
} );
