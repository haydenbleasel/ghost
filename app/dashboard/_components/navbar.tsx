'use client';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export const Navbar = () => {
  const router = useRouter();
  return (
    <nav className="flex items-center justify-between border-b px-6 py-4">
      <Link href="/dashboard" className="text-lg font-semibold">
        Ultrabeam
      </Link>
      <div className="flex gap-2">
        <Button asChild variant="default">
          <Link href="/dashboard/new">New server</Link>
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            await signOut();
            router.push('/');
            router.refresh();
          }}
        >
          Sign out
        </Button>
      </div>
    </nav>
  );
};
