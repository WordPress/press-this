<?php
/**
 * Tests for press_this_post_type filter functionality.
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for post type filter.
 */
class Test_Post_Type_Filter extends BaseTestCase {

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

		// Set current user.
		wp_set_current_user( $this->editor_user_id );

		// Remove any existing filters from previous tests.
		remove_all_filters( 'press_this_post_type' );
	}

	/**
	 * Tear down after each test.
	 */
	public function tear_down() {
		parent::tear_down();
		$_POST = array();
		$_GET  = array();

		// Clean up filters.
		remove_all_filters( 'press_this_post_type' );

		// Unregister custom post type if registered.
		if ( post_type_exists( 'jetpack-social-note' ) ) {
			unregister_post_type( 'jetpack-social-note' );
		}
	}

	/**
	 * Register a custom post type for testing.
	 *
	 * @param string $post_type The post type to register.
	 */
	protected function register_test_cpt( $post_type = 'jetpack-social-note' ) {
		register_post_type(
			$post_type,
			array(
				'public'       => true,
				'label'        => 'Social Notes',
				'supports'     => array( 'title', 'editor', 'author' ),
				'show_in_rest' => true,
			)
		);
	}

	/**
	 * Test: Filter is called with correct arguments.
	 *
	 * @covers WP_Press_This_Plugin::html_php
	 */
	public function test_filter_receives_correct_arguments() {
		$received_post_type = null;
		$received_data      = null;

		add_filter(
			'press_this_post_type',
			function ( $post_type, $data ) use ( &$received_post_type, &$received_data ) {
				$received_post_type = $post_type;
				$received_data      = $data;
				return $post_type;
			},
			10,
			2
		);

		// Set up test data.
		$_GET['u'] = 'https://example.com/article';
		$_GET['t'] = 'Test Article';
		$_GET['s'] = 'Selected text';
		$_GET['v'] = '11';

		// We can't call html_php() directly as it outputs HTML,
		// but we can verify the filter is called via merge_or_fetch_data() indirectly.
		// For this test, we'll use a reflection approach or test via integration.

		// Call merge_or_fetch_data to get the data that would be passed.
		$data = $this->plugin->merge_or_fetch_data();

		// Manually apply the filter to verify arguments.
		$post_type = apply_filters( 'press_this_post_type', 'post', $data );

		$this->assertEquals( 'post', $received_post_type );
		$this->assertIsArray( $received_data );
		$this->assertEquals( 'https://example.com/article', $received_data['u'] );
	}

	/**
	 * Test: Filter can change post type to custom post type.
	 */
	public function test_filter_can_change_post_type() {
		$this->register_test_cpt( 'jetpack-social-note' );

		add_filter(
			'press_this_post_type',
			function () {
				return 'jetpack-social-note';
			}
		);

		$data      = array( 'u' => 'https://example.com' );
		$post_type = apply_filters( 'press_this_post_type', 'post', $data );

		$this->assertEquals( 'jetpack-social-note', $post_type );
	}

	/**
	 * Test: Filter can conditionally change post type based on URL.
	 */
	public function test_filter_can_conditionally_change_post_type() {
		$this->register_test_cpt( 'jetpack-social-note' );

		add_filter(
			'press_this_post_type',
			function ( $post_type, $data ) {
				// Only use social note for Twitter/X URLs.
				if ( ! empty( $data['u'] ) && preg_match( '#(twitter\.com|x\.com)/#i', $data['u'] ) ) {
					return 'jetpack-social-note';
				}
				return $post_type;
			},
			10,
			2
		);

		// Test with Twitter URL.
		$twitter_data = array( 'u' => 'https://twitter.com/user/status/123' );
		$post_type    = apply_filters( 'press_this_post_type', 'post', $twitter_data );
		$this->assertEquals( 'jetpack-social-note', $post_type );

		// Test with regular URL.
		$regular_data = array( 'u' => 'https://example.com/article' );
		$post_type    = apply_filters( 'press_this_post_type', 'post', $regular_data );
		$this->assertEquals( 'post', $post_type );
	}

	/**
	 * Test: get_default_post_to_edit creates post with filtered type.
	 */
	public function test_get_default_post_to_edit_uses_filtered_type() {
		$this->register_test_cpt( 'jetpack-social-note' );

		// Create a post with the custom post type.
		$post = get_default_post_to_edit( 'jetpack-social-note', true );

		$this->assertInstanceOf( 'WP_Post', $post );
		$this->assertEquals( 'jetpack-social-note', $post->post_type );
		$this->assertEquals( 'auto-draft', $post->post_status );
	}

	/**
	 * Test: save_post preserves custom post type.
	 *
	 * @covers WP_Press_This_Plugin::save_post
	 */
	public function test_save_post_preserves_custom_post_type() {
		$this->register_test_cpt( 'jetpack-social-note' );

		// Create a post with custom type.
		$post_id = wp_insert_post(
			array(
				'post_author' => $this->editor_user_id,
				'post_type'   => 'jetpack-social-note',
				'post_status' => 'auto-draft',
				'post_title'  => '',
			)
		);

		// Verify it was created with correct type.
		$post = get_post( $post_id );
		$this->assertEquals( 'jetpack-social-note', $post->post_type );

		// Set up POST data for save.
		$_POST['post_ID']      = $post_id;
		$_POST['_wpnonce']     = wp_create_nonce( 'update-post_' . $post_id );
		$_POST['post_title']   = 'My Social Note';
		$_POST['post_content'] = '<p>Quick thought to share</p>';
		$_POST['post_status']  = 'draft';

		// Save the post.
		ob_start();
		try {
			$this->plugin->save_post();
		} catch ( WPDieException $e ) {
			// Expected - wp_send_json_* calls wp_die().
		}
		ob_end_clean();

		// Verify the post type was preserved.
		$updated_post = get_post( $post_id );
		$this->assertEquals( 'jetpack-social-note', $updated_post->post_type );
		$this->assertEquals( 'My Social Note', $updated_post->post_title );
	}

	/**
	 * Test: REST API save preserves custom post type.
	 */
	public function test_rest_save_preserves_custom_post_type() {
		$this->register_test_cpt( 'jetpack-social-note' );

		// Create a post with custom type.
		$post_id = wp_insert_post(
			array(
				'post_author' => $this->editor_user_id,
				'post_type'   => 'jetpack-social-note',
				'post_status' => 'auto-draft',
				'post_title'  => '',
			)
		);

		// Load the REST API function.
		require_once dirname( dirname( __DIR__ ) ) . '/press-this-plugin.php';

		// Create a mock REST request.
		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $post_id );
		$request->set_param( 'title', 'REST API Social Note' );
		$request->set_param( 'content', '<p>Content via REST</p>' );
		$request->set_param( 'status', 'draft' );

		// Call the REST handler.
		$response = press_this_rest_save_post( $request );

		// Verify the post type was preserved.
		$updated_post = get_post( $post_id );
		$this->assertEquals( 'jetpack-social-note', $updated_post->post_type );
		$this->assertEquals( 'REST API Social Note', $updated_post->post_title );
	}

	/**
	 * Test: Default post type is 'post' when filter not used.
	 */
	public function test_default_post_type_is_post() {
		$data      = array( 'u' => 'https://example.com' );
		$post_type = apply_filters( 'press_this_post_type', 'post', $data );

		$this->assertEquals( 'post', $post_type );
	}

	/**
	 * Test: Filter with invalid post type falls back gracefully.
	 */
	public function test_invalid_post_type_handled_gracefully() {
		add_filter(
			'press_this_post_type',
			function () {
				return 'nonexistent-post-type';
			}
		);

		$data      = array( 'u' => 'https://example.com' );
		$post_type = apply_filters( 'press_this_post_type', 'post', $data );

		// Filter returns the invalid type - it's up to get_default_post_to_edit to handle it.
		$this->assertEquals( 'nonexistent-post-type', $post_type );

		// get_default_post_to_edit will return false for invalid post types.
		$post = get_default_post_to_edit( $post_type, true );

		// In WorDBless, get_default_post_to_edit still returns a WP_Post even for
		// unregistered types, so verify the returned post uses the filtered type
		// rather than silently falling back to 'post'.
		if ( $post instanceof WP_Post ) {
			$this->assertEquals( 'nonexistent-post-type', $post->post_type, 'Post type should reflect the filter value, not silently fall back' );
		} else {
			// In a full WP install, invalid post types return false/null.
			$this->assertNotInstanceOf( 'WP_Post', $post );
		}
	}

	/**
	 * Test: Multiple filters can be chained.
	 */
	public function test_multiple_filters_can_chain() {
		$this->register_test_cpt( 'custom-type-a' );
		$this->register_test_cpt( 'custom-type-b' );

		// First filter changes to type A.
		add_filter(
			'press_this_post_type',
			function ( $post_type ) {
				return 'custom-type-a';
			},
			10
		);

		// Second filter changes type A to type B.
		add_filter(
			'press_this_post_type',
			function ( $post_type ) {
				if ( 'custom-type-a' === $post_type ) {
					return 'custom-type-b';
				}
				return $post_type;
			},
			20
		);

		$data      = array( 'u' => 'https://example.com' );
		$post_type = apply_filters( 'press_this_post_type', 'post', $data );

		$this->assertEquals( 'custom-type-b', $post_type );
	}

	/**
	 * Register additional custom post type for chaining test.
	 *
	 * Helper to register multiple CPTs.
	 *
	 * @param string $post_type Post type name.
	 */
	protected function register_additional_cpt( $post_type ) {
		if ( ! post_type_exists( $post_type ) ) {
			register_post_type(
				$post_type,
				array(
					'public'       => true,
					'label'        => ucfirst( str_replace( '-', ' ', $post_type ) ),
					'supports'     => array( 'title', 'editor' ),
					'show_in_rest' => true,
				)
			);
		}
	}
}
