/**
 * Publishing E2E Tests (P0 + P1)
 *
 * Verifies that save/publish operations work correctly,
 * including draft saving, publishing, and redirect behavior.
 */
const { test, expect } = require( './utils/auth' );

test.describe( 'Publishing', () => {
	test( 'Save Draft saves post with draft status', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// Wait for editor to initialize.
		const saveDraftButton = page.getByRole( 'button', {
			name: 'Save Draft',
		} );
		await expect( saveDraftButton ).toBeVisible( { timeout: 15000 } );

		// Fill in a title.
		const titleInput = page.getByLabel( 'Post title' );
		await titleInput.fill( 'E2E Draft Test' );

		// Intercept the save API call.
		const savePromise = page.waitForResponse(
			( resp ) =>
				resp.url().includes( '/press-this/v1/save' ) &&
				resp.request().method() === 'POST'
		);

		await saveDraftButton.click();

		const response = await savePromise;
		const body = await response.json();

		// The save should succeed.
		expect( response.ok() ).toBe( true );
		expect( body.success ).toBe( true );
	} );

	test( 'Publish creates published post', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		const publishButton = page.getByRole( 'button', {
			name: /Publish|Submit for Review/,
		} );
		await expect( publishButton ).toBeVisible( { timeout: 15000 } );

		// Fill in a title.
		const titleInput = page.getByLabel( 'Post title' );
		await titleInput.fill( 'E2E Publish Test' );

		// Intercept the save API call to verify payload and prevent redirect.
		let savedPayload = null;
		await page.route( '**/wp-json/press-this/v1/save', async ( route ) => {
			const request = route.request();
			savedPayload = JSON.parse( request.postData() );

			// Return a success response without redirect to stay on page.
			await route.fulfill( {
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify( {
					success: true,
					redirect: null,
				} ),
			} );
		} );

		await publishButton.click();

		// Wait for the intercepted request to complete.
		await page.waitForResponse( ( resp ) =>
			resp.url().includes( '/press-this/v1/save' )
		);

		// Verify the payload had publish status.
		expect( savedPayload ).not.toBeNull();
		expect( savedPayload.status ).toBe( 'publish' );
	} );

	test( 'Continue in Standard Editor redirects', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// Wait for editor to initialize.
		await expect(
			page.getByRole( 'button', { name: 'Save Draft' } )
		).toBeVisible( { timeout: 15000 } );

		// Open the more actions menu.
		const moreMenu = page.getByRole( 'button', {
			name: 'More actions',
		} );
		await expect( moreMenu ).toBeVisible();
		await moreMenu.click();

		// Click Continue in Standard Editor.
		const continueItem = page.getByRole( 'menuitem', {
			name: 'Continue in Standard Editor',
		} );
		await expect( continueItem ).toBeVisible();

		// Intercept save to verify force_redirect.
		let savedPayload = null;
		await page.route( '**/wp-json/press-this/v1/save', async ( route ) => {
			const request = route.request();
			savedPayload = JSON.parse( request.postData() );

			await route.fulfill( {
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify( {
					success: true,
					redirect: '/wp-admin/post.php?post=1&action=edit',
					force: true,
				} ),
			} );
		} );

		await continueItem.click();

		// Wait for the save request.
		await page.waitForResponse( ( resp ) =>
			resp.url().includes( '/press-this/v1/save' )
		);

		// Verify force_redirect was sent.
		expect( savedPayload ).not.toBeNull();
		expect( savedPayload.force_redirect ).toBe( true );
		expect( savedPayload.status ).toBe( 'draft' );
	} );

	test( 'post has correct title after save', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		await expect(
			page.getByRole( 'button', { name: 'Save Draft' } )
		).toBeVisible( { timeout: 15000 } );

		const titleInput = page.getByLabel( 'Post title' );
		await titleInput.fill( 'My Specific Title' );

		let savedPayload = null;
		await page.route( '**/wp-json/press-this/v1/save', async ( route ) => {
			savedPayload = JSON.parse( route.request().postData() );
			await route.fulfill( {
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify( { success: true } ),
			} );
		} );

		await page.getByRole( 'button', { name: 'Save Draft' } ).click();

		await page.waitForResponse( ( resp ) =>
			resp.url().includes( '/press-this/v1/save' )
		);

		expect( savedPayload.title ).toBe( 'My Specific Title' );
	} );

	test( 'post has correct content after save', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		await expect(
			page.getByRole( 'button', { name: 'Save Draft' } )
		).toBeVisible( { timeout: 15000 } );

		// Click into the editor content area and type.
		const editorArea = page.locator(
			'.block-editor-block-list__layout'
		);
		await expect( editorArea ).toBeVisible( { timeout: 10000 } );
		await editorArea.click();

		// Type some content - this should create a paragraph block.
		await page.keyboard.type( 'Hello from E2E test' );

		let savedPayload = null;
		await page.route( '**/wp-json/press-this/v1/save', async ( route ) => {
			savedPayload = JSON.parse( route.request().postData() );
			await route.fulfill( {
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify( { success: true } ),
			} );
		} );

		await page.getByRole( 'button', { name: 'Save Draft' } ).click();

		await page.waitForResponse( ( resp ) =>
			resp.url().includes( '/press-this/v1/save' )
		);

		// Content should contain the typed text in a paragraph block.
		expect( savedPayload.content ).toContain( 'Hello from E2E test' );
	} );

	test( 'error notice shown on save failure', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		await expect(
			page.getByRole( 'button', { name: 'Save Draft' } )
		).toBeVisible( { timeout: 15000 } );

		// Intercept save and return an error.
		await page.route( '**/wp-json/press-this/v1/save', async ( route ) => {
			await route.fulfill( {
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify( {
					success: false,
					message: 'Error saving post.',
				} ),
			} );
		} );

		await page.getByRole( 'button', { name: 'Save Draft' } ).click();

		// An error notice should appear.
		await expect(
			page.getByText( 'Error saving post.' )
		).toBeVisible( { timeout: 10000 } );
	} );
} );
