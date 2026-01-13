/**
 * Undo/Redo Toolbar Tests
 *
 * Tests for undo/redo buttons in the Header component.
 * Verifies buttons render, disabled states, and action dispatching.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Simple test runner for undo/redo verification.
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

	assertContains( haystack, needle, message ) {
		if ( ! haystack.includes( needle ) ) {
			throw new Error( `${ message }: content does not contain "${ needle }"` );
		}
	}

	assertContainsRegex( haystack, regex, message ) {
		if ( ! regex.test( haystack ) ) {
			throw new Error( `${ message }: content does not match pattern` );
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

console.log( '\nUndo/Redo Toolbar Tests\n' );

/**
 * Read Header.js content.
 */
function readHeaderJs() {
	const jsPath = path.resolve( __dirname, '../../src/components/Header.js' );
	try {
		return fs.readFileSync( jsPath, 'utf8' );
	} catch ( error ) {
		console.error( 'Failed to read Header.js' );
		process.exit( 1 );
	}
}

/**
 * Read _app-layout.scss content.
 */
function readAppLayoutScss() {
	const scssPath = path.resolve( __dirname, '../../src/styles/partials/_app-layout.scss' );
	try {
		return fs.readFileSync( scssPath, 'utf8' );
	} catch ( error ) {
		console.error( 'Failed to read _app-layout.scss' );
		process.exit( 1 );
	}
}

const headerContent = readHeaderJs();
const scssContent = readAppLayoutScss();

/**
 * Test 1: Header imports undo/redo dependencies from @wordpress packages.
 */
runner.test( 'Header imports undo/redo dependencies', () => {
	// Check useSelect import.
	runner.assertContains(
		headerContent,
		'useSelect',
		'Header should import useSelect from @wordpress/data'
	);

	// Check useDispatch import.
	runner.assertContains(
		headerContent,
		'useDispatch',
		'Header should import useDispatch from @wordpress/data'
	);

	// Check undo icon import.
	runner.assertContainsRegex(
		headerContent,
		/import\s*{[^}]*undo[^}]*}\s*from\s*['"]@wordpress\/icons['"]/,
		'Header should import undo icon from @wordpress/icons'
	);

	// Check redo icon import.
	runner.assertContainsRegex(
		headerContent,
		/import\s*{[^}]*redo[^}]*}\s*from\s*['"]@wordpress\/icons['"]/,
		'Header should import redo icon from @wordpress/icons'
	);
} );

/**
 * Test 2: Header uses useSelect for undo/redo state.
 */
runner.test( 'Header uses useSelect for undo/redo state', () => {
	// Check hasUndo selector.
	runner.assertContains(
		headerContent,
		'hasUndo',
		'Header should select hasUndo state'
	);

	// Check hasRedo selector.
	runner.assertContains(
		headerContent,
		'hasRedo',
		'Header should select hasRedo state'
	);

	// Check it references block-editor store.
	runner.assertContainsRegex(
		headerContent,
		/useSelect.*block-editor|blockEditorStore/s,
		'Header should use block-editor store for undo/redo state'
	);
} );

/**
 * Test 3: Header has undo button with proper attributes.
 */
runner.test( 'Undo button renders with correct attributes', () => {
	// Check undo button exists with icon.
	runner.assertContainsRegex(
		headerContent,
		/icon\s*=\s*\{?\s*undoIcon\s*\}?/,
		'Undo button should use undoIcon'
	);

	// Check disabled state tied to hasUndo.
	runner.assertContainsRegex(
		headerContent,
		/disabled\s*=\s*\{?\s*!?\s*hasUndo\s*\}?/,
		'Undo button should be disabled based on hasUndo'
	);

	// Check aria-label for accessibility.
	runner.assertContainsRegex(
		headerContent,
		/aria-label.*[Uu]ndo/,
		'Undo button should have accessible aria-label'
	);
} );

/**
 * Test 4: Header has redo button with proper attributes.
 */
runner.test( 'Redo button renders with correct attributes', () => {
	// Check redo button exists with icon.
	runner.assertContainsRegex(
		headerContent,
		/icon\s*=\s*\{?\s*redoIcon\s*\}?/,
		'Redo button should use redoIcon'
	);

	// Check disabled state tied to hasRedo.
	runner.assertContainsRegex(
		headerContent,
		/disabled\s*=\s*\{?\s*!?\s*hasRedo\s*\}?/,
		'Redo button should be disabled based on hasRedo'
	);

	// Check aria-label for accessibility.
	runner.assertContainsRegex(
		headerContent,
		/aria-label.*[Rr]edo/,
		'Redo button should have accessible aria-label'
	);
} );

/**
 * Test 5: Header dispatches undo/redo actions on button click.
 */
runner.test( 'Buttons dispatch undo/redo actions', () => {
	// Check useDispatch is called for undo/redo.
	runner.assertContainsRegex(
		headerContent,
		/useDispatch.*block-editor|blockEditorStore/s,
		'Header should use useDispatch with block-editor store'
	);

	// Check undo action is called.
	runner.assertContainsRegex(
		headerContent,
		/onClick\s*=\s*\{?\s*undo\s*\}?/,
		'Undo button should call undo on click'
	);

	// Check redo action is called.
	runner.assertContainsRegex(
		headerContent,
		/onClick\s*=\s*\{?\s*redo\s*\}?/,
		'Redo button should call redo on click'
	);
} );

/**
 * Test 6: Toolbar section styles exist in SCSS.
 */
runner.test( 'Toolbar section has proper styles', () => {
	// Check toolbar section class exists.
	runner.assertContains(
		scssContent,
		'.press-this-header__toolbar',
		'Toolbar section styles should exist'
	);

	// Check flex layout for toolbar.
	runner.assertContainsRegex(
		scssContent,
		/\.press-this-header__toolbar[^{]*\{[^}]*display:\s*flex/,
		'Toolbar should use flex layout'
	);

	// Check toolbar button styling exists.
	runner.assertContains(
		scssContent,
		'.press-this-header__toolbar-button',
		'Toolbar button styles should exist'
	);
} );

// Print summary.
runner.summary();
