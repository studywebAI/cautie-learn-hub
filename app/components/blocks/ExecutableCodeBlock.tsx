'use client';

import React, { useState } from 'react';
import { BlockProps, ExecutableCodeBlockContent } from './types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, RotateCcw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutableCodeBlockProps extends BlockProps {
  block: BlockProps['block'] & { content: ExecutableCodeBlockContent };
}

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', runtime: 'node' },
  { value: 'python', label: 'Python', runtime: 'python3' },
  { value: 'java', label: 'Java', runtime: 'java' },
  { value: 'cpp', label: 'C++', runtime: 'cpp' },
  { value: 'csharp', label: 'C#', runtime: 'csharp' },
  { value: 'go', label: 'Go', runtime: 'go' },
  { value: 'rust', label: 'Rust', runtime: 'rust' },
  { value: 'php', label: 'PHP', runtime: 'php' },
  { value: 'ruby', label: 'Ruby', runtime: 'ruby' },
];

export const ExecutableCodeBlock: React.FC<ExecutableCodeBlockProps> = ({
  block,
  onUpdate,
  isEditing = false,
  className,
}) => {
  const [isEditingState, setIsEditingState] = useState(isEditing);
  const [code, setCode] = useState(block.content.code || '');
  const [language, setLanguage] = useState(block.content.language || 'javascript');
  const [output, setOutput] = useState(block.content.output || '');
  const [error, setError] = useState(block.content.error || '');
  const [isRunning, setIsRunning] = useState(false);
  const [canExecute, setCanExecute] = useState(block.content.canExecute ?? true);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...block.content,
        code,
        language,
        output,
        error,
        canExecute,
      });
    }
    setIsEditingState(false);
  };

  const executeCode = async () => {
    if (!code.trim()) return;

    setIsRunning(true);
    setOutput('');
    setError('');

    try {
      const response = await fetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setOutput(result.output || 'Code executed successfully');
        if (onUpdate) {
          onUpdate({
            ...block.content,
            code,
            language,
            output: result.output,
            error: '',
            executionTime: result.executionTime,
          });
        }
      } else {
        setError(result.error || 'Execution failed');
        if (onUpdate) {
          onUpdate({
            ...block.content,
            code,
            language,
            output: '',
            error: result.error,
            executionTime: result.executionTime,
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      if (onUpdate) {
        onUpdate({
          ...block.content,
          code,
          language,
          output: '',
          error: errorMessage,
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  const clearOutput = () => {
    setOutput('');
    setError('');
    if (onUpdate) {
      onUpdate({
        ...block.content,
        code,
        language,
        output: '',
        error: '',
      });
    }
  };

  const renderDisplay = () => {
    const currentLang = SUPPORTED_LANGUAGES.find(lang => lang.value === language);

    return (
      <div className={cn('w-full border rounded-lg overflow-hidden', className)}>
        <div className="bg-muted px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{currentLang?.label || language}</span>
            {block.content.executionTime && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {block.content.executionTime}ms
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canExecute && (
              <Button
                onClick={executeCode}
                disabled={isRunning || !code.trim()}
                size="sm"
                variant="outline"
              >
                {isRunning ? (
                  <RotateCcw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-1" />
                )}
                {isRunning ? 'Running...' : 'Run'}
              </Button>
            )}
            <Button
              onClick={() => setIsEditingState(true)}
              size="sm"
              variant="ghost"
            >
              Edit
            </Button>
          </div>
        </div>

        <div className="p-4">
          <pre className="bg-muted/50 p-3 rounded text-sm font-mono overflow-x-auto">
            <code>{code || '// Write your code here...'}</code>
          </pre>

          {(output || error) && (
            <div className="mt-4">
              <div className="bg-black text-green-400 p-3 rounded font-mono text-sm">
                {error ? (
                  <div className="text-red-400">
                    <XCircle className="h-4 w-4 inline mr-2" />
                    Error: {error}
                  </div>
                ) : (
                  <div>
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Output:
                    <pre className="mt-2 whitespace-pre-wrap">{output}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEditor = () => {
    return (
      <div className={cn('w-full space-y-4 p-4 border rounded-lg bg-muted/50', className)}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="canExecute"
              checked={canExecute}
              onChange={(e) => setCanExecute(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="canExecute" className="text-sm">
              Allow execution
            </label>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Code</label>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={`Enter your ${language} code...`}
            className="mt-1 font-mono text-sm min-h-[200px] resize-none"
            autoFocus
          />
        </div>

        <div className="flex items-center gap-2">
          {canExecute && (
            <>
              <Button
                onClick={executeCode}
                disabled={isRunning || !code.trim()}
                size="sm"
                variant="outline"
              >
                {isRunning ? (
                  <RotateCcw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-1" />
                )}
                {isRunning ? 'Running...' : 'Test Run'}
              </Button>
              <Button onClick={clearOutput} size="sm" variant="outline">
                Clear Output
              </Button>
            </>
          )}

          <div className="ml-auto flex gap-2">
            <Button onClick={handleSave} size="sm">
              Save
            </Button>
            <Button
              onClick={() => setIsEditingState(false)}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>

        {(output || error) && (
          <div className="border rounded p-3 bg-black text-green-400 font-mono text-sm">
            {error ? (
              <div className="text-red-400">
                <XCircle className="h-4 w-4 inline mr-1" />
                Error: {error}
              </div>
            ) : (
              <div>
                <CheckCircle className="h-4 w-4 inline mr-1" />
                Output:
                <pre className="mt-2 whitespace-pre-wrap">{output}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full mb-4">
      {isEditingState ? renderEditor() : renderDisplay()}
    </div>
  );
};