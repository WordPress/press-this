<?php
/**
 * Press This
 *
 * Plugin Name: Press This
 * Plugin URI:  https://wordpress.org
 * Description: A little tool that lets you grab bits of the web and create new posts with ease.
 * Version:     1.0.0
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
			<h2><?php _e('Press This', 'press-this') ?></h2>
			<p><?php _e( 'Press This is a little tool that lets you grab bits of the web and create new posts with ease.', 'press-this' ); ?>
				<?php _e( 'It will even allow you to choose from images or videos included on the page and use them in your post.', 'press-this' ); ?>
				<?php _e( 'Use Press This as a quick and lightweight way to highlight another page on the web.', 'press-this' ); ?></p>

			<p><a href="<?php echo htmlspecialchars( admin_url( 'press-this.php' ) ); ?>"><?php _e( 'Open Press This', 'press-this' ); ?></a>
				<?php _e( 'then add it to your device&#8217;s bookmarks or home screen.', 'press-this' ); ?></p>
		</div>
	<?php }
}
