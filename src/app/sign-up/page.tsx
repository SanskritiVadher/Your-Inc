import React, { Suspense } from "react";
import SignInPage from "../sign-in/page";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center font-mono text-xs text-text-muted">
          Loading sign up...
        </div>
      }
    >
      <SignInPage />
    </Suspense>
  );
}
