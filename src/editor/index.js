/**
 * Press This Editor Component
 *
 * Main editor component that wraps the Gutenberg block editor.
 * Handles block editing, content serialization, and save workflow.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import {
	useState,
	useMemo,
	useCallback,
	useEffect,
	useRef,
} from '@wordpress/element';
import {
	BlockEditorProvider,
	BlockList,
	BlockTools,
	WritingFlow,
	Inserter,
} from '@wordpress/block-editor';
import { parse, serialize, createBlock } from '@wordpress/blocks';
import { SlotFillProvider, Popover } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useEditorSetup } from '../hooks';

/**
 * Default allowed blocks for Press This.
 * This list can be filtered via `press_this_allowed_blocks` PHP filter.
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
 * Press This Editor Component
 *
 * @param {Object}   props                 Component props.
 * @param {Object}   props.settings        Editor settings from PHP.
 * @param {Object}   props.initialData     Initial scraped data from bookmarklet.
 * @param {Function} props.onContentChange Callback when content changes.
 * @param {Function} props.onDirtyChange   Callback when dirty state changes.
 * @return {JSX.Element} The editor component.
 */
export default function PressThisEditor( {
	settings = {},
	initialData = {},
	onContentChange,
	onDirtyChange,
} ) {
	// Set up allowed blocks from settings or use defaults.
	const allowedBlocks = settings.allowedBlocks || DEFAULT_ALLOWED_BLOCKS;

	// Track initial content for dirty state comparison.
	const initialContentRef = useRef( initialData.content || '' );

	// Initialize blocks from initial content.
	const initialBlocks = useMemo( () => {
		if ( initialData.content ) {
			return parse( initialData.content );
		}
		return [];
	}, [ initialData.content ] );

	// Editor state.
	const [ blocks, setBlocks ] = useState( initialBlocks );
	const [ isDirty, setIsDirty ] = useState( false );

	// Set up the editor (register blocks, etc.).
	useEditorSetup( { allowedBlocks } );

	/**
	 * Handle block changes and update dirty state.
	 *
	 * @param {Array} newBlocks The updated blocks array.
	 */
	const handleBlocksChange = useCallback(
		( newBlocks ) => {
			setBlocks( newBlocks );

			// Serialize current content for comparison.
			const currentContent = serialize( newBlocks );
			const hasChanged = currentContent !== initialContentRef.current;

			if ( hasChanged !== isDirty ) {
				setIsDirty( hasChanged );
				if ( onDirtyChange ) {
					onDirtyChange( hasChanged );
				}
			}

			// Notify parent of content change.
			if ( onContentChange ) {
				onContentChange( currentContent );
			}

			// Update the hidden form field for save.
			updateHiddenContentField( currentContent );
		},
		[ isDirty, onContentChange, onDirtyChange ]
	);

	/**
	 * Update the hidden form field with serialized content.
	 *
	 * @param {string} content The serialized block content.
	 */
	const updateHiddenContentField = ( content ) => {
		const contentField = document.getElementById( 'post_content' );
		if ( contentField ) {
			contentField.value = content;
		}
	};

	/**
	 * Get the current serialized content.
	 *
	 * @return {string} Serialized HTML content.
	 */
	const getSerializedContent = useCallback( () => {
		return serialize( blocks );
	}, [ blocks ] );

	/**
	 * Insert a block into the editor.
	 *
	 * @param {string} blockName  The block type name.
	 * @param {Object} attributes Block attributes.
	 */
	const insertBlock = useCallback(
		( blockName, attributes = {} ) => {
			if ( ! allowedBlocks.includes( blockName ) ) {
				return;
			}

			const newBlock = createBlock( blockName, attributes );
			const newBlocks = [ ...blocks, newBlock ];
			handleBlocksChange( newBlocks );
		},
		[ blocks, allowedBlocks, handleBlocksChange ]
	);

	/**
	 * Insert an image block with the specified URL.
	 *
	 * @param {string} url   Image URL.
	 * @param {string} alt   Alt text.
	 * @param {string} title Image title.
	 */
	const insertImage = useCallback(
		( url, alt = '', title = '' ) => {
			insertBlock( 'core/image', { url, alt, title } );
		},
		[ insertBlock ]
	);

	/**
	 * Insert an embed block with the specified URL.
	 *
	 * @param {string} url Embed URL.
	 */
	const insertEmbed = useCallback(
		( url ) => {
			insertBlock( 'core/embed', { url } );
		},
		[ insertBlock ]
	);

	// Expose methods to parent via ref or window for integration.
	useEffect( () => {
		// Expose editor API to window for integration with existing Press This code.
		window.pressThisEditor = {
			getContent: getSerializedContent,
			insertBlock,
			insertImage,
			insertEmbed,
			isDirty: () => isDirty,
		};

		return () => {
			delete window.pressThisEditor;
		};
	}, [
		getSerializedContent,
		insertBlock,
		insertImage,
		insertEmbed,
		isDirty,
	] );

	// Warn user about unsaved changes.
	useEffect( () => {
		const handleBeforeUnload = ( event ) => {
			if ( isDirty ) {
				const message = __(
					'The changes you made will be lost if you navigate away from this page.',
					'press-this'
				);
				event.returnValue = message;
				return message;
			}
		};

		window.addEventListener( 'beforeunload', handleBeforeUnload );

		return () => {
			window.removeEventListener( 'beforeunload', handleBeforeUnload );
		};
	}, [ isDirty ] );

	// Editor settings for BlockEditorProvider.
	const editorSettings = useMemo(
		() => ( {
			allowedBlockTypes: allowedBlocks,
			hasFixedToolbar: true,
			isDistractionFree: false,
			bodyPlaceholder: __(
				'Start writing or press / to choose a block',
				'press-this'
			),
			// Disable features not needed in popup context.
			__experimentalFeatures: {
				border: {
					color: false,
					radius: false,
					style: false,
					width: false,
				},
			},
			...settings,
		} ),
		[ allowedBlocks, settings ]
	);

	return (
		<SlotFillProvider>
			<BlockEditorProvider
				value={ blocks }
				onInput={ handleBlocksChange }
				onChange={ handleBlocksChange }
				settings={ editorSettings }
			>
				<div className="press-this-editor__container">
					<div className="press-this-editor__inserter">
						<Inserter
							position="bottom right"
							showInserterHelpPanel={ false }
							__experimentalIsQuick
						/>
					</div>
					<div className="press-this-editor__content">
						<BlockTools>
							<WritingFlow>
								<BlockList />
							</WritingFlow>
						</BlockTools>
					</div>
				</div>
				<Popover.Slot />
			</BlockEditorProvider>
		</SlotFillProvider>
	);
}

/**
 * Export utility functions for external use.
 */
export { serialize, parse, createBlock };
