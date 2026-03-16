/**
 * Category Panel Component Tests
 *
 * Uses source-reading pattern to verify component implementation.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'CategoryPanel', () => {
	let sourceContent;

	beforeAll( () => {
		const sourcePath = path.resolve(
			__dirname,
			'../../src/components/CategoryPanel.js'
		);
		sourceContent = fs.readFileSync( sourcePath, 'utf8' );
	} );

	describe( 'Component Structure', () => {
		test( 'exports a default function component', () => {
			expect( sourceContent ).toMatch(
				/export\s+default\s+function\s+CategoryPanel/
			);
		} );

		test( 'renders within a PanelBody', () => {
			expect( sourceContent ).toContain( '<PanelBody' );
			expect( sourceContent ).toContain( '</PanelBody>' );
		} );

		test( 'accepts required props', () => {
			expect( sourceContent ).toContain( 'categories' );
			expect( sourceContent ).toContain( 'selectedCategories' );
			expect( sourceContent ).toContain( 'onSelectionChange' );
			expect( sourceContent ).toContain( 'onCategoriesChange' );
		} );
	} );

	describe( 'Category Rendering', () => {
		test( 'renders categories as CheckboxControl components', () => {
			expect( sourceContent ).toContain( '<CheckboxControl' );
		} );

		test( 'uses hierarchical nesting via buildTermsTree', () => {
			expect( sourceContent ).toMatch(
				/import\s*\{[^}]*buildTermsTree[^}]*\}/
			);
			expect( sourceContent ).toContain( 'buildTermsTree( categories )' );
		} );

		test( 'renders children in nested subchoices container', () => {
			expect( sourceContent ).toContain(
				'press-this-editor__hierarchical-terms-subchoices'
			);
			expect( sourceContent ).toMatch(
				/term\.children\.length\s*&&/
			);
		} );

		test( 'sets checkbox checked state from selectedCategories', () => {
			expect( sourceContent ).toMatch(
				/checked=\{\s*selectedCategories\.includes\(\s*term\.id\s*\)/
			);
		} );
	} );

	describe( 'Selection Toggle', () => {
		test( 'has handleCategoryToggle callback', () => {
			expect( sourceContent ).toMatch(
				/const\s+handleCategoryToggle\s*=\s*useCallback/
			);
		} );

		test( 'toggles category by adding or removing from array', () => {
			expect( sourceContent ).toMatch(
				/prev\.includes\(\s*termId\s*\)/
			);
			expect( sourceContent ).toMatch(
				/prev\.filter\(\s*\(\s*id\s*\)\s*=>\s*id\s*!==\s*termId\s*\)/
			);
			expect( sourceContent ).toMatch(
				/\[\s*\.\.\.prev\s*,\s*termId\s*\]/
			);
		} );
	} );

	describe( 'Search Filter', () => {
		test( 'uses SearchControl for filtering', () => {
			expect( sourceContent ).toContain( '<SearchControl' );
		} );

		test( 'only shows filter when categories >= MIN_TERMS_COUNT_FOR_FILTER', () => {
			expect( sourceContent ).toContain(
				'MIN_TERMS_COUNT_FOR_FILTER'
			);
			expect( sourceContent ).toMatch(
				/const\s+MIN_TERMS_COUNT_FOR_FILTER\s*=\s*8/
			);
			expect( sourceContent ).toMatch(
				/categories\.length\s*>=\s*MIN_TERMS_COUNT_FOR_FILTER/
			);
		} );

		test( 'uses getFilterMatcher for filtering', () => {
			expect( sourceContent ).toMatch(
				/import\s*\{[^}]*getFilterMatcher[^}]*\}/
			);
			expect( sourceContent ).toContain( 'getFilterMatcher( filterValue )' );
		} );

		test( 'displays filtered results or full tree based on filterValue', () => {
			expect( sourceContent ).toMatch(
				/filterValue\s*!==\s*['"].*['"]\s*\?\s*filteredTermsTree\s*:\s*termsTree/
			);
		} );

		test( 'announces filtered result count to screen readers', () => {
			expect( sourceContent ).toContain( 'debouncedSpeak' );
			expect( sourceContent ).toMatch(
				/debouncedSpeak\(\s*message\s*,\s*['"]assertive['"]\s*\)/
			);
		} );
	} );

	describe( 'Add New Category', () => {
		test( 'has add new category toggle button', () => {
			expect( sourceContent ).toContain( '+ Add New Category' );
			expect( sourceContent ).toContain( 'isAddCategoryOpen' );
		} );

		test( 'shows add category form when toggled open', () => {
			expect( sourceContent ).toContain( '<TextControl' );
			expect( sourceContent ).toContain( 'New Category Name' );
		} );

		test( 'includes parent category TreeSelect', () => {
			expect( sourceContent ).toContain( '<TreeSelect' );
			expect( sourceContent ).toContain( 'Parent Category' );
		} );

		test( 'has handleAddCategory for creating categories via AJAX', () => {
			expect( sourceContent ).toMatch(
				/const\s+handleAddCategory\s*=\s*useCallback/
			);
			expect( sourceContent ).toContain(
				"'press-this-plugin-add-category'"
			);
		} );

		test( 'sends category name, parent, and nonce in request', () => {
			expect( sourceContent ).toContain( "append( 'name'" );
			expect( sourceContent ).toContain( "append( 'parent'" );
			expect( sourceContent ).toContain( "append( 'new_cat_nonce'" );
		} );

		test( 'auto-selects newly created categories', () => {
			expect( sourceContent ).toMatch(
				/onSelectionChange\(\s*\(\s*prev\s*\)\s*=>\s*\[\s*\.\.\.prev\s*,\s*\.\.\.newCatIds\s*\]/
			);
		} );

		test( 'only shows add category when canEditCategories and categoryNonce', () => {
			expect( sourceContent ).toMatch(
				/canEditCategories\s*&&\s*categoryNonce/
			);
		} );
	} );

	describe( 'Error Handling', () => {
		test( 'displays category error when present', () => {
			expect( sourceContent ).toContain( 'categoryError' );
			expect( sourceContent ).toContain(
				'press-this-editor__add-category-error'
			);
		} );

		test( 'sets error on failed category creation', () => {
			expect( sourceContent ).toContain(
				"'Failed to create category.'"
			);
		} );

		test( 'disables add button when name is empty or creating', () => {
			expect( sourceContent ).toMatch(
				/disabled=\{[^}]*newCategoryName\.trim\(\)/
			);
			expect( sourceContent ).toContain( 'isCreatingCategory' );
		} );
	} );

	describe( 'HTML Entity Decoding', () => {
		test( 'uses unescapeString for category label display', () => {
			expect( sourceContent ).toMatch(
				/import\s*\{[^}]*unescapeString[^}]*\}/
			);
			expect( sourceContent ).toMatch(
				/label=\{\s*unescapeString\(\s*term\.name\s*\)/
			);
		} );
	} );

	describe( 'No Results', () => {
		test( 'displays no categories found message', () => {
			expect( sourceContent ).toContain( 'No categories found.' );
			expect( sourceContent ).toContain(
				'press-this-editor__categories-no-results'
			);
		} );
	} );
} );
