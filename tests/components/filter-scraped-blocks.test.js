/**
 * Backstop filter for scraped editor content.
 *
 * Scraped content is parsed and appended to the editor. If a page-supplied
 * value ever breaks out of its intended block, the parser yields a block the
 * content builder would never emit (e.g. `core/missing`, which renders raw
 * page HTML). filterScrapedBlocks drops any such block — at the top level or
 * nested inside an allowed wrapper — before it reaches the editor.
 *
 * @package press-this
 */

import { filterScrapedBlocks } from '../../src/components/PressThisEditor';

// Minimal stand-in for the block shape @wordpress/blocks parse() returns.
const block = ( name, innerBlocks = [], innerHTML = '' ) => ( {
	name,
	innerHTML,
	innerBlocks,
} );

describe( 'filterScrapedBlocks', () => {
	test( 'keeps the block types the content builder emits', () => {
		const blocks = [
			block( 'core/paragraph' ),
			block( 'core/heading' ),
			block( 'core/quote', [ block( 'core/paragraph' ) ] ),
			block( 'core/list', [ block( 'core/list-item' ) ] ),
			block( 'core/embed' ),
		];
		expect( filterScrapedBlocks( blocks ) ).toHaveLength( blocks.length );
	} );

	test( 'drops a disallowed top-level block', () => {
		const blocks = [
			block( 'core/paragraph' ),
			block( 'core/missing', [], '<iframe src=javascript:alert(1)></iframe>' ),
		];
		const result = filterScrapedBlocks( blocks );
		expect( result ).toHaveLength( 1 );
		expect( result[ 0 ].name ).toBe( 'core/paragraph' );
	} );

	test( 'drops core/html and core/freeform', () => {
		const blocks = [
			block( 'core/html', [], '<script>alert(1)</script>' ),
			block( 'core/freeform', [], '<iframe></iframe>' ),
		];
		expect( filterScrapedBlocks( blocks ) ).toHaveLength( 0 );
	} );

	test( 'drops an allowed wrapper that hides a disallowed descendant', () => {
		const blocks = [
			block( 'core/quote', [
				block( 'core/paragraph' ),
				block( 'core/missing', [], '<iframe></iframe>' ),
			] ),
		];
		expect( filterScrapedBlocks( blocks ) ).toHaveLength( 0 );
	} );

	test( 'drops a disallowed block nested two levels deep', () => {
		const blocks = [
			block( 'core/list', [
				block( 'core/list-item', [ block( 'x/y', [], '<iframe></iframe>' ) ] ),
			] ),
		];
		expect( filterScrapedBlocks( blocks ) ).toHaveLength( 0 );
	} );

	test( 'keeps a wrapper whose descendants are all allowed', () => {
		const blocks = [
			block( 'core/quote', [
				block( 'core/paragraph' ),
				block( 'core/list', [ block( 'core/list-item' ) ] ),
			] ),
		];
		expect( filterScrapedBlocks( blocks ) ).toHaveLength( 1 );
	} );

	test( 'ignores empty freeform whitespace but drops freeform with content', () => {
		expect(
			filterScrapedBlocks( [ block( null, [], '\n\n' ) ] )
		).toHaveLength( 0 );
		expect(
			filterScrapedBlocks( [
				block( 'core/paragraph' ),
				block( null, [], '\n\n' ),
				block( 'core/heading' ),
			] )
		).toHaveLength( 2 );
	} );
} );
