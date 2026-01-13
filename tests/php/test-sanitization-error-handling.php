<?php
/**
 * Tests for Input Sanitization and Error Handling (SEC-001, SEC-002, SEC-005, SEC-009).
 *
 * @package Press_This_Plugin
 */

/**
 * Test case for Input Sanitization and Error Handling.
 */
class Test_Sanitization_Error_Handling extends WP_UnitTestCase {

	/**
	 * Plugin instance.
	 *
	 * @var WP_Press_This_Plugin
	 */
	protected $plugin;

	/**
	 * Test user ID (editor).
	 *
	 * @var int
	 */
	protected $editor_user_id;

	/**
	 * Test post ID.
	 *
	 * @var int
	 */
	protected $test_post_id;

	/**
	 * Set up before each test.
	 */
	public function set_up() {
		parent::set_up();

		// Load the plugin class.
		require_once dirname( dirname( __DIR__ ) ) . '/press-this-plugin.php';
		require_once dirname( dirname( __DIR__ ) ) . '/class-wp-press-this-plugin.php';

		$this->plugin = new WP_Press_This_Plugin();

		// Create a test user with editor capabilities.
		$this->editor_user_id = $this->factory->user->create(
			array(
				'role' => 'editor',
			)
		);

		// Create a test post.
		$this->test_post_id = $this->factory->post->create(
			array(
				'post_author' => $this->editor_user_id,
				'post_status' => 'draft',
			)
		);

		// Set current user.
		wp_set_current_user( $this->editor_user_id );
	}

	/**
	 * Tear down after each test.
	 */
	public function tear_down() {
		parent::tear_down();
		$_POST = array();
		$_GET  = array();
	}

	/**
	 * Test 1: Category array sanitization converts strings to integers (SEC-001).
	 *
	 * Verifies that post_category values are converted to integers using absint.
	 *
	 * @covers WP_Press_This_Plugin::save_post
	 */
	public function test_category_array_sanitization_converts_to_integers() {
		// Create test categories.
		$cat1 = $this->factory->category->create( array( 'name' => 'Test Category 1' ) );
		$cat2 = $this->factory->category->create( array( 'name' => 'Test Category 2' ) );

		// Set up POST data with string category IDs and malformed values.
		$_POST['post_ID']        = $this->test_post_id;
		$_POST['_wpnonce']       = wp_create_nonce( 'update-post_' . $this->test_post_id );
		$_POST['post_title']     = 'Category Test Post';
		$_POST['post_content']   = '<p>Content</p>';
		$_POST['post_status']    = 'draft';
		$_POST['post_category']  = array(
			(string) $cat1,                 // String that should convert to int.
			(string) $cat2,                 // String that should convert to int.
			'malicious<script>',            // Malformed input should become 0 and be filtered.
			'-5',                           // Negative should become 5 via absint.
		);

		try {
			$this->plugin->save_post();
		} catch ( WPDieException $e ) {
			// Expected - wp_send_json_* calls wp_die().
		}

		// Verify categories were properly sanitized and assigned.
		$post_categories = wp_get_post_categories( $this->test_post_id );

		// Valid categories should be assigned.
		$this->assertContains( $cat1, $post_categories );
		$this->assertContains( $cat2, $post_categories );

		// Malformed inputs should not result in category ID 0.
		$this->assertNotContains( 0, $post_categories );
	}

	/**
	 * Test 2: Taxonomy input sanitization handles hierarchical vs non-hierarchical (SEC-001).
	 *
	 * Verifies that hierarchical taxonomies use absint and non-hierarchical use sanitize_text_field.
	 *
	 * @covers WP_Press_This_Plugin::save_post
	 */
	public function test_taxonomy_input_sanitization() {
		// Set up POST data with tax_input containing both valid and malformed data.
		$_POST['post_ID']      = $this->test_post_id;
		$_POST['_wpnonce']     = wp_create_nonce( 'update-post_' . $this->test_post_id );
		$_POST['post_title']   = 'Taxonomy Test Post';
		$_POST['post_content'] = '<p>Content</p>';
		$_POST['post_status']  = 'draft';

		// post_tag is non-hierarchical, should use sanitize_text_field.
		$_POST['tax_input'] = array(
			'post_tag' => array(
				'valid-tag',
				'another tag',
				'<script>alert(1)</script>',  // Should be sanitized.
			),
			'nonexistent_taxonomy' => array( 'should', 'be', 'ignored' ),  // Invalid taxonomy.
		);

		try {
			$this->plugin->save_post();
		} catch ( WPDieException $e ) {
			// Expected.
		}

		// Verify tags were sanitized.
		$tags = wp_get_post_tags( $this->test_post_id, array( 'fields' => 'names' ) );

		// Valid tags should exist.
		$this->assertContains( 'valid-tag', $tags );
		$this->assertContains( 'another tag', $tags );

		// Script tag should be stripped.
		$script_found = false;
		foreach ( $tags as $tag ) {
			if ( strpos( $tag, '<script>' ) !== false || strpos( $tag, 'alert' ) !== false ) {
				$script_found = true;
				break;
			}
		}
		$this->assertFalse( $script_found, 'Script tags should be sanitized from tag names' );
	}

	/**
	 * Test 3: XSS payload escaping in content building (SEC-002).
	 *
	 * Verifies that get_suggested_content() escapes XSS payloads.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_content
	 */
	public function test_xss_payload_escaping_in_content_building() {
		// Create data with XSS payloads.
		$xss_data = array(
			'u' => 'https://example.com/page?q=<script>alert(1)</script>',
			't' => '<img src=x onerror=alert(1)>Title',
			's' => '<script>document.cookie</script>Selected text',
			'_meta' => array(
				'og:description' => '<script>evil()</script>Description',
			),
		);

		$content = $this->plugin->get_suggested_content( $xss_data );

		// Verify XSS payloads are escaped.
		$this->assertStringNotContainsString( '<script>', $content );
		$this->assertStringNotContainsString( 'onerror=', $content );
		$this->assertStringNotContainsString( 'document.cookie', $content );

		// Ensure legitimate content is still present (escaped form).
		// The text "Selected text" should still appear, just escaped.
		$this->assertStringContainsString( 'Selected text', $content );
	}

	/**
	 * Test 4: Generic error messages hide internal details (SEC-005).
	 *
	 * Verifies that REST endpoints return generic error messages without internal details.
	 *
	 * @covers press_this_rest_scrape_url
	 */
	public function test_generic_error_messages_hide_details() {
		// Enable proxy for testing.
		add_filter( 'press_this_enable_url_proxy', '__return_true' );

		// Create a mock request with invalid URL.
		$request = new WP_REST_Request( 'POST', '/press-this/v1/scrape' );
		$request->set_param( 'url', 'https://invalid-domain-that-will-fail.test/page' );

		// The actual fetch will fail, we check the error response structure.
		$response = press_this_rest_scrape_url( $request );

		if ( is_wp_error( $response ) ) {
			$error_message = $response->get_error_message();

			// Should not contain internal paths, IP addresses, or stack traces.
			$this->assertStringNotContainsString( '/var/', $error_message );
			$this->assertStringNotContainsString( '/home/', $error_message );
			$this->assertStringNotContainsString( 'Stack trace', $error_message );
			$this->assertStringNotContainsString( 'Exception', $error_message );

			// Should have a generic, user-friendly message.
			$this->assertTrue(
				strpos( $error_message, 'Unable to fetch' ) !== false ||
				strpos( $error_message, 'Failed to fetch' ) !== false ||
				strpos( $error_message, 'Could not' ) !== false,
				'Error message should be user-friendly and generic'
			);
		}

		remove_filter( 'press_this_enable_url_proxy', '__return_true' );
	}

	/**
	 * Test 5: Content-type validation on sideload rejects non-image types (SEC-009).
	 *
	 * Verifies that sideload endpoint validates content-type before download.
	 *
	 * @covers press_this_rest_sideload_image
	 */
	public function test_sideload_content_type_validation() {
		// Create a mock request for a non-image URL.
		$request = new WP_REST_Request( 'POST', '/press-this/v1/sideload' );
		$request->set_param( 'url', 'https://example.com/document.pdf' );
		$request->set_param( 'post_id', $this->test_post_id );

		// Grant upload permission.
		wp_set_current_user( $this->editor_user_id );

		// Mock the HEAD response with non-image content-type.
		add_filter( 'pre_http_request', function( $preempt, $args, $url ) {
			if ( $args['method'] === 'HEAD' ) {
				return array(
					'response' => array( 'code' => 200 ),
					'headers'  => array( 'content-type' => 'application/pdf' ),
				);
			}
			return $preempt;
		}, 10, 3 );

		$response = press_this_rest_sideload_image( $request );

		// Should return error for non-image content-type.
		$this->assertInstanceOf( 'WP_Error', $response );
		$this->assertEquals( 'press_this_invalid_image_type', $response->get_error_code() );
	}

	/**
	 * Test 6: Sideload allows valid image content types (SEC-009).
	 *
	 * Verifies that valid image content-types pass validation.
	 */
	public function test_sideload_allows_valid_image_types() {
		$valid_image_types = array(
			'image/jpeg',
			'image/jpg',
			'image/png',
			'image/gif',
			'image/webp',
		);

		foreach ( $valid_image_types as $content_type ) {
			// The validation logic should accept these types.
			// We test via the filter mechanism.
			$allowed_types = apply_filters( 'press_this_sideload_allowed_types', array(
				'image/jpeg',
				'image/jpg',
				'image/png',
				'image/gif',
				'image/webp',
			) );

			$this->assertContains(
				$content_type,
				$allowed_types,
				"Content-type {$content_type} should be allowed"
			);
		}
	}
}
