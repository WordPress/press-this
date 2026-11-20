/**
 * REST API URL utilities.
 *
 * @package
 */

/**
 * Build the WordPress REST API base URL for core endpoints.
 *
 * Handles both pretty permalinks (/wp-json/) and index.php?rest_route= formats.
 *
 * @param {string} pressThisRestUrl The Press This REST URL (e.g., /wp-json/press-this/v1/ or index.php?rest_route=/press-this/v1/).
 * @return {string} The base URL for WordPress core REST endpoints.
 */
export function getWpRestBaseUrl( pressThisRestUrl ) {
	// Check if using index.php?rest_route= format.
	if ( pressThisRestUrl.includes( 'rest_route=' ) ) {
		// Extract the base URL up to and including rest_route=.
		const match = pressThisRestUrl.match( /^(.*[?&]rest_route=)/ );
		if ( match ) {
			return match[ 1 ] + '/';
		}
	}

	// Pretty permalinks format - replace the namespace.
	return pressThisRestUrl.replace( /press-this\/v1\/$/, '' );
}
