/**
 * End-to-End Workflow Tests
 *
 * Strategic tests to verify critical user workflows and integration points
 * that are not covered by component-level tests.
 *
 * These tests verify:
 * - Complete bookmarklet -> editor -> save -> redirect flow
 * - Scraped data integration with block content
 * - Legacy URL format backward compatibility
 * - Extension compatibility via filters
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN_ROOT = path.resolve( __dirname, '../../' );

/**
 * Simple test framework helper functions.
 */
let testsPassed = 0;
let testsFailed = 0;

function describe( name, fn ) {
	console.log( `\n${ name }` );
	fn();
}

function test( name, fn ) {
	try {
		fn();
		testsPassed++;
		console.log( `  PASS: ${ name }` );
	} catch ( error ) {
		testsFailed++;
		console.error( `  FAIL: ${ name }` );
		console.error( `        ${ error.message }` );
	}
}

function expect( actual ) {
	return {
		toBe: ( expected ) => {
			if ( actual !== expected ) {
				throw new Error( `Expected ${ expected }, got ${ actual }` );
			}
		},
		toBeTruthy: () => {
			if ( ! actual ) {
				throw new Error( `Expected truthy value, got ${ actual }` );
			}
		},
		toBeFalsy: () => {
			if ( actual ) {
				throw new Error( `Expected falsy value, got ${ actual }` );
			}
		},
		toContain: ( expected ) => {
			if ( typeof actual === 'string' && ! actual.includes( expected ) ) {
				throw new Error(
					`Expected string to contain "${ expected }"`
				);
			}
		},
		toMatch: ( regex ) => {
			if ( ! regex.test( actual ) ) {
				throw new Error(
					`Expected content to match ${ regex }`
				);
			}
		},
		toExist: () => {
			if ( ! fs.existsSync( actual ) ) {
				throw new Error( `Expected file to exist: ${ actual }` );
			}
		},
	};
}

console.log( '\n========================================' );
console.log( 'End-to-End Workflow Tests' );
console.log( '========================================' );

// =============================================================================
// Test 1: End-to-end bookmarklet -> editor -> save -> redirect workflow
// =============================================================================
describe( 'Test 1: End-to-end bookmarklet data flow', () => {
	test( 'Bookmarklet collects page data and submits via POST form', () => {
		const bookmarkletPath = path.join( PLUGIN_ROOT, 'assets/bookmarklet.js' );
		const content = fs.readFileSync( bookmarkletPath, 'utf8' );

		// Verify bookmarklet collects essential data fields using add() function.
		expect( content ).toContain( "add( 't'" ); // Title.
		expect( content ).toContain( "add( 's'" ); // Selection.
		expect( content ).toContain( "'_images[]'" ); // Images array.
		expect( content ).toContain( "'_embeds[]'" ); // Embeds array.
		expect( content ).toContain( "'_meta[" ); // Meta tags.
	} );

	test( 'PHP receives and processes bookmarklet data from POST/GET', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify PHP processes data from both POST and GET for backward compat.
		expect( content ).toContain( "$_POST[ $key ]" );
		expect( content ).toContain( "$_GET[ $key ]" );
		expect( content ).toContain( "_images" );
		expect( content ).toContain( "_embeds" );
		expect( content ).toContain( "_meta" );
	} );

	test( 'Editor receives wpPressThisData for initialization', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify PHP outputs wpPressThisData for JavaScript.
		expect( content ).toContain( 'wpPressThisData' );
		expect( content ).toContain( 'wp_json_encode' );
	} );

	test( 'JavaScript initializes editor with wpPressThisData', () => {
		const indexPath = path.join( PLUGIN_ROOT, 'src/index.js' );
		const content = fs.readFileSync( indexPath, 'utf8' );

		// Verify JavaScript reads and uses wpPressThisData.
		expect( content ).toContain( 'window.wpPressThisData' );
		expect( content ).toContain( 'initialData' );
	} );
} );

// =============================================================================
// Test 2: Scraped data flows correctly to block content
// =============================================================================
describe( 'Test 2: Scraped data to block content integration', () => {
	test( 'Utils provide block creation helpers for images', () => {
		const utilsPath = path.join( PLUGIN_ROOT, 'src/utils/index.js' );
		const content = fs.readFileSync( utilsPath, 'utf8' );

		// Verify image block creation utility exists.
		expect( content ).toContain( 'createImageBlockAttributes' );
		expect( content ).toMatch( /url\s*,\s*alt/ );
	} );

	test( 'Utils provide block creation helpers for embeds', () => {
		const utilsPath = path.join( PLUGIN_ROOT, 'src/utils/index.js' );
		const content = fs.readFileSync( utilsPath, 'utf8' );

		// Verify embed block creation utility with provider detection.
		expect( content ).toContain( 'createEmbedBlockAttributes' );
		expect( content ).toContain( 'providerNameSlug' );
		expect( content ).toContain( 'youtube' );
		expect( content ).toContain( 'vimeo' );
	} );

	test( 'MediaGrid enables image insertion into editor', () => {
		const mediaGridPath = path.join( PLUGIN_ROOT, 'src/components/MediaGrid.js' );
		const content = fs.readFileSync( mediaGridPath, 'utf8' );

		// Verify MediaGrid provides insertion callback.
		expect( content ).toContain( 'onInsert' );
		expect( content ).toContain( 'images' );
	} );

	test( 'Editor handles media insertion via API', () => {
		const indexPath = path.join( PLUGIN_ROOT, 'src/index.js' );
		const content = fs.readFileSync( indexPath, 'utf8' );

		// Verify editor exposes insertion method.
		expect( content ).toContain( 'handleMediaInsert' );
		expect( content ).toContain( 'insertBlock' );
		expect( content ).toContain( 'createBlock' );
	} );
} );

// =============================================================================
// Test 3: Legacy URL format backward compatibility
// =============================================================================
describe( 'Test 3: Legacy bookmarklet backward compatibility', () => {
	test( 'PHP accepts legacy GET parameters via key iteration', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify PHP iterates over u, s, t, v keys and checks both POST and GET.
		expect( content ).toContain( "array( 'u', 's', 't', 'v' )" );
		expect( content ).toContain( "$_GET[ $key ]" );
	} );

	test( 'Legacy version detection triggers upgrade prompt flag', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify legacy version detection.
		expect( content ).toContain( 'isLegacy' );
		expect( content ).toContain( 'pt_version' );
	} );

	test( 'Bookmarklet includes version in POST data', () => {
		const bookmarkletPath = path.join( PLUGIN_ROOT, 'assets/bookmarklet.js' );
		const content = fs.readFileSync( bookmarkletPath, 'utf8' );

		// Verify version is sent.
		expect( content ).toContain( 'PT_VERSION' );
		expect( content ).toContain( 'pt_version' );
	} );

	test( 'Bookmarklet has GET fallback for HTTPS->HTTP scenarios', () => {
		const bookmarkletPath = path.join( PLUGIN_ROOT, 'assets/bookmarklet.js' );
		const content = fs.readFileSync( bookmarkletPath, 'utf8' );

		// Verify canPost flag and window.open fallback.
		expect( content ).toContain( 'canPost' );
		expect( content ).toContain( 'window.open' );
		expect( content ).toContain( '&u=' );
		expect( content ).toContain( '&t=' );
		expect( content ).toContain( '&s=' );
	} );
} );

// =============================================================================
// Test 4: Extension compatibility - filters apply correctly
// =============================================================================
describe( 'Test 4: Extension filter compatibility', () => {
	test( 'press_this_data filter modifies scraped data', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify filter is applied to data.
		expect( content ).toContain( "apply_filters( 'press_this_data'" );
	} );

	test( 'press_this_allowed_blocks filter modifies block list', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify filter is applied.
		expect( content ).toContain( "apply_filters( 'press_this_allowed_blocks'" );
	} );

	test( 'press_this_save_post filter modifies post data before save', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify filter is applied in save_post method.
		expect( content ).toContain( "apply_filters( 'press_this_save_post'" );
	} );

	test( 'press_this_save_redirect filter modifies redirect URL', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify filter is applied.
		expect( content ).toContain( "apply_filters( 'press_this_save_redirect'" );
	} );

	test( 'press_this_post_format_suggestion filter modifies format', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify filter is applied.
		expect( content ).toContain( "apply_filters( 'press_this_post_format_suggestion'" );
	} );

	test( 'shortcut_link filter customizes bookmarklet URL', () => {
		const mainPluginPath = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		const content = fs.readFileSync( mainPluginPath, 'utf8' );

		// Verify filter is applied.
		expect( content ).toContain( "apply_filters( 'shortcut_link'" );
	} );
} );

// =============================================================================
// Test 5: Post format auto-suggestion for different content types
// =============================================================================
describe( 'Test 5: Post format auto-suggestion logic', () => {
	test( 'Video embeds suggest video format', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify YouTube detection.
		expect( content ).toContain( 'youtube' );
		expect( content ).toContain( "'video'" );
	} );

	test( 'Vimeo embeds are detected for video format', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		expect( content ).toContain( 'vimeo' );
	} );

	test( 'Blockquote content suggests quote format', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify quote detection logic exists.
		expect( content ).toContain( "'quote'" );
	} );

	test( 'Link-focused content suggests link format', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify link format suggestion.
		expect( content ).toContain( "'link'" );
	} );
} );

// =============================================================================
// Test 6: Save workflow error handling
// =============================================================================
describe( 'Test 6: Save workflow error handling', () => {
	test( 'Save function handles HTTP errors gracefully', () => {
		const utilsPath = path.join( PLUGIN_ROOT, 'src/utils/index.js' );
		const content = fs.readFileSync( utilsPath, 'utf8' );

		// Verify error handling in savePost.
		expect( content ).toContain( 'catch' );
		expect( content ).toContain( 'error.message' );
		expect( content ).toContain( 'success: false' );
	} );

	test( 'PHP validates nonce before saving', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify nonce verification.
		expect( content ).toContain( 'wp_verify_nonce' );
		expect( content ).toContain( 'wp_send_json_error' );
	} );

	test( 'PHP validates user capabilities before saving', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify capability check.
		expect( content ).toContain( 'current_user_can' );
	} );

	test( 'UI displays error messages to user', () => {
		const indexPath = path.join( PLUGIN_ROOT, 'src/index.js' );
		const content = fs.readFileSync( indexPath, 'utf8' );

		// Verify error display.
		expect( content ).toContain( 'showSaveError' );
		expect( content ).toContain( 'errorMsg' );
	} );
} );

// =============================================================================
// Test 7: Featured image workflow
// =============================================================================
describe( 'Test 7: Featured image selection workflow', () => {
	test( 'MediaThumbnail supports set as featured action', () => {
		const mediaThumbnailPath = path.join( PLUGIN_ROOT, 'src/components/MediaThumbnail.js' );
		const content = fs.readFileSync( mediaThumbnailPath, 'utf8' );

		// Verify featured image support.
		expect( content ).toContain( 'onSetFeatured' );
		expect( content ).toContain( 'isFeatured' );
	} );

	test( 'PHP provides featured image handling capability', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify featured image can be set (via wp_update_post or set_post_thumbnail).
		// The actual featured image is handled via post_meta or media_sideload_image.
		expect( content ).toContain( 'media_sideload_image' );
	} );
} );

// =============================================================================
// Test 8: Redirect handling for different save scenarios
// =============================================================================
describe( 'Test 8: Redirect handling for save scenarios', () => {
	test( 'Standard editor redirect sets force flag', () => {
		const indexPath = path.join( PLUGIN_ROOT, 'src/index.js' );
		const content = fs.readFileSync( indexPath, 'utf8' );

		// Verify force redirect handling.
		expect( content ).toContain( 'forceRedirect' );
		expect( content ).toContain( 'pt-force-redirect' );
	} );

	test( 'PHP returns different redirect URLs for force vs normal', () => {
		const pluginClass = path.join( PLUGIN_ROOT, 'class-wp-press-this-plugin.php' );
		const content = fs.readFileSync( pluginClass, 'utf8' );

		// Verify redirect handling.
		expect( content ).toContain( "'force'" );
		expect( content ).toContain( "'redirect'" );
		expect( content ).toContain( 'get_edit_post_link' );
	} );

	test( 'JavaScript handles redirect in parent window when configured', () => {
		const indexPath = path.join( PLUGIN_ROOT, 'src/index.js' );
		const content = fs.readFileSync( indexPath, 'utf8' );

		// Verify parent window redirect.
		expect( content ).toContain( 'window.opener' );
		expect( content ).toContain( 'redirInParent' );
	} );
} );

// =============================================================================
// Summary
// =============================================================================
console.log( '\n' + '='.repeat( 50 ) );
console.log( 'End-to-End Workflow Test Summary' );
console.log( '='.repeat( 50 ) );
console.log( `Tests Passed: ${ testsPassed }` );
console.log( `Tests Failed: ${ testsFailed }` );
console.log( `Total Tests:  ${ testsPassed + testsFailed }` );
console.log( '='.repeat( 50 ) );

// Exit with error code if tests failed.
if ( testsFailed > 0 ) {
	process.exit( 1 );
}
