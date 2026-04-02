module.exports = {
	extends: [ 'plugin:@wordpress/eslint-plugin/recommended' ],
	rules: {
		'jsdoc/no-undefined-types': [
			'error',
			{
				definedTypes: [ 'JSX', 'Document', 'Element', 'KeyboardEvent', 'MouseEvent' ],
			},
		],
	},
};
