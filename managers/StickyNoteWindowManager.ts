import { WorkspaceLeaf } from 'obsidian';

export class StickyNoteWindowManager {
    private leaf: WorkspaceLeaf;
    private pinInterval: NodeJS.Timeout | null = null;
    private enableAdvancedPinning: boolean = true;
    private pinRefreshInterval: number = 3000;

    constructor(leaf: WorkspaceLeaf, enableAdvanced: boolean = true, refreshInterval: number = 3000) {
        this.leaf = leaf;
        this.enableAdvancedPinning = enableAdvanced;
        this.pinRefreshInterval = refreshInterval;
    }

    async togglePin(isPinned: boolean): Promise<boolean> {
        const container = this.leaf.getContainer();
        const win = container.win;

        if (win && win !== window) {
            try {
                const electronWin = this.getElectronWindow(win);

                if (electronWin && electronWin.setAlwaysOnTop && this.enableAdvancedPinning) {
                    electronWin.setAlwaysOnTop(isPinned);
                    
                    if (isPinned) {
                        this.startPinMaintenance(win);
                    } else {
                        this.stopPinMaintenance();
                    }
                    
                    return true;
                } else {
                    this.applyCSSStickyBehavior(win, isPinned);
                    return true;
                }
            } catch (error) {
                console.warn('Could not set window always on top:', error);
                // Fallback to CSS behavior
                this.applyCSSStickyBehavior(win, isPinned);
                return false;
            }
        }
        return false;
    }

    private getElectronWindow(win: Window): any {
        try {
            // Try multiple methods to get electron window
            const electronRemote = (win as any).require?.('electron')?.remote?.getCurrentWindow()
                || (win as any).require?.('@electron/remote')?.getCurrentWindow();
            
            if (electronRemote) return electronRemote;

            // Alternative method for newer electron versions
            const { ipcRenderer } = (win as any).require?.('electron') || {};
            if (ipcRenderer) {
                // Could implement IPC-based window management here
                return null;
            }

            return null;
        } catch {
            return null;
        }
    }

    private applyCSSStickyBehavior(win: Window, isPinned: boolean) {
        if (isPinned) {
            win.focus();
            (win.document.body.style as any).zIndex = '999999';
            (win.document.body.style as any).position = 'relative';

            // Enhanced visual feedback for pinned state
            const pinnedIndicator = win.document.createElement('div');
            pinnedIndicator.id = 'sticky-pin-indicator';
            pinnedIndicator.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1);
                z-index: 1000000;
                animation: pulse 2s infinite;
                pointer-events: none;
            `;
            
            // Add CSS animation if not exists
            if (!win.document.querySelector('#sticky-pin-styles')) {
                const style = win.document.createElement('style');
                style.id = 'sticky-pin-styles';
                style.textContent = `
                    @keyframes pulse {
                        0%, 100% { opacity: 0.8; }
                        50% { opacity: 1; }
                    }
                `;
                win.document.head.appendChild(style);
            }
            
            win.document.body.appendChild(pinnedIndicator);
            this.startPinMaintenance(win);
            
        } else {
            (win.document.body.style as any).zIndex = 'auto';
            const indicator = win.document.querySelector('#sticky-pin-indicator');
            if (indicator) indicator.remove();
            this.stopPinMaintenance();
        }
    }

    private startPinMaintenance(win: Window) {
        this.stopPinMaintenance(); // Clear any existing interval
        
        this.pinInterval = setInterval(() => {
            if (!win.closed) {
                try {
                    win.focus();
                    // Additional checks to ensure window stays on top
                    if (win.document.hidden) {
                        win.focus();
                    }
                } catch (error) {
                    console.warn('Error maintaining pin focus:', error);
                    this.stopPinMaintenance();
                }
            } else {
                this.stopPinMaintenance();
            }
        }, this.pinRefreshInterval);
    }

    private stopPinMaintenance() {
        if (this.pinInterval) {
            clearInterval(this.pinInterval);
            this.pinInterval = null;
        }
    }

    closeWithAnimation(containerEl: HTMLElement): Promise<void> {
        return new Promise((resolve) => {
            const container = containerEl.querySelector('.sticky-note-container') as HTMLElement;
            if (container) {
                // Enhanced closing animation
                container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                container.style.transform = 'scale(0.95) translateY(-10px)';
                container.style.opacity = '0';
                
                setTimeout(() => {
                    this.stopPinMaintenance(); // Clean up any pin maintenance
                    this.leaf.detach();
                    resolve();
                }, 300);
            } else {
                this.stopPinMaintenance();
                this.leaf.detach();
                resolve();
            }
        });
    }

    // Method to update settings
    updateSettings(enableAdvanced: boolean, refreshInterval: number) {
        this.enableAdvancedPinning = enableAdvanced;
        this.pinRefreshInterval = refreshInterval;
    }

    // Cleanup method
    destroy() {
        this.stopPinMaintenance();
    }
}