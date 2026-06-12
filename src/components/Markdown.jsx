import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function Markdown({ content }) {
  if (!content) return null;

  // Split content into code blocks and text blocks
  const parseBlocks = (text) => {
    const blocks = [];
    const regex = /```(\w*)\n([\s\S]*?)(?:```|$)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
      blocks.push({
        type: 'code',
        language: match[1] || 'plaintext',
        content: match[2]
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      blocks.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    return blocks;
  };

  const renderInlineCode = (text) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const renderTextParagraphs = (textBlock) => {
    // Split by double newline for paragraphs, but keep single newlines inside lists
    const lines = textBlock.split('\n');
    const elements = [];
    let currentList = [];
    let listType = null; // 'ul' or 'ol'

    const flushList = (key) => {
      if (currentList.length > 0) {
        if (listType === 'ul') {
          elements.push(
            <ul key={`ul-${key}`}>
              {currentList.map((item, idx) => <li key={idx}>{renderInlineCode(item)}</li>)}
            </ul>
          );
        } else if (listType === 'ol') {
          elements.push(
            <ol key={`ol-${key}`}>
              {currentList.map((item, idx) => <li key={idx}>{renderInlineCode(item)}</li>)}
            </ol>
          );
        }
        currentList = [];
        listType = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Heading 1
      if (trimmed.startsWith('# ')) {
        flushList(i);
        elements.push(<h1 key={i}>{renderInlineCode(trimmed.substring(2))}</h1>);
      }
      // Heading 2
      else if (trimmed.startsWith('## ')) {
        flushList(i);
        elements.push(<h2 key={i}>{renderInlineCode(trimmed.substring(3))}</h2>);
      }
      // Heading 3
      else if (trimmed.startsWith('### ')) {
        flushList(i);
        elements.push(<h3 key={i}>{renderInlineCode(trimmed.substring(4))}</h3>);
      }
      // Bullet list item
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (listType !== 'ul') {
          flushList(i);
          listType = 'ul';
        }
        currentList.push(trimmed.substring(2));
      }
      // Numbered list item
      else if (/^\d+\.\s/.test(trimmed)) {
        if (listType !== 'ol') {
          flushList(i);
          listType = 'ol';
        }
        const itemContent = trimmed.replace(/^\d+\.\s/, '');
        currentList.push(itemContent);
      }
      // Empty line
      else if (!trimmed) {
        flushList(i);
      }
      // Standard text line
      else {
        if (listType) {
          // If we are currently parsing a list, standard text might be a continuation of the last list item
          if (currentList.length > 0) {
            currentList[currentList.length - 1] += '\n' + trimmed;
          } else {
            flushList(i);
            elements.push(<p key={i}>{renderInlineCode(line)}</p>);
          }
        } else {
          elements.push(<p key={i}>{renderInlineCode(line)}</p>);
        }
      }
    }
    flushList(lines.length);

    return elements;
  };

  const blocks = parseBlocks(content);

  return (
    <div className="markdown-body">
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          return (
            <CodeBlock 
              key={index} 
              language={block.language} 
              code={block.content} 
            />
          );
        } else {
          return (
            <React.Fragment key={index}>
              {renderTextParagraphs(block.content)}
            </React.Fragment>
          );
        }
      })}
    </div>
  );
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span>{language.toUpperCase()}</span>
        <button className="code-block-copy-btn" onClick={handleCopy}>
          {copied ? (
            <>
              <Check size={12} />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      <div className="code-block-content">
        <pre>
          <code>{code.trim()}</code>
        </pre>
      </div>
    </div>
  );
}
