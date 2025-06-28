import { setIcon } from 'obsidian';
import { StickyNoteState, StickyNoteEvents, ControlButtonConfig } from '../types/StickyNoteTypes';
import { FileSearchModal } from '../modals/FileSearchModal';
import { createElement } from '../utils/DOMUtils';

export class StickyNoteHeader {
    private container: HTMLElement;
    private state: StickyNoteState;
    private events: StickyNoteEvents;
    private app: any;
    private resizeObserver: ResizeObserver;
    private isCompact: boolean = false;

    constructor(container: HTMLElement, state: StickyNoteState, events: StickyNoteEvents, app: any) {
        this.container = container;
        this.state = state;
        this.events = events;
        this.app = app;
        
        // Set up resize observer for responsive behavior
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                this.handleResize(entry.contentRect.width);
            }
        });
    }

    render() {
        this.container.empty();
        this.container.addClass('sticky-note-header');

        // Apply consistent header styling
        this.container.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: var(--background-secondary);
            border-bottom: 1px solid var(--background-modifier-border);
            min-height: 40px;
            box-sizing: border-box;
        `;

        // Start observing for resize
        this.resizeObserver.observe(this.container);

        this.renderFileInfo();
        this.renderControls();
    }

    private handleResize(width: number) {
        const wasCompact = this.isCompact;
        this.isCompact = width < 450;
        
        // Re-render if compact state changed
        if (wasCompact !== this.isCompact) {
            this.renderFileInfo();
            this.renderControls();
        }
    }

    private renderFileInfo() {
        const existing = this.container.querySelector('.header-left');
        if (existing) existing.remove();

        const leftSection = createElement(this.container, 'div', {cls:'header-left'});
        leftSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            min-width: 0; /* Allow text truncation */
        `;

        const fileIcon = leftSection.createSpan('file-icon');
        fileIcon.style.cssText = `
            display: flex;
            align-items: center;
            color: var(--text-muted);
            flex-shrink: 0;
        `;
        setIcon(fileIcon, 'file-text');

        const fileInfo = createElement(leftSection, 'div', {cls:'file-info'});
        fileInfo.style.cssText = `
            display: flex;
            flex-direction: column;
            min-width: 0;
            flex: 1;
        `;
        
        if (this.state.file) {
            const fileName = fileInfo.createSpan('file-name');
            fileName.setText(this.state.file.basename);
            fileName.style.cssText = `
                font-weight: 500;
                color: var(--text-normal);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.2;
            `;
            
            // Only show path if not in compact mode
            if (!this.isCompact) {
                const filePath = fileInfo.createSpan('file-path');
                filePath.setText(this.state.file.path);
                filePath.style.cssText = `
                    font-size: 0.8em;
                    color: var(--text-muted);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    line-height: 1.2;
                `;
            }

            // Add favorite star indicator
            if (this.state.isFavorited) {
                const favoriteIcon = leftSection.createSpan('favorite-indicator');
                favoriteIcon.style.cssText = `
                    display: flex;
                    align-items: center;
                    color: var(--color-yellow);
                    flex-shrink: 0;
                `;
                setIcon(favoriteIcon, 'star');
                favoriteIcon.setAttribute('title', 'Favorited file');
            }
        } else {
            const fileName = fileInfo.createSpan('file-name');
            fileName.setText('No file selected');
            fileName.style.cssText = `
                font-weight: 500;
                color: var(--text-muted);
                font-style: italic;
                line-height: 1.2;
            `;
        }
    }

    private renderControls() {
        const existing = this.container.querySelector('.header-right');
        if (existing) existing.remove();

        const rightSection = createElement(this.container, 'div', {cls:'header-right'});

        // Super precise alignment - force everything to the exact same baseline
        rightSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: ${this.isCompact ? '4px' : '8px'};
            flex-shrink: 0;
            height: 32px;
            line-height: 1; /* Kill any inherited line-height issues */
        `;

        const controlConfigs: ControlButtonConfig[] = [
            {
                icon: this.state.isPinned ? 'pin' : 'pin-off',
                label: this.isCompact ? '' : (this.state.isPinned ? 'PIN' : 'PIN'),
                tooltip: this.state.isPinned ? 'Unpin from top' : 'Pin always on top',
                className: `pin-btn ${this.state.isPinned ? 'active' : ''}`,
                onClick: () => this.events.onPinToggle(!this.state.isPinned)
            },
            {
                icon: this.state.isEditMode ? 'eye' : 'code',
                label: this.isCompact ? '' : (this.state.isEditMode ? 'LIVE' : 'RAW'),
                tooltip: this.state.isEditMode ? 'Switch to live preview mode' : 'Switch to raw edit mode',
                className: `edit-btn ${this.state.isEditMode ? 'active' : ''}`,
                onClick: () => this.events.onModeToggle(!this.state.isEditMode),
                disabled: !this.state.file
            },
            {
                icon: 'search',
                label: this.isCompact ? '' : 'FIND',
                tooltip: 'Search for markdown file',
                className: 'search-btn',
                onClick: () => this.openFileSearch()
            },
            {
                icon: 'x',
                label: '',
                tooltip: 'Close sticky note',
                className: 'close-btn',
                onClick: () => this.events.onClose()
            }
        ];

        controlConfigs.forEach(config => this.createControlButton(rightSection, config));
    }

    private createControlButton(parent: HTMLElement, config: ControlButtonConfig) {
        const container = createElement(parent, 'div', {cls:'control-container'});
        
        // Force exact same dimensions and positioning for all containers
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            height: 32px; /* Exact same height as parent */
            position: relative;
        `;

        const button = container.createEl('button', {
            cls: `control-btn ${config.className}`,
            attr: {
                'data-tooltip': config.tooltip,
                'aria-label': config.tooltip
            }
        });

        // Nuclear option - force every button to be exactly identical
        button.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border: none;
            border-radius: 4px;
            background: transparent;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.15s ease;
            padding: 0;
            margin: 0;
            flex-shrink: 0;
            position: relative;
            top: 0;
            left: 0;
            line-height: 1;
            font-size: 0; /* Kill any text size inheritance */
            vertical-align: top; /* Force consistent baseline */
            box-sizing: border-box;
        `;

        // Button hover and active states
        button.addEventListener('mouseenter', () => {
            if (!button.disabled) {
                button.style.background = 'var(--background-modifier-hover)';
                button.style.color = 'var(--text-normal)';
            }
        });

        button.addEventListener('mouseleave', () => {
            if (!config.className.includes('active')) {
                button.style.background = 'transparent';
                button.style.color = 'var(--text-muted)';
            }
        });

        if (config.disabled) {
            button.disabled = true;
            button.addClass('disabled');
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
        }

        // Add visual styling for active states
        if (config.className.includes('active')) {
            button.style.background = 'var(--interactive-accent)';
            button.style.color = 'var(--text-on-accent)';
        }

        // Special styling for close button
        if (config.className.includes('close-btn')) {
            button.addEventListener('mouseenter', () => {
                button.style.background = 'var(--background-modifier-error)';
                button.style.color = 'var(--text-error)';
            });
        }

        setIcon(button, config.icon);
        button.onclick = config.onClick;

        // Only show label if not compact and label exists
        if (config.label && !this.isCompact) {
            const label = createElement(container, 'span', {cls:'control-label'});
            label.setText(config.label);
            label.style.cssText = `
                font-size: 0.7em;
                font-weight: 600;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                line-height: 1;
                text-align: center;
                white-space: nowrap;
                position: absolute;
                bottom: -2px; /* Position label consistently */
                left: 50%;
                transform: translateX(-50%);
            `;
        }
    }

    private openFileSearch() {
        const modal = new FileSearchModal(this.app, (file) => {
            this.events.onFileChange(file);
        });
        modal.open();
    }

    destroy() {
        this.resizeObserver.disconnect();
    }
}