<?php
/**
 * Tests for SSRF Protection and URL Validation (SEC-003, SEC-006, SEC-007).
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for SSRF Protection and URL Validation.
 */
class Test_SSRF_URL_Validation extends BaseTestCase {

	/**
	 * Plugin instance.
	 *
	 * @var WP_Press_This_Plugin
	 */
	protected $plugin;

	/**
	 * Set up before each test.
	 */
	public function set_up() {
		parent::set_up();

		// Load the plugin class.
		require_once dirname( dirname( __DIR__ ) ) . '/class-wp-press-this-plugin.php';

		$this->plugin = new WP_Press_This_Plugin();
	}

	/**
	 * Test 1: Localhost blocking - IPv4 and hostname variants.
	 *
	 * Verifies that common localhost patterns are blocked by the URL validation.
	 *
	 * @covers press_this_validate_url_for_proxy
	 */
	public function test_localhost_blocking_ipv4_and_hostname() {
		$localhost_urls = array(
			'http://127.0.0.1/admin',
			'http://localhost/admin',
			'http://127.0.0.2/admin',
			'http://127.255.255.255/admin',
			'http://0.0.0.0/admin',
		);

		foreach ( $localhost_urls as $url ) {
			$result = press_this_validate_url_for_proxy( $url );
			$this->assertInstanceOf(
				'WP_Error',
				$result,
				"URL should be blocked: {$url}"
			);
		}
	}

	/**
	 * Test 2: IPv6 localhost blocking - standard and bracketed notation.
	 *
	 * Verifies that IPv6 localhost variants (::1, [::1]) are blocked.
	 *
	 * @covers press_this_validate_url_for_proxy
	 */
	public function test_localhost_blocking_ipv6() {
		$ipv6_localhost_urls = array(
			'http://[::1]/admin',
			'http://[0:0:0:0:0:0:0:1]/admin',
		);

		foreach ( $ipv6_localhost_urls as $url ) {
			$result = press_this_validate_url_for_proxy( $url );
			$this->assertInstanceOf(
				'WP_Error',
				$result,
				"IPv6 localhost URL should be blocked: {$url}"
			);
		}
	}

	/**
	 * Test 3: IPv4-mapped IPv6 localhost blocking (SEC-007).
	 *
	 * Verifies that IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1 are blocked.
	 *
	 * @covers press_this_validate_url_for_proxy
	 */
	public function test_ipv4_mapped_ipv6_localhost_blocking() {
		$mapped_urls = array(
			'http://[::ffff:127.0.0.1]/admin',
			'http://[::ffff:127.0.0.2]/admin',
		);

		foreach ( $mapped_urls as $url ) {
			$result = press_this_validate_url_for_proxy( $url );
			$this->assertInstanceOf(
				'WP_Error',
				$result,
				"IPv4-mapped IPv6 localhost URL should be blocked: {$url}"
			);
		}
	}

	/**
	 * Test 4: URL scheme restriction - only HTTP/HTTPS allowed (SEC-006).
	 *
	 * Verifies that non-HTTP(S) schemes like javascript:, data:, file: are rejected.
	 *
	 * @covers WP_Press_This_Plugin::limit_url (via reflection)
	 */
	public function test_url_scheme_restriction() {
		// Use reflection to access private limit_url method.
		$reflection = new ReflectionClass( $this->plugin );
		$method     = $reflection->getMethod( 'limit_url' );
		$method->setAccessible( true );

		$invalid_scheme_urls = array(
			'javascript:alert(1)',
			'data:text/html,<script>alert(1)</script>',
			'file:///etc/passwd',
			'ftp://example.com/file',
			'mailto:test@example.com',
		);

		foreach ( $invalid_scheme_urls as $url ) {
			$result = $method->invoke( $this->plugin, $url );
			$this->assertEmpty(
				$result,
				"URL with non-HTTP(S) scheme should be rejected: {$url}"
			);
		}

		// Valid HTTP/HTTPS URLs should be accepted.
		$valid_urls = array(
			'http://example.com/page',
			'https://example.com/page',
		);

		foreach ( $valid_urls as $url ) {
			$result = $method->invoke( $this->plugin, $url );
			$this->assertNotEmpty(
				$result,
				"Valid HTTP(S) URL should be accepted: {$url}"
			);
		}
	}

	/**
	 * Test 5: URL length validation - 2048 character limit (SEC-006).
	 *
	 * Verifies that URLs exceeding 2048 characters are rejected.
	 *
	 * @covers WP_Press_This_Plugin::limit_url (via reflection)
	 */
	public function test_url_length_limit() {
		// Use reflection to access private limit_url method.
		$reflection = new ReflectionClass( $this->plugin );
		$method     = $reflection->getMethod( 'limit_url' );
		$method->setAccessible( true );

		// Create a URL that exceeds 2048 characters.
		$long_url = 'https://example.com/page?' . str_repeat( 'x', 2040 );

		$result = $method->invoke( $this->plugin, $long_url );
		$this->assertEmpty(
			$result,
			'URL exceeding 2048 characters should be rejected'
		);

		// URL within limit should be accepted.
		$valid_url = 'https://example.com/page?q=' . str_repeat( 'x', 100 );
		$result    = $method->invoke( $this->plugin, $valid_url );
		$this->assertNotEmpty(
			$result,
			'URL within 2048 character limit should be accepted'
		);
	}

	/**
	 * Test 6: Valid public URLs are accepted.
	 *
	 * Verifies that legitimate public URLs pass validation.
	 *
	 * @covers press_this_validate_url_for_proxy
	 */
	public function test_valid_public_urls_accepted() {
		$valid_urls = array(
			'https://example.com/article',
			'https://wordpress.org/plugins/',
			'http://example.org/page?query=value',
		);

		foreach ( $valid_urls as $url ) {
			$result = press_this_validate_url_for_proxy( $url );
			$this->assertTrue(
				true === $result || ! is_wp_error( $result ),
				"Valid public URL should be accepted: {$url}"
			);
		}
	}
}
