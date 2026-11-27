import { useState } from 'react';
import { useAuth } from '../auth';

export function Login() {
  const { signIn } = useAuth();
  const [err, setErr] = useState('');
  return (
    <main className="center">
      <h1>Interactive Designer</h1>
      <p>Create interactive learning activities and export them as SCORM packages for Canvas.</p>
      <button
        className="primary big"
        onClick={() => signIn().catch((e: Error) => setErr(e.message))}
      >
        Sign in with Google
      </button>
      {err && (
        <p role="alert" className="error">
          {err}
        </p>
      )}
    </main>
  );
}
