<?php
/**
 * Tests for post scheduling via the REST save endpoint.
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for REST API scheduling support.
 */
class Test_Scheduling extends BaseTestCase {

	/**
	 * Editor user ID (has publish_posts capability).
	 *
	 * @var int
	 */
	protected $editor_user_id;

	/**
	 * Contributor user ID (lacks publish_posts capability).
	 *
	 * @var int
	 */
	protected $contributor_user_id;

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

		// Ensure WordPress default roles are available.
		populate_roles();

		// Block HTTP requests to prevent actual image downloads during save.
		add_filter( 'pre_http_request', array( $this, 'block_http' ), 1 );

		// Create an editor user (has publish_posts).
		$this->editor_user_id = wp_insert_user(
			array(
				'user_login' => 'sched_editor_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password(),
				'user_email' => 'sched_editor_' . wp_generate_password( 6, false ) . '@example.com',
				'role'       => 'editor',
			)
		);

		// Create a contributor user (lacks publish_posts).
		$this->contributor_user_id = wp_insert_user(
			array(
				'user_login' => 'sched_contrib_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password(),
				'user_email' => 'sched_contrib_' . wp_generate_password( 6, false ) . '@example.com',
				'role'       => 'contributor',
			)
		);

		// Create a draft post owned by the editor.
		wp_set_current_user( $this->editor_user_id );
		$this->test_post_id = wp_insert_post(
			array(
				'post_author'  => $this->editor_user_id,
				'post_status'  => 'draft',
				'post_title'   => 'Scheduling Test Post',
				'post_content' => '',
			)
		);
	}

	/**
	 * Tear down after each test.
	 */
	public function tear_down() {
		remove_filter( 'pre_http_request', array( $this, 'block_http' ), 1 );
		parent::tear_down();
	}

	/**
	 * Block all HTTP requests during tests.
	 *
	 * @return WP_Error
	 */
	public function block_http() {
		return new WP_Error( 'http_blocked', 'Blocked in test' );
	}

	/**
	 * Build a WP_REST_Request for the save endpoint.
	 *
	 * @param array $params Parameters to set on the request.
	 * @return WP_REST_Request
	 */
	protected function build_save_request( $params = array() ) {
		$request = new WP_REST_Request( 'POST', '/press-this/v1/save' );
		$request->set_param( 'post_id', $this->test_post_id );
		$request->set_param( 'title', 'Scheduled Post' );
		$request->set_param( 'content', '<p>Content</p>' );

		foreach ( $params as $key => $value ) {
			$request->set_param( $key, $value );
		}

		return $request;
	}

	/**
	 * Test that 'future' is accepted in the status enum on the save endpoint.
	 */
	public function test_future_status_is_accepted() {
		wp_set_current_user( $this->editor_user_id );

		$future_date = gmdate( 'Y-m-d\TH:i:s', strtotime( '+1 week' ) );
		$request     = $this->build_save_request(
			array(
				'status' => 'future',
				'date'   => $future_date,
			)
		);

		$response = press_this_rest_save_post( $request );

		$this->assertInstanceOf( WP_REST_Response::class, $response );
		$data = $response->get_data();
		$this->assertTrue( $data['success'] );
		$this->assertEquals( 'future', get_post_status( $this->test_post_id ) );
	}

	/**
	 * Test that a date parameter is accepted and validated with strtotime().
	 */
	public function test_date_parameter_is_validated() {
		wp_set_current_user( $this->editor_user_id );

		$future_date = '2027-06-15T14:30:00';
		$request     = $this->build_save_request(
			array(
				'status' => 'future',
				'date'   => $future_date,
			)
		);

		$response = press_this_rest_save_post( $request );

		$this->assertInstanceOf( WP_REST_Response::class, $response );

		$post = get_post( $this->test_post_id );
		$this->assertEquals( '2027-06-15 14:30:00', $post->post_date );
	}

	/**
	 * Test that post_date and post_date_gmt are set when status is 'future' with a valid date.
	 */
	public function test_post_date_and_gmt_set_for_future_status() {
		wp_set_current_user( $this->editor_user_id );

		$future_date = '2027-06-15T14:30:00';
		$request     = $this->build_save_request(
			array(
				'status' => 'future',
				'date'   => $future_date,
			)
		);

		$response = press_this_rest_save_post( $request );
		$this->assertInstanceOf( WP_REST_Response::class, $response );

		$post = get_post( $this->test_post_id );
		$this->assertEquals( '2027-06-15 14:30:00', $post->post_date );
		$this->assertNotEmpty( $post->post_date_gmt );
		$this->assertNotEquals( '0000-00-00 00:00:00', $post->post_date_gmt );
	}

	/**
	 * Test that 'future' status without a valid date returns a WP_Error.
	 */
	public function test_future_status_without_date_returns_error() {
		wp_set_current_user( $this->editor_user_id );

		$request = $this->build_save_request(
			array(
				'status' => 'future',
				'date'   => '',
			)
		);

		$response = press_this_rest_save_post( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertEquals( 'press_this_invalid_date', $response->get_error_code() );
	}

	/**
	 * Test that 'future' status is gated behind publish_posts capability.
	 */
	public function test_future_status_gated_behind_publish_posts() {
		wp_set_current_user( $this->contributor_user_id );

		// Grant the contributor edit access to the post for the test.
		wp_update_post(
			array(
				'ID'          => $this->test_post_id,
				'post_author' => $this->contributor_user_id,
			)
		);

		$future_date = gmdate( 'Y-m-d\TH:i:s', strtotime( '+1 week' ) );
		$request     = $this->build_save_request(
			array(
				'status' => 'future',
				'date'   => $future_date,
			)
		);

		$response = press_this_rest_save_post( $request );

		$this->assertInstanceOf( WP_REST_Response::class, $response );
		$this->assertEquals( 'pending', get_post_status( $this->test_post_id ) );
	}
}
