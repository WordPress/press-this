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

// Load the plugin.
require dirname( dirname( __DIR__ ) ) . '/press-this-plugin.php';
