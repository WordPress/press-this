<?php
/**
 * Press This class and display functionality
 *
 * @package Press_This_Plugin
 * @subpackage Press_This
 * @since 1.0.0
 */

/**
 * Press This class.
 *
 * @since 1.0.0
 */
class WP_Press_This_Plugin {
	/**
	 * Used to trigger the bookmarklet update notice.
	 * Increment when bookmarklet functionality changes.
	 *
	 * @since 2.0.1
	 */
	const VERSION = 11;

	/**
	 * Bookmarklet version number.
	 *
	 * @var int
	 */
	public $version = 11;

	/**
	 * Images from the Pressed site.
	 *
	 * @var array
	 */
	private $images = array();

	/**
	 * Embeds from the Pressed site.
	 *
	 * @var array
	 */
	private $embeds = array();

	/**
	 * Domain of the Pressed site.
	 *
	 * @var string
	 */
	private $domain = '';

	/**
	 * Constructor.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {}

	/**
	 * App and site settings data, including i18n strings for the client-side.
	 *
	 * @since 1.0.0
	 *
	 * @return array Site settings.
	 */
	public function site_settings() {
		return array(
			/**
			 * Filters whether or not Press This should redirect the user in the parent window upon save.
			 *
			 * @since 1.0.0
			 *
			 * @param bool $redirect Whether to redirect in parent window or not. Default false.
			 */
			'redirInParent' => apply_filters( 'press_this_redirect_in_parent', false ),
		);
	}

	/**
	 * Get the source's images and save them locally, for posterity, unless we can't.
	 *
	 * @since 1.0.0
	 *
	 * @param int    $post_id Post ID.
	 * @param string $content Optional. Current expected markup for Press This. Expects slashed. Default empty.
	 * @return string New markup with old image URLs replaced with the local attachment ones if swapped.
	 */
	public function side_load_images( $post_id, $content = '' ) {
		$content = wp_unslash( $content );

		if ( preg_match_all( '/<img [^>]+>/', $content, $matches ) && current_user_can( 'upload_files' ) ) {
			foreach ( (array) $matches[0] as $image ) {
				// This is inserted from our JS so HTML attributes should always be in double quotes.
				if ( ! preg_match( '/src="([^"]+)"/', $image, $url_matches ) ) {
					continue;
				}

				$image_src = $url_matches[1];

				// Don't try to sideload a file without a file extension, leads to WP upload error.
				if ( ! preg_match( '/[^\?]+\.(?:jpe?g|jpe|gif|png|webp)(?:\?|$)/i', $image_src ) ) {
					continue;
				}

				// Sideload image, which gives us a new image src.
				$new_src = media_sideload_image( $image_src, $post_id, null, 'src' );

				if ( ! is_wp_error( $new_src ) ) {
					// Replace the POSTED content <img> with correct uploaded ones.
					// Need to do it in two steps so we don't replace links to the original image if any.
					$new_image = str_replace( $image_src, $new_src, $image );
					$content   = str_replace( $image, $new_image, $content );
				}
			}
		}

		// Expected slashed.
		return wp_slash( $content );
	}

	/**
	 * Ajax handler for saving the post as draft or published.
	 *
	 * @since 1.0.0
	 * @since 2.0.1 Added input sanitization for categories and taxonomies.
	 */
	public function save_post() {
		// Verify a post ID is set first, then process the nonce since it uses the post ID.
		$post_id = ( ! empty( $_POST['post_ID'] ) ? (int) $_POST['post_ID'] : null ); // phpcs:ignore WordPress.Security.NonceVerification.Missing

		if ( ! $post_id ) {
			wp_send_json_error( array( 'errorMessage' => __( 'Missing post ID.', 'press-this' ) ) );
		}

		if ( empty( $_POST['_wpnonce'] ) || ! wp_verify_nonce( $_POST['_wpnonce'], 'update-post_' . $post_id ) ||
			! current_user_can( 'edit_post', $post_id ) ) {

			wp_send_json_error( array( 'errorMessage' => __( 'Invalid post.', 'press-this' ) ) );
		}

		// Get the existing post to preserve its post type.
		$existing_post = get_post( $post_id );
		$post_type     = $existing_post ? $existing_post->post_type : 'post';

		$post_data = array(
			'ID'           => $post_id,
			'post_title'   => ( ! empty( $_POST['post_title'] ) ) ? sanitize_text_field( trim( $_POST['post_title'] ) ) : '',
			'post_content' => ( ! empty( $_POST['post_content'] ) ) ? trim( $_POST['post_content'] ) : '',
			'post_type'    => $post_type,
			'post_status'  => 'draft',
			'post_format'  => ( ! empty( $_POST['post_format'] ) ) ? sanitize_text_field( $_POST['post_format'] ) : '',
		);

		// Sanitize category IDs with absint and verify capability.
		$category_tax = get_taxonomy( 'category' );
		if ( current_user_can( $category_tax->cap->assign_terms ) ) {
			if ( ! empty( $_POST['post_category'] ) ) {
				// Convert all values to integers and filter out zeros (invalid IDs).
				$categories                 = array_map( 'absint', (array) $_POST['post_category'] );
				$categories                 = array_filter( $categories );
				$post_data['post_category'] = $categories;
			} else {
				$post_data['post_category'] = array();
			}
		}

		// Sanitize taxonomy inputs with proper type handling.
		if ( ! empty( $_POST['tax_input'] ) ) {
			$tax_input = array();

			foreach ( (array) $_POST['tax_input'] as $tax => $terms ) {
				// Sanitize taxonomy key.
				$tax = sanitize_key( $tax );

				// Validate taxonomy exists.
				$tax_object = get_taxonomy( $tax );
				if ( ! $tax_object ) {
					continue;
				}

				// Verify user has capability to assign terms.
				if ( ! current_user_can( $tax_object->cap->assign_terms ) ) {
					continue;
				}

				// Sanitize terms based on taxonomy type.
				if ( is_taxonomy_hierarchical( $tax ) ) {
					// Hierarchical taxonomies use term IDs (integers).
					$tax_input[ $tax ] = array_map( 'absint', (array) $terms );
					$tax_input[ $tax ] = array_filter( $tax_input[ $tax ] );
				} else {
					// Non-hierarchical taxonomies use term names (strings).
					$tax_input[ $tax ] = array_map( 'sanitize_text_field', (array) $terms );
					$tax_input[ $tax ] = array_filter( $tax_input[ $tax ] );
				}
			}

			if ( ! empty( $tax_input ) ) {
				$post_data['tax_input'] = $tax_input;
			}
		}

		// Toggle status to pending if user cannot actually publish.
		if ( ! empty( $_POST['post_status'] ) && 'publish' === $_POST['post_status'] ) {
			if ( current_user_can( 'publish_posts' ) ) {
				$post_data['post_status'] = 'publish';
			} else {
				$post_data['post_status'] = 'pending';
			}
		}

		$post_data['post_content'] = $this->side_load_images( $post_id, $post_data['post_content'] );

		/**
		 * Filters the post data of a Press This post before saving/updating.
		 *
		 * The {@see 'side_load_images'} action has already run at this point.
		 *
		 * @since 1.0.0
		 *
		 * @param array $post_data The post data.
		 */
		$post_data = apply_filters( 'press_this_save_post', $post_data );

		$updated = wp_update_post( $post_data, true );

		if ( is_wp_error( $updated ) ) {
			wp_send_json_error( array( 'errorMessage' => $updated->get_error_message() ) );
		} else {
			if ( isset( $post_data['post_format'] ) ) {
				if ( current_theme_supports( 'post-formats', $post_data['post_format'] ) ) {
					set_post_format( $post_id, $post_data['post_format'] );
				} elseif ( $post_data['post_format'] ) {
					set_post_format( $post_id, false );
				}
			}

			$force_redirect = false;

			if ( 'publish' === get_post_status( $post_id ) ) {
				$redirect = get_post_permalink( $post_id );
			} elseif ( isset( $_POST['pt-force-redirect'] ) && 'true' === $_POST['pt-force-redirect'] ) {
				$force_redirect = true;
				$redirect       = get_edit_post_link( $post_id, 'js' );
			} else {
				$redirect = false;
			}

			/**
			 * Filters the URL to redirect to when Press This saves.
			 *
			 * @since 1.0.0
			 *
			 * @param string $url     Redirect URL. If `$status` is 'publish', this will be the post permalink.
			 *                        Otherwise, the default is false resulting in no redirect.
			 * @param int    $post_id Post ID.
			 * @param string $status  Post status.
			 */
			$redirect = apply_filters( 'press_this_save_redirect', $redirect, $post_id, $post_data['post_status'] );

			if ( $redirect ) {
				wp_send_json_success(
					array(
						'redirect' => $redirect,
						'force'    => $force_redirect,
					)
				);
			} else {
				wp_send_json_success( array( 'postSaved' => true ) );
			}
		}
	}

	/**
	 * Ajax handler for adding a new category.
	 *
	 * @since 1.0.0
	 */
	public function add_category() {
		if ( false === wp_verify_nonce( $_POST['new_cat_nonce'], 'add-category' ) ) {
			wp_send_json_error();
		}

		$taxonomy = get_taxonomy( 'category' );

		if ( ! current_user_can( $taxonomy->cap->edit_terms ) || empty( $_POST['name'] ) ) {
			wp_send_json_error();
		}

		$parent = isset( $_POST['parent'] ) && (int) $_POST['parent'] > 0 ? (int) $_POST['parent'] : 0;
		$names  = explode( ',', $_POST['name'] );
		$added  = array();
		$data   = array();

		foreach ( $names as $cat_name ) {
			$cat_name     = trim( $cat_name );
			$cat_nicename = sanitize_title( $cat_name );

			if ( empty( $cat_nicename ) ) {
				continue;
			}

			// @todo Find a more performant way to check existence, maybe get_term() with a separate parent check.
			if ( term_exists( $cat_name, $taxonomy->name, $parent ) ) {
				if ( count( $names ) === 1 ) {
					wp_send_json_error( array( 'errorMessage' => __( 'This category already exists.', 'press-this' ) ) );
				} else {
					continue;
				}
			}

			$cat_id = wp_insert_term( $cat_name, $taxonomy->name, array( 'parent' => $parent ) );

			if ( is_wp_error( $cat_id ) ) {
				continue;
			} elseif ( is_array( $cat_id ) ) {
				$cat_id = $cat_id['term_id'];
			}

			$added[] = $cat_id;
		}

		if ( empty( $added ) ) {
			wp_send_json_error( array( 'errorMessage' => __( 'This category cannot be added. Please change the name and try again.', 'press-this' ) ) );
		}

		foreach ( $added as $new_cat_id ) {
			$new_cat = get_category( $new_cat_id );

			if ( is_wp_error( $new_cat ) ) {
				wp_send_json_error( array( 'errorMessage' => __( 'Error while adding the category. Please try again later.', 'press-this' ) ) );
			}

			$data[] = array(
				'term_id' => $new_cat->term_id,
				'name'    => $new_cat->name,
				'parent'  => $new_cat->parent,
			);
		}
		wp_send_json_success( $data );
	}

	/**
	 * Utility method to limit an array to 50 values.
	 *
	 * @ignore
	 * @since 1.0.0
	 *
	 * @param array $value Array to limit.
	 * @return array Original array if fewer than 50 values, limited array, empty array otherwise.
	 */
	private function limit_array( $value ) {
		if ( is_array( $value ) ) {
			if ( count( $value ) > 50 ) {
				return array_slice( $value, 0, 50 );
			}

			return $value;
		}

		return array();
	}

	/**
	 * Utility method to limit the length of a given string to 5,000 characters.
	 *
	 * @ignore
	 * @since 1.0.0
	 *
	 * @param string $value String to limit.
	 * @return bool|int|string If boolean or integer, that value. If a string, the original value
	 *                         if fewer than 5,000 characters, a truncated version, otherwise an
	 *                         empty string.
	 */
	private function limit_string( $value ) {
		$return = '';

		if ( is_numeric( $value ) || is_bool( $value ) ) {
			$return = $value;
		} elseif ( is_string( $value ) ) {
			if ( mb_strlen( $value ) > 5000 ) {
				$return = mb_substr( $value, 0, 5000 );
			} else {
				$return = $value;
			}

			$return = html_entity_decode( $return, ENT_QUOTES, 'UTF-8' );
			$return = sanitize_text_field( trim( $return ) );
		}

		return $return;
	}

	/**
	 * Utility method to limit and validate a given URL.
	 *
	 * Applies defense-in-depth validation including:
	 * - String type check
	 * - 2048 character length limit
	 * - WordPress URL validation via wp_http_validate_url()
	 * - Scheme restriction to http/https only
	 *
	 * @ignore
	 * @since 1.0.0
	 * @since 2.0.1 Enhanced validation with wp_http_validate_url() and strict scheme checking.
	 *
	 * @param string $url URL to check for length and validity.
	 * @return string Escaped URL if valid. Empty string otherwise.
	 */
	private function limit_url( $url ) {
		// Type check.
		if ( ! is_string( $url ) ) {
			return '';
		}

		// Length limit (2048 characters is de-facto browser standard).
		if ( strlen( $url ) > 2048 ) {
			return '';
		}

		// Decode URL-encoded characters for validation.
		$decoded_url = urldecode( $url );

		// If the URL is root-relative, prepend the protocol and domain name.
		if ( $decoded_url && $this->domain && preg_match( '%^/[^/]+%', $decoded_url ) ) {
			$decoded_url = $this->domain . $decoded_url;
		}

		// Use WordPress URL validation for comprehensive checks.
		$validated = wp_http_validate_url( $decoded_url );

		if ( ! $validated ) {
			// Fall back to esc_url_raw with scheme restriction.
			$validated = esc_url_raw( $decoded_url, array( 'http', 'https' ) );
		}

		// Empty after validation means invalid.
		if ( empty( $validated ) ) {
			return '';
		}

		// Final scheme check - must be http or https.
		if ( ! preg_match( '#^https?://#i', $validated ) ) {
			return '';
		}

		return $validated;
	}

	/**
	 * Utility method to limit image source URLs.
	 *
	 * Excluded URLs include share-this type buttons, loaders, spinners, spacers, WordPress interface images,
	 * tiny buttons or thumbs, mathtag.com or quantserve.com images, or the WordPress.com stats gif.
	 *
	 * @ignore
	 * @since 1.0.0
	 *
	 * @param string $src Image source URL.
	 * @return string If not matched an excluded URL type, the original URL, empty string otherwise.
	 */
	private function limit_img( $src ) {
		$src = $this->limit_url( $src );

		if ( preg_match( '!/ad[sx]?/!i', $src ) ) {
			// Ads.
			return '';
		} elseif ( preg_match( '!(/share-?this[^.]+?\.[a-z0-9]{3,4})(\?.*)?$!i', $src ) ) {
			// Share-this type button.
			return '';
		} elseif ( preg_match( '!/(spinner|loading|spacer|blank|rss)\.(gif|jpg|png)!i', $src ) ) {
			// Loaders, spinners, spacers.
			return '';
		} elseif ( preg_match( '!/([^./]+[-_])?(spinner|loading|spacer|blank)s?([-_][^./]+)?\.[a-z0-9]{3,4}!i', $src ) ) {
			// Fancy loaders, spinners, spacers.
			return '';
		} elseif ( preg_match( '!([^./]+[-_])?thumb[^.]*\.(gif|jpg|png)$!i', $src ) ) {
			// Thumbnails, too small, usually irrelevant to context.
			return '';
		} elseif ( false !== stripos( $src, '/wp-includes/' ) ) {
			// Classic WordPress interface images.
			return '';
		} elseif ( preg_match( '![^\d]\d{1,2}x\d+\.(gif|jpg|png)$!i', $src ) ) {
			// Most often tiny buttons/thumbs (< 100px wide).
			return '';
		} elseif ( preg_match( '!/pixel\.(mathtag|quantserve)\.com!i', $src ) ) {
			// See https://www.quantcast.com/how-we-do-it/iab-standard-measurement/how-we-collect-data/ and mathtag.com.
			return '';
		} elseif ( preg_match( '!/[gb]\.gif(\?.+)?$!i', $src ) ) {
			// WordPress.com stats gif.
			return '';
		}

		return $src;
	}

	/**
	 * Limit embed source URLs to specific providers.
	 *
	 * Not all core oEmbed providers are supported. Supported providers include YouTube, Vimeo,
	 * Daily Motion, SoundCloud, and Twitter.
	 *
	 * @ignore
	 * @since 1.0.0
	 *
	 * @param string $src Embed source URL.
	 * @return string If not from a supported provider, an empty string. Otherwise, a reformatted embed URL.
	 */
	private function limit_embed( $src ) {
		$src = $this->limit_url( $src );

		if ( empty( $src ) ) {
			return '';
		}

		if ( preg_match( '!//(m|www)\.youtube\.com/(embed|v)/([^?]+)\?.+$!i', $src, $src_matches ) ) {
			// Embedded Youtube videos (www or mobile).
			$src = 'https://www.youtube.com/watch?v=' . $src_matches[3];
		} elseif ( preg_match( '!//player\.vimeo\.com/video/([\d]+)([?/].*)?$!i', $src, $src_matches ) ) {
			// Embedded Vimeo iframe videos.
			$src = 'https://vimeo.com/' . (int) $src_matches[1];
		} elseif ( preg_match( '!//vimeo\.com/moogaloop\.swf\?clip_id=([\d]+)$!i', $src, $src_matches ) ) {
			// Embedded Vimeo Flash videos.
			$src = 'https://vimeo.com/' . (int) $src_matches[1];
		} elseif ( preg_match( '!//(www\.)?dailymotion\.com/embed/video/([^/?]+)([/?].+)?!i', $src, $src_matches ) ) {
			// Embedded Daily Motion videos.
			$src = 'https://www.dailymotion.com/video/' . $src_matches[2];
		} else {
			$oembed = _wp_oembed_get_object();

			if ( ! $oembed->get_provider( $src, array( 'discover' => false ) ) ) {
				$src = '';
			}
		}

		return $src;
	}

	/**
	 * Process a meta data entry from the source.
	 *
	 * @ignore
	 * @since 1.0.0
	 *
	 * @param string $meta_name  Meta key name.
	 * @param mixed  $meta_value Meta value.
	 * @param array  $data       Associative array of source data.
	 * @return array Processed data array.
	 */
	private function process_meta_entry( $meta_name, $meta_value, $data ) {
		if ( preg_match( '/:?(title|description|keywords|site_name)$/', $meta_name ) ) {
			$data['_meta'][ $meta_name ] = $meta_value;
		} else {
			switch ( $meta_name ) {
				case 'og:url':
				case 'og:video':
				case 'og:video:secure_url':
					$meta_value = $this->limit_embed( $meta_value );

					if ( ! isset( $data['_embeds'] ) ) {
						$data['_embeds'] = array();
					}

					if ( ! empty( $meta_value ) && ! in_array( $meta_value, $data['_embeds'], true ) ) {
						$data['_embeds'][] = $meta_value;
					}

					break;
				case 'og:image':
				case 'og:image:secure_url':
				case 'twitter:image0:src':
				case 'twitter:image0':
				case 'twitter:image:src':
				case 'twitter:image':
					$meta_value = $this->limit_img( $meta_value );

					if ( ! isset( $data['_images'] ) ) {
						$data['_images'] = array();
					}

					if ( ! empty( $meta_value ) && ! in_array( $meta_value, $data['_images'], true ) ) {
						$data['_images'][] = $meta_value;
					}

					break;
			}
		}

		return $data;
	}

	/**
	 * Get the bookmarklet version from request data.
	 *
	 * Supports both legacy 'v' parameter (from URL) and new 'pt_version' (from POST).
	 *
	 * @since 2.0.1
	 *
	 * @return int|null Bookmarklet version number or null if not provided.
	 */
	private function get_bookmarklet_version() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing, WordPress.Security.NonceVerification.Recommended -- Bookmarklet data from external sites cannot include nonces.

		// Modern bookmarklet sends pt_version via POST.
		if ( ! empty( $_POST['pt_version'] ) ) {
			return (int) $_POST['pt_version'];
		}

		// Legacy bookmarklet sends v via GET or POST.
		if ( ! empty( $_POST['v'] ) ) {
			return (int) $_POST['v'];
		}

		if ( ! empty( $_GET['v'] ) ) {
			return (int) $_GET['v'];
		}

		// phpcs:enable WordPress.Security.NonceVerification.Missing, WordPress.Security.NonceVerification.Recommended
		return null;
	}

	/**
	 * Handles backward-compat with the legacy version of Press This by supporting its query string params.
	 *
	 * Server-side scraping has been removed in v2.0.1. All content extraction is now handled
	 * client-side by the bookmarklet. Legacy GET parameters (u, t, s, v) are still supported
	 * for backward compatibility with older bookmarklets.
	 *
	 * @since 1.0.0
	 * @since 2.0.1 Removed server-side scraping fallback. Added support for pt_version,
	 *              _og_video, _jsonld, and alternate_canonical from enhanced bookmarklet.
	 *
	 * @return array
	 */
	public function merge_or_fetch_data() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing, WordPress.Security.NonceVerification.Recommended -- Bookmarklet data from external sites cannot include nonces.

		// Get data from $_POST and $_GET, as appropriate ($_POST > $_GET), to remain backward compatible.
		$data = array();

		// Only instantiate the keys we want. Sanity check and sanitize each one.
		// Legacy URL format: ?u=URL&t=TITLE&s=SELECTION&v=VERSION.
		foreach ( array( 'u', 's', 't', 'v' ) as $key ) {
			if ( ! empty( $_POST[ $key ] ) ) {
				$value = wp_unslash( $_POST[ $key ] );
			} elseif ( ! empty( $_GET[ $key ] ) ) {
				$value = wp_unslash( $_GET[ $key ] );
			} else {
				continue;
			}

			if ( 'u' === $key ) {
				$value = $this->limit_url( $value );

				if ( preg_match( '%^(?:https?:)?//[^/]+%i', $value, $domain_match ) ) {
					$this->domain = $domain_match[0];
				}
			} else {
				$value = $this->limit_string( $value );
			}

			if ( ! empty( $value ) ) {
				$data[ $key ] = $value;
			}
		}

		// Get bookmarklet version (supports both legacy 'v' and modern 'pt_version').
		$bookmarklet_version = $this->get_bookmarklet_version();
		if ( null !== $bookmarklet_version ) {
			$data['v'] = $bookmarklet_version;
		}

		/**
		 * Filters whether to enable in-source media discovery in Press This.
		 *
		 * @since 1.0.0
		 *
		 * @param bool $enable Whether to enable media discovery.
		 */
		if ( apply_filters( 'enable_press_this_media_discovery', true ) ) {
			// Process POST data from modern bookmarklet (no server-side fallback).
			foreach ( array( '_images', '_embeds', '_og_video' ) as $type ) {
				if ( empty( $_POST[ $type ] ) ) {
					continue;
				}

				if ( ! isset( $data[ $type ] ) ) {
					$data[ $type ] = array();
				}

				$items = $this->limit_array( $_POST[ $type ] );

				foreach ( $items as $key => $value ) {
					if ( '_images' === $type ) {
						$value = $this->limit_img( wp_unslash( $value ) );
					} else {
						// Both _embeds and _og_video are embed URLs.
						$value = $this->limit_embed( wp_unslash( $value ) );
					}

					if ( ! empty( $value ) && ! in_array( $value, $data[ $type ], true ) ) {
						// For _og_video, add to _embeds array instead of separate key.
						if ( '_og_video' === $type ) {
							if ( ! isset( $data['_embeds'] ) ) {
								$data['_embeds'] = array();
							}
							if ( ! in_array( $value, $data['_embeds'], true ) ) {
								$data['_embeds'][] = $value;
							}
						} else {
							$data[ $type ][] = $value;
						}
					}
				}
			}

			foreach ( array( '_meta', '_links', '_jsonld' ) as $type ) {
				if ( empty( $_POST[ $type ] ) ) {
					continue;
				}

				if ( ! isset( $data[ $type ] ) ) {
					$data[ $type ] = array();
				}

				$items = $this->limit_array( $_POST[ $type ] );

				foreach ( $items as $key => $value ) {
					// Sanity check. These are associative arrays, $key is usually things like 'title', 'description', 'keywords', etc.
					if ( empty( $key ) || strlen( $key ) > 100 ) {
						continue;
					}

					if ( '_meta' === $type ) {
						$value = $this->limit_string( wp_unslash( $value ) );

						if ( ! empty( $value ) ) {
							$data = $this->process_meta_entry( $key, $value, $data );
						}
					} elseif ( '_links' === $type ) {
						// Support canonical, shortlink, icon, and alternate_canonical.
						if ( in_array( $key, array( 'canonical', 'shortlink', 'icon', 'alternate_canonical' ), true ) ) {
							$data[ $type ][ $key ] = $this->limit_url( wp_unslash( $value ) );
						}
					} elseif ( '_jsonld' === $type ) {
						// Process JSON-LD structured data.
						if ( in_array( $key, array( 'canonical', 'headline', 'description', 'image' ), true ) ) {
							if ( 'canonical' === $key || 'image' === $key ) {
								$data[ $type ][ $key ] = $this->limit_url( wp_unslash( $value ) );
							} else {
								$data[ $type ][ $key ] = $this->limit_string( wp_unslash( $value ) );
							}
						}
					}
				}
			}

			// Support passing a single image src as `i`.
			if ( ! empty( $_REQUEST['i'] ) ) {
				$img_src = $this->limit_img( wp_unslash( $_REQUEST['i'] ) );
				if ( $img_src ) {
					if ( empty( $data['_images'] ) ) {
						$data['_images'] = array( $img_src );
					} elseif ( ! in_array( $img_src, $data['_images'], true ) ) {
						array_unshift( $data['_images'], $img_src );
					}
				}
			}
		}

		// phpcs:enable WordPress.Security.NonceVerification.Missing, WordPress.Security.NonceVerification.Recommended

		/**
		 * Filters the Press This data array.
		 *
		 * @since 1.0.0
		 *
		 * @param array $data Press This Data array.
		 */
		return apply_filters( 'press_this_data', $data );
	}

	/**
	 * Outputs the post format selection HTML.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_Post $post Post object.
	 */
	public function post_formats_html( $post ) {
		if ( current_theme_supports( 'post-formats' ) && post_type_supports( $post->post_type, 'post-formats' ) ) {
			$post_formats = get_theme_support( 'post-formats' );

			if ( is_array( $post_formats[0] ) ) {
				$post_format = get_post_format( $post->ID );

				if ( ! $post_format ) {
					$post_format = '0';
				}

				// Add in the current one if it isn't there yet, in case the current theme doesn't support it.
				if ( $post_format && ! in_array( $post_format, $post_formats[0], true ) ) {
					$post_formats[0][] = $post_format;
				}

				?>
				<div id="post-formats-select">
				<fieldset><legend class="screen-reader-text"><?php esc_html_e( 'Post Formats', 'press-this' ); ?></legend>
					<input type="radio" name="post_format" class="post-format" id="post-format-0" value="0" <?php checked( $post_format, '0' ); ?> />
					<label for="post-format-0" class="post-format-icon post-format-standard"><?php echo esc_html( get_post_format_string( 'standard' ) ); ?></label>
					<?php

					foreach ( $post_formats[0] as $format ) {
						?>
						<br />
						<input type="radio" name="post_format" class="post-format" id="post-format-<?php echo esc_attr( $format ); ?>" value="<?php echo esc_attr( $format ); ?>" <?php checked( $post_format, $format ); ?> />
						<label for="post-format-<?php echo esc_attr( $format ); ?>" class="post-format-icon post-format-<?php echo esc_attr( $format ); ?>"><?php echo esc_html( get_post_format_string( $format ) ); ?></label>
						<?php
					}

					?>
				</fieldset>
				</div>
				<?php
			}
		}
	}

	/**
	 * Outputs the categories HTML.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_Post $post Post object.
	 */
	public function categories_html( $post ) {
		$taxonomy = get_taxonomy( 'category' );

		// Bail if user cannot assign terms.
		if ( ! current_user_can( $taxonomy->cap->assign_terms ) ) {
			return;
		}

		// Only show "add" if user can edit terms.
		if ( current_user_can( $taxonomy->cap->edit_terms ) ) {
			?>
			<button type="button" class="add-cat-toggle button-link" aria-expanded="false">
				<span class="dashicons dashicons-plus"></span><span class="screen-reader-text"><?php esc_html_e( 'Toggle add category', 'press-this' ); ?></span>
			</button>
			<div class="add-category is-hidden">
				<label class="screen-reader-text" for="new-category"><?php echo esc_html( $taxonomy->labels->add_new_item ); ?></label>
				<input type="text" id="new-category" class="add-category-name" placeholder="<?php echo esc_attr( $taxonomy->labels->new_item_name ); ?>" value="" aria-required="true">
				<label class="screen-reader-text" for="new-category-parent"><?php echo esc_html( $taxonomy->labels->parent_item_colon ); ?></label>
				<div class="postform-wrapper">
					<?php
					wp_dropdown_categories(
						array(
							'taxonomy'         => 'category',
							'hide_empty'       => 0,
							'name'             => 'new-category-parent',
							'orderby'          => 'name',
							'hierarchical'     => 1,
							'show_option_none' => '&mdash; ' . $taxonomy->labels->parent_item . ' &mdash;',
						)
					);
					?>
				</div>
				<button type="button" class="add-cat-submit"><?php esc_html_e( 'Add', 'press-this' ); ?></button>
			</div>
			<?php

		}
		?>
		<div class="categories-search-wrapper">
			<input id="categories-search" type="search" class="categories-search" placeholder="<?php esc_attr_e( 'Search categories by name', 'press-this' ); ?>">
			<label for="categories-search">
				<span class="dashicons dashicons-search"></span><span class="screen-reader-text"><?php esc_html_e( 'Search categories', 'press-this' ); ?></span>
			</label>
		</div>
		<div aria-label="<?php esc_attr_e( 'Categories', 'press-this' ); ?>">
			<ul class="categories-select">
				<?php
				wp_terms_checklist(
					$post->ID,
					array(
						'taxonomy'  => 'category',
						'list_only' => true,
					)
				);
				?>
			</ul>
		</div>
		<?php
	}

	/**
	 * Outputs the tags HTML.
	 *
	 * @since 1.0.0
	 *
	 * @param WP_Post $post Post object.
	 */
	public function tags_html( $post ) {
		$taxonomy              = get_taxonomy( 'post_tag' );
		$user_can_assign_terms = current_user_can( $taxonomy->cap->assign_terms );
		$esc_tags              = get_terms_to_edit( $post->ID, 'post_tag' );

		if ( ! $esc_tags || is_wp_error( $esc_tags ) ) {
			$esc_tags = '';
		}

		?>
		<div class="tagsdiv" id="post_tag">
			<div class="jaxtag">
			<input type="hidden" name="tax_input[post_tag]" class="the-tags" value="<?php echo esc_attr( $esc_tags ); ?>">
			<?php

			if ( $user_can_assign_terms ) {
				?>
				<div class="ajaxtag hide-if-no-js">
					<label class="screen-reader-text" for="new-tag-post_tag"><?php esc_html_e( 'Tags', 'press-this' ); ?></label>
					<p>
						<input type="text" id="new-tag-post_tag" name="newtag[post_tag]" class="newtag form-input-tip" size="16" autocomplete="off" value="" aria-describedby="new-tag-desc" />
						<button type="button" class="tagadd"><?php esc_html_e( 'Add', 'press-this' ); ?></button>
					</p>
				</div>
				<p class="howto" id="new-tag-desc">
					<?php echo esc_html( $taxonomy->labels->separate_items_with_commas ); ?>
				</p>
				<?php
			}

			?>
			</div>
			<div class="tagchecklist"></div>
		</div>
		<?php

		if ( $user_can_assign_terms ) {
			?>
			<button type="button" class="button-link tagcloud-link" id="link-post_tag" aria-expanded="false"><?php echo esc_html( $taxonomy->labels->choose_from_most_used ); ?></button>
			<?php
		}
	}

	/**
	 * Get a list of embeds with no duplicates.
	 *
	 * @since 1.0.0
	 *
	 * @param array $data The site's data.
	 * @return array Embeds selected to be available.
	 */
	public function get_embeds( $data ) {
		$selected_embeds = array();

		// Make sure to add the Pressed page if it's a valid oembed itself.
		if ( ! empty( $data['u'] ) && $this->limit_embed( $data['u'] ) ) {
			$data['_embeds'][] = $data['u'];
		}

		if ( ! empty( $data['_embeds'] ) ) {
			foreach ( $data['_embeds'] as $src ) {
				$prot_relative_src = preg_replace( '/^https?:/', '', $src );

				if ( in_array( $prot_relative_src, $this->embeds, true ) ) {
					continue;
				}

				$selected_embeds[] = $src;
				$this->embeds[]    = $prot_relative_src;
			}
		}

		return $selected_embeds;
	}

	/**
	 * Get a list of images with no duplicates.
	 *
	 * @since 1.0.0
	 *
	 * @param array $data The site's data.
	 * @return array
	 */
	public function get_images( $data ) {
		$selected_images = array();

		// Check for JSON-LD image first (higher quality source).
		if ( ! empty( $data['_jsonld']['image'] ) ) {
			$jsonld_img = $this->limit_img( $data['_jsonld']['image'] );
			if ( $jsonld_img && ! in_array( preg_replace( '/^https?:/', '', $jsonld_img ), $this->images, true ) ) {
				$selected_images[] = $jsonld_img;
				$this->images[]    = preg_replace( '/^https?:/', '', $jsonld_img );
			}
		}

		if ( ! empty( $data['_images'] ) ) {
			foreach ( $data['_images'] as $src ) {
				if ( false !== strpos( $src, 'gravatar.com' ) ) {
					$src = preg_replace( '%http://[\d]+\.gravatar\.com/%', 'https://secure.gravatar.com/', $src );
				}

				$prot_relative_src = preg_replace( '/^https?:/', '', $src );

				if ( in_array( $prot_relative_src, $this->images, true ) ||
					( false !== strpos( $src, 'avatar' ) && count( $this->images ) > 15 ) ) {
					// Skip: already selected or some type of avatar and we've already gathered more than 15 images.
					continue;
				}

				$selected_images[] = $src;
				$this->images[]    = $prot_relative_src;
			}
		}

		return $selected_images;
	}

	/**
	 * Gets the source page's canonical link, based on passed location and meta data.
	 *
	 * Enhanced in v2.0.1 to also check JSON-LD structured data and alternate canonical links.
	 *
	 * @since 1.0.0
	 * @since 2.0.1 Added JSON-LD and alternate canonical support.
	 *
	 * @param array $data The site's data.
	 * @return string Discovered canonical URL, or empty
	 */
	public function get_canonical_link( $data ) {
		$link = '';

		// Priority 1: Link rel="canonical".
		// Priority 2: JSON-LD canonical.
		// Priority 3: Alternate canonical (hreflang x-default).
		// Priority 4: Original URL.
		// Priority 5: Meta tags.
		if ( ! empty( $data['_links']['canonical'] ) ) {
			$link = $data['_links']['canonical'];
		} elseif ( ! empty( $data['_jsonld']['canonical'] ) ) {
			$link = $data['_jsonld']['canonical'];
		} elseif ( ! empty( $data['_links']['alternate_canonical'] ) ) {
			$link = $data['_links']['alternate_canonical'];
		} elseif ( ! empty( $data['u'] ) ) {
			$link = $data['u'];
		} elseif ( ! empty( $data['_meta'] ) ) {
			if ( ! empty( $data['_meta']['twitter:url'] ) ) {
				$link = $data['_meta']['twitter:url'];
			} elseif ( ! empty( $data['_meta']['og:url'] ) ) {
				$link = $data['_meta']['og:url'];
			}
		}

		if ( empty( $link ) && ! empty( $data['_links']['shortlink'] ) ) {
			$link = $data['_links']['shortlink'];
		}

		return $link;
	}

	/**
	 * Gets the source page's site name, based on passed meta data.
	 *
	 * @since 1.0.0
	 *
	 * @param array $data The site's data.
	 * @return string Discovered site name, or empty
	 */
	public function get_source_site_name( $data ) {
		$name = '';

		if ( ! empty( $data['_meta'] ) ) {
			if ( ! empty( $data['_meta']['og:site_name'] ) ) {
				$name = $data['_meta']['og:site_name'];
			} elseif ( ! empty( $data['_meta']['application-name'] ) ) {
				$name = $data['_meta']['application-name'];
			}
		}

		return $name;
	}

	/**
	 * Gets the source page's title, based on passed title and meta data.
	 *
	 * Enhanced in v2.0.1 to also check JSON-LD structured data.
	 *
	 * @since 1.0.0
	 * @since 2.0.1 Added JSON-LD headline support.
	 *
	 * @param array $data The site's data.
	 * @return string Discovered page title, or empty
	 */
	public function get_suggested_title( $data ) {
		$title = '';

		if ( ! empty( $data['t'] ) ) {
			$title = $data['t'];
		} elseif ( ! empty( $data['_jsonld']['headline'] ) ) {
			// JSON-LD headline is often cleaner than page title.
			$title = $data['_jsonld']['headline'];
		} elseif ( ! empty( $data['_meta'] ) ) {
			if ( ! empty( $data['_meta']['twitter:title'] ) ) {
				$title = $data['_meta']['twitter:title'];
			} elseif ( ! empty( $data['_meta']['og:title'] ) ) {
				$title = $data['_meta']['og:title'];
			} elseif ( ! empty( $data['_meta']['title'] ) ) {
				$title = $data['_meta']['title'];
			}
		}

		// Decode HTML entities (e.g., &#8211; to –) for proper display.
		if ( $title ) {
			$title = html_entity_decode( $title, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		}

		return $title;
	}

	/**
	 * Gets the source page's suggested content, based on passed data (description, selection, etc).
	 *
	 * Features a blockquoted excerpt, as well as content attribution, if any.
	 * Enhanced in v2.0.1 to also check JSON-LD structured data for description.
	 *
	 * All dynamic values are properly escaped:
	 * - URLs use esc_url()
	 * - Text content uses esc_html()
	 *
	 * @since 1.0.0
	 * @since 2.0.1 Added JSON-LD support and escaping for all dynamic content.
	 *
	 * @param array $data The site's data.
	 * @return string Discovered content, or empty
	 */
	public function get_suggested_content( $data ) {
		$content = '';
		$text    = '';

		if ( ! empty( $data['s'] ) ) {
			$text = $data['s'];
		} elseif ( ! empty( $data['_jsonld']['description'] ) ) {
			// JSON-LD description is often higher quality.
			$text = $data['_jsonld']['description'];
		} elseif ( ! empty( $data['_meta'] ) ) {
			if ( ! empty( $data['_meta']['twitter:description'] ) ) {
				$text = $data['_meta']['twitter:description'];
			} elseif ( ! empty( $data['_meta']['og:description'] ) ) {
				$text = $data['_meta']['og:description'];
			} elseif ( ! empty( $data['_meta']['description'] ) ) {
				$text = $data['_meta']['description'];
			}

			// If there is an ellipsis at the end, the description is very likely auto-generated. Better to ignore it.
			if ( $text && substr( $text, -3 ) === '...' ) {
				$text = '';
			}
		}

		$default_html = array(
			'quote' => '',
			'link'  => '',
			'embed' => '',
		);

		if ( ! empty( $data['u'] ) && $this->limit_embed( $data['u'] ) ) {
			// Use esc_url() for URL in embed block and esc_attr() for JSON attribute.
			$escaped_url = esc_url( $data['u'] );
			$attr_url    = esc_attr( $escaped_url );

			// Use Gutenberg embed block format.
			$default_html['embed'] = '<!-- wp:embed {"url":"' . $attr_url . '"} -->' . "\n" .
				'<figure class="wp-block-embed"><div class="wp-block-embed__wrapper">' . "\n" .
				$escaped_url . "\n" .
				'</div></figure>' . "\n" .
				'<!-- /wp:embed -->';

			if ( ! empty( $data['s'] ) ) {
				// If the user has selected some text, do quote it.
				$default_html['quote'] = '<!-- wp:quote -->' . "\n" .
					'<blockquote class="wp-block-quote"><!-- wp:paragraph -->' . "\n" .
					'<p>%1$s</p>' . "\n" .
					'<!-- /wp:paragraph --></blockquote>' . "\n" .
					'<!-- /wp:quote -->';
			}
		} else {
			// Use Gutenberg block format for quote and link.
			$default_html['quote'] = '<!-- wp:quote -->' . "\n" .
				'<blockquote class="wp-block-quote"><!-- wp:paragraph -->' . "\n" .
				'<p>%1$s</p>' . "\n" .
				'<!-- /wp:paragraph --></blockquote>' . "\n" .
				'<!-- /wp:quote -->';
			$default_html['link']  = '<!-- wp:paragraph -->' . "\n" .
				'<p>' . _x( 'Source:', 'Used in Press This to indicate where the content comes from.', 'press-this' ) .
				' <em><a href="%1$s">%2$s</a></em></p>' . "\n" .
				'<!-- /wp:paragraph -->';
		}

		/**
		 * Filters the default HTML tags used in the suggested content for the editor.
		 *
		 * The HTML strings use printf format. After filtering the content is added at the specified places with `sprintf()`.
		 *
		 * @since 1.0.0
		 *
		 * @param array $default_html Associative array with three possible keys:
		 *                                - 'quote' where %1$s is replaced with the site description or the selected content.
		 *                                - 'link' where %1$s is link href, %2$s is link text, usually the source page title.
		 *                                - 'embed' which contains an [embed] shortcode when the source page offers embeddable content.
		 * @param array $data         Associative array containing the data from the source page.
		 */
		$default_html = apply_filters( 'press_this_suggested_html', $default_html, $data );

		if ( ! empty( $default_html['embed'] ) ) {
			$content .= $default_html['embed'];
		}

		// Wrap suggested content in the specified HTML with proper escaping.
		if ( ! empty( $default_html['quote'] ) && $text ) {
			// Escape text content.
			$content .= sprintf( $default_html['quote'], esc_html( $text ) );
		}

		// Add source attribution with proper escaping.
		if ( ! empty( $default_html['link'] ) ) {
			$title = $this->get_suggested_title( $data );
			$url   = $this->get_canonical_link( $data );

			if ( ! $title ) {
				$title = $this->get_source_site_name( $data );
			}

			if ( $url && $title ) {
				// Escape URL and title.
				$content .= sprintf( $default_html['link'], esc_url( $url ), esc_html( $title ) );
			}
		}

		return $content;
	}

	/**
	 * Get the allowed blocks for the block editor.
	 *
	 * @since 2.0.1
	 *
	 * @return array Array of allowed block type names.
	 */
	public function get_allowed_blocks() {
		$default_blocks = array(
			'core/paragraph',
			'core/heading',
			'core/image',
			'core/quote',
			'core/list',
			'core/list-item',
			'core/embed',
			'core/post-featured-image',
		);

		/**
		 * Filters the allowed blocks in Press This.
		 *
		 * @since 2.0.1
		 *
		 * @param string[] $allowed_blocks Array of allowed block type names.
		 */
		return apply_filters( 'press_this_allowed_blocks', $default_blocks );
	}

	/**
	 * Suggest a post format based on content type.
	 *
	 * Automatically detects the most appropriate post format based on the
	 * bookmarklet data. The detection follows this priority order:
	 *
	 * 1. **Override filter**: If `press_this_post_format_override` returns a
	 *    non-empty value, that format is used immediately (bypasses all detection).
	 *
	 * 2. **Video format**: Suggested when embedded videos are detected from
	 *    YouTube, Vimeo, or Dailymotion, or when the source URL itself is
	 *    from one of these video platforms.
	 *
	 * 3. **Quote format**: Suggested when the user has selected text that is
	 *    longer than 50 characters and does not contain URLs. This indicates
	 *    the user likely wants to quote the selected passage.
	 *
	 * 4. **Link format**: Suggested when only a URL is provided with no
	 *    selected text, images, or embeds. This indicates a simple link share.
	 *
	 * 5. **Standard format**: Used when none of the above conditions are met.
	 *
	 * Note: The `press_this_default_post_format` filter is NOT applied here.
	 * It is passed separately to JavaScript to allow client-side detection
	 * to run before falling back to the default. The full priority order
	 * (including JS detection and default) is:
	 * override → PHP suggestion → JS detection → default → standard
	 *
	 * Available filters:
	 *
	 * - `press_this_post_format_override`: Force a format, bypassing all detection.
	 *   No arguments - works identically in PHP and JavaScript contexts.
	 *
	 *       // Always use 'aside' format regardless of content
	 *       add_filter( 'press_this_post_format_override', function() {
	 *           return 'aside';
	 *       } );
	 *
	 * - `press_this_default_post_format`: Set fallback when detection finds nothing.
	 *   No arguments - works identically in PHP and JavaScript contexts.
	 *   Applied in JS after both PHP and JS detection have run.
	 *
	 *       // Use 'link' format when no specific format is detected
	 *       add_filter( 'press_this_default_post_format', function() {
	 *           return 'link';
	 *       } );
	 *
	 * - `press_this_post_format_suggestion`: Modify the final suggested format.
	 *   Has access to $data for conditional logic (PHP context only).
	 *
	 *       // Force image format when images are present
	 *       add_filter( 'press_this_post_format_suggestion', function( $format, $data ) {
	 *           if ( ! empty( $data['_images'] ) ) {
	 *               return 'image';
	 *           }
	 *           return $format;
	 *       }, 10, 2 );
	 *
	 * @since 2.0.1
	 *
	 * @param array $data The site's data including:
	 *                    - 'u'       (string) Source URL.
	 *                    - 's'       (string) Selected text from the page.
	 *                    - '_images' (array)  Scraped image URLs.
	 *                    - '_embeds' (array)  Scraped embed URLs.
	 * @return string Suggested post format ('video', 'quote', 'link') or empty string for standard.
	 */
	public function get_suggested_post_format( $data ) {
		/**
		 * Filters to force a specific post format, bypassing all detection logic.
		 *
		 * Use this filter when you want to always use a specific post format
		 * regardless of the content being shared. Return a non-empty string
		 * to override, or empty string to continue with detection logic.
		 *
		 * Note: This filter intentionally has no arguments to ensure consistent
		 * behavior between server-side (PHP) and client-side (JavaScript) contexts.
		 * For conditional logic based on content, use `press_this_post_format_suggestion`.
		 *
		 * @since 2.0.1
		 *
		 * @param string $format Empty string by default. Return a format to override.
		 */
		$override_format = apply_filters( 'press_this_post_format_override', '' );
		if ( ! empty( $override_format ) ) {
			return $override_format;
		}

		$suggested_format = '';

		// Priority 1: Check for video embeds from major video platforms.
		// Detects YouTube, Vimeo, and Dailymotion URLs in scraped embeds.
		if ( ! empty( $data['_embeds'] ) ) {
			foreach ( $data['_embeds'] as $embed ) {
				if ( preg_match( '/(youtube\.com|vimeo\.com|dailymotion\.com)/i', $embed ) ) {
					$suggested_format = 'video';
					break;
				}
			}
		}

		// Priority 1b: Check if the source URL itself is from a video platform.
		// Handles cases where user bookmarks a video page directly.
		if ( empty( $suggested_format ) && ! empty( $data['u'] ) ) {
			if ( preg_match( '/(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)/i', $data['u'] ) ) {
				$suggested_format = 'video';
			}
		}

		// Priority 2: Check for quote-worthy selected text.
		// Text selections over 50 characters without URLs suggest the user wants to quote.
		if ( empty( $suggested_format ) && ! empty( $data['s'] ) ) {
			if ( strlen( $data['s'] ) > 50 && strpos( $data['s'], 'http' ) === false ) {
				$suggested_format = 'quote';
			}
		}

		// Priority 3: Check for link-only content.
		// When only a URL is provided with no other content, suggest link format.
		if ( empty( $suggested_format ) && ! empty( $data['u'] ) && empty( $data['s'] ) && empty( $data['_images'] ) && empty( $data['_embeds'] ) ) {
			$suggested_format = 'link';
		}

		// Note: The default format filter is NOT applied here.
		// It's passed separately via postFormatDefault to allow JS detection
		// to run before falling back to the default. See html() method.

		/**
		 * Filters the suggested post format for Press This.
		 *
		 * @since 2.0.1
		 *
		 * @param string $suggested_format The suggested post format.
		 * @param array  $data             The site's data.
		 */
		return apply_filters( 'press_this_post_format_suggestion', $suggested_format, $data );
	}

	/**
	 * Get editor settings for the block editor.
	 *
	 * @since 2.0.1
	 *
	 * @param array $data The site's data.
	 * @return array Editor settings.
	 */
	public function get_editor_settings( $data = array() ) {
		$allowed_blocks = $this->get_allowed_blocks();

		// Get supported post formats.
		$post_formats = array();
		if ( current_theme_supports( 'post-formats' ) && post_type_supports( 'post', 'post-formats' ) ) {
			$theme_formats = get_theme_support( 'post-formats' );
			if ( is_array( $theme_formats[0] ) ) {
				$post_formats = $theme_formats[0];
			}
		}

		$settings = array(
			'allowedBlocks'        => $allowed_blocks,
			'hasFixedToolbar'      => true,
			'isRTL'                => is_rtl(),
			'siteUrl'              => home_url(),
			'ajaxUrl'              => admin_url( 'admin-ajax.php' ),
			'supportedPostFormats' => $post_formats,
			'suggestedPostFormat'  => $this->get_suggested_post_format( $data ),
			'canPublish'           => current_user_can( 'publish_posts' ),
			'canUploadFiles'       => current_user_can( 'upload_files' ),
		);

		return $settings;
	}

	/**
	 * Serves the app's base HTML - minimal shell for React app.
	 *
	 * All UI is rendered by React. PHP only provides:
	 * - HTML document shell
	 * - Initial data via window.pressThisData
	 * - Asset enqueueing
	 *
	 * @since 1.0.0
	 * @since 2.0.1 Converted to minimal shell with Gutenberg block editor - all UI rendered by React.
	 *
	 * @global WP_Locale $wp_locale
	 */
	public function html() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing, WordPress.Security.NonceVerification.Recommended -- Bookmarklet data from external sites cannot include nonces.
		global $wp_locale;

		$wp_version = get_bloginfo( 'version' );

		// Get data, new (POST) and old (GET).
		$data = $this->merge_or_fetch_data();

		// Only generate content from PHP if:
		// 1. It's a POST request (bookmarklet submitted data), OR
		// 2. Proxy is disabled (can't auto-scan, so use GET params as fallback), OR
		// 3. Selection was provided via GET (cross-protocol bookmarklet)
		// For GET requests with proxy enabled and no selection, JavaScript will auto-scan.
		$is_post_request   = 'POST' === $_SERVER['REQUEST_METHOD'];
		$proxy_enabled     = press_this_is_proxy_enabled();
		$has_get_selection = ! empty( $data['s'] ) && 'GET' === $_SERVER['REQUEST_METHOD'];

		if ( $is_post_request || ! $proxy_enabled || $has_get_selection ) {
			$post_title   = $this->get_suggested_title( $data );
			$post_content = $this->get_suggested_content( $data );
		} else {
			// GET request with proxy enabled and no selection: let JavaScript auto-scan generate content.
			// Only use title from URL param as a placeholder (can be overwritten by scan).
			// Decode HTML entities for proper display.
			$post_title   = ! empty( $data['t'] ) ? html_entity_decode( $data['t'], ENT_QUOTES | ENT_HTML5, 'UTF-8' ) : '';
			$post_content = '';
		}

		// Get site settings array/data.
		$site_settings = $this->site_settings();

		// Pass the images and embeds.
		$images = $this->get_images( $data );
		$embeds = $this->get_embeds( $data );

		// Check if this is a legacy bookmarklet (version < current VERSION).
		$is_legacy_bookmarklet = ! empty( $data['v'] ) && (int) $data['v'] < self::VERSION;

		// Check if this is postMessage mode (bookmarklet v11+).
		// In this mode, the bookmarklet opens Press This via GET, then sends data via postMessage.
		// This works around SameSite cookie restrictions that block cross-site POST requests.
		$is_post_message_mode = ! empty( $_GET['pm'] ) && '1' === $_GET['pm'];

		// Create a draft post for the editor.
		/**
		 * Filters the post type used when creating a new Press This post.
		 *
		 * This allows other plugins to change the default post type from 'post'
		 * to a custom post type (e.g., 'jetpack-social-note' for microblogging).
		 *
		 * @since 2.0.1
		 *
		 * @param string $post_type The post type to create. Default 'post'.
		 * @param array  $data      The scraped data from the source URL.
		 */
		$post_type = apply_filters( 'press_this_post_type', 'post', $data );
		$post      = get_default_post_to_edit( $post_type, true );
		$post_ID   = (int) $post->ID;

		// Get taxonomy capabilities.
		$categories_tax  = get_taxonomy( 'category' );
		$tag_tax         = get_taxonomy( 'post_tag' );
		$can_assign_cats = current_user_can( $categories_tax->cap->assign_terms );
		$can_edit_cats   = current_user_can( $categories_tax->cap->edit_terms );
		$can_assign_tags = current_user_can( $tag_tax->cap->assign_terms );

		// Get supported post formats.
		$post_formats = array();
		if ( current_theme_supports( 'post-formats' ) && post_type_supports( $post_type, 'post-formats' ) ) {
			$theme_formats = get_theme_support( 'post-formats' );
			if ( is_array( $theme_formats[0] ) ) {
				$post_formats = $theme_formats[0];
			}
		}

		// Get all categories for the React app.
		$categories = get_categories(
			array(
				'hide_empty' => false,
				'orderby'    => 'name',
				'order'      => 'ASC',
			)
		);

		$categories_data = array();
		foreach ( $categories as $cat ) {
			$categories_data[] = array(
				'id'     => $cat->term_id,
				'name'   => $cat->name,
				'parent' => $cat->parent,
				'slug'   => $cat->slug,
			);
		}

		// Comprehensive data object for React app.
		$press_this_data = array(
			// Post data.
			'postId'              => $post_ID,
			'title'               => $post_title,
			'content'             => $post_content,
			'nonce'               => wp_create_nonce( 'update-post_' . $post_ID ),
			'categoryNonce'       => wp_create_nonce( 'add-category' ),

			// Scraped media.
			'images'              => $images,
			'embeds'              => $embeds,
			'sourceUrl'           => ! empty( $data['u'] ) ? $data['u'] : '',

			// Site info.
			// Decode HTML entities for proper display (e.g., &#8211; to –).
			'siteName'            => html_entity_decode( get_bloginfo( 'name', 'display' ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
			'siteUrl'             => home_url( '/' ),
			'ajaxUrl'             => admin_url( 'admin-ajax.php' ),
			'restUrl'             => rest_url( 'press-this/v1/' ),
			'restNonce'           => wp_create_nonce( 'wp_rest' ),

			// User capabilities.
			'canPublish'          => current_user_can( 'publish_posts' ),
			'canUploadFiles'      => current_user_can( 'upload_files' ),
			'canAssignCategories' => $can_assign_cats,
			'canEditCategories'   => $can_edit_cats,
			'canAssignTags'       => $can_assign_tags,

			// Post format support.
			'postFormats'         => $post_formats,
			'suggestedFormat'     => $this->get_suggested_post_format( $data ),

			// Post format filter values for JS context.
			// These are static values (no arguments) that work identically in PHP and JS.
			// Override bypasses all detection; default is used as fallback after JS detection.
			// Priority: override → suggestedFormat → JS detection → default → standard.
			/**
			 * Filters to force a specific post format, bypassing all detection logic.
			 *
			 * @since 2.0.1
			 *
			 * @param string $format Empty string by default. Return a format to override.
			 */
			'postFormatOverride'  => apply_filters( 'press_this_post_format_override', '' ),
			/**
			 * Filters the default post format when no format is detected.
			 *
			 * Applied after both PHP and JS detection have run and found nothing.
			 *
			 * @since 2.0.1
			 *
			 * @param string $default_format Empty string by default (standard format).
			 */
			'postFormatDefault'   => apply_filters( 'press_this_default_post_format', '' ),

			// Categories data.
			'categories'          => $categories_data,

			// Bookmarklet version info.
			// Only set bookmarkletVersion if we have actual POST data from bookmarklet.
			// The 'v' param in GET URL alone doesn't mean content was provided.
			'bookmarkletVersion'  => ! empty( $_POST['pt_version'] ) || ( ! empty( $data['v'] ) && 'POST' === $_SERVER['REQUEST_METHOD'] ) ? $data['v'] : '',
			'isLegacyBookmarklet' => $is_legacy_bookmarklet,
			'currentVersion'      => self::VERSION,

			// Config.
			'redirInParent'       => $site_settings['redirInParent'],
			'isRTL'               => is_rtl(),

			// Allowed blocks.
			'allowedBlocks'       => $this->get_allowed_blocks(),

			// URL proxy feature (for Direct Access Mode).
			'proxyEnabled'        => press_this_is_proxy_enabled(),

			// PostMessage mode (bookmarklet v11+).
			// When true, the app waits for scraped data via postMessage from the opener.
			'postMessageMode'     => $is_post_message_mode,
		);

		if ( ! headers_sent() ) {
			header( 'Content-Type: ' . get_option( 'html_type' ) . '; charset=' . get_option( 'blog_charset' ) );
		}

		?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta http-equiv="Content-Type" content="<?php echo esc_attr( get_bloginfo( 'html_type' ) ); ?>; charset=<?php echo esc_attr( get_option( 'blog_charset' ) ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title><?php esc_html_e( 'Press This!', 'press-this' ); ?></title>

	<script>
		window.pressThisData = <?php echo wp_json_encode( $press_this_data ); ?>;
	</script>

	<script type="text/javascript">
		var ajaxurl = '<?php echo esc_js( admin_url( 'admin-ajax.php', 'relative' ) ); ?>',
			pagenow = 'press-this',
			typenow = 'post',
			adminpage = 'press-this-php',
			thousandsSeparator = '<?php echo esc_js( addslashes( $wp_locale->number_format['thousands_sep'] ) ); ?>',
			decimalPoint = '<?php echo esc_js( addslashes( $wp_locale->number_format['decimal_point'] ) ); ?>',
			isRtl = <?php echo (int) is_rtl(); ?>;
	</script>

		<?php
		// Enqueue WordPress media for upload functionality.
		wp_enqueue_media( array( 'post' => $post_ID ) );

		// Enqueue block editor dependencies.
		$this->enqueue_block_editor_assets( $post_ID, $post_title, $post_content, $data );

		/** This action is documented in wp-admin/admin-header.php */
		do_action( 'admin_enqueue_scripts', 'press-this.php' );

		/** This action is documented in wp-admin/admin-header.php */
		do_action( 'admin_print_styles-press-this.php' ); // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores

		/** This action is documented in wp-admin/admin-header.php */
		do_action( 'admin_print_styles' );

		/** This action is documented in wp-admin/admin-header.php */
		do_action( 'admin_print_scripts-press-this.php' ); // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores

		/** This action is documented in wp-admin/admin-header.php */
		do_action( 'admin_print_scripts' );

		/** This action is documented in wp-admin/admin-header.php */
		do_action( 'admin_head-press-this.php' ); // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores

		/** This action is documented in wp-admin/admin-header.php */
		do_action( 'admin_head' );
		?>
</head>
		<?php

		$admin_body_class  = 'press-this press-this-gutenberg';
		$admin_body_class .= ( is_rtl() ) ? ' rtl' : '';
		$admin_body_class .= ' branch-' . str_replace( array( '.', ',' ), '-', floatval( $wp_version ) );
		$admin_body_class .= ' version-' . str_replace( '.', '-', preg_replace( '/^([.0-9]+).*/', '$1', $wp_version ) );
		$admin_body_class .= ' admin-color-' . sanitize_html_class( get_user_option( 'admin_color' ), 'fresh' );
		$admin_body_class .= ' locale-' . sanitize_html_class( strtolower( str_replace( '_', '-', get_user_locale() ) ) );

		/** This filter is documented in wp-admin/admin-header.php */
		$admin_body_classes = apply_filters( 'admin_body_class', '' );

		?>
<body class="wp-admin wp-core-ui <?php echo esc_attr( $admin_body_classes . ' ' . $admin_body_class ); ?>">
	<!-- React app mount point - all UI rendered by React -->
	<div id="press-this-app"></div>

		<?php
		/** This action is documented in wp-admin/admin-footer.php */
		do_action( 'admin_footer', '' );

		/** This action is documented in wp-admin/admin-footer.php */
		do_action( 'admin_print_footer_scripts-press-this.php' ); // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores

		/** This action is documented in wp-admin/admin-footer.php */
		do_action( 'admin_print_footer_scripts' );

		/** This action is documented in wp-admin/admin-footer.php */
		do_action( 'admin_footer-press-this.php' ); // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores
		?>
</body>
</html>
		<?php
		// phpcs:enable WordPress.Security.NonceVerification.Missing, WordPress.Security.NonceVerification.Recommended
		die();
	}

	/**
	 * Enqueue block editor assets for Press This.
	 *
	 * @since 2.0.1
	 *
	 * @param int    $post_id      Post ID.
	 * @param string $post_title   Post title.
	 * @param string $post_content Post content.
	 * @param array  $data         Scraped data from bookmarklet.
	 */
	public function enqueue_block_editor_assets( $post_id, $post_title, $post_content, $data = array() ) {
		// Include the assets class.
		require_once __DIR__ . '/includes/class-press-this-assets.php';

		$assets = new Press_This_Assets( __FILE__ );
		$assets->register_assets();

		// Get editor settings.
		$editor_settings = $this->get_editor_settings( $data );

		// Pass all necessary data to JavaScript.
		$editor_data = array(
			'postId'        => $post_id,
			'title'         => $post_title,
			'content'       => $post_content,
			'images'        => $this->get_images( $data ),
			'embeds'        => $this->get_embeds( $data ),
			'url'           => ! empty( $data['u'] ) ? $data['u'] : '',
			'nonce'         => wp_create_nonce( 'update-post_' . $post_id ),
			'categoryNonce' => wp_create_nonce( 'add-category' ),
		);

		$assets->enqueue_editor_assets( $editor_data );

		// Localize editor settings separately.
		wp_localize_script(
			'press-this-editor',
			'pressThisEditorSettings',
			$editor_settings
		);

		// Localize i18n strings.
		wp_localize_script(
			'press-this-editor',
			'pressThisL10n',
			array(
				'newPost'           => __( 'Title', 'press-this' ),
				'serverError'       => __( 'Connection lost or the server is busy. Please try again later.', 'press-this' ),
				'saveAlert'         => __( 'The changes you made will be lost if you navigate away from this page.', 'press-this' ),
				/* translators: %d: nth embed found in a post */
				'suggestedEmbedAlt' => __( 'Suggested embed #%d', 'press-this' ),
				/* translators: %d: nth image found in a post */
				'suggestedImgAlt'   => __( 'Suggested image #%d', 'press-this' ),
				'publish'           => __( 'Publish', 'press-this' ),
				'submitForReview'   => __( 'Submit for Review', 'press-this' ),
				'saving'            => __( 'Saving&hellip;', 'press-this' ),
				'saveDraft'         => __( 'Save Draft', 'press-this' ),
				'saved'             => __( 'Saved', 'press-this' ),
				'updateBookmarklet' => __( 'Your bookmarklet is out of date. Please update it for the best experience.', 'press-this' ),
			)
		);

		// Enqueue legacy styles for backward compatibility with existing UI.
		if ( is_rtl() ) {
			wp_enqueue_style( 'press-this-rtl', plugins_url( 'assets/press-this-rtl.css', __FILE__ ), array( 'buttons' ), PRESS_THIS__VERSION );
		} else {
			wp_enqueue_style( 'press-this', plugins_url( 'assets/press-this.css', __FILE__ ), array( 'buttons' ), PRESS_THIS__VERSION );
		}
	}
}
