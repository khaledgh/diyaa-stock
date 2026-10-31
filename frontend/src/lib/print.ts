import { RefObject, useCallback } from 'react';

/**
 * Prints one element on its own page, styled like the app (light theme).
 * Replaces react-to-print v2, which relies on findDOMNode (removed in React 19).
 */
export function printElement(element: HTMLElement | null, title: string) {
  if (!element) return;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) return;

  // Same stylesheets as the app (Vite injects <style> in dev, <link> in production).
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');
  const dir = document.documentElement.dir || 'ltr';
  const lang = document.documentElement.lang || 'en';

  win.document.open();
  win.document.write(`<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title>
    <base href="${document.baseURI}">${styles}
    <style>
      @page { margin: 12mm; }
      html, body { background: #fff !important; }
      body { padding: 0; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-root { box-shadow: none !important; border: 0 !important; }
    </style></head>
    <body><div class="print-root">${element.outerHTML}</div></body></html>`);
  win.document.close();

  const links = Array.from(win.document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
  const loaded = Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve) => {
          if (link.sheet) return resolve();
          link.addEventListener('load', () => resolve(), { once: true });
          link.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1500));

  Promise.race([loaded, timeout]).then(() => {
    setTimeout(() => {
      win.focus();
      win.print();
      // Give the print dialog time to take its snapshot before removing the frame.
      setTimeout(() => frame.remove(), 1000);
    }, 100);
  });
}

/** Returns a function that prints the element behind `ref`. */
export function usePrint(ref: RefObject<HTMLElement | null>, title: string) {
  return useCallback(() => printElement(ref.current, title), [ref, title]);
}
