<?php
/**
 * Press This
 *
 * Plugin Name: Press This
 * Plugin URI:  https://wordpress.org
 * Description: A little tool that lets you grab bits of the web and create new posts with ease.
 * Version:     0.2.0
 * Author:      WordPress Contributors
 * Author URI:  https://wordpress.org
 * License:     GPL-2.0+
 * License URI: http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 * Text Domain: press-this
 * Domain Path: /languages
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

add_action( 'wp_ajax_press-this-plugin-save-post', 'wp_ajax_press_this_plugin_save_post');
add_action( 'wp_ajax_press-this-plugin-add-category', 'wp_ajax_press_this_plugin_add_category' );
add_action( 'tool_box', 'press_this_tool_box' );

 /**
 * Ajax handler for saving a post from Press This.
 *
 * @since 1.0.0
 */
function wp_ajax_press_this_plugin_save_post() {
	include( plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php' );
	$wp_press_this = new WP_Press_This_Plugin();
	$wp_press_this->save_post();
}

/**
 * Ajax handler for creating new category from Press This.
 *
 * @since 1.0.0
 */
function wp_ajax_press_this_plugin_add_category() {
	include( plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php' );
	$wp_press_this = new WP_Press_This_Plugin();
	$wp_press_this->add_category();
}

function press_this_tool_box() {
	if ( current_user_can('edit_posts') ) { ?>
		<div class="card pressthis">
			<h2><?php _e('Press This') ?></h2>
			<p><?php _e( 'Press This is a little tool that lets you grab bits of the web and create new posts with ease.' ); ?>
				<?php _e( 'It will even allow you to choose from images or videos included on the page and use them in your post.' ); ?>
				<?php _e( 'Use Press This as a quick and lightweight way to highlight another page on the web.' ); ?></p>

			<p><a href="<?php echo htmlspecialchars( admin_url( 'press-this.php' ) ); ?>"><?php _e( 'Open Press This' ); ?></a>
				<?php _e( 'then add it to your device&#8217;s bookmarks or home screen.' ); ?></p>
		</div>
	<?php }
}

/**
* Filter Press This posts before returning from the API.
*
*
* @param WP_REST_Response  $response   The response object.
* @param WP_Post           $post       The original post.
* @param WP_REST_Request   $request    Request used to generate the response.
*/
function press_this_prepare_press_this_response( $response, $post, $request ) {

	$attributes = $request->get_attributes();
	$params = $request->get_query_params();

	// Only modify Quick Press responses.
	if ( ! isset( $params['press-this-post-save'] ) ) {
		return $response;
	}

	// Match the existing ajax handler logic.
	$forceRedirect = false;

	if ( 'publish' === get_post_status( $post->ID ) ) {
		$redirect = get_post_permalink( $post->ID );
	} elseif ( isset( $params['pt-force-redirect'] ) && $params['pt-force-redirect'] === 'true' ) {
		$forceRedirect = true;
		$redirect = get_edit_post_link( $post->ID, 'js' );
	} else {
		$redirect = false;
	}

	/**
	 * Filters the URL to redirect to when Press This saves.
	 *
	 * @since 4.2.0
	 *
	 * @param string $url      Redirect URL. If `$status` is 'publish', this will be the post permalink.
	 *                         Otherwise, the default is false resulting in no redirect.
	 * @param int    $post->ID Post ID.
	 * @param string $status   Post status.
	 */
	$redirect = apply_filters( 'press_this_save_redirect', $redirect, $post->ID, $post->post_status );

	if ( $redirect ) {
		$response->data['redirect'] = $redirect;
		$response->data['force'] = $forceRedirect;
	} else {
		$response->data['postSaved'] = true;
	}

	return $response;
}
add_filter( 'rest_prepare_post', 'press_this_prepare_press_this_response', 10, 3 );
