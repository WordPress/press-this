<?php
/**
 * Press This CLI Commands
 *
 * @package Press_This_Plugin
 * @since 2.1.1
 */

/**
 * WP-CLI commands for Press This.
 *
 * @since 2.1.1
 */
class Press_This_CLI_Commands {

	/**
	 * Repair core/embed blocks saved before the className fix in #129.
	 *
	 * Finds posts whose content has a core/embed block with a `<figure>`
	 * className missing the `wp-block-embed-{provider}` class that
	 * Gutenberg's save() output requires, and rewrites the content to
	 * add it.
	 *
	 * ## OPTIONS
	 *
	 * [--dry-run]
	 * : Report the posts that would be changed, without saving.
	 *
	 * [--post-type=<post-type>]
	 * : Limit the scan to a specific post type. Default: post,page.
	 *
	 * ## EXAMPLES
	 *
	 *     wp press-this repair-embeds --dry-run
	 *     wp press-this repair-embeds
	 *     wp press-this repair-embeds --post-type=post
	 *
	 * @since 2.1.1
	 *
	 * @param array $args       Positional arguments (unused).
	 * @param array $assoc_args Associative arguments.
	 */
	public function repair_embeds( $args, $assoc_args ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- Required by WP-CLI command signature.
		require_once __DIR__ . '/class-press-this-embed-repair.php';

		$dry_run    = WP_CLI\Utils\get_flag_value( $assoc_args, 'dry-run', false );
		$post_type  = WP_CLI\Utils\get_flag_value( $assoc_args, 'post-type', 'post,page' );
		$post_types = array_map( 'trim', explode( ',', $post_type ) );

		$repaired_count = 0;
		$scanned_count  = 0;
		$batch_size     = 100;
		$last_id        = 0;

		global $wpdb;

		do {
			// Query post_content directly with a LIKE match instead of WP_Query's
			// 's' param, which also searches the title and can be altered by
			// other plugins hooking the search (relevance sorting, stopwords).
			$post_ids = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT ID FROM {$wpdb->posts} WHERE ID > %d AND post_type IN (" . implode( ',', array_fill( 0, count( $post_types ), '%s' ) ) . ') AND post_content LIKE %s ORDER BY ID ASC LIMIT %d', // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $wpdb->posts is a table name, not user input.
					array_merge( array( $last_id ), $post_types, array( '%wp:embed%', $batch_size ) )
				)
			);

			$batch_count = count( $post_ids );

			foreach ( $post_ids as $post_id ) {
				$post_id = (int) $post_id;
				++$scanned_count;
				$last_id = max( $last_id, $post_id );

				$post = get_post( $post_id );

				if ( ! $post || ! has_block( 'core/embed', $post ) ) {
					continue;
				}

				$repaired_content = Press_This_Embed_Repair::repair_content( $post->post_content );

				if ( false === $repaired_content ) {
					continue;
				}

				if ( $dry_run ) {
					++$repaired_count;
					WP_CLI::log( sprintf( 'Would repair post %d: %s', $post_id, get_the_title( $post_id ) ) );
					continue;
				}

				$updated = wp_update_post(
					array(
						'ID'           => $post_id,
						'post_content' => wp_slash( $repaired_content ),
					),
					true
				);

				if ( is_wp_error( $updated ) ) {
					WP_CLI::warning( sprintf( 'Failed to repair post %d: %s', $post_id, $updated->get_error_message() ) );
					continue;
				}

				++$repaired_count;
				WP_CLI::log( sprintf( 'Repaired post %d: %s', $post_id, get_the_title( $post_id ) ) );
			}
		} while ( $batch_count === $batch_size );

		WP_CLI::success(
			sprintf(
				/* translators: 1: number of posts repaired or that would be repaired, 2: number of posts scanned. */
				$dry_run ? '%1$d post(s) would be repaired out of %2$d scanned.' : '%1$d post(s) repaired out of %2$d scanned.',
				$repaired_count,
				$scanned_count
			)
		);
	}
}
