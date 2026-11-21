import React, { useState, useRef } from 'react';
import { 
  X, MessageSquarePlus, Bug, Sparkles, Upload, 
  Image as ImageIcon, CheckCircle2, AlertTriangle, 
  Loader2, Send, Lightbulb, HelpCircle, Eye
} from 'lucide-react';
import { submitFeedback, FeedbackSubmissionPayload } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import './FeedbackModal.css';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSection?: string;
  defaultType?: 'BUG_REPORT' | 'FEATURE_REQUEST';
}

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

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  defaultSection = 'Compiler IDE & Terminal',
  defaultType = 'BUG_REPORT'
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'BUG_REPORT' | 'FEATURE_REQUEST'>(defaultType);
  const [section, setSection] = useState(defaultSection);
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

  if (!isOpen) return null;

  // Handle image file selection (reads as base64 data URL)
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

  // Handle clipboard paste
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
    <div className="feedback-modal-backdrop" onClick={onClose} onPaste={handlePaste}>
      <div 
        className="feedback-modal-card page-enter" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="feedback-modal-header">
          <div className="header-badge-row">
            <div className="badge-icon-box">
              <MessageSquarePlus size={18} />
            </div>
            <div>
              <h3 className="modal-title">Feedback &amp; Issue Reporting</h3>
              <p className="modal-sub">Direct Line to Platform Administrators</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div className="feedback-success-view">
            <div className="success-icon-ring">
              <CheckCircle2 size={44} className="text-forest" />
            </div>
            <h4>Report Successfully Dispatched!</h4>
            <p>
              Thank you for helping us elevate CodeForge Pro. Your submission has been securely recorded and sent to the platform administrators for review.
            </p>
            <div className="success-meta-card">
              <div className="meta-row">
                <span>Category:</span>
                <strong>{activeTab === 'BUG_REPORT' ? 'Bug / Issue Report' : 'Feature / Section Improvement'}</strong>
              </div>
              <div className="meta-row">
                <span>Section:</span>
                <strong>{section}</strong>
              </div>
              <div className="meta-row">
                <span>Status:</span>
                <span className="pill-pending">Pending Admin Review</span>
              </div>
              {screenshotUrl && (
                <div className="meta-row">
                  <span>Attachment:</span>
                  <strong>{screenshotName || 'Screenshot Included ✓'}</strong>
                </div>
              )}
            </div>

            <div className="success-actions">
              <button className="btn btn-secondary" onClick={resetForm}>
                Submit Another Report
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Done &amp; Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            {/* Mode Switcher Tabs */}
            <div className="feedback-tab-switcher">
              <button
                type="button"
                className={`feedback-tab-pill ${activeTab === 'BUG_REPORT' ? 'active bug' : ''}`}
                onClick={() => setActiveTab('BUG_REPORT')}
              >
                <Bug size={14} />
                <span>Report an Issue / Bug</span>
              </button>

              <button
                type="button"
                className={`feedback-tab-pill ${activeTab === 'FEATURE_REQUEST' ? 'active idea' : ''}`}
                onClick={() => setActiveTab('FEATURE_REQUEST')}
              >
                <Lightbulb size={14} />
                <span>Suggest Section Modification / New Feature</span>
              </button>
            </div>

            <div className="feedback-scroll-body">
              {/* Target Section */}
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

              {/* Title / Subject */}
              <div className="form-group">
                <label className="form-label">
                  <span>{activeTab === 'BUG_REPORT' ? 'Issue Summary' : 'Proposed Modification / Feature Title'}</span>
                  <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={
                    activeTab === 'BUG_REPORT'
                      ? 'e.g. Memory graph calculation freezes when running large Rust programs'
                      : 'e.g. Add interactive control flow graph zoom & SVG export in AST visualizer'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={140}
                  required
                />
              </div>

              {/* Severity for Bug Reports */}
              {activeTab === 'BUG_REPORT' && (
                <div className="form-group">
                  <label className="form-label">
                    <span>Severity Level</span>
                  </label>
                  <div className="severity-selector">
                    {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        className={`severity-btn ${severity === lvl ? `active ${lvl.toLowerCase()}` : ''}`}
                        onClick={() => setSeverity(lvl)}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="form-group">
                <label className="form-label">
                  <span>
                    {activeTab === 'BUG_REPORT' 
                      ? 'Explain The Issue In Detail' 
                      : 'How Should This Section Be Modified or What Features Can Be Added?'}
                  </span>
                  <span className="required-star">*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder={
                    activeTab === 'BUG_REPORT'
                      ? 'Describe what happened, error messages received, steps to reproduce, or expected vs actual outcome...'
                      : 'Describe in detail how you would like this section to look or work, what user problem it solves, and what new capabilities should be added...'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Optional Suggested Fix or Expected Benefits */}
              <div className="form-group">
                <label className="form-label">
                  <span>
                    {activeTab === 'BUG_REPORT'
                      ? 'Suggested Fix or Workaround (Optional)'
                      : 'Expected Value / Benefit (Optional)'}
                  </span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={
                    activeTab === 'BUG_REPORT'
                      ? 'e.g. Check boundary condition at array index 0 in parser'
                      : 'e.g. Helps competitive coders practice graph traversal more efficiently'
                  }
                  value={suggestedFix}
                  onChange={(e) => setSuggestedFix(e.target.value)}
                />
              </div>

              {/* Optional Screenshot Upload Section */}
              <div className="form-group">
                <div className="label-with-hint">
                  <label className="form-label">
                    <ImageIcon size={14} />
                    <span>Upload Screenshot (Optional)</span>
                  </label>
                  <span className="label-hint">PNG, JPG, WebP up to 8MB • Drag &amp; Drop or Ctrl+V to paste</span>
                </div>

                {!screenshotUrl ? (
                  <div 
                    className="screenshot-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={24} className="upload-ico" />
                    <div className="dropzone-text">
                      <strong>Click to upload screenshot</strong> or drag image here
                    </div>
                    <span className="dropzone-sub">You can also copy an image and press <code>Ctrl+V</code></span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                  </div>
                ) : (
                  <div className="screenshot-preview-card">
                    <div className="preview-thumb-wrap" onClick={() => setPreviewZoom(!previewZoom)}>
                      <img src={screenshotUrl} alt="Attached screenshot" className="preview-img" />
                      <div className="thumb-zoom-overlay">
                        <Eye size={16} />
                        <span>{previewZoom ? 'Shrink' : 'Zoom'}</span>
                      </div>
                    </div>
                    <div className="preview-info">
                      <span className="preview-filename">{screenshotName || 'Attached Screenshot'}</span>
                      <span className="preview-ready-tag">Ready to send</span>
                    </div>
                    <button
                      type="button"
                      className="preview-remove-btn"
                      onClick={handleRemoveScreenshot}
                      title="Remove image"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {previewZoom && screenshotUrl && (
                  <div className="lightbox-zoom-overlay" onClick={() => setPreviewZoom(false)}>
                    <img src={screenshotUrl} alt="Zoomed screenshot" className="lightbox-img" />
                    <button className="lightbox-close-btn" onClick={() => setPreviewZoom(false)}>
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>

              {/* Contact Information (Pre-filled if logged in) */}
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
            </div>

            {/* Modal Bottom Actions */}
            <div className="feedback-modal-footer">
              <div className="footer-admin-note">
                <HelpCircle size={13} />
                <span>Submissions are encrypted and only accessible to system administrators.</span>
              </div>

              <div className="footer-btn-group">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="spin-icon" />
                      <span>Submitting to Admin...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>{activeTab === 'BUG_REPORT' ? 'Submit Issue Report' : 'Submit Feature Idea'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
