import { createElement, emptyElement } from "./DOMUtils";

// Debounce helper function
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>): void => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            func(...args);
            timeout = null; // Reset timeout after execution
        }, wait);
    };
}

// Example usage with the new DOM utilities

// Suppose you have a function that updates the DOM based on some input
function updateDOM(input: string): void {
    const container = document.getElementById('container');
    if (container) {
        // Clear the container
        emptyElement(container);

        // Create a new element with the input text
        createElement(container, 'div', {
            cls: 'content',
            text: `Updated content: ${input}`
        });
    }
}

// Debounce the updateDOM function to limit how often it can be called
const debouncedUpdateDOM = debounce(updateDOM, 300);

// Example event listener that uses the debounced function
document.getElementById('input-field')?.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    debouncedUpdateDOM(target.value);
});
