export interface StickyNoteSettings {
    defaultWidth: number;
    defaultHeight: number;
    stickyNotesFolder: string;
    autoNamingPrefix: string;
    includeTimestamp: boolean;
    autoSaveDelay: number;
    maxSearchResults: number;
    enableAdvancedPinning: boolean;
    pinRefreshInterval: number;
    favoriteFiles: string[];
    
    // New settings for enhanced functionality
    includeTemplate: boolean;
    defaultContent: string;
    maxStickyNotes: number;
    autoRestore: boolean;
    enableAnimations: boolean;
    defaultTheme: string;
    rememberPositions: boolean;
    autoSaveInterval: number;
    showInStatusBar: boolean;
    enableHotkeys: boolean;
}

export const DEFAULT_SETTINGS: StickyNoteSettings = {
    defaultWidth: 400,
    defaultHeight: 500,
    stickyNotesFolder: 'StickyNotes',
    autoNamingPrefix: 'Sticky_',
    includeTimestamp: true,
    autoSaveDelay: 1000,
    maxSearchResults: 50,
    enableAdvancedPinning: true,
    pinRefreshInterval: 3000,
    favoriteFiles: [],
    
    // New default settings
    includeTemplate: false,
    defaultContent: '',
    maxStickyNotes: 20,
    autoRestore: false, // Disable auto-restore by default to prevent startup spam
    enableAnimations: true,
    defaultTheme: 'default',
    rememberPositions: true,
    autoSaveInterval: 5000,
    showInStatusBar: true,
    enableHotkeys: true
};