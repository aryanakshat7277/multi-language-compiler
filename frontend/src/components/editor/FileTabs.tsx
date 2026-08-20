import React from 'react';
import { X, Plus, FileCode, Terminal } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import './FileTabs.css';

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':
      return <span className="tab-file-icon tab-icon-py">🐍</span>;
    case 'c':
      return <span className="tab-file-icon tab-icon-c">C</span>;
    case 'cpp':
    case 'cc':
      return <span className="tab-file-icon tab-icon-cpp">C++</span>;
    case 'java':
      return <span className="tab-file-icon tab-icon-java">☕</span>;
    case 'js':
      return <span className="tab-file-icon tab-icon-js">JS</span>;
    case 'ts':
      return <span className="tab-file-icon tab-icon-ts">TS</span>;
    case 'go':
      return <span className="tab-file-icon tab-icon-go">Go</span>;
    case 'rs':
      return <span className="tab-file-icon tab-icon-rs">🦀</span>;
    default:
      return <FileCode size={13} className="tab-file-icon" />;
  }
};

const FileTabs: React.FC = () => {
  const { files, activeFileId, setActiveFile, removeFile, addFile, language } = useEditorStore();

  const handleAddNew = () => {
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
    const newName = `file${files.length + 1}.${ext}`;
    addFile(newName);
  };

  return (
    <div className="file-tabs-bar">
      <div className="file-tabs-list">
        {files.map(file => {
          const isActive = file.id === activeFileId;
          return (
            <div 
              key={file.id} 
              className={`file-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveFile(file.id)}
              title={file.name}
            >
              {getFileIcon(file.name)}
              <span className="file-tab-name">{file.name}</span>
              {file.isDirty && <span className="file-tab-dirty" />}
              {files.length > 1 && (
                <button 
                  className="file-tab-close" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    removeFile(file.id); 
                  }}
                  title="Close file"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button className="file-tab-add" onClick={handleAddNew} title="New File">
        <Plus size={14} />
      </button>
    </div>
  );
};

export default FileTabs;
