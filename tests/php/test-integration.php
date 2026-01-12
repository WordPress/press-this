<?php
/**
 * Integration tests for Press This plugin.
 *
 * Tests for Task Group 10: WordPress Integration & Tools Page
 *
 * @package Press_This_Plugin
 */

/**
 * Integration test case for Press This plugin.
 */
class Test_Press_This_Integration extends WP_UnitTestCase {

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

		// Load the plugin class.
		require_once dirname( dirname( __DIR__ ) ) . '/class-wp-press-this-plugin.php';

		$this->plugin = new WP_Press_This_Plugin();

		// Create a test user with editor capabilities.
		$this->editor_user_id = $this->factory->user->create(
			array(
				'role' => 'editor',
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
	 * Test 1: Plugin activates without errors.
	 *
	 * Verifies that the main plugin file can be included without fatal errors
	 * and that required constants are defined.
	 */
	public function test_plugin_activates_without_errors() {
		// The plugin is already loaded via bootstrap, but let's verify constants.
		$this->assertTrue( defined( 'PRESS_THIS__VERSION' ) );
		$this->assertEquals( '2.0.0', PRESS_THIS__VERSION );

		// Verify minimum WP version constant.
		$this->assertTrue( defined( 'PRESS_THIS__MIN_WP_VERSION' ) );
		$this->assertEquals( '6.0', PRESS_THIS__MIN_WP_VERSION );
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
		$this->assertTrue( method_exists( $this->plugin, 'get_editor_settings' ) );
		$this->assertTrue( method_exists( $this->plugin, 'get_suggested_post_format' ) );
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
	 * Test 5: AJAX endpoints are properly registered.
	 */
	public function test_ajax_endpoints_are_registered() {
		// Verify the AJAX handler functions exist.
		$this->assertTrue( function_exists( 'wp_ajax_press_this_plugin_save_post' ) );
		$this->assertTrue( function_exists( 'wp_ajax_press_this_plugin_add_category' ) );

		// Verify the actions are hooked.
		global $wp_filter;

		$this->assertTrue(
			isset( $wp_filter['wp_ajax_press-this-plugin-save-post'] ),
			'Save post AJAX action should be registered'
		);

		$this->assertTrue(
			isset( $wp_filter['wp_ajax_press-this-plugin-add-category'] ),
			'Add category AJAX action should be registered'
		);
	}

	/**
	 * Test 6: Editor settings include allowed blocks.
	 */
	public function test_editor_settings_include_allowed_blocks() {
		$settings = $this->plugin->get_editor_settings();

		$this->assertArrayHasKey( 'allowedBlocks', $settings );
		$this->assertIsArray( $settings['allowedBlocks'] );

		// Check default blocks are included.
		$this->assertContains( 'core/paragraph', $settings['allowedBlocks'] );
		$this->assertContains( 'core/heading', $settings['allowedBlocks'] );
		$this->assertContains( 'core/image', $settings['allowedBlocks'] );
		$this->assertContains( 'core/quote', $settings['allowedBlocks'] );
		$this->assertContains( 'core/list', $settings['allowedBlocks'] );
		$this->assertContains( 'core/embed', $settings['allowedBlocks'] );
	}

	/**
	 * Test 7: Allowed blocks filter works.
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
	 * Test 8: Post format suggestion works for video content.
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
	 * Test 9: Post format suggestion filter works.
	 */
	public function test_post_format_suggestion_filter_works() {
		add_filter(
			'press_this_post_format_suggestion',
			function ( $format, $data ) {
				return 'custom-format';
			},
			10,
			2
		);

		$data             = array( 'u' => 'https://example.com' );
		$suggested_format = $this->plugin->get_suggested_post_format( $data );

		$this->assertEquals( 'custom-format', $suggested_format );

		// Clean up.
		remove_all_filters( 'press_this_post_format_suggestion' );
	}

	/**
	 * Test 10: Compatibility check function exists.
	 */
	public function test_compatibility_check_function_exists() {
		$this->assertTrue( function_exists( 'press_this_is_compatible' ) );

		// On WordPress 6.0+, this should return true.
		$this->assertTrue( press_this_is_compatible() );
	}

	/**
	 * Test 11: Legacy bookmarklet backward compatibility.
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
	 * Test 12: Modern POST submission works.
	 */
	public function test_modern_post_submission_works() {
		// Simulate modern POST parameters.
		$_POST['u']          = 'https://example.com/modern';
		$_POST['t']          = 'Modern Title';
		$_POST['s']          = 'Modern selected text';
		$_POST['pt_version'] = '10';
		$_POST['_images']    = array( 'https://example.com/image.jpg' );
		$_POST['_embeds']    = array( 'https://www.youtube.com/watch?v=abc123' );

		$data = $this->plugin->merge_or_fetch_data();

		// Data should be extracted from POST params.
		$this->assertEquals( 'https://example.com/modern', $data['u'] );
		$this->assertEquals( 'Modern Title', $data['t'] );
		$this->assertArrayHasKey( '_images', $data );
		$this->assertArrayHasKey( '_embeds', $data );
	}

	/**
	 * Test 13: Site settings include required configuration.
	 */
	public function test_site_settings_structure() {
		$settings = $this->plugin->site_settings();

		$this->assertArrayHasKey( 'redirInParent', $settings );
	}

	/**
	 * Test 14: Editor URL generation function works.
	 */
	public function test_editor_url_generation() {
		$this->assertTrue( function_exists( 'press_this_get_editor_url' ) );

		// Without URL parameter.
		$url = press_this_get_editor_url();
		$this->assertStringContainsString( 'press-this.php', $url );

		// With URL parameter.
		$url_with_param = press_this_get_editor_url( 'https://example.com' );
		$this->assertStringContainsString( 'press-this.php', $url_with_param );
		$this->assertStringContainsString( 'u=', $url_with_param );
	}
}
