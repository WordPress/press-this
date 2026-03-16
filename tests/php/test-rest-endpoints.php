<?php
/**
 * Tests for Press This REST API endpoints.
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for REST API endpoints.
 */
class Test_Press_This_REST_Endpoints extends BaseTestCase {

	/**
	 * Editor user ID.
	 *
	 * @var int
	 */
	private $editor_user_id;

	/**
	 * Contributor user ID.
	 *
	 * @var int
	 */
	private $contributor_user_id;

	/**
	 * Subscriber user ID.
	 *
	 * @var int
	 */
	private $subscriber_user_id;

	/**
	 * Test post ID.
	 *
	 * @var int
	 */
	private $test_post_id;

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
				'user_login' => 'rest_editor_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password(),
				'user_email' => 'rest_editor_' . wp_generate_password( 6, false ) . '@example.com',
				'role'       => 'editor',
			)
		);

		$this->contributor_user_id = wp_insert_user(
			array(
				'user_login' => 'rest_contrib_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password(),
				'user_email' => 'rest_contrib_' . wp_generate_password( 6, false ) . '@example.com',
				'role'       => 'contributor',
			)
		);

		$this->subscriber_user_id = wp_insert_user(
			array(
				'user_login' => 'rest_sub_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password(),
				'user_email' => 'rest_sub_' . wp_generate_password( 6, false ) . '@example.com',
				'role'       => 'subscriber',
			)
		);

		wp_set_current_user( $this->editor_user_id );
		$this->test_post_id = wp_insert_post(
			array(
				'post_author'  => $this->editor_user_id,
				'post_status'  => 'draft',
				'post_title'   => 'REST Test Post',
				'post_content' => 'REST test content',
			)
		);
	}

	/**
	 * Tear down after each test.
	 */
	public function tear_down() {
		parent::tear_down();
		remove_all_filters( 'press_this_enable_url_proxy' );
		remove_all_filters( 'press_this_save_post' );
		remove_all_filters( 'press_this_save_redirect' );
		press_this_http_request_context( false );
	}

	/**
	 * Test that all 4 REST routes are registered.
	 */
	public function test_routes_are_registered() {
		do_action( 'rest_api_init' );

		$server = rest_get_server();
		$routes = $server->get_routes();

		$this->assertArrayHasKey( '/press-this/v1/scrape', $routes );
		$this->assertArrayHasKey( '/press-this/v1/save', $routes );
		$this->assertArrayHasKey( '/press-this/v1/sideload', $routes );
		$this->assertArrayHasKey( '/press-this/v1/validate-embeds', $routes );
	}

	/**
	 * Test that all routes use POST method.
	 */
	public function test_routes_use_post_method() {
		do_action( 'rest_api_init' );
		$server = rest_get_server();
		$routes = $server->get_routes();

		$route_paths = array(
			'/press-this/v1/scrape',
			'/press-this/v1/save',
			'/press-this/v1/sideload',
			'/press-this/v1/validate-embeds',
		);

		foreach ( $route_paths as $path ) {
			$has_post = false;
			foreach ( $routes[ $path ] as $endpoint ) {
				if ( isset( $endpoint['methods']['POST'] ) ) {
					$has_post = true;
					break;
				}
			}
			$this->assertTrue( $has_post, "Route $path should accept POST" );
		}
	}

	/**
	 * Test save permission requires edit_post capability.
	 */
	public function test_save_permission_requires_edit_post() {
		wp_set_current_user( $this->editor_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $this->test_post_id );

		$result = press_this_rest_save_permission( $request );
		$this->assertTrue( $result );
	}

	/**
	 * Test save permission denies subscriber.
	 */
	public function test_save_permission_denies_subscriber() {
		wp_set_current_user( $this->subscriber_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $this->test_post_id );

		$result = press_this_rest_save_permission( $request );
		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'press_this_cannot_edit', $result->get_error_code() );
	}

	/**
	 * Test save permission returns error when post_id is missing.
	 */
	public function test_save_permission_requires_post_id() {
		wp_set_current_user( $this->editor_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );

		$result = press_this_rest_save_permission( $request );
		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'press_this_missing_post_id', $result->get_error_code() );
	}

	/**
	 * Test sideload permission requires upload_files capability.
	 */
	public function test_sideload_permission_requires_upload_files() {
		wp_set_current_user( $this->editor_user_id );
		$result = press_this_rest_sideload_permission();
		$this->assertTrue( $result );
	}

	/**
	 * Test sideload permission denies contributor.
	 */
	public function test_sideload_permission_denies_contributor() {
		wp_set_current_user( $this->contributor_user_id );
		$result = press_this_rest_sideload_permission();
		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'press_this_cannot_upload', $result->get_error_code() );
	}

	/**
	 * Test scrape permission requires proxy enabled.
	 */
	public function test_scrape_permission_requires_proxy_enabled() {
		wp_set_current_user( $this->editor_user_id );
		$request = new WP_REST_Request( 'POST', '/press-this/v1/scrape' );

		$result = press_this_rest_scrape_permission( $request );
		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'press_this_proxy_disabled', $result->get_error_code() );
	}

	/**
	 * Test scrape permission allows editor when proxy is enabled.
	 */
	public function test_scrape_permission_allows_with_proxy() {
		wp_set_current_user( $this->editor_user_id );
		add_filter( 'press_this_enable_url_proxy', '__return_true' );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/scrape' );
		$result  = press_this_rest_scrape_permission( $request );
		$this->assertTrue( $result );
	}

	/**
	 * Test scrape permission denies subscriber even with proxy.
	 */
	public function test_scrape_permission_denies_subscriber() {
		wp_set_current_user( $this->subscriber_user_id );
		add_filter( 'press_this_enable_url_proxy', '__return_true' );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/scrape' );
		$result  = press_this_rest_scrape_permission( $request );
		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'press_this_cannot_scrape', $result->get_error_code() );
	}

	/**
	 * Test validate-embeds permission requires edit_posts.
	 */
	public function test_validate_embeds_permission_requires_edit_posts() {
		wp_set_current_user( $this->editor_user_id );
		$result = press_this_rest_validate_embeds_permission();
		$this->assertTrue( $result );
	}

	/**
	 * Test validate-embeds permission denies subscriber.
	 */
	public function test_validate_embeds_permission_denies_subscriber() {
		wp_set_current_user( $this->subscriber_user_id );
		$result = press_this_rest_validate_embeds_permission();
		$this->assertInstanceOf( 'WP_Error', $result );
		$this->assertEquals( 'press_this_cannot_validate', $result->get_error_code() );
	}

	/**
	 * Test save handler updates post title and content.
	 */
	public function test_save_updates_post_title_and_content() {
		wp_set_current_user( $this->editor_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $this->test_post_id );
		$request->set_param( 'title', 'Updated Title' );
		$request->set_param( 'content', '<p>Updated content</p>' );
		$request->set_param( 'status', 'draft' );

		$response = press_this_rest_save_post( $request );
		$data     = $response->get_data();

		$this->assertTrue( $data['success'] );
		$this->assertEquals( $this->test_post_id, $data['post_id'] );

		$post = get_post( $this->test_post_id );
		$this->assertEquals( 'Updated Title', $post->post_title );
		$this->assertStringContainsString( 'Updated content', $post->post_content );
	}

	/**
	 * Test save handler handles publish status.
	 */
	public function test_save_handles_publish_status() {
		wp_set_current_user( $this->editor_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $this->test_post_id );
		$request->set_param( 'title', 'Published Post' );
		$request->set_param( 'content', '<p>Content</p>' );
		$request->set_param( 'status', 'publish' );

		$response = press_this_rest_save_post( $request );
		$data     = $response->get_data();

		$post = get_post( $this->test_post_id );
		$this->assertEquals( 'publish', $post->post_status );
		$this->assertNotEmpty( $data['redirect'] );
	}

	/**
	 * Test save downgrades publish to pending for contributors.
	 */
	public function test_save_downgrades_publish_for_contributors() {
		wp_set_current_user( $this->contributor_user_id );
		$contrib_post_id = wp_insert_post(
			array(
				'post_author'  => $this->contributor_user_id,
				'post_status'  => 'draft',
				'post_title'   => 'Contributor Post',
				'post_content' => 'Content',
			)
		);

		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $contrib_post_id );
		$request->set_param( 'title', 'Try Publish' );
		$request->set_param( 'content', '<p>Content</p>' );
		$request->set_param( 'status', 'publish' );

		press_this_rest_save_post( $request );

		$post = get_post( $contrib_post_id );
		$this->assertEquals( 'pending', $post->post_status );
	}

	/**
	 * Test save handles categories.
	 */
	public function test_save_handles_categories() {
		wp_set_current_user( $this->editor_user_id );

		$cat_id = wp_insert_term( 'REST Test Category', 'category' );
		if ( is_wp_error( $cat_id ) ) {
			$cat_id = $cat_id->get_error_data()['term_id'];
		} else {
			$cat_id = $cat_id['term_id'];
		}

		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $this->test_post_id );
		$request->set_param( 'title', 'Categorized' );
		$request->set_param( 'content', '<p>Content</p>' );
		$request->set_param( 'categories', array( $cat_id ) );

		press_this_rest_save_post( $request );

		$categories = wp_get_post_categories( $this->test_post_id );
		$this->assertContains( $cat_id, $categories );
	}

	/**
	 * Test save handles tags.
	 */
	public function test_save_handles_tags() {
		wp_set_current_user( $this->editor_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $this->test_post_id );
		$request->set_param( 'title', 'Tagged' );
		$request->set_param( 'content', '<p>Content</p>' );
		$request->set_param( 'tags', array( 'rest-tag-1', 'rest-tag-2' ) );

		press_this_rest_save_post( $request );

		$tags = wp_get_post_tags( $this->test_post_id, array( 'fields' => 'names' ) );
		$this->assertContains( 'rest-tag-1', $tags );
		$this->assertContains( 'rest-tag-2', $tags );
	}

	/**
	 * Test save blocks external redirects.
	 */
	public function test_save_blocks_external_redirects() {
		wp_set_current_user( $this->editor_user_id );

		add_filter(
			'press_this_save_redirect',
			function () {
				return 'https://evil-site.com/phishing';
			}
		);

		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $this->test_post_id );
		$request->set_param( 'title', 'Redirect Test' );
		$request->set_param( 'content', '<p>Content</p>' );
		$request->set_param( 'status', 'publish' );

		$response = press_this_rest_save_post( $request );
		$data     = $response->get_data();

		$this->assertNotEmpty( $data['redirect'], 'Published post should return a redirect URL' );
		$this->assertStringNotContainsString( 'evil-site.com', $data['redirect'] );
	}

	/**
	 * Test save preserves post type.
	 */
	public function test_save_preserves_post_type() {
		wp_set_current_user( $this->editor_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $this->test_post_id );
		$request->set_param( 'title', 'Type Preserved' );
		$request->set_param( 'content', '<p>Content</p>' );

		press_this_rest_save_post( $request );

		$post = get_post( $this->test_post_id );
		$this->assertEquals( 'post', $post->post_type );
	}

	/**
	 * Test validate-embeds returns valid oEmbed URLs.
	 */
	public function test_validate_embeds_returns_valid_urls() {
		wp_set_current_user( $this->editor_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/validate-embeds' );
		$request->set_param(
			'urls',
			array(
				'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				'https://not-a-real-embed.example.com/foo',
			)
		);

		$response = press_this_rest_validate_embeds( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'embeds', $data );
		$this->assertIsArray( $data['embeds'] );

		$found_youtube = false;
		foreach ( $data['embeds'] as $url ) {
			if ( false !== strpos( $url, 'youtube.com' ) ) {
				$found_youtube = true;
			}
		}
		$this->assertTrue( $found_youtube, 'YouTube URL should be validated as valid embed' );
	}

	/**
	 * Test validate-embeds handles non-array input.
	 */
	public function test_validate_embeds_handles_non_array() {
		wp_set_current_user( $this->editor_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/validate-embeds' );
		$request->set_param( 'urls', 'not-an-array' );

		$response = press_this_rest_validate_embeds( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'embeds', $data );
		$this->assertEmpty( $data['embeds'] );
	}

	/**
	 * Test scrape validates URL safety.
	 */
	public function test_scrape_validates_url_safety() {
		wp_set_current_user( $this->editor_user_id );
		add_filter( 'press_this_enable_url_proxy', '__return_true' );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/scrape' );
		$request->set_param( 'url', 'http://127.0.0.1/admin' );

		$response = press_this_rest_scrape_url( $request );

		$this->assertInstanceOf( 'WP_Error', $response );
	}

	/**
	 * Test scrape handles fetch failure.
	 */
	public function test_scrape_handles_fetch_failure() {
		wp_set_current_user( $this->editor_user_id );
		add_filter( 'press_this_enable_url_proxy', '__return_true' );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/scrape' );
		$request->set_param( 'url', 'https://this-domain-does-not-exist-at-all.invalid/page' );

		$response = press_this_rest_scrape_url( $request );

		$this->assertInstanceOf( 'WP_Error', $response );
	}

	/**
	 * Test sideload validates URL.
	 */
	public function test_sideload_validates_url() {
		wp_set_current_user( $this->editor_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/sideload' );
		$request->set_param( 'url', '' );

		$response = press_this_rest_sideload_image( $request );

		$this->assertInstanceOf( 'WP_Error', $response );
		$this->assertEquals( 'press_this_invalid_url', $response->get_error_code() );
	}

	/**
	 * Test sideload rejects private IP URLs.
	 */
	public function test_sideload_rejects_private_ip() {
		wp_set_current_user( $this->editor_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/sideload' );
		$request->set_param( 'url', 'http://10.0.0.1/image.jpg' );

		$response = press_this_rest_sideload_image( $request );

		$this->assertInstanceOf( 'WP_Error', $response );
	}

	/**
	 * Test save returns redirect URL for draft with force_redirect.
	 */
	public function test_save_returns_redirect_with_force() {
		wp_set_current_user( $this->editor_user_id );

		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $this->test_post_id );
		$request->set_param( 'title', 'Force Redirect' );
		$request->set_param( 'content', '<p>Content</p>' );
		$request->set_param( 'status', 'draft' );
		$request->set_param( 'force_redirect', true );

		$response = press_this_rest_save_post( $request );
		$data     = $response->get_data();

		$this->assertTrue( $data['force'] );
	}
}
