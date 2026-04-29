/**
 * Connected Scraped Media Panel
 *
 * Bridges ScrapedMediaPanel to the block editor store so media is inserted
 * at the user's current cursor position rather than appended at the end of
 * the document. Must be rendered inside a BlockEditorProvider.
 *
 * @package
 */

import { useCallback } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

import ScrapedMediaPanel from './ScrapedMediaPanel';

export default function ConnectedScrapedMediaPanel( props ) {
	const { insertBlock } = useDispatch( blockEditorStore );

	// `insertBlock(block)` with no index falls back to appending at the end
	// of the document. Read the live insertion point so the new block lands
	// where the cursor is — fixes #126.
	const insertionPoint = useSelect(
		( select ) => select( blockEditorStore ).getBlockInsertionPoint(),
		[]
	);

	const handleInsertBlock = useCallback(
		( block ) => {
			insertBlock(
				block,
				insertionPoint.index,
				insertionPoint.rootClientId
			);
		},
		[ insertBlock, insertionPoint.index, insertionPoint.rootClientId ]
	);

	return (
		<ScrapedMediaPanel { ...props } onInsertBlock={ handleInsertBlock } />
	);
}
