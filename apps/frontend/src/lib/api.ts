export interface FormInput {
  name: string;
  email: string;
  message?: string;
  consent: boolean;
}

export interface PostFormResponse {
  id: string;
  saved_at: string;
}

export async function postForm(input: FormInput): Promise<PostFormResponse> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const res = await fetch(`${baseUrl}/forms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error('Failed to submit');
  }
  return res.json();
}
