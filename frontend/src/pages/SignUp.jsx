import { useState } from 'react';

function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: wire up to Supabase Auth
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="page page-signup">
        <h1>Thanks for signing up!</h1>
        <p>We'll be in touch, {form.name || 'friend'}.</p>
      </div>
    );
  }

  return (
    <div className="page page-signup">
      <h1>Sign Up</h1>
      <form onSubmit={handleSubmit} className="signup-form">
        <label>
          Name
          <input type="text" name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          Password
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </label>
        <button type="submit" className="btn btn-primary">Create Account</button>
      </form>
    </div>
  );
}

export default SignUp;
