/**
 * Tests for HTML parser utilities, especially htmlToBlocks.
 *
 * @package press-this
 */

import { htmlToBlocks, buildSuggestedContent } from '../../src/utils/html-parser';

describe( 'htmlToBlocks', () => {
	test( 'returns empty string for empty input', () => {
		expect( htmlToBlocks( '' ) ).toBe( '' );
		expect( htmlToBlocks( null ) ).toBe( '' );
		expect( htmlToBlocks( undefined ) ).toBe( '' );
	} );

	test( 'converts a paragraph to a paragraph block', () => {
		const result = htmlToBlocks( '<p>Hello world</p>' );
		expect( result ).toContain( '<!-- wp:paragraph -->' );
		expect( result ).toContain( '<p>Hello world</p>' );
		expect( result ).toContain( '<!-- /wp:paragraph -->' );
	} );

	test( 'converts plain text to a paragraph block', () => {
		const result = htmlToBlocks( 'Plain text content' );
		expect( result ).toContain( '<!-- wp:paragraph -->' );
		expect( result ).toContain( 'Plain text content' );
	} );

	test( 'converts h1-h6 headings to heading blocks', () => {
		[ 1, 2, 3, 4, 5, 6 ].forEach( ( level ) => {
			const result = htmlToBlocks( `<h${ level }>Heading ${ level }</h${ level }>` );
			expect( result ).toContain( `<!-- wp:heading {"level":${ level }} -->` );
			expect( result ).toContain( `<h${ level } class="wp-block-heading">` );
			expect( result ).toContain( `Heading ${ level }` );
			expect( result ).toContain( '<!-- /wp:heading -->' );
		} );
	} );

	test( 'converts unordered list to list block', () => {
		const result = htmlToBlocks( '<ul><li>Item 1</li><li>Item 2</li></ul>' );
		expect( result ).toContain( '<!-- wp:list -->' );
		expect( result ).toContain( '<ul class="wp-block-list">' );
		expect( result ).toContain( '<!-- wp:list-item -->' );
		expect( result ).toContain( '<li>Item 1</li>' );
		expect( result ).toContain( '<li>Item 2</li>' );
		expect( result ).toContain( '<!-- /wp:list-item -->' );
		expect( result ).toContain( '<!-- /wp:list -->' );
		// Should NOT use ordered list attribute.
		expect( result ).not.toContain( '"ordered":true' );
	} );

	test( 'converts ordered list to list block with ordered attribute', () => {
		const result = htmlToBlocks( '<ol><li>First</li><li>Second</li></ol>' );
		expect( result ).toContain( '<!-- wp:list {"ordered":true} -->' );
		expect( result ).toContain( '<ol class="wp-block-list">' );
		expect( result ).toContain( '<!-- wp:list-item -->' );
		expect( result ).toContain( '<li>First</li>' );
		expect( result ).toContain( '<!-- /wp:list -->' );
	} );

	test( 'converts nested lists correctly', () => {
		const html = '<ul><li>Parent<ul><li>Child item</li></ul></li></ul>';
		const result = htmlToBlocks( html );
		// Outer list.
		expect( result ).toContain( '<!-- wp:list -->' );
		// Nested list should also be wrapped.
		const listCount = ( result.match( /<!-- wp:list -->/g ) || [] ).length;
		expect( listCount ).toBeGreaterThanOrEqual( 2 );
		expect( result ).toContain( 'Child item' );
		expect( result ).toContain( 'Parent' );
	} );

	test( 'preserves inline formatting in list items', () => {
		const html = '<ul><li><strong>Bold item</strong></li><li><em>Italic item</em></li></ul>';
		const result = htmlToBlocks( html );
		expect( result ).toContain( '<strong>Bold item</strong>' );
		expect( result ).toContain( '<em>Italic item</em>' );
	} );

	test( 'converts blockquote to quote block', () => {
		const result = htmlToBlocks( '<blockquote><p>Quote text</p></blockquote>' );
		expect( result ).toContain( '<!-- wp:quote -->' );
		expect( result ).toContain( '<blockquote class="wp-block-quote">' );
		expect( result ).toContain( 'Quote text' );
		expect( result ).toContain( '<!-- /wp:quote -->' );
	} );

	test( 'converts pre/code to code block', () => {
		const result = htmlToBlocks( '<pre><code>const x = 1;</code></pre>' );
		expect( result ).toContain( '<!-- wp:code -->' );
		expect( result ).toContain( '<pre class="wp-block-code">' );
		expect( result ).toContain( 'const x = 1;' );
		expect( result ).toContain( '<!-- /wp:code -->' );
	} );

	test( 'handles mix of headings and lists (issue example)', () => {
		const html = `<h3><strong>In Unreal Engine: How to Choose</strong></h3>
<ul>
  <li>Unreal Engine allows developers to switch:
    <ul>
      <li><strong>Deferred Rendering</strong>: Default for most projects.</li>
      <li><strong>Forward Rendering</strong>: For VR projects.</li>
    </ul>
  </li>
</ul>
<p>Each technique aligns with different requirements.</p>`;

		const result = htmlToBlocks( html );

		// Heading should be converted.
		expect( result ).toContain( '<!-- wp:heading {"level":3} -->' );
		expect( result ).toContain( 'In Unreal Engine: How to Choose' );

		// List should be converted.
		expect( result ).toContain( '<!-- wp:list -->' );
		expect( result ).toContain( 'Deferred Rendering' );
		expect( result ).toContain( 'Forward Rendering' );

		// Paragraph should be converted.
		expect( result ).toContain( '<!-- wp:paragraph -->' );
		expect( result ).toContain( 'Each technique aligns' );
	} );

	test( 'strips script elements for safety', () => {
		const html = '<p>Safe text</p><script>alert("xss")</script><p>More text</p>';
		const result = htmlToBlocks( html );
		expect( result ).toContain( 'Safe text' );
		expect( result ).not.toContain( 'alert' );
		expect( result ).not.toContain( '<script>' );
	} );

	test( 'strips event handler attributes for safety', () => {
		const html = '<p onclick="alert(1)">Click me</p>';
		const result = htmlToBlocks( html );
		expect( result ).toContain( 'Click me' );
		expect( result ).not.toContain( 'onclick' );
	} );

	test( 'strips javascript: href for safety', () => {
		const html = '<p><a href="javascript:alert(1)">Link</a></p>';
		const result = htmlToBlocks( html );
		expect( result ).toContain( 'Link' );
		expect( result ).not.toContain( 'javascript:' );
	} );

	test( 'strips data: href for safety', () => {
		const html = '<p><a href="data:text/html,<script>alert(1)</script>">Link</a></p>';
		const result = htmlToBlocks( html );
		expect( result ).toContain( 'Link' );
		expect( result ).not.toContain( 'data:' );
	} );

	test( 'strips vbscript: href for safety', () => {
		const html = '<p><a href="vbscript:MsgBox(1)">Link</a></p>';
		const result = htmlToBlocks( html );
		expect( result ).toContain( 'Link' );
		expect( result ).not.toContain( 'vbscript:' );
	} );

	test( 'unwraps non-allowlist elements but keeps their text', () => {
		// <form>, <button>, <input>, <svg> are not in the allowlist.
		const html = '<p>Before <form>form content</form> after</p>';
		const result = htmlToBlocks( html );
		expect( result ).toContain( 'Before' );
		expect( result ).toContain( 'form content' );
		expect( result ).toContain( 'after' );
		expect( result ).not.toContain( '<form>' );
	} );

	test( 'strips all attributes except href on <a>', () => {
		const html =
			'<p><a href="https://example.com" class="btn" style="color:red">link</a></p>';
		const result = htmlToBlocks( html );
		expect( result ).toContain( '<a href="https://example.com">' );
		expect( result ).not.toContain( 'class=' );
		expect( result ).not.toContain( 'style=' );
	} );

	test( 'does not recurse infinitely on deeply nested blockquotes', () => {
		// Build deeply nested blockquotes beyond the depth limit.
		let html = '<p>Deep</p>';
		for ( let i = 0; i < 8; i++ ) {
			html = `<blockquote>${ html }</blockquote>`;
		}
		// Should not throw or hang; should return some content.
		expect( () => htmlToBlocks( html ) ).not.toThrow();
		const result = htmlToBlocks( html );
		expect( result ).toBeTruthy();
	} );

	test( 'does not recurse infinitely on deeply nested lists', () => {
		// Build a list nested beyond the depth limit (depth > 10).
		let html = '<li>Item</li>';
		for ( let i = 0; i < 15; i++ ) {
			html = `<ul><li>Level ${ i }<ul>${ html }</ul></li></ul>`;
		}
		expect( () => htmlToBlocks( html ) ).not.toThrow();
	} );

	test( 'preserves safe inline elements', () => {
		const html = '<p><strong>bold</strong> and <em>italic</em> and <a href="https://example.com">link</a></p>';
		const result = htmlToBlocks( html );
		expect( result ).toContain( '<strong>bold</strong>' );
		expect( result ).toContain( '<em>italic</em>' );
		expect( result ).toContain( '<a href="https://example.com">link</a>' );
	} );

	test( 'escapes special characters in plain text nodes', () => {
		// DOMParser treats the input as HTML, so & is a real entity to test.
		const result = htmlToBlocks( '<p>Tom &amp; Jerry</p>' );
		expect( result ).toContain( '<!-- wp:paragraph -->' );
		// & should remain as & (or &amp;) in output, not double-escaped.
		expect( result ).toMatch( /Tom (&amp;|&) Jerry/ );
	} );
} );

describe( 'buildSuggestedContent with selectionHtml', () => {
	const sourceUrl = 'https://example.com/article';

	test( 'uses selectionHtml as formatted blocks when provided', () => {
		const result = buildSuggestedContent(
			{
				selectionHtml: '<h2>Title</h2><p>Content</p>',
				description: 'Plain description',
				title: 'Article',
			},
			sourceUrl
		);

		// Should use heading block from selectionHtml.
		expect( result ).toContain( '<!-- wp:heading' );
		expect( result ).toContain( 'Title' );
		// Should NOT put content in a quote block.
		expect( result ).not.toContain( '<!-- wp:quote -->' );
		// Should still add the source attribution.
		expect( result ).toContain( 'Source:' );
		expect( result ).toContain( sourceUrl );
	} );

	test( 'falls back to description in quote block when no selectionHtml', () => {
		const result = buildSuggestedContent(
			{
				description: 'Plain text description',
				title: 'Article',
			},
			sourceUrl
		);

		expect( result ).toContain( '<!-- wp:quote -->' );
		expect( result ).toContain( 'Plain text description' );
		expect( result ).toContain( 'Source:' );
	} );

	test( 'falls back to description when selectionHtml produces no blocks', () => {
		// A selection with only script tags produces empty blocks.
		const result = buildSuggestedContent(
			{
				selectionHtml: '<script>alert(1)</script>',
				description: 'Plain fallback description',
				title: 'Article',
			},
			sourceUrl
		);

		// htmlToBlocks returns '' for script-only input, so description is used.
		expect( result ).toContain( '<!-- wp:quote -->' );
		expect( result ).toContain( 'Plain fallback description' );
	} );

	test( 'renders only source attribution when both selectionHtml and description are absent', () => {
		const result = buildSuggestedContent(
			{ title: 'Article' },
			sourceUrl
		);

		expect( result ).not.toContain( '<!-- wp:quote -->' );
		expect( result ).not.toContain( '<!-- wp:heading' );
		expect( result ).toContain( 'Source:' );
	} );

	test( 'selectionHtml takes priority over description', () => {
		const result = buildSuggestedContent(
			{
				selectionHtml: '<ul><li>List item</li></ul>',
				description: 'Should be ignored when blocks are produced',
			},
			sourceUrl
		);

		expect( result ).toContain( '<!-- wp:list -->' );
		expect( result ).toContain( 'List item' );
		expect( result ).not.toContain( 'Should be ignored' );
	} );
} );
