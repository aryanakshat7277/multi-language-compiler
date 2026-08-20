import React, { useState } from 'react';
import { Plus, Trash2, FolderCode, Check, X } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import './FileExplorer.css';

const getFileEmoji = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py': return '🐍';
    case 'c': return '🔹';
    case 'cpp': return '🔷';
    case 'java': return '☕';
    case 'js': return '🟨';
    case 'ts': return '🟦';
    case 'go': return '🐹';
    case 'rs': return '🦀';
    default: return '📄';
  }
};

const FileExplorer: React.FC = () => {
  const { files, activeFileId, setActiveFile, addFile, removeFile, language } = useEditorStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleStartCreate = () => {
    const extMap: Record<string, string> = {
      python: 'py',
      c: 'c',
      cpp: 'cpp',
      java: 'java',
      javascript: 'js',
      typescript: 'ts',
      go: 'go',
      rust: 'rs'
    };
    const ext = extMap[language] || 'txt';
    setNewFileName(`helper.${ext}`);
    setIsCreating(true);
  };

  const handleConfirmCreate = () => {
    if (newFileName.trim()) {
      addFile(newFileName.trim());
      setIsCreating(false);
      setNewFileName('');
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewFileName('');
  };

  return (
    <div className="file-explorer">
      {/* Header */}
      <div className="explorer-header">
        <div className="explorer-title">
          <FolderCode size={14} className="title-icon" />
          <span>PROJECT FILES</span>
          <span className="file-count-badge">{files.length}</span>
        </div>
        <button 
          className="explorer-add-btn" 
          onClick={handleStartCreate}
          title="New File"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* New File Inline Form */}
      {isCreating && (
        <div className="new-file-input-box">
          <input
            type="text"
            className="new-file-input"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmCreate();
              if (e.key === 'Escape') handleCancelCreate();
            }}
            autoFocus
            placeholder="filename.ext"
          />
          <div className="new-file-actions">
            <button className="confirm-btn" onClick={handleConfirmCreate} title="Create">
              <Check size={12} />
            </button>
            <button className="cancel-btn" onClick={handleCancelCreate} title="Cancel">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="file-list">
        {files.map(file => {
          const isActive = file.id === activeFileId;
          return (
            <div 
              key={file.id} 
              className={`file-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveFile(file.id)}
            >
              <span className="file-emoji">{getFileEmoji(file.name)}</span>
              <span className="file-name" title={file.name}>{file.name}</span>
              {file.isDirty && <span className="dirty-dot" title="Unsaved changes" />}
              {files.length > 1 && (
                <button 
                  className="file-delete-btn" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    removeFile(file.id); 
                  }}
                  title="Delete file"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FileExplorer;
