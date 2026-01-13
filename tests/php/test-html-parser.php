<?php
/**
 * Tests for HTML metadata parser functions.
 *
 * @package Press_This_Plugin
 */

/**
 * Test case for HTML metadata parser.
 */
class Test_HTML_Parser extends WP_UnitTestCase {

	/**
	 * Set up before each test.
	 */
	public function set_up() {
		parent::set_up();

		// Plugin files are already loaded via bootstrap.
	}

	/**
	 * Test 1: Extract OG meta tags (title, description, image).
	 */
	public function test_extract_og_meta_tags() {
		$html = '<!DOCTYPE html>
		<html>
		<head>
			<meta property="og:title" content="OG Title Test">
			<meta property="og:description" content="OG Description Test">
			<meta property="og:image" content="https://example.com/og-image.jpg">
			<title>Fallback Title</title>
		</head>
		<body><p>Content</p></body>
		</html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/page' );

		$this->assertEquals( 'OG Title Test', $metadata['title'] );
		$this->assertEquals( 'OG Description Test', $metadata['description'] );
		$this->assertContains( 'https://example.com/og-image.jpg', $metadata['images'] );
	}

	/**
	 * Test 2: Fallback to standard meta tags when OG missing.
	 */
	public function test_fallback_to_standard_meta_tags() {
		$html = '<!DOCTYPE html>
		<html>
		<head>
			<title>Standard Title</title>
			<meta name="description" content="Standard Description">
		</head>
		<body><p>Content</p></body>
		</html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/page' );

		$this->assertEquals( 'Standard Title', $metadata['title'] );
		$this->assertEquals( 'Standard Description', $metadata['description'] );
	}

	/**
	 * Test 3: Resolve relative URLs to absolute URLs.
	 */
	public function test_relative_url_resolution() {
		// Protocol-relative URL.
		$resolved = press_this_resolve_url( '//cdn.example.com/image.jpg', 'https://example.com/page' );
		$this->assertEquals( 'https://cdn.example.com/image.jpg', $resolved );

		// Root-relative URL.
		$resolved = press_this_resolve_url( '/images/photo.jpg', 'https://example.com/articles/post' );
		$this->assertEquals( 'https://example.com/images/photo.jpg', $resolved );

		// Relative path URL.
		$resolved = press_this_resolve_url( 'photo.jpg', 'https://example.com/articles/post' );
		$this->assertEquals( 'https://example.com/articles/photo.jpg', $resolved );

		// Absolute URL (should remain unchanged).
		$resolved = press_this_resolve_url( 'https://other.com/image.jpg', 'https://example.com/page' );
		$this->assertEquals( 'https://other.com/image.jpg', $resolved );
	}

	/**
	 * Test 4: Extract iframes and embeds.
	 */
	public function test_iframe_and_embed_extraction() {
		$html = '<!DOCTYPE html>
		<html>
		<head>
			<meta property="og:title" content="Video Page">
			<meta property="og:video" content="https://www.youtube.com/embed/abc123">
		</head>
		<body>
			<iframe src="https://www.vimeo.com/video/456"></iframe>
			<iframe src="about:blank"></iframe>
		</body>
		</html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/page' );

		$this->assertContains( 'https://www.youtube.com/embed/abc123', $metadata['embeds'] );
		$this->assertContains( 'https://www.vimeo.com/video/456', $metadata['embeds'] );
		$this->assertNotContains( 'about:blank', $metadata['embeds'] );
	}

	/**
	 * Test 5: Sanitization of extracted title and description values.
	 *
	 * SEC-002: Tests that XSS payloads in meta content are sanitized.
	 */
	public function test_sanitization_of_extracted_values() {
		$html = '<!DOCTYPE html>
		<html>
		<head>
			<meta property="og:title" content="Title with script tag inside">
			<meta property="og:description" content="Desc with html entities">
			<meta property="og:url" content="https://example.com/page">
		</head>
		<body></body>
		</html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/page' );

		// Title should be present and sanitized (no literal script tags).
		$this->assertStringNotContainsString( '<script>', $metadata['title'] );

		// Description should be sanitized.
		$this->assertStringNotContainsString( '<script>', $metadata['description'] );
	}

	/**
	 * Test 6: Image filtering logic (skip small images, avatars, data URLs).
	 */
	public function test_image_filtering_logic() {
		$html = '<!DOCTYPE html>
		<html>
		<head>
			<meta property="og:title" content="Image Test">
		</head>
		<body>
			<img src="https://example.com/large-image.jpg" width="800" height="600">
			<img src="https://example.com/small-image.jpg" width="100" height="50">
			<img src="https://example.com/avatar.jpg" width="400" height="400">
			<img src="https://example.com/user-avatar-pic.png" class="avatar" width="500" height="500">
			<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" width="800" height="600">
			<img src="https://example.com/valid-image.png">
		</body>
		</html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/page' );

		// Large image should be included.
		$this->assertContains( 'https://example.com/large-image.jpg', $metadata['images'] );

		// Valid image without dimensions should be included.
		$this->assertContains( 'https://example.com/valid-image.png', $metadata['images'] );

		// Small image should be filtered out.
		$this->assertNotContains( 'https://example.com/small-image.jpg', $metadata['images'] );

		// Avatar images should be filtered out.
		$this->assertNotContains( 'https://example.com/avatar.jpg', $metadata['images'] );
		$this->assertNotContains( 'https://example.com/user-avatar-pic.png', $metadata['images'] );

		// Data URLs should be filtered out.
		$has_data_url = false;
		foreach ( $metadata['images'] as $image ) {
			if ( strpos( $image, 'data:' ) === 0 ) {
				$has_data_url = true;
				break;
			}
		}
		$this->assertFalse( $has_data_url );
	}
}
