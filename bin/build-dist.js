#!/usr/bin/env node
/**
 * Packages the plugin into dist/press-this/ and press-this.zip.
 *
 * Copies every file in the repository except those matched by .distignore,
 * then checks the result before zipping. Run `npm run build` first (or use
 * `npm run build:dist`, which does both).
 *
 * Both `npm run build:dist` and the Build Release workflow call this script,
 * so .distignore is the only list of excluded files.
 */

/* eslint-disable no-console -- CLI script; console output is its interface. */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );

const ROOT = path.resolve( __dirname, '..' );
const SLUG = 'press-this';
const DIST_DIR = path.join( ROOT, 'dist' );
const PACKAGE_DIR = path.join( DIST_DIR, SLUG );
const ZIP_FILE = path.join( ROOT, `${ SLUG }.zip` );

/*
 * The top-level entries the package is expected to contain, and nothing else.
 *
 * This is a tripwire, not a second copy list: .distignore decides what is
 * copied, and this check fails the build when the result changes shape. When
 * a new file or folder is added at the repository root, the build stops until
 * it is either added to .distignore (dev-only) or listed here (ships to users).
 */
const EXPECTED_TOP_LEVEL = [
	'assets',
	'build',
	'class-wp-press-this-plugin.php',
	'includes',
	'press-this-plugin.php',
	'readme.txt',
];

// Files the plugin cannot run without; catches an over-broad .distignore entry
// or a missing `npm run build`.
const REQUIRED_FILES = [
	'press-this-plugin.php',
	'class-wp-press-this-plugin.php',
	'readme.txt',
	'build/press-this-editor.js',
	'build/press-this-editor.asset.php',
	'assets/bookmarklet.min.js',
];

function fail( message ) {
	console.error( `\nbuild-dist: ${ message }\n` );
	process.exit( 1 );
}

function escapeRegExp( text ) {
	return text.replace( /[.+?^${}()|[\]\\]/g, '\\$&' );
}

/**
 * Parses .distignore into matchers. See the header of .distignore for syntax.
 */
function readDistignore() {
	const file = path.join( ROOT, '.distignore' );
	if ( ! fs.existsSync( file ) ) {
		fail( '.distignore is missing from the repository root.' );
	}

	return fs
		.readFileSync( file, 'utf8' )
		.split( /\r?\n/ )
		.map( ( line ) => line.trim() )
		.filter( ( line ) => line && ! line.startsWith( '#' ) )
		.map( ( line ) => {
			if ( line.startsWith( '!' ) ) {
				fail(
					`negated patterns are not supported in .distignore: "${ line }"`
				);
			}

			let pattern = line;
			const dirOnly = pattern.endsWith( '/' );
			if ( dirOnly ) {
				pattern = pattern.slice( 0, -1 );
			}
			// As in .gitignore, a slash anywhere but the end anchors the pattern.
			const anchored = pattern.includes( '/' );
			pattern = pattern.replace( /^\//, '' );

			const regex = new RegExp(
				'^' +
					pattern.split( '*' ).map( escapeRegExp ).join( '[^/]*' ) +
					'$'
			);

			return { line, anchored, dirOnly, regex };
		} );
}

function isIgnored( matchers, relPath, isDirectory ) {
	const baseName = path.posix.basename( relPath );
	return matchers.some(
		( { anchored, dirOnly, regex } ) =>
			( ! dirOnly || isDirectory ) &&
			regex.test( anchored ? relPath : baseName )
	);
}

/**
 * Copies the repository into PACKAGE_DIR, skipping ignored paths without
 * descending into them.
 *
 * @param {Array<Object>} matchers Parsed .distignore patterns.
 * @param {string}        relDir   Folder to copy, relative to the repository root.
 * @return {number} Number of files copied.
 */
function copyTree( matchers, relDir = '' ) {
	let count = 0;
	const srcDir = path.join( ROOT, relDir );

	for ( const entry of fs.readdirSync( srcDir, { withFileTypes: true } ) ) {
		const relPath = relDir ? `${ relDir }/${ entry.name }` : entry.name;

		if ( isIgnored( matchers, relPath, entry.isDirectory() ) ) {
			continue;
		}

		const dest = path.join( PACKAGE_DIR, relPath );

		if ( entry.isDirectory() ) {
			fs.mkdirSync( dest, { recursive: true } );
			count += copyTree( matchers, relPath );
		} else if ( entry.isFile() ) {
			fs.copyFileSync( path.join( ROOT, relPath ), dest );
			count++;
		} else {
			fail(
				`"${ relPath }" is not a regular file or folder (symlink?). ` +
					'Add it to .distignore or replace it with a real file.'
			);
		}
	}

	return count;
}

function verifyPackage() {
	const actual = fs.readdirSync( PACKAGE_DIR ).sort();
	const unexpected = actual.filter(
		( name ) => ! EXPECTED_TOP_LEVEL.includes( name )
	);
	const missing = EXPECTED_TOP_LEVEL.filter(
		( name ) => ! actual.includes( name )
	);

	if ( unexpected.length ) {
		fail(
			`the package contains unexpected top-level entries: ${ unexpected.join( ', ' ) }\n` +
				'  - If they are for development only, add them to .distignore.\n' +
				'  - If they must ship to users, add them to EXPECTED_TOP_LEVEL in bin/build-dist.js.'
		);
	}

	if ( missing.length ) {
		fail(
			`the package is missing: ${ missing.join( ', ' ) }\n` +
				'  Check that .distignore does not exclude them, or remove them from\n' +
				'  EXPECTED_TOP_LEVEL in bin/build-dist.js if they were deleted on purpose.'
		);
	}

	const absent = REQUIRED_FILES.filter(
		( file ) => ! fs.existsSync( path.join( PACKAGE_DIR, file ) )
	);
	if ( absent.length ) {
		fail(
			`required files are missing from the package: ${ absent.join( ', ' ) }\n` +
				'  Run `npm run build` first, and check .distignore does not exclude them.'
		);
	}
}

function main() {
	const matchers = readDistignore();

	fs.rmSync( DIST_DIR, { recursive: true, force: true } );
	fs.rmSync( ZIP_FILE, { force: true } );
	fs.mkdirSync( PACKAGE_DIR, { recursive: true } );

	const fileCount = copyTree( matchers );
	verifyPackage();

	execFileSync( 'zip', [ '-r', '-q', ZIP_FILE, SLUG ], {
		cwd: DIST_DIR,
		stdio: 'inherit',
	} );

	console.log(
		`Created ${ path.basename( ZIP_FILE ) } (${ fileCount } files).`
	);
}

main();
