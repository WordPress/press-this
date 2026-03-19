<?php
/**
 * Tests for Press_This_Assets class.
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for Press_This_Assets.
 */
class Test_Press_This_Assets extends BaseTestCase {

	/**
	 * Assets instance.
	 *
	 * @var Press_This_Assets
	 */
	private $assets;

	/**
	 * Plugin file path.
	 *
	 * @var string
	 */
	private $plugin_file;

	/**
	 * Editor user ID.
	 *
	 * @var int
	 */
	private $editor_user_id;

	/**
	 * Set up before each test.
	 */
	public function set_up() {
		parent::set_up();

		$this->plugin_file = dirname( dirname( __DIR__ ) ) . '/press-this-plugin.php';

		if ( ! class_exists( 'Press_This_Assets' ) ) {
			require_once dirname( dirname( __DIR__ ) ) . '/includes/class-press-this-assets.php';
		}

		$this->assets = new Press_This_Assets( $this->plugin_file );

		$this->editor_user_id = wp_insert_user(
			array(
				'user_login' => 'assets_editor_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password(),
				'user_email' => 'assets_editor_' . wp_generate_password( 6, false ) . '@example.com',
				'role'       => 'editor',
			)
		);
	}

	/**
	 * Tear down after each test.
	 */
	public function tear_down() {
		parent::tear_down();
		remove_all_filters( 'press_this_allowed_blocks' );
	}

	/**
	 * Test constructor sets plugin_dir.
	 */
	public function test_constructor_sets_plugin_dir() {
		$reflection = new ReflectionClass( $this->assets );
		$prop       = $reflection->getProperty( 'plugin_dir' );
		$prop->setAccessible( true );

		$plugin_dir = $prop->getValue( $this->assets );
		$this->assertNotEmpty( $plugin_dir );
		$this->assertStringEndsWith( '/', $plugin_dir );
	}

	/**
	 * Test constructor sets plugin_url.
	 */
	public function test_constructor_sets_plugin_url() {
		$reflection = new ReflectionClass( $this->assets );
		$prop       = $reflection->getProperty( 'plugin_url' );
		$prop->setAccessible( true );

		$plugin_url = $prop->getValue( $this->assets );
		$this->assertNotEmpty( $plugin_url );
	}

	/**
	 * Test get_editor_settings returns expected keys.
	 */
	public function test_get_editor_settings_returns_expected_keys() {
		$settings = $this->assets->get_editor_settings();

		$this->assertArrayHasKey( 'allowedBlocks', $settings );
		$this->assertArrayHasKey( 'hasFixedToolbar', $settings );
		$this->assertArrayHasKey( 'isRTL', $settings );
		$this->assertArrayHasKey( 'siteUrl', $settings );
		$this->assertArrayHasKey( 'ajaxUrl', $settings );
		$this->assertArrayHasKey( 'scriptDebug', $settings );
	}

	/**
	 * Test get_editor_settings has fixed toolbar enabled.
	 */
	public function test_get_editor_settings_has_fixed_toolbar() {
		$settings = $this->assets->get_editor_settings();
		$this->assertTrue( $settings['hasFixedToolbar'] );
	}

	/**
	 * Test get_editor_settings applies allowed_blocks filter.
	 */
	public function test_get_editor_settings_applies_filter() {
		add_filter(
			'press_this_allowed_blocks',
			function () {
				return array( 'core/paragraph', 'core/custom' );
			}
		);

		$settings = $this->assets->get_editor_settings();
		$this->assertContains( 'core/custom', $settings['allowedBlocks'] );
		$this->assertCount( 2, $settings['allowedBlocks'] );
	}

	/**
	 * Test get_script_dependencies returns fallback when asset file missing.
	 */
	public function test_get_script_dependencies_fallback() {
		$temp_dir = sys_get_temp_dir() . '/press-this-test-' . wp_generate_password( 6, false ) . '/';
		mkdir( $temp_dir );
		$fake_file = $temp_dir . 'plugin.php';
		file_put_contents( $fake_file, '<?php // fake' );

		$temp_assets = new Press_This_Assets( $fake_file );
		$deps        = $temp_assets->get_script_dependencies();

		$this->assertIsArray( $deps );
		$this->assertContains( 'wp-blocks', $deps );
		$this->assertContains( 'wp-element', $deps );
		$this->assertContains( 'wp-components', $deps );
		$this->assertContains( 'wp-primitives', $deps );

		unlink( $fake_file );
		rmdir( $temp_dir );
	}

	/**
	 * Test localize_editor_data merges defaults.
	 */
	public function test_localize_editor_data_merges_defaults() {
		wp_set_current_user( $this->editor_user_id );

		wp_register_script( 'press-this-editor', '', array(), '1.0', true );

		$this->assets->localize_editor_data( array( 'title' => 'Custom Title' ) );

		global $wp_scripts;
		$data = $wp_scripts->get_data( 'press-this-editor', 'data' );

		$this->assertNotEmpty( $data );
		$this->assertStringContainsString( 'wpPressThisData', $data );
		$this->assertStringContainsString( 'Custom Title', $data );
		$this->assertStringContainsString( 'content', $data );

		wp_deregister_script( 'press-this-editor' );
	}

	/**
	 * Test localize_editor_data also localizes pressThisEditorSettings.
	 */
	public function test_localize_editor_data_localizes_editor_settings() {
		wp_set_current_user( $this->editor_user_id );

		wp_register_script( 'press-this-editor', '', array(), '1.0', true );

		$this->assets->localize_editor_data();

		global $wp_scripts;
		$data = $wp_scripts->get_data( 'press-this-editor', 'data' );

		$this->assertStringContainsString( 'pressThisEditorSettings', $data );
		$this->assertStringContainsString( 'allowedBlocks', $data );

		wp_deregister_script( 'press-this-editor' );
	}

	/**
	 * Test enqueue_editor_assets enqueues script and styles.
	 */
	public function test_enqueue_editor_assets_enqueues_handles() {
		wp_set_current_user( $this->editor_user_id );

		wp_register_script( 'press-this-editor', '', array(), '1.0', true );
		wp_register_style( 'press-this-editor', '', array(), '1.0' );
		wp_register_style( 'press-this-legacy', '', array(), '1.0' );

		$this->assets->enqueue_editor_assets();

		$this->assertTrue( wp_script_is( 'press-this-editor', 'enqueued' ) );
		$this->assertTrue( wp_style_is( 'press-this-editor', 'enqueued' ) );
		$this->assertTrue( wp_style_is( 'press-this-legacy', 'enqueued' ) );

		wp_deregister_script( 'press-this-editor' );
		wp_deregister_style( 'press-this-editor' );
		wp_deregister_style( 'press-this-legacy' );
	}

	/**
	 * Test register_assets handles missing asset file gracefully.
	 */
	public function test_register_assets_handles_missing_asset_file() {
		$temp_dir = sys_get_temp_dir() . '/press-this-test-' . wp_generate_password( 6, false ) . '/';
		mkdir( $temp_dir );
		$fake_file = $temp_dir . 'plugin.php';
		file_put_contents( $fake_file, '<?php // fake' );

		$temp_assets = new Press_This_Assets( $fake_file );
		$temp_assets->register_assets();

		$this->assertFalse( wp_script_is( 'press-this-editor', 'registered' ) );

		unlink( $fake_file );
		rmdir( $temp_dir );
	}

	/**
	 * Test register_assets filters CSS deps and adds wp-primitives.
	 */
	public function test_register_assets_with_asset_file() {
		$temp_dir = sys_get_temp_dir() . '/press-this-asset-test-' . wp_generate_password( 6, false ) . '/';
		mkdir( $temp_dir );
		mkdir( $temp_dir . 'build/' );

		$fake_file = $temp_dir . 'plugin.php';
		file_put_contents( $fake_file, '<?php // fake' );

		// Create a mock asset file with a CSS dep and without wp-primitives.
		$asset_content = "<?php return array( 'dependencies' => array( 'wp-element', 'wp-blocks', './style.css' ), 'version' => 'test123' );";
		file_put_contents( $temp_dir . 'build/press-this-editor.asset.php', $asset_content );

		$temp_assets = new Press_This_Assets( $fake_file );
		$temp_assets->register_assets();

		$this->assertTrue( wp_script_is( 'press-this-editor', 'registered' ) );

		// Get the registered script to check dependencies.
		global $wp_scripts;
		$script = $wp_scripts->registered['press-this-editor'];

		// CSS dep should be filtered out.
		$this->assertNotContains( './style.css', $script->deps );
		// wp-primitives should be added.
		$this->assertContains( 'wp-primitives', $script->deps );

		wp_deregister_script( 'press-this-editor' );
		wp_deregister_style( 'press-this-editor' );
		wp_deregister_style( 'press-this-legacy' );

		unlink( $temp_dir . 'build/press-this-editor.asset.php' );
		rmdir( $temp_dir . 'build/' );
		unlink( $fake_file );
		rmdir( $temp_dir );
	}
}
