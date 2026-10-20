/**
 * Taxonomy Panel Component Tests
 *
 * Uses source-reading pattern to verify component implementation,
 * matching CategoryPanel.test.js.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'TaxonomyPanel', () => {
	let sourceContent;

	beforeAll( () => {
		const sourcePath = path.resolve(
			__dirname,
			'../../src/components/TaxonomyPanel.js'
		);
		sourceContent = fs.readFileSync( sourcePath, 'utf8' );
	} );

	describe( 'Component Structure', () => {
		test( 'exports a default function component', () => {
			expect( sourceContent ).toMatch(
				/export\s+default\s+function\s+TaxonomyPanel/
			);
		} );

		test( 'dispatches to hierarchical or flat rendering based on taxonomy.hierarchical', () => {
			expect( sourceContent ).toMatch( /taxonomy\.hierarchical/ );
			expect( sourceContent ).toContain( 'HierarchicalTaxonomyPanel' );
			expect( sourceContent ).toContain( 'FlatTaxonomyPanel' );
		} );
	} );

	describe( 'Hierarchical Taxonomy Panel', () => {
		test( 'renders within a PanelBody titled with the taxonomy label', () => {
			expect( sourceContent ).toMatch(
				/<PanelBody\s+title=\{\s*taxonomy\.label\s*\}/
			);
		} );

		test( 'builds a terms tree via buildTermsTree', () => {
			expect( sourceContent ).toMatch(
				/import\s*\{[^}]*buildTermsTree[^}]*\}/
			);
			expect( sourceContent ).toMatch(
				/buildTermsTree\(\s*taxonomy\.terms/
			);
		} );

		test( 'renders terms as CheckboxControl components', () => {
			expect( sourceContent ).toContain( '<CheckboxControl' );
		} );

		test( 'toggles term selection by adding or removing from array', () => {
			expect( sourceContent ).toMatch(
				/prev\.includes\(\s*termId\s*\)/
			);
			expect( sourceContent ).toMatch(
				/prev\.filter\(\s*\(\s*id\s*\)\s*=>\s*id\s*!==\s*termId\s*\)/
			);
		} );

		test( 'uses getFilterMatcher for search filtering', () => {
			expect( sourceContent ).toMatch(
				/import\s*\{[^}]*getFilterMatcher[^}]*\}/
			);
			expect( sourceContent ).toContain(
				'getFilterMatcher( filterValue )'
			);
		} );
	} );

	describe( 'Flat Taxonomy Panel', () => {
		test( 'renders a FormTokenField', () => {
			expect( sourceContent ).toContain( '<FormTokenField' );
		} );

		test( 'builds REST suggestions URL from taxonomy.restBase', () => {
			expect( sourceContent ).toMatch( /taxonomy\.restBase/ );
			expect( sourceContent ).toMatch( /wp\/v2\/\$\{\s*taxonomy\.restBase\s*\}/ );
		} );

		test( 'skips suggestions when restBase is empty', () => {
			expect( sourceContent ).toMatch(
				/!\s*taxonomy\.restBase/
			);
		} );
	} );
} );
