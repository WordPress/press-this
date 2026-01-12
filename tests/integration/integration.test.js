/**
 * Integration Tests for Press This WordPress Plugin
 *
 * Tests for Task Group 10: WordPress Integration & Tools Page
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN_ROOT = path.resolve( __dirname, '../../' );
const BUILD_DIR = path.join( PLUGIN_ROOT, 'build' );

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
		toContain: ( expected ) => {
			if ( typeof actual === 'string' && ! actual.includes( expected ) ) {
				throw new Error(
					`Expected "${ actual }" to contain "${ expected }"`
				);
			}
			if ( Array.isArray( actual ) && ! actual.includes( expected ) ) {
				throw new Error(
					`Expected array to contain "${ expected }"`
				);
			}
		},
		toMatch: ( regex ) => {
			if ( ! regex.test( actual ) ) {
				throw new Error(
					`Expected "${ actual }" to match ${ regex }`
				);
			}
		},
		toBeGreaterThan: ( expected ) => {
			if ( actual <= expected ) {
				throw new Error(
					`Expected ${ actual } to be greater than ${ expected }`
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

// =============================================================================
// Test 1: Plugin activates without errors
// =============================================================================
describe( 'Test 1: Plugin file structure is correct for activation', () => {
	test( 'Main plugin file exists', () => {
		const mainPluginFile = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		expect( mainPluginFile ).toExist();
	} );

	test( 'Main plugin file has required WordPress plugin header', () => {
		const mainPluginFile = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		const content = fs.readFileSync( mainPluginFile, 'utf8' );

		// Check for required plugin header elements.
		expect( content ).toContain( 'Plugin Name:' );
		expect( content ).toContain( 'press-this' );
	} );

	test( 'PRESS_THIS__VERSION constant is defined', () => {
		const mainPluginFile = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		const content = fs.readFileSync( mainPluginFile, 'utf8' );

		expect( content ).toMatch( /define\s*\(\s*['"]PRESS_THIS__VERSION['"]/ );
	} );

	test( 'Plugin class file exists', () => {
		const classFile = path.join(
			PLUGIN_ROOT,
			'class-wp-press-this-plugin.php'
		);
		expect( classFile ).toExist();
	} );

	test( 'Assets class file exists', () => {
		const assetsFile = path.join(
			PLUGIN_ROOT,
			'includes/class-press-this-assets.php'
		);
		expect( assetsFile ).toExist();
	} );
} );

// =============================================================================
// Test 2: Press This editor renders correctly
// =============================================================================
describe( 'Test 2: Press This editor components exist', () => {
	test( 'Build output files exist', () => {
		const jsFile = path.join( BUILD_DIR, 'press-this-editor.js' );
		const cssFile = path.join( BUILD_DIR, 'press-this-editor.css' );
		const assetFile = path.join( BUILD_DIR, 'press-this-editor.asset.php' );

		expect( jsFile ).toExist();
		expect( cssFile ).toExist();
		expect( assetFile ).toExist();
	} );

	test( 'Editor script has required React mount point setup', () => {
		const classFile = path.join(
			PLUGIN_ROOT,
			'class-wp-press-this-plugin.php'
		);
		const content = fs.readFileSync( classFile, 'utf8' );

		// Check for React mount point.
		expect( content ).toContain( 'press-this-editor' );
		expect( content ).toContain( 'wpPressThisData' );
	} );

	test( 'Editor enqueue function exists', () => {
		const classFile = path.join(
			PLUGIN_ROOT,
			'class-wp-press-this-plugin.php'
		);
		const content = fs.readFileSync( classFile, 'utf8' );

		expect( content ).toContain( 'enqueue_block_editor_assets' );
	} );

	test( 'Main entry point has editor initialization', () => {
		const indexFile = path.join( PLUGIN_ROOT, 'src/index.js' );
		const content = fs.readFileSync( indexFile, 'utf8' );

		expect( content ).toContain( 'PressThisEditor' );
		expect( content ).toContain( 'domReady' );
		expect( content ).toContain( 'render' );
	} );
} );

// =============================================================================
// Test 3: Tools page shows bookmarklet link
// =============================================================================
describe( 'Test 3: Tools page integration', () => {
	test( 'Tool box hook registration exists', () => {
		const mainPluginFile = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		const content = fs.readFileSync( mainPluginFile, 'utf8' );

		expect( content ).toContain( "add_action( 'tool_box'" );
		expect( content ).toContain( 'press_this_tool_box' );
	} );

	test( 'Tools page function renders bookmarklet', () => {
		const mainPluginFile = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		const content = fs.readFileSync( mainPluginFile, 'utf8' );

		// Check for bookmarklet-related HTML.
		expect( content ).toContain( 'pressthis-bookmarklet' );
		expect( content ).toContain( 'press_this_get_shortcut_link' );
	} );

	test( 'Direct link to Press This exists in tools output', () => {
		const mainPluginFile = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		const content = fs.readFileSync( mainPluginFile, 'utf8' );

		expect( content ).toContain( 'press-this.php' );
		expect( content ).toContain( 'Open Press This' );
	} );

	test( 'Bookmarklet generation function exists', () => {
		const mainPluginFile = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		const content = fs.readFileSync( mainPluginFile, 'utf8' );

		expect( content ).toContain( 'function press_this_get_shortcut_link' );
	} );

	test( 'Bookmarklet uses shortcut_link filter', () => {
		const mainPluginFile = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		const content = fs.readFileSync( mainPluginFile, 'utf8' );

		expect( content ).toContain( "apply_filters( 'shortcut_link'" );
	} );
} );

// =============================================================================
// Test 4: AJAX endpoints are registered
// =============================================================================
describe( 'Test 4: AJAX endpoints registration', () => {
	test( 'Save post AJAX action is registered', () => {
		const mainPluginFile = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		const content = fs.readFileSync( mainPluginFile, 'utf8' );

		expect( content ).toContain( "add_action( 'wp_ajax_press-this-plugin-save-post'" );
	} );

	test( 'Add category AJAX action is registered', () => {
		const mainPluginFile = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		const content = fs.readFileSync( mainPluginFile, 'utf8' );

		expect( content ).toContain( "add_action( 'wp_ajax_press-this-plugin-add-category'" );
	} );

	test( 'AJAX handlers have corresponding functions', () => {
		const mainPluginFile = path.join( PLUGIN_ROOT, 'press-this-plugin.php' );
		const content = fs.readFileSync( mainPluginFile, 'utf8' );

		expect( content ).toContain( 'function wp_ajax_press_this_plugin_save_post' );
		expect( content ).toContain( 'function wp_ajax_press_this_plugin_add_category' );
	} );

	test( 'Plugin class has save_post method', () => {
		const classFile = path.join(
			PLUGIN_ROOT,
			'class-wp-press-this-plugin.php'
		);
		const content = fs.readFileSync( classFile, 'utf8' );

		expect( content ).toContain( 'function save_post' );
		expect( content ).toContain( 'wp_send_json_error' );
		expect( content ).toContain( 'wp_send_json_success' );
	} );

	test( 'Plugin class has add_category method', () => {
		const classFile = path.join(
			PLUGIN_ROOT,
			'class-wp-press-this-plugin.php'
		);
		const content = fs.readFileSync( classFile, 'utf8' );

		expect( content ).toContain( 'function add_category' );
	} );
} );

// =============================================================================
// Test 5: Popup window configuration
// =============================================================================
describe( 'Test 5: Popup window behavior configuration', () => {
	test( 'Bookmarklet has window sizing calculations (70% width)', () => {
		const bookmarkletFile = path.join(
			PLUGIN_ROOT,
			'assets/bookmarklet.js'
		);
		const content = fs.readFileSync( bookmarkletFile, 'utf8' );

		// Check for 70% width calculation.
		expect( content ).toContain( '0.7' );
		expect( content ).toContain( 'windowWidth' );
	} );

	test( 'Bookmarklet has window sizing calculations (90% height)', () => {
		const bookmarkletFile = path.join(
			PLUGIN_ROOT,
			'assets/bookmarklet.js'
		);
		const content = fs.readFileSync( bookmarkletFile, 'utf8' );

		// Check for 90% height calculation.
		expect( content ).toContain( '0.9' );
		expect( content ).toContain( 'windowHeight' );
	} );

	test( 'Bookmarklet opens window with resizable and scrollbars attributes', () => {
		const bookmarkletFile = path.join(
			PLUGIN_ROOT,
			'assets/bookmarklet.js'
		);
		const content = fs.readFileSync( bookmarkletFile, 'utf8' );

		expect( content ).toContain( 'resizable' );
		expect( content ).toContain( 'scrollbars' );
	} );

	test( 'Minified bookmarklet exists and contains window settings', () => {
		const minifiedFile = path.join(
			PLUGIN_ROOT,
			'assets/bookmarklet.min.js'
		);
		const content = fs.readFileSync( minifiedFile, 'utf8' );

		expect( content ).toContain( 'resizable' );
		expect( content ).toContain( 'scrollbars' );
	} );
} );

// =============================================================================
// Test 6: Standard editor workflow (redirect handling)
// =============================================================================
describe( 'Test 6: Open in full editor workflow', () => {
	test( 'pt-force-redirect hidden field exists in HTML template', () => {
		const classFile = path.join(
			PLUGIN_ROOT,
			'class-wp-press-this-plugin.php'
		);
		const content = fs.readFileSync( classFile, 'utf8' );

		expect( content ).toContain( 'pt-force-redirect' );
	} );

	test( 'Save handler processes force redirect flag', () => {
		const classFile = path.join(
			PLUGIN_ROOT,
			'class-wp-press-this-plugin.php'
		);
		const content = fs.readFileSync( classFile, 'utf8' );

		// Check for force redirect processing.
		expect( content ).toContain( 'pt-force-redirect' );
		expect( content ).toContain( 'get_edit_post_link' );
	} );

	test( 'JavaScript handles standard editor redirect', () => {
		const indexFile = path.join( PLUGIN_ROOT, 'src/index.js' );
		const content = fs.readFileSync( indexFile, 'utf8' );

		expect( content ).toContain( 'forceRedirect' );
		expect( content ).toContain( 'Standard Editor' );
	} );

	test( 'Standard editor button exists in HTML template', () => {
		const classFile = path.join(
			PLUGIN_ROOT,
			'class-wp-press-this-plugin.php'
		);
		const content = fs.readFileSync( classFile, 'utf8' );

		expect( content ).toContain( 'standard-editor-button' );
		expect( content ).toContain( 'Standard Editor' );
	} );

	test( 'Redirect returns in JSON response with force flag', () => {
		const classFile = path.join(
			PLUGIN_ROOT,
			'class-wp-press-this-plugin.php'
		);
		const content = fs.readFileSync( classFile, 'utf8' );

		// Check that wp_send_json_success includes force flag.
		expect( content ).toContain( "'force'" );
		expect( content ).toContain( '$force_redirect' );
	} );
} );

// =============================================================================
// Summary
// =============================================================================
console.log( '\n' + '='.repeat( 60 ) );
console.log( 'Integration Test Summary' );
console.log( '='.repeat( 60 ) );
console.log( `Tests Passed: ${ testsPassed }` );
console.log( `Tests Failed: ${ testsFailed }` );
console.log( `Total Tests:  ${ testsPassed + testsFailed }` );
console.log( '='.repeat( 60 ) );

// Exit with error code if tests failed.
if ( testsFailed > 0 ) {
	process.exit( 1 );
}
