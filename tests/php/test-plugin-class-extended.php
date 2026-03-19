<?php
/**
 * Extended tests for WP_Press_This_Plugin class.
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for extended WP_Press_This_Plugin coverage.
 */
class Test_WP_Press_This_Plugin_Extended extends BaseTestCase {

	/**
	 * Plugin instance.
	 *
	 * @var WP_Press_This_Plugin
	 */
	private $plugin;

	/**
	 * ReflectionClass for accessing private methods.
	 *
	 * @var ReflectionClass
	 */
	private $reflection;

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

		if ( ! class_exists( 'WP_Press_This_Plugin' ) ) {
			require_once dirname( dirname( __DIR__ ) ) . '/class-wp-press-this-plugin.php';
		}

		$this->plugin     = new WP_Press_This_Plugin();
		$this->reflection = new ReflectionClass( $this->plugin );

		$this->editor_user_id = wp_insert_user(
			array(
				'user_login' => 'ext_editor_' . wp_generate_password( 6, false ),
				'user_pass'  => wp_generate_password(),
				'user_email' => 'ext_editor_' . wp_generate_password( 6, false ) . '@example.com',
				'role'       => 'editor',
			)
		);

		wp_set_current_user( $this->editor_user_id );
	}

	/**
	 * Tear down after each test.
	 */
	public function tear_down() {
		parent::tear_down();
		remove_all_filters( 'press_this_allowed_blocks' );
		remove_all_filters( 'press_this_post_format_override' );
		remove_all_filters( 'press_this_post_format_suggestion' );
	}

	/**
	 * Invoke a private method on the plugin instance.
	 *
	 * @param string $method_name Method name.
	 * @param array  $args        Arguments.
	 * @return mixed Return value.
	 */
	private function invoke_private( $method_name, $args = array() ) {
		$method = $this->reflection->getMethod( $method_name );
		$method->setAccessible( true );
		return $method->invokeArgs( $this->plugin, $args );
	}

	/**
	 * Set a private property on the plugin instance.
	 *
	 * @param string $prop_name Property name.
	 * @param mixed  $value     Value.
	 */
	private function set_private_property( $prop_name, $value ) {
		$prop = $this->reflection->getProperty( $prop_name );
		$prop->setAccessible( true );
		$prop->setValue( $this->plugin, $value );
	}

	// ---- limit_array ----

	/**
	 * Test limit_array with array under 50.
	 */
	public function test_limit_array_under_50() {
		$input  = range( 1, 10 );
		$result = $this->invoke_private( 'limit_array', array( $input ) );
		$this->assertCount( 10, $result );
	}

	/**
	 * Test limit_array with array over 50.
	 */
	public function test_limit_array_over_50() {
		$input  = range( 1, 60 );
		$result = $this->invoke_private( 'limit_array', array( $input ) );
		$this->assertCount( 50, $result );
	}

	/**
	 * Test limit_array with non-array input.
	 */
	public function test_limit_array_non_array() {
		$result = $this->invoke_private( 'limit_array', array( 'not-an-array' ) );
		$this->assertEquals( array(), $result );
	}

	// ---- limit_string ----

	/**
	 * Test limit_string with short string.
	 */
	public function test_limit_string_under_5000() {
		$result = $this->invoke_private( 'limit_string', array( 'Hello World' ) );
		$this->assertEquals( 'Hello World', $result );
	}

	/**
	 * Test limit_string with long string.
	 */
	public function test_limit_string_over_5000() {
		$input  = str_repeat( 'a', 6000 );
		$result = $this->invoke_private( 'limit_string', array( $input ) );
		$this->assertLessThanOrEqual( 5000, mb_strlen( $result ) );
	}

	/**
	 * Test limit_string with non-string input.
	 */
	public function test_limit_string_non_string() {
		$result = $this->invoke_private( 'limit_string', array( array( 'not', 'a', 'string' ) ) );
		$this->assertEquals( '', $result );
	}

	/**
	 * Test limit_string with numeric input.
	 */
	public function test_limit_string_numeric() {
		$result = $this->invoke_private( 'limit_string', array( 42 ) );
		$this->assertEquals( 42, $result );
	}

	/**
	 * Test limit_string with boolean input.
	 */
	public function test_limit_string_boolean() {
		$result = $this->invoke_private( 'limit_string', array( true ) );
		$this->assertTrue( $result );
	}

	// ---- limit_url ----

	/**
	 * Test limit_url with valid HTTP URL.
	 */
	public function test_limit_url_valid_http() {
		$result = $this->invoke_private( 'limit_url', array( 'http://example.com/page' ) );
		$this->assertNotEmpty( $result );
		$this->assertStringStartsWith( 'http', $result );
	}

	/**
	 * Test limit_url with valid HTTPS URL.
	 */
	public function test_limit_url_valid_https() {
		$result = $this->invoke_private( 'limit_url', array( 'https://example.com/page' ) );
		$this->assertNotEmpty( $result );
		$this->assertStringStartsWith( 'https', $result );
	}

	/**
	 * Test limit_url rejects non-HTTP schemes.
	 */
	public function test_limit_url_rejects_non_http() {
		$result = $this->invoke_private( 'limit_url', array( 'javascript:alert(1)' ) );
		$this->assertEmpty( $result );
	}

	/**
	 * Test limit_url rejects URLs over 2048 characters.
	 */
	public function test_limit_url_rejects_long_urls() {
		$long_url = 'https://example.com/' . str_repeat( 'a', 2100 );
		$result   = $this->invoke_private( 'limit_url', array( $long_url ) );
		$this->assertEmpty( $result );
	}

	/**
	 * Test limit_url with non-string input.
	 */
	public function test_limit_url_non_string() {
		$result = $this->invoke_private( 'limit_url', array( 123 ) );
		$this->assertEmpty( $result );
	}

	/**
	 * Test limit_url resolves relative URL with domain set.
	 */
	public function test_limit_url_resolves_relative() {
		$this->set_private_property( 'domain', 'https://example.com' );
		$result = $this->invoke_private( 'limit_url', array( '/path/to/page' ) );
		$this->assertNotEmpty( $result );
		$this->assertStringContainsString( 'example.com', $result );
	}

	// ---- limit_img ----

	/**
	 * Test limit_img with valid image URL.
	 */
	public function test_limit_img_valid() {
		$result = $this->invoke_private( 'limit_img', array( 'https://example.com/photo.jpg' ) );
		$this->assertNotEmpty( $result );
	}

	/**
	 * Test limit_img filters ad URLs.
	 */
	public function test_limit_img_filters_ads() {
		$result = $this->invoke_private( 'limit_img', array( 'https://example.com/ads/banner.jpg' ) );
		$this->assertEmpty( $result );
	}

	/**
	 * Test limit_img filters share buttons.
	 */
	public function test_limit_img_filters_share() {
		$result = $this->invoke_private( 'limit_img', array( 'https://example.com/share-this-facebook.png' ) );
		$this->assertEmpty( $result );
	}

	/**
	 * Test limit_img filters spinners.
	 */
	public function test_limit_img_filters_spinners() {
		$result = $this->invoke_private( 'limit_img', array( 'https://example.com/spinner.gif' ) );
		$this->assertEmpty( $result );
	}

	/**
	 * Test limit_img filters thumbnails.
	 */
	public function test_limit_img_filters_thumbnails() {
		$result = $this->invoke_private( 'limit_img', array( 'https://example.com/my-thumb.gif' ) );
		$this->assertEmpty( $result );
	}

	/**
	 * Test limit_img filters wp-includes images.
	 */
	public function test_limit_img_filters_wp_includes() {
		$result = $this->invoke_private( 'limit_img', array( 'https://example.com/wp-includes/images/icon.png' ) );
		$this->assertEmpty( $result );
	}

	/**
	 * Test limit_img filters tracking pixels.
	 */
	public function test_limit_img_filters_tracking_pixels() {
		$result = $this->invoke_private( 'limit_img', array( 'https://pixel.quantserve.com/pixel/something.gif' ) );
		$this->assertEmpty( $result );
	}

	/**
	 * Test limit_img filters loading images.
	 */
	public function test_limit_img_filters_loading() {
		$result = $this->invoke_private( 'limit_img', array( 'https://example.com/loading.gif' ) );
		$this->assertEmpty( $result );
	}

	/**
	 * Test limit_img filters WordPress stats gif.
	 */
	public function test_limit_img_filters_stats_gif() {
		$result = $this->invoke_private( 'limit_img', array( 'https://example.com/g.gif?stat=1' ) );
		$this->assertEmpty( $result );
	}

	// ---- limit_embed ----

	/**
	 * Test limit_embed converts YouTube embed to watch URL.
	 */
	public function test_limit_embed_youtube() {
		$result = $this->invoke_private( 'limit_embed', array( 'https://www.youtube.com/embed/dQw4w9?autoplay=1' ) );
		$this->assertEquals( 'https://www.youtube.com/watch?v=dQw4w9', $result );
	}

	/**
	 * Test limit_embed converts mobile YouTube embed.
	 */
	public function test_limit_embed_youtube_mobile() {
		$result = $this->invoke_private( 'limit_embed', array( 'https://m.youtube.com/embed/abc123?rel=0' ) );
		$this->assertEquals( 'https://www.youtube.com/watch?v=abc123', $result );
	}

	/**
	 * Test limit_embed converts Vimeo player URL.
	 */
	public function test_limit_embed_vimeo() {
		$result = $this->invoke_private( 'limit_embed', array( 'https://player.vimeo.com/video/12345?badge=0' ) );
		$this->assertEquals( 'https://vimeo.com/12345', $result );
	}

	/**
	 * Test limit_embed converts Dailymotion embed URL.
	 */
	public function test_limit_embed_dailymotion() {
		$result = $this->invoke_private( 'limit_embed', array( 'https://www.dailymotion.com/embed/video/x1234?autoplay=1' ) );
		$this->assertEquals( 'https://www.dailymotion.com/video/x1234', $result );
	}

	/**
	 * Test limit_embed allows valid oEmbed URLs.
	 */
	public function test_limit_embed_valid_oembed() {
		$result = $this->invoke_private( 'limit_embed', array( 'https://www.youtube.com/watch?v=test123' ) );
		$this->assertNotEmpty( $result );
	}

	/**
	 * Test limit_embed rejects unknown URLs.
	 */
	public function test_limit_embed_rejects_unknown() {
		$result = $this->invoke_private( 'limit_embed', array( 'https://random-site.example.com/not-embeddable' ) );
		$this->assertEmpty( $result );
	}

	/**
	 * Test limit_embed with empty input.
	 */
	public function test_limit_embed_empty() {
		$result = $this->invoke_private( 'limit_embed', array( '' ) );
		$this->assertEmpty( $result );
	}

	// ---- process_meta_entry ----

	/**
	 * Test process_meta_entry handles og:title.
	 */
	public function test_process_meta_entry_og_title() {
		$data   = array();
		$result = $this->invoke_private( 'process_meta_entry', array( 'og:title', 'Test Title', $data ) );
		$this->assertEquals( 'Test Title', $result['_meta']['og:title'] );
	}

	/**
	 * Test process_meta_entry handles og:description.
	 */
	public function test_process_meta_entry_og_description() {
		$data   = array();
		$result = $this->invoke_private( 'process_meta_entry', array( 'og:description', 'Test Desc', $data ) );
		$this->assertEquals( 'Test Desc', $result['_meta']['og:description'] );
	}

	/**
	 * Test process_meta_entry handles og:image.
	 */
	public function test_process_meta_entry_og_image() {
		$data   = array();
		$result = $this->invoke_private( 'process_meta_entry', array( 'og:image', 'https://example.com/img.jpg', $data ) );
		$this->assertNotEmpty( $result['_images'] );
	}

	/**
	 * Test process_meta_entry handles og:video.
	 */
	public function test_process_meta_entry_og_video() {
		$data   = array();
		$result = $this->invoke_private( 'process_meta_entry', array( 'og:video', 'https://www.youtube.com/embed/test123?autoplay=1', $data ) );
		$this->assertNotEmpty( $result['_embeds'] );
	}

	/**
	 * Test process_meta_entry handles twitter:image.
	 */
	public function test_process_meta_entry_twitter_image() {
		$data   = array();
		$result = $this->invoke_private( 'process_meta_entry', array( 'twitter:image', 'https://example.com/twitter.jpg', $data ) );
		$this->assertNotEmpty( $result['_images'] );
	}

	/**
	 * Test process_meta_entry deduplicates images.
	 */
	public function test_process_meta_entry_dedup_images() {
		$data            = array();
		$data['_images'] = array( 'https://example.com/img.jpg' );
		$result          = $this->invoke_private( 'process_meta_entry', array( 'og:image', 'https://example.com/img.jpg', $data ) );
		$this->assertCount( 1, $result['_images'] );
	}

	/**
	 * Test process_meta_entry handles keywords.
	 */
	public function test_process_meta_entry_keywords() {
		$data   = array();
		$result = $this->invoke_private( 'process_meta_entry', array( 'keywords', 'php,testing,wordpress', $data ) );
		$this->assertEquals( 'php,testing,wordpress', $result['_meta']['keywords'] );
	}

	// ---- get_embeds ----

	/**
	 * Test get_embeds returns unique embeds.
	 */
	public function test_get_embeds_unique() {
		$data = array(
			'_embeds' => array(
				'https://www.youtube.com/watch?v=test1',
				'https://www.youtube.com/watch?v=test1',
			),
		);

		$result = $this->plugin->get_embeds( $data );
		$this->assertCount( 1, $result );
	}

	/**
	 * Test get_embeds adds source URL if embeddable.
	 */
	public function test_get_embeds_adds_source_url() {
		$data = array(
			'u'       => 'https://www.youtube.com/watch?v=abc123',
			'_embeds' => array(),
		);

		$result = $this->plugin->get_embeds( $data );
		$this->assertNotEmpty( $result );
		$this->assertStringContainsString( 'youtube.com', $result[0] );
	}

	/**
	 * Test get_embeds handles protocol-relative dedup.
	 */
	public function test_get_embeds_protocol_relative_dedup() {
		$data = array(
			'_embeds' => array(
				'https://www.youtube.com/watch?v=test1',
				'http://www.youtube.com/watch?v=test1',
			),
		);

		$result = $this->plugin->get_embeds( $data );
		$this->assertCount( 1, $result );
	}

	// ---- get_images ----

	/**
	 * Test get_images returns unique images.
	 */
	public function test_get_images_unique() {
		$data = array(
			'_images' => array(
				'https://example.com/photo1.jpg',
				'https://example.com/photo1.jpg',
			),
		);

		$result = $this->plugin->get_images( $data );
		$this->assertCount( 1, $result );
	}

	/**
	 * Test get_images prioritizes JSON-LD image.
	 */
	public function test_get_images_prioritizes_jsonld() {
		$data = array(
			'_jsonld' => array( 'image' => 'https://example.com/jsonld.jpg' ),
			'_images' => array( 'https://example.com/other.jpg' ),
		);

		$result = $this->plugin->get_images( $data );
		$this->assertEquals( 'https://example.com/jsonld.jpg', $result[0] );
	}

	/**
	 * Test get_images normalizes gravatar URLs.
	 */
	public function test_get_images_normalizes_gravatar() {
		$data = array(
			'_images' => array( 'http://1.gravatar.com/test-photo.jpg' ),
		);

		$result = $this->plugin->get_images( $data );
		$this->assertNotEmpty( $result, 'Gravatar URL should still be included after normalization' );
		$this->assertStringContainsString( 'secure.gravatar.com', $result[0] );
	}

	// ---- get_canonical_link ----

	/**
	 * Test get_canonical_link priority chain: links canonical.
	 */
	public function test_get_canonical_link_links_priority() {
		$data = array(
			'_links' => array(
				'canonical' => 'https://example.com/canonical',
				'shortlink' => 'https://example.com/short',
			),
			'u'      => 'https://example.com/original',
			'_meta'  => array( 'og:url' => 'https://example.com/og' ),
		);

		$result = $this->plugin->get_canonical_link( $data );
		$this->assertEquals( 'https://example.com/canonical', $result );
	}

	/**
	 * Test get_canonical_link falls back to jsonld.
	 */
	public function test_get_canonical_link_jsonld_fallback() {
		$data = array(
			'_jsonld' => array( 'canonical' => 'https://example.com/jsonld-canonical' ),
			'u'       => 'https://example.com/original',
		);

		$result = $this->plugin->get_canonical_link( $data );
		$this->assertEquals( 'https://example.com/jsonld-canonical', $result );
	}

	/**
	 * Test get_canonical_link falls back to alternate canonical.
	 */
	public function test_get_canonical_link_alternate_fallback() {
		$data = array(
			'_links' => array( 'alternate_canonical' => 'https://example.com/alt-canonical' ),
		);

		$result = $this->plugin->get_canonical_link( $data );
		$this->assertEquals( 'https://example.com/alt-canonical', $result );
	}

	/**
	 * Test get_canonical_link falls back to source URL.
	 */
	public function test_get_canonical_link_source_url_fallback() {
		$data = array( 'u' => 'https://example.com/source' );

		$result = $this->plugin->get_canonical_link( $data );
		$this->assertEquals( 'https://example.com/source', $result );
	}

	/**
	 * Test get_canonical_link falls back to twitter:url.
	 */
	public function test_get_canonical_link_twitter_url_fallback() {
		$data = array(
			'_meta' => array( 'twitter:url' => 'https://example.com/twitter' ),
		);

		$result = $this->plugin->get_canonical_link( $data );
		$this->assertEquals( 'https://example.com/twitter', $result );
	}

	/**
	 * Test get_canonical_link falls back to og:url.
	 */
	public function test_get_canonical_link_og_url_fallback() {
		$data = array(
			'_meta' => array( 'og:url' => 'https://example.com/og' ),
		);

		$result = $this->plugin->get_canonical_link( $data );
		$this->assertEquals( 'https://example.com/og', $result );
	}

	/**
	 * Test get_canonical_link uses shortlink as last resort.
	 */
	public function test_get_canonical_link_shortlink_last_resort() {
		$data = array(
			'_links' => array( 'shortlink' => 'https://example.com/short' ),
		);

		$result = $this->plugin->get_canonical_link( $data );
		$this->assertEquals( 'https://example.com/short', $result );
	}

	// ---- get_source_site_name ----

	/**
	 * Test get_source_site_name from og:site_name.
	 */
	public function test_get_source_site_name_og() {
		$data = array(
			'_meta' => array(
				'og:site_name'     => 'OG Site',
				'application-name' => 'App Name',
			),
		);

		$result = $this->plugin->get_source_site_name( $data );
		$this->assertEquals( 'OG Site', $result );
	}

	/**
	 * Test get_source_site_name falls back to application-name.
	 */
	public function test_get_source_site_name_application_name() {
		$data = array(
			'_meta' => array( 'application-name' => 'App Name' ),
		);

		$result = $this->plugin->get_source_site_name( $data );
		$this->assertEquals( 'App Name', $result );
	}

	/**
	 * Test get_source_site_name returns empty when no meta.
	 */
	public function test_get_source_site_name_empty() {
		$result = $this->plugin->get_source_site_name( array() );
		$this->assertEmpty( $result );
	}

	// ---- get_suggested_title ----

	/**
	 * Test get_suggested_title priority: t first.
	 */
	public function test_get_suggested_title_t_priority() {
		$data = array(
			't'     => 'Direct Title',
			'_meta' => array( 'og:title' => 'OG Title' ),
		);

		$result = $this->plugin->get_suggested_title( $data );
		$this->assertEquals( 'Direct Title', $result );
	}

	/**
	 * Test get_suggested_title falls back to jsonld headline.
	 */
	public function test_get_suggested_title_jsonld_fallback() {
		$data = array(
			'_jsonld' => array( 'headline' => 'JSON-LD Headline' ),
			'_meta'   => array( 'og:title' => 'OG Title' ),
		);

		$result = $this->plugin->get_suggested_title( $data );
		$this->assertEquals( 'JSON-LD Headline', $result );
	}

	/**
	 * Test get_suggested_title falls back to twitter:title.
	 */
	public function test_get_suggested_title_twitter_fallback() {
		$data = array(
			'_meta' => array( 'twitter:title' => 'Twitter Title' ),
		);

		$result = $this->plugin->get_suggested_title( $data );
		$this->assertEquals( 'Twitter Title', $result );
	}

	/**
	 * Test get_suggested_title falls back to og:title.
	 */
	public function test_get_suggested_title_og_fallback() {
		$data = array(
			'_meta' => array( 'og:title' => 'OG Title' ),
		);

		$result = $this->plugin->get_suggested_title( $data );
		$this->assertEquals( 'OG Title', $result );
	}

	/**
	 * Test get_suggested_title falls back to meta title.
	 */
	public function test_get_suggested_title_meta_title_fallback() {
		$data = array(
			'_meta' => array( 'title' => 'Meta Title' ),
		);

		$result = $this->plugin->get_suggested_title( $data );
		$this->assertEquals( 'Meta Title', $result );
	}

	/**
	 * Test get_suggested_title decodes entities.
	 */
	public function test_get_suggested_title_decodes_entities() {
		$data = array(
			't' => 'Title &amp; Subtitle &#8211; Site',
		);

		$result = $this->plugin->get_suggested_title( $data );
		$this->assertStringContainsString( '&', $result );
		$this->assertStringNotContainsString( '&amp;', $result );
	}

	/**
	 * Test get_suggested_title returns empty when no data.
	 */
	public function test_get_suggested_title_empty() {
		$result = $this->plugin->get_suggested_title( array() );
		$this->assertEmpty( $result );
	}

	// ---- get_suggested_content ----

	/**
	 * Test get_suggested_content with selection.
	 */
	public function test_get_suggested_content_with_selection() {
		$data = array(
			's'     => 'Selected text from the page',
			'u'     => 'https://example.com/article',
			't'     => 'Article Title',
			'_meta' => array(),
		);

		$result = $this->plugin->get_suggested_content( $data );
		$this->assertStringContainsString( 'Selected text from the page', $result );
		$this->assertStringContainsString( 'wp-block-quote', $result );
	}

	/**
	 * Test get_suggested_content with description.
	 */
	public function test_get_suggested_content_with_description() {
		$data = array(
			'u'     => 'https://example.com/article',
			't'     => 'Article Title',
			'_meta' => array( 'og:description' => 'A great article about testing' ),
		);

		$result = $this->plugin->get_suggested_content( $data );
		$this->assertStringContainsString( 'A great article about testing', $result );
	}

	/**
	 * Test get_suggested_content with embeddable URL.
	 */
	public function test_get_suggested_content_embeddable_url() {
		$data = array(
			'u' => 'https://www.youtube.com/watch?v=test123',
		);

		$result = $this->plugin->get_suggested_content( $data );
		$this->assertStringContainsString( 'wp:embed', $result );
		$this->assertStringContainsString( 'youtube.com', $result );
	}

	/**
	 * Test get_suggested_content with non-embeddable URL.
	 */
	public function test_get_suggested_content_non_embeddable_url() {
		$data = array(
			'u'     => 'https://example.com/article',
			't'     => 'Example Article',
			's'     => 'Some selected text here',
			'_meta' => array(),
		);

		$result = $this->plugin->get_suggested_content( $data );
		$this->assertStringContainsString( 'example.com/article', $result );
		$this->assertStringContainsString( 'Example Article', $result );
	}

	/**
	 * Test get_suggested_content escapes HTML.
	 */
	public function test_get_suggested_content_escapes_html() {
		$data = array(
			's'     => '<script>alert("xss")</script>Safe text',
			'u'     => 'https://example.com/',
			't'     => 'Title',
			'_meta' => array(),
		);

		$result = $this->plugin->get_suggested_content( $data );
		$this->assertStringNotContainsString( '<script>', $result );
	}

	/**
	 * Test get_suggested_content uses Gutenberg block format.
	 */
	public function test_get_suggested_content_block_format() {
		$data = array(
			's'     => 'Some text',
			'u'     => 'https://example.com/',
			't'     => 'Title',
			'_meta' => array(),
		);

		$result = $this->plugin->get_suggested_content( $data );
		$this->assertStringContainsString( '<!-- wp:quote -->', $result );
		$this->assertStringContainsString( '<!-- wp:paragraph -->', $result );
	}

	/**
	 * Test get_suggested_content ignores description ending with ellipsis.
	 */
	public function test_get_suggested_content_ignores_ellipsis_description() {
		$data = array(
			'u'     => 'https://example.com/article',
			't'     => 'Title',
			'_meta' => array( 'og:description' => 'This is a truncated description...' ),
		);

		$result = $this->plugin->get_suggested_content( $data );
		$this->assertStringNotContainsString( 'truncated description', $result );
	}

	// ---- get_allowed_blocks ----

	/**
	 * Test get_allowed_blocks returns defaults.
	 */
	public function test_get_allowed_blocks_defaults() {
		$blocks = $this->plugin->get_allowed_blocks();
		$this->assertContains( 'core/paragraph', $blocks );
		$this->assertContains( 'core/image', $blocks );
		$this->assertContains( 'core/embed', $blocks );
		$this->assertContains( 'core/quote', $blocks );
	}

	/**
	 * Test get_allowed_blocks applies filter.
	 */
	public function test_get_allowed_blocks_filter() {
		add_filter(
			'press_this_allowed_blocks',
			function () {
				return array( 'core/paragraph' );
			}
		);

		$blocks = $this->plugin->get_allowed_blocks();
		$this->assertEquals( array( 'core/paragraph' ), $blocks );
	}

	// ---- get_suggested_post_format ----

	/**
	 * Test suggested format: video from embeds.
	 */
	public function test_suggested_post_format_video_from_embeds() {
		$data = array(
			'_embeds' => array( 'https://www.youtube.com/watch?v=test' ),
		);

		$result = $this->plugin->get_suggested_post_format( $data );
		$this->assertEquals( 'video', $result );
	}

	/**
	 * Test suggested format: video from URL.
	 */
	public function test_suggested_post_format_video_from_url() {
		$data = array( 'u' => 'https://vimeo.com/123456' );

		$result = $this->plugin->get_suggested_post_format( $data );
		$this->assertEquals( 'video', $result );
	}

	/**
	 * Test suggested format: video from youtu.be URL.
	 */
	public function test_suggested_post_format_video_from_short_youtube() {
		$data = array( 'u' => 'https://youtu.be/abc123' );

		$result = $this->plugin->get_suggested_post_format( $data );
		$this->assertEquals( 'video', $result );
	}

	/**
	 * Test suggested format: video from dailymotion URL.
	 */
	public function test_suggested_post_format_video_from_dailymotion() {
		$data = array( 'u' => 'https://www.dailymotion.com/video/x1234' );

		$result = $this->plugin->get_suggested_post_format( $data );
		$this->assertEquals( 'video', $result );
	}

	/**
	 * Test suggested format: quote from long selection.
	 */
	public function test_suggested_post_format_quote() {
		$data = array(
			's' => str_repeat( 'This is a long passage of text that someone selected from the page. ', 5 ),
			'u' => 'https://example.com/',
		);

		$result = $this->plugin->get_suggested_post_format( $data );
		$this->assertEquals( 'quote', $result );
	}

	/**
	 * Test suggested format: NOT quote when selection contains URL.
	 */
	public function test_suggested_post_format_no_quote_with_url() {
		$data = array(
			's' => 'Check out this link: https://example.com/really-cool-article that I found today on the internet!',
			'u' => 'https://example.com/',
		);

		$result = $this->plugin->get_suggested_post_format( $data );
		$this->assertNotEquals( 'quote', $result );
	}

	/**
	 * Test suggested format: URL-only no longer suggests link.
	 *
	 * Link format auto-suggestion was removed because scraping often fails to
	 * find images/embeds, causing unexpected link format suggestions.
	 * See https://github.com/WordPress/press-this/issues/94
	 */
	public function test_suggested_post_format_link() {
		$data = array( 'u' => 'https://example.com/article' );

		$result = $this->plugin->get_suggested_post_format( $data );
		$this->assertEquals( '', $result );
	}

	/**
	 * Test suggested format: standard (default).
	 */
	public function test_suggested_post_format_standard() {
		$data = array(
			'u'       => 'https://example.com/',
			's'       => 'Short',
			'_images' => array( 'https://example.com/img.jpg' ),
		);

		$result = $this->plugin->get_suggested_post_format( $data );
		$this->assertEmpty( $result );
	}

	/**
	 * Test suggested format: override filter.
	 */
	public function test_suggested_post_format_override_filter() {
		add_filter(
			'press_this_post_format_override',
			function () {
				return 'aside';
			}
		);

		$data   = array( 'u' => 'https://www.youtube.com/watch?v=test' );
		$result = $this->plugin->get_suggested_post_format( $data );
		$this->assertEquals( 'aside', $result );
	}

	/**
	 * Test suggested format: suggestion filter.
	 */
	public function test_suggested_post_format_suggestion_filter() {
		add_filter(
			'press_this_post_format_suggestion',
			function ( $format, $data ) {
				if ( ! empty( $data['_images'] ) ) {
					return 'image';
				}
				return $format;
			},
			10,
			2
		);

		$data   = array(
			'u'       => 'https://example.com/',
			'_images' => array( 'https://example.com/img.jpg' ),
		);
		$result = $this->plugin->get_suggested_post_format( $data );
		$this->assertEquals( 'image', $result );
	}

	// ---- get_editor_settings ----

	/**
	 * Test get_editor_settings returns expected keys.
	 */
	public function test_get_editor_settings_expected_keys() {
		$settings = $this->plugin->get_editor_settings();

		$this->assertArrayHasKey( 'allowedBlocks', $settings );
		$this->assertArrayHasKey( 'hasFixedToolbar', $settings );
		$this->assertArrayHasKey( 'isRTL', $settings );
		$this->assertArrayHasKey( 'siteUrl', $settings );
		$this->assertArrayHasKey( 'ajaxUrl', $settings );
		$this->assertArrayHasKey( 'supportedPostFormats', $settings );
		$this->assertArrayHasKey( 'suggestedPostFormat', $settings );
		$this->assertArrayHasKey( 'canPublish', $settings );
		$this->assertArrayHasKey( 'canUploadFiles', $settings );
	}

	/**
	 * Test get_editor_settings capabilities for editor.
	 */
	public function test_get_editor_settings_capabilities() {
		wp_set_current_user( $this->editor_user_id );
		$settings = $this->plugin->get_editor_settings();

		$this->assertTrue( $settings['canPublish'] );
	}

	/**
	 * Test get_editor_settings has fixed toolbar.
	 */
	public function test_get_editor_settings_fixed_toolbar() {
		$settings = $this->plugin->get_editor_settings();
		$this->assertTrue( $settings['hasFixedToolbar'] );
	}

	/**
	 * Test get_editor_settings post formats array is valid.
	 */
	public function test_get_editor_settings_post_formats() {
		$settings = $this->plugin->get_editor_settings();
		$this->assertArrayHasKey( 'supportedPostFormats', $settings );
		$this->assertIsArray( $settings['supportedPostFormats'] );
	}
}
