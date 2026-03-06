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
		expect( editorContent ).toMatch(
			/import\s*\{[^}]*useDispatch[^}]*\}\s*from\s*['"]@wordpress\/data['"]/
		);
	} );

	test( 'ConnectedScrapedMediaPanel dispatches insertBlock via blockEditorStore', () => {
		// The store dispatch must happen inside a child component rendered
		// within BlockEditorProvider, not in PressThisEditor itself.
		expect( editorContent ).toMatch(
			/function\s+ConnectedScrapedMediaPanel/
		);
		expect( editorContent ).toMatch(
			/const\s+\{\s*insertBlock\s*\}\s*=\s*useDispatch\(\s*blockEditorStore\s*\)/
		);
	} );

	test( 'ConnectedScrapedMediaPanel is used inside BlockEditorProvider JSX', () => {
		// The connected wrapper should appear in the rendered JSX.
		expect( editorContent ).toMatch( /<ConnectedScrapedMediaPanel/ );

		// The raw ScrapedMediaPanel should NOT be rendered directly with
		// a manual onInsertBlock in the main component's JSX.
		expect( editorContent ).not.toMatch(
			/<ScrapedMediaPanel[\s\S]*?onInsertBlock=\{[^}]*setBlocks/
		);
	} );

	test( 'no manual array-append insertion pattern exists', () => {
		// The old bug: setBlocks( ( prev ) => [ ...prev, block ] ) for insertion.
		// This pattern should not appear tied to an insertBlock callback.
		expect( editorContent ).not.toMatch(
			/insertBlock[\s\S]*?setBlocks\s*\(\s*\(\s*prev\s*\)\s*=>\s*\[\s*\.\.\.prev\s*,\s*block\s*\]/
		);
	} );
} );
