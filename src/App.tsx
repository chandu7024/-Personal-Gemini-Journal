/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, signInWithGoogle, signOutUser } from "./lib/firebase";
import { AuthLanding } from "./components/AuthLanding";
import { Dashboard } from "./components/Dashboard";
import { ThreatModelModal } from "./components/ThreatModelModal";
import { Loader2, Sparkles } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isThreatModalOpen, setIsThreatModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md mx-auto animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              ReflectAI
            </h2>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying authentication state...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentUser ? (
        <Dashboard user={currentUser} onSignOut={handleSignOut} />
      ) : (
        <AuthLanding
          onSignIn={handleSignIn}
          onOpenThreatModel={() => setIsThreatModalOpen(true)}
        />
      )}

      {/* Global Threat Model viewer for unauthenticated landing view */}
      {!currentUser && (
        <ThreatModelModal
          isOpen={isThreatModalOpen}
          onClose={() => setIsThreatModalOpen(false)}
        />
      )}
    </>
  );
}
