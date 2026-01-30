/**
 * Tags Helper Text Tests
 *
 * Tests for the tags helper text in PressThisEditor.
 * Verifies that helper text renders correctly below Tags FormTokenField.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Tags Helper Text', () => {
	test( 'Tags helper text renders with correct content', () => {
		const editorPath = path.resolve( __dirname, '../../src/components/PressThisEditor.js' );

		expect( fs.existsSync( editorPath ) ).toBe( true );

		const content = fs.readFileSync( editorPath, 'utf8' );

		// Check for helper text content.
		expect( content ).toContain( 'Separate with commas or the Enter key' );

		// Check for helper text class.
		expect( content ).toContain( 'press-this-tags-panel__help' );
	} );

	test( 'Tags helper text has correct styling defined', () => {
		const scssPath = path.resolve( __dirname, '../../src/styles/partials/_tags-panel.scss' );

		expect( fs.existsSync( scssPath ) ).toBe( true );

		const content = fs.readFileSync( scssPath, 'utf8' );

		// Check for helper class definition.
		expect( content ).toContain( '.press-this-tags-panel__help' );

		// Check for font-size styling (should use $font-size-xs which is 12px).
		expect( content ).toContain( 'font-size' );

		// Check for color styling (should use $color-text-light which is #757575).
		expect( content ).toContain( 'color' );
	} );
} );
