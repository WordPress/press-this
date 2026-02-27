/**
 * Tests for term tree utilities.
 *
 * @package press-this
 */

import {
	buildTermsTree,
	getFilterMatcher,
	unescapeString,
} from '../../src/utils/terms';

describe( 'buildTermsTree', () => {
	test( 'returns empty array for empty input', () => {
		expect( buildTermsTree( [] ) ).toEqual( [] );
	} );

	test( 'builds a flat list when all terms have parent 0', () => {
		const flat = [
			{ id: 1, name: 'News', parent: 0 },
			{ id: 2, name: 'Sports', parent: 0 },
		];

		const tree = buildTermsTree( flat );

		expect( tree ).toHaveLength( 2 );
		expect( tree[ 0 ].name ).toBe( 'News' );
		expect( tree[ 0 ].children ).toEqual( [] );
		expect( tree[ 1 ].name ).toBe( 'Sports' );
	} );

	test( 'nests children under their parent', () => {
		const flat = [
			{ id: 1, name: 'News', parent: 0 },
			{ id: 2, name: 'Local News', parent: 1 },
			{ id: 3, name: 'World News', parent: 1 },
		];

		const tree = buildTermsTree( flat );

		expect( tree ).toHaveLength( 1 );
		expect( tree[ 0 ].name ).toBe( 'News' );
		expect( tree[ 0 ].children ).toHaveLength( 2 );
		expect( tree[ 0 ].children[ 0 ].name ).toBe( 'Local News' );
		expect( tree[ 0 ].children[ 1 ].name ).toBe( 'World News' );
	} );

	test( 'handles multiple levels of nesting', () => {
		const flat = [
			{ id: 1, name: 'Sports', parent: 0 },
			{ id: 2, name: 'Football', parent: 1 },
			{ id: 3, name: 'Premier League', parent: 2 },
		];

		const tree = buildTermsTree( flat );

		expect( tree ).toHaveLength( 1 );
		expect( tree[ 0 ].children[ 0 ].name ).toBe( 'Football' );
		expect( tree[ 0 ].children[ 0 ].children[ 0 ].name ).toBe(
			'Premier League'
		);
	} );

	test( 'handles mixed top-level and nested terms', () => {
		const flat = [
			{ id: 1, name: 'News', parent: 0 },
			{ id: 2, name: 'Local', parent: 1 },
			{ id: 3, name: 'Sports', parent: 0 },
			{ id: 4, name: 'Football', parent: 3 },
		];

		const tree = buildTermsTree( flat );

		expect( tree ).toHaveLength( 2 );
		expect( tree[ 0 ].children ).toHaveLength( 1 );
		expect( tree[ 1 ].children ).toHaveLength( 1 );
	} );

	test( 'returns flat array when terms have no parent field', () => {
		const flat = [
			{ id: 1, name: 'News' },
			{ id: 2, name: 'Sports' },
		];

		const result = buildTermsTree( flat );

		// Should return the terms with children added but not nested,
		// because parent is undefined.
		expect( result ).toHaveLength( 2 );
		expect( result[ 0 ].children ).toEqual( [] );
	} );

	test( 'preserves extra properties on terms', () => {
		const flat = [
			{ id: 1, name: 'News', parent: 0, slug: 'news', count: 5 },
		];

		const tree = buildTermsTree( flat );

		expect( tree[ 0 ].slug ).toBe( 'news' );
		expect( tree[ 0 ].count ).toBe( 5 );
	} );
} );

describe( 'getFilterMatcher', () => {
	// Helper to build a simple tree for testing.
	function makeTree() {
		return buildTermsTree( [
			{ id: 1, name: 'News', parent: 0 },
			{ id: 2, name: 'Local News', parent: 1 },
			{ id: 3, name: 'World News', parent: 1 },
			{ id: 4, name: 'Sports', parent: 0 },
			{ id: 5, name: 'Football', parent: 4 },
			{ id: 6, name: 'Tennis', parent: 4 },
		] );
	}

	test( 'returns all terms when filter is empty string', () => {
		const tree = makeTree();
		const matcher = getFilterMatcher( '' );
		const result = tree.map( matcher ).filter( Boolean );

		expect( result ).toHaveLength( 2 );
	} );

	test( 'filters top-level terms by name', () => {
		const tree = makeTree();
		const matcher = getFilterMatcher( 'sports' );
		const result = tree.map( matcher ).filter( Boolean );

		expect( result ).toHaveLength( 1 );
		expect( result[ 0 ].name ).toBe( 'Sports' );
	} );

	test( 'is case-insensitive', () => {
		const tree = makeTree();
		const matcher = getFilterMatcher( 'SPORTS' );
		const result = tree.map( matcher ).filter( Boolean );

		expect( result ).toHaveLength( 1 );
		expect( result[ 0 ].name ).toBe( 'Sports' );
	} );

	test( 'preserves parent when child matches', () => {
		const tree = makeTree();
		const matcher = getFilterMatcher( 'football' );
		const result = tree.map( matcher ).filter( Boolean );

		// Should return Sports (parent) with Football as its only child.
		expect( result ).toHaveLength( 1 );
		expect( result[ 0 ].name ).toBe( 'Sports' );
		expect( result[ 0 ].children ).toHaveLength( 1 );
		expect( result[ 0 ].children[ 0 ].name ).toBe( 'Football' );
	} );

	test( 'returns false for non-matching terms', () => {
		const tree = makeTree();
		const matcher = getFilterMatcher( 'xyz-no-match' );
		const result = tree.map( matcher ).filter( Boolean );

		expect( result ).toHaveLength( 0 );
	} );

	test( 'partial match works', () => {
		const tree = makeTree();
		const matcher = getFilterMatcher( 'new' );
		const result = tree.map( matcher ).filter( Boolean );

		// "News", "Local News", "World News" all contain "new".
		expect( result ).toHaveLength( 1 );
		expect( result[ 0 ].name ).toBe( 'News' );
		expect( result[ 0 ].children ).toHaveLength( 2 );
	} );

	test( 'does not mutate the original tree', () => {
		const tree = makeTree();
		const originalChildCount = tree[ 1 ].children.length; // Sports has 2 children.
		const matcher = getFilterMatcher( 'football' );
		tree.map( matcher ).filter( Boolean );

		// Original Sports node should still have 2 children.
		expect( tree[ 1 ].children ).toHaveLength( originalChildCount );
	} );
} );

describe( 'unescapeString', () => {
	test( 'decodes HTML entities', () => {
		expect( unescapeString( 'News &amp; Updates' ) ).toBe(
			'News & Updates'
		);
	} );

	test( 'handles strings without entities', () => {
		expect( unescapeString( 'Plain text' ) ).toBe( 'Plain text' );
	} );
} );
