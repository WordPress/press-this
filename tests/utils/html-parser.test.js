/**
 * Tests for HTML Parser utilities.
 *
 * @package press-this
 */

import {
	escapeHtml,
	escapeAttr,
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

	test( 'creates Vimeo embed block', () => {
		const data = { title: 'Video' };
		const url = 'https://vimeo.com/123456';
		const content = buildSuggestedContent( data, url );
		expect( content ).toContain( '<!-- wp:embed' );
		expect( content ).toContain( '"providerNameSlug":"vimeo"' );
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
