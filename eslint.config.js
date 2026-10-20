/**
 * External dependencies
 */
const defaultConfig = require( '@wordpress/scripts/config/eslint.config.cjs' );

/*
 * ESLint flat config, required since @wordpress/scripts moved to ESLint 9.
 * Extending the default config from @wordpress/scripts keeps this in step
 * with upstream, including its Babel parser fallback.
 */
module.exports = [
	...defaultConfig,
	{
		rules: {
			'jsdoc/no-undefined-types': [
				'error',
				{
					definedTypes: [
						'JSX',
						'Document',
						'Element',
						'KeyboardEvent',
						'MouseEvent',
					],
				},
			],
		},
	},
];
