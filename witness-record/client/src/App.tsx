import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { Landing, NotFound, Protection } from "./pages/Landing";
import { Invite, SignIn } from "./pages/SignIn";
import { MyStatements } from "./pages/MyStatements";
import { Receipt, StatementWizard } from "./pages/Statement";
import { AdminAudit, AdminInvites, AdminLayout, AdminOverview, AdminPrivacy, AdminReadiness, AdminStatementDetail, AdminStatements } from "./pages/Admin";
import { LanguageProvider } from "./lib/i18n";
import { SessionProvider } from "./lib/session";

export function App() {
  return (
    <LanguageProvider>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/protection" element={<Protection />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/i/:token" element={<Invite />} />
              <Route path="/statement" element={<Navigate to="/statement/consent" replace />} />
              <Route path="/statement/:step" element={<StatementWizard />} />
              <Route path="/receipt/:id" element={<Receipt />} />
              <Route path="/my" element={<MyStatements />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="statements" element={<AdminStatements />} />
                <Route path="statements/:id" element={<AdminStatementDetail />} />
                <Route path="invites" element={<AdminInvites />} />
                <Route path="privacy" element={<AdminPrivacy />} />
                <Route path="audit" element={<AdminAudit />} />
                <Route path="readiness" element={<AdminReadiness />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </LanguageProvider>
  );
}
