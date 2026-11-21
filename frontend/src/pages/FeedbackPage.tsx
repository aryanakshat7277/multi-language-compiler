import React, { useState, useRef } from 'react';
import { 
  MessageSquarePlus, Bug, Lightbulb, Upload, 
  Image as ImageIcon, CheckCircle2, AlertTriangle, 
  Loader2, Send, HelpCircle, Eye, X, ArrowRight, ShieldCheck
} from 'lucide-react';
import { submitFeedback, FeedbackSubmissionPayload } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './FeedbackPage.css';

const SECTION_OPTIONS = [
  'Compiler IDE & Terminal',
  'AST Hierarchy Visualizer',
  'Code Metrics & Analysis',
  'Coding Assessments & Exams',
  'Problem Detail & Judge',
  'AI Mentor & Review',
  'Code Shortener AI',
  'Code DNA Similarity',
  'Leaderboard & Stats',
  'User Authentication & Profile',
  'General Interface & Navigation'
];

export default function FeedbackPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'BUG_REPORT' | 'FEATURE_REQUEST'>('BUG_REPORT');
  const [section, setSection] = useState('Compiler IDE & Terminal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [suggestedFix, setSuggestedFix] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [userName, setUserName] = useState(user?.displayName || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (PNG, JPG, WebP).', 'warning');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('Image size exceeds 8MB limit. Please upload a smaller image.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotUrl(reader.result as string);
      setScreenshotName(file.name);
      showToast('Screenshot attached successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setScreenshotUrl(reader.result as string);
            setScreenshotName('clipboard-screenshot.png');
            showToast('Pasted screenshot from clipboard!', 'success');
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotUrl(null);
    setScreenshotName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Please enter a descriptive title / subject.', 'warning');
      return;
    }

    if (!description.trim()) {
      showToast('Please provide a detailed explanation.', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: FeedbackSubmissionPayload = {
        type: activeTab,
        section,
        title: title.trim(),
        description: description.trim(),
        suggestedFix: suggestedFix.trim() || undefined,
        screenshotUrl: screenshotUrl || undefined,
        severity: activeTab === 'BUG_REPORT' ? severity : undefined,
        userName: userName.trim() || user?.displayName || 'Anonymous Developer',
        userEmail: userEmail.trim() || user?.email || 'anonymous@codeforge.local'
      };

      await submitFeedback(payload);
      setIsSuccess(true);
      showToast('✓ Feedback submitted directly to administrators!', 'success');
    } catch (err: any) {
      console.error('Feedback submit failed:', err);
      showToast(err?.message || 'Failed to submit report. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSuccess(false);
    setTitle('');
    setDescription('');
    setSuggestedFix('');
    setScreenshotUrl(null);
    setScreenshotName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="feedback-page-wrapper page-enter" onPaste={handlePaste}>
      {/* Top Hero Banner */}
      <div className="feedback-hero-banner">
        <div className="hero-icon-box">
          <MessageSquarePlus size={28} />
        </div>
        <div className="hero-text-col">
          <div className="hero-title-row">
            <h1>Feedback, Bug Reports &amp; Feature Proposals</h1>
            <span className="confidential-badge">
              <ShieldCheck size={13} />
              <span>Admin: AKSHAT ARYAN</span>
            </span>
          </div>
          <p className="hero-subtitle">
            Encountered an issue or have ideas on how a section should be modified? Submit your feedback or feature suggestions below. Uploading a screenshot is optional. All reports are delivered directly to Platform Administrator <strong>AKSHAT ARYAN</strong>.
          </p>
        </div>
      </div>

      {isSuccess ? (
        <div className="feedback-page-card success-card">
          <div className="success-icon-ring">
            <CheckCircle2 size={52} className="text-forest" />
          </div>
          <h2>Thank You! Your Submission Has Been Recorded</h2>
          <p>
            Your report has been securely registered in the platform database and routed directly to Administrator <strong>AKSHAT ARYAN</strong>.
          </p>
          <div className="success-meta-card">
            <div className="meta-row">
              <span>Category:</span>
              <strong>{activeTab === 'BUG_REPORT' ? '🐞 Bug / Issue Report' : '💡 Feature / Section Modification'}</strong>
            </div>
            <div className="meta-row">
              <span>Section:</span>
              <strong>{section}</strong>
            </div>
            <div className="meta-row">
              <span>Title:</span>
              <strong>{title}</strong>
            </div>
            <div className="meta-row">
              <span>Status:</span>
              <span className="pill-pending">Pending Admin Review</span>
            </div>
            {screenshotUrl && (
              <div className="meta-row">
                <span>Screenshot:</span>
                <strong>Attached &amp; Stored ✓</strong>
              </div>
            )}
          </div>
          <div className="success-btn-row">
            <button className="btn btn-primary" onClick={resetForm}>
              Submit Another Report
            </button>
          </div>
        </div>
      ) : (
        <div className="feedback-page-card">
          {/* Tabs Switcher */}
          <div className="page-tab-switcher">
            <button
              type="button"
              className={`page-tab-btn ${activeTab === 'BUG_REPORT' ? 'active bug' : ''}`}
              onClick={() => setActiveTab('BUG_REPORT')}
            >
              <Bug size={16} />
              <span>1. Report an Issue or Error (With Optional Screenshot)</span>
            </button>

            <button
              type="button"
              className={`page-tab-btn ${activeTab === 'FEATURE_REQUEST' ? 'active idea' : ''}`}
              onClick={() => setActiveTab('FEATURE_REQUEST')}
            >
              <Lightbulb size={16} />
              <span>2. Suggest Section Modification or New Features</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="page-form-body">
            {/* Section Selection */}
            <div className="form-group">
              <label className="form-label">
                <span>{activeTab === 'BUG_REPORT' ? 'Where Did The Issue Occur?' : 'Which Section Should Be Modified or Expanded?'}</span>
                <span className="required-star">*</span>
              </label>
              <select 
                className="form-select"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                {SECTION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="New Feature / Standalone Tool">➕ Brand New Standalone Tool / Feature</option>
              </select>
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">
                <span>{activeTab === 'BUG_REPORT' ? 'Issue Subject / Summary' : 'Proposed Modification / Feature Title'}</span>
                <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={
                  activeTab === 'BUG_REPORT'
                    ? 'e.g. Unexpected token error when visualizing AST with arrow functions'
                    : 'e.g. Add dark clay mode toggle and split-screen diff view in compiler'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={140}
                required
              />
            </div>

            {/* Severity Level (Bug reports) */}
            {activeTab === 'BUG_REPORT' && (
              <div className="form-group">
                <label className="form-label">
                  <span>Severity Level</span>
                </label>
                <div className="severity-row">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      className={`severity-pill ${severity === lvl ? `active ${lvl.toLowerCase()}` : ''}`}
                      onClick={() => setSeverity(lvl)}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation / Description */}
            <div className="form-group">
              <label className="form-label">
                <span>
                  {activeTab === 'BUG_REPORT' 
                    ? 'Explain The Issue Faced In Detail' 
                    : 'How Should This Section Be Modified or What Features Can Be Added?'}
                </span>
                <span className="required-star">*</span>
              </label>
              <textarea
                className="form-textarea"
                rows={5}
                placeholder={
                  activeTab === 'BUG_REPORT'
                    ? 'Please explain the steps to reproduce the issue, code snippet that triggers the problem, or any specific error messages shown...'
                    : 'Please explain how this section should be modified, what new capabilities or UI changes should be introduced, and how it improves the developer workflow...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Suggested Fix / Idea */}
            <div className="form-group">
              <label className="form-label">
                <span>
                  {activeTab === 'BUG_REPORT'
                    ? 'Suggested Fix or Workaround (Optional)'
                    : 'Expected User Impact / Benefits (Optional)'}
                </span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={
                  activeTab === 'BUG_REPORT'
                    ? 'e.g. Reset lexer tokens before re-evaluating abstract syntax tree'
                    : 'e.g. Allows instructors to grade code faster with side-by-side AST comparisons'
                }
                value={suggestedFix}
                onChange={(e) => setSuggestedFix(e.target.value)}
              />
            </div>

            {/* Optional Screenshot Upload */}
            <div className="form-group">
              <div className="label-with-hint">
                <label className="form-label">
                  <ImageIcon size={15} />
                  <span>Upload Screenshot (Optional)</span>
                </label>
                <span className="label-hint">PNG, JPG, WebP up to 8MB • Drag &amp; Drop or press Ctrl+V to paste</span>
              </div>

              {!screenshotUrl ? (
                <div 
                  className="page-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={28} className="upload-icon" />
                  <div className="dropzone-title">
                    <strong>Click to upload an error screenshot</strong> or drag image file here
                  </div>
                  <span className="dropzone-tip">
                    Take a screenshot of the issue (Win + Shift + S) and press <code>Ctrl + V</code> to attach instantly
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <div className="page-preview-box">
                  <div className="preview-image-wrap" onClick={() => setPreviewZoom(!previewZoom)}>
                    <img src={screenshotUrl} alt="Attached screenshot" className="preview-img" />
                    <div className="preview-zoom-hover">
                      <Eye size={18} />
                      <span>{previewZoom ? 'Collapse' : 'Zoom Screenshot'}</span>
                    </div>
                  </div>
                  <div className="preview-meta">
                    <span className="preview-name">{screenshotName || 'Attached Screenshot'}</span>
                    <span className="preview-status">Attached &amp; ready to transmit</span>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-attachment"
                    onClick={handleRemoveScreenshot}
                    title="Remove attachment"
                  >
                    <X size={16} />
                    <span>Remove</span>
                  </button>
                </div>
              )}

              {previewZoom && screenshotUrl && (
                <div className="lightbox-zoom-overlay" onClick={() => setPreviewZoom(false)}>
                  <img src={screenshotUrl} alt="Zoomed screenshot" className="lightbox-img" />
                  <button className="lightbox-close-btn" onClick={() => setPreviewZoom(false)}>
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* Contact Details */}
            <div className="form-row-split">
              <div className="form-group flex-1">
                <label className="form-label">Your Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Developer Name"
                />
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Your Email (Optional)</label>
                <input
                  type="email"
                  className="form-input"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="page-form-footer">
              <div className="security-notice">
                <HelpCircle size={14} />
                <span>Confidential: Only Platform Administrator <strong>AKSHAT ARYAN</strong> can view submitted reports and screenshots.</span>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary submit-feedback-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="spin-icon" />
                    <span>Submitting to Administrator...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>{activeTab === 'BUG_REPORT' ? 'Submit Issue Report' : 'Submit Feature Proposal'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
