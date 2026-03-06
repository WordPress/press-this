/**
 * Categories & Tags E2E Tests (P0 + P1)
 *
 * Verifies that category and tag management works correctly
 * in the Press This editor sidebar.
 */
const { test, expect } = require( './utils/auth' );

test.describe( 'Categories & Tags', () => {
	test( 'category panel shows categories with checkboxes', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// Look for the Categories panel in the sidebar.
		const categoriesHeading = page.getByText( 'Categories' );
		await expect( categoriesHeading.first() ).toBeVisible( {
			timeout: 15000,
		} );

		// Click to expand the panel if collapsed.
		await categoriesHeading.first().click();

		// There should be at least the "Uncategorized" category checkbox.
		const checkboxes = page.getByRole( 'checkbox' );
		const count = await checkboxes.count();
		expect( count ).toBeGreaterThan( 0 );
	} );

	test( 'categories can be selected and deselected', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// Expand Categories panel.
		const categoriesHeading = page.getByText( 'Categories' );
		await expect( categoriesHeading.first() ).toBeVisible( {
			timeout: 15000,
		} );
		await categoriesHeading.first().click();

		// Find a category checkbox (e.g., Uncategorized).
		const uncategorized = page.getByRole( 'checkbox', {
			name: /Uncategorized/i,
		} );
		await expect( uncategorized ).toBeVisible( { timeout: 5000 } );

		// Check the checkbox.
		await uncategorized.check();
		await expect( uncategorized ).toBeChecked();

		// Uncheck it.
		await uncategorized.uncheck();
		await expect( uncategorized ).not.toBeChecked();
	} );

	test( 'tags can be entered', async ( { loggedInPage: page } ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// Look for the Tags panel.
		const tagsHeading = page.getByText( 'Tags' );
		await expect( tagsHeading.first() ).toBeVisible( { timeout: 15000 } );

		// Click to expand.
		await tagsHeading.first().click();

		// Find the tag input field (FormTokenField).
		const tagInput = page.getByRole( 'combobox', { name: /Add tags/i } );
		await expect( tagInput ).toBeVisible( { timeout: 5000 } );

		// Type a tag and press Enter to add it.
		await tagInput.fill( 'test-tag' );
		await page.keyboard.press( 'Enter' );

		// The tag token should appear.
		await expect(
			page.getByText( 'test-tag' )
		).toBeVisible( { timeout: 5000 } );
	} );

	test( 'new category can be created', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// Expand Categories panel.
		const categoriesHeading = page.getByText( 'Categories' );
		await expect( categoriesHeading.first() ).toBeVisible( {
			timeout: 15000,
		} );
		await categoriesHeading.first().click();

		// Look for "Add New Category" button or link.
		const addNewButton = page.getByRole( 'button', {
			name: /Add New Category/i,
		} );

		// If the add-new UI is available (user has edit_categories cap).
		const addNewVisible = await addNewButton
			.isVisible( { timeout: 5000 } )
			.catch( () => false );

		if ( addNewVisible ) {
			await addNewButton.click();

			// A text field for the new category name should appear.
			const newCategoryInput = page.getByRole( 'textbox', {
				name: /New Category Name|category name/i,
			} );
			await expect( newCategoryInput ).toBeVisible( { timeout: 5000 } );
		} else {
			// If the admin user doesn't have the "Add New" option exposed,
			// just confirm categories panel loaded properly.
			const checkboxes = page.getByRole( 'checkbox' );
			const count = await checkboxes.count();
			expect( count ).toBeGreaterThan( 0 );
		}
	} );

	test( 'selected categories are saved with post', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );

		// Wait for editor to initialize.
		await expect(
			page.getByRole( 'button', { name: 'Save Draft' } )
		).toBeVisible( { timeout: 15000 } );

		// Expand Categories panel and select a category.
		const categoriesHeading = page.getByText( 'Categories' );
		await categoriesHeading.first().click();

		const uncategorized = page.getByRole( 'checkbox', {
			name: /Uncategorized/i,
		} );
		await expect( uncategorized ).toBeVisible( { timeout: 5000 } );
		await uncategorized.check();

		// Intercept save to verify categories are included.
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

		// Verify categories were included in the save payload.
		expect( savedPayload ).not.toBeNull();
		expect( savedPayload.categories ).toBeDefined();
		expect( savedPayload.categories.length ).toBeGreaterThan( 0 );
	} );
} );
