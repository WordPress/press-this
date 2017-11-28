<?php
/**
 * Press This
 *
 * Plugin Name: Press This
 * Plugin URI:  https://wordpress.org
 * Description: A little tool that lets you grab bits of the web and create new posts with ease.
 * Version:     1.1.0
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
	include_once( plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php' );
	$wp_press_this = new WP_Press_This_Plugin();
	$wp_press_this->save_post();
}

/**
 * Ajax handler for creating new category from Press This.
 *
 * @since 1.0.0
 */
function wp_ajax_press_this_plugin_add_category() {
	include_once( plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php' );
	$wp_press_this = new WP_Press_This_Plugin();
	$wp_press_this->add_category();
}

/**
 * Adds metabox on wp-admin/tools.php
 *
 * @since 1.0.0
 */
function press_this_tool_box() {
	if ( current_user_can('edit_posts') ) { ?>
		<div class="card pressthis">
			<h2><?php _e('Press This', 'press-this') ?></h2>
			<p><?php _e( 'Press This is a little tool that lets you grab bits of the web and create new posts with ease.', 'press-this' ); ?>
				<?php _e( 'It will even allow you to choose from images or videos included on the page and use them in your post.', 'press-this' ); ?>
				<?php _e( 'Use Press This as a quick and lightweight way to highlight another page on the web.', 'press-this' ); ?>
			</p>

			<form>
				<h3><?php _e( 'Install Press This', 'press-this' ); ?></h3>
				<h4><?php _e( 'Direct link (best for mobile)', 'press-this' ); ?></h4>
				<p><a href="<?php echo htmlspecialchars( admin_url( 'press-this.php' ) ); ?>"><?php _e( 'Open Press This', 'press-this' ); ?></a>
					<?php _e( 'then add it to your device&#8217;s bookmarks or home screen.', 'press-this' ); ?>
				</p>

				<h4><?php _e( 'Bookmarklet', 'press-this' ); ?></h4>
				<p><?php _e( 'Drag the bookmarklet below to your bookmarks bar. Then, when you&#8217;re on a page you want to share, simply &#8220;press&#8221; it.', 'press-this' ); ?></p>

				<p class="pressthis-bookmarklet-wrapper">
					<a class="pressthis-bookmarklet" onclick="return false;" href="<?php echo htmlspecialchars( press_this_get_shortcut_link() ); ?>"><span><?php _e( 'Press This', 'press-this' ); ?></span></a>
					<button type="button" class="button pressthis-js-toggle js-show-pressthis-code-wrap" aria-expanded="false" aria-controls="pressthis-code-wrap">
						<span class="dashicons dashicons-clipboard"></span>
						<span class="screen-reader-text"><?php _e( 'Copy &#8220;Press This&#8221; bookmarklet code', 'press-this' ) ?></span>
					</button>
				</p>

				<div class="hidden js-pressthis-code-wrap clear" id="pressthis-code-wrap">
					<p id="pressthis-code-desc">
						<?php _e( 'If you can&#8217;t drag the bookmarklet to your bookmarks, copy the following code and create a new bookmark. Paste the code into the new bookmark&#8217;s URL field.', 'press-this' ) ?>
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
 * @since  1.1.0 Added to Press This plugin
 *
 * @global bool $is_IE Whether the browser matches an Internet Explorer user agent.
 */
function press_this_get_shortcut_link() {
	global $is_IE;

	include_once( plugin_dir_path( __FILE__ ) . 'class-wp-press-this-plugin.php' );

	$link = '';

	if ( $is_IE ) {
		/*
		 * Return the old/shorter bookmarklet code for MSIE 8 and lower,
		 * since they only support a max length of ~2000 characters for
		 * bookmark[let] URLs, which is way to small for our smarter one.
		 * Do update the version number so users do not get the "upgrade your
		 * bookmarklet" notice when using PT in those browsers.
		 */
		$ua = $_SERVER['HTTP_USER_AGENT'];

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
		$src = @file_get_contents( plugin_dir_path( __FILE__ ) . 'assets/bookmarklet.min.js' );

		if ( $src ) {
			$url = wp_json_encode( admin_url( 'press-this.php' ) . '?v=' . WP_Press_This_Plugin::VERSION );
			$link = 'javascript:' . str_replace( 'window.pt_url', $url, $src );
		}
	}

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
