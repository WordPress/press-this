/**
 * Paste Preservation E2E Tests
 *
 * Regression coverage for the "cannot paste certain content" bug: when the
 * editor restricted insertion to an allowedBlockTypes allowlist, Gutenberg's
 * replaceBlocks() silently discarded the ENTIRE paste if any pasted block was
 * outside the list (a table, columns, etc.). The user saw nothing happen.
 *
 * The editor now allows every block type to be inserted (the inserter is
 * curated separately via supports.inserter), so pasted content of any type is
 * preserved. These tests paste HTML directly through a real ClipboardEvent —
 * the same code path a browser paste uses.
 */
/* global DataTransfer, ClipboardEvent */
const { test, expect } = require( './utils/auth' );

const editorContent = '.press-this-editor__content';

/**
 * Load the editor and place the caret in a fresh empty paragraph.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 */
async function loadEditorWithEmptyParagraph( page ) {
	await page.goto( '/wp-admin/press-this.php' );
	await page.locator( editorContent ).waitFor( { timeout: 10000 } );

	// Create the default paragraph via the block appender and focus it.
	await page
		.locator( `${ editorContent } [aria-label="Add default block"]` )
		.first()
		.click();
	const editable = page
		.locator( `${ editorContent } [contenteditable="true"]` )
		.first();
	await editable.waitFor( { timeout: 10000 } );
	await editable.click();
}

/**
 * Dispatch a real paste event carrying HTML into the focused editable region.
 *
 * @param {import('@playwright/test').Page} page  Playwright page.
 * @param {string}                          html  The text/html clipboard payload.
 * @param {string}                          plain The text/plain clipboard payload.
 */
async function pasteHtml( page, html, plain ) {
	await page.evaluate(
		( { html: h, plain: p } ) => {
			const editable = document.querySelector(
				'.press-this-editor__content [contenteditable="true"]'
			);
			editable.focus();
			const dt = new DataTransfer();
			dt.setData( 'text/html', h );
			dt.setData( 'text/plain', p );
			editable.dispatchEvent(
				new ClipboardEvent( 'paste', {
					bubbles: true,
					cancelable: true,
					clipboardData: dt,
				} )
			);
		},
		{ html, plain }
	);
}

test.describe( 'Paste Preservation', () => {
	test( 'pasting a table inserts a table block', async ( {
		loggedInPage: page,
	} ) => {
		await loadEditorWithEmptyParagraph( page );

		await pasteHtml(
			page,
			'<table><thead><tr><th>Function</th><th>Component</th></tr></thead><tbody><tr><td>Documents</td><td>Collabora</td></tr></tbody></table>',
			'Function\tComponent\nDocuments\tCollabora'
		);

		await expect(
			page.locator( `${ editorContent } [data-type="core/table"]` )
		).toBeVisible();
		await expect( page.locator( editorContent ) ).toContainText(
			'Collabora'
		);
	} );

	test( 'mixed allowed and non-allowed content all lands', async ( {
		loggedInPage: page,
	} ) => {
		await loadEditorWithEmptyParagraph( page );

		// A table sits between two paragraphs. Under the old allowlist the whole
		// paste was dropped — including the two valid paragraphs.
		await pasteHtml(
			page,
			'<p>Paragraph before the table.</p><table><tbody><tr><td>A</td><td>B</td></tr></tbody></table><p>Paragraph after the table.</p>',
			'Paragraph before the table.\nA\tB\nParagraph after the table.'
		);

		await expect(
			page.locator( `${ editorContent } [data-type="core/table"]` )
		).toBeVisible();
		await expect( page.locator( editorContent ) ).toContainText(
			'Paragraph before the table.'
		);
		await expect( page.locator( editorContent ) ).toContainText(
			'Paragraph after the table.'
		);
	} );

	test( 'inserter stays curated to the focused block set', async ( {
		loggedInPage: page,
	} ) => {
		await page.goto( '/wp-admin/press-this.php' );
		await page.locator( editorContent ).waitFor( { timeout: 10000 } );

		const { inserterTypes, canInsertTable } = await page.evaluate( () => {
			const store = window.wp.data.select( 'core/block-editor' );
			const types = [
				...new Set( store.getInserterItems().map( ( i ) => i.name ) ),
			];
			return {
				inserterTypes: types,
				canInsertTable: store.canInsertBlockType( 'core/table' ),
			};
		} );

		// Non-curated blocks are hidden from the inserter...
		expect( inserterTypes ).not.toContain( 'core/table' );
		expect( inserterTypes ).toContain( 'core/paragraph' );
		// ...but remain insertable, which is what keeps paste working.
		expect( canInsertTable ).toBe( true );
	} );
} );
