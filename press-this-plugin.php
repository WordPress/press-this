<?php
/**
 * Press This
 *
 * Plugin Name: Press This
 * Plugin URI:  https://wordpress.org
 * Description: A little tool that lets you grab bits of the web and create new posts with ease. Now powered by the Gutenberg block editor.
 * Version:     2.0.1
 * Author:      WordPress Contributors
 * Author URI:  https://wordpress.org
 * License:     GPL-2.0+
 * License URI: http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 * Text Domain: press-this
 * Domain Path: /languages
 * Requires at least: 6.9
 * Requires PHP: 7.4
 *
 * @package wordpress/press-this
 */

/*
 * This program is free software; you can redistribute it and/or modify it under the terms of the GNU
 * General Public License version 2, as published by the Free Software Foundation.  You may NOT assume
 * that you can use any other version of the GPL.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
 * even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

/**
 * Plugin version constant.
 *
 * @since 1.0.0
 * @since 2.0.1 Updated for Gutenberg block editor integration.
 */
define( 'PRESS_THIS__VERSION', '2.0.1' );

/**
 * Minimum WordPress version required for the Gutenberg features.
 *
 * @since 2.0.1
 */
define( 'PRESS_THIS__MIN_WP_VERSION', '6.9' );

/**
 * Check if the current WordPress version is compatible.
 *
 * @since 2.0.1
 *
 * @return bool True if compatible, false otherwise.
 */
function press_this_is_compatible() {
	global $wp_version;
	return version_compare( $wp_version, PRESS_THIS__MIN_WP_VERSION, '>=' );
}

/**
 * Display admin notice for incompatible WordPress version.
 *
 * @since 2.0.1
 */
function press_this_incompatible_notice() {
	?>
	<div class="notice notice-error">
		<p>
			<?php
			printf(
				/* translators: %s: Minimum WordPress version required. */
				esc_html__( 'Press This 2.0 requires WordPress %s or higher. Please upgrade WordPress to use this version.', 'press-this' ),
				esc_html( PRESS_THIS__MIN_WP_VERSION )
			);
			?>
		</p>
	</div>
	<?php
}

// Backward compatibility check.
if ( ! press_this_is_compatible() ) {
	add_action( 'admin_notices', 'press_this_incompatible_notice' );
	return;
}

// Register AJAX handlers (legacy, kept for backward compatibility).
add_action( 'wp_ajax_press-this-plugin-save-post', 'wp_ajax_press_this_plugin_save_post' );
add_action( 'wp_ajax_press-this-plugin-add-category', 'wp_ajax_press_this_plugin_add_category' );

// Register REST API routes.
add_action( 'rest_api_init', 'press_this_register_rest_routes' );

// Register URL validation filter for HTTP requests.
add_filter( 'pre_http_request', 'press_this_validate_http_request_ip', 10, 3 );

// Register Tools page integration.
add_action( 'tool_box', 'press_this_tool_box' );

// Load text domain for translations.
add_action( 'init', 'press_this_load_textdomain' );

/**
 * Load plugin text domain for translations.
 *
 * @since 2.0.1
 */
function press_this_load_textdomain() {
	load_plugin_textdomain( 'press-this', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
}

/**
 * Ajax handler for saving a post from Press This.
 *
 * @since 1.0.0
 */
function wp_ajax_press_this_plugin_save_post() {
	include_once plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php';
	$wp_press_this = new WP_Press_This_Plugin();

	// Enable URL validation for image sideloading.
	press_this_http_request_context( true );
	$wp_press_this->save_post();
	press_this_http_request_context( false );
}

/**
 * Ajax handler for creating new category from Press This.
 *
 * @since 1.0.0
 */
function wp_ajax_press_this_plugin_add_category() {
	include_once plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php';
	$wp_press_this = new WP_Press_This_Plugin();
	$wp_press_this->add_category();
}

/**
 * Register REST API routes for Press This.
 *
 * @since 2.0.1
 */
function press_this_register_rest_routes() {
	// URL scraping endpoint for Direct Access Mode.
	register_rest_route(
		'press-this/v1',
		'/scrape',
		array(
			'methods'             => 'POST',
			'callback'            => 'press_this_rest_scrape_url',
			'permission_callback' => 'press_this_rest_scrape_permission',
			'args'                => array(
				'url' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'esc_url_raw',
				),
			),
		)
	);

	// Save endpoint.
	register_rest_route(
		'press-this/v1',
		'/save',
		array(
			'methods'             => 'POST',
			'callback'            => 'press_this_rest_save_post',
			'permission_callback' => 'press_this_rest_save_permission',
			'args'                => array(
				'post_id'        => array(
					'required'          => true,
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
				),
				'title'          => array(
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'default'           => '',
				),
				'content'        => array(
					'type'    => 'string',
					'default' => '',
				),
				'status'         => array(
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'default'           => 'draft',
					'enum'              => array( 'draft', 'publish' ),
				),
				'format'         => array(
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'default'           => '',
				),
				'categories'     => array(
					'type'    => 'array',
					'items'   => array( 'type' => 'integer' ),
					'default' => array(),
				),
				'tags'           => array(
					'type'    => 'array',
					'items'   => array( 'type' => 'string' ),
					'default' => array(),
				),
				'featured_image' => array(
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
					'default'           => 0,
				),
				'force_redirect' => array(
					'type'    => 'boolean',
					'default' => false,
				),
			),
		)
	);

	// Sideload image endpoint (for featured image from scraped content).
	register_rest_route(
		'press-this/v1',
		'/sideload',
		array(
			'methods'             => 'POST',
			'callback'            => 'press_this_rest_sideload_image',
			'permission_callback' => 'press_this_rest_sideload_permission',
			'args'                => array(
				'url'     => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'esc_url_raw',
				),
				'post_id' => array(
					'type'              => 'integer',
					'sanitize_callback' => 'absint',
					'default'           => 0,
				),
			),
		)
	);

	// Validate embeds endpoint (filters URLs through WordPress oEmbed providers).
	register_rest_route(
		'press-this/v1',
		'/validate-embeds',
		array(
			'methods'             => 'POST',
			'callback'            => 'press_this_rest_validate_embeds',
			'permission_callback' => 'press_this_rest_validate_embeds_permission',
			'args'                => array(
				'urls' => array(
					'required' => true,
					'type'     => 'array',
					'items'    => array( 'type' => 'string' ),
				),
			),
		)
	);
}

/**
 * Permission callback for REST save endpoint.
 *
 * @since 2.0.1
 *
 * @param WP_REST_Request $request Request object.
 * @return bool|WP_Error True if the user can edit the post, WP_Error otherwise.
 */
function press_this_rest_save_permission( $request ) {
	$post_id = $request->get_param( 'post_id' );

	if ( ! $post_id ) {
		return new WP_Error(
			'press_this_missing_post_id',
			__( 'Missing post ID.', 'press-this' ),
			array( 'status' => 400 )
		);
	}

	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return new WP_Error(
			'press_this_cannot_edit',
			__( 'You do not have permission to edit this post.', 'press-this' ),
			array( 'status' => 403 )
		);
	}

	return true;
}

/**
 * REST API handler for saving a post from Press This.
 *
 * @since 2.0.1
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error Response object on success, WP_Error on failure.
 */
function press_this_rest_save_post( $request ) {
	include_once plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php';

	$post_id = $request->get_param( 'post_id' );

	// Get the existing post to preserve its post type.
	$existing_post = get_post( $post_id );
	$post_type     = $existing_post ? $existing_post->post_type : 'post';

	$post_data = array(
		'ID'           => $post_id,
		'post_title'   => $request->get_param( 'title' ),
		'post_content' => wp_kses_post( $request->get_param( 'content' ) ),
		'post_type'    => $post_type,
		'post_status'  => 'draft',
		'post_format'  => $request->get_param( 'format' ),
	);

	// Handle categories if user can assign.
	$category_tax = get_taxonomy( 'category' );
	if ( current_user_can( $category_tax->cap->assign_terms ) ) {
		$categories = $request->get_param( 'categories' );
		if ( ! empty( $categories ) ) {
			$post_data['post_category'] = array_map( 'absint', $categories );
		}
	}

	// Handle tags if user can assign.
	$tag_tax = get_taxonomy( 'post_tag' );
	if ( current_user_can( $tag_tax->cap->assign_terms ) ) {
		$tags = $request->get_param( 'tags' );
		if ( ! empty( $tags ) ) {
			$post_data['tax_input'] = array(
				'post_tag' => array_map( 'sanitize_text_field', $tags ),
			);
		}
	}

	// Handle publish status.
	$status = $request->get_param( 'status' );
	if ( 'publish' === $status ) {
		if ( current_user_can( 'publish_posts' ) ) {
			$post_data['post_status'] = 'publish';
		} else {
			$post_data['post_status'] = 'pending';
		}
	}

	// Side-load images from content.
	$wp_press_this = new WP_Press_This_Plugin();
	press_this_http_request_context( true );
	$post_data['post_content'] = $wp_press_this->side_load_images( $post_id, wp_slash( $post_data['post_content'] ) );
	press_this_http_request_context( false );
	$post_data['post_content'] = wp_unslash( $post_data['post_content'] );

	/**
	 * Filters the post data of a Press This post before saving/updating.
	 *
	 * @since 1.0.0
	 *
	 * @param array $post_data The post data.
	 */
	$post_data = apply_filters( 'press_this_save_post', $post_data );

	$updated = wp_update_post( $post_data, true );

	if ( is_wp_error( $updated ) ) {
		// Log detailed error when WP_DEBUG is enabled, return generic message to user.
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Debug logging only when WP_DEBUG enabled.
			error_log( 'Press This save_post error: ' . $updated->get_error_message() );
		}
		return new WP_Error(
			'press_this_save_failed',
			__( 'Unable to save the post. Please try again.', 'press-this' ),
			array( 'status' => 500 )
		);
	}

	// Set post format.
	if ( ! empty( $post_data['post_format'] ) ) {
		if ( current_theme_supports( 'post-formats', $post_data['post_format'] ) ) {
			set_post_format( $post_id, $post_data['post_format'] );
		} else {
			set_post_format( $post_id, false );
		}
	}

	// Set featured image.
	$featured_image = $request->get_param( 'featured_image' );
	if ( $featured_image && current_user_can( 'upload_files' ) ) {
		// Validate that the attachment ID exists and is a valid image.
		$attachment = get_post( $featured_image );
		if ( $attachment && 'attachment' === $attachment->post_type && wp_attachment_is_image( $featured_image ) ) {
			set_post_thumbnail( $post_id, $featured_image );
		} elseif ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// Log invalid attachment IDs for debugging.
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( sprintf( 'Press This: Invalid featured image ID %d for post %d', $featured_image, $post_id ) );
		}
	} elseif ( 0 === $featured_image ) {
		delete_post_thumbnail( $post_id );
	}

	// Determine redirect URL.
	$force_redirect = $request->get_param( 'force_redirect' );
	$redirect       = false;

	if ( 'publish' === get_post_status( $post_id ) ) {
		$redirect = get_post_permalink( $post_id );
	} elseif ( $force_redirect ) {
		$redirect = get_edit_post_link( $post_id, 'js' );
	}

	/**
	 * Filters the URL to redirect to when Press This saves.
	 *
	 * @since 1.0.0
	 *
	 * @param string $url     Redirect URL.
	 * @param int    $post_id Post ID.
	 * @param string $status  Post status.
	 */
	$redirect = apply_filters( 'press_this_save_redirect', $redirect, $post_id, $post_data['post_status'] );

	// Validate redirect URL is on same host or relative.
	if ( $redirect ) {
		$redirect_host = wp_parse_url( $redirect, PHP_URL_HOST );
		$site_host     = wp_parse_url( home_url(), PHP_URL_HOST );

		// Block external redirects.
		if ( $redirect_host && $redirect_host !== $site_host ) {
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Debug logging only when WP_DEBUG enabled.
				error_log( sprintf( 'Press This: Blocked external redirect to %s', esc_url( $redirect ) ) );
			}
			$redirect = get_edit_post_link( $post_id, 'raw' );
		}
	}

	return rest_ensure_response(
		array(
			'success'  => true,
			'post_id'  => $post_id,
			'redirect' => $redirect,
			'force'    => $force_redirect,
		)
	);
}

/**
 * Permission callback for REST sideload endpoint.
 *
 * @since 2.0.1
 *
 * @return bool|WP_Error True if the user can upload files, WP_Error otherwise.
 */
function press_this_rest_sideload_permission() {
	if ( ! current_user_can( 'upload_files' ) ) {
		return new WP_Error(
			'press_this_cannot_upload',
			__( 'You do not have permission to upload files.', 'press-this' ),
			array( 'status' => 403 )
		);
	}

	return true;
}

/**
 * Permission callback for REST validate-embeds endpoint.
 *
 * @since 2.0.1
 *
 * @return bool|WP_Error True if the user can edit posts, WP_Error otherwise.
 */
function press_this_rest_validate_embeds_permission() {
	if ( ! current_user_can( 'edit_posts' ) ) {
		return new WP_Error(
			'press_this_cannot_validate',
			__( 'You do not have permission to use this feature.', 'press-this' ),
			array( 'status' => 403 )
		);
	}

	return true;
}

/**
 * REST API handler for validating embed URLs.
 *
 * Takes an array of URLs and returns only those that are valid oEmbed providers.
 * Uses WordPress's built-in oEmbed provider list plus known video platforms.
 *
 * @since 2.0.1
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response Response with valid embed URLs.
 */
function press_this_rest_validate_embeds( $request ) {
	include_once plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php';

	$urls  = $request->get_param( 'urls' );
	$valid = array();

	if ( ! is_array( $urls ) ) {
		return rest_ensure_response( array( 'embeds' => array() ) );
	}

	// Create an instance to access limit_embed method.
	$press_this = new WP_Press_This_Plugin();

	// Use reflection to access the private limit_embed method.
	$reflection = new ReflectionClass( $press_this );
	$method     = $reflection->getMethod( 'limit_embed' );
	$method->setAccessible( true );

	foreach ( $urls as $url ) {
		if ( ! is_string( $url ) ) {
			continue;
		}

		// Sanitize and validate the URL.
		$url = esc_url_raw( $url );
		if ( empty( $url ) ) {
			continue;
		}

		// Use limit_embed to validate against oEmbed providers.
		$validated = $method->invoke( $press_this, $url );

		if ( ! empty( $validated ) ) {
			$valid[] = $validated;
		}
	}

	// Remove duplicates.
	$valid = array_unique( $valid );

	return rest_ensure_response( array( 'embeds' => array_values( $valid ) ) );
}

/**
 * Get the allowed content types for image sideloading.
 *
 * Validates content types for image sideloading.
 *
 * @since 2.0.1
 *
 * @return array Array of allowed MIME types for image sideloading.
 */
function press_this_get_sideload_allowed_types() {
	$default_types = array(
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/gif',
		'image/webp',
	);

	/**
	 * Filters the allowed content types for image sideloading.
	 *
	 * Allows customization of accepted image MIME types.
	 *
	 * @since 2.0.1
	 *
	 * @param array $allowed_types Array of allowed MIME types.
	 */
	return apply_filters( 'press_this_sideload_allowed_types', $default_types );
}

/**
 * Get the maximum file size for image sideloading.
 *
 * Configurable max file size for sideloading.
 *
 * @since 2.0.1
 *
 * @return int Maximum file size in bytes (default 10MB).
 */
function press_this_get_sideload_max_size() {
	$default_max = 10 * 1024 * 1024; // 10MB.

	/**
	 * Filters the maximum file size for image sideloading.
	 *
	 * @since 2.0.1
	 *
	 * @param int $max_size Maximum file size in bytes.
	 */
	return apply_filters( 'press_this_sideload_max_size', $default_max );
}

/**
 * REST API handler for sideloading an external image to the media library.
 *
 * Validates content-type via HEAD request before download.
 *
 * @since 2.0.1
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error Response object on success, WP_Error on failure.
 */
function press_this_rest_sideload_image( $request ) {
	include_once plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php';

	$url     = $request->get_param( 'url' );
	$post_id = $request->get_param( 'post_id' );

	// Validate URL format.
	if ( empty( $url ) || ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
		return new WP_Error(
			'press_this_invalid_url',
			__( 'Invalid image URL.', 'press-this' ),
			array( 'status' => 400 )
		);
	}

	// Validate URL is safe to fetch.
	$valid = press_this_validate_url_for_proxy( $url );
	if ( is_wp_error( $valid ) ) {
		$valid->add_data( array( 'status' => 400 ) );
		return $valid;
	}

	// Perform HEAD request to validate content-type before full download.
	$allowed_types = press_this_get_sideload_allowed_types();
	$max_size      = press_this_get_sideload_max_size();

	press_this_http_request_context( true );
	$head_response = wp_remote_head(
		$url,
		array(
			'timeout'            => 10,
			'redirection'        => 3,
			'reject_unsafe_urls' => true,
		)
	);
	press_this_http_request_context( false );

	// If HEAD succeeds, validate content-type and size.
	if ( ! is_wp_error( $head_response ) ) {
		$content_type = wp_remote_retrieve_header( $head_response, 'content-type' );

		// Extract base content-type (remove charset, boundary, etc.).
		if ( $content_type ) {
			$content_type = strtolower( trim( explode( ';', $content_type )[0] ) );
		}

		// Check content-type is an allowed image type.
		if ( $content_type && ! in_array( $content_type, $allowed_types, true ) ) {
			// Log detailed error when WP_DEBUG is enabled.
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Debug logging only when WP_DEBUG enabled.
				error_log( sprintf( 'Press This sideload rejected content-type: %s for URL: %s', $content_type, $url ) );
			}
			return new WP_Error(
				'press_this_invalid_image_type',
				__( 'The URL does not point to a valid image file.', 'press-this' ),
				array( 'status' => 400 )
			);
		}

		// Check file size if Content-Length header is present.
		$content_length = wp_remote_retrieve_header( $head_response, 'content-length' );
		if ( $content_length && (int) $content_length > $max_size ) {
			// Log detailed error when WP_DEBUG is enabled.
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Debug logging only when WP_DEBUG enabled.
				error_log( sprintf( 'Press This sideload rejected file size: %d bytes for URL: %s', (int) $content_length, $url ) );
			}
			return new WP_Error(
				'press_this_file_too_large',
				__( 'The image file is too large.', 'press-this' ),
				array( 'status' => 400 )
			);
		}
	}
	// If HEAD fails, proceed anyway - let media_handle_sideload validate.
	// This handles servers that don't support HEAD requests.

	// Require necessary files for media sideload.
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	// Download the file.
	$tmp_file = press_this_download_url( $url, 30 );

	if ( is_wp_error( $tmp_file ) ) {
		// Log detailed error when WP_DEBUG is enabled.
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Debug logging only when WP_DEBUG enabled.
			error_log( 'Press This sideload download error: ' . $tmp_file->get_error_message() );
		}
		return new WP_Error(
			'press_this_download_failed',
			__( 'Unable to download the image. Please try again.', 'press-this' ),
			array( 'status' => 500 )
		);
	}

	// Get the filename from URL.
	$filename = basename( wp_parse_url( $url, PHP_URL_PATH ) );
	if ( empty( $filename ) ) {
		$filename = 'image';
	}

	// Prepare file array for sideloading.
	$file_array = array(
		'name'     => sanitize_file_name( $filename ),
		'tmp_name' => $tmp_file,
	);

	// Sideload the file.
	$attachment_id = media_handle_sideload( $file_array, $post_id );

	// Clean up temp file if sideload failed.
	if ( is_wp_error( $attachment_id ) ) {
		wp_delete_file( $tmp_file );
		// Log detailed error when WP_DEBUG is enabled.
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Debug logging only when WP_DEBUG enabled.
			error_log( 'Press This sideload error: ' . $attachment_id->get_error_message() );
		}
		return new WP_Error(
			'press_this_sideload_failed',
			__( 'Unable to process the image. Please try again.', 'press-this' ),
			array( 'status' => 500 )
		);
	}

	// Get the attachment data.
	$attachment_url = wp_get_attachment_url( $attachment_id );
	$attachment     = wp_get_attachment_metadata( $attachment_id );

	return rest_ensure_response(
		array(
			'success' => true,
			'id'      => $attachment_id,
			'url'     => $attachment_url,
			'width'   => isset( $attachment['width'] ) ? $attachment['width'] : 0,
			'height'  => isset( $attachment['height'] ) ? $attachment['height'] : 0,
		)
	);
}

/**
 * Adds metabox on wp-admin/tools.php
 *
 * @since 1.0.0
 * @since 2.0.1 Updated description to mention block editor.
 */
function press_this_tool_box() {
	if ( current_user_can( 'edit_posts' ) ) {
		?>
		<div class="card pressthis">
			<h2><?php esc_html_e( 'Press This', 'press-this' ); ?></h2>
			<p><?php esc_html_e( 'Press This is a little tool that lets you grab bits of the web and create new posts with ease.', 'press-this' ); ?>
				<?php esc_html_e( 'It will even allow you to choose from images or videos included on the page and use them in your post.', 'press-this' ); ?>
				<?php esc_html_e( 'Use Press This as a quick and lightweight way to highlight another page on the web.', 'press-this' ); ?>
			</p>
			<p class="description">
				<?php esc_html_e( 'Now featuring the WordPress block editor for a modern editing experience.', 'press-this' ); ?>
			</p>

			<form>
				<h3><?php esc_html_e( 'Install Press This', 'press-this' ); ?></h3>
				<h4><?php esc_html_e( 'Direct link (best for mobile)', 'press-this' ); ?></h4>
				<p><a href="<?php echo esc_url( admin_url( 'press-this.php' ) ); ?>"><?php esc_html_e( 'Open Press This', 'press-this' ); ?></a>
					<?php esc_html_e( 'then add it to your device&#8217;s bookmarks or home screen.', 'press-this' ); ?>
				</p>

				<h4><?php esc_html_e( 'Bookmarklet', 'press-this' ); ?></h4>
				<p><?php esc_html_e( 'Drag the bookmarklet below to your bookmarks bar. Then, when you&#8217;re on a page you want to share, simply &#8220;press&#8221; it.', 'press-this' ); ?></p>

				<p class="pressthis-bookmarklet-wrapper">
					<?php
					// Use esc_attr() instead of esc_url() because esc_url() strips javascript: protocol.
					// The bookmarklet link is trusted (we generate it) and needs the javascript: prefix.
					?>
					<a class="pressthis-bookmarklet" onclick="return false;" href="<?php echo esc_attr( press_this_get_shortcut_link() ); ?>"><span><?php esc_html_e( 'Press This', 'press-this' ); ?></span></a>
					<button type="button" class="button pressthis-js-toggle js-show-pressthis-code-wrap" aria-expanded="false" aria-controls="pressthis-code-wrap">
						<span class="dashicons dashicons-clipboard"></span>
						<span class="screen-reader-text"><?php esc_html_e( 'Copy &#8220;Press This&#8221; bookmarklet code', 'press-this' ); ?></span>
					</button>
				</p>

				<div class="hidden js-pressthis-code-wrap clear" id="pressthis-code-wrap">
					<p id="pressthis-code-desc">
						<?php esc_html_e( 'If you can&#8217;t drag the bookmarklet to your bookmarks, copy the following code and create a new bookmark. Paste the code into the new bookmark&#8217;s URL field.', 'press-this' ); ?>
					</p>

					<p>
						<textarea class="js-pressthis-code" rows="5" cols="120" readonly="readonly" aria-labelledby="pressthis-code-desc"><?php echo esc_textarea( press_this_get_shortcut_link() ); ?></textarea>
					</p>
				</div>

				<script>
				jQuery( document ).ready( function( $ ) {
					var $showPressThisWrap = $( '.js-show-pressthis-code-wrap' );
					var $pressthisCode = $( '.js-pressthis-code' );

					$showPressThisWrap.on( 'click', function( event ) {
						var $this = $( this );

						$this.parent().next( '.js-pressthis-code-wrap' ).slideToggle( 200 );
						$this.attr( 'aria-expanded', $this.attr( 'aria-expanded' ) === 'false' ? 'true' : 'false' );
					});

					// Select Press This code when focusing (tabbing) or clicking the textarea.
					$pressthisCode.on( 'click focus', function() {
						var self = this;
						setTimeout( function() { self.select(); }, 50 );
					});
				});
				</script>
			</form>
		</div>
		<?php
	}
}

/**
 * Retrieves the Press This bookmarklet link.
 *
 * @since Core/2.6.0
 * @since 1.1.0 Added to Press This plugin.
 * @since 2.0.1 Updated for modern bookmarklet with enhanced data extraction.
 *
 * @global bool $is_IE Whether the browser matches an Internet Explorer user agent.
 *
 * @return string The bookmarklet JavaScript code.
 */
function press_this_get_shortcut_link() {
	global $is_IE;

	include_once plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php';

	$link = '';

	if ( $is_IE ) {
		/*
		 * Return the old/shorter bookmarklet code for MSIE 8 and lower,
		 * since they only support a max length of ~2000 characters for
		 * bookmark[let] URLs, which is way too small for our smarter one.
		 * Do update the version number so users do not get the "upgrade your
		 * bookmarklet" notice when using PT in those browsers.
		 */
		$ua = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';

		if ( ! empty( $ua ) && preg_match( '/\bMSIE (\d)/', $ua, $matches ) && (int) $matches[1] <= 8 ) {
			$url = wp_json_encode( admin_url( 'press-this.php' ) );

			$link = 'javascript:var d=document,w=window,e=w.getSelection,k=d.getSelection,x=d.selection,' .
				's=(e?e():(k)?k():(x?x.createRange().text:0)),f=' . $url . ',l=d.location,e=encodeURIComponent,' .
				'u=f+"?u="+e(l.href)+"&t="+e(d.title)+"&s="+e(s)+"&v=' . WP_Press_This_Plugin::VERSION . '";' .
				'a=function(){if(!w.open(u,"t","toolbar=0,resizable=1,scrollbars=1,status=1,width=600,height=700"))l.href=u;};' .
				'if(/Firefox/.test(navigator.userAgent))setTimeout(a,0);else a();void(0)';
		}
	}

	if ( empty( $link ) ) {
		$src = @file_get_contents( plugin_dir_path( __FILE__ ) . 'assets/bookmarklet.min.js' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged

		if ( $src ) {
			$url  = wp_json_encode( admin_url( 'press-this.php' ) . '?v=' . WP_Press_This_Plugin::VERSION );
			$link = 'javascript:' . str_replace( 'window.pt_url', $url, $src );
		}
	}

	$link = str_replace( array( "\r", "\n", "\t" ), '', $link );

	/**
	 * Filters the Press This bookmarklet link.
	 *
	 * @since 2.6.0
	 *
	 * @param string $link The Press This bookmarklet link.
	 */
	return apply_filters( 'shortcut_link', $link );
}

/**
 * Get the Press This editor page URL.
 *
 * @since 2.0.1
 *
 * @param string $url Optional. URL to press. Default empty.
 * @return string Press This editor URL.
 */
function press_this_get_editor_url( $url = '' ) {
	$editor_url = admin_url( 'press-this.php' );

	if ( ! empty( $url ) ) {
		$editor_url = add_query_arg( 'u', rawurlencode( $url ), $editor_url );
	}

	return $editor_url;
}

/**
 * Check if the URL proxy feature is enabled.
 *
 * The proxy allows Direct Access Mode to fetch and scrape URLs server-side.
 * Disabled by default to only fetch content from known external URLs.
 * Site owners can enable it via the 'press_this_enable_url_proxy' filter.
 *
 * @since 2.0.1
 *
 * @return bool True if URL proxy is enabled, false otherwise.
 */
function press_this_is_proxy_enabled() {
	/**
	 * Filters whether the URL proxy feature is enabled.
	 *
	 * When enabled, Press This can fetch URLs server-side for Direct Access Mode.
	 * Disabled by default to limit URL fetching to known sources.
	 *
	 * @since 2.0.1
	 *
	 * @param bool $enabled Whether the proxy is enabled. Default false.
	 */
	return apply_filters( 'press_this_enable_url_proxy', false );
}

/**
 * Permission callback for REST scrape endpoint.
 *
 * @since 2.0.1
 *
 * @param WP_REST_Request $request Request object (unused but required by REST API).
 * @return bool|WP_Error True if allowed, WP_Error otherwise.
 */
function press_this_rest_scrape_permission( $request ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found, VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable -- Required by REST API.
	// Check if proxy feature is enabled.
	if ( ! press_this_is_proxy_enabled() ) {
		return new WP_Error(
			'press_this_proxy_disabled',
			__( 'URL proxy feature is disabled.', 'press-this' ),
			array( 'status' => 403 )
		);
	}

	// User must be able to edit posts.
	if ( ! current_user_can( 'edit_posts' ) ) {
		return new WP_Error(
			'press_this_cannot_scrape',
			__( 'You do not have permission to use this feature.', 'press-this' ),
			array( 'status' => 403 )
		);
	}

	return true;
}

/**
 * Get comprehensive localhost patterns for URL validation.
 *
 * Returns an array of hostname patterns that resolve to localhost,
 * including IPv4, IPv6, and IPv4-mapped IPv6 variants.
 *
 * @since 2.0.1
 *
 * @return array Array of localhost hostname patterns.
 */
function press_this_get_localhost_patterns() {
	return array(
		'localhost',
		'127.0.0.1',
		'::1',
		'[::1]',
		'0.0.0.0',
		'0:0:0:0:0:0:0:1',
		'[0:0:0:0:0:0:0:1]',
		'::ffff:127.0.0.1',
		'[::ffff:127.0.0.1]',
	);
}

/**
 * Check if a hostname is a localhost variant.
 *
 * Checks for common localhost patterns including IPv4, IPv6,
 * bracketed IPv6, IPv4-mapped IPv6, and the 127.x.x.x range.
 *
 * @since 2.0.1
 *
 * @param string $host Hostname to check.
 * @return bool True if localhost, false otherwise.
 */
function press_this_is_localhost( $host ) {
	$host = strtolower( $host );

	// Check against known localhost patterns.
	$localhost_patterns = press_this_get_localhost_patterns();
	if ( in_array( $host, $localhost_patterns, true ) ) {
		return true;
	}

	// Check 127.x.x.x range (entire Class A block).
	if ( preg_match( '/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/', $host ) ) {
		return true;
	}

	// Check IPv4-mapped IPv6 in 127.x.x.x range.
	if ( preg_match( '/^\[?::ffff:127\.\d{1,3}\.\d{1,3}\.\d{1,3}\]?$/i', $host ) ) {
		return true;
	}

	return false;
}

/**
 * Check if a URL is safe to fetch (not a private/internal address).
 *
 * Validates URLs by blocking requests to:
 * - Private IP ranges (10.x, 172.16-31.x, 192.168.x)
 * - Localhost (127.x, ::1, IPv4-mapped IPv6)
 * - Link-local addresses (169.254.x)
 * - Non-HTTP(S) schemes
 *
 * @since 2.0.1
 *
 * @param string $url URL to validate.
 * @return bool|WP_Error True if safe, WP_Error with reason if not.
 */
function press_this_validate_url_for_proxy( $url ) {
	$parsed = wp_parse_url( $url );

	// Must have a valid scheme.
	if ( empty( $parsed['scheme'] ) || ! in_array( $parsed['scheme'], array( 'http', 'https' ), true ) ) {
		return new WP_Error(
			'press_this_invalid_scheme',
			__( 'Only HTTP and HTTPS URLs are allowed.', 'press-this' )
		);
	}

	// Must have a host.
	if ( empty( $parsed['host'] ) ) {
		return new WP_Error(
			'press_this_missing_host',
			__( 'URL must have a valid host.', 'press-this' )
		);
	}

	$host = strtolower( $parsed['host'] );

	// Pre-DNS localhost blocking (defense-in-depth).
	if ( press_this_is_localhost( $host ) ) {
		return new WP_Error(
			'press_this_localhost_blocked',
			__( 'Localhost URLs are not allowed.', 'press-this' )
		);
	}

	// Resolve hostname to IP for further checks.
	$ip = gethostbyname( $host );

	// If resolution failed, gethostbyname returns the hostname.
	if ( $ip === $host && ! filter_var( $host, FILTER_VALIDATE_IP ) ) {
		return new WP_Error(
			'press_this_unresolvable_host',
			__( 'Could not resolve hostname.', 'press-this' )
		);
	}

	// Check for private/reserved IP ranges.
	if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
		$flags = FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;
		if ( ! filter_var( $ip, FILTER_VALIDATE_IP, $flags ) ) {
			return new WP_Error(
				'press_this_private_ip_blocked',
				__( 'Private and reserved IP addresses are not allowed.', 'press-this' )
			);
		}
	}

	/**
	 * Filters whether a URL is allowed for the proxy.
	 *
	 * Allows site owners to add additional URL restrictions.
	 *
	 * @since 2.0.1
	 *
	 * @param bool|WP_Error $allowed True if allowed, WP_Error if blocked.
	 * @param string        $url     The URL being validated.
	 * @param array         $parsed  Parsed URL components.
	 */
	return apply_filters( 'press_this_validate_proxy_url', true, $url, $parsed );
}

/**
 * Check if an IP address is private or reserved.
 *
 * @since 2.0.1
 *
 * @param string $ip IP address to check.
 * @return bool True if private/reserved, false if public.
 */
function press_this_is_private_ip( $ip ) {
	if ( ! filter_var( $ip, FILTER_VALIDATE_IP ) ) {
		return true; // Invalid IPs are treated as private for safety.
	}

	$flags = FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;
	return ! filter_var( $ip, FILTER_VALIDATE_IP, $flags );
}

/**
 * Set or get the Press This HTTP request context.
 *
 * Used to track when Press This is making HTTP requests so we can
 * apply URL validations only to our requests.
 *
 * @since 2.0.1
 *
 * @param bool|null $enable True to enable context, false to disable, null to query.
 * @return bool Current context state.
 */
function press_this_http_request_context( $enable = null ) {
	static $context = false;

	if ( null !== $enable ) {
		$context = (bool) $enable;
	}

	return $context;
}

/**
 * Validate resolved IP address for Press This HTTP requests.
 *
 * Hooks into pre_http_request to provide pre-DNS hostname blocking
 * as defense-in-depth. WordPress's reject_unsafe_urls handles the
 * primary URL validation post-DNS resolution.
 *
 * This function is added via add_filter and can be removed with:
 * remove_filter( 'pre_http_request', 'press_this_validate_http_request_ip', 10 );
 *
 * @since 2.0.1
 *
 * @param false|array|WP_Error $preempt     A preemptive return value.
 * @param array                $parsed_args HTTP request arguments.
 * @param string               $url         The request URL.
 * @return false|array|WP_Error WP_Error if blocked, original $preempt otherwise.
 */
function press_this_validate_http_request_ip( $preempt, $parsed_args, $url ) {
	// Only validate requests within Press This context.
	if ( ! press_this_http_request_context() ) {
		return $preempt;
	}

	// Already blocked or handled by something else.
	if ( false !== $preempt ) {
		return $preempt;
	}

	$parsed = wp_parse_url( $url );
	if ( empty( $parsed['host'] ) ) {
		return new WP_Error(
			'press_this_invalid_url',
			__( 'Invalid URL.', 'press-this' )
		);
	}

	$host = strtolower( $parsed['host'] );

	// Pre-DNS hostname blocking (defense-in-depth).
	if ( press_this_is_localhost( $host ) ) {
		return new WP_Error(
			'press_this_localhost_blocked',
			__( 'Localhost URLs are not allowed.', 'press-this' )
		);
	}

	/**
	 * Filters whether an HTTP request IP is allowed.
	 *
	 * Allows site owners to add additional IP restrictions or bypass
	 * the default private IP blocking.
	 *
	 * @since 2.0.1
	 *
	 * @param false|WP_Error $result False to allow, WP_Error to block.
	 * @param string         $host   The request hostname.
	 * @param string         $url    The request URL.
	 */
	$result = apply_filters( 'press_this_validate_request_ip', false, $host, $url );

	if ( is_wp_error( $result ) ) {
		return $result;
	}

	return $preempt;
}

/**
 * Make an HTTP GET request with Press This URL validation.
 *
 * Wraps wp_remote_get with context tracking and reject_unsafe_urls
 * to leverage WordPress 5.9+ built-in URL validation.
 *
 * @since 2.0.1
 *
 * @param string $url  URL to fetch.
 * @param array  $args Optional. Request arguments.
 * @return array|WP_Error Response array or WP_Error.
 */
function press_this_remote_get( $url, $args = array() ) {
	// Enable reject_unsafe_urls for URL validation (WordPress 5.9+).
	$args['reject_unsafe_urls'] = true;

	press_this_http_request_context( true );
	$response = wp_remote_get( $url, $args );
	press_this_http_request_context( false );

	return $response;
}

/**
 * Download a URL with Press This URL validation.
 *
 * Wraps download_url with context tracking so our pre_http_request
 * filter can validate resolved IPs. The download_url function will
 * use reject_unsafe_urls internally when available.
 *
 * @since 2.0.1
 *
 * @param string $url     URL to download.
 * @param int    $timeout Optional. Timeout in seconds. Default 300.
 * @return string|WP_Error Path to temp file or WP_Error.
 */
function press_this_download_url( $url, $timeout = 300 ) {
	press_this_http_request_context( true );
	$result = download_url( $url, $timeout );
	press_this_http_request_context( false );

	return $result;
}

/**
 * REST API handler for fetching and parsing URL content.
 *
 * Returns sanitized metadata instead of raw HTML.
 * Fetches the HTML from a URL, parses it server-side, and returns
 * structured metadata (title, description, images, embeds, canonical).
 *
 * Returns generic error messages and logs detailed errors when WP_DEBUG is enabled.
 *
 * @since 2.0.1
 *
 * @param WP_REST_Request $request Request object.
 * @return WP_REST_Response|WP_Error Response with parsed metadata or error.
 */
function press_this_rest_scrape_url( $request ) {
	$url = $request->get_param( 'url' );

	// Validate URL is safe to fetch.
	$valid = press_this_validate_url_for_proxy( $url );
	if ( is_wp_error( $valid ) ) {
		$valid->add_data( array( 'status' => 400 ) );
		return $valid;
	}

	// Fetch the URL.
	$response = press_this_remote_get(
		$url,
		array(
			'timeout'     => 15,
			'redirection' => 3,
			'user-agent'  => 'Press This/' . PRESS_THIS__VERSION . '; ' . home_url(),
			'headers'     => array(
				'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			),
		)
	);

	if ( is_wp_error( $response ) ) {
		// Log detailed error when WP_DEBUG is enabled.
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Debug logging only when WP_DEBUG enabled.
			error_log( 'Press This scrape_url error: ' . $response->get_error_message() . ' for URL: ' . $url );
		}
		return new WP_Error(
			'press_this_fetch_failed',
			__( 'Unable to fetch the URL. Please check the address and try again.', 'press-this' ),
			array( 'status' => 502 )
		);
	}

	$status_code = wp_remote_retrieve_response_code( $response );
	if ( $status_code < 200 || $status_code >= 400 ) {
		// Log detailed error when WP_DEBUG is enabled.
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Debug logging only when WP_DEBUG enabled.
			error_log( sprintf( 'Press This scrape_url HTTP error: status %d for URL: %s', $status_code, $url ) );
		}
		return new WP_Error(
			'press_this_fetch_http_error',
			__( 'The URL could not be retrieved. Please check the address and try again.', 'press-this' ),
			array( 'status' => 502 )
		);
	}

	$html      = wp_remote_retrieve_body( $response );
	$final_url = wp_remote_retrieve_header( $response, 'x-final-url' );

	// If no final URL header, use the original (some redirects may have occurred).
	if ( empty( $final_url ) ) {
		$final_url = $url;
	}

	// Parse HTML server-side and return metadata instead of raw HTML.
	$metadata = press_this_parse_html_metadata( $html, $final_url );

	return rest_ensure_response(
		array(
			'success'     => true,
			'url'         => esc_url( $url ),
			'final_url'   => esc_url( $final_url ),
			'title'       => $metadata['title'],
			'description' => $metadata['description'],
			'images'      => $metadata['images'],
			'embeds'      => $metadata['embeds'],
			'canonical'   => $metadata['canonical'],
		)
	);
}

/**
 * Resolve a relative URL to an absolute URL.
 *
 * Handles various URL formats:
 * - Absolute URLs (return as-is with escaping)
 * - Protocol-relative URLs (prepend https:)
 * - Root-relative URLs (prepend scheme://host)
 * - Relative paths (resolve against base path)
 *
 * @since 2.0.1
 *
 * @param string $url      The URL to resolve (may be relative).
 * @param string $base_url The base URL for resolution.
 * @return string The resolved absolute URL, or empty string on failure.
 */
function press_this_resolve_url( $url, $base_url ) {
	if ( empty( $url ) ) {
		return '';
	}

	$url = trim( $url );

	// Already absolute HTTP/HTTPS URL.
	if ( preg_match( '#^https?://#i', $url ) ) {
		return esc_url( $url );
	}

	// Protocol-relative URL.
	if ( strpos( $url, '//' ) === 0 ) {
		return esc_url( 'https:' . $url );
	}

	// Parse the base URL for resolution.
	$base_parts = wp_parse_url( $base_url );
	if ( ! $base_parts || empty( $base_parts['host'] ) ) {
		return '';
	}

	$scheme = isset( $base_parts['scheme'] ) ? $base_parts['scheme'] : 'https';
	$host   = $base_parts['host'];
	$port   = isset( $base_parts['port'] ) ? ':' . $base_parts['port'] : '';

	// Root-relative URL (starts with /).
	if ( strpos( $url, '/' ) === 0 ) {
		return esc_url( $scheme . '://' . $host . $port . $url );
	}

	// Relative path - resolve against base path.
	$base_path = isset( $base_parts['path'] ) ? $base_parts['path'] : '/';
	$base_dir  = dirname( $base_path );

	// Ensure base_dir ends without trailing slash for proper concatenation.
	$base_dir = rtrim( $base_dir, '/' );

	return esc_url( $scheme . '://' . $host . $port . $base_dir . '/' . $url );
}

/**
 * Check if an image should be filtered out based on various criteria.
 *
 * Filters out:
 * - Images smaller than 256x128 pixels (when dimensions are specified)
 * - Avatar images (detected by src or class containing "avatar")
 * - Data URLs
 *
 * @since 2.0.1
 *
 * @param string $src       Image source URL.
 * @param string $classname Image CSS class attribute.
 * @param int    $width     Image width (0 if not specified).
 * @param int    $height    Image height (0 if not specified).
 * @return bool True if image should be filtered out, false otherwise.
 */
function press_this_is_filtered_image( $src, $classname, $width, $height ) {
	// Filter out data: URLs.
	if ( strpos( $src, 'data:' ) === 0 ) {
		return true;
	}

	// Filter out small images (only when dimensions are explicitly specified).
	if ( $width > 0 && $width < 256 ) {
		return true;
	}
	if ( $height > 0 && $height < 128 ) {
		return true;
	}

	// Filter out avatar images by src pattern.
	if ( stripos( $src, 'avatar' ) !== false ) {
		return true;
	}

	// Filter out avatar images by class.
	if ( stripos( $classname, 'avatar' ) !== false ) {
		return true;
	}

	return false;
}

/**
 * Parse HTML and extract metadata server-side.
 *
 * Extracts title, description, images, embeds, and canonical URL from HTML.
 * Uses DOMDocument and DOMXPath for parsing with proper error suppression
 * for malformed HTML.
 *
 * Priority order for extraction:
 * - Title: og:title > twitter:title > <title>
 * - Description: og:description > twitter:description > meta description
 *
 * @since 2.0.1
 *
 * @param string $html     Raw HTML content.
 * @param string $base_url Base URL for resolving relative URLs.
 * @return array Extracted metadata with keys: title, description, images, embeds, canonical.
 */
function press_this_parse_html_metadata( $html, $base_url ) {
	// phpcs:disable WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase -- DOM API uses camelCase properties.

	$metadata = array(
		'title'       => '',
		'description' => '',
		'images'      => array(),
		'embeds'      => array(),
		'canonical'   => '',
	);

	if ( empty( $html ) ) {
		return $metadata;
	}

	// Suppress libxml errors for malformed HTML.
	libxml_use_internal_errors( true );

	$doc = new DOMDocument();

	// Load HTML with UTF-8 encoding hint.
	$doc->loadHTML( '<?xml encoding="utf-8" ?>' . $html, LIBXML_NOERROR | LIBXML_NOWARNING );

	libxml_clear_errors();

	$xpath = new DOMXPath( $doc );

	// Extract title (priority: og:title > twitter:title > <title>).
	$og_title = $xpath->query( '//meta[@property="og:title"]/@content' );
	if ( $og_title->length > 0 ) {
		$metadata['title'] = $og_title->item( 0 )->nodeValue;
	} else {
		$twitter_title = $xpath->query( '//meta[@name="twitter:title"]/@content' );
		if ( $twitter_title->length > 0 ) {
			$metadata['title'] = $twitter_title->item( 0 )->nodeValue;
		} else {
			$title = $xpath->query( '//title' );
			if ( $title->length > 0 ) {
				$metadata['title'] = $title->item( 0 )->textContent;
			}
		}
	}

	// Extract description (priority: og:description > twitter:description > meta description).
	$og_desc = $xpath->query( '//meta[@property="og:description"]/@content' );
	if ( $og_desc->length > 0 ) {
		$metadata['description'] = $og_desc->item( 0 )->nodeValue;
	} else {
		$twitter_desc = $xpath->query( '//meta[@name="twitter:description"]/@content' );
		if ( $twitter_desc->length > 0 ) {
			$metadata['description'] = $twitter_desc->item( 0 )->nodeValue;
		} else {
			$meta_desc = $xpath->query( '//meta[@name="description"]/@content' );
			if ( $meta_desc->length > 0 ) {
				$metadata['description'] = $meta_desc->item( 0 )->nodeValue;
			}
		}
	}

	// Extract og:image URLs.
	$og_images = $xpath->query( '//meta[@property="og:image"]/@content' );
	foreach ( $og_images as $img ) {
		$img_url = press_this_resolve_url( $img->nodeValue, $base_url );
		if ( $img_url && ! press_this_is_filtered_image( $img_url, '', 0, 0 ) ) {
			$metadata['images'][] = $img_url;
		}
	}

	// Extract images from content with filtering.
	$content_images = $xpath->query( '//img[@src]' );
	foreach ( $content_images as $img ) {
		$src    = $img->getAttribute( 'src' );
		$width  = (int) $img->getAttribute( 'width' );
		$height = (int) $img->getAttribute( 'height' );
		$class  = $img->getAttribute( 'class' );

		// Apply image filtering.
		if ( press_this_is_filtered_image( $src, $class, $width, $height ) ) {
			continue;
		}

		$img_url = press_this_resolve_url( $src, $base_url );
		if ( $img_url ) {
			$metadata['images'][] = $img_url;
		}
	}

	// Extract embeds from og:video meta tags.
	$og_video_queries = array(
		'//meta[@property="og:video"]/@content',
		'//meta[@property="og:video:url"]/@content',
		'//meta[@property="og:video:secure_url"]/@content',
	);

	foreach ( $og_video_queries as $query ) {
		$og_video = $xpath->query( $query );
		foreach ( $og_video as $video ) {
			$embed_url = esc_url( $video->nodeValue );
			if ( $embed_url ) {
				$metadata['embeds'][] = $embed_url;
			}
		}
	}

	// Extract iframes (excluding about:blank).
	$iframes = $xpath->query( '//iframe[@src]' );
	foreach ( $iframes as $iframe ) {
		$src = $iframe->getAttribute( 'src' );
		if ( $src && 'about:blank' !== $src ) {
			$embed_url = press_this_resolve_url( $src, $base_url );
			if ( $embed_url ) {
				$metadata['embeds'][] = $embed_url;
			}
		}
	}

	// Extract canonical URL.
	$canonical = $xpath->query( '//link[@rel="canonical"]/@href' );
	if ( $canonical->length > 0 ) {
		$metadata['canonical'] = esc_url( $canonical->item( 0 )->nodeValue );
	}

	// Deduplicate arrays.
	$metadata['images'] = array_values( array_unique( $metadata['images'] ) );
	$metadata['embeds'] = array_values( array_unique( $metadata['embeds'] ) );

	// Apply array limits (50 images, 20 embeds).
	$metadata['images'] = array_slice( $metadata['images'], 0, 50 );
	$metadata['embeds'] = array_slice( $metadata['embeds'], 0, 20 );

	// Sanitize text fields.
	$metadata['title']       = sanitize_text_field( $metadata['title'] );
	$metadata['description'] = sanitize_text_field( $metadata['description'] );

	// URLs are already escaped via esc_url() during extraction.
	// Apply additional sanitization for safety.
	$metadata['images'] = array_map( 'esc_url', $metadata['images'] );
	$metadata['embeds'] = array_map( 'esc_url', $metadata['embeds'] );

	// phpcs:enable WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase

	return $metadata;
}
