import { WorkspaceLeaf, ItemView, TFile, Notice, Component } from 'obsidian';
import { StickyNoteState, StickyNoteEvents } from '../types/StickyNoteTypes';
import { StickyNoteHeader } from '../components/StickyNoteHeader';
import { StickyNoteContentRenderer } from '../components/StickyNoteContentRenderer';
import { StickyNoteWindowManager } from '../managers/StickyNoteWindowManager';
import { createElement } from '../utils/DOMUtils';
import StickyNotesPlugin from '../main';

export const STICKY_NOTE_VIEW_TYPE = "sticky-note-view";

export class StickyNoteView extends ItemView {
    private state: StickyNoteState;
    private plugin: StickyNotesPlugin;
    private renderComponent: Component;
    private windowManager: StickyNoteWindowManager;
    private header: StickyNoteHeader;
    private contentRenderer: StickyNoteContentRenderer;
    private contentDiv: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: StickyNotesPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.renderComponent = new Component();
        this.windowManager = new StickyNoteWindowManager(
            leaf, 
            plugin.settings.enableAdvancedPinning,
            plugin.settings.pinRefreshInterval
        );

        this.state = {
            file: null,
            isPinned: false,
            isEditMode: false, // Start in live preview mode by default
            isFavorited: false
        };
    }

    getViewType(): string {
        return STICKY_NOTE_VIEW_TYPE;
    }

    getDisplayText(): string {
        const baseName = this.state.file ? this.state.file.basename : "Sticky Note";
        const modeIndicator = this.state.isEditMode ? " [RAW]" : " [LIVE]";
        const pinIndicator = this.state.isPinned ? " 📌" : "";
        const favIndicator = this.state.isFavorited ? " ⭐" : "";
        
        return `${baseName}${modeIndicator}${pinIndicator}${favIndicator}`;
    }

    getIcon(): string {
        return "sticky-note";
    }

    async onOpen() {
        this.renderComponent.load();
        await this.buildView();
        this.setupKeyboardShortcuts();
    }

    async onClose() {
        this.renderComponent.unload();
        if (this.header) {
            this.header.destroy();
        }
        if (this.contentRenderer) {
            this.contentRenderer.destroy();
        }
        this.windowManager.destroy();
    }

    private setupKeyboardShortcuts() {
        // Add keyboard shortcuts for quick actions
        this.containerEl.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'e':
                        e.preventDefault();
                        this.toggleEditMode(!this.state.isEditMode);
                        break;
                    case 'p':
                        e.preventDefault();
                        this.togglePin(!this.state.isPinned);
                        break;
                    case 's':
                        e.preventDefault();
                        if (this.state.file) {
                            new Notice('💾 Saved');
                        }
                        break;
                    case 'f':
                        e.preventDefault();
                        this.toggleFavorite(!this.state.isFavorited);
                        break;
                }
            }
        });
    }

    async buildView() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass("sticky-note-container");

        // Apply theme-aware styling
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 100%;
            background: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: var(--shadow-l);
        `;

        if (this.state.isPinned) {
            container.addClass("pinned");
            container.style.boxShadow = '0 8px 32px rgba(var(--accent-h), var(--accent-s), var(--accent-l), 0.3)';
        }

        const headerDiv = createElement(container, 'div', {cls:'sticky-note-header-wrapper'});
        headerDiv.style.cssText = `
            flex-shrink: 0;
            border-bottom: 1px solid var(--background-modifier-border);
            background: var(--background-secondary);
        `;

        this.contentDiv = createElement(container, 'div', {cls:'sticky-note-content'});
        this.contentDiv.style.cssText = `
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        const events: StickyNoteEvents = {
            onFileChange: (file) => this.setFile(file),
            onPinToggle: (isPinned) => this.togglePin(isPinned),
            onModeToggle: (isEditMode) => this.toggleEditMode(isEditMode),
            onClose: () => this.closeWithAnimation(),
            onDoubleClickEdit: () => {}, // No longer needed
            onFavoriteToggle: (isFavorited) => this.toggleFavorite(isFavorited)
        };

        this.header = new StickyNoteHeader(headerDiv, this.state, events, this.app);
        this.contentRenderer = new StickyNoteContentRenderer(
            this.contentDiv,
            this.state,
            this.app,
            this.renderComponent,
            events
        );

        this.header.render();
        await this.contentRenderer.render();

        // Update window title
        this.updateWindowTitle();
    }

    private updateWindowTitle() {
        const leaf = this.leaf;
        if (leaf && leaf.getContainer) {
            const container = leaf.getContainer();
            if (container && container.win) {
                container.win.document.title = this.getDisplayText();
            }
        }
    }

    async setFile(file: TFile) {
        this.state.file = file;
        this.state.isEditMode = false; // Default to live preview for new files
        await this.loadFavoriteStatus();
        await this.buildView();
        new Notice(`📄 Loaded: ${file.basename}`, 2000);
    }

    async togglePin(isPinned: boolean) {
        this.state.isPinned = isPinned;

        const success = await this.windowManager.togglePin(isPinned);
        if (success) {
            await this.buildView();
            new Notice(
                isPinned ? "📌 Sticky note pinned on top" : "📌 Sticky note unpinned", 
                2000
            );
        } else {
            new Notice("⚠️ Could not pin window - visual indication only", 3000);
            await this.buildView();
        }
    }

    async toggleEditMode(isEditMode: boolean, cursorPosition?: number) {
        // Save current content before switching modes
        if (!isEditMode && this.state.file) {
            const textarea = this.contentDiv.querySelector('.raw-edit-textarea') as HTMLTextAreaElement;
            if (textarea) {
                await this.app.vault.modify(this.state.file, textarea.value);
                new Notice("💾 Changes saved before mode switch", 1500);
            }
        }

        this.state.isEditMode = isEditMode;
        await this.contentRenderer.render(cursorPosition);
        this.header.render();
        this.updateWindowTitle();

        // Show mode change notification
        const modeText = isEditMode ? "Raw Edit Mode" : "Live Preview Mode";
        new Notice(`✨ Switched to ${modeText}`, 1500);
    }

    async toggleFavorite(isFavorited: boolean) {
        if (!this.state.file) return;

        this.state.isFavorited = isFavorited;
        
        await this.saveFavoriteStatus();
        await this.buildView();
        
        new Notice(
            isFavorited ? "⭐ Added to favorites" : "☆ Removed from favorites", 
            1500
        );
    }

    private async saveFavoriteStatus() {
        if (!this.state.file) return;
        
        const favoriteFiles = this.plugin.settings.favoriteFiles || [];
        const filePath = this.state.file.path;
        
        if (this.state.isFavorited) {
            if (!favoriteFiles.includes(filePath)) {
                favoriteFiles.push(filePath);
            }
        } else {
            const index = favoriteFiles.indexOf(filePath);
            if (index > -1) {
                favoriteFiles.splice(index, 1);
            }
        }
        
        this.plugin.settings.favoriteFiles = favoriteFiles;
        await this.plugin.saveSettings();
    }

    private async loadFavoriteStatus() {
        if (!this.state.file) return;
        
        const favoriteFiles = this.plugin.settings.favoriteFiles || [];
        this.state.isFavorited = favoriteFiles.includes(this.state.file.path);
    }

    // Enhanced closeWithAnimation with silent option for bulk operations
    async closeWithAnimation(silent = false) {
        // Only show notification for individual closes, not bulk operations
        if (!silent) {
            new Notice("👋 Closing sticky note...", 1000);
        }
        await this.windowManager.closeWithAnimation(this.containerEl);
    }

    // Method to programmatically set content (useful for integrations)
    async setContent(content: string) {
        if (!this.state.file) return;
        
        await this.app.vault.modify(this.state.file, content);
        await this.contentRenderer.render();
        new Notice("📝 Content updated", 1000);
    }

    // Method to get current content
    async getContent(): Promise<string> {
        if (!this.state.file) return '';
        
        try {
            return await this.app.vault.read(this.state.file);
        } catch (error) {
            console.error('Error reading file content:', error);
            return '';
        }
    }

    // Enhanced API methods for better integration with main plugin
    
    // Get the file associated with this view
    getFile(): TFile | null {
        return this.state.file;
    }

    // Get current sticky note state (renamed to avoid ItemView conflict)
    getStickyState(): StickyNoteState {
        return { ...this.state }; // Return copy to prevent external mutation
    }

    // Set sticky note state (renamed to avoid ItemView conflict)
    setStickyState(newState: Partial<StickyNoteState>) {
        this.state = { ...this.state, ...newState };
        this.buildView(); // Rebuild to reflect changes
    }

    // Focus this view
    focus() {
        try {
            this.leaf.view.containerEl.focus();
            const leaf = this.leaf as any;
            if (leaf.containerEl?.ownerDocument?.defaultView) {
                const win = leaf.containerEl.ownerDocument.defaultView;
                if (win !== window) {
                    win.focus();
                }
            }
        } catch (error) {
            console.warn('Error focusing sticky note:', error);
        }
    }

    // Check if view is visible
    isVisible(): boolean {
        try {
            const leaf = this.leaf as any;
            if (leaf.containerEl?.ownerDocument?.defaultView) {
                const win = leaf.containerEl.ownerDocument.defaultView;
                return win !== window && !win.closed;
            }
            return this.containerEl.isConnected;
        } catch (error) {
            return false;
        }
    }

    // Show/hide view
    show() {
        try {
            const leaf = this.leaf as any;
            if (leaf.containerEl?.ownerDocument?.defaultView) {
                const win = leaf.containerEl.ownerDocument.defaultView;
                if (win !== window) {
                    win.focus();
                }
            }
        } catch (error) {
            console.warn('Error showing sticky note:', error);
        }
    }

    hide() {
        try {
            const leaf = this.leaf as any;
            if (leaf.containerEl?.ownerDocument?.defaultView) {
                const win = leaf.containerEl.ownerDocument.defaultView;
                if (win !== window) {
                    win.blur();
                }
            }
        } catch (error) {
            console.warn('Error hiding sticky note:', error);
        }
    }

    // Set position (if in popout window)
    setPosition(position: { x: number; y: number }) {
        try {
            const leaf = this.leaf as any;
            if (leaf.containerEl?.ownerDocument?.defaultView) {
                const win = leaf.containerEl.ownerDocument.defaultView;
                if (win !== window) {
                    win.moveTo(position.x, position.y);
                }
            }
        } catch (error) {
            console.warn('Error setting position:', error);
        }
    }

    // Set size (if in popout window)
    setSize(size: { width: number; height: number }) {
        try {
            const leaf = this.leaf as any;
            if (leaf.containerEl?.ownerDocument?.defaultView) {
                const win = leaf.containerEl.ownerDocument.defaultView;
                if (win !== window) {
                    win.resizeTo(size.width, size.height);
                }
            }
        } catch (error) {
            console.warn('Error setting size:', error);
        }
    }

    // Update title (useful when file is renamed)
    updateTitle(title: string) {
        try {
            const leaf = this.leaf as any;
            if (leaf.containerEl?.ownerDocument?.defaultView) {
                const win = leaf.containerEl.ownerDocument.defaultView;
                if (win !== window) {
                    win.document.title = title;
                }
            }
        } catch (error) {
            console.warn('Error updating title:', error);
        }
    }

    // Interaction callback for activity tracking
    onInteraction?: () => void;
}