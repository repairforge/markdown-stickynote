import { Plugin, TFile, Notice } from 'obsidian';
import { StickyNoteView, STICKY_NOTE_VIEW_TYPE } from './views/StickyNoteView';
import { StickyNoteSettings, DEFAULT_SETTINGS } from './settings/StickyNoteSettings';
import { StickyNoteSettingsTab } from './settings/StickyNoteSettingsTab';
import { DateUtils } from './utils/DateUtils';
import { debounce } from './utils/DebounceUtils';
import { StickyNoteUtils } from './types/StickyNoteTypes';

export default class StickyNotesPlugin extends Plugin {
    settings: StickyNoteSettings;
    
    // Toast spam prevention - debounced notifications
    private debouncedNotice = debounce((message: string) => {
        new Notice(message);
    }, 500);
    
    // Track recent notifications to prevent duplicates
    private recentNotifications = new Set<string>();
    
    // Enhanced notification method
    private showNotice(message: string, force = false): void {
        if (!force && this.recentNotifications.has(message)) {
            return; // Skip duplicate
        }
        
        this.recentNotifications.add(message);
        this.debouncedNotice(message);
        
        // Clear from recent after 3 seconds
        setTimeout(() => {
            this.recentNotifications.delete(message);
        }, 3000);
    }

    async onload() {
        console.log('🔥 Loading Enhanced Sticky Notes Plugin');

        await this.loadSettings();

        this.registerView(
            STICKY_NOTE_VIEW_TYPE,
            (leaf) => new StickyNoteView(leaf, this)
        );

        this.addSettingTab(new StickyNoteSettingsTab(this.app, this));

        this.addRibbonIcon('sticky-note', 'Create Sticky Note', () => {
            this.createStickyNote();
        });

        // Enhanced commands with hotkeys
        this.addCommand({
            id: 'create-sticky-note',
            name: '📝 Create New Sticky Note',
            callback: () => this.createStickyNote(),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'n' }]
        });

        this.addCommand({
            id: 'create-new-note-sticky',
            name: '📄 Create New Note as Sticky Note',
            callback: () => this.createNewNoteAsSticky(),
            hotkeys: [{ modifiers: ['Ctrl', 'Alt'], key: 'n' }]
        });

        this.addCommand({
            id: 'sticky-note-from-active-file',
            name: '📄 Open Current File as Sticky Note',
            callback: () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    this.createStickyNote(activeFile);
                } else {
                    this.showNotice("❌ No active file");
                }
            },
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 's' }]
        });

        this.addCommand({
            id: 'close-all-sticky-notes',
            name: '🗑️ Close All Sticky Notes',
            callback: () => this.closeAllStickyNotes(),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'w' }]
        });

        // New productivity commands
        this.addCommand({
            id: 'organize-sticky-notes',
            name: '📐 Organize Sticky Notes',
            callback: () => this.organizeStickyNotes()
        });

        this.addCommand({
            id: 'focus-next-sticky',
            name: '➡️ Focus Next Sticky Note',
            callback: () => this.focusNextSticky(),
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'Tab' }]
        });

        // File menu integration
        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    menu.addItem((item) => {
                        item.setTitle("📝 Open as Sticky Note")
                            .setIcon("sticky-note")
                            .onClick(() => this.createStickyNote(file));
                    });
                }
            })
        );

        // Auto-cleanup orphaned sticky note windows
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.cleanupOrphanedWindows();
            })
        );

        this.showNotice("📝 Enhanced Sticky Notes loaded!", true);
    }

    onunload() {
        console.log('👋 Unloading Sticky Notes Plugin');
        this.closeAllStickyNotes(false); // Silent cleanup
    }


    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async createStickyNote(file?: TFile) {
        try {
            // Check if file is already open as sticky note to prevent duplicates
            if (file) {
                const existingLeaves = this.app.workspace.getLeavesOfType(STICKY_NOTE_VIEW_TYPE);
                const alreadyOpen = existingLeaves.find(leaf => {
                    if (leaf.view.getViewType() === STICKY_NOTE_VIEW_TYPE) {
                        const viewFile = StickyNoteUtils.getFileFromView(leaf.view);
                        return viewFile?.path === file.path;
                    }
                    return false;
                });

                if (alreadyOpen) {
                    // Focus existing window instead of creating duplicate
                    this.app.workspace.setActiveLeaf(alreadyOpen);
                    this.showNotice(`📝 Focused existing sticky: ${file.basename}`);
                    return;
                }
            }

            const popoutLeaf = this.app.workspace.openPopoutLeaf({
                size: {
                    width: this.settings.defaultWidth,
                    height: this.settings.defaultHeight
                }
            });

            await popoutLeaf.setViewState({
                type: STICKY_NOTE_VIEW_TYPE,
                active: true
            });

            if (file) {
                const view = popoutLeaf.view;
                if (view.getViewType() === STICKY_NOTE_VIEW_TYPE) {
                    await (view as StickyNoteView).setFile(file);
                    this.showNotice(`📝 Opened sticky: ${file.basename}`);
                } else {
                    this.showNotice("📝 Sticky note created!");
                }
            } else {
                this.showNotice("📝 Sticky note created!");
            }
        } catch (error) {
            console.error('Failed to create sticky note:', error);
            this.showNotice('❌ Failed to create sticky note', true);
        }
    }

    async createNewNoteAsSticky() {
        try {
            const fileName = this.generateStickyNoteName();
            const filePath = `${this.settings.stickyNotesFolder}/${fileName}.md`;

            // Create the folder if it doesn't exist
            const folderPath = this.settings.stickyNotesFolder;
            if (!await this.app.vault.adapter.exists(folderPath)) {
                await this.app.vault.createFolder(folderPath);
            }

            const initialContent = this.generateInitialContent(fileName);
            const newFile = await this.app.vault.create(filePath, initialContent);
            await this.createStickyNote(newFile);

        } catch (error) {
            console.error('Failed to create new note as sticky:', error);
            this.showNotice('❌ Failed to create new sticky note', true);
        }
    }

    private generateStickyNoteName(): string {
        const now = new Date();
        const prefix = this.settings.autoNamingPrefix || 'Sticky_';
        const dateStr = DateUtils.formatDate(now);
        const timeStr = DateUtils.formatTime(now);
        return `${prefix}${dateStr}_${timeStr}`;
    }

    private generateInitialContent(fileName: string): string {
        let content = `# ${fileName}\n\n`;
        
        if (this.settings.includeTimestamp) {
            content += `Created: ${DateUtils.formatDateTime(new Date())}\n\n`;
        }
        
        // Add default template if configured
        if (this.settings.includeTemplate) {
            content += this.settings.defaultContent || '';
        }
        
        return content;
    }

    closeAllStickyNotes(showNotification = true) {
        const stickyNoteLeaves = this.app.workspace.getLeavesOfType(STICKY_NOTE_VIEW_TYPE);
        let closedCount = 0;

        if (stickyNoteLeaves.length === 0) {
            if (showNotification) {
                this.showNotice("ℹ️ No sticky notes to close");
            }
            return;
        }

        // For bulk closes, use silent mode to prevent notification spam
        stickyNoteLeaves.forEach(leaf => {
            try {
                const view = leaf.view;
                if (view.getViewType() === STICKY_NOTE_VIEW_TYPE && StickyNoteUtils.canCloseWithAnimation(view)) {
                    (view as any).closeWithAnimation(true); // Silent close for bulk operations
                } else {
                    leaf.detach();
                }
                closedCount++;
            } catch (error) {
                console.error('Error closing sticky note:', error);
                leaf.detach(); // Fallback
                closedCount++;
            }
        });

        if (showNotification && closedCount > 0) {
            this.showNotice(`🗑️ Closed ${closedCount} sticky notes`);
        }
    }

    // New enhanced features
    private organizeStickyNotes() {
        const stickyLeaves = this.app.workspace.getLeavesOfType(STICKY_NOTE_VIEW_TYPE);
        
        if (stickyLeaves.length === 0) {
            this.showNotice("ℹ️ No sticky notes to organize");
            return;
        }

        // Simple grid layout
        const screenWidth = window.screen.availWidth;
        const screenHeight = window.screen.availHeight;
        const cols = Math.ceil(Math.sqrt(stickyLeaves.length));
        const rows = Math.ceil(stickyLeaves.length / cols);
        
        const noteWidth = Math.min(400, Math.floor(screenWidth / cols) - 20);
        const noteHeight = Math.min(300, Math.floor(screenHeight / rows) - 60);

        stickyLeaves.forEach((leaf, index) => {
            try {
                const col = index % cols;
                const row = Math.floor(index / cols);
                
                const x = col * (noteWidth + 20) + 10;
                const y = row * (noteHeight + 20) + 50; // Account for title bar
                
                // Try to access and manipulate popout window
                const popoutWindow = StickyNoteUtils.getPopoutWindow(leaf);
                if (popoutWindow) {
                    popoutWindow.resizeTo(noteWidth, noteHeight);
                    popoutWindow.moveTo(x, y);
                }
            } catch (error) {
                console.error('Error organizing sticky note:', error);
            }
        });

        this.showNotice(`📐 Organized ${stickyLeaves.length} sticky notes`);
    }

    private focusNextSticky() {
        const stickyLeaves = this.app.workspace.getLeavesOfType(STICKY_NOTE_VIEW_TYPE);
        
        if (stickyLeaves.length === 0) {
            this.showNotice("ℹ️ No sticky notes to focus");
            return;
        }

        // Find currently focused sticky or start with first
        let currentIndex = 0;
        const activeLeaf = this.app.workspace.activeLeaf;
        
        if (activeLeaf && activeLeaf.view.getViewType() === STICKY_NOTE_VIEW_TYPE) {
            currentIndex = stickyLeaves.indexOf(activeLeaf);
        }

        // Focus next sticky (wrap around)
        const nextIndex = (currentIndex + 1) % stickyLeaves.length;
        const nextLeaf = stickyLeaves[nextIndex];
        
        try {
            this.app.workspace.setActiveLeaf(nextLeaf);
            const view = nextLeaf.view;
            const fileName = view.getViewType() === STICKY_NOTE_VIEW_TYPE ? 
                StickyNoteUtils.getFileName(view) : 'Unknown';
            this.showNotice(`➡️ Focused: ${fileName}`);
        } catch (error) {
            console.error('Error focusing sticky note:', error);
        }
    }

    private cleanupOrphanedWindows() {
        // Clean up any sticky note windows that lost their connection
        const stickyLeaves = this.app.workspace.getLeavesOfType(STICKY_NOTE_VIEW_TYPE);
        
        stickyLeaves.forEach(leaf => {
            try {
                const view = leaf.view;
                // Check if the view is still properly connected
                const leafAny = leaf as any;
                if (!view || view.getViewType() !== STICKY_NOTE_VIEW_TYPE || !leafAny.containerEl) {
                    leaf.detach();
                }
            } catch (error) {
                console.error('Error during cleanup:', error);
                leaf.detach();
            }
        });
    }

    // Public API for potential integrations
    public getStickyNotesCount(): number {
        return this.app.workspace.getLeavesOfType(STICKY_NOTE_VIEW_TYPE).length;
    }

    public getAllStickyNotes(): StickyNoteView[] {
        return this.app.workspace.getLeavesOfType(STICKY_NOTE_VIEW_TYPE)
            .map(leaf => leaf.view)
            .filter(view => view.getViewType() === STICKY_NOTE_VIEW_TYPE) as StickyNoteView[];
    }

    public async createStickyFromTemplate(templatePath: string): Promise<void> {
        try {
            const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
            if (templateFile instanceof TFile) {
                const content = await this.app.vault.read(templateFile);
                const fileName = this.generateStickyNoteName();
                const filePath = `${this.settings.stickyNotesFolder}/${fileName}.md`;
                
                const newFile = await this.app.vault.create(filePath, content);
                await this.createStickyNote(newFile);
            } else {
                this.showNotice(`❌ Template not found: ${templatePath}`, true);
            }
        } catch (error) {
            console.error('Failed to create sticky from template:', error);
            this.showNotice('❌ Failed to create sticky from template', true);
        }
    }
}