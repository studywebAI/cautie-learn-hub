'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Folder, Plus, X, Tag } from 'lucide-react';
import { Studyset } from '../types';

const MOCK_STUDYSETS: Studyset[] = [
  {
    id: '1',
    userId: 'user1',
    name: 'Biologie H4-H6',
    subject: 'Biologie',
    status: 'active',
    color: '#9d7eb8',
    createdAt: new Date(),
    updatedAt: new Date(),
    studyDays: [],
    uploadType: 'agenda',
    sources: [],
    settings: {} as any,
    totalCards: 86,
    completedCards: 54,
    currentStreak: 12,
    longestStreak: 12,
    avgRetention: 82,
    shareType: 'privé',
  },
  {
    id: '2',
    userId: 'user1',
    name: 'Frans Woordjes',
    subject: 'Frans',
    status: 'active',
    color: '#87ceeb',
    createdAt: new Date(),
    updatedAt: new Date(),
    studyDays: [],
    uploadType: 'subject',
    sources: [],
    settings: {} as any,
    totalCards: 42,
    completedCards: 38,
    currentStreak: 8,
    longestStreak: 14,
    avgRetention: 71,
    shareType: 'privé',
  },
];

export default function OrganisePage() {
  const [studysets] = useState(MOCK_STUDYSETS);
  const [folders, setFolders] = useState<string[]>(['School', 'Universiteit', 'Persoonlijk']);
  const [selectedFolder, setSelectedFolder] = useState('School');
  const [newFolder, setNewFolder] = useState('');
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>(['SO', 'Examen', 'Frans', 'Biologie']);

  const handleAddFolder = () => {
    if (newFolder.trim()) {
      setFolders([...folders, newFolder]);
      setNewFolder('');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* HEADER */}
      <div className="border-b border-[#e4e4e7] bg-white px-8 py-6">
        <Link href="/studyset" className="inline-flex items-center gap-2 text-[#6b7c4e] hover:text-[#4f5d3a] mb-4">
          <ChevronLeft className="h-4 w-4" />
          Terug
        </Link>
        <h1 className="text-3xl font-bold">📂 Organisatie</h1>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-4xl px-8 py-8 grid grid-cols-3 gap-8">
        {/* FOLDERS */}
        <div>
          <h2 className="text-lg font-bold mb-4">Mappen</h2>
          <div className="space-y-2 mb-4">
            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 ${
                  selectedFolder === folder
                    ? 'bg-[#6b7c4e] text-white'
                    : 'bg-white border border-[#e4e4e7] text-[#18181b] hover:border-[#6b7c4e]'
                }`}
              >
                <Folder className="h-4 w-4" />
                <span className="text-sm font-medium">{folder}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Nieuwe map"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
              className="text-sm"
            />
            <Button
              onClick={handleAddFolder}
              size="sm"
              className="bg-[#6b7c4e] hover:bg-[#4f5d3a] text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* TAGS */}
        <div>
          <h2 className="text-lg font-bold mb-4">Labels</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <div
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#6b7c4e] text-white text-xs font-medium rounded-full"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Nieuw label"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="text-sm"
            />
            <Button
              onClick={handleAddTag}
              size="sm"
              className="bg-[#6b7c4e] hover:bg-[#4f5d3a] text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* STUDYSETS IN FOLDER */}
        <div className="col-span-3">
          <h2 className="text-lg font-bold mb-4">
            📁 In "{selectedFolder}"
          </h2>
          <div className="space-y-2">
            {studysets.map((set) => (
              <div key={set.id} className="bg-white p-4 rounded-lg border border-[#e4e4e7]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[#18181b]">{set.name}</p>
                    <p className="text-xs text-[#71717a] mt-1">{set.totalCards} kaarten</p>
                  </div>
                  <Link
                    href={`/studyset/${set.id}`}
                    className="text-xs text-[#6b7c4e] hover:underline"
                  >
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
