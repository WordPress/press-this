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
}
