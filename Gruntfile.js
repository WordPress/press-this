module.exports = function( grunt ) {
	grunt.initConfig({
		checktextdomain: {
			options:{
				text_domain: 'press-this',
				keywords: [
					'__:1,2d',
					'_e:1,2d',
					'_x:1,2c,3d',
					'esc_html__:1,2d',
					'esc_html_e:1,2d',
					'esc_html_x:1,2c,3d',
					'esc_attr__:1,2d',
					'esc_attr_e:1,2d',
					'esc_attr_x:1,2c,3d',
					'_ex:1,2c,3d',
					'_n:1,2,4d',
					'_nx:1,2,4c,5d',
					'_n_noop:1,2,3d',
					'_nx_noop:1,2,3c,4d'
				]
			},
			files: {
				src:  [
					'**/*.php',         // Include all files
					'!apigen/**',       // Exclude apigen/
					'!node_modules/**', // Exclude node_modules/
					'!tests/**',        // Exclude tests/
					'!vendor/**',       // Exclude vendor/
					'!tmp/**'           // Exclude tmp/
				],
				expand: true
			}
		},

		addtextdomain: {
			press-this: {
				options: {
					textdomain: 'press-this'
				},
				files: {
					src: [
						'*.php',
						'**/*.php',
						'!node_modules/**'
					]
				}
			}
		},
	});

	grunt.loadNpmTasks( 'grunt-wp-i18n' );
};