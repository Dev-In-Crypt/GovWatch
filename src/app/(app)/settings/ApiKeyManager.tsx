'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { trpc } from '@/lib/trpc-client';

export function ApiKeyManager({ initialKey }: { initialKey: string | null }) {
  const [key, setKey] = useState(initialKey);
  const rotate = trpc.user.rotateApiKey.useMutation({
    onSuccess: (d) => setKey(d.apiKey),
  });
  const revoke = trpc.user.revokeApiKey.useMutation({ onSuccess: () => setKey(null) });

  return (
    <div className="space-y-3">
      {key ? (
        <div className="flex items-center gap-2 rounded-md border bg-secondary p-3">
          <code className="flex-1 truncate font-mono text-xs">{key}</code>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard.writeText(key)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Badge variant="outline">No API key yet</Badge>
      )}
      <div className="flex gap-2">
        <Button onClick={() => rotate.mutate()} disabled={rotate.isPending}>
          {key ? 'Rotate key' : 'Create key'}
        </Button>
        {key && (
          <Button variant="outline" onClick={() => revoke.mutate()} disabled={revoke.isPending}>
            Revoke
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Free for everyone — 5,000 calls/month. Send as{' '}
        <code>Authorization: Bearer &lt;key&gt;</code> to{' '}
        <code>https://daosentinel.xyz/api/v1/proposals</code> etc. Rotating invalidates the old key
        immediately.
      </p>
    </div>
  );
}
