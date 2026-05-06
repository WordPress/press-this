/**
 * HTML Selection Preservation E2E Tests
 *
 * Verifies that HTML-formatted text selections sent via postMessage
 * are correctly converted to Gutenberg blocks in the editor.
 *
 * These tests bypass the bookmarklet and send postMessage directly,
 * testing the real code path: App.js handler → htmlToBlocks() → block rendering.
 */
const { test, expect } = require( './utils/auth' );

/**
 * Send a postMessage to the Press This editor with test data.
 *
 * @param {import('@playwright/test').Page} page      Playwright page.
 * @param {Object}                          overrides Fields to override in the message data.
 */
async function sendPostMessage( page, overrides = {} ) {
	const defaults = {
		t: 'Test Page Title',
		s: '',
		sel_html: '',
		u: 'https://example.com/test',
		_meta: {},
		_links: {},
		_images: [],
		_embeds: [],
	};
	await page.evaluate( ( data ) => {
		window.postMessage(
			{
				type: 'press-this-data',
				version: '1.0.0',
				data,
			},
			'*'
		);
	}, { ...defaults, ...overrides } );
}

/**
 * Wait for Gutenberg blocks to appear in the editor content area.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 */
async function waitForBlocks( page ) {
	await page
		.locator( '.press-this-editor__content [data-type]' )
		.first()
		.waitFor( { timeout: 10000 } );
}

/**
 * Navigate to Press This in postMessage mode and wait for the editor.
 *
 * @param {import('@playwright/test').Page} page Playwright page.
 */
async function loadEditor( page ) {
	await page.goto( '/wp-admin/press-this.php?pm=1' );
	await page
		.locator( '.press-this-editor__content' )
		.waitFor( { timeout: 10000 } );

	// The handler accepts only messages whose source is window.opener (the
	// bookmarklet's window). These tests skip the popup mechanics and post
	// from the page itself, so make the page its own opener — event.source
	// will then equal window.opener and the handler runs.
	await page.evaluate( () => {
		if ( ! window.opener ) {
			Object.defineProperty( window, 'opener', {
				value: window,
				configurable: true,
			} );
		}
	} );
}

const editorContent = '.press-this-editor__content';

test.describe( 'HTML Selection Preservation', () => {
	test.describe( 'Core Formatting', () => {
		test( 'bold and italic inline formatting', async ( {
			loggedInPage: page,
		} ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html:
					'<p>This has <strong>bold</strong> and <em>italic</em> text.</p>',
			} );
			await waitForBlocks( page );

			const paragraph = page.locator(
				`${ editorContent } [data-type="core/paragraph"]`
			);
			await expect( paragraph.first() ).toContainText( 'bold' );
			await expect( paragraph.first() ).toContainText( 'italic' );

			// Verify the formatting tags are preserved in the rendered HTML.
			const html = await paragraph.first().innerHTML();
			expect( html ).toContain( '<strong>' );
			expect( html ).toContain( '<em>' );
		} );

		test( 'headings at correct levels', async ( {
			loggedInPage: page,
		} ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html: '<h2>Heading Two</h2><h3>Heading Three</h3>',
			} );
			await waitForBlocks( page );

			const headings = page.locator(
				`${ editorContent } [data-type="core/heading"]`
			);
			await expect( headings ).toHaveCount( 2 );
			await expect( headings.nth( 0 ) ).toContainText(
				'Heading Two'
			);
			await expect( headings.nth( 1 ) ).toContainText(
				'Heading Three'
			);
		} );

		test( 'unordered list', async ( { loggedInPage: page } ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html:
					'<ul><li>Item A</li><li>Item B</li></ul>',
			} );
			await waitForBlocks( page );

			const list = page.locator(
				`${ editorContent } [data-type="core/list"]`
			);
			await expect( list.first() ).toBeVisible();
			await expect( list.first() ).toContainText( 'Item A' );
			await expect( list.first() ).toContainText( 'Item B' );
		} );

		test( 'ordered list', async ( { loggedInPage: page } ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html:
					'<ol><li>First</li><li>Second</li></ol>',
			} );
			await waitForBlocks( page );

			const list = page.locator(
				`${ editorContent } [data-type="core/list"]`
			);
			await expect( list.first() ).toBeVisible();
			await expect( list.first() ).toContainText( 'First' );
			await expect( list.first() ).toContainText( 'Second' );
		} );

		test( 'blockquote', async ( { loggedInPage: page } ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html:
					'<blockquote><p>A quoted passage.</p></blockquote>',
			} );
			await waitForBlocks( page );

			const quote = page.locator(
				`${ editorContent } [data-type="core/quote"]`
			);
			await expect( quote ).toBeVisible();
			await expect( quote ).toContainText( 'A quoted passage.' );
		} );

		test( 'code block', async ( { loggedInPage: page } ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html: '<pre><code>const x = 42;</code></pre>',
			} );
			await waitForBlocks( page );

			const code = page.locator(
				`${ editorContent } [data-type="core/code"]`
			);
			await expect( code ).toBeVisible();
			await expect( code ).toContainText( 'const x = 42;' );
		} );

		test( 'mixed content preserves all block types', async ( {
			loggedInPage: page,
		} ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html: [
					'<h2>Getting Started</h2>',
					'<p>Follow these <strong>steps</strong>:</p>',
					'<ul><li>Install dependencies</li><li>Run the server</li></ul>',
					'<pre><code>npm start</code></pre>',
				].join( '' ),
			} );
			await waitForBlocks( page );

			await expect(
				page.locator(
					`${ editorContent } [data-type="core/heading"]`
				)
			).toBeVisible();
			await expect(
				page.locator(
					`${ editorContent } [data-type="core/paragraph"]`
				).first()
			).toContainText( 'steps' );
			await expect(
				page.locator(
					`${ editorContent } [data-type="core/list"]`
				)
			).toBeVisible();
			await expect(
				page.locator(
					`${ editorContent } [data-type="core/code"]`
				)
			).toBeVisible();
		} );
	} );

	test.describe( 'Backward Compatibility', () => {
		test( 'plain text selection without sel_html produces quote block', async ( {
			loggedInPage: page,
		} ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				s: 'This is a plain text selection that should appear in a quote block.',
				sel_html: '',
			} );
			await waitForBlocks( page );

			const quote = page.locator(
				`${ editorContent } [data-type="core/quote"]`
			);
			await expect( quote ).toBeVisible();
			await expect( quote ).toContainText(
				'plain text selection'
			);
		} );

		test( 'no selection populates title and source only', async ( {
			loggedInPage: page,
		} ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				t: 'Just a Title',
				s: '',
				sel_html: '',
			} );
			await waitForBlocks( page );

			// Title should be populated.
			const titleInput = page.getByLabel( 'Post title' );
			await expect( titleInput ).toHaveValue( 'Just a Title', {
				timeout: 10000,
			} );

			// Source attribution should exist.
			await expect(
				page
					.locator( `${ editorContent }` )
					.getByText( 'Source:' )
			).toBeVisible();

			// No quote block should appear.
			await expect(
				page.locator(
					`${ editorContent } [data-type="core/quote"]`
				)
			).toHaveCount( 0 );
		} );
	} );

	test.describe( 'Security', () => {
		test( 'script tags are stripped', async ( {
			loggedInPage: page,
		} ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html:
					'<p>Safe text</p><script>alert("xss")</script>',
			} );
			await waitForBlocks( page );

			await expect(
				page.locator( `${ editorContent }` )
			).toContainText( 'Safe text' );
			await expect(
				page.locator( `${ editorContent }` )
			).not.toContainText( 'alert' );
		} );

		test( 'dangerous attributes are stripped', async ( {
			loggedInPage: page,
		} ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html:
					'<p onclick="alert(1)" style="color:red" class="danger">Styled text</p>',
			} );
			await waitForBlocks( page );

			const paragraph = page.locator(
				`${ editorContent } [data-type="core/paragraph"]`
			);
			await expect( paragraph.first() ).toContainText(
				'Styled text'
			);

			// Verify no dangerous attributes leaked into the rich text content.
			const hasUnsafeAttrs = await paragraph.first().evaluate( ( el ) => {
				const p = el.querySelector( 'p, [role="document"]' );
				if ( ! p ) {
					return false;
				}
				return (
					p.hasAttribute( 'onclick' ) ||
					p.hasAttribute( 'style' ) ||
					p.getAttribute( 'class' )?.includes( 'danger' )
				);
			} );
			expect( hasUnsafeAttrs ).toBe( false );
		} );

		test( 'javascript: and data: URI schemes are blocked', async ( {
			loggedInPage: page,
		} ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html:
					'<p><a href="javascript:alert(1)">Bad link</a> and <a href="https://safe.example">Good link</a></p>',
			} );
			await waitForBlocks( page );

			// The safe link should be present.
			await expect(
				page.locator(
					`${ editorContent } a[href="https://safe.example"]`
				)
			).toBeVisible();

			// No javascript: href should exist in the editor content.
			const hasJsHref = await page
				.locator( `${ editorContent }` )
				.evaluate( ( el ) => {
					return el.querySelector( 'a[href^="javascript:"]' ) !== null;
				} );
			expect( hasJsHref ).toBe( false );
		} );
	} );

	test.describe( 'Edge Cases', () => {
		test( 'empty sel_html falls back to plain-text description', async ( {
			loggedInPage: page,
		} ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html: '<script>alert(1)</script>',
				s: 'Fallback description text.',
			} );
			await waitForBlocks( page );

			// htmlToBlocks returns empty for script-only input,
			// so the plain-text fallback should be used in a quote block.
			const quote = page.locator(
				`${ editorContent } [data-type="core/quote"]`
			);
			await expect( quote ).toBeVisible();
			await expect( quote ).toContainText(
				'Fallback description text.'
			);
		} );

		test( 'special characters are not double-escaped', async ( {
			loggedInPage: page,
		} ) => {
			await loadEditor( page );
			await sendPostMessage( page, {
				sel_html: '<p>Tom &amp; Jerry</p>',
			} );
			await waitForBlocks( page );

			const paragraph = page.locator(
				`${ editorContent } [data-type="core/paragraph"]`
			);
			// Should render as "Tom & Jerry", not "Tom &amp; Jerry".
			await expect( paragraph.first() ).toContainText(
				'Tom & Jerry'
			);
		} );
	} );
} );
