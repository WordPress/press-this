<?php
/**
 * Integration tests for Press This plugin.
 *
 * Tests for Task Group 10: WordPress Integration & Tools Page
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Integration test case for Press This plugin.
 */
class Test_Press_This_Integration extends BaseTestCase {

	/**
	 * Plugin instance.
	 *
	 * @var WP_Press_This_Plugin
	 */
	protected $plugin;

	/**
	 * Test editor user ID.
	 *
	 * @var int
	 */
	protected $editor_user_id;

	/**
	 * Set up before each test.
	 */
	public function set_up() {
		parent::set_up();

		// Plugin class is already loaded via bootstrap.
		if ( ! class_exists( 'WP_Press_This_Plugin' ) ) {
			require_once dirname( dirname( __DIR__ ) ) . '/class-wp-press-this-plugin.php';
		}

		$this->plugin = new WP_Press_This_Plugin();

		// Create a test user with editor capabilities.
		$this->editor_user_id = wp_insert_user(
			array(
				'user_login' => 'test_editor_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password(),
				'user_email' => 'editor_' . wp_generate_password( 6, false ) . '@example.com',
				'role'       => 'editor',
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
	 * Helper: capture html() output and extract the pressThisData JSON.
	 *
	 * @return array Decoded pressThisData.
	 */
	private function get_press_this_data_from_html() {
		$previous_method           = isset( $_SERVER['REQUEST_METHOD'] ) ? $_SERVER['REQUEST_METHOD'] : null;
		$_SERVER['REQUEST_METHOD'] = 'GET';

		ob_start();
		$caught = null;
		try {
			$this->plugin->html();
		} catch ( \Throwable $e ) {
			$caught = $e;
		}
		$html = ob_get_clean();

		// Restore REQUEST_METHOD to avoid leaking state to other tests.
		if ( null === $previous_method ) {
			unset( $_SERVER['REQUEST_METHOD'] );
		} else {
			$_SERVER['REQUEST_METHOD'] = $previous_method;
		}

		preg_match( '/window\.pressThisData\s*=\s*({.+?});/s', $html, $matches );

		if ( empty( $matches[1] ) && $caught ) {
			$this->fail(
				'pressThisData JSON not found in html() output. '
				. 'Caught ' . get_class( $caught ) . ': ' . $caught->getMessage()
			);
		}

		$this->assertNotEmpty( $matches[1], 'pressThisData JSON not found in html() output.' );

		$data = json_decode( $matches[1], true );
		$this->assertIsArray( $data, 'pressThisData should decode to an array.' );

		return $data;
	}

	/**
	 * Test 1: Plugin constants are defined.
	 */
	public function test_plugin_constants_defined() {
		$this->assertTrue( defined( 'PRESS_THIS__VERSION' ) );
		$this->assertTrue( defined( 'PRESS_THIS__MIN_WP_VERSION' ) );
	}

	/**
	 * Test 2: Plugin class exists and has required methods.
	 */
	public function test_plugin_class_has_required_methods() {
		$this->assertTrue( class_exists( 'WP_Press_This_Plugin' ) );

		// Check required methods exist.
		$this->assertTrue( method_exists( $this->plugin, 'save_post' ) );
		$this->assertTrue( method_exists( $this->plugin, 'add_category' ) );
		$this->assertTrue( method_exists( $this->plugin, 'html' ) );
		$this->assertTrue( method_exists( $this->plugin, 'merge_or_fetch_data' ) );
		$this->assertTrue( method_exists( $this->plugin, 'get_allowed_blocks' ) );
	}

	/**
	 * Test 3: Tools page hook is registered.
	 */
	public function test_tools_page_hook_is_registered() {
		// The plugin file registers the hook with tool_box action.
		$this->assertTrue( function_exists( 'press_this_tool_box' ) );
	}

	/**
	 * Test 4: Bookmarklet generation function exists and returns valid link.
	 */
	public function test_bookmarklet_generation_works() {
		$this->assertTrue( function_exists( 'press_this_get_shortcut_link' ) );

		// Get the bookmarklet link.
		$link = press_this_get_shortcut_link();

		// Should start with javascript:.
		$this->assertStringStartsWith( 'javascript:', $link );

		// Should contain the Press This URL.
		$this->assertStringContainsString( 'press-this.php', $link );
	}

	/**
	 * Test 5: Editor settings include allowed blocks.
	 */
	public function test_editor_settings_include_allowed_blocks() {
		$settings = $this->plugin->get_editor_settings();

		$this->assertArrayHasKey( 'allowedBlocks', $settings );
		$this->assertIsArray( $settings['allowedBlocks'] );

		// Check default blocks are included.
		$this->assertContains( 'core/paragraph', $settings['allowedBlocks'] );
		$this->assertContains( 'core/heading', $settings['allowedBlocks'] );
		$this->assertContains( 'core/image', $settings['allowedBlocks'] );
	}

	/**
	 * Test 6: Allowed blocks filter works.
	 */
	public function test_allowed_blocks_filter_works() {
		// Add a filter to modify allowed blocks.
		add_filter(
			'press_this_allowed_blocks',
			function ( $blocks ) {
				$blocks[] = 'core/custom-block';
				return $blocks;
			}
		);

		$allowed_blocks = $this->plugin->get_allowed_blocks();

		$this->assertContains( 'core/custom-block', $allowed_blocks );

		// Clean up.
		remove_all_filters( 'press_this_allowed_blocks' );
	}

	/**
	 * Test 7: Post format suggestion works for video content.
	 */
	public function test_post_format_suggestion_for_video() {
		$data = array(
			'u'       => 'https://www.youtube.com/watch?v=test123',
			'_embeds' => array( 'https://www.youtube.com/watch?v=test123' ),
		);

		$suggested_format = $this->plugin->get_suggested_post_format( $data );

		$this->assertEquals( 'video', $suggested_format );
	}

	/**
	 * Test 8: Legacy bookmarklet backward compatibility.
	 */
	public function test_legacy_bookmarklet_backward_compatibility() {
		// Simulate legacy GET parameters.
		$_GET['u'] = 'https://example.com/page';
		$_GET['t'] = 'Test Page Title';
		$_GET['s'] = 'Selected text';
		$_GET['v'] = '8'; // Old version number.

		$data = $this->plugin->merge_or_fetch_data();

		// Data should still be extracted from GET params.
		$this->assertEquals( 'https://example.com/page', $data['u'] );
		$this->assertEquals( 'Test Page Title', $data['t'] );
		$this->assertEquals( 'Selected text', $data['s'] );
	}

	/**
	 * Test 9: Modern POST submission works.
	 */
	public function test_modern_post_submission_works() {
		// Simulate modern POST parameters.
		$_POST['u']       = 'https://example.com/modern';
		$_POST['t']       = 'Modern Title';
		$_POST['s']       = 'Modern selected text';
		$_POST['_images'] = array( 'https://example.com/image.jpg' );

		$data = $this->plugin->merge_or_fetch_data();

		// Data should be extracted from POST params.
		$this->assertEquals( 'https://example.com/modern', $data['u'] );
		$this->assertEquals( 'Modern Title', $data['t'] );
		$this->assertArrayHasKey( '_images', $data );
	}

	/**
	 * Test 10: Site settings include required configuration.
	 */
	public function test_site_settings_structure() {
		$settings = $this->plugin->site_settings();

		$this->assertArrayHasKey( 'redirInParent', $settings );
	}

	/**
	 * Test 11: REST save handler includes admin files for image sideloading.
	 *
	 * Regression test for GitHub issue #74.
	 *
	 * The REST save handler calls side_load_images() which uses
	 * media_sideload_image() from wp-admin/includes/media.php. In a
	 * real REST API request, admin includes are NOT loaded by default,
	 * so the function must explicitly require them. Without these
	 * includes, saving a post with external images causes a PHP fatal
	 * error: "Call to undefined function media_sideload_image()".
	 *
	 * Note: WorDBless preloads admin includes, so we cannot reproduce
	 * the fatal error directly. Instead we verify the function source
	 * contains the required require_once statements.
	 *
	 * @covers ::press_this_rest_save_post
	 */
	public function test_rest_save_requires_admin_media_includes() {
		$func       = new ReflectionFunction( 'press_this_rest_save_post' );
		$file_lines = file( $func->getFileName() );
		$body       = implode( '', array_slice( $file_lines, $func->getStartLine() - 1, $func->getEndLine() - $func->getStartLine() + 1 ) );

		$this->assertStringContainsString( "wp-admin/includes/file.php", $body, 'Missing require for file.php (provides download_url)' );
		$this->assertStringContainsString( "wp-admin/includes/media.php", $body, 'Missing require for media.php (provides media_sideload_image)' );
		$this->assertStringContainsString( "wp-admin/includes/image.php", $body, 'Missing require for image.php (provides wp_generate_attachment_metadata)' );
	}

	/**
	 * Test 12: REST save with external images in content succeeds.
	 *
	 * Functional companion to test 11. Exercises the full save code path
	 * with content containing an external image and a featured_image set,
	 * matching the scenario from GitHub issue #74.
	 *
	 * @covers ::press_this_rest_save_post
	 */
	public function test_rest_save_with_external_images_succeeds() {
		// Block HTTP requests to prevent actual image downloads.
		$block_http = function () {
			return new WP_Error( 'http_blocked', 'Blocked in test' );
		};
		add_filter( 'pre_http_request', $block_http, 1 );

		// Create a draft post owned by the test user.
		$post_id = wp_insert_post(
			array(
				'post_author'  => $this->editor_user_id,
				'post_status'  => 'draft',
				'post_title'   => 'Test Post',
				'post_content' => '',
			)
		);

		// Build a REST request whose content contains an external image.
		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $post_id );
		$request->set_param( 'title', 'Test Save With Image' );
		$request->set_param(
			'content',
			'<!-- wp:image -->'
			. '<figure class="wp-block-image"><img src="https://example.com/photo.jpg" alt=""/></figure>'
			. '<!-- /wp:image -->'
		);
		$request->set_param( 'featured_image', 1 );

		$response = press_this_rest_save_post( $request );

		$this->assertInstanceOf( WP_REST_Response::class, $response );
		$data = $response->get_data();
		$this->assertTrue( $data['success'] );

		// Verify the post was actually updated.
		$post = get_post( $post_id );
		$this->assertEquals( 'Test Save With Image', $post->post_title );

		remove_filter( 'pre_http_request', $block_http, 1 );
	}

	/**
	 * Test: windowNameMode flag is set when wn=1 GET parameter is present.
	 *
	 * When the bookmarklet's popup is blocked (mobile browsers), it stores
	 * scraped data in window.name and navigates with &wn=1. The PHP side
	 * just sets the flag; the React app reads window.name client-side.
	 */
	public function test_window_name_mode_flag_is_set() {
		$_GET['wn'] = '1';

		$data = $this->get_press_this_data_from_html();

		$this->assertTrue( $data['windowNameMode'], 'windowNameMode should be true when wn=1.' );

		unset( $_GET['wn'] );
	}

	/**
	 * Test: windowNameMode flag is false when wn parameter is absent.
	 */
	public function test_window_name_mode_flag_is_false_by_default() {
		$data = $this->get_press_this_data_from_html();

		$this->assertFalse( $data['windowNameMode'], 'windowNameMode should be false by default.' );
	}

	/**
	 * Test: postMessageMode and windowNameMode can be set independently.
	 */
	public function test_post_message_and_window_name_modes_independent() {
		$_GET['pm'] = '1';

		$data = $this->get_press_this_data_from_html();

		$this->assertTrue( $data['postMessageMode'], 'postMessageMode should be true when pm=1.' );
		$this->assertFalse( $data['windowNameMode'], 'windowNameMode should be false when only pm=1.' );

		unset( $_GET['pm'] );
	}
}
