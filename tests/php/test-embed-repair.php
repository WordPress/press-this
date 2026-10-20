<?php
/**
 * Tests for legacy embed className repair.
 *
 * @package Press_This_Plugin
 */

use WorDBless\BaseTestCase;

/**
 * Test case for Press_This_Embed_Repair.
 */
class Test_Embed_Repair extends BaseTestCase {

	/**
	 * Set up before each test.
	 */
	public function set_up() {
		parent::set_up();

		require_once dirname( dirname( __DIR__ ) ) . '/includes/class-press-this-embed-repair.php';
	}

	/**
	 * Test 1: Adds the missing wp-block-embed-{provider} class.
	 */
	public function test_adds_missing_provider_class() {
		$content = '<!-- wp:embed {"url":"https://www.youtube.com/watch?v=abc","type":"video","providerNameSlug":"youtube"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=abc
</div></figure>
<!-- /wp:embed -->';

		$repaired = Press_This_Embed_Repair::repair_content( $content );

		$this->assertNotFalse( $repaired );
		$this->assertStringContainsString( 'wp-block-embed-youtube', $repaired );
		$this->assertStringContainsString( 'is-provider-youtube', $repaired );
	}

	/**
	 * Test 2: Already-correct content is left untouched (idempotent).
	 */
	public function test_correct_content_is_untouched() {
		$content = '<!-- wp:embed {"url":"https://www.youtube.com/watch?v=abc","type":"video","providerNameSlug":"youtube"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=abc
</div></figure>
<!-- /wp:embed -->';

		$repaired = Press_This_Embed_Repair::repair_content( $content );

		$this->assertFalse( $repaired );
	}

	/**
	 * Test 3: Repairing twice does not double-append the class.
	 */
	public function test_repair_is_idempotent() {
		$content = '<!-- wp:embed {"url":"https://www.youtube.com/watch?v=abc","type":"video","providerNameSlug":"youtube"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=abc
</div></figure>
<!-- /wp:embed -->';

		$once  = Press_This_Embed_Repair::repair_content( $content );
		$twice = Press_This_Embed_Repair::repair_content( $once );

		$this->assertFalse( $twice );
		$this->assertSame( 1, substr_count( $once, 'wp-block-embed-youtube' ) );
	}

	/**
	 * Test 4: Generic embed blocks without type/providerNameSlug are left alone.
	 *
	 * This matches the shape produced by get_suggested_content() for the
	 * non-JS code path, which is self-consistent and not affected by this bug.
	 */
	public function test_generic_embed_without_provider_is_untouched() {
		$content = '<!-- wp:embed {"url":"https://example.com/video"} -->
<figure class="wp-block-embed"><div class="wp-block-embed__wrapper">
https://example.com/video
</div></figure>
<!-- /wp:embed -->';

		$repaired = Press_This_Embed_Repair::repair_content( $content );

		$this->assertFalse( $repaired );
	}

	/**
	 * Test 5: Multiple embeds in one post are each repaired, exactly once,
	 * on their own figure -- not leaked onto the paragraph in between.
	 */
	public function test_multiple_embeds_are_all_repaired() {
		$content = '<!-- wp:embed {"url":"https://www.youtube.com/watch?v=abc","type":"video","providerNameSlug":"youtube"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=abc
</div></figure>
<!-- /wp:embed -->

<!-- wp:paragraph -->
<p>Some text in between.</p>
<!-- /wp:paragraph -->

<!-- wp:embed {"url":"https://vimeo.com/12345","type":"video","providerNameSlug":"vimeo"} -->
<figure class="wp-block-embed is-type-video is-provider-vimeo"><div class="wp-block-embed__wrapper">
https://vimeo.com/12345
</div></figure>
<!-- /wp:embed -->';

		$repaired = Press_This_Embed_Repair::repair_content( $content );

		$this->assertNotFalse( $repaired );

		$named_blocks = array_values( array_filter( parse_blocks( $repaired ), fn( $b ) => null !== $b['blockName'] ) );

		$this->assertSame( 'core/embed', $named_blocks[0]['blockName'] );
		$this->assertSame( 1, substr_count( $named_blocks[0]['innerHTML'], 'wp-block-embed-youtube' ) );
		$this->assertStringNotContainsString( 'wp-block-embed-vimeo', $named_blocks[0]['innerHTML'] );

		$this->assertSame( 'core/paragraph', $named_blocks[1]['blockName'] );
		$this->assertStringNotContainsString( 'wp-block-embed-', $named_blocks[1]['innerHTML'] );

		$this->assertSame( 'core/embed', $named_blocks[2]['blockName'] );
		$this->assertSame( 1, substr_count( $named_blocks[2]['innerHTML'], 'wp-block-embed-vimeo' ) );
		$this->assertStringNotContainsString( 'wp-block-embed-youtube', $named_blocks[2]['innerHTML'] );
	}

	/**
	 * Test 6: A nested embed block (inside a group) is repaired, and the
	 * class lands on the embed's own figure, not the group's wrapper div.
	 */
	public function test_nested_embed_in_group_is_repaired() {
		$content = '<!-- wp:group -->
<div class="wp-block-group">
<!-- wp:embed {"url":"https://www.youtube.com/watch?v=abc","type":"video","providerNameSlug":"youtube"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=abc
</div></figure>
<!-- /wp:embed -->
</div>
<!-- /wp:group -->';

		$repaired = Press_This_Embed_Repair::repair_content( $content );

		$this->assertNotFalse( $repaired );

		$blocks       = parse_blocks( $repaired );
		$embed_block  = $blocks[0]['innerBlocks'][0];

		$this->assertSame( 'core/embed', $embed_block['blockName'] );
		$this->assertSame( 1, substr_count( $embed_block['innerHTML'], 'wp-block-embed-youtube' ) );
		$this->assertStringNotContainsString( 'wp-block-embed-youtube', $blocks[0]['innerContent'][0] );
	}

	/**
	 * Test 7: Content with no embed blocks at all returns false quickly.
	 */
	public function test_content_without_embeds_returns_false() {
		$content = '<!-- wp:paragraph -->
<p>Just a paragraph, no embeds here.</p>
<!-- /wp:paragraph -->';

		$repaired = Press_This_Embed_Repair::repair_content( $content );

		$this->assertFalse( $repaired );
	}

	/**
	 * Test 8: A providerNameSlug that isn't a plain class token is rejected
	 * instead of being inserted into the HTML. providerNameSlug comes from
	 * stored post content, so it must not be trusted as a safe class name.
	 */
	public function test_malicious_provider_slug_is_rejected() {
		$content = '<!-- wp:embed {"url":"https://www.youtube.com/watch?v=abc","type":"video","providerNameSlug":"youtube\" onclick=\"alert(1)"} -->
<figure class="wp-block-embed is-type-video"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=abc
</div></figure>
<!-- /wp:embed -->';

		$repaired = Press_This_Embed_Repair::repair_content( $content );

		$this->assertFalse( $repaired );
	}

	/**
	 * Test 9: v1 embed markup (no wrapper div) is left alone. It already
	 * validates through core/embed's v1 deprecation.
	 */
	public function test_v1_embed_without_wrapper_is_untouched() {
		$content = '<!-- wp:embed {"url":"https://www.youtube.com/watch?v=abc","type":"video","providerNameSlug":"youtube"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube">
https://www.youtube.com/watch?v=abc
</figure>
<!-- /wp:embed -->';

		$this->assertFalse( Press_This_Embed_Repair::repair_content( $content ) );
	}

	/**
	 * Test 10: Only the class is added; the caption and the rest of the
	 * markup come back byte for byte.
	 */
	public function test_repair_only_adds_the_class() {
		$content = '<!-- wp:embed {"url":"https://www.youtube.com/watch?v=abc","type":"video","providerNameSlug":"youtube"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=abc
</div><figcaption class="wp-element-caption">A caption</figcaption></figure>
<!-- /wp:embed -->';

		$expected = str_replace( 'is-provider-youtube"', 'is-provider-youtube wp-block-embed-youtube"', $content );

		$this->assertSame( $expected, Press_This_Embed_Repair::repair_content( $content ) );
	}

	/**
	 * Create a post with legacy embed markup, then mark it as a missed-schedule
	 * post: still 'future', but with a publish date in the past.
	 *
	 * wp_insert_post() publishes a 'future' post with a past date straight away,
	 * so the status and date are set directly afterwards.
	 *
	 * @return int Post ID.
	 */
	private function create_missed_schedule_legacy_post() {
		global $wpdb;

		$post_id = wp_insert_post(
			array(
				'post_title'   => 'Legacy embed',
				'post_status'  => 'draft',
				'post_content' => '<!-- wp:embed {"url":"https://www.youtube.com/watch?v=abc","type":"video","providerNameSlug":"youtube"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=abc
</div></figure>
<!-- /wp:embed -->',
			)
		);

		$wpdb->update(
			$wpdb->posts,
			array(
				'post_status'       => 'future',
				'post_date'         => '2020-01-01 10:00:00',
				'post_date_gmt'     => '2020-01-01 10:00:00',
				'post_modified'     => '2020-01-01 10:00:00',
				'post_modified_gmt' => '2020-01-01 10:00:00',
			),
			array( 'ID' => $post_id )
		);
		clean_post_cache( $post_id );

		return $post_id;
	}

	/**
	 * Test 11: repair_post() saves the repaired content without publishing a
	 * missed-schedule post, touching its dates, or adding a revision.
	 */
	public function test_repair_post_keeps_status_dates_and_revisions() {
		$post_id = $this->create_missed_schedule_legacy_post();
		$before  = get_post( $post_id );

		$this->assertSame( 'repaired', Press_This_Embed_Repair::repair_post( $post_id ) );

		$after = get_post( $post_id );

		$this->assertStringContainsString( 'wp-block-embed-youtube', $after->post_content );
		$this->assertSame( 'future', $after->post_status );
		$this->assertSame( $before->post_date, $after->post_date );
		$this->assertSame( $before->post_modified, $after->post_modified );
		$this->assertCount( 0, wp_get_post_revisions( $post_id ) );

		$this->assertSame( 'unchanged', Press_This_Embed_Repair::repair_post( $post_id ) );
	}

	/**
	 * Test 12: A dry run reports the repair without saving it.
	 */
	public function test_repair_post_dry_run_does_not_save() {
		$post_id = $this->create_missed_schedule_legacy_post();
		$before  = get_post( $post_id )->post_content;

		$this->assertSame( 'would-repair', Press_This_Embed_Repair::repair_post( $post_id, true ) );
		$this->assertSame( $before, get_post( $post_id )->post_content );
	}

	/**
	 * Test 13: Posts that do not exist or have no embed report 'unchanged'.
	 */
	public function test_repair_post_without_embed_is_unchanged() {
		$post_id = wp_insert_post(
			array(
				'post_title'   => 'No embed',
				'post_status'  => 'publish',
				'post_content' => '<!-- wp:paragraph --><p>Text.</p><!-- /wp:paragraph -->',
			)
		);

		$this->assertSame( 'unchanged', Press_This_Embed_Repair::repair_post( $post_id ) );
		$this->assertSame( 'unchanged', Press_This_Embed_Repair::repair_post( 999999 ) );
	}
}
