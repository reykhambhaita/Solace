// codemirror-editor.tsx
"use client";

import { getMDNDoc } from "@/lib/mdn-docs";
import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { php } from "@codemirror/lang-php";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { EditorState, Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { hoverTooltip } from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import { useEffect, useRef } from "react";

// MDN documentation database imported from shared utility


// Create hover tooltip extension with MDN integration
function createMDNHoverTooltip(language: string): Extension {
  return hoverTooltip((view, pos, side) => {
    const { from, to, text } = view.state.doc.lineAt(pos);
    let start = pos;
    let end = pos;

    // Find word boundaries
    while (start > from && /\w/.test(text[start - from - 1])) start--;
    while (end < to && /\w/.test(text[end - from])) end++;

    if (start === end) return null;

    const word = view.state.sliceDoc(start, end);
    const doc = getMDNDoc(word, language);

    if (!doc) return null;

    return {
      pos: start,
      end,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "cm-mdn-tooltip";
        dom.innerHTML = `
          <div style="padding: 8px 12px; max-width: 400px; background: #1e1e1e; border: 1px solid #3f3f3f; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <div style="font-weight: 600; color: #4fc3f7; margin-bottom: 6px; font-size: 13px;">${word}</div>
            <div style="color: #d4d4d4; font-size: 12px; line-height: 1.5; margin-bottom: 8px;">${doc.description}</div>
            <a href="${doc.mdn}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #569cd6; text-decoration: none; font-size: 11px; font-weight: 500;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              MDN Reference
            </a>
          </div>
        `;
        return { dom };
      }
    };
  });
}

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
}

export default function CodeMirrorEditor({ value, onChange, language }: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Get language extension
    const langExtension = getLanguageExtension(language);

    // Create editor state
    const startState = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        langExtension,
        oneDark,
        createMDNHoverTooltip(language),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "14px",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
          },
          ".cm-content": {
            padding: "16px 0"
          },
          ".cm-scroller": {
            overflow: "auto"
          }
        })
      ]
    });

    // Create editor view
    const view = new EditorView({
      state: startState,
      parent: editorRef.current
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [language]);

  // Update content when value changes externally
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value
          }
        });
      }
    }
  }, [value]);

  return <div ref={editorRef} style={{ height: "100%", width: "100%" }} />;
}

function getLanguageExtension(language: string): Extension {
  switch (language) {
    case "javascript":
    case "typescript":
      return javascript({ typescript: language === "typescript" });
    case "python":
      return python();
    case "java":
      return java();
    case "cpp":
    case "c":
      return cpp();
    case "rust":
      return rust();
    case "php":
      return php();
    case "go":
      return go();
    default:
      return javascript();
  }
}