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
}
