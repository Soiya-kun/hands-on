import { useState } from 'react';
import { postForm } from './lib/api';

export default function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await postForm({ name, email, message, consent });
      setStatus('Success');
      setName('');
      setEmail('');
      setMessage('');
      setConsent(false);
    } catch (err) {
      setStatus('Error');
    }
  }

  return (
    <form className="max-w-md mx-auto p-4" onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block mb-1" htmlFor="name">Name</label>
        <input id="name" className="w-full border p-2" value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
      </div>
      <div className="mb-4">
        <label className="block mb-1" htmlFor="email">Email</label>
        <input id="email" type="email" className="w-full border p-2" value={email} onChange={e => setEmail(e.target.value)} required />
      </div>
      <div className="mb-4">
        <label className="block mb-1" htmlFor="message">Message</label>
        <textarea id="message" className="w-full border p-2" value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} />
      </div>
      <div className="mb-4 flex items-center">
        <input id="consent" type="checkbox" className="mr-2" checked={consent} onChange={e => setConsent(e.target.checked)} required />
        <label htmlFor="consent">I agree</label>
      </div>
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Submit</button>
      {status && <p className="mt-4">{status}</p>}
    </form>
  );
}
