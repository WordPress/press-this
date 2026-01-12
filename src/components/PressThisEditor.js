/**
 * Press This Editor Component
 *
 * Native Gutenberg editor wrapper using @wordpress/editor.
 * Provides the full editing experience with native sidebar and publish flow.
 *
 * @package
 */

/**
 * WordPress dependencies
 */
import { useMemo, useCallback, useState, useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { parse } from '@wordpress/blocks';
import {
	BlockEditorProvider,
	BlockList,
	BlockTools,
	WritingFlow,
	ObserveTyping,
	BlockEditorKeyboardShortcuts,
	BlockToolbar,
	BlockInspector,
	Inserter,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	SlotFillProvider,
	Popover,
	Button,
	Spinner,
	DropdownMenu,
	MenuGroup,
	MenuItem,
	Snackbar,
	Panel,
	PanelBody,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { registerCoreBlocks } from '@wordpress/block-library';

/**
 * Internal dependencies
 */
import ScrapedMediaPanel from './ScrapedMediaPanel';
import FeaturedImagePanel from './FeaturedImagePanel';

/**
 * Sidebar Block Inspector component.
 *
 * This must be a separate component to access BlockEditorProvider context.
 *
 * @return {JSX.Element|null} Block Inspector panel or null if no block selected.
 */
function SidebarBlockInspector() {
	const hasSelectedBlock = useSelect( ( select ) => {
		const { getSelectedBlockClientId } = select( blockEditorStore );
		return !! getSelectedBlockClientId();
	}, [] );

	if ( ! hasSelectedBlock ) {
		return null;
	}

	return (
		<PanelBody
			title={ __( 'Block Settings', 'press-this' ) }
			initialOpen={ true }
		>
			<BlockInspector />
		</PanelBody>
	);
}

// Ensure core blocks are registered.
let blocksRegistered = false;
function ensureBlocksRegistered() {
	if ( ! blocksRegistered ) {
		registerCoreBlocks();
		blocksRegistered = true;
	}
}

/**
 * Press This Editor component.
 *
 * @param {Object}   props                    Component props.
 * @param {Object}   props.post               Post object with ID, title, content.
 * @param {Object}   props.settings           Editor settings.
 * @param {Array}    props.images             Scraped images from source.
 * @param {Array}    props.embeds             Scraped embeds from source.
 * @param {Object}   props.categories         Available categories.
 * @param {Array}    props.postFormats        Available post formats.
 * @param {Object}   props.capabilities       User capabilities.
 * @param {Object}   props.restConfig         REST API configuration.
 * @param {string}   props.sourceUrl          Source URL being clipped.
 * @param {Object}   props.pendingScrape      Pending scraped content to append.
 * @param {Function} props.onScrapeProcessed  Callback after scrape is processed.
 * @return {JSX.Element} Press This Editor component.
 */
export default function PressThisEditor( {
	post,
	settings,
	images = [],
	embeds = [],
	categories = [],
	postFormats = [],
	capabilities = {},
	restConfig = {},
	sourceUrl = '',
	pendingScrape = null,
	onScrapeProcessed = () => {},
} ) {
	// Register blocks on mount.
	useEffect( () => {
		ensureBlocksRegistered();
	}, [] );

	// State for blocks and post data.
	const [ blocks, setBlocks ] = useState( [] );
	const [ title, setTitle ] = useState( post.title || '' );
	const [ postFormat, setPostFormat ] = useState( settings.suggestedPostFormat || '' );
	const [ selectedCategories, setSelectedCategories ] = useState( [] );
	const [ tags, setTags ] = useState( [] );
	const [ featuredImageId, setFeaturedImageId ] = useState( 0 );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ isReady, setIsReady ] = useState( false );
	const [ notice, setNotice ] = useState( null );

	// Parse initial content.
	useEffect( () => {
		if ( post.content ) {
			const parsedBlocks = parse( post.content );
			setBlocks( parsedBlocks );
		}
		setIsReady( true );
	}, [ post.content ] );

	// Handle pending scraped content - append to existing content.
	useEffect( () => {
		if ( ! pendingScrape ) {
			return;
		}

		// Only set title if current title is empty.
		if ( ! title.trim() && pendingScrape.title ) {
			setTitle( pendingScrape.title );
		}

		// Parse and append the scraped content blocks.
		if ( pendingScrape.content ) {
			const newBlocks = parse( pendingScrape.content );
			setBlocks( ( prevBlocks ) => [ ...prevBlocks, ...newBlocks ] );
		}

		// Notify parent that we've processed the scrape.
		onScrapeProcessed();
	}, [ pendingScrape, onScrapeProcessed ] ); // eslint-disable-line react-hooks/exhaustive-deps

	/**
	 * Handle block changes.
	 *
	 * @param {Array} newBlocks Updated blocks.
	 */
	const handleBlocksChange = useCallback( ( newBlocks ) => {
		setBlocks( newBlocks );
	}, [] );

	/**
	 * Insert a block into the editor.
	 *
	 * @param {Object} block Block to insert.
	 */
	const insertBlock = useCallback( ( block ) => {
		setBlocks( ( prev ) => [ ...prev, block ] );
	}, [] );

	/**
	 * Handle save operation.
	 *
	 * @param {string} status  Post status (draft, publish).
	 * @param {Object} options Save options.
	 */
	const handleSave = useCallback( async ( status = 'draft', options = {} ) => {
		setIsSaving( true );

		try {
			const { serialize } = await import( '@wordpress/blocks' );
			const content = serialize( blocks );

			const response = await fetch( `${ restConfig.restUrl }save`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': restConfig.restNonce,
				},
				body: JSON.stringify( {
					post_id: post.id,
					title,
					content,
					status,
					format: postFormat,
					categories: selectedCategories,
					tags,
					featured_image: featuredImageId,
					force_redirect: options.forceRedirect || false,
				} ),
			} );

			const result = await response.json();

			if ( response.ok && result.success ) {
				if ( result.redirect ) {
					if ( result.force ) {
						window.location.href = result.redirect;
					} else if ( restConfig.redirInParent && window.opener ) {
						window.opener.location.href = result.redirect;
						window.close();
					} else {
						window.location.href = result.redirect;
					}
				} else {
					// No redirect - show success notice.
					setNotice( {
						status: 'success',
						message: __( 'Draft saved.', 'press-this' ),
					} );
				}
			} else {
				setNotice( {
					status: 'error',
					message: result.message || __( 'Error saving post.', 'press-this' ),
				} );
			}
		} catch ( error ) {
			setNotice( {
				status: 'error',
				message: __( 'Error saving post.', 'press-this' ),
			} );
		} finally {
			setIsSaving( false );
		}
	}, [ blocks, title, postFormat, selectedCategories, tags, featuredImageId, post.id, restConfig ] );

	/**
	 * Handle title change.
	 *
	 * @param {Event} event Input event.
	 */
	const handleTitleChange = useCallback( ( event ) => {
		setTitle( event.target.value );
	}, [] );

	/**
	 * Handle title keydown - move to blocks on Enter.
	 *
	 * @param {KeyboardEvent} event Key event.
	 */
	const handleTitleKeyDown = useCallback( ( event ) => {
		if ( event.key === 'Enter' ) {
			event.preventDefault();
			const blockList = document.querySelector( '.block-editor-block-list__layout' );
			if ( blockList ) {
				const firstBlock = blockList.querySelector( '[data-block]' );
				if ( firstBlock ) {
					firstBlock.focus();
				}
			}
		}
	}, [] );

	// Editor settings.
	const editorSettings = useMemo( () => ( {
		allowedBlockTypes: settings.allowedBlocks,
		hasFixedToolbar: true,
		bodyPlaceholder: __( 'Start writing or press / to choose a block', 'press-this' ),
		isRTL: settings.isRTL,
		// Enable media upload for Featured Image panel.
		mediaUpload: capabilities.canUploadFiles ? ( { onFileChange } ) => {
			// Default upload handler - uses WordPress media library.
			onFileChange( [] );
		} : undefined,
	} ), [ settings, capabilities.canUploadFiles ] );

	// Publish button label.
	const publishLabel = capabilities.canPublish
		? __( 'Publish', 'press-this' )
		: __( 'Submit for Review', 'press-this' );

	if ( ! isReady ) {
		return (
			<div className="press-this-loading">
				<Spinner />
				{ __( 'Loading editor...', 'press-this' ) }
			</div>
		);
	}

	return (
		<SlotFillProvider>
			<div className="press-this-editor">
				<BlockEditorProvider
					value={ blocks }
					onInput={ handleBlocksChange }
					onChange={ handleBlocksChange }
					settings={ editorSettings }
				>
					<div className="press-this-editor__layout">
						{ /* Main editor area */ }
						<div className="press-this-editor__main">
							{ /* Block Toolbar - shows when block is selected */ }
							<div className="press-this-editor__toolbar">
								<BlockToolbar hideDragHandle />
							</div>

							{ /* Title input */ }
							<div className="press-this-editor__title-wrapper">
								<input
									type="text"
									className="press-this-editor__title"
									value={ title }
									onChange={ handleTitleChange }
									onKeyDown={ handleTitleKeyDown }
									placeholder={ __( 'Add title', 'press-this' ) }
									aria-label={ __( 'Post title', 'press-this' ) }
								/>
							</div>

							{ /* Block editor */ }
							<div className="press-this-editor__content">
								<BlockEditorKeyboardShortcuts.Register />
								<BlockTools>
									<WritingFlow>
										<ObserveTyping>
											<BlockList />
										</ObserveTyping>
									</WritingFlow>
								</BlockTools>

								{ /* Inserter button */ }
								<div className="press-this-editor__inserter">
									<Inserter
										position="bottom center"
										showInserterHelpPanel={ false }
										renderToggle={ ( { onToggle, disabled } ) => (
											<Button
												variant="primary"
												className="press-this-editor__inserter-button"
												onClick={ onToggle }
												disabled={ disabled }
												icon="plus"
												label={ __( 'Add block', 'press-this' ) }
											/>
										) }
									/>
								</div>
							</div>
						</div>

						{ /* Sidebar */ }
						<div className="press-this-editor__sidebar">
							<div className="press-this-editor__sidebar-content">
								{ /* Publish actions */ }
								<div className="press-this-editor__publish-section">
									<div className="press-this-editor__publish-actions">
										<Button
											variant="primary"
											onClick={ () => handleSave( 'publish' ) }
											disabled={ isSaving }
											isBusy={ isSaving }
										>
											{ publishLabel }
										</Button>

										<DropdownMenu
											icon="arrow-down-alt2"
											label={ __( 'More actions', 'press-this' ) }
										>
											{ ( { onClose } ) => (
												<MenuGroup>
													<MenuItem
														onClick={ () => {
															handleSave( 'draft' );
															onClose();
														} }
													>
														{ __( 'Save Draft', 'press-this' ) }
													</MenuItem>
													<MenuItem
														onClick={ () => {
															handleSave( 'draft', { forceRedirect: true } );
															onClose();
														} }
													>
														{ __( 'Continue in Standard Editor', 'press-this' ) }
													</MenuItem>
												</MenuGroup>
											) }
										</DropdownMenu>
									</div>
								</div>

								<Panel>
									{ /* Block Inspector - shows when block is selected */ }
									<SidebarBlockInspector />

									{ /* Scraped Media Panel */ }
									<ScrapedMediaPanel
										images={ images }
										embeds={ embeds }
										onInsertBlock={ insertBlock }
										sourceUrl={ sourceUrl }
									/>

									{ /* Featured Image Panel */ }
									{ capabilities.canUploadFiles && (
										<FeaturedImagePanel
											featuredImageId={ featuredImageId }
											onSelect={ setFeaturedImageId }
											onRemove={ () => setFeaturedImageId( 0 ) }
											canUpload={ capabilities.canUploadFiles }
											scrapedImages={ images }
											restConfig={ restConfig }
											postId={ post.id }
										/>
									) }

									{ /* Post Format Panel */ }
									{ postFormats.length > 0 && (
										<PanelBody
											title={ __( 'Format', 'press-this' ) }
											initialOpen={ false }
										>
											<select
												value={ postFormat }
												onChange={ ( e ) => setPostFormat( e.target.value ) }
												className="press-this-editor__format-select"
											>
												<option value="">{ __( 'Standard', 'press-this' ) }</option>
												{ postFormats.map( ( format ) => (
													<option key={ format } value={ format }>
														{ format.charAt( 0 ).toUpperCase() + format.slice( 1 ) }
													</option>
												) ) }
											</select>
										</PanelBody>
									) }

									{ /* Categories Panel */ }
									{ capabilities.canAssignCategories && categories.length > 0 && (
										<PanelBody
											title={ __( 'Categories', 'press-this' ) }
											initialOpen={ false }
										>
											<div className="press-this-editor__categories">
												{ categories.map( ( cat ) => (
													<label key={ cat.id } className="press-this-editor__category">
														<input
															type="checkbox"
															checked={ selectedCategories.includes( cat.id ) }
															onChange={ ( e ) => {
																if ( e.target.checked ) {
																	setSelectedCategories( [ ...selectedCategories, cat.id ] );
																} else {
																	setSelectedCategories( selectedCategories.filter( ( id ) => id !== cat.id ) );
																}
															} }
														/>
														{ cat.name }
													</label>
												) ) }
											</div>
										</PanelBody>
									) }

									{ /* Tags Panel */ }
									{ capabilities.canAssignTags && (
										<PanelBody
											title={ __( 'Tags', 'press-this' ) }
											initialOpen={ false }
										>
											<input
												type="text"
												className="press-this-editor__tags-input"
												placeholder={ __( 'Add tags (comma separated)', 'press-this' ) }
												onKeyDown={ ( e ) => {
													if ( e.key === 'Enter' || e.key === ',' ) {
														e.preventDefault();
														const value = e.target.value.trim();
														if ( value && ! tags.includes( value ) ) {
															setTags( [ ...tags, value ] );
															e.target.value = '';
														}
													}
												} }
											/>
											{ tags.length > 0 && (
												<div className="press-this-editor__tags-list">
													{ tags.map( ( tag ) => (
														<span key={ tag } className="press-this-editor__tag">
															{ tag }
															<button
																type="button"
																onClick={ () => setTags( tags.filter( ( t ) => t !== tag ) ) }
																aria-label={ __( 'Remove tag', 'press-this' ) }
															>
																&times;
															</button>
														</span>
													) ) }
												</div>
											) }
										</PanelBody>
									) }
								</Panel>
							</div>
						</div>
					</div>

					<Popover.Slot />

					{ /* Success/Error notices */ }
					{ notice && (
						<div className="press-this-editor__notice">
							<Snackbar
								status={ notice.status }
								onRemove={ () => setNotice( null ) }
							>
								{ notice.message }
							</Snackbar>
						</div>
					) }
				</BlockEditorProvider>
			</div>
		</SlotFillProvider>
	);
}
