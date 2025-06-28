// DOMUtils.ts
export function emptyElement(element: HTMLElement): void {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

type ElementOptions = {
    cls?: string;
    text?: string;
    attributes?: Record<string, string>;
    styles?: Record<string, string>;
    children?: (HTMLElement | string)[];
    eventListeners?: [string, EventListenerOrEventListenerObject][];
};

export function createElement(
    parent: HTMLElement,
    tag: keyof HTMLElementTagNameMap,
    options: ElementOptions = {}
): HTMLElement {
    const element = document.createElement(tag);

    if (options.cls) {
        element.classList.add(...options.cls.split(' '));
    }

    if (options.text) {
        element.textContent = options.text;
    }

    if (options.attributes) {
        for (const [key, value] of Object.entries(options.attributes)) {
            element.setAttribute(key, value);
        }
    }

    if (options.styles) {
        Object.assign(element.style, options.styles);
    }

    if (options.children) {
        options.children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
    }

    if (options.eventListeners) {
        options.eventListeners.forEach(([event, listener]) => {
            element.addEventListener(event, listener);
        });
    }

    parent.appendChild(element);
    return element;
}
