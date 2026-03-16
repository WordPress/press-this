/**
 * External dependencies
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

/**
 * WordPress dependencies externalization.
 * These packages are provided by WordPress core and should not be bundled.
 */
const wordPressExternals = {
	'@wordpress/block-editor': [ 'wp', 'blockEditor' ],
	'@wordpress/blocks': [ 'wp', 'blocks' ],
	'@wordpress/components': [ 'wp', 'components' ],
	'@wordpress/compose': [ 'wp', 'compose' ],
	'@wordpress/data': [ 'wp', 'data' ],
	'@wordpress/element': [ 'wp', 'element' ],
	'@wordpress/i18n': [ 'wp', 'i18n' ],
	'@wordpress/rich-text': [ 'wp', 'richText' ],
	'@wordpress/dom-ready': [ 'wp', 'domReady' ],
	'@wordpress/api-fetch': [ 'wp', 'apiFetch' ],
	'@wordpress/url': [ 'wp', 'url' ],
	'@wordpress/hooks': [ 'wp', 'hooks' ],
	'@wordpress/keycodes': [ 'wp', 'keycodes' ],
	'@wordpress/primitives': [ 'wp', 'primitives' ],
	'@wordpress/blob': [ 'wp', 'blob' ],
	'@wordpress/format-library': [ 'wp', 'formatLibrary' ],
	// Note: @wordpress/icons is NOT externalized - it gets bundled since
	// @wordpress/components needs it internally and wp.icons may not be available.
};

module.exports = {
	...defaultConfig,
	entry: {
		'press-this-editor': path.resolve( __dirname, 'src/index.js' ),
	},
	output: {
		...defaultConfig.output,
		path: path.resolve( __dirname, 'build' ),
		filename: '[name].js',
	},
	externals: {
		...defaultConfig.externals,
		...wordPressExternals,
		jquery: 'jQuery',
		react: 'React',
		'react-dom': 'ReactDOM',
	},
};
