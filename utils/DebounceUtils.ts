import { createElement, emptyElement } from "./DOMUtils";

// Enhanced debounce helper function with additional options
export function debounce<T extends (...args: any[]) => any>(
    func: T, 
    wait: number,
    options: {
        leading?: boolean;    // Execute on leading edge
        trailing?: boolean;   // Execute on trailing edge (default: true)
        maxWait?: number;     // Maximum time to wait before forcing execution
    } = {}
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    let lastCallTime = 0;
    let lastInvokeTime = 0;
    let result: any;

    const { leading = false, trailing = true, maxWait } = options;

    function invokeFunc(time: number, args: Parameters<T>) {
        lastInvokeTime = time;
        result = func(...args);
        return result;
    }

    function shouldInvoke(time: number): boolean {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;

        return (
            lastCallTime === 0 ||
            timeSinceLastCall >= wait ||
            (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
        );
    }

    function timerExpired() {
        const time = Date.now();
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        // Restart timer
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = wait - timeSinceLastCall;
        const timeUntilMaxWait = maxWait === undefined 
            ? Number.MAX_SAFE_INTEGER 
            : maxWait - timeSinceLastInvoke;

        timeout = setTimeout(timerExpired, Math.min(timeWaiting, timeUntilMaxWait));
    }

    function trailingEdge(time: number) {
        timeout = null;
        if (trailing && lastCallTime !== 0) {
            return invokeFunc(time, arguments as any);
        }
        lastCallTime = 0;
        return result;
    }

    function leadingEdge(time: number, args: Parameters<T>) {
        lastInvokeTime = time;
        timeout = setTimeout(timerExpired, wait);
        return leading ? invokeFunc(time, args) : result;
    }

    return function debounced(...args: Parameters<T>) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);

        lastCallTime = time;

        if (isInvoking) {
            if (timeout === null) {
                return leadingEdge(time, args);
            }
            if (maxWait !== undefined) {
                timeout = setTimeout(timerExpired, wait);
                return invokeFunc(time, args);
            }
        }

        if (timeout === null) {
            timeout = setTimeout(timerExpired, wait);
        }

        return result;
    };
}

// Throttle function - limits execution to once per specified interval
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;
    
    return function throttled(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Batch function calls together and execute them in the next frame
export function batchRAF<T extends (...args: any[]) => any>(
    func: T
): (...args: Parameters<T>) => void {
    let rafId: number | null = null;
    let latestArgs: Parameters<T>;
    
    return function batched(...args: Parameters<T>) {
        latestArgs = args;
        
        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                func(...latestArgs);
                rafId = null;
            });
        }
    };
}

// Enhanced DOM updating functions with performance optimizations
export function updateDOM(input: string, containerId = 'container'): void {
    const container = document.getElementById(containerId);
    if (container) {
        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Clear the container efficiently
        emptyElement(container);

        // Create new element with the input text
        const tempContainer = document.createElement('div');
        createElement(tempContainer, 'div', {
            cls: 'content',
            text: `Updated content: ${input}`,
            attributes: {
                'data-timestamp': Date.now().toString()
            }
        });
        
        // Move to fragment then to DOM (single reflow)
        while (tempContainer.firstChild) {
            fragment.appendChild(tempContainer.firstChild);
        }
        container.appendChild(fragment);
    }
}

// Debounced DOM update with performance optimizations
export const debouncedUpdateDOM = debounce(updateDOM, 300, {
    leading: false,
    trailing: true,
    maxWait: 1000 // Force update after 1 second max
});

// Throttled DOM update for high-frequency events
export const throttledUpdateDOM = throttle(updateDOM, 100);

// RAF-batched DOM update for smooth animations
export const batchedUpdateDOM = batchRAF(updateDOM);

// Smart DOM updater that chooses the best strategy based on frequency
export class SmartDOMUpdater {
    private lastUpdateTime = 0;
    private updateCount = 0;
    private readonly resetInterval = 1000; // Reset counter every second
    
    private debouncedUpdate = debounce(updateDOM, 300);
    private throttledUpdate = throttle(updateDOM, 50);
    
    constructor() {
        // Reset update counter periodically
        setInterval(() => {
            this.updateCount = 0;
        }, this.resetInterval);
    }

    update(input: string, containerId?: string): void {
        const now = Date.now();
        this.updateCount++;
        
        // Choose strategy based on update frequency
        if (this.updateCount > 10) {
            // High frequency: use throttling
            this.throttledUpdate(input, containerId);
        } else if (now - this.lastUpdateTime < 100) {
            // Medium frequency: use debouncing
            this.debouncedUpdate(input, containerId);
        } else {
            // Low frequency: update immediately
            updateDOM(input, containerId);
        }
        
        this.lastUpdateTime = now;
    }
}

// Pre-configured smart updater instance
export const smartDOMUpdater = new SmartDOMUpdater();

// Example usage with various strategies
export function setupAdvancedEventListeners(): void {
    const inputField = document.getElementById('input-field') as HTMLInputElement;
    const searchField = document.getElementById('search-field') as HTMLInputElement;
    const scrollContainer = document.getElementById('scroll-container');
    
    if (inputField) {
        // Standard debounced input
        inputField.addEventListener('input', (event) => {
            const target = event.target as HTMLInputElement;
            debouncedUpdateDOM(target.value);
        });
    }
    
    if (searchField) {
        // Smart updating for search (adapts to typing speed)
        searchField.addEventListener('input', (event) => {
            const target = event.target as HTMLInputElement;
            smartDOMUpdater.update(target.value, 'search-results');
        });
    }
    
    if (scrollContainer) {
        // Throttled scroll updates
        const throttledScrollHandler = throttle((event: Event) => {
            const target = event.target as HTMLElement;
            const scrollPercent = (target.scrollTop / target.scrollHeight * 100).toFixed(1);
            updateDOM(`Scroll: ${scrollPercent}%`, 'scroll-indicator');
        }, 16); // ~60fps
        
        scrollContainer.addEventListener('scroll', throttledScrollHandler);
    }
}

// Utility to measure and log performance
export function measurePerformance<T extends (...args: any[]) => any>(
    func: T,
    label = 'Function'
): T {
    return ((...args: Parameters<T>) => {
        const start = performance.now();
        const result = func(...args);
        const end = performance.now();
        console.log(`${label} execution time: ${(end - start).toFixed(2)}ms`);
        return result;
    }) as T;
}