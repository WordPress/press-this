/**
 * Undo/Redo Tests
 *
 * Tests the undo/redo implementation across Header.js (toolbar buttons)
 * and PressThisEditor.js (undo stack + keyboard shortcuts).
 *
 * Follows the source-file string-matching pattern used by other component tests.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Undo/Redo: Header toolbar buttons', () => {
	let headerContent;

	beforeAll( () => {
		const headerPath = path.resolve(
			__dirname,
			'../../src/components/Header.js'
		);
		headerContent = fs.readFileSync( headerPath, 'utf8' );
	} );

	test( 'Header accepts onUndo, onRedo, hasUndo, hasRedo props', () => {
		expect( headerContent ).toContain( 'onUndo' );
		expect( headerContent ).toContain( 'onRedo' );
		expect( headerContent ).toContain( 'hasUndo' );
		expect( headerContent ).toContain( 'hasRedo' );
	} );

	test( 'Undo button is wired to onUndo and disabled when no undo available', () => {
		expect( headerContent ).toContain( 'onClick={ onUndo }' );
		expect( headerContent ).toContain( 'disabled={ ! hasUndo }' );
	} );

	test( 'Redo button is wired to onRedo and disabled when no redo available', () => {
		expect( headerContent ).toContain( 'onClick={ onRedo }' );
		expect( headerContent ).toContain( 'disabled={ ! hasRedo }' );
	} );

	test( 'Undo/redo icons imported from @wordpress/icons', () => {
		expect( headerContent ).toMatch(
			/import\s*\{[^}]*undo as undoIcon[^}]*\}\s*from\s*['"]@wordpress\/icons['"]/
		);
		expect( headerContent ).toMatch(
			/import\s*\{[^}]*redo as redoIcon[^}]*\}\s*from\s*['"]@wordpress\/icons['"]/
		);
	} );

	test( 'Buttons use the imported icons', () => {
		expect( headerContent ).toContain( 'icon={ undoIcon }' );
		expect( headerContent ).toContain( 'icon={ redoIcon }' );
	} );
} );

describe( 'Undo/Redo: PressThisEditor stack and shortcuts', () => {
	let editorContent;

	beforeAll( () => {
		const editorPath = path.resolve(
			__dirname,
			'../../src/components/PressThisEditor.js'
		);
		editorContent = fs.readFileSync( editorPath, 'utf8' );
	} );

	test( 'Undo/redo refs are declared', () => {
		expect( editorContent ).toContain( 'undoStackRef' );
		expect( editorContent ).toContain( 'redoStackRef' );
		expect( editorContent ).toContain( 'isUndoingRef' );
	} );

	test( 'handleUndo and handleRedo callbacks are defined', () => {
		expect( editorContent ).toMatch( /const\s+handleUndo\s*=\s*useCallback/ );
		expect( editorContent ).toMatch( /const\s+handleRedo\s*=\s*useCallback/ );
	} );

	test( 'onUndoReady prop is accepted and called with handlers', () => {
		// Prop in function signature.
		expect( editorContent ).toContain( 'onUndoReady' );

		// Called with the handler object.
		expect( editorContent ).toMatch(
			/onUndoReady\(\s*\{\s*handleUndo\s*,\s*handleRedo\s*,\s*hasUndo\s*,\s*hasRedo\s*\}\s*\)/
		);
	} );

	test( 'Keyboard shortcut listener registered on document keydown', () => {
		expect( editorContent ).toContain(
			"document.addEventListener( 'keydown', handleKeyDown )"
		);
		expect( editorContent ).toContain(
			"document.removeEventListener( 'keydown', handleKeyDown )"
		);
	} );

	test( 'Form fields excluded from keyboard shortcuts', () => {
		expect( editorContent ).toContain( "'input'" );
		expect( editorContent ).toContain( "'textarea'" );
		expect( editorContent ).toContain( "'select'" );
	} );

	test( 'Ctrl+Y restricted to ctrlKey && ! event.metaKey (Windows/Linux only)', () => {
		expect( editorContent ).toMatch(
			/key\s*===\s*'y'[\s\S]*?event\.ctrlKey[\s\S]*?!\s*event\.metaKey/
		);
	} );

	test( 'isUndoingRef reset happens after setBlocks in handleUndo/handleRedo', () => {
		// The fix ensures reset is AFTER setBlocks, not before.

		// Check handleUndo ordering.
		const handleUndoMatch = editorContent.match(
			/const\s+handleUndo\s*=\s*useCallback\(\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[/
		);
		expect( handleUndoMatch ).not.toBeNull();

		const undoBody = handleUndoMatch[ 1 ];
		const setBlocksPosUndo = undoBody.indexOf( 'setBlocks(' );
		const resetPosUndo = undoBody.lastIndexOf( 'isUndoingRef.current = false' );
		expect( setBlocksPosUndo ).toBeGreaterThan( -1 );
		expect( resetPosUndo ).toBeGreaterThan( setBlocksPosUndo );

		// Check handleRedo ordering.
		const handleRedoMatch = editorContent.match(
			/const\s+handleRedo\s*=\s*useCallback\(\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[/
		);
		expect( handleRedoMatch ).not.toBeNull();

		const redoBody = handleRedoMatch[ 1 ];
		const setBlocksPosRedo = redoBody.indexOf( 'setBlocks(' );
		const resetPosRedo = redoBody.lastIndexOf( 'isUndoingRef.current = false' );
		expect( setBlocksPosRedo ).toBeGreaterThan( -1 );
		expect( resetPosRedo ).toBeGreaterThan( setBlocksPosRedo );
	} );

	test( 'handleBlocksChange checks isUndoingRef to skip undo levels during undo/redo', () => {
		expect( editorContent ).toMatch(
			/handleBlocksChange[\s\S]*?isUndoingRef\.current/
		);
	} );
} );

describe( 'Standalone mode: PressThisEditor', () => {
	let editorContent;

	beforeAll( () => {
		const editorPath = path.resolve(
			__dirname,
			'../../src/components/PressThisEditor.js'
		);
		editorContent = fs.readFileSync( editorPath, 'utf8' );
	} );

	test( 'isStandaloneMode guards matchMedia availability', () => {
		expect( editorContent ).toContain( "typeof window.matchMedia === 'function'" );
	} );

	test( 'performSafeRedirect checks standalone mode before opener redirect', () => {
		// isStandaloneMode is called inside performSafeRedirect.
		expect( editorContent ).toMatch(
			/performSafeRedirect[\s\S]*?isStandaloneMode\(\)/
		);
	} );

	test( 'Standalone mode redirects self instead of using opener', () => {
		// In standalone mode, redirect goes to window.location.href directly.
		const standaloneBlock = editorContent.match(
			/if\s*\(\s*isStandaloneMode\(\)\s*\)\s*\{([\s\S]*?)\}/
		);
		expect( standaloneBlock ).not.toBeNull();
		expect( standaloneBlock[ 1 ] ).toContain( 'window.location.href' );
	} );
} );
