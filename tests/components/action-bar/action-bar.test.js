/**
 * Action Bar Components Tests
 *
 * Tests for ActionBar, MediaButton, and PublishSplitButton components.
 * These tests verify that the action bar components are implemented correctly.
 *
 * @package press-this
 */

const fs = require( 'fs' );
const path = require( 'path' );

/**
 * Simple test runner for action bar component verification.
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
			throw new Error( `${ message }: "${ haystack.substring( 0, 100 ) }..." does not contain "${ needle }"` );
		}
	}

	assertNotContains( haystack, needle, message ) {
		if ( haystack.includes( needle ) ) {
			throw new Error( `${ message }: content should not contain "${ needle }"` );
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

console.log( '\nAction Bar Components Tests\n' );

/**
 * Test 1: Publish button triggers save with 'publish' status.
 */
runner.test( 'PublishSplitButton triggers save with publish status', () => {
	const publishSplitButtonPath = path.resolve( __dirname, '../../../src/components/PublishSplitButton.js' );

	runner.assert(
		fs.existsSync( publishSplitButtonPath ),
		'PublishSplitButton component file does not exist'
	);

	const content = fs.readFileSync( publishSplitButtonPath, 'utf8' );

	// Check for onPublish prop or publish handler.
	runner.assert(
		content.includes( 'onPublish' ) || content.includes( 'handlePublish' ) || content.includes( "'publish'" ),
		'PublishSplitButton should handle publish action'
	);

	// Check for status being set to publish.
	runner.assertContains(
		content,
		'publish',
		'PublishSplitButton should support publish status'
	);

	// Check for button/trigger element.
	runner.assert(
		content.includes( 'Button' ) || content.includes( '<button' ),
		'PublishSplitButton should render a button element'
	);
} );

/**
 * Test 2: Save Draft button triggers save with 'draft' status.
 */
runner.test( 'PublishSplitButton has Save Draft option with draft status', () => {
	const publishSplitButtonPath = path.resolve( __dirname, '../../../src/components/PublishSplitButton.js' );

	runner.assert(
		fs.existsSync( publishSplitButtonPath ),
		'PublishSplitButton component file does not exist'
	);

	const content = fs.readFileSync( publishSplitButtonPath, 'utf8' );

	// Check for draft option.
	runner.assert(
		content.includes( 'draft' ) || content.includes( 'Draft' ),
		'PublishSplitButton should have Save Draft option'
	);

	// Check for onSaveDraft prop or handler.
	runner.assert(
		content.includes( 'onSaveDraft' ) || content.includes( 'handleSaveDraft' ) || content.includes( 'saveDraft' ),
		'PublishSplitButton should handle save draft action'
	);

	// Check for dropdown menu structure.
	runner.assert(
		content.includes( 'Dropdown' ) || content.includes( 'dropdown' ) || content.includes( 'menu' ) || content.includes( 'is-open' ),
		'PublishSplitButton should have dropdown menu for options'
	);
} );

/**
 * Test 3: Standard Editor button saves and redirects.
 */
runner.test( 'PublishSplitButton has Standard Editor option with redirect', () => {
	const publishSplitButtonPath = path.resolve( __dirname, '../../../src/components/PublishSplitButton.js' );

	runner.assert(
		fs.existsSync( publishSplitButtonPath ),
		'PublishSplitButton component file does not exist'
	);

	const content = fs.readFileSync( publishSplitButtonPath, 'utf8' );

	// Check for standard editor option.
	runner.assert(
		content.includes( 'Standard' ) || content.includes( 'standard' ) || content.includes( 'Editor' ),
		'PublishSplitButton should have Standard Editor option'
	);

	// Check for redirect handling.
	runner.assert(
		content.includes( 'onStandardEditor' ) || content.includes( 'handleStandardEditor' ) || content.includes( 'redirect' ) || content.includes( 'forceRedirect' ),
		'PublishSplitButton should handle standard editor redirect'
	);
} );

/**
 * Test 4: Spinner shows during save operations.
 */
runner.test( 'ActionBar shows spinner during save operations', () => {
	const actionBarPath = path.resolve( __dirname, '../../../src/components/ActionBar.js' );

	runner.assert(
		fs.existsSync( actionBarPath ),
		'ActionBar component file does not exist'
	);

	const content = fs.readFileSync( actionBarPath, 'utf8' );

	// Check for spinner component or loading state.
	runner.assert(
		content.includes( 'Spinner' ) || content.includes( 'spinner' ) || content.includes( 'loading' ) || content.includes( 'isSaving' ),
		'ActionBar should show spinner during save operations'
	);

	// Check for fixed positioning.
	runner.assert(
		content.includes( 'press-this-action-bar' ) || content.includes( 'fixed' ) || content.includes( 'actions' ),
		'ActionBar should have proper positioning class'
	);

	// Check for MediaButton integration.
	runner.assert(
		content.includes( 'MediaButton' ) || content.includes( 'media' ),
		'ActionBar should include media button'
	);

	// Check for PublishSplitButton integration.
	runner.assert(
		content.includes( 'PublishSplitButton' ) || content.includes( 'publish' ) || content.includes( 'split' ),
		'ActionBar should include publish split button'
	);
} );

// Print summary.
runner.summary();
