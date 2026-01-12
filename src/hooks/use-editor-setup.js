/**
 * Hook for setting up the Press This editor.
 *
 * Handles block registration using @wordpress/block-library.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useEffect, useRef, useState } from '@wordpress/element';
import { registerCoreBlocks } from '@wordpress/block-library';
import {
	unregisterBlockType,
	getBlockTypes,
	getBlockType,
} from '@wordpress/blocks';

// Import block library styles.
import '@wordpress/block-library/build-style/style.css';
import '@wordpress/block-library/build-style/editor.css';

/**
 * Default allowed blocks for Press This editor.
 */
export const DEFAULT_ALLOWED_BLOCKS = [
	'core/paragraph',
	'core/heading',
	'core/image',
	'core/quote',
	'core/list',
	'core/list-item',
	'core/embed',
];

/**
 * Hook to set up the editor with allowed blocks.
 *
 * This hook:
 * 1. Registers core WordPress blocks from @wordpress/block-library
 * 2. Unregisters blocks that are not in the allowed list
 * 3. Tracks setup completion state
 *
 * @param {Object}   options               Options object.
 * @param {string[]} options.allowedBlocks Array of allowed block names.
 * @return {Object} Setup state object with isReady boolean.
 */
export default function useEditorSetup( {
	allowedBlocks = DEFAULT_ALLOWED_BLOCKS,
} ) {
	const hasSetup = useRef( false );
	const [ isReady, setIsReady ] = useState( false );

	useEffect( () => {
		if ( hasSetup.current ) {
			return;
		}

		try {
			// Register all core blocks from @wordpress/block-library.
			// This gives us fully functional blocks with proper edit/save.
			registerCoreBlocks();

			// Get all registered blocks after registration.
			const registeredBlocks = getBlockTypes();

			// Unregister blocks that are not in the allowed list.
			registeredBlocks.forEach( ( block ) => {
				if ( ! allowedBlocks.includes( block.name ) ) {
					try {
						unregisterBlockType( block.name );
					} catch ( error ) {
						// Block may have already been unregistered, ignore error.
					}
				}
			} );

			hasSetup.current = true;
			setIsReady( true );
		} catch ( error ) {
			// eslint-disable-next-line no-console
			console.error(
				'Press This: Error setting up block editor:',
				error
			);
		}
	}, [ allowedBlocks ] );

	return { isReady };
}

/**
 * Get the list of currently registered block types.
 *
 * @return {Array} Array of registered block type objects.
 */
export function getRegisteredBlocks() {
	return getBlockTypes();
}

/**
 * Check if a specific block type is registered.
 *
 * @param {string} blockName Block type name to check.
 * @return {boolean} True if the block is registered.
 */
export function isBlockRegistered( blockName ) {
	return Boolean( getBlockType( blockName ) );
}

/**
 * Filter blocks to only allowed types.
 *
 * @param {Array}    allBlocks     Array of all block type names.
 * @param {string[]} allowedBlocks Array of allowed block names.
 * @return {Array} Filtered array of allowed block names.
 */
export function filterAllowedBlocks( allBlocks, allowedBlocks ) {
	return allBlocks.filter( ( block ) =>
		allowedBlocks.includes( block.name || block )
	);
}
