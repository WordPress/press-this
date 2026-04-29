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
import { useDispatch, useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import ScrapedMediaPanel from './ScrapedMediaPanel';

export default function ConnectedScrapedMediaPanel( props ) {
	const { insertBlock } = useDispatch( blockEditorStore );

	// `insertBlock(block)` with no index falls back to appending at the end
	// of the document. Read the live insertion point so the new block lands
	// where the cursor is — fixes #126.
	const { canInsert, insertionPoint } = useSelect( ( select ) => {
		const store = select( blockEditorStore );
		return {
			canInsert: store.canInsertBlockType,
			insertionPoint: store.getBlockInsertionPoint(),
		};
	}, [] );

	const handleInsertBlock = useCallback(
		( block ) => {
			// If the cursor is inside a container that doesn't allow this
			// block type (e.g. a core/list, which only accepts list-items),
			// inserting at the cursor would be silently rejected by the
			// block editor's INSERT_BLOCKS reducer. Fall back to a top-level
			// append in that case so the click is never a no-op.
			if (
				insertionPoint.rootClientId &&
				! canInsert( block.name, insertionPoint.rootClientId )
			) {
				insertBlock( block );
				return;
			}

			insertBlock(
				block,
				insertionPoint.index,
				insertionPoint.rootClientId
			);
		},
		[
			insertBlock,
			canInsert,
			insertionPoint.index,
			insertionPoint.rootClientId,
		]
	);

	return (
		<ScrapedMediaPanel { ...props } onInsertBlock={ handleInsertBlock } />
	);
}
