/**
 * Scraped Media Insertion — structural tests.
 *
 * Verifies that inserting scraped media (images/embeds) from the sidebar
 * uses the block editor store's insertBlock action, with the cursor's
 * insertion point passed in so blocks land at the cursor — not appended at
 * the end. See connected-scraped-media-panel.test.js for behavior tests.
 *
 * Original regression: https://github.com/WordPress/press-this/issues/76
 * Cursor-position regression: https://github.com/WordPress/press-this/issues/126
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Scraped media insertion respects cursor position', () => {
	let connectedSource;
	let editorSource;

	beforeAll( () => {
		connectedSource = fs.readFileSync(
			path.resolve(
				__dirname,
				'../../src/components/ConnectedScrapedMediaPanel.js'
			),
			'utf8'
		);
		editorSource = fs.readFileSync(
			path.resolve(
				__dirname,
				'../../src/components/PressThisEditor.js'
			),
			'utf8'
		);
	} );

	test( 'ConnectedScrapedMediaPanel imports useDispatch and useSelect from @wordpress/data', () => {
		expect( connectedSource ).toMatch(
			/import\s*\{[^}]*useDispatch[^}]*\}\s*from\s*['"]@wordpress\/data['"]/
		);
		expect( connectedSource ).toMatch(
			/import\s*\{[^}]*useSelect[^}]*\}\s*from\s*['"]@wordpress\/data['"]/
		);
	} );

	test( 'ConnectedScrapedMediaPanel dispatches insertBlock via blockEditorStore', () => {
		expect( connectedSource ).toMatch(
			/const\s+\{\s*insertBlock\s*\}\s*=\s*useDispatch\(\s*blockEditorStore\s*\)/
		);
	} );

	test( 'ConnectedScrapedMediaPanel reads getBlockInsertionPoint and passes index + rootClientId', () => {
		expect( connectedSource ).toMatch( /getBlockInsertionPoint/ );
		// The insertBlock call must include the cursor's index/rootClientId.
		expect( connectedSource ).toMatch(
			/insertBlock\(\s*block\s*,[\s\S]*?index[\s\S]*?rootClientId/
		);
	} );

	test( 'PressThisEditor renders ConnectedScrapedMediaPanel inside its BlockEditorProvider', () => {
		expect( editorSource ).toMatch(
			/import\s+ConnectedScrapedMediaPanel\s+from\s+['"]\.\/ConnectedScrapedMediaPanel['"]/
		);
		expect( editorSource ).toMatch( /<ConnectedScrapedMediaPanel/ );

		// Must NOT manually append blocks via setBlocks( prev => [ ...prev, block ] ).
		expect( editorSource ).not.toMatch(
			/onInsertBlock=\{[\s\S]*?setBlocks\s*\(\s*\(\s*prev\s*\)\s*=>\s*\[\s*\.\.\.prev\s*,\s*block\s*\]/
		);
	} );
} );
