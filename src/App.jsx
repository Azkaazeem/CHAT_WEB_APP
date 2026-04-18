import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAppSelector } from "./app/hooks";
import { useAppDispatch } from "./app/hooks";
import AppHeader from "./components/AppHeader";
import { initializeAuth } from "./features/auth/authSlice";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import HomePage from "./pages/HomePage";

function ProtectedRoute({ children }) {
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/auth" />;
  }

  return children;
}

export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <BrowserRouter>
      <AppHeader />
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<AuthPage />} path="/auth" />
        <Route
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
          path="/chat"
        />
      </Routes>
    </BrowserRouter>
  );
}
