<?php
/**
 * Tests for post format filter functionality.
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for post format filters.
 */
class Test_Post_Format_Filters extends BaseTestCase {

	/**
	 * Plugin instance.
	 *
	 * @var WP_Press_This_Plugin
	 */
	protected $plugin;

	/**
	 * Set up before each test.
	 */
	public function set_up() {
		parent::set_up();

		// Load the plugin class.
		require_once dirname( dirname( __DIR__ ) ) . '/class-wp-press-this-plugin.php';

		$this->plugin = new WP_Press_This_Plugin();

		// Remove any existing filters from previous tests.
		remove_all_filters( 'press_this_post_format_override' );
		remove_all_filters( 'press_this_default_post_format' );
		remove_all_filters( 'press_this_post_format_suggestion' );
	}

	/**
	 * Tear down after each test.
	 */
	public function tear_down() {
		parent::tear_down();

		// Clean up filters.
		remove_all_filters( 'press_this_post_format_override' );
		remove_all_filters( 'press_this_default_post_format' );
		remove_all_filters( 'press_this_post_format_suggestion' );
	}

	/**
	 * Test: Override filter bypasses all detection.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_override_filter_bypasses_detection() {
		// Set override to 'aside'.
		add_filter(
			'press_this_post_format_override',
			function () {
				return 'aside';
			}
		);

		// Data that would normally trigger 'video' format.
		$data = array(
			'u'       => 'https://www.youtube.com/watch?v=test123',
			'_embeds' => array( 'https://www.youtube.com/watch?v=test123' ),
		);

		$result = $this->plugin->get_suggested_post_format( $data );

		// Override should win over video detection.
		$this->assertEquals( 'aside', $result );
	}

	/**
	 * Test: Override filter with empty value continues to detection.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_override_filter_empty_continues_detection() {
		// Set override to empty string (no override).
		add_filter(
			'press_this_post_format_override',
			function () {
				return '';
			}
		);

		// Data that triggers video detection.
		$data = array(
			'u'       => 'https://www.youtube.com/watch?v=test123',
			'_embeds' => array( 'https://www.youtube.com/watch?v=test123' ),
		);

		$result = $this->plugin->get_suggested_post_format( $data );

		// Video detection should work.
		$this->assertEquals( 'video', $result );
	}

	/**
	 * Test: Override filter receives no arguments.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_override_filter_receives_no_arguments() {
		$arg_count = null;

		add_filter(
			'press_this_post_format_override',
			function () use ( &$arg_count ) {
				$arg_count = func_num_args();
				return '';
			}
		);

		$this->plugin->get_suggested_post_format( array() );

		// Filter should receive exactly 1 argument (the default value).
		$this->assertEquals( 1, $arg_count );
	}

	/**
	 * Test: Default filter is NOT applied in get_suggested_post_format.
	 *
	 * The default filter should only be passed to JS, not applied in PHP.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_default_filter_not_applied_in_get_suggested_post_format() {
		$filter_called = false;

		add_filter(
			'press_this_default_post_format',
			function () use ( &$filter_called ) {
				$filter_called = true;
				return 'link';
			}
		);

		// Empty data - no detection should match.
		$data   = array();
		$result = $this->plugin->get_suggested_post_format( $data );

		// Default filter should NOT be called in get_suggested_post_format.
		// It's only called separately when building window.pressThisData.
		$this->assertFalse( $filter_called );
		$this->assertEquals( '', $result );
	}

	/**
	 * Test: Suggestion filter receives $data.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_suggestion_filter_receives_data() {
		$received_data = null;

		add_filter(
			'press_this_post_format_suggestion',
			function ( $format, $data ) use ( &$received_data ) {
				$received_data = $data;
				return $format;
			},
			10,
			2
		);

		$test_data = array(
			'u'       => 'https://example.com',
			's'       => 'Some selected text',
			'_images' => array( 'https://example.com/image.jpg' ),
		);

		$this->plugin->get_suggested_post_format( $test_data );

		// Filter should receive the full data array.
		$this->assertIsArray( $received_data );
		$this->assertEquals( $test_data['u'], $received_data['u'] );
		$this->assertEquals( $test_data['s'], $received_data['s'] );
	}

	/**
	 * Test: Video detection from YouTube embed.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_video_detection_from_youtube_embed() {
		$data = array(
			'_embeds' => array( 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' ),
		);

		$result = $this->plugin->get_suggested_post_format( $data );

		$this->assertEquals( 'video', $result );
	}

	/**
	 * Test: Video detection from Vimeo URL.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_video_detection_from_vimeo_url() {
		$data = array(
			'u' => 'https://vimeo.com/123456789',
		);

		$result = $this->plugin->get_suggested_post_format( $data );

		$this->assertEquals( 'video', $result );
	}

	/**
	 * Test: Quote detection from long selected text.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_quote_detection_from_selected_text() {
		$data = array(
			's' => 'This is a long piece of selected text that is definitely longer than fifty characters and should trigger the quote format detection.',
		);

		$result = $this->plugin->get_suggested_post_format( $data );

		$this->assertEquals( 'quote', $result );
	}

	/**
	 * Test: Quote detection ignores text with URLs.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_quote_detection_ignores_text_with_urls() {
		$data = array(
			's' => 'This is a long piece of selected text that contains http://example.com and should not trigger quote format.',
		);

		$result = $this->plugin->get_suggested_post_format( $data );

		// Should not be quote because it contains a URL.
		$this->assertNotEquals( 'quote', $result );
	}

	/**
	 * Test: URL-only content no longer suggests link format.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_url_only_does_not_suggest_link() {
		$data = array(
			'u' => 'https://example.com/article',
			// No selected text, images, or embeds.
		);

		$result = $this->plugin->get_suggested_post_format( $data );

		$this->assertEquals( '', $result );
	}

	/**
	 * Test: No format detected returns empty string.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_no_format_detected_returns_empty() {
		// Data with URL but also images (so not link-only).
		$data = array(
			'u'       => 'https://example.com/article',
			'_images' => array( 'https://example.com/image.jpg' ),
		);

		$result = $this->plugin->get_suggested_post_format( $data );

		$this->assertEquals( '', $result );
	}

	/**
	 * Test: Suggestion filter can modify detected format.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_suggestion_filter_can_modify_format() {
		add_filter(
			'press_this_post_format_suggestion',
			function ( $format, $data ) {
				// Override video with image if images present.
				if ( 'video' === $format && ! empty( $data['_images'] ) ) {
					return 'image';
				}
				return $format;
			},
			10,
			2
		);

		$data = array(
			'u'       => 'https://www.youtube.com/watch?v=test123',
			'_embeds' => array( 'https://www.youtube.com/watch?v=test123' ),
			'_images' => array( 'https://example.com/image.jpg' ),
		);

		$result = $this->plugin->get_suggested_post_format( $data );

		// Suggestion filter should change video to image.
		$this->assertEquals( 'image', $result );
	}

	/**
	 * Test: Priority order - override wins over video.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_priority_override_wins_over_video() {
		add_filter(
			'press_this_post_format_override',
			function () {
				return 'status';
			}
		);

		$data = array(
			'u'       => 'https://www.youtube.com/watch?v=test123',
			'_embeds' => array( 'https://www.youtube.com/watch?v=test123' ),
		);

		$result = $this->plugin->get_suggested_post_format( $data );

		$this->assertEquals( 'status', $result );
	}

	/**
	 * Test: Priority order - video wins over quote.
	 *
	 * @covers WP_Press_This_Plugin::get_suggested_post_format
	 */
	public function test_priority_video_wins_over_quote() {
		$data = array(
			'u'       => 'https://www.youtube.com/watch?v=test123',
			'_embeds' => array( 'https://www.youtube.com/watch?v=test123' ),
			's'       => 'This is a very long piece of selected text that would normally trigger quote detection but video should win.',
		);

		$result = $this->plugin->get_suggested_post_format( $data );

		$this->assertEquals( 'video', $result );
	}
}
