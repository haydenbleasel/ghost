'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const NewServerPage = () => {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const res = await fetch('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(form.get('name')),
        game: 'minecraft',
      }),
    });
    setPending(false);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      toast.error(error.error ?? 'Could not create server');
      return;
    }
    const { server } = await res.json();
    router.push(`/dashboard/${server.id}`);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">New Minecraft server</h1>
        <p className="text-muted-foreground text-sm">
          Creates a Hetzner VM from the Ultrabeam snapshot and starts the
          provisioning workflow.
        </p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Server name</Label>
          <Input id="name" name="name" required minLength={3} maxLength={40} />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Queuing…' : 'Create server'}
        </Button>
      </form>
    </div>
  );
};

export default NewServerPage;
