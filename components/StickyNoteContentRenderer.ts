import { MarkdownRenderer, Component, setIcon, Notice } from 'obsidian';
import { StickyNoteState, StickyNoteEvents } from '../types/StickyNoteTypes';
import { createElement, emptyElement } from '../utils/DOMUtils';

export class StickyNoteContentRenderer {
    private container: HTMLElement;
    private state: StickyNoteState;
    private app: any;
    private renderComponent: Component;
    private events: StickyNoteEvents;
    private saveTimeout: NodeJS.Timeout | null = null;
    private editorView: any = null;
    private livePreviewContainer: HTMLElement | null = null;
    private switchToPreview: (() => Promise<void>) | null = null;
    private autoResizeTextarea: ((textarea: HTMLTextAreaElement) => void) | null = null;

    constructor(
        container: HTMLElement,
        state: StickyNoteState,
        app: any,
        renderComponent: Component,
        events: StickyNoteEvents
    ) {
        this.container = container;
        this.state = state;
        this.app = app;
        this.renderComponent = renderComponent;
        this.events = events;
    }

    async render(cursorPosition?: number) {
        emptyElement(this.container);
        this.container.addClass('content-area');

        if (!this.state.file) {
            this.renderPlaceholder();
            return;
        }

        try {
            const content = await this.app.vault.read(this.state.file);
            this.state.isEditMode ? await this.renderRawEditMode(content, cursorPosition) : await this.renderLivePreviewMode(content);
        } catch (error) {
            this.renderError(error);
        }
    }

    private renderPlaceholder() {
        const placeholder = createElement(this.container, 'div', { cls: 'placeholder' });
        const icon = createElement(placeholder, 'div', { cls: 'placeholder-icon' });
        setIcon(icon, 'file-plus');

        const text = createElement(placeholder, 'div', { cls: 'placeholder-text' });
        createElement(text, 'h3', { text: 'No File Selected' });
        createElement(text, 'p', { text: 'Use the search button above to find and select a markdown file' });
    }

    private async renderLivePreviewMode(content: string) {
        const liveContainer = createElement(this.container, 'div', { cls: 'live-preview-container' });
        createElement(liveContainer, 'span', { cls: 'mode-indicator live-preview-indicator', text: '✨ LIVE PREVIEW' });

        const editorContainer = createElement(liveContainer, 'div', { cls: 'live-editor-container' });
        editorContainer.style.cssText = `
            height: 100%;
            overflow-y: auto;
            padding: 20px;
            font-family: var(--font-text);
            font-size: var(--font-text-size);
            line-height: var(--line-height-normal);
        `;

        await this.renderCustomLivePreview(editorContainer, content);
    }

    private async renderCustomLivePreview(container: HTMLElement, content: string) {
        const editorWrapper = createElement(container, 'div', { cls: 'custom-live-editor' });
        const editorTextarea = editorWrapper.createEl('textarea', { cls: 'live-editor-textarea', attr: { placeholder: 'Start typing markdown...' } });

        const previewDiv = createElement(editorWrapper, 'div', { cls: 'live-preview-content' });

        editorTextarea.style.cssText = `
            width: 100%;
            min-height: 300px;
            resize: none;
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            padding: 12px;
            font-family: var(--font-text);
            font-size: var(--font-text-size);
            background: var(--background-primary);
            color: var(--text-normal);
            outline: none;
            line-height: 1.6;
            display: none;
        `;

        previewDiv.style.cssText = `
            min-height: 300px;
            padding: 12px;
            border: 1px solid transparent;
            border-radius: 6px;
            background: var(--background-primary);
            cursor: text;
            line-height: 1.6;
        `;

        editorTextarea.value = content;
        await this.updatePreview(previewDiv, content);

        let isEditMode = false;

        previewDiv.addEventListener('click', (event) => {
            if (!isEditMode) {
                isEditMode = true;
                previewDiv.style.display = 'none';
                editorTextarea.style.display = 'block';
                editorTextarea.focus();

                // Calculate the cursor position based on the click position
                const clickPosition = this.getCursorPosition(previewDiv, event);
                editorTextarea.setSelectionRange(clickPosition, clickPosition);
            }
        });

        const switchToPreview = async () => {
            if (isEditMode) {
                isEditMode = false;
                const newContent = editorTextarea.value;
                await this.updatePreview(previewDiv, newContent);
                editorTextarea.style.display = 'none';
                previewDiv.style.display = 'block';
            }
        };

        editorTextarea.addEventListener('blur', switchToPreview);
        editorTextarea.addEventListener('keydown', async (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                await switchToPreview();
            }
            setTimeout(() => this.autoResizeTextarea(editorTextarea), 0);
        });

        editorTextarea.addEventListener('input', () => {
            this.debouncedSave(editorTextarea.value);
            this.autoResizeTextarea(editorTextarea);
        });

        this.switchToPreview = switchToPreview;
        this.autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 500) + 'px';
        };

        this.autoResizeTextarea(editorTextarea);
    }

    private getCursorPosition(element: HTMLElement, event: MouseEvent): number {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Get the text content up to the clicked line
        const textContent = element.textContent || '';
        const lines = textContent.split('\n');
        const lineHeight = parseInt(window.getComputedStyle(element).lineHeight, 10);
        const charWidth = parseInt(window.getComputedStyle(element).fontSize, 10) * 0.6; // Approximate character width

        // Calculate the line number and character position
        let lineNumber = Math.floor(y / lineHeight);
        lineNumber = Math.min(lineNumber, lines.length - 1);

        let line = lines[lineNumber];
        let charPosition = Math.floor(x / charWidth);
        charPosition = Math.min(charPosition, line.length);

        // Calculate the cursor position
        let cursorPosition = 0;
        for (let i = 0; i < lineNumber; i++) {
            cursorPosition += lines[i].length + 1; // +1 for the newline character
        }
        cursorPosition += charPosition;

        return cursorPosition;
    }

    private async updatePreview(previewDiv: HTMLElement, content: string) {
        emptyElement(previewDiv);
        if (content.trim()) {
            await MarkdownRenderer.renderMarkdown(
                content,
                previewDiv,
                this.state.file!.path,
                this.renderComponent
            );
        } else {
            createElement(previewDiv, 'p', {
                text: 'Click here to start typing...',
                cls: 'empty-preview-placeholder',
                styles: { color: 'var(--text-muted)', 'font-style': 'italic' }
            });
        }
    }

    private async renderRawEditMode(content: string, cursorPosition?: number) {
        try {
            const editContainer = createElement(this.container, 'div', { cls: 'raw-edit-container' });
            createElement(editContainer, 'span', { cls: 'mode-indicator raw-edit-indicator', text: '🔧 RAW EDIT MODE' });

            const editArea = editContainer.createEl('textarea', { cls: 'raw-edit-textarea' });
            editArea.value = content;
            editArea.placeholder = 'Raw markdown source...';

            editArea.style.cssText = `
                width: 100%;
                height: calc(100% - 40px);
                resize: none;
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                padding: 12px;
                font-family: var(--font-monospace);
                font-size: var(--font-text-size);
                background: var(--background-primary);
                color: var(--text-normal);
                outline: none;
            `;

            editArea.addEventListener('input', () => {
                this.autoResize(editArea);
                this.debouncedSave(editArea.value);
            });

            this.autoResize(editArea);

            if (typeof cursorPosition === 'number') {
                setTimeout(() => {
                    editArea.focus();
                    editArea.setSelectionRange(cursorPosition, cursorPosition);
                }, 50);
            } else {
                editArea.focus();
            }
        } catch (error) {
            console.error('Error rendering raw edit mode:', error);
            new Notice('❌ Error rendering raw edit mode');
        }
    }

    private renderError(error: any) {
        const errorDiv = createElement(this.container, 'div', { cls: 'error-container' });
        createElement(errorDiv, 'h3', { text: '❌ Error Loading File' });
        createElement(errorDiv, 'p', { text: error.message });
    }

    private autoResize(textarea: HTMLTextAreaElement) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 500) + 'px';
    }

    private debouncedSave(content: string) {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(async () => {
            if (this.state.file) {
                try {
                    await this.app.vault.modify(this.state.file, content);
                    new Notice('💾 Saved', 1000);
                } catch (error) {
                    new Notice(`❌ Save failed: ${error.message}`);
                }
            }
        }, 1000);
    }

    destroy() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.editorView = null;
        this.switchToPreview = null;
        this.autoResizeTextarea = null;
    }
}
