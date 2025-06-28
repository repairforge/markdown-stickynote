import { TFile } from 'obsidian';

// Your existing interfaces - enhanced
export interface StickyNoteState {
    file: TFile | null;
    isPinned: boolean;
    isEditMode: boolean;
    isFavorited: boolean;
    // Enhanced state properties
    id?: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    isVisible?: boolean;
    zIndex?: number;
    theme?: string;
    lastModified?: number;
    createdAt?: number;
    tags?: string[];
    metadata?: Record<string, any>;
}

export interface StickyNoteEvents {
    onFileChange: (file: TFile | null) => void;
    onPinToggle: (isPinned: boolean) => void;
    onModeToggle: (isEditMode: boolean) => void;
    onClose: () => void;
    onDoubleClickEdit: (cursorPosition?: number) => void;
    onFavoriteToggle: (isFavorited: boolean) => void;
    // Enhanced events
    onPositionChange?: (position: { x: number; y: number }) => void;
    onSizeChange?: (size: { width: number; height: number }) => void;
    onVisibilityToggle?: (isVisible: boolean) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onInteraction?: () => void;
}

export interface ControlButtonConfig {
    icon: string;
    label: string;
    tooltip: string;
    className: string;
    onClick: () => void;
    disabled?: boolean;
    // Enhanced button properties
    hotkey?: string;
    showInMenu?: boolean;
    order?: number;
    group?: string;
}

/**
 * Extended interface for StickyNoteView to ensure type safety
 * This should match your existing StickyNoteView implementation
 */
export interface IStickyNoteView {
    // Core file methods
    setFile(file: TFile): Promise<void>;
    getFile(): TFile | null;
    
    // State management (renamed to avoid ItemView conflicts)
    getStickyState(): StickyNoteState;
    setStickyState(state: Partial<StickyNoteState>): void;
    
    // Window management
    closeWithAnimation?(silent?: boolean): void;
    focus?(): void;
    show?(): void;
    hide?(): void;
    isVisible?(): boolean;
    
    // Position and size
    setPosition?(position: { x: number; y: number }): void;
    setSize?(size: { width: number; height: number }): void;
    getPosition?(): { x: number; y: number };
    getSize?(): { width: number; height: number };
    
    // UI updates
    updateTitle?(title: string): void;
    
    // Events
    onInteraction?: () => void;
    events?: StickyNoteEvents;
}

/**
 * Settings interface - extends your existing settings
 */
export interface IExtendedStickyNoteSettings {
    // Core settings
    defaultWidth: number;
    defaultHeight: number;
    stickyNotesFolder: string;
    autoNamingPrefix: string;
    includeTimestamp: boolean;
    
    // Enhanced settings
    includeTemplate?: boolean;
    defaultContent?: string;
    maxStickyNotes?: number;
    autoRestore?: boolean;
    enableAnimations?: boolean;
    defaultTheme?: string;
    rememberPositions?: boolean;
    autoSaveInterval?: number;
    showInStatusBar?: boolean;
    enableHotkeys?: boolean;
}

/**
 * Enhanced WorkspaceLeaf interface for popout functionality
 */
export interface IPopoutLeaf {
    containerEl?: {
        ownerDocument?: {
            defaultView?: Window;
        };
        win?: Window;
    };
    view: IStickyNoteView;
    detach(): void;
}

/**
 * Utility type guards
 */
export function isPopoutLeaf(leaf: any): leaf is IPopoutLeaf {
    return leaf && typeof leaf.detach === 'function';
}

export function hasStickyNoteView(leaf: any): leaf is { view: IStickyNoteView } {
    return leaf?.view && typeof leaf.view.setFile === 'function';
}

export function isValidStickyNoteState(state: any): state is StickyNoteState {
    return state && 
           typeof state.isPinned === 'boolean' &&
           typeof state.isEditMode === 'boolean' &&
           typeof state.isFavorited === 'boolean';
}

/**
 * Safe accessor functions to prevent TypeScript errors
 */
export class StickyNoteUtils {
    static getFileFromView(view: any): TFile | null {
        if (view && typeof view.getFile === 'function') {
            return view.getFile();
        }
        // Fallback: try direct property access
        if (view?.file instanceof TFile) {
            return view.file;
        }
        // Check state
        if (view?.getState && typeof view.getState === 'function') {
            const state = view.getState();
            return state?.file || null;
        }
        return null;
    }
    
    static getFileName(view: any): string {
        const file = this.getFileFromView(view);
        return file?.basename || 'Untitled';
    }
    
    static getViewState(view: any): StickyNoteState | null {
        if (view && typeof view.getStickyState === 'function') {
            return view.getStickyState();
        }
        return null;
    }
    
    static updateViewState(view: any, updates: Partial<StickyNoteState>): boolean {
        try {
            if (view && typeof view.setStickyState === 'function') {
                view.setStickyState(updates);
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Error updating view state:', error);
            return false;
        }
    }
    
    static canCloseWithAnimation(view: any): boolean {
        return view && typeof view.closeWithAnimation === 'function';
    }
    
    static getPopoutWindow(leaf: any): Window | null {
        try {
            // Try multiple access patterns for popout windows
            if (leaf?.containerEl?.ownerDocument?.defaultView) {
                const win = leaf.containerEl.ownerDocument.defaultView;
                return win !== window ? win : null;
            }
            
            if (leaf?.containerEl?.win) {
                return leaf.containerEl.win;
            }
            
            return null;
        } catch (error) {
            console.warn('Error accessing popout window:', error);
            return null;
        }
    }
    
    static focusView(view: any): boolean {
        try {
            if (view && typeof view.focus === 'function') {
                view.focus();
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Error focusing view:', error);
            return false;
        }
    }
    
    static triggerEvent(view: any, eventName: keyof StickyNoteEvents, ...args: any[]): boolean {
        try {
            if (view?.events && typeof view.events[eventName] === 'function') {
                (view.events[eventName] as any)(...args);
                return true;
            }
            return false;
        } catch (error) {
            console.warn(`Error triggering event ${eventName}:`, error);
            return false;
        }
    }
    
    static isPinned(view: any): boolean {
        const state = this.getViewState(view);
        return state?.isPinned || false;
    }
    
    static isEditMode(view: any): boolean {
        const state = this.getViewState(view);
        return state?.isEditMode || false;
    }
    
    static isFavorited(view: any): boolean {
        const state = this.getViewState(view);
        return state?.isFavorited || false;
    }
    
    static togglePin(view: any): boolean {
        const state = this.getViewState(view);
        if (state) {
            const newPinnedState = !state.isPinned;
            this.updateViewState(view, { isPinned: newPinnedState });
            this.triggerEvent(view, 'onPinToggle', newPinnedState);
            return newPinnedState;
        }
        return false;
    }
    
    static toggleEditMode(view: any): boolean {
        const state = this.getViewState(view);
        if (state) {
            const newEditMode = !state.isEditMode;
            this.updateViewState(view, { isEditMode: newEditMode });
            this.triggerEvent(view, 'onModeToggle', newEditMode);
            return newEditMode;
        }
        return false;
    }
    
    static toggleFavorite(view: any): boolean {
        const state = this.getViewState(view);
        if (state) {
            const newFavoriteState = !state.isFavorited;
            this.updateViewState(view, { isFavorited: newFavoriteState });
            this.triggerEvent(view, 'onFavoriteToggle', newFavoriteState);
            return newFavoriteState;
        }
        return false;
    }
    
    static setFile(view: any, file: TFile | null): Promise<boolean> {
        return new Promise(async (resolve) => {
            try {
                if (view && typeof view.setFile === 'function') {
                    await view.setFile(file);
                    this.triggerEvent(view, 'onFileChange', file);
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch (error) {
                console.warn('Error setting file:', error);
                resolve(false);
            }
        });
    }
    
    static createControlButton(config: ControlButtonConfig): HTMLElement {
        const button = document.createElement('button');
        button.className = `sticky-note-control ${config.className}`;
        button.innerHTML = config.icon;
        button.title = config.tooltip;
        button.setAttribute('aria-label', config.label);
        
        if (config.disabled) {
            button.disabled = true;
            button.classList.add('disabled');
        }
        
        if (config.hotkey) {
            button.title += ` (${config.hotkey})`;
        }
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!config.disabled) {
                config.onClick();
            }
        });
        
        return button;
    }
    
    static getDefaultControlButtons(view: any): ControlButtonConfig[] {
        return [
            {
                icon: '📌',
                label: 'Pin/Unpin',
                tooltip: 'Toggle pin state',
                className: 'pin-button',
                onClick: () => this.togglePin(view),
                disabled: false,
                order: 1,
                group: 'state'
            },
            {
                icon: '✏️',
                label: 'Edit Mode',
                tooltip: 'Toggle edit mode',
                className: 'edit-button',
                onClick: () => this.toggleEditMode(view),
                disabled: false,
                order: 2,
                group: 'state'
            },
            {
                icon: '⭐',
                label: 'Favorite',
                tooltip: 'Toggle favorite',
                className: 'favorite-button',
                onClick: () => this.toggleFavorite(view),
                disabled: false,
                order: 3,
                group: 'state'
            },
            {
                icon: '✖️',
                label: 'Close',
                tooltip: 'Close sticky note',
                className: 'close-button',
                onClick: () => this.triggerEvent(view, 'onClose'),
                disabled: false,
                order: 4,
                group: 'action'
            }
        ];
    }
}