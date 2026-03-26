<?php
/**
 * Tests for WP_Press_This_Plugin class.
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for WP_Press_This_Plugin.
 */
class Test_WP_Press_This_Plugin extends BaseTestCase {

	/**
	 * Plugin instance.
	 *
	 * @var WP_Press_This_Plugin
	 */
	protected $plugin;

	/**
	 * Test user ID.
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
		require_once dirname( dirname( __DIR__ ) ) . '/class-wp-press-this-plugin.php';

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

		// Create a test post.
		$this->test_post_id = wp_insert_post(
			array(
				'post_author'  => $this->editor_user_id,
				'post_status'  => 'draft',
				'post_title'   => 'Test Post',
				'post_content' => 'Test content',
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
	 * Test 1: save_post() AJAX handler with nonce verification.
	 *
	 * @covers WP_Press_This_Plugin::save_post
	 */
	public function test_save_post_with_valid_nonce() {
		// Set up POST data with valid nonce.
		$_POST['post_ID']      = $this->test_post_id;
		$_POST['_wpnonce']     = wp_create_nonce( 'update-post_' . $this->test_post_id );
		$_POST['post_title']   = 'Test Title from Press This';
		$_POST['post_content'] = '<p>Test content</p>';
		$_POST['post_status']  = 'draft';

		// Capture JSON output since save_post() calls wp_send_json_*.
		ob_start();
		try {
			$this->plugin->save_post();
		} catch ( WPDieException $e ) {
			// Expected - wp_send_json_* calls wp_die().
		}
		ob_end_clean();

		// Verify the post was updated.
		$post = get_post( $this->test_post_id );

		$this->assertEquals( 'Test Title from Press This', $post->post_title );
		$this->assertStringContainsString( 'Test content', $post->post_content );
		$this->assertEquals( 'draft', $post->post_status );
	}

	/**
	 * Test 2: save_post() AJAX handler fails without nonce.
	 *
	 * @covers WP_Press_This_Plugin::save_post
	 */
	public function test_save_post_without_nonce_fails() {
		$_POST['post_ID']      = $this->test_post_id;
		$_POST['post_title']   = 'Test Title';
		$_POST['post_content'] = '<p>Test content</p>';
		// No nonce provided.

		// Capture the JSON error response.
		ob_start();
		try {
			$this->plugin->save_post();
		} catch ( WPDieException $e ) {
			// Expected.
		}
		$output = ob_get_clean();

		// The original post title should not be changed.
		$post = get_post( $this->test_post_id );
		$this->assertNotEquals( 'Test Title', $post->post_title );
	}

	/**
	 * Test 3: add_category() AJAX handler creates categories.
	 *
	 * @covers WP_Press_This_Plugin::add_category
	 */
	public function test_add_category_creates_new_category() {
		$_POST['new_cat_nonce'] = wp_create_nonce( 'add-category' );
		$_POST['name']          = 'Test Press This Category';
		$_POST['parent']        = 0;

		// Catch JSON response.
		ob_start();
		try {
			$this->plugin->add_category();
		} catch ( WPDieException $e ) {
			// Expected.
		}
		$output = ob_get_clean();

		// Check if category was created.
		$category = get_term_by( 'name', 'Test Press This Category', 'category' );

		$this->assertNotFalse( $category );
		$this->assertEquals( 'Test Press This Category', $category->name );
	}

	/**
	 * Test 4: side_load_images() with valid image URLs.
	 *
	 * @covers WP_Press_This_Plugin::side_load_images
	 */
	public function test_side_load_images_returns_content() {
		// Test with content that has no external images (local only).
		$content = '<p>Test paragraph</p><p>Another paragraph</p>';

		$result = $this->plugin->side_load_images( $this->test_post_id, wp_slash( $content ) );

		// Content should be returned (possibly modified).
		$this->assertNotEmpty( $result );
		$this->assertStringContainsString( 'Test paragraph', $result );
	}

	/**
	 * Test 5: merge_or_fetch_data() backward compatibility with legacy GET params.
	 *
	 * @covers WP_Press_This_Plugin::merge_or_fetch_data
	 */
	public function test_merge_or_fetch_data_with_legacy_get_params() {
		// Set up legacy GET parameters.
		$_GET['u'] = 'https://example.com/article';
		$_GET['t'] = 'Test Article Title';
		$_GET['s'] = 'Selected text from the page';
		$_GET['v'] = '8';

		$data = $this->plugin->merge_or_fetch_data();

		// Verify data was extracted from GET params.
		$this->assertArrayHasKey( 'u', $data );
		$this->assertArrayHasKey( 't', $data );
		$this->assertArrayHasKey( 's', $data );
		$this->assertEquals( 'https://example.com/article', $data['u'] );
		$this->assertEquals( 'Test Article Title', $data['t'] );
		$this->assertEquals( 'Selected text from the page', $data['s'] );
	}

	/**
	 * Test 6: merge_or_fetch_data() works with POST data (modern bookmarklet).
	 *
	 * @covers WP_Press_This_Plugin::merge_or_fetch_data
	 */
	public function test_merge_or_fetch_data_with_post_params() {
		// Set up POST parameters (modern bookmarklet).
		$_POST['u']        = 'https://example.com/modern-article';
		$_POST['t']        = 'Modern Article Title';
		$_POST['s']        = 'Modern selected text';
		$_POST['v']        = '9';
		$_POST['_images']  = array( 'https://example.com/image1.jpg', 'https://example.com/image2.png' );
		$_POST['_embeds']  = array( 'https://www.youtube.com/watch?v=test123' );
		$_POST['_meta']    = array(
			'og:title'       => 'OG Title',
			'og:description' => 'OG Description',
		);

		$data = $this->plugin->merge_or_fetch_data();

		// POST data should take precedence.
		$this->assertEquals( 'https://example.com/modern-article', $data['u'] );
		$this->assertEquals( 'Modern Article Title', $data['t'] );
		$this->assertEquals( 'Modern selected text', $data['s'] );

		// Images and embeds should be processed.
		$this->assertArrayHasKey( '_images', $data );
		$this->assertArrayHasKey( '_embeds', $data );
	}

	/**
	 * Test 7: Filter hook press_this_save_post is triggered.
	 *
	 * @covers WP_Press_This_Plugin::save_post
	 */
	public function test_filter_press_this_save_post_is_triggered() {
		$filter_called = false;

		// Add filter to modify post data.
		add_filter(
			'press_this_save_post',
			function ( $post_data ) use ( &$filter_called ) {
				$filter_called           = true;
				$post_data['post_title'] = 'Modified by Filter';
				return $post_data;
			}
		);

		$_POST['post_ID']      = $this->test_post_id;
		$_POST['_wpnonce']     = wp_create_nonce( 'update-post_' . $this->test_post_id );
		$_POST['post_title']   = 'Original Title';
		$_POST['post_content'] = '<p>Content</p>';
		$_POST['post_status']  = 'draft';

		ob_start();
		try {
			$this->plugin->save_post();
		} catch ( WPDieException $e ) {
			// Expected.
		}
		ob_end_clean();

		$this->assertTrue( $filter_called );

		$post = get_post( $this->test_post_id );
		$this->assertEquals( 'Modified by Filter', $post->post_title );
	}

	/**
	 * Helper: capture html() output and extract the pressThisData JSON.
	 *
	 * html() triggers wp_enqueue_media() and other admin hooks that may
	 * error in a lightweight test environment, so we capture output and
	 * suppress any fatal-like errors after the data we need is emitted.
	 *
	 * @return array Decoded pressThisData.
	 */
	private function get_press_this_data_from_html() {
		$_SERVER['REQUEST_METHOD'] = 'GET';

		// Suppress errors from wp_enqueue_media / admin hooks that aren't
		// fully initialised in the WorDBless test environment.
		$previous = error_reporting( E_ERROR ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.runtime_configuration_error_reporting

		ob_start();
		try {
			$this->plugin->html();
		} catch ( \Throwable $e ) { // phpcs:ignore Generic.CodeAnalysis.EmptyStatement.DetectedCatch
			// Errors after pressThisData is emitted are acceptable.
		}
		$html = ob_get_clean();

		error_reporting( $previous ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.runtime_configuration_error_reporting

		preg_match( '/window\.pressThisData\s*=\s*({.+?});/s', $html, $matches );
		$this->assertNotEmpty( $matches[1], 'pressThisData JSON not found in html() output.' );

		$data = json_decode( $matches[1], true );
		$this->assertIsArray( $data, 'pressThisData should decode to an array.' );

		return $data;
	}

	/**
	 * Test: categories data is populated when category taxonomy is registered.
	 *
	 * @covers WP_Press_This_Plugin::html
	 */
	public function test_html_categories_populated_when_taxonomy_registered() {
		$data = $this->get_press_this_data_from_html();

		// With default 'post' type, category is registered so terms should load.
		$this->assertNotEmpty( $data['categories'], 'categories should not be empty when category taxonomy is registered.' );
	}

	/**
	 * Test: canAssignTags is false when post_tag is unregistered for the post type.
	 *
	 * Regression test for taxonomy registration check (#111).
	 *
	 * @covers WP_Press_This_Plugin::html
	 */
	public function test_html_can_assign_tags_false_when_post_tag_unregistered() {
		unregister_taxonomy_for_object_type( 'post_tag', 'post' );

		$data = $this->get_press_this_data_from_html();

		$this->assertFalse( $data['canAssignTags'], 'canAssignTags should be false when post_tag is unregistered.' );

		// Re-register for other tests.
		register_taxonomy_for_object_type( 'post_tag', 'post' );
	}

	/**
	 * Test: canAssignCategories, canEditCategories, and categories are empty/false
	 * when category is unregistered for the post type.
	 *
	 * Regression test for taxonomy registration check (#111).
	 *
	 * @covers WP_Press_This_Plugin::html
	 */
	public function test_html_category_caps_and_data_when_category_unregistered() {
		unregister_taxonomy_for_object_type( 'category', 'post' );

		$data = $this->get_press_this_data_from_html();

		$this->assertFalse( $data['canAssignCategories'], 'canAssignCategories should be false when category is unregistered.' );
		$this->assertFalse( $data['canEditCategories'], 'canEditCategories should be false when category is unregistered.' );
		$this->assertEmpty( $data['categories'], 'categories should be empty when category is unregistered.' );

		// Re-register for other tests.
		register_taxonomy_for_object_type( 'category', 'post' );
	}

	/**
	 * Test: all taxonomy caps are false and categories empty when both taxonomies
	 * are unregistered for the post type.
	 *
	 * Regression test for taxonomy registration check (#111).
	 *
	 * @covers WP_Press_This_Plugin::html
	 */
	public function test_html_all_taxonomy_caps_false_when_both_unregistered() {
		unregister_taxonomy_for_object_type( 'category', 'post' );
		unregister_taxonomy_for_object_type( 'post_tag', 'post' );

		$data = $this->get_press_this_data_from_html();

		$this->assertFalse( $data['canAssignCategories'], 'canAssignCategories should be false.' );
		$this->assertFalse( $data['canEditCategories'], 'canEditCategories should be false.' );
		$this->assertFalse( $data['canAssignTags'], 'canAssignTags should be false.' );
		$this->assertEmpty( $data['categories'], 'categories should be empty.' );

		// Re-register for other tests.
		register_taxonomy_for_object_type( 'category', 'post' );
		register_taxonomy_for_object_type( 'post_tag', 'post' );
	}

	/**
	 * Test 8: Filter hook press_this_data is triggered.
	 *
	 * @covers WP_Press_This_Plugin::merge_or_fetch_data
	 */
	public function test_filter_press_this_data_is_triggered() {
		$filter_called = false;

		// Add filter to modify data.
		add_filter(
			'press_this_data',
			function ( $data ) use ( &$filter_called ) {
				$filter_called       = true;
				$data['custom_data'] = 'added_by_filter';
				return $data;
			}
		);

		$_GET['u'] = 'https://example.com/page';
		$_GET['t'] = 'Page Title';

		$data = $this->plugin->merge_or_fetch_data();

		$this->assertTrue( $filter_called );
		$this->assertArrayHasKey( 'custom_data', $data );
		$this->assertEquals( 'added_by_filter', $data['custom_data'] );
	}
}
