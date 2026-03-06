<?php
/**
 * Extended HTML parsing tests for Press This.
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for HTML parsing functions.
 */
class Test_Press_This_HTML_Parsing_Extended extends BaseTestCase {

	/**
	 * Test resolve_url with empty input.
	 */
	public function test_resolve_url_empty_input() {
		$this->assertEmpty( press_this_resolve_url( '', 'https://example.com/' ) );
	}

	/**
	 * Test resolve_url with absolute HTTP URL.
	 */
	public function test_resolve_url_absolute_http() {
		$result = press_this_resolve_url( 'https://example.com/page', 'https://other.com/' );
		$this->assertEquals( 'https://example.com/page', $result );
	}

	/**
	 * Test resolve_url with HTTP scheme preserved.
	 */
	public function test_resolve_url_absolute_http_scheme() {
		$result = press_this_resolve_url( 'http://example.com/page', 'https://other.com/' );
		$this->assertEquals( 'http://example.com/page', $result );
	}

	/**
	 * Test resolve_url with protocol-relative URL.
	 */
	public function test_resolve_url_protocol_relative() {
		$result = press_this_resolve_url( '//cdn.example.com/img.jpg', 'https://example.com/' );
		$this->assertEquals( 'https://cdn.example.com/img.jpg', $result );
	}

	/**
	 * Test resolve_url with root-relative URL.
	 */
	public function test_resolve_url_root_relative() {
		$result = press_this_resolve_url( '/images/photo.jpg', 'https://example.com/blog/post' );
		$this->assertEquals( 'https://example.com/images/photo.jpg', $result );
	}

	/**
	 * Test resolve_url with relative path.
	 */
	public function test_resolve_url_relative_path() {
		$result = press_this_resolve_url( 'photo.jpg', 'https://example.com/blog/post' );
		$this->assertEquals( 'https://example.com/blog/photo.jpg', $result );
	}

	/**
	 * Test resolve_url preserves port.
	 */
	public function test_resolve_url_preserves_port() {
		$result = press_this_resolve_url( '/page', 'https://example.com:8080/path' );
		$this->assertEquals( 'https://example.com:8080/page', $result );
	}

	/**
	 * Test resolve_url with invalid base returns empty.
	 */
	public function test_resolve_url_invalid_base() {
		$result = press_this_resolve_url( 'photo.jpg', 'not-a-url' );
		$this->assertEmpty( $result );
	}

	/**
	 * Test data URLs are filtered.
	 */
	public function test_filtered_image_data_url() {
		$this->assertTrue(
			press_this_is_filtered_image( 'data:image/png;base64,abc123', '', 0, 0 )
		);
	}

	/**
	 * Test small width images are filtered.
	 */
	public function test_filtered_image_small_width() {
		$this->assertTrue(
			press_this_is_filtered_image( 'https://example.com/img.jpg', '', 100, 200 )
		);
	}

	/**
	 * Test small height images are filtered.
	 */
	public function test_filtered_image_small_height() {
		$this->assertTrue(
			press_this_is_filtered_image( 'https://example.com/img.jpg', '', 300, 50 )
		);
	}

	/**
	 * Test zero dimensions are not filtered.
	 */
	public function test_filtered_image_zero_dimensions() {
		$this->assertFalse(
			press_this_is_filtered_image( 'https://example.com/img.jpg', '', 0, 0 )
		);
	}

	/**
	 * Test avatar detected by src pattern.
	 */
	public function test_filtered_image_avatar_src() {
		$this->assertTrue(
			press_this_is_filtered_image( 'https://example.com/user-avatar.jpg', '', 0, 0 )
		);
	}

	/**
	 * Test avatar detected by class.
	 */
	public function test_filtered_image_avatar_class() {
		$this->assertTrue(
			press_this_is_filtered_image( 'https://example.com/img.jpg', 'user-avatar-small', 0, 0 )
		);
	}

	/**
	 * Test valid image passes filter.
	 */
	public function test_filtered_image_valid() {
		$this->assertFalse(
			press_this_is_filtered_image( 'https://example.com/photo.jpg', 'wp-image-123', 800, 600 )
		);
	}

	/**
	 * Test title priority: og > twitter > title tag.
	 */
	public function test_parse_title_priority_og() {
		$html = '<html><head>
			<title>Page Title</title>
			<meta name="twitter:title" content="Twitter Title">
			<meta property="og:title" content="OG Title">
		</head><body></body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertEquals( 'OG Title', $metadata['title'] );
	}

	/**
	 * Test title falls back to twitter when no og.
	 */
	public function test_parse_title_fallback_twitter() {
		$html = '<html><head>
			<title>Page Title</title>
			<meta name="twitter:title" content="Twitter Title">
		</head><body></body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertEquals( 'Twitter Title', $metadata['title'] );
	}

	/**
	 * Test title falls back to title tag.
	 */
	public function test_parse_title_fallback_title_tag() {
		$html = '<html><head>
			<title>Page Title</title>
		</head><body></body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertEquals( 'Page Title', $metadata['title'] );
	}

	/**
	 * Test description priority: og > twitter > meta.
	 */
	public function test_parse_description_priority_og() {
		$html = '<html><head>
			<meta name="description" content="Meta Desc">
			<meta name="twitter:description" content="Twitter Desc">
			<meta property="og:description" content="OG Desc">
		</head><body></body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertEquals( 'OG Desc', $metadata['description'] );
	}

	/**
	 * Test description falls back to twitter.
	 */
	public function test_parse_description_fallback_twitter() {
		$html = '<html><head>
			<meta name="description" content="Meta Desc">
			<meta name="twitter:description" content="Twitter Desc">
		</head><body></body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertEquals( 'Twitter Desc', $metadata['description'] );
	}

	/**
	 * Test image extraction from og:image.
	 */
	public function test_parse_images_from_og() {
		$html = '<html><head>
			<meta property="og:image" content="https://example.com/og-image.jpg">
		</head><body></body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertNotEmpty( $metadata['images'] );
		$this->assertStringContainsString( 'og-image.jpg', $metadata['images'][0] );
	}

	/**
	 * Test image extraction from img tags.
	 */
	public function test_parse_images_from_body() {
		$html = '<html><head></head><body>
			<img src="https://example.com/photo.jpg" width="800" height="600">
		</body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertNotEmpty( $metadata['images'] );
		$this->assertStringContainsString( 'photo.jpg', $metadata['images'][0] );
	}

	/**
	 * Test embed extraction from iframes.
	 */
	public function test_parse_embeds_from_iframes() {
		$html = '<html><head></head><body>
			<iframe src="https://www.youtube.com/embed/test123"></iframe>
		</body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertNotEmpty( $metadata['embeds'] );
		$this->assertStringContainsString( 'youtube.com', $metadata['embeds'][0] );
	}

	/**
	 * Test embed extraction from og:video.
	 */
	public function test_parse_embeds_from_og_video() {
		$html = '<html><head>
			<meta property="og:video" content="https://www.youtube.com/embed/abc123">
		</head><body></body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertNotEmpty( $metadata['embeds'] );
		$this->assertStringContainsString( 'youtube.com', $metadata['embeds'][0] );
	}

	/**
	 * Test canonical extraction.
	 */
	public function test_parse_canonical() {
		$html = '<html><head>
			<link rel="canonical" href="https://example.com/canonical-page">
		</head><body></body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertEquals( 'https://example.com/canonical-page', $metadata['canonical'] );
	}

	/**
	 * Test image deduplication.
	 */
	public function test_parse_deduplicates_images() {
		$html = '<html><head>
			<meta property="og:image" content="https://example.com/same.jpg">
		</head><body>
			<img src="https://example.com/same.jpg" width="800" height="600">
		</body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );

		$count = 0;
		foreach ( $metadata['images'] as $url ) {
			if ( false !== strpos( $url, 'same.jpg' ) ) {
				$count++;
			}
		}
		$this->assertEquals( 1, $count, 'Duplicate images should be removed' );
	}

	/**
	 * Test image limit of 50.
	 */
	public function test_parse_limits_images_to_50() {
		$html = '<html><head></head><body>';
		for ( $i = 0; $i < 60; $i++ ) {
			$html .= '<img src="https://example.com/img-' . $i . '.jpg" width="800" height="600">';
		}
		$html .= '</body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertLessThanOrEqual( 50, count( $metadata['images'] ) );
	}

	/**
	 * Test embed limit of 20.
	 */
	public function test_parse_limits_embeds_to_20() {
		$html = '<html><head></head><body>';
		for ( $i = 0; $i < 25; $i++ ) {
			$html .= '<iframe src="https://www.example.com/embed-' . $i . '"></iframe>';
		}
		$html .= '</body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertLessThanOrEqual( 20, count( $metadata['embeds'] ) );
	}

	/**
	 * Test sanitization removes script tags from title.
	 */
	public function test_parse_sanitizes_title() {
		$html = '<html><head>
			<meta property="og:title" content="<script>alert(1)</script>Clean Title">
		</head><body></body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertStringNotContainsString( '<script>', $metadata['title'] );
		$this->assertStringNotContainsString( 'alert', $metadata['title'] );
	}

	/**
	 * Test malformed HTML is handled gracefully.
	 */
	public function test_parse_handles_malformed_html() {
		$html = '<html><head><title>Broken<title></head><body><p>No closing tags<img src="test.jpg">';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );

		$this->assertArrayHasKey( 'title', $metadata );
		$this->assertArrayHasKey( 'images', $metadata );
		$this->assertIsArray( $metadata['images'] );
	}

	/**
	 * Test empty HTML returns default structure.
	 */
	public function test_parse_empty_html() {
		$metadata = press_this_parse_html_metadata( '', 'https://example.com/' );

		$this->assertEquals( '', $metadata['title'] );
		$this->assertEquals( '', $metadata['description'] );
		$this->assertEmpty( $metadata['images'] );
		$this->assertEmpty( $metadata['embeds'] );
		$this->assertEquals( '', $metadata['canonical'] );
	}

	/**
	 * Test about:blank iframes are excluded.
	 */
	public function test_parse_excludes_about_blank_iframes() {
		$html = '<html><head></head><body>
			<iframe src="about:blank"></iframe>
			<iframe src="https://www.youtube.com/embed/real"></iframe>
		</body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );

		foreach ( $metadata['embeds'] as $url ) {
			$this->assertStringNotContainsString( 'about:blank', $url );
		}
	}

	/**
	 * Test description fallback to meta description.
	 */
	public function test_parse_description_fallback_meta() {
		$html = '<html><head>
			<meta name="description" content="Meta Description Only">
		</head><body></body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertEquals( 'Meta Description Only', $metadata['description'] );
	}

	/**
	 * Test og:video:secure_url extraction.
	 */
	public function test_parse_embeds_from_og_video_secure_url() {
		$html = '<html><head>
			<meta property="og:video:secure_url" content="https://www.youtube.com/embed/secure123">
		</head><body></body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );
		$this->assertNotEmpty( $metadata['embeds'] );
	}

	/**
	 * Test relative image URLs are resolved.
	 */
	public function test_parse_resolves_relative_image_urls() {
		$html = '<html><head></head><body>
			<img src="/images/photo.jpg" width="800" height="600">
		</body></html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/blog/post' );
		$this->assertNotEmpty( $metadata['images'] );
		$this->assertStringContainsString( 'example.com', $metadata['images'][0] );
	}
}
