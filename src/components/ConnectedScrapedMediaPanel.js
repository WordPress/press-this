/**
 * Connected Scraped Media Panel
 *
 * Bridges ScrapedMediaPanel to the block editor store so media is inserted
 * at the user's current cursor position rather than appended at the end of
 * the document. Must be rendered inside a BlockEditorProvider.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useCallback } from '@wordpress/element';
import { useDispatch, useRegistry } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import ScrapedMediaPanel from './ScrapedMediaPanel';

export default function ConnectedScrapedMediaPanel( props ) {
	const { insertBlock } = useDispatch( blockEditorStore );

	// Use the registry of the surrounding BlockEditorProvider so we can
	// query the freshest state at click time. A render-time useSelect would
	// close over potentially-stale values for any click that fires before
	// React commits the next selection change. Reading imperatively here
	// removes that race entirely.
	const registry = useRegistry();

	const handleInsertBlock = useCallback(
		( block ) => {
			const store = registry.select( blockEditorStore );
			const { index, rootClientId } = store.getBlockInsertionPoint();

			// If the cursor is inside a container that doesn't allow this
			// block type (e.g. a core/list, which only accepts list-items),
			// inserting at the cursor would be silently rejected by the
			// block editor's INSERT_BLOCKS reducer. Fall back to a top-level
			// append in that case so the click is never a no-op.
			if (
				rootClientId &&
				! store.canInsertBlockType( block.name, rootClientId )
			) {
				insertBlock( block );
				return;
			}

			insertBlock( block, index, rootClientId );
		},
		[ insertBlock, registry ]
	);

	return (
		<ScrapedMediaPanel { ...props } onInsertBlock={ handleInsertBlock } />
	);
}
