import { Modal, TFile } from 'obsidian';
import { createElement } from '../utils/DOMUtils';
import { debounce } from '../utils/HelperUtils';

export class FileSearchModal extends Modal {
    private searchInput: HTMLInputElement;
    private resultsContainer: HTMLElement;
    private files: TFile[];
    private onFileSelect: (file: TFile) => void;
    private filteredFiles: TFile[] = [];
    private maxResults: number = 50;

    constructor(app: any, onFileSelect: (file: TFile) => void, maxResults?: number) {
        super(app);
        this.onFileSelect = onFileSelect;
        this.files = this.app.vault.getMarkdownFiles();
        if (maxResults) this.maxResults = maxResults;
    }

    onOpen() {
        this.buildModal();
        this.searchInput.focus();
        this.updateResults('');
    }

    onClose() {
        this.contentEl.empty();
    }

    private buildModal() {
        this.contentEl.addClass('file-search-modal');
        this.titleEl.setText('📄 Select Markdown File');

        const inputContainer = createElement(this.contentEl, 'div',{cls: 'search-input-container'});
        this.searchInput = inputContainer.createEl('input', {
            cls: 'search-input',
            attr: {
                placeholder: 'Search files...',
                type: 'text'
            }
        });

        this.resultsContainer = createElement(this.contentEl, 'div', {cls:'search-results'});

        this.searchInput.addEventListener('input', debounce((e) => {
            const query = (e.target as HTMLInputElement).value;
            this.updateResults(query);
        }, 300));

        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.filteredFiles.length > 0) {
                this.selectFile(this.filteredFiles[0]);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.focusResult(0);
            }
        });
    }

    private updateResults(query: string) {
        this.resultsContainer.empty();

        this.filteredFiles = this.files.filter(file =>
            file.basename.toLowerCase().includes(query.toLowerCase()) ||
            file.path.toLowerCase().includes(query.toLowerCase())
        );

        this.filteredFiles.sort((a, b) => {
            const aExactMatch = a.basename.toLowerCase().startsWith(query.toLowerCase());
            const bExactMatch = b.basename.toLowerCase().startsWith(query.toLowerCase());

            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;

            return b.stat.mtime - a.stat.mtime;
        });

        const displayFiles = this.filteredFiles.slice(0, this.maxResults);

        if (displayFiles.length === 0) {
            const noResults = createElement(this.resultsContainer, 'div', {cls:'search-no-results'});
            noResults.innerHTML = `<p>No files found matching "${query}"</p>`;
            return;
        }

        displayFiles.forEach((file, index) => {
            const item = createElement(this.resultsContainer, 'div', {cls:'search-result-item'});
            item.setAttribute('data-index', index.toString());

            const title = createElement(item, 'div', { cls: 'search-result-title' });
            title.setText(file.basename);

            const path = createElement(item, 'div', { cls: 'search-result-path' });
            path.setText(file.path);

            if (query) {
                this.highlightMatch(title, file.basename, query);
                this.highlightMatch(path, file.path, query);
            }

            item.addEventListener('click', () => this.selectFile(file));
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.selectFile(file);
                else if (e.key === 'ArrowDown') this.focusResult(index + 1);
                else if (e.key === 'ArrowUp') this.focusResult(index - 1);
            });

            item.setAttribute('tabindex', '0');
        });
    }

    private highlightMatch(element: HTMLElement, text: string, query: string) {
        const regex = new RegExp(`(${query})`, 'gi');
        const highlighted = text.replace(regex, '<mark>$1</mark>');
        element.innerHTML = highlighted;
    }

    private focusResult(index: number) {
        const items = this.resultsContainer.querySelectorAll('.search-result-item');
        if (index >= 0 && index < items.length) {
            (items[index] as HTMLElement).focus();
        }
    }

    private selectFile(file: TFile) {
            this.onFileSelect(file);
            this.close();
        }
    }