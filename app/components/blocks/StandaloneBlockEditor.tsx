'use client';

import React, { useState, useCallback } from 'react';
import { BaseBlock, BlockType, BlockContent } from './types';
import { BlockRenderer } from './BlockRenderer';
import { Button } from '@/components/ui/button';
import { Plus, Type, List, Image, Code, Quote, Layout, Zap } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface StandaloneBlockEditorProps {
  blocks: BaseBlock[];
  onBlocksChange: (blocks: BaseBlock[]) => void;
  className?: string;
}

export const StandaloneBlockEditor: React.FC<StandaloneBlockEditorProps> = ({
  blocks,
  onBlocksChange,
  className
}) => {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const createBlock = useCallback((type: BlockType, afterIndex?: number): BaseBlock => {
    const orderIndex = afterIndex !== undefined ? afterIndex + 1 : blocks.length;
    const defaultContent = getDefaultContent(type);
    const newBlock: BaseBlock = {
      id: generateId(),
      type,
      content: defaultContent,
      order_index: orderIndex,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return newBlock;
  }, [blocks.length]);

  const getDefaultContent = (type: BlockType): BlockContent => {
    switch (type) {
      case 'text':
        return { type: 'paragraph', text: '' };
      case 'list':
        return { type: 'bulleted', items: [{ id: '1', text: '' }] };
      case 'media':
        return { type: 'image', url: '', alt: '' };
      case 'code':
        return { language: 'javascript', code: '' };
      case 'quote':
        return { text: '', author: '' };
      case 'layout':
        return { type: 'divider' };
      case 'complex':
        return { type: 'mindmap', data: {}, viewerType: 'mindmap-professional' };
      default:
        return { type: 'paragraph', text: '' };
    }
  };

  const handleAddBlock = (type: BlockType, afterIndex?: number) => {
    const newBlock = createBlock(type, afterIndex);
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : blocks.length;
    const newBlocks = [...blocks];
    newBlocks.splice(insertIndex, 0, newBlock);
    onBlocksChange(newBlocks);
    setEditingBlockId(newBlock.id);
  };

  const handleBlockUpdate = (blockId: string, content: BlockContent) => {
    const updatedBlocks = blocks.map(block =>
      block.id === blockId
        ? { ...block, content, updated_at: new Date().toISOString() }
        : block
    );
    onBlocksChange(updatedBlocks);
  };

  const handleBlockDelete = (blockId: string) => {
    const filteredBlocks = blocks.filter(block => block.id !== blockId);
    onBlocksChange(filteredBlocks);
  };

  const handleBlockTypeChange = (blockId: string, newType: BlockType) => {
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      const newContent = getDefaultContent(newType);
      const updatedBlocks = blocks.map(b =>
        b.id === blockId
          ? { ...b, type: newType, content: newContent, updated_at: new Date().toISOString() }
          : b
      );
      onBlocksChange(updatedBlocks);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedBlockId) return;

    const draggedIndex = blocks.findIndex(block => block.id === draggedBlockId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) return;

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(dropIndex, 0, draggedBlock);

    onBlocksChange(newBlocks);
    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  return (
    <div className={`block-editor space-y-4 max-h-96 overflow-y-auto ${className}`}>
      {blocks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No blocks yet. Add your first block below!</p>
        </div>
      )}

      {blocks.map((block, index) => (
        <div
          key={block.id}
          draggable
          onDragStart={(e) => handleDragStart(e, block.id)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`relative group border rounded-lg p-4 ${
            dragOverIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}
        >
          <BlockRenderer
            block={block}
            onUpdate={(content) => handleBlockUpdate(block.id, content)}
            onDelete={() => handleBlockDelete(block.id)}
            isEditing={editingBlockId === block.id}
          />

          {/* Block toolbar */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBlockTypeChange(block.id, 'text')}>
                  <Type className="h-4 w-4 mr-2" /> Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBlockTypeChange(block.id, 'list')}>
                  <List className="h-4 w-4 mr-2" /> List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBlockTypeChange(block.id, 'media')}>
                  <Image className="h-4 w-4 mr-2" /> Media
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBlockTypeChange(block.id, 'code')}>
                  <Code className="h-4 w-4 mr-2" /> Code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBlockTypeChange(block.id, 'quote')}>
                  <Quote className="h-4 w-4 mr-2" /> Quote
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBlockTypeChange(block.id, 'layout')}>
                  <Layout className="h-4 w-4 mr-2" /> Layout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBlockTypeChange(block.id, 'complex')}>
                  <Zap className="h-4 w-4 mr-2" /> Complex
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBlockDelete(block.id)}
              className="text-red-600 hover:text-red-700"
            >
              ×
            </Button>
          </div>

          {/* Add block button after this block */}
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddBlock('text', index)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Block
            </Button>
          </div>
        </div>
      ))}

      {/* Initial add block button */}
      {blocks.length === 0 && (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="lg">
                <Plus className="h-5 w-5 mr-2" /> Add Your First Block
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleAddBlock('text')}>
                <Type className="h-4 w-4 mr-2" /> Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('list')}>
                <List className="h-4 w-4 mr-2" /> List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('media')}>
                <Image className="h-4 w-4 mr-2" /> Media
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('code')}>
                <Code className="h-4 w-4 mr-2" /> Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('quote')}>
                <Quote className="h-4 w-4 mr-2" /> Quote
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('layout')}>
                <Layout className="h-4 w-4 mr-2" /> Layout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddBlock('complex')}>
                <Zap className="h-4 w-4 mr-2" /> Complex
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};