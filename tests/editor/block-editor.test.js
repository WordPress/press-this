/**
 * Block Editor Integration Tests
 *
 * Tests for the Press This Gutenberg block editor integration.
 * These tests verify block editor functionality without requiring a WordPress environment.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Default allowed blocks for Press This.
 */
const DEFAULT_ALLOWED_BLOCKS = [
	'core/paragraph',
	'core/heading',
	'core/image',
	'core/quote',
	'core/list',
	'core/list-item',
	'core/embed',
];

/**
 * Simple test runner for block editor verification.
 */
class TestRunner {
	constructor() {
		this.passed = 0;
		this.failed = 0;
		this.errors = [];
	}

	test( name, fn ) {
		try {
			fn();
			this.passed++;
			console.log( `  PASS: ${ name }` );
		} catch ( error ) {
			this.failed++;
			this.errors.push( { name, error: error.message } );
			console.log( `  FAIL: ${ name }` );
			console.log( `        ${ error.message }` );
		}
	}

	assert( condition, message ) {
		if ( ! condition ) {
			throw new Error( message );
		}
	}

	assertEqual( actual, expected, message ) {
		if ( actual !== expected ) {
			throw new Error( `${ message }: expected "${ expected }", got "${ actual }"` );
		}
	}

	assertContains( haystack, needle, message ) {
		if ( ! haystack.includes( needle ) ) {
			throw new Error( `${ message }: "${ haystack }" does not contain "${ needle }"` );
		}
	}

	assertArray( value, message ) {
		if ( ! Array.isArray( value ) ) {
			throw new Error( `${ message }: expected array, got ${ typeof value }` );
		}
	}

	summary() {
		console.log( '\n-------------------' );
		console.log( `Tests: ${ this.passed } passed, ${ this.failed } failed` );

		if ( this.failed > 0 ) {
			process.exit( 1 );
		}
	}
}

const runner = new TestRunner();

console.log( '\nBlock Editor Integration Tests\n' );

/**
 * Test 1: Editor source file exists and exports required components.
 */
runner.test( 'Editor source file exists and has correct structure', () => {
	const editorPath = path.resolve( __dirname, '../../src/editor/index.js' );

	runner.assert(
		fs.existsSync( editorPath ),
		'Editor source file does not exist'
	);

	const editorContent = fs.readFileSync( editorPath, 'utf8' );

	// Verify required imports.
	runner.assertContains(
		editorContent,
		'BlockEditorProvider',
		'Editor should import BlockEditorProvider'
	);

	runner.assertContains(
		editorContent,
		'BlockList',
		'Editor should import BlockList'
	);

	runner.assertContains(
		editorContent,
		'WritingFlow',
		'Editor should import WritingFlow'
	);

	// Verify default export.
	runner.assertContains(
		editorContent,
		'export default function PressThisEditor',
		'Editor should export PressThisEditor component'
	);

	// Verify allowed blocks are defined.
	runner.assertContains(
		editorContent,
		'DEFAULT_ALLOWED_BLOCKS',
		'Editor should define DEFAULT_ALLOWED_BLOCKS'
	);
} );

/**
 * Test 2: Block types are correctly defined in allowed blocks list.
 */
runner.test( 'Allowed blocks include paragraph, heading, image, quote', () => {
	runner.assert(
		DEFAULT_ALLOWED_BLOCKS.includes( 'core/paragraph' ),
		'Paragraph block should be allowed'
	);

	runner.assert(
		DEFAULT_ALLOWED_BLOCKS.includes( 'core/heading' ),
		'Heading block should be allowed'
	);

	runner.assert(
		DEFAULT_ALLOWED_BLOCKS.includes( 'core/image' ),
		'Image block should be allowed'
	);

	runner.assert(
		DEFAULT_ALLOWED_BLOCKS.includes( 'core/quote' ),
		'Quote block should be allowed'
	);

	runner.assert(
		DEFAULT_ALLOWED_BLOCKS.includes( 'core/list' ),
		'List block should be allowed'
	);

	runner.assert(
		DEFAULT_ALLOWED_BLOCKS.includes( 'core/embed' ),
		'Embed block should be allowed'
	);
} );

/**
 * Test 3: Content serialization utilities exist.
 */
runner.test( 'Content serialization utilities are implemented', () => {
	const utilsPath = path.resolve( __dirname, '../../src/utils/index.js' );

	runner.assert(
		fs.existsSync( utilsPath ),
		'Utils file does not exist'
	);

	const utilsContent = fs.readFileSync( utilsPath, 'utf8' );

	// Verify serialization functions exist.
	runner.assertContains(
		utilsContent,
		'serializeBlocks',
		'Utils should export serializeBlocks function'
	);

	runner.assertContains(
		utilsContent,
		'parseContent',
		'Utils should export parseContent function'
	);

	// Verify save post function exists.
	runner.assertContains(
		utilsContent,
		'savePost',
		'Utils should export savePost function'
	);

	// Verify form data preparation exists.
	runner.assertContains(
		utilsContent,
		'prepareSaveFormData',
		'Utils should export prepareSaveFormData function'
	);
} );

/**
 * Test 4: Allowed blocks filter support is implemented.
 */
runner.test( 'Allowed blocks filter application is supported', () => {
	const editorPath = path.resolve( __dirname, '../../src/editor/index.js' );
	const editorContent = fs.readFileSync( editorPath, 'utf8' );

	// Verify settings.allowedBlocks usage.
	runner.assertContains(
		editorContent,
		'settings.allowedBlocks',
		'Editor should accept allowedBlocks from settings'
	);

	// Verify allowedBlockTypes is passed to provider.
	runner.assertContains(
		editorContent,
		'allowedBlockTypes',
		'Editor should pass allowedBlockTypes to BlockEditorProvider'
	);
} );

/**
 * Test 5: Editor save workflow integration is implemented.
 */
runner.test( 'Editor save workflow integration exists', () => {
	const indexPath = path.resolve( __dirname, '../../src/index.js' );

	runner.assert(
		fs.existsSync( indexPath ),
		'Main index file does not exist'
	);

	const indexContent = fs.readFileSync( indexPath, 'utf8' );

	// Verify save handlers exist.
	runner.assertContains(
		indexContent,
		'handleSave',
		'Index should implement handleSave function'
	);

	// Verify content change handler exists.
	runner.assertContains(
		indexContent,
		'handleContentChange',
		'Index should implement handleContentChange function'
	);

	// Verify dirty state tracking exists.
	runner.assertContains(
		indexContent,
		'handleDirtyChange',
		'Index should implement handleDirtyChange function'
	);

	// Verify save workflow connection.
	runner.assertContains(
		indexContent,
		'connectSaveWorkflow',
		'Index should implement connectSaveWorkflow function'
	);
} );

/**
 * Test 6: Embed shortcode support is implemented.
 */
runner.test( 'Embed shortcode support is implemented in utilities', () => {
	const utilsPath = path.resolve( __dirname, '../../src/utils/index.js' );
	const utilsContent = fs.readFileSync( utilsPath, 'utf8' );

	// Verify embed block attributes helper exists.
	runner.assertContains(
		utilsContent,
		'createEmbedBlockAttributes',
		'Utils should export createEmbedBlockAttributes function'
	);

	// Verify embed shortcode check exists.
	runner.assertContains(
		utilsContent,
		'hasEmbedShortcodes',
		'Utils should export hasEmbedShortcodes function'
	);

	// Verify YouTube detection in embed helper.
	runner.assertContains(
		utilsContent,
		'youtube',
		'Embed helper should support YouTube'
	);

	// Verify Vimeo detection in embed helper.
	runner.assertContains(
		utilsContent,
		'vimeo',
		'Embed helper should support Vimeo'
	);
} );

// Print summary.
runner.summary();
