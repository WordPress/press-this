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
				<?php _e( 'Use Press This as a quick and lightweight way to highlight another page on the web.', 'press-this' ); ?>
			</p>

			<form>
				<h3><?php _e( 'Install Press This' ); ?></h3>
				<h4><?php _e( 'Direct link (best for mobile)' ); ?></h4>
				<p><a href="<?php echo htmlspecialchars( admin_url( 'press-this.php' ) ); ?>"><?php _e( 'Open Press This', 'press-this' ); ?></a>
					<?php _e( 'then add it to your device&#8217;s bookmarks or home screen.', 'press-this' ); ?>
				</p>

				<h4><?php _e( 'Bookmarklet' ); ?></h4>
				<p><?php _e( 'Drag the bookmarklet below to your bookmarks bar. Then, when you&#8217;re on a page you want to share, simply &#8220;press&#8221; it.' ); ?></p>

				<p class="pressthis-bookmarklet-wrapper">
					<a class="pressthis-bookmarklet" onclick="return false;" href="<?php echo htmlspecialchars( press_this_get_shortcut_link() ); ?>"><span><?php _e( 'Press This' ); ?></span></a>
					<button type="button" class="button pressthis-js-toggle js-show-pressthis-code-wrap" aria-expanded="false" aria-controls="pressthis-code-wrap">
						<span class="dashicons dashicons-clipboard"></span>
						<span class="screen-reader-text"><?php _e( 'Copy &#8220;Press This&#8221; bookmarklet code' ) ?></span>
					</button>
				</p>

				<div class="hidden js-pressthis-code-wrap clear" id="pressthis-code-wrap">
					<p id="pressthis-code-desc">
						<?php _e( 'If you can&#8217;t drag the bookmarklet to your bookmarks, copy the following code and create a new bookmark. Paste the code into the new bookmark&#8217;s URL field.' ) ?>
					</p>

					<p>
						<textarea class="js-pressthis-code" rows="5" cols="120" readonly="readonly" aria-labelledby="pressthis-code-desc"><?php echo htmlspecialchars( press_this_get_shortcut_link() ); ?></textarea>
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
	<?php }
}

/**
 * Retrieves the Press This bookmarklet link.
 *
 * @since Core/2.6.0
 * @since  1.1.0 Bookmarklet code directly in this function.
 *
 */
function press_this_get_shortcut_link() {
	include( plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php' );

	$url = wp_json_encode( admin_url( 'press-this.php' ) . '?v=' . WP_Press_This_Plugin::VERSION );

	// Source can be found in assets/bookmarket.js
	$link = 'javascript:(function(a,b,c,d){var e,f=a.encodeURIComponent;d&&(/^https?:/.test(c)&&
		(d+="&u="+f(c)),a.getSelection?e=a.getSelection()+"":b.getSelection?e=b.getSelection()+"":
		b.selection&&(e=b.selection.createRange().text||""),b.title&&(d+="&t="+f(b.title.substr(0,256))),
		e&&(d+="&s="+f(e.substr(0,512))),top.location.href=d+"&"+(new Date).getTime())})
		(window,document,top.location.href,' . $url . ');';

	$link = str_replace( array( "\r", "\n", "\t" ),  '', $link );

	/**
	 * Filters the Press This bookmarklet link.
	 *
	 * @since 2.6.0
	 *
	 * @param string $link The Press This bookmarklet link.
	 */
	return apply_filters( 'shortcut_link', $link );
}
