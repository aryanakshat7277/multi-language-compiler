import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import CompilerPage from './pages/CompilerPage';
import ProblemsPage from './pages/ProblemsPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import SubmissionsPage from './pages/SubmissionsPage';
import SubmissionDetailPage from './pages/SubmissionDetailPage';
import CodeAnalysisPage from './pages/CodeAnalysisPage';
import AstVisualizationPage from './pages/AstVisualizationPage';
import CodeSimilarityPage from './pages/CodeSimilarityPage';
import CodeShortenerPage from './pages/CodeShortenerPage';
import AiReviewPage from './pages/AiReviewPage';
import AssessmentPage from './pages/AssessmentPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthProvider } from './contexts/AuthContext';
import { CodeProvider } from './contexts/CodeContext';

function App() {
  return (
    <AuthProvider>
      <CodeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="compiler" element={<CompilerPage />} />
              <Route path="problems" element={<ProblemsPage />} />
              <Route path="problems/:id" element={<ProblemDetailPage />} />
              <Route path="submissions" element={<SubmissionsPage />} />
              <Route path="submissions/:id" element={<SubmissionDetailPage />} />
              <Route path="analysis" element={<CodeAnalysisPage />} />
              <Route path="ast" element={<AstVisualizationPage />} />
              <Route path="similarity" element={<CodeSimilarityPage />} />
              <Route path="shortest-code" element={<CodeShortenerPage />} />
              <Route path="ai-review" element={<AiReviewPage />} />
              <Route path="assessments" element={<AssessmentPage />} />
              <Route path="assessments/:id" element={<AssessmentPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CodeProvider>
    </AuthProvider>
  );
}

export default App;
