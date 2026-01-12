<?php
/**
 * Enable Press This URL Proxy for Testing
 *
 * This mu-plugin enables the URL proxy feature for Direct Access Mode.
 * Only use this in development/testing environments.
 *
 * @package Press_This
 */

// Enable the URL proxy feature.
add_filter( 'press_this_enable_url_proxy', '__return_true' );
