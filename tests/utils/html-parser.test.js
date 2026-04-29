/**
 * Tests for HTML parser utilities.
 *
 * @package press-this
 */

import {
	escapeHtml,
	escapeAttr,
	htmlToBlocks,
	parseHtmlMetadata,
	buildSuggestedContent,
	buildSuggestedContentFromMetadata,
} from '../../src/utils/html-parser';

describe( 'escapeHtml', () => {
	test( 'escapes ampersand', () => {
		expect( escapeHtml( 'foo & bar' ) ).toBe( 'foo &amp; bar' );
	} );

	test( 'escapes less-than', () => {
		expect( escapeHtml( '<script>' ) ).toBe( '&lt;script&gt;' );
	} );

	test( 'escapes greater-than', () => {
		expect( escapeHtml( 'a > b' ) ).toBe( 'a &gt; b' );
	} );

	test( 'escapes double quotes', () => {
		expect( escapeHtml( 'say "hello"' ) ).toBe(
			'say &quot;hello&quot;'
		);
	} );

	test( 'escapes single quotes', () => {
		expect( escapeHtml( "it's" ) ).toBe( 'it&#039;s' );
	} );

	test( 'escapes all special characters together', () => {
		expect( escapeHtml( '<a href="x">&\'test' ) ).toBe(
			'&lt;a href=&quot;x&quot;&gt;&amp;&#039;test'
		);
	} );

	test( 'returns empty string for non-string input (number)', () => {
		expect( escapeHtml( 42 ) ).toBe( '' );
	} );

	test( 'returns empty string for null', () => {
		expect( escapeHtml( null ) ).toBe( '' );
	} );

	test( 'returns empty string for undefined', () => {
		expect( escapeHtml( undefined ) ).toBe( '' );
	} );

	test( 'returns empty string for empty string', () => {
		expect( escapeHtml( '' ) ).toBe( '' );
	} );
} );

describe( 'escapeAttr', () => {
	test( 'escapes ampersand', () => {
		expect( escapeAttr( 'a & b' ) ).toBe( 'a &amp; b' );
	} );

	test( 'escapes double quotes', () => {
		expect( escapeAttr( 'say "hi"' ) ).toBe( 'say &quot;hi&quot;' );
	} );

	test( 'escapes single quotes', () => {
		expect( escapeAttr( "it's" ) ).toBe( 'it&#039;s' );
	} );

	test( 'does NOT escape less-than', () => {
		expect( escapeAttr( 'a < b' ) ).toBe( 'a < b' );
	} );

	test( 'does NOT escape greater-than', () => {
		expect( escapeAttr( 'a > b' ) ).toBe( 'a > b' );
	} );

	test( 'returns empty string for non-string', () => {
		expect( escapeAttr( 123 ) ).toBe( '' );
	} );
} );

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

describe( 'parseHtmlMetadata', () => {
	const baseUrl = 'https://example.com/page';

	test( 'extracts og:title', () => {
		const html = '<html><head><meta property="og:title" content="OG Title" /></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.title ).toBe( 'OG Title' );
	} );

	test( 'falls back to twitter:title when og:title missing', () => {
		const html = '<html><head><meta name="twitter:title" content="Twitter Title" /></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.title ).toBe( 'Twitter Title' );
	} );

	test( 'falls back to document title', () => {
		const html = '<html><head><title>Document Title</title></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.title ).toBe( 'Document Title' );
	} );

	test( 'extracts JSON-LD headline as title fallback', () => {
		const html = '<html><head><script type="application/ld+json">{"@type":"Article","headline":"JSON-LD Headline"}</script></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.title ).toBe( 'JSON-LD Headline' );
	} );

	test( 'extracts og:description', () => {
		const html = '<html><head><meta property="og:description" content="OG Description" /></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.description ).toBe( 'OG Description' );
	} );

	test( 'falls back to twitter:description', () => {
		const html = '<html><head><meta name="twitter:description" content="Twitter Desc" /></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.description ).toBe( 'Twitter Desc' );
	} );

	test( 'falls back to meta description', () => {
		const html = '<html><head><meta name="description" content="Meta Desc" /></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.description ).toBe( 'Meta Desc' );
	} );

	test( 'falls back to first paragraph content', () => {
		const longText = 'This is a long enough paragraph that should be extracted as a description fallback when no meta tags are present in the HTML document.';
		const html = '<html><head></head><body><article><p>' + longText + '</p></article></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.description ).toBe( longText );
	} );

	test( 'extracts og:site_name', () => {
		const html = '<html><head><meta property="og:site_name" content="My Site" /></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.siteName ).toBe( 'My Site' );
	} );

	test( 'extracts og:image', () => {
		const html = '<html><head><meta property="og:image" content="https://example.com/image.jpg" /></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.image ).toBe( 'https://example.com/image.jpg' );
	} );

	test( 'falls back to twitter:image', () => {
		const html = '<html><head><meta name="twitter:image" content="https://example.com/tw.jpg" /></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.image ).toBe( 'https://example.com/tw.jpg' );
	} );

	test( 'extracts JSON-LD image as string', () => {
		const html = '<html><head><script type="application/ld+json">{"@type":"Article","headline":"Test","image":"https://example.com/ld.jpg"}</script></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.image ).toBe( 'https://example.com/ld.jpg' );
	} );

	test( 'extracts JSON-LD image as object with url', () => {
		const html = '<html><head><script type="application/ld+json">{"@type":"Article","headline":"Test","image":{"url":"https://example.com/obj.jpg"}}</script></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.image ).toBe( 'https://example.com/obj.jpg' );
	} );

	test( 'extracts JSON-LD image as array of strings', () => {
		const html = '<html><head><script type="application/ld+json">{"@type":"Article","headline":"Test","image":["https://example.com/arr.jpg"]}</script></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.image ).toBe( 'https://example.com/arr.jpg' );
	} );

	test( 'extracts JSON-LD image as array of objects', () => {
		const html = '<html><head><script type="application/ld+json">{"@type":"Article","headline":"Test","image":[{"url":"https://example.com/arrobj.jpg"}]}</script></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.image ).toBe( 'https://example.com/arrobj.jpg' );
	} );

	test( 'extracts canonical from link tag', () => {
		const html = '<html><head><link rel="canonical" href="https://example.com/canonical" /></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.canonical ).toBe( 'https://example.com/canonical' );
	} );

	test( 'falls back to og:url for canonical', () => {
		const html = '<html><head><meta property="og:url" content="https://example.com/og-url" /></head><body></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.canonical ).toBe( 'https://example.com/og-url' );
	} );

	test( 'extracts images from img tags', () => {
		const html = '<html><head></head><body><img src="https://example.com/photo.jpg" /></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.images ).toContain( 'https://example.com/photo.jpg' );
	} );

	test( 'resolves relative image URLs', () => {
		const html = '<html><head></head><body><img src="/images/photo.jpg" /></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.images ).toContain( 'https://example.com/images/photo.jpg' );
	} );

	test( 'skips data URIs in images', () => {
		const html = '<html><head></head><body><img src="data:image/png;base64,abc123" /></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.images ).toHaveLength( 0 );
	} );

	test( 'filters ad/tracking images', () => {
		const html = '<html><head></head><body><img src="https://example.com/ads/banner.jpg" /><img src="https://pixel.quantserve.com/pixel.gif" /><img src="https://example.com/share-this/icon.png" /></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.images ).toHaveLength( 0 );
	} );

	test( 'limits images to 20', () => {
		const imgTags = Array.from( { length: 25 }, ( _, i ) => '<img src="https://example.com/img' + i + '.jpg" />' ).join( '' );
		const html = '<html><head></head><body>' + imgTags + '</body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.images.length ).toBeLessThanOrEqual( 20 );
	} );

	test( 'deduplicates images', () => {
		const html = '<html><head></head><body><img src="https://example.com/photo.jpg" /><img src="https://example.com/photo.jpg" /></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.images ).toHaveLength( 1 );
	} );

	test( 'extracts YouTube embed from iframe', () => {
		const html = '<html><head></head><body><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.embeds ).toContain( 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' );
	} );

	test( 'extracts Vimeo embed from iframe', () => {
		const html = '<html><head></head><body><iframe src="https://player.vimeo.com/video/123456"></iframe></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.embeds ).toContain( 'https://vimeo.com/123456' );
	} );

	test( 'extracts Dailymotion embed from iframe', () => {
		const html = '<html><head></head><body><iframe src="https://www.dailymotion.com/embed/video/x7tgad0"></iframe></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.embeds ).toContain( 'https://www.dailymotion.com/video/x7tgad0' );
	} );

	test( 'extracts video tag source', () => {
		const html = '<html><head></head><body><video src="https://example.com/video.mp4"></video></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.embeds ).toContain( 'https://example.com/video.mp4' );
	} );

	test( 'extracts iframe with twitter.com URL', () => {
		const html = '<html><head></head><body><iframe src="https://twitter.com/user/status/12345"></iframe></body></html>';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.embeds ).toContain( 'https://twitter.com/user/status/12345' );
	} );

	test( 'handles malformed HTML gracefully', () => {
		const html = '<html><head><meta property="og:title" content="Test"><p>unclosed paragraph<div>unclosed div';
		const result = parseHtmlMetadata( html, baseUrl );
		expect( result.title ).toBe( 'Test' );
	} );

	test( 'handles empty HTML', () => {
		const result = parseHtmlMetadata( '', baseUrl );
		expect( result.title ).toBe( '' );
		expect( result.description ).toBe( '' );
		expect( result.images ).toEqual( [] );
		expect( result.embeds ).toEqual( [] );
	} );
} );

describe( 'buildSuggestedContent', () => {
	test( 'creates quote block from description', () => {
		const data = { description: 'A great quote' };
		const content = buildSuggestedContent( data, 'https://example.com' );
		expect( content ).toContain( '<!-- wp:quote -->' );
		expect( content ).toContain( 'A great quote' );
	} );

	test( 'creates source attribution with title', () => {
		const data = { title: 'Page Title' };
		const content = buildSuggestedContent( data, 'https://example.com' );
		expect( content ).toContain( 'Source:' );
		expect( content ).toContain( 'Page Title' );
		expect( content ).toContain( 'href="https://example.com"' );
	} );

	test( 'uses siteName as fallback link text', () => {
		const data = { siteName: 'Example Site' };
		const content = buildSuggestedContent( data, 'https://example.com' );
		expect( content ).toContain( 'Example Site' );
	} );

	test( 'uses sourceUrl as fallback link text when no title or siteName', () => {
		const data = {};
		const content = buildSuggestedContent( data, 'https://example.com' );
		expect( content ).toContain( '>https://example.com</a>' );
	} );

	test( 'creates YouTube embed block', () => {
		const data = { title: 'Video' };
		const url = 'https://www.youtube.com/watch?v=test123';
		const content = buildSuggestedContent( data, url );
		expect( content ).toContain( '<!-- wp:embed' );
		expect( content ).toContain( '"providerNameSlug":"youtube"' );
	} );

	// https://github.com/WordPress/press-this/issues/125
	// Gutenberg's core/embed save() emits the provider class twice — once as
	// `is-provider-X` and once as `wp-block-embed-X`. Missing the second
	// breaks block validation and the editor shows
	// "Block contains unexpected or invalid content" instead of the preview.
	test( 'YouTube embed figure className matches core/embed save() output', () => {
		const data = { title: 'Video' };
		const url = 'https://www.youtube.com/watch?v=test123';
		const content = buildSuggestedContent( data, url );
		expect( content ).toContain(
			'class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube"'
		);
	} );

	test( 'creates Vimeo embed block', () => {
		const data = { title: 'Video' };
		const url = 'https://vimeo.com/123456';
		const content = buildSuggestedContent( data, url );
		expect( content ).toContain( '<!-- wp:embed' );
		expect( content ).toContain( '"providerNameSlug":"vimeo"' );
	} );

	test( 'Vimeo embed figure className matches core/embed save() output', () => {
		const data = { title: 'Video' };
		const url = 'https://vimeo.com/123456';
		const content = buildSuggestedContent( data, url );
		expect( content ).toContain(
			'class="wp-block-embed is-type-video is-provider-vimeo wp-block-embed-vimeo"'
		);
	} );

	test( 'does not create embed block for non-embeddable URLs', () => {
		const data = { title: 'Page' };
		const content = buildSuggestedContent( data, 'https://example.com/article' );
		expect( content ).not.toContain( '<!-- wp:embed' );
	} );

	test( 'escapes HTML in description', () => {
		const data = { description: '<script>alert("xss")</script>' };
		const content = buildSuggestedContent( data, 'https://example.com' );
		expect( content ).not.toContain( '<script>' );
		expect( content ).toContain( '&lt;script&gt;' );
	} );

	test( 'escapes attribute characters in URL', () => {
		const data = { title: 'Test' };
		const url = 'https://example.com/page?a="b"';
		const content = buildSuggestedContent( data, url );
		expect( content ).toContain( 'href="https://example.com/page?a=&quot;b&quot;"' );
	} );

	test( 'handles empty data gracefully', () => {
		const content = buildSuggestedContent( {}, 'https://example.com' );
		expect( content ).toContain( 'Source:' );
		expect( content ).not.toContain( '<!-- wp:quote -->' );
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

describe( 'buildSuggestedContentFromMetadata', () => {
	test( 'uses canonical URL when available', () => {
		const data = {
			title: 'Test',
			canonical: 'https://example.com/canonical',
			url: 'https://example.com/url',
		};
		const content = buildSuggestedContentFromMetadata( data );
		expect( content ).toContain( 'href="https://example.com/canonical"' );
	} );

	test( 'falls back to url when no canonical', () => {
		const data = {
			title: 'Test',
			url: 'https://example.com/url',
		};
		const content = buildSuggestedContentFromMetadata( data );
		expect( content ).toContain( 'href="https://example.com/url"' );
	} );

	test( 'falls back to empty string when no canonical or url', () => {
		const data = { title: 'Test' };
		const content = buildSuggestedContentFromMetadata( data );
		expect( content ).toContain( 'href=""' );
	} );
} );
