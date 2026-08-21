/**
 * Custom Taxonomies — wiring tests.
 *
 * Verifies the custom taxonomies data flows from App.js into
 * PressThisEditor, is rendered via TaxonomyPanel, and is included in the
 * save payload sent to the REST API.
 *
 * Issue: https://github.com/WordPress/press-this/issues/9
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Custom taxonomies wiring', () => {
	let appSource;
	let editorSource;

	beforeAll( () => {
		appSource = fs.readFileSync(
			path.resolve( __dirname, '../../src/App.js' ),
			'utf8'
		);
		editorSource = fs.readFileSync(
			path.resolve( __dirname, '../../src/components/PressThisEditor.js' ),
			'utf8'
		);
	} );

	test( 'App.js passes data.taxonomies through to PressThisEditor', () => {
		expect( appSource ).toMatch(
			/taxonomies=\{\s*data\.taxonomies\s*\|\|\s*\[\s*\]\s*\}/
		);
	} );

	test( 'PressThisEditor accepts a taxonomies prop', () => {
		expect( editorSource ).toMatch( /taxonomies\s*=\s*\[\s*\]/ );
	} );

	test( 'PressThisEditor tracks per-taxonomy term selections', () => {
		expect( editorSource ).toMatch(
			/const\s*\[\s*taxonomyTerms\s*,\s*setTaxonomyTerms\s*\]\s*=\s*useState\(\s*\{\s*\}\s*\)/
		);
	} );

	test( 'PressThisEditor imports and renders TaxonomyPanel per taxonomy', () => {
		expect( editorSource ).toMatch(
			/import\s+TaxonomyPanel\s+from\s+['"]\.\/TaxonomyPanel['"]/
		);
		expect( editorSource ).toMatch(
			/taxonomies\.map\(\s*\(\s*taxonomy\s*\)\s*=>/
		);
		expect( editorSource ).toContain( '<TaxonomyPanel' );
	} );

	test( 'save payload includes tax_input built from taxonomyTerms', () => {
		expect( editorSource ).toMatch( /tax_input:\s*taxonomyTerms/ );
	} );

	test( 'handleSave dependency array includes taxonomyTerms', () => {
		const handleSaveMatch = editorSource.match(
			/const handleSave = useCallback\(([\s\S]*?)\n\t\);/
		);
		expect( handleSaveMatch ).not.toBeNull();
		expect( handleSaveMatch[ 1 ] ).toContain( 'taxonomyTerms' );
	} );
} );
