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
import {
	useMemo,
	useCallback,
	useState,
	useEffect,
	useRef,
} from '@wordpress/element';
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
	Snackbar,
	Panel,
	PanelBody,
	FormTokenField,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { registerCoreBlocks } from '@wordpress/block-library';

/**
 * Internal dependencies
 */
import BlockTransformShortcuts from './BlockTransformShortcuts';
import ScrapedMediaPanel from './ScrapedMediaPanel';
import FeaturedImagePanel from './FeaturedImagePanel';
import CategoryPanel from './CategoryPanel';

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

/**
 * Connected Scraped Media Panel.
 *
 * Must be rendered inside BlockEditorProvider to access the block editor store.
 * Uses the store's insertBlock action so media is inserted at the cursor
 * position rather than always appended at the end.
 *
 * @param {Object} props Props passed through to ScrapedMediaPanel.
 * @return {JSX.Element|null} ScrapedMediaPanel with store-connected insertion.
 */
function ConnectedScrapedMediaPanel( props ) {
	const { insertBlock } = useDispatch( blockEditorStore );

	const handleInsertBlock = useCallback(
		( block ) => {
			insertBlock( block );
		},
		[ insertBlock ]
	);

	return (
		<ScrapedMediaPanel { ...props } onInsertBlock={ handleInsertBlock } />
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
 * Safe redirect function.
 *
 * Validates redirect URLs to ensure they point to expected destinations.
 * Only allows redirects to the same host or relative URLs.
 *
 * @param {string} url              The URL to redirect to.
 * @param {Object} options          Redirect options.
 * @param {string} options.fallback Fallback URL if validation fails. Defaults to /wp-admin/.
 * @return {string} Safe URL to use for redirection.
 */
function safeRedirect( url, options = {} ) {
	const fallback = options.fallback || '/wp-admin/';

	// Empty URL - use fallback.
	if ( ! url ) {
		return fallback;
	}

	try {
		const redirectUrl = new URL( url, window.location.origin );
		const currentHost = window.location.host;

		// Check if redirect host matches current host.
		if ( redirectUrl.host === currentHost ) {
			return url;
		}

		// Relative URLs (no host) are safe.
		if (
			! redirectUrl.host ||
			redirectUrl.origin === window.location.origin
		) {
			return url;
		}

		// Block external redirects.
		// Log blocked redirect for debugging (development only).
		if ( window.pressThisEditorSettings?.scriptDebug ) {
			// eslint-disable-next-line no-console
			console.warn(
				'Press This: Blocked external redirect to',
				redirectUrl.host,
				'- using fallback'
			);
		}

		return fallback;
	} catch ( e ) {
		// If URL parsing fails, treat it as potentially malicious.
		if ( window.pressThisEditorSettings?.scriptDebug ) {
			// eslint-disable-next-line no-console
			console.warn( 'Press This: Invalid redirect URL - using fallback' );
		}
		return fallback;
	}
}

/**
 * Perform a safe redirect.
 *
 * Uses safeRedirect to validate the URL before redirecting.
 *
 * @param {string}  url            URL to redirect to.
 * @param {boolean} inParentWindow Whether to redirect in parent window.
 */
function performSafeRedirect( url, inParentWindow = false ) {
	const safeUrl = safeRedirect( url );

	if ( inParentWindow && window.opener ) {
		try {
			// Attempt to check if opener is same origin.
			// This will throw if cross-origin.
			if ( window.opener.location.origin === window.location.origin ) {
				window.opener.location.href = safeUrl;
				window.close();
				return;
			}
		} catch ( e ) {
			// Cross-origin opener - don't redirect parent.
			// eslint-disable-next-line no-console
			console.warn(
				'Press This: Cannot redirect cross-origin parent window'
			);
		}

		// Fallback: redirect self.
		window.location.href = safeUrl;
	} else {
		window.location.href = safeUrl;
	}
}

/**
 * Build the WordPress REST API base URL for core endpoints.
 *
 * Handles both pretty permalinks (/wp-json/) and index.php?rest_route= formats.
 *
 * @param {string} pressThisRestUrl The Press This REST URL (e.g., /wp-json/press-this/v1/ or index.php?rest_route=/press-this/v1/).
 * @return {string} The base URL for WordPress core REST endpoints.
 */
function getWpRestBaseUrl( pressThisRestUrl ) {
	// Check if using index.php?rest_route= format.
	if ( pressThisRestUrl.includes( 'rest_route=' ) ) {
		// Extract the base URL up to and including rest_route=.
		const match = pressThisRestUrl.match( /^(.*[?&]rest_route=)/ );
		if ( match ) {
			return match[ 1 ] + '/';
		}
	}

	// Pretty permalinks format - replace the namespace.
	return pressThisRestUrl.replace( /press-this\/v1\/$/, '' );
}

/**
 * Format a date string for display in the schedule snackbar.
 *
 * Uses the browser's default locale for formatting so the date is displayed
 * in the user's preferred language rather than hardcoded to English.
 *
 * @param {string} dateString ISO date string to format.
 * @param {string} timezone   IANA timezone string (e.g., "America/New_York").
 * @return {string} Human-readable formatted date.
 */
function formatScheduleDate( dateString, timezone ) {
	try {
		const date = new Date( dateString );
		const options = {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short',
		};
		if ( timezone ) {
			options.timeZone = timezone;
		}
		return new Intl.DateTimeFormat( undefined, options ).format( date );
	} catch {
		return dateString;
	}
}

/**
 * Press This Editor component.
 *
 * @param {Object}   props                      Component props.
 * @param {Object}   props.post                 Post object with ID, title, content.
 * @param {Object}   props.settings             Editor settings.
 * @param {Array}    props.images               Scraped images from source.
 * @param {Array}    props.embeds               Scraped embeds from source.
 * @param {Object}   props.categories           Available categories.
 * @param {Array}    props.postFormats          Available post formats.
 * @param {Object}   props.capabilities         User capabilities.
 * @param {Object}   props.restConfig           REST API configuration.
 * @param {string}   props.sourceUrl            Source URL being clipped.
 * @param {Object}   props.pendingScrape        Pending scraped content to append.
 * @param {Function} props.onScrapeProcessed    Callback after scrape is processed.
 * @param {Function} props.onSaveReady          Callback when save handler is ready (receives { handleSave, isSaving, publishLabel }).
 * @param {Function} props.onUndoReady          Callback when undo/redo handlers are ready (receives { handleUndo, handleRedo, hasUndo, hasRedo }).
 * @param {string}   props.timezone             Site timezone string from wp_timezone_string().
 * @param {Function} props.onPostStatusChange   Callback when post status changes after save (receives { status, date }).
 * @param {string}   props.categoryNonce
 * @param {string}   props.ajaxUrl
 * @return {JSX.Element} Press This Editor component.
 */
export default function PressThisEditor( {
	post,
	settings,
	images = [],
	embeds = [],
	categories: initialCategories = [],
	postFormats = [],
	capabilities = {},
	restConfig = {},
	sourceUrl = '',
	pendingScrape = null,
	onScrapeProcessed = () => {},
	onSaveReady = () => {},
	onUndoReady = () => {},
	timezone = '',
	onPostStatusChange = () => {},
	categoryNonce = '',
	ajaxUrl = '',
} ) {
	// Register blocks on mount.
	useEffect( () => {
		ensureBlocksRegistered();
	}, [] );

	// State for blocks and post data.
	const [ blocks, setBlocks ] = useState( [] );
	const [ title, setTitle ] = useState( post.title || '' );
	// Post format priority: override > PHP suggestion > default > empty (standard)
	const initialFormat =
		settings.postFormatOverride ||
		settings.suggestedPostFormat ||
		settings.postFormatDefault ||
		'';
	const [ postFormat, setPostFormat ] = useState( initialFormat );
	const [ selectedCategories, setSelectedCategories ] = useState( [] );
	const [ tags, setTags ] = useState( [] );
	const [ featuredImageId, setFeaturedImageId ] = useState( 0 );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ isReady, setIsReady ] = useState( false );
	const [ notice, setNotice ] = useState( null );

	// State for dynamic categories list (can be updated when new categories are added).
	const [ categories, setCategories ] = useState( initialCategories );

	// State for tag suggestions (autocomplete).
	const [ tagSuggestions, setTagSuggestions ] = useState( [] );
	const [ isLoadingTags, setIsLoadingTags ] = useState( false );
	const tagSearchTimeout = useRef( null );

	// Undo/Redo stack.
	// The core/block-editor store does not provide undo/redo actions.
	// In full Gutenberg, EditorProvider manages undo via core-data entity edits,
	// but Press This uses BlockEditorProvider directly with React state.
	const undoStackRef = useRef( [] );
	const redoStackRef = useRef( [] );
	const blocksRef = useRef( blocks );
	const isUndoingRef = useRef( false );
	const [ hasUndo, setHasUndo ] = useState( false );
	const [ hasRedo, setHasRedo ] = useState( false );

	// Keep blocksRef in sync.
	useEffect( () => {
		blocksRef.current = blocks;
	}, [ blocks ] );

	const syncUndoRedoState = useCallback( () => {
		setHasUndo( undoStackRef.current.length > 0 );
		setHasRedo( redoStackRef.current.length > 0 );
	}, [] );

	const handleUndo = useCallback( () => {
		if ( undoStackRef.current.length === 0 ) {
			return;
		}
		const previousBlocks = undoStackRef.current.pop();
		redoStackRef.current.push( blocksRef.current );
		isUndoingRef.current = true;
		blocksRef.current = previousBlocks;
		setBlocks( previousBlocks );
		isUndoingRef.current = false;
		syncUndoRedoState();
	}, [ syncUndoRedoState ] );

	const handleRedo = useCallback( () => {
		if ( redoStackRef.current.length === 0 ) {
			return;
		}
		const nextBlocks = redoStackRef.current.pop();
		undoStackRef.current.push( blocksRef.current );
		isUndoingRef.current = true;
		blocksRef.current = nextBlocks;
		setBlocks( nextBlocks );
		isUndoingRef.current = false;
		syncUndoRedoState();
	}, [ syncUndoRedoState ] );

	// Expose undo/redo to parent (for Header buttons).
	useEffect( () => {
		if ( onUndoReady ) {
			onUndoReady( { handleUndo, handleRedo, hasUndo, hasRedo } );
		}
	}, [ onUndoReady, handleUndo, handleRedo, hasUndo, hasRedo ] );

	// Keyboard shortcuts for undo/redo.
	useEffect( () => {
		function handleKeyDown( event ) {
			// Don't override native undo in regular form fields (title, URL input, etc.).
			const tagName = event.target.tagName.toLowerCase();
			if (
				tagName === 'input' ||
				tagName === 'textarea' ||
				tagName === 'select'
			) {
				return;
			}

			const isModKey = event.ctrlKey || event.metaKey;
			if ( ! isModKey ) {
				return;
			}

			const key = event.key.toLowerCase();

			// Ctrl+Z / Cmd+Z = Undo, Ctrl+Shift+Z / Cmd+Shift+Z = Redo.
			if ( key === 'z' ) {
				event.preventDefault();
				if ( event.shiftKey ) {
					handleRedo();
				} else {
					handleUndo();
				}
			}

			// Ctrl+Y = Redo (Windows/Linux convention). Do not use Cmd+Y on macOS.
			if (
				key === 'y' &&
				! event.shiftKey &&
				event.ctrlKey &&
				! event.metaKey
			) {
				event.preventDefault();
				handleRedo();
			}
		}

		document.addEventListener( 'keydown', handleKeyDown );
		return () => document.removeEventListener( 'keydown', handleKeyDown );
	}, [ handleUndo, handleRedo ] );

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

		// Parse and append the scraped content blocks (with undo level).
		if ( pendingScrape.content ) {
			const newBlocks = parse( pendingScrape.content );
			undoStackRef.current = [
				...undoStackRef.current,
				blocksRef.current,
			];
			redoStackRef.current = [];
			setBlocks( ( prevBlocks ) => [ ...prevBlocks, ...newBlocks ] );
			syncUndoRedoState();
		}

		// Notify parent that we've processed the scrape.
		onScrapeProcessed();
	}, [ pendingScrape, onScrapeProcessed ] ); // eslint-disable-line react-hooks/exhaustive-deps

	/**
	 * Handle non-persistent block changes (e.g. typing).
	 * Updates blocks without creating an undo level.
	 *
	 * @param {Array} newBlocks Updated blocks.
	 */
	const handleBlocksInput = useCallback( ( newBlocks ) => {
		blocksRef.current = newBlocks;
		setBlocks( newBlocks );
	}, [] );

	/**
	 * Handle persistent block changes (e.g. paste, block operations).
	 * Creates an undo level before applying the change.
	 *
	 * @param {Array} newBlocks Updated blocks.
	 */
	const handleBlocksChange = useCallback(
		( newBlocks ) => {
			// Don't create undo levels for undo/redo operations.
			if ( isUndoingRef.current ) {
				isUndoingRef.current = false;
				setBlocks( newBlocks );
				return;
			}
			undoStackRef.current = [
				...undoStackRef.current,
				blocksRef.current,
			];
			redoStackRef.current = [];
			blocksRef.current = newBlocks;
			setBlocks( newBlocks );
			syncUndoRedoState();
		},
		[ syncUndoRedoState ]
	);

	/**
	 * Handle save operation.
	 *
	 * @param {string} status  Post status (draft, publish, future).
	 * @param {Object} options Save options.
	 */
	const handleSave = useCallback(
		async ( status = 'draft', options = {} ) => {
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
						date: options.date || '',
					} ),
				} );

				const result = await response.json();

				if ( response.ok && result.success ) {
					if ( result.redirect ) {
						// Use safe redirect to validate URL.
						if ( result.force ) {
							performSafeRedirect( result.redirect, false );
						} else if (
							restConfig.redirInParent &&
							window.opener
						) {
							performSafeRedirect( result.redirect, true );
						} else {
							performSafeRedirect( result.redirect, false );
						}
					} else if ( status === 'future' && options.date ) {
						// Scheduled post -- show formatted date in snackbar.
						const formatted = formatScheduleDate(
							options.date,
							timezone
						);
						setNotice( {
							status: 'success',
							message: sprintf(
								/* translators: %s: formatted date and time */
								__( 'Post scheduled for %s.', 'press-this' ),
								formatted
							),
						} );

						// Notify parent that post status has changed.
						onPostStatusChange( {
							status: 'future',
							date: options.date,
						} );
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
						message:
							result.message ||
							__( 'Error saving post.', 'press-this' ),
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
		},
		[
			blocks,
			title,
			postFormat,
			selectedCategories,
			tags,
			featuredImageId,
			post.id,
			restConfig,
			timezone,
			onPostStatusChange,
		]
	);

	// Publish button label.
	const publishLabel = capabilities.canPublish
		? __( 'Publish', 'press-this' )
		: __( 'Submit for Review', 'press-this' );

	// Expose save handler to parent component via callback.
	useEffect( () => {
		onSaveReady( {
			handleSave,
			isSaving,
			publishLabel,
		} );
	}, [ handleSave, isSaving, publishLabel, onSaveReady ] );

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
			const blockList = document.querySelector(
				'.block-editor-block-list__layout'
			);
			if ( blockList ) {
				const firstBlock = blockList.querySelector( '[data-block]' );
				if ( firstBlock ) {
					firstBlock.focus();
				}
			}
		}
	}, [] );

	/**
	 * Search for tag suggestions via REST API.
	 * Uses debouncing to avoid excessive API calls.
	 *
	 * @param {string} search Search string.
	 */
	const searchTags = useCallback(
		( search ) => {
			// Clear any pending search.
			if ( tagSearchTimeout.current ) {
				clearTimeout( tagSearchTimeout.current );
			}

			// If search is empty, clear suggestions.
			if ( ! search || search.length < 2 ) {
				setTagSuggestions( [] );
				return;
			}

			// Debounce the search by 300ms.
			tagSearchTimeout.current = setTimeout( async () => {
				setIsLoadingTags( true );
				try {
					// Build the correct WordPress REST API URL for tags.
					const wpRestBase = getWpRestBaseUrl( restConfig.restUrl );
					const tagsUrl = wpRestBase.includes( 'rest_route=' )
						? `${ wpRestBase }wp/v2/tags&search=${ encodeURIComponent(
								search
						  ) }&per_page=10`
						: `${ wpRestBase }wp/v2/tags?search=${ encodeURIComponent(
								search
						  ) }&per_page=10`;

					const response = await fetch( tagsUrl, {
						headers: {
							'X-WP-Nonce': restConfig.restNonce,
						},
					} );

					if ( response.ok ) {
						const results = await response.json();
						// Extract tag names for suggestions.
						const names = results.map( ( tag ) => tag.name );
						setTagSuggestions( names );
					}
				} catch ( error ) {
					// Silently fail - suggestions are optional.
					setTagSuggestions( [] );
				} finally {
					setIsLoadingTags( false );
				}
			}, 300 );
		},
		[ restConfig.restUrl, restConfig.restNonce ]
	);

	/**
	 * Handle tag changes from FormTokenField.
	 *
	 * @param {Array} newTags New array of tags.
	 */
	const handleTagsChange = useCallback( ( newTags ) => {
		setTags( newTags );
	}, [] );

	// Editor settings.
	const editorSettings = useMemo(
		() => ( {
			allowedBlockTypes: settings.allowedBlocks,
			hasFixedToolbar: true,
			bodyPlaceholder: __(
				'Start writing or press / to choose a block',
				'press-this'
			),
			isRTL: settings.isRTL,
			// Enable media upload for Featured Image panel.
			mediaUpload: capabilities.canUploadFiles
				? ( { onFileChange } ) => {
						// Default upload handler - uses WordPress media library.
						onFileChange( [] );
				  }
				: undefined,
		} ),
		[ settings, capabilities.canUploadFiles ]
	);

	if ( ! isReady ) {
		return (
			<div className="press-this-loading">
				<Spinner />
				{ __( 'Loading editor…', 'press-this' ) }
			</div>
		);
	}

	return (
		<SlotFillProvider>
			<div className="press-this-editor">
				<BlockEditorProvider
					value={ blocks }
					onInput={ handleBlocksInput }
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
									placeholder={ __(
										'Add title',
										'press-this'
									) }
									aria-label={ __(
										'Post title',
										'press-this'
									) }
								/>
							</div>

							{ /* Block editor */ }
							<div className="press-this-editor__content">
								<BlockEditorKeyboardShortcuts.Register />
								<BlockTransformShortcuts />
								<BlockTools>
									<WritingFlow>
										<ObserveTyping>
											<BlockList />
										</ObserveTyping>
									</WritingFlow>
								</BlockTools>

								{ /*
								 * Block Inserter - Simplified Popover Design
								 *
								 * The bottom popover inserter is intentional for Press This.
								 * This simplified inserter reduces complexity for quick-post workflows
								 * where users primarily clip content from external sources rather than
								 * building complex layouts. This differs from the full Gutenberg sidebar
								 * inserter by design to match Press This's focused use case.
								 */ }
								<div
									className="press-this-editor__inserter"
									onClickCapture={ ( e ) => {
										// Handle close button click in capture phase to prevent
										// the internal error. The WordPress Inserter's close button
										// throws an error because onClose isn't provided.
										// We intercept in capture phase, stop propagation, and
										// use the toggle instead.
										const closeButton = e.target.closest(
											'[aria-label="Close Block Inserter"]'
										);
										if ( closeButton ) {
											e.stopPropagation();
											e.preventDefault();
											const toggleButton =
												document.querySelector(
													'.press-this-editor__inserter-button'
												);
											if ( toggleButton ) {
												toggleButton.click();
											}
										}
									} }
								>
									<Inserter
										position="bottom center"
										showInserterHelpPanel={ false }
										renderToggle={ ( {
											onToggle,
											disabled,
										} ) => (
											<Button
												variant="primary"
												className="press-this-editor__inserter-button"
												onClick={ onToggle }
												disabled={ disabled }
												icon="plus"
												label={ __(
													'Add block',
													'press-this'
												) }
											/>
										) }
									/>
								</div>
							</div>
						</div>

						{ /* Sidebar */ }
						<div className="press-this-editor__sidebar">
							<div className="press-this-editor__sidebar-content">
								<Panel>
									{ /* Block Inspector - shows when block is selected */ }
									<SidebarBlockInspector />

									{ /* Scraped Media Panel */ }
									<ConnectedScrapedMediaPanel
										images={ images }
										embeds={ embeds }
										sourceUrl={ sourceUrl }
									/>

									{ /* Featured Image Panel */ }
									{ capabilities.canUploadFiles && (
										<FeaturedImagePanel
											featuredImageId={ featuredImageId }
											onSelect={ setFeaturedImageId }
											onRemove={ () =>
												setFeaturedImageId( 0 )
											}
											canUpload={
												capabilities.canUploadFiles
											}
											scrapedImages={ images }
											restConfig={ restConfig }
											postId={ post.id }
										/>
									) }

									{ /* Post Format Panel */ }
									{ postFormats.length > 0 && (
										<PanelBody
											title={ __(
												'Format',
												'press-this'
											) }
											initialOpen={ false }
										>
											<select
												value={ postFormat }
												onChange={ ( e ) =>
													setPostFormat(
														e.target.value
													)
												}
												className="press-this-editor__format-select"
											>
												<option value="">
													{ __(
														'Standard',
														'press-this'
													) }
												</option>
												{ postFormats.map(
													( format ) => (
														<option
															key={ format }
															value={ format }
														>
															{ format
																.charAt( 0 )
																.toUpperCase() +
																format.slice(
																	1
																) }
														</option>
													)
												) }
											</select>
										</PanelBody>
									) }

									{ /* Categories Panel */ }
									{ capabilities.canAssignCategories &&
										categories.length > 0 && (
											<CategoryPanel
												categories={ categories }
												selectedCategories={
													selectedCategories
												}
												onSelectionChange={
													setSelectedCategories
												}
												onCategoriesChange={
													setCategories
												}
												canEditCategories={
													capabilities.canEditCategories
												}
												categoryNonce={ categoryNonce }
												ajaxUrl={ ajaxUrl }
											/>
										) }

									{ /* Tags Panel */ }
									{ capabilities.canAssignTags && (
										<PanelBody
											title={ __( 'Tags', 'press-this' ) }
											initialOpen={ false }
										>
											<FormTokenField
												label={ __(
													'Add tags',
													'press-this'
												) }
												value={ tags }
												suggestions={ tagSuggestions }
												onChange={ handleTagsChange }
												onInputChange={ searchTags }
												placeholder={ __(
													'Add tags',
													'press-this'
												) }
												__experimentalExpandOnFocus
												__experimentalShowHowTo={
													false
												}
												__next40pxDefaultSize
												__nextHasNoMarginBottom
											/>
											<p className="press-this-tags-panel__help">
												{ __(
													'Separate with commas or the Enter key.',
													'press-this'
												) }
											</p>
											{ isLoadingTags && (
												<div className="press-this-editor__tags-loading">
													<Spinner />
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
