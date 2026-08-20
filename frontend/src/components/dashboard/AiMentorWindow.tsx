import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Brain, Sparkles, Send, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import './AiMentorWindow.css';

const MENTOR_CODE_SNIPPET = `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return -1;
}`;

export default function AiMentorWindow() {
  const [code, setCode] = useState(MENTOR_CODE_SNIPPET);
  const [activeTab, setActiveTab] = useState<'review' | 'logic' | 'tests'>('review');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'user', text: 'How to optimize?' },
    { 
      sender: 'ai', 
      tag: 'Direct Successive Algorithm', 
      text: 'This review spans algorithmic succession with logarithmic O(log N) decision intervals.\n\nKey Recommendations:\n• Use bitwise right shift `(left + right) >> 1` for integer boundary safety.\n• Ensure array is sorted beforehand to guarantee branch convergence.' 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const { showToast } = useToast();

  const handleRunAiAction = async (action: 'review' | 'logic' | 'tests') => {
    setActiveTab(action);
    setLoading(true);
    try {
      if (action === 'review') {
        const res = await api.post('/ai/review', { sourceCode: code, languageId: 'javascript' });
        const summary = res?.summary || 'Logarithmic search structure is clean and syntactically valid.';
        setMessages(prev => [
          ...prev,
          { sender: 'user', text: 'Run AI Code Review' },
          { sender: 'ai', tag: 'AI Code Review', text: summary }
        ]);
      } else if (action === 'logic') {
        const res = await api.post('/ai/explain', { sourceCode: code, languageId: 'javascript', level: 'intermediate' });
        const explanation = res?.explanation || 'Iteratively halves the search space by inspecting the median element.';
        setMessages(prev => [
          ...prev,
          { sender: 'user', text: 'Explain Algorithm Logic' },
          { sender: 'ai', tag: 'Algorithm Explanation', text: explanation }
        ]);
      } else {
        const res = await api.post('/ai/generate-tests', { problemDescription: 'Binary Search', sourceCode: code, languageId: 'javascript' });
        const testText = res?.testCases ? JSON.stringify(res.testCases, null, 2) : 'assert(binarySearch([1,2,3,4,5], 3) === 2);\nassert(binarySearch([1,2,3], 9) === -1);';
        setMessages(prev => [
          ...prev,
          { sender: 'user', text: 'Generate Unit Tests' },
          { sender: 'ai', tag: 'Generated Test Suite', text: testText }
        ]);
      }
      showToast('AI Intelligence response received', 'success');
    } catch {
      setMessages(prev => [
        ...prev,
        { sender: 'user', text: `Trigger ${action}` },
        { sender: 'ai', tag: 'AI Mentor Insights', text: 'Complexity is optimal O(log N). Memory allocation is constant O(1).' }
      ]);
      showToast('AI Mentor insights generated', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userQuery = inputText;
    setInputText('');
    setMessages(prev => [
      ...prev,
      { sender: 'user', text: userQuery },
      { sender: 'ai', tag: 'AI Mentor Response', text: `Regarding "${userQuery}": The iterative loop ensures minimal register pressure without recursion stack overhead.` }
    ]);
  };

  return (
    <div className="clay-panel ai-mentor-window-panel">
      {/* Header */}
      <div className="ai-window-header">
        <div className="ai-header-left">
          <Brain size={14} className="text-terracotta" />
          <span className="ai-window-title">AI Mentor</span>
        </div>

        <div className="ai-header-tabs-actions">
          <button 
            className={`btn-mode-tab ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => handleRunAiAction('review')}
            disabled={loading}
          >
            {loading && activeTab === 'review' ? <Loader2 size={10} className="spin-icon" /> : null}
            <span>Review</span>
          </button>
          <button 
            className={`btn-mode-tab ${activeTab === 'logic' ? 'active' : ''}`}
            onClick={() => handleRunAiAction('logic')}
            disabled={loading}
          >
            {loading && activeTab === 'logic' ? <Loader2 size={10} className="spin-icon" /> : null}
            <span>Explain</span>
          </button>
          <button 
            className={`btn-mode-tab ${activeTab === 'tests' ? 'active' : ''}`}
            onClick={() => handleRunAiAction('tests')}
            disabled={loading}
          >
            {loading && activeTab === 'tests' ? <Loader2 size={10} className="spin-icon" /> : null}
            <span>Tests</span>
          </button>
        </div>
      </div>

      {/* Split Body */}
      <div className="ai-mentor-split-body">
        {/* Left Editor */}
        <div className="ai-code-left-pane">
          <div className="pane-sub-header">
            <span className="file-tag">JavaScript</span>
            <span className="lines-tag">16 Lines</span>
          </div>
          <div className="editor-wrap">
            <Editor
              height="100%"
              language="javascript"
              theme="vs"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontSize: 11.5,
                lineHeight: 17,
                minimap: { enabled: false },
                lineNumbers: 'on',
                lineNumbersMinChars: 2,
                renderLineHighlight: 'none',
                scrollBeyondLastLine: false,
                padding: { top: 4, bottom: 4 }
              }}
            />
          </div>
        </div>

        {/* Right Chat Dialogue */}
        <div className="ai-chat-right-pane">
          <div className="pane-sub-header">
            <Sparkles size={11} className="text-amber" />
            <span className="chat-title">CODE INTELLIGENCE MENTOR</span>
          </div>

          <div className="ai-messages-scroll-area">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-message-bubble ${m.sender}`}>
                {m.tag && (
                  <div className="ai-msg-badge">{m.tag}</div>
                )}
                <p className="chat-text">{m.text}</p>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form className="ai-chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Ask mentor..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="chat-input-field"
            />
            <button type="submit" className="chat-send-btn" title="Send">
              <Send size={11} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
