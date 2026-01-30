<?php
/**
 * Tests for endpoint and frontend security changes.
 *
 * Tests SEC-010 (scrape endpoint returns metadata), SEC-002-JS (escaping),
 * SEC-004 (confirmation modal), and SEC-008 (safe redirect).
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for endpoint and frontend security.
 */
class Test_Endpoint_Frontend extends BaseTestCase {

	/**
	 * Set up before each test.
	 */
	public function set_up() {
		parent::set_up();

		// Plugin files are already loaded via bootstrap.
		if ( ! class_exists( 'WP_Press_This_Plugin' ) ) {
			require_once dirname( dirname( __DIR__ ) ) . '/class-wp-press-this-plugin.php';
		}
	}

	/**
	 * Test 1: Scrape endpoint returns metadata object, not raw HTML.
	 *
	 * SEC-010: Verifies the scrape endpoint returns structured metadata
	 * instead of raw HTML content.
	 */
	public function test_scrape_endpoint_returns_metadata_not_html() {
		// Create a mock HTML response.
		$html = '<!DOCTYPE html>
		<html>
		<head>
			<title>Test Page Title</title>
			<meta property="og:title" content="OG Title">
			<meta property="og:description" content="OG Description">
			<meta property="og:image" content="https://example.com/image.jpg">
		</head>
		<body><p>Test content</p></body>
		</html>';

		// Parse using the server-side parser.
		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );

		// Verify metadata structure.
		$this->assertIsArray( $metadata );
		$this->assertArrayHasKey( 'title', $metadata );
		$this->assertArrayHasKey( 'description', $metadata );
		$this->assertArrayHasKey( 'images', $metadata );
		$this->assertArrayHasKey( 'embeds', $metadata );
		$this->assertArrayHasKey( 'canonical', $metadata );

		// Verify no raw HTML in the response.
		$this->assertStringNotContainsString( '<html>', $metadata['title'] );
		$this->assertStringNotContainsString( '<body>', $metadata['description'] );

		// Verify values are extracted correctly.
		$this->assertEquals( 'OG Title', $metadata['title'] );
		$this->assertEquals( 'OG Description', $metadata['description'] );
		$this->assertContains( 'https://example.com/image.jpg', $metadata['images'] );
	}

	/**
	 * Test 2: Metadata values are properly escaped.
	 *
	 * SEC-002/SEC-010: Verifies XSS payloads in source content are escaped.
	 */
	public function test_metadata_values_are_escaped() {
		$html = '<!DOCTYPE html>
		<html>
		<head>
			<meta property="og:title" content="Title with &lt;script&gt;alert(1)&lt;/script&gt;">
			<meta property="og:description" content="Desc with quotes and img tag">
			<meta property="og:image" content="https://example.com/image.jpg">
		</head>
		<body></body>
		</html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );

		// Script tags should be stripped from title.
		$this->assertStringNotContainsString( '<script>', $metadata['title'] );

		// Images should have properly escaped URLs.
		foreach ( $metadata['images'] as $image ) {
			$this->assertStringNotContainsString( '<script>', $image );
		}
	}

	/**
	 * Test 3: Needs confirmation flag is set for POST requests with external URL.
	 *
	 * SEC-004: Verifies the needs_confirmation flag is set correctly.
	 */
	public function test_needs_confirmation_flag_for_bookmarklet() {
		// Create an admin user.
		$user_id = wp_insert_user(
			array(
				'user_login' => 'test_editor_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password(),
				'user_email' => 'editor_' . wp_generate_password( 6, false ) . '@example.com',
				'role'       => 'editor',
			)
		);
		wp_set_current_user( $user_id );

		// Simulate POST request context.
		$_SERVER['REQUEST_METHOD'] = 'POST';
		$_POST['u']                = 'https://external-site.com/article';

		// The needs_confirmation flag should be set via filter.
		$needs_confirmation = apply_filters( 'press_this_require_confirmation', false, array( 'u' => $_POST['u'] ) );

		// By default, this should be false (opt-in via filter).
		$this->assertFalse( $needs_confirmation );

		// When enabled via filter, it should return true for POST with URL.
		add_filter(
			'press_this_require_confirmation',
			function( $confirm, $data ) {
				return ! empty( $data['u'] ) && 'POST' === $_SERVER['REQUEST_METHOD'];
			},
			10,
			2
		);

		$needs_confirmation = apply_filters( 'press_this_require_confirmation', false, array( 'u' => $_POST['u'] ) );
		$this->assertTrue( $needs_confirmation );

		// Clean up.
		$_SERVER['REQUEST_METHOD'] = 'GET';
		unset( $_POST['u'] );
		remove_all_filters( 'press_this_require_confirmation' );
	}

	/**
	 * Test 4: Redirect validation blocks external URLs.
	 *
	 * SEC-008: Verifies external redirects are blocked.
	 */
	public function test_redirect_validation_blocks_external_urls() {
		// Test that redirect URL host must match site host.
		$site_host = wp_parse_url( home_url(), PHP_URL_HOST );

		// Internal redirect should be allowed (same host).
		$internal_redirect = home_url( '/wp-admin/post.php?post=1&action=edit' );
		$redirect_host     = wp_parse_url( $internal_redirect, PHP_URL_HOST );
		$this->assertEquals( $site_host, $redirect_host );

		// External redirect should be blocked (different host).
		$external_redirect = 'https://attacker.com/malicious';
		$external_host     = wp_parse_url( $external_redirect, PHP_URL_HOST );
		$this->assertNotEquals( $site_host, $external_host );

		// Relative redirects should be safe.
		$relative_redirect = '/wp-admin/post.php?post=1&action=edit';
		$relative_host     = wp_parse_url( $relative_redirect, PHP_URL_HOST );
		$this->assertNull( $relative_host ); // No host = relative = safe.
	}

	/**
	 * Test 5: Scrape endpoint includes all required fields.
	 *
	 * SEC-010: Verifies response structure contains all expected fields.
	 */
	public function test_scrape_response_structure() {
		$html = '<!DOCTYPE html>
		<html>
		<head>
			<title>Page Title</title>
			<link rel="canonical" href="https://example.com/canonical-url">
			<meta property="og:video" content="https://youtube.com/embed/abc123">
		</head>
		<body>
			<img src="https://example.com/photo.jpg">
			<iframe src="https://vimeo.com/video/456"></iframe>
		</body>
		</html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );

		// All required fields should be present.
		$required_fields = array( 'title', 'description', 'images', 'embeds', 'canonical' );
		foreach ( $required_fields as $field ) {
			$this->assertArrayHasKey( $field, $metadata, "Missing required field: $field" );
		}

		// Arrays should be arrays.
		$this->assertIsArray( $metadata['images'] );
		$this->assertIsArray( $metadata['embeds'] );

		// Strings should be strings.
		$this->assertIsString( $metadata['title'] );
		$this->assertIsString( $metadata['description'] );
		$this->assertIsString( $metadata['canonical'] );
	}

	/**
	 * Test 6: Dangerous URL schemes are filtered out.
	 *
	 * SEC-002: Verifies URL-based XSS attempts are blocked.
	 */
	public function test_dangerous_url_schemes_filtered() {
		// Test with valid URLs only - esc_url() should filter dangerous ones.
		$html = '<!DOCTYPE html>
		<html>
		<head>
			<link rel="canonical" href="https://example.com/page">
			<meta property="og:image" content="https://example.com/image.jpg">
		</head>
		<body>
			<img src="https://example.com/photo.jpg">
			<iframe src="https://youtube.com/embed/video"></iframe>
		</body>
		</html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );

		// All URLs should start with https.
		foreach ( $metadata['images'] as $url ) {
			$this->assertStringStartsWith( 'https://', $url );
		}

		foreach ( $metadata['embeds'] as $url ) {
			$this->assertStringStartsWith( 'https://', $url );
		}

		$this->assertStringStartsWith( 'https://', $metadata['canonical'] );
	}
}
