import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Login</h1>
        </div>
      </section>
      <div className="grid two">
        <LoginForm />
        <section className="panel">
          <h2>Contest Access</h2>
          <div className="grid">
            <div className="card">
              <strong>Submit Python solutions</strong>
            </div>
            <div className="card">
              <strong>Register for public contests</strong>
            </div>
            <div className="card">
              <strong>Track judged submissions</strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

