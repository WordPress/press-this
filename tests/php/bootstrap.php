<?php
/**
 * PHPUnit bootstrap file for Press This plugin tests.
 *
 * Uses WorDBless for database-less WordPress testing.
 *
 * @package Press_This_Plugin
 */

// Load Composer autoloader.
require_once dirname( dirname( __DIR__ ) ) . '/vendor/autoload.php';

// Define ABSPATH to point to where WordPress is installed.
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( dirname( __DIR__ ) ) . '/wordpress/' );
}

// Initialize WorDBless.
\WorDBless\Load::load();

// Define DOING_AJAX to ensure wp_send_json uses wp_die() instead of die().
if ( ! defined( 'DOING_AJAX' ) ) {
	define( 'DOING_AJAX', true );
}

/**
 * Custom exception for wp_die() calls in tests.
 */
class WPDieException extends Exception {}

/**
 * Custom wp_die handler that throws an exception instead of terminating.
 * This allows tests to catch wp_die() calls.
 *
 * @param string|WP_Error $message Error message or WP_Error object.
 * @param string          $title   Error title.
 * @param array           $args    Arguments.
 * @throws WPDieException Always throws to prevent script termination.
 */
function press_this_test_wp_die_handler( $message, $title = '', $args = array() ) {
	if ( is_wp_error( $message ) ) {
		$message = $message->get_error_message();
	}
	throw new WPDieException( $message );
}

// Set up the custom wp_die handler for tests.
add_filter( 'wp_die_handler', function() {
	return 'press_this_test_wp_die_handler';
} );

// Also handle AJAX requests.
add_filter( 'wp_die_ajax_handler', function() {
	return 'press_this_test_wp_die_handler';
} );

add_filter( 'wp_die_json_handler', function() {
	return 'press_this_test_wp_die_handler';
} );

// Load the plugin.
require dirname( dirname( __DIR__ ) ) . '/press-this-plugin.php';
