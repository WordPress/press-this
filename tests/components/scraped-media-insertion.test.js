/**
 * Scraped Media Insertion Tests
 *
 * Verifies that inserting scraped media (images/embeds) from the sidebar
 * uses the block editor store's insertBlock action, which respects cursor
 * position, rather than manually appending to the blocks array.
 *
 * Regression test for https://github.com/WordPress/press-this/issues/76
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Scraped media insertion respects cursor position', () => {
	let editorContent;

	beforeAll( () => {
		const editorPath = path.resolve(
			__dirname,
			'../../src/components/PressThisEditor.js'
		);
		editorContent = fs.readFileSync( editorPath, 'utf8' );
	} );

	test( 'useDispatch is imported from @wordpress/data', () => {
		expect( editorContent ).toContain( 'useDispatch' );
		expect( editorContent ).toMatch(
			/import\s*\{[^}]*useDispatch[^}]*\}\s*from\s*['"]@wordpress\/data['"]/
		);
	} );

	test( 'insertBlock is obtained from useDispatch( blockEditorStore )', () => {
		expect( editorContent ).toMatch(
			/useDispatch\(\s*blockEditorStore\s*\)/
		);
		expect( editorContent ).toContain( 'dispatchInsertBlock' );
	} );

	test( 'insertBlock callback delegates to dispatchInsertBlock', () => {
		// The insertBlock callback should call dispatchInsertBlock, not setBlocks.
		// Extract the insertBlock callback definition.
		const insertBlockMatch = editorContent.match(
			/const\s+insertBlock\s*=\s*useCallback\(\s*\n?\s*\(\s*block\s*\)\s*=>\s*\{([\s\S]*?)\},/
		);
		expect( insertBlockMatch ).not.toBeNull();

		const callbackBody = insertBlockMatch[ 1 ];
		expect( callbackBody ).toContain( 'dispatchInsertBlock' );
		expect( callbackBody ).not.toContain( 'setBlocks' );
	} );

	test( 'ScrapedMediaPanel receives insertBlock as onInsertBlock prop', () => {
		expect( editorContent ).toMatch(
			/ScrapedMediaPanel[\s\S]*?onInsertBlock=\{\s*insertBlock\s*\}/
		);
	} );
} );
