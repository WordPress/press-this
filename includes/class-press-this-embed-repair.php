<?php
/**
 * Press This Embed Repair
 *
 * Repairs core/embed blocks saved before the className fix in #129, where the
 * figure element is missing the wp-block-embed-{provider} class that core/embed's
 * save() output requires for block validation to pass.
 *
 * @package Press_This_Plugin
 * @since 2.1.1
 */

/**
 * Press This embed repair class.
 *
 * @since 2.1.1
 */
class Press_This_Embed_Repair {

	/**
	 * Repair legacy core/embed blocks in post content.
	 *
	 * @since 2.1.1
	 *
	 * @param string $content Post content.
	 * @return string|false Repaired content, or false if nothing needed fixing.
	 */
	public static function repair_content( $content ) {
		if ( false === strpos( $content, 'wp:embed' ) ) {
			return false;
		}

		$repaired = false;
		$blocks   = self::repair_blocks( parse_blocks( $content ), $repaired );

		if ( ! $repaired ) {
			return false;
		}

		return serialize_blocks( $blocks );
	}

	/**
	 * Recursively walk parsed blocks and repair core/embed blocks in place.
	 *
	 * @since 2.1.1
	 *
	 * @param array $blocks   Parsed blocks.
	 * @param bool  $repaired Set true by reference when any block is changed.
	 * @return array Blocks, with embeds repaired where needed.
	 */
	private static function repair_blocks( array $blocks, &$repaired ) {
		foreach ( $blocks as $index => $block ) {
			if ( 'core/embed' === $block['blockName'] ) {
				$fixed = self::fix_embed_block( $block );

				if ( false !== $fixed ) {
					$blocks[ $index ] = $fixed;
					$repaired         = true;
				}
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				$blocks[ $index ]['innerBlocks'] = self::repair_blocks( $block['innerBlocks'], $repaired );
			}
		}

		return $blocks;
	}

	/**
	 * Add the missing wp-block-embed-{provider} class to a single embed block.
	 *
	 * @since 2.1.1
	 *
	 * @param array $block Parsed core/embed block.
	 * @return array|false Repaired block, or false if it did not need fixing.
	 */
	private static function fix_embed_block( array $block ) {
		$provider = isset( $block['attrs']['providerNameSlug'] ) ? $block['attrs']['providerNameSlug'] : '';

		// The className mismatch only exists for blocks with both type and
		// providerNameSlug set -- e.g. the generic embed shape produced by
		// get_suggested_content() has neither and is already self-consistent.
		if ( empty( $provider ) || empty( $block['attrs']['type'] ) ) {
			return false;
		}

		// providerNameSlug comes from stored post content, not a trusted source.
		// Reject anything that isn't a plain CSS class token before it goes near HTML.
		if ( ! is_string( $provider ) || sanitize_html_class( $provider ) !== $provider ) {
			return false;
		}

		// Matches double-quoted class attributes only, which is what save() always
		// emits. A hand-edited single-quoted class would just be left alone.
		if ( ! preg_match( '/<figure\b[^>]*\sclass="([^"]*)"/', $block['innerHTML'], $matches, PREG_OFFSET_CAPTURE ) ) {
			return false;
		}

		$wanted_class     = 'wp-block-embed-' . $provider;
		$existing_classes = preg_split( '/\s+/', trim( $matches[1][0] ) );

		if ( in_array( $wanted_class, $existing_classes, true ) ) {
			return false;
		}

		// core/embed has no innerBlocks, so innerContent should be a single chunk
		// identical to innerHTML. Bail instead of guessing at a riskier rewrite
		// if that assumption doesn't hold for some other reason.
		if ( count( $block['innerContent'] ) !== 1 || $block['innerContent'][0] !== $block['innerHTML'] ) {
			return false;
		}

		$class_end = $matches[1][1] + strlen( $matches[1][0] );
		$new_html  = substr( $block['innerHTML'], 0, $class_end ) . ' ' . $wanted_class . substr( $block['innerHTML'], $class_end );

		$block['innerHTML']    = $new_html;
		$block['innerContent'] = array( $new_html );

		return $block;
	}
}
