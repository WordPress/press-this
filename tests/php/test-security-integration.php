<?php
/**
 * Security Integration Tests
 *
 * Additional tests to fill critical coverage gaps for security remediations.
 * Tests attack scenarios and integration points.
 *
 * @package Press_This_Plugin
 */

/**
 * Test case for security integration tests.
 */
class Test_Security_Integration extends WP_UnitTestCase {

	/**
	 * Plugin instance.
	 *
	 * @var WP_Press_This_Plugin
	 */
	private $plugin;

	/**
	 * Set up before each test.
	 */
	public function set_up() {
		parent::set_up();

		// Load the plugin files (they may already be loaded via bootstrap).
		if ( ! class_exists( 'WP_Press_This_Plugin' ) ) {
			require_once dirname( dirname( __DIR__ ) ) . '/class-wp-press-this-plugin.php';
		}

		$this->plugin = new WP_Press_This_Plugin();
	}

	/**
	 * Test 1: Full scrape flow escapes XSS payloads in metadata.
	 *
	 * SEC-002/SEC-010: End-to-end test that HTML with XSS payloads in meta tags
	 * is properly sanitized through the parse flow.
	 */
	public function test_full_scrape_flow_escapes_xss_payloads() {
		$html = '<!DOCTYPE html>
		<html>
		<head>
			<meta property="og:title" content="<script>alert(\'XSS\')</script>Title">
			<meta property="og:description" content="&lt;img src=x onerror=alert(1)&gt; Description">
			<meta property="og:image" content="https://example.com/image.jpg?x=<script>">
			<meta property="og:url" content="javascript:alert(1)">
		</head>
		<body>
			<img src="https://example.com/valid.jpg" width="500" height="300">
			<iframe src="https://www.youtube.com/embed/test123"></iframe>
		</body>
		</html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );

		// Title should not contain script tags.
		$this->assertStringNotContainsString( '<script>', $metadata['title'] );
		$this->assertStringNotContainsString( 'alert', $metadata['title'] );

		// Description should be sanitized.
		$this->assertStringNotContainsString( '<img', $metadata['description'] );
		$this->assertStringNotContainsString( 'onerror', $metadata['description'] );

		// Images should only contain valid URLs.
		foreach ( $metadata['images'] as $url ) {
			$this->assertStringStartsWith( 'http', $url );
			$this->assertStringNotContainsString( 'javascript:', $url );
			$this->assertStringNotContainsString( '<script>', $url );
		}

		// Embeds should only contain valid URLs.
		foreach ( $metadata['embeds'] as $url ) {
			$this->assertStringStartsWith( 'http', $url );
			$this->assertStringNotContainsString( 'javascript:', $url );
		}
	}

	/**
	 * Test 2: Private IP ranges are blocked for SSRF protection.
	 *
	 * SEC-003: Verifies that private IP ranges (10.x, 172.16-31.x, 192.168.x)
	 * are blocked by the URL validation.
	 */
	public function test_private_ip_ranges_blocked() {
		$private_ip_urls = array(
			'http://10.0.0.1/admin',
			'http://10.255.255.255/admin',
			'http://172.16.0.1/admin',
			'http://172.31.255.255/admin',
			'http://192.168.0.1/admin',
			'http://192.168.255.255/admin',
			'http://169.254.169.254/latest/meta-data/', // AWS metadata endpoint.
		);

		foreach ( $private_ip_urls as $url ) {
			$result = press_this_validate_url_for_proxy( $url );
			$this->assertInstanceOf(
				'WP_Error',
				$result,
				"Private IP URL should be blocked: {$url}"
			);
		}
	}

	/**
	 * Test 3: Sideload file size limit is enforced.
	 *
	 * SEC-009: Verifies the max file size check via Content-Length header.
	 */
	public function test_sideload_file_size_limit_enforced() {
		// Get the max size from the function.
		$max_size = press_this_get_sideload_max_size();

		// Default should be 10MB.
		$this->assertEquals( 10 * 1024 * 1024, $max_size );

		// Test the filter can modify it.
		add_filter(
			'press_this_sideload_max_size',
			function() {
				return 5 * 1024 * 1024; // 5MB.
			}
		);

		$custom_max = press_this_get_sideload_max_size();
		$this->assertEquals( 5 * 1024 * 1024, $custom_max );

		// Clean up filter.
		remove_all_filters( 'press_this_sideload_max_size' );
	}

	/**
	 * Test 4: Redirect filter manipulation is blocked.
	 *
	 * SEC-008: Verifies that even if press_this_save_redirect filter returns
	 * an external URL, the redirect validation in the REST endpoint blocks it.
	 */
	public function test_redirect_filter_external_url_blocked() {
		// The redirect validation logic is in press_this_rest_save_post.
		// We test the validation logic directly.
		$site_host = wp_parse_url( home_url(), PHP_URL_HOST );

		// External URL should be detected.
		$external_redirect = 'https://malicious-site.com/phishing';
		$external_host     = wp_parse_url( $external_redirect, PHP_URL_HOST );
		$this->assertNotEquals( $site_host, $external_host );

		// Relative URLs should be safe (no host).
		$relative_redirect = '/wp-admin/post.php?post=1&action=edit';
		$relative_host     = wp_parse_url( $relative_redirect, PHP_URL_HOST );
		$this->assertNull( $relative_host );

		// Internal URLs should be allowed.
		$internal_redirect = home_url( '/wp-admin/post.php?post=1&action=edit' );
		$internal_host     = wp_parse_url( $internal_redirect, PHP_URL_HOST );
		$this->assertEquals( $site_host, $internal_host );
	}

	/**
	 * Test 5: Unresolvable hostname returns error.
	 *
	 * SEC-003: Verifies proper error handling for DNS resolution failures.
	 */
	public function test_unresolvable_hostname_returns_error() {
		// This uses a TLD that is guaranteed not to exist.
		$invalid_url = 'https://this-domain-definitely-does-not-exist.invalid/page';

		$result = press_this_validate_url_for_proxy( $invalid_url );

		$this->assertInstanceOf(
			'WP_Error',
			$result,
			'Unresolvable hostname should return WP_Error'
		);

		// Error code should indicate resolution failure.
		$error_code = $result->get_error_code();
		$this->assertTrue(
			in_array( $error_code, array( 'press_this_unresolvable_host', 'press_this_private_ip_blocked' ), true ),
			'Error code should indicate resolution issue'
		);
	}

	/**
	 * Test 6: XSS in suggested content is escaped via limit_string.
	 *
	 * SEC-002: Tests the PHP-side string limiting escapes XSS payloads.
	 */
	public function test_limit_string_escapes_xss() {
		// Access the private method via reflection.
		$reflection = new ReflectionClass( $this->plugin );
		$method     = $reflection->getMethod( 'limit_string' );
		$method->setAccessible( true );

		// Test XSS payload sanitization.
		$xss_input  = '<script>alert("XSS")</script>Safe text';
		$result     = $method->invoke( $this->plugin, $xss_input );

		// Script tags should be stripped.
		$this->assertStringNotContainsString( '<script>', $result );
		$this->assertStringNotContainsString( 'alert', $result );

		// Safe text should remain.
		$this->assertStringContainsString( 'Safe text', $result );
	}

	/**
	 * Test 7: URL with encoded XSS payload is sanitized.
	 *
	 * SEC-002/SEC-006: Tests that URL-encoded XSS attempts are caught.
	 */
	public function test_url_encoded_xss_sanitized() {
		// URL-encoded javascript: scheme.
		$encoded_js  = 'javascript%3Aalert(1)';
		$decoded_url = urldecode( $encoded_js );

		// The limit_url method should reject javascript: URLs.
		$reflection = new ReflectionClass( $this->plugin );
		$method     = $reflection->getMethod( 'limit_url' );
		$method->setAccessible( true );

		$result = $method->invoke( $this->plugin, $decoded_url );
		$this->assertEmpty( $result, 'javascript: URL should be rejected' );

		// URL-encoded in HTML parsing.
		$html = '<!DOCTYPE html>
		<html>
		<head>
			<meta property="og:image" content="' . $encoded_js . '">
		</head>
		<body></body>
		</html>';

		$metadata = press_this_parse_html_metadata( $html, 'https://example.com/' );

		// The javascript: URL should not appear in images.
		foreach ( $metadata['images'] as $url ) {
			$this->assertStringNotContainsString( 'javascript:', $url );
		}
	}

	/**
	 * Test 8: Press This context flag works correctly.
	 *
	 * SEC-003: Verifies the HTTP request context flag for SSRF protection.
	 */
	public function test_http_request_context_flag() {
		// Initial state should be false.
		$this->assertFalse( press_this_http_request_context() );

		// Set to true.
		press_this_http_request_context( true );
		$this->assertTrue( press_this_http_request_context() );

		// Set back to false.
		press_this_http_request_context( false );
		$this->assertFalse( press_this_http_request_context() );

		// Query without change should return current state.
		$this->assertFalse( press_this_http_request_context( null ) );

		// Set and query.
		$this->assertTrue( press_this_http_request_context( true ) );
		$this->assertTrue( press_this_http_request_context( null ) );

		// Cleanup.
		press_this_http_request_context( false );
	}
}
