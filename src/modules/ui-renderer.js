export const UI_RENDERER = {
            createEl: (tag, classes = "", textContent = null) => {
                const el = document.createElement(tag);
                if (classes) el.className = classes;
                if (textContent !== null) el.textContent = textContent;
                return el;
            },
            initIcons: () => { if (window.lucide) window.lucide.createIcons(); }
        };
