'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BlockProps, CodeBlockContent } from './types';
import { cn } from '@/lib/utils';

interface CodeBlockProps extends BlockProps {
  block: BlockProps['block'] & { content: CodeBlockContent };
}

const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'c',
  'csharp',
  'php',
  'ruby',
  'go',
  'rust',
  'swift',
  'kotlin',
  'scala',
  'html',
  'css',
  'json',
  'xml',
  'yaml',
  'sql',
  'bash',
  'powershell',
  'plaintext',
];

export const CodeBlock: React.FC<CodeBlockProps> = ({
  block,
  onUpdate,
  isEditing = false,
  className,
}) => {
  const [isEditingState, setIsEditingState] = useState(isEditing);
  const [code, setCode] = useState(block.content.code || '');
  const [language, setLanguage] = useState(block.content.language || 'plaintext');
  const [showLineNumbers, setShowLineNumbers] = useState(block.content.showLineNumbers || false);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...block.content,
        code,
        language,
        showLineNumbers,
      });
    }
    setIsEditingState(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setCode(block.content.code || '');
      setLanguage(block.content.language || 'plaintext');
      setShowLineNumbers(block.content.showLineNumbers || false);
      setIsEditingState(false);
    }
  };

  const renderDisplay = () => {
    const lines = code.split('\n');

    return (
      <div className="relative mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {language}
          </span>
          <button
            onClick={() => setIsEditingState(true)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Edit
          </button>
        </div>
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
          <code>
            {showLineNumbers ? (
              lines.map((line: string, index: number) => (
                <div key={index} className="flex">
                  <span className="text-muted-foreground mr-4 select-none min-w-[40px] text-right">
                    {index + 1}
                  </span>
                  <span>{line}</span>
                </div>
              ))
            ) : (
              code
            )}
          </code>
        </pre>
      </div>
    );
  };

  const renderEditor = () => {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/50 mb-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="text-sm font-medium">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="lineNumbers"
              checked={showLineNumbers}
              onChange={(e) => setShowLineNumbers(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="lineNumbers" className="text-sm">
              Line numbers
            </label>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Code</label>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your code..."
            className="mt-1 font-mono text-sm min-h-[200px] resize-none"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditingState(false)}
            className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      {isEditingState ? renderEditor() : renderDisplay()}
    </div>
  );
};