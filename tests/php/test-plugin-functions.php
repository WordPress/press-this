<?php
/**
 * Tests for standalone plugin functions.
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for standalone functions in press-this-plugin.php.
 */
class Test_Press_This_Plugin_Functions extends BaseTestCase {

	/**
	 * Editor user ID.
	 *
	 * @var int
	 */
	private $editor_user_id;

	/**
	 * Subscriber user ID.
	 *
	 * @var int
	 */
	private $subscriber_user_id;

	/**
	 * Set up before each test.
	 */
	public function set_up() {
		parent::set_up();

		if ( ! class_exists( 'WP_Press_This_Plugin' ) ) {
			require_once dirname( dirname( __DIR__ ) ) . '/class-wp-press-this-plugin.php';
		}

		$this->editor_user_id = wp_insert_user(
			array(
				'user_login' => 'func_editor_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password(),
				'user_email' => 'func_editor_' . wp_generate_password( 6, false ) . '@example.com',
				'role'       => 'editor',
			)
		);

		$this->subscriber_user_id = wp_insert_user(
			array(
				'user_login' => 'func_sub_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password(),
				'user_email' => 'func_sub_' . wp_generate_password( 6, false ) . '@example.com',
				'role'       => 'subscriber',
			)
		);
	}

	/**
	 * Tear down after each test.
	 */
	public function tear_down() {
		parent::tear_down();
		remove_all_filters( 'press_this_enable_url_proxy' );
		remove_all_filters( 'press_this_sideload_allowed_types' );
		remove_all_filters( 'press_this_sideload_max_size' );
		press_this_http_request_context( false );
	}

	/**
	 * Test is_compatible returns true for current WP version.
	 */
	public function test_is_compatible_returns_true() {
		$this->assertTrue( press_this_is_compatible() );
	}

	/**
	 * Test proxy is disabled by default.
	 */
	public function test_proxy_disabled_by_default() {
		$this->assertFalse( press_this_is_proxy_enabled() );
	}

	/**
	 * Test proxy can be enabled via filter.
	 */
	public function test_proxy_enabled_via_filter() {
		add_filter( 'press_this_enable_url_proxy', '__return_true' );
		$this->assertTrue( press_this_is_proxy_enabled() );
	}

	/**
	 * Test get_editor_url without URL parameter.
	 */
	public function test_get_editor_url_without_url() {
		$url = press_this_get_editor_url();
		$this->assertStringContainsString( 'press-this.php', $url );
		$this->assertStringNotContainsString( 'u=', $url );
	}

	/**
	 * Test get_editor_url with URL parameter.
	 */
	public function test_get_editor_url_with_url() {
		$url = press_this_get_editor_url( 'https://example.com/article' );
		$this->assertStringContainsString( 'press-this.php', $url );
		$this->assertStringContainsString( 'u=', $url );
		$this->assertStringContainsString( 'example.com', $url );
	}

	/**
	 * Test get_shortcut_link returns a string.
	 */
	public function test_get_shortcut_link_returns_string() {
		$link = press_this_get_shortcut_link();
		$this->assertIsString( $link );
	}

	/**
	 * Test get_shortcut_link strips whitespace characters.
	 */
	public function test_get_shortcut_link_no_whitespace() {
		$link = press_this_get_shortcut_link();
		if ( ! empty( $link ) ) {
			$this->assertStringNotContainsString( "\n", $link );
			$this->assertStringNotContainsString( "\r", $link );
			$this->assertStringNotContainsString( "\t", $link );
		}
	}

	/**
	 * Test tool_box renders for capable user.
	 */
	public function test_tool_box_renders_for_editor() {
		wp_set_current_user( $this->editor_user_id );

		ob_start();
		press_this_tool_box();
		$output = ob_get_clean();

		$this->assertStringContainsString( 'Press This', $output );
		$this->assertStringContainsString( 'pressthis', $output );
	}

	/**
	 * Test tool_box is hidden for subscriber.
	 */
	public function test_tool_box_hidden_for_subscriber() {
		wp_set_current_user( $this->subscriber_user_id );

		ob_start();
		press_this_tool_box();
		$output = ob_get_clean();

		$this->assertEmpty( $output );
	}

	/**
	 * Test sideload allowed types defaults.
	 */
	public function test_sideload_allowed_types_defaults() {
		$types = press_this_get_sideload_allowed_types();

		$this->assertContains( 'image/jpeg', $types );
		$this->assertContains( 'image/png', $types );
		$this->assertContains( 'image/gif', $types );
		$this->assertContains( 'image/webp', $types );
	}

	/**
	 * Test sideload allowed types can be filtered.
	 */
	public function test_sideload_allowed_types_filter() {
		add_filter(
			'press_this_sideload_allowed_types',
			function () {
				return array( 'image/svg+xml' );
			}
		);

		$types = press_this_get_sideload_allowed_types();
		$this->assertEquals( array( 'image/svg+xml' ), $types );
	}

	/**
	 * Test sideload max size defaults to 10MB.
	 */
	public function test_sideload_max_size_default() {
		$max = press_this_get_sideload_max_size();
		$this->assertEquals( 10 * 1024 * 1024, $max );
	}

	/**
	 * Test sideload max size can be filtered.
	 */
	public function test_sideload_max_size_filter() {
		add_filter(
			'press_this_sideload_max_size',
			function () {
				return 5 * 1024 * 1024;
			}
		);

		$max = press_this_get_sideload_max_size();
		$this->assertEquals( 5 * 1024 * 1024, $max );
	}

	/**
	 * Test HTTP context starts as false.
	 */
	public function test_http_context_default_false() {
		press_this_http_request_context( false );
		$this->assertFalse( press_this_http_request_context() );
	}

	/**
	 * Test HTTP context can be enabled.
	 */
	public function test_http_context_enable() {
		press_this_http_request_context( true );
		$this->assertTrue( press_this_http_request_context() );
		press_this_http_request_context( false );
	}

	/**
	 * Test HTTP context can be disabled.
	 */
	public function test_http_context_disable() {
		press_this_http_request_context( true );
		press_this_http_request_context( false );
		$this->assertFalse( press_this_http_request_context() );
	}

	/**
	 * Test HTTP context query with null.
	 */
	public function test_http_context_query_null() {
		press_this_http_request_context( true );
		$result = press_this_http_request_context( null );
		$this->assertTrue( $result );
		press_this_http_request_context( false );
	}

	/**
	 * Test validate_url_for_proxy blocks localhost.
	 */
	public function test_validate_url_blocks_localhost() {
		$result = press_this_validate_url_for_proxy( 'http://localhost/admin' );
		$this->assertInstanceOf( 'WP_Error', $result );
	}

	/**
	 * Test validate_url_for_proxy blocks private IPs.
	 */
	public function test_validate_url_blocks_private_ips() {
		$private_urls = array(
			'http://10.0.0.1/page',
			'http://172.16.0.1/page',
			'http://192.168.1.1/page',
		);

		foreach ( $private_urls as $url ) {
			$result = press_this_validate_url_for_proxy( $url );
			$this->assertInstanceOf( 'WP_Error', $result, "Should block: $url" );
		}
	}

	/**
	 * Test validate_url_for_proxy rejects non-HTTP schemes.
	 */
	public function test_validate_url_rejects_non_http() {
		$result = press_this_validate_url_for_proxy( 'ftp://example.com/file' );
		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'press_this_invalid_scheme', $result->get_error_code() );
	}

	/**
	 * Test is_localhost detects various patterns.
	 */
	public function test_is_localhost_patterns() {
		$this->assertTrue( press_this_is_localhost( 'localhost' ) );
		$this->assertTrue( press_this_is_localhost( '127.0.0.1' ) );
		$this->assertTrue( press_this_is_localhost( '::1' ) );
		$this->assertTrue( press_this_is_localhost( '127.0.0.2' ) );
		$this->assertFalse( press_this_is_localhost( 'example.com' ) );
	}

	/**
	 * Test is_private_ip detects private ranges.
	 */
	public function test_is_private_ip() {
		$this->assertTrue( press_this_is_private_ip( '10.0.0.1' ) );
		$this->assertTrue( press_this_is_private_ip( '192.168.1.1' ) );
		$this->assertTrue( press_this_is_private_ip( '172.16.0.1' ) );
		$this->assertTrue( press_this_is_private_ip( '127.0.0.1' ) );
		$this->assertTrue( press_this_is_private_ip( 'invalid' ) );
	}

	/**
	 * Test validate_http_request_ip only blocks during context.
	 */
	public function test_validate_http_request_ip_respects_context() {
		press_this_http_request_context( false );
		$result = press_this_validate_http_request_ip( false, array(), 'http://localhost/test' );
		$this->assertFalse( $result );

		press_this_http_request_context( true );
		$result = press_this_validate_http_request_ip( false, array(), 'http://localhost/test' );
		$this->assertInstanceOf( 'WP_Error', $result );
		press_this_http_request_context( false );
	}

	/**
	 * Test validate_http_request_ip passes through when preempt is not false.
	 */
	public function test_validate_http_request_ip_passes_preempt() {
		press_this_http_request_context( true );
		$preempt = array( 'body' => 'already handled' );
		$result  = press_this_validate_http_request_ip( $preempt, array(), 'http://localhost/test' );
		$this->assertEquals( $preempt, $result );
		press_this_http_request_context( false );
	}

	/**
	 * Test validate_http_request_ip blocks empty host.
	 */
	public function test_validate_http_request_ip_blocks_empty_host() {
		press_this_http_request_context( true );
		$result = press_this_validate_http_request_ip( false, array(), '/relative-only' );
		$this->assertInstanceOf( 'WP_Error', $result );
		press_this_http_request_context( false );
	}

	/**
	 * Test get_localhost_patterns returns expected patterns.
	 */
	public function test_get_localhost_patterns() {
		$patterns = press_this_get_localhost_patterns();
		$this->assertContains( 'localhost', $patterns );
		$this->assertContains( '127.0.0.1', $patterns );
		$this->assertContains( '::1', $patterns );
		$this->assertContains( '0.0.0.0', $patterns );
	}
}
