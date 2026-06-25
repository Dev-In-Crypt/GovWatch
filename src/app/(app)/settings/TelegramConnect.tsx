'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc-client';

export function TelegramConnect({
  connectUrl,
  initialChatId,
  initialEnabled,
}: {
  connectUrl: string | null;
  initialChatId: string | null;
  initialEnabled: boolean;
}) {
  const [chatId, setChatId] = useState(initialChatId);
  const [enabled, setEnabled] = useState(initialEnabled);
  const disconnect = trpc.user.disconnectTelegram.useMutation({
    onSuccess: () => {
      setChatId(null);
      setEnabled(false);
    },
  });

  // Bot not configured yet on the server.
  if (!connectUrl) {
    return (
      <p className="text-sm text-[hsl(var(--text-dim))]">
        Telegram alerts are coming soon — the bot is being set up.
      </p>
    );
  }

  if (chatId && enabled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="success">Connected</Badge>
          <span className="mono text-[hsl(var(--text-dim))]">chat {chatId}</span>
        </div>
        <p className="text-xs text-[hsl(var(--text-dim))]">
          Whale, swing and quorum alerts for your watchlist are delivered to Telegram. Send{' '}
          <code>/stop</code> in the chat to pause, or disconnect here.
        </p>
        <Button
          variant="outline"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[hsl(var(--text-dim))]">
        Get whale, swing and quorum alerts for the DAOs on your watchlist pushed straight to
        Telegram.
      </p>
      <a
        href={connectUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-mc btn-mc-primary inline-flex"
        style={{ padding: '9px 18px', fontSize: 14 }}
      >
        Connect Telegram →
      </a>
      <p className="text-xs text-[hsl(var(--text-faint))]">
        Opens the DAO Sentinel bot. Tap <b>Start</b> to link this account.
      </p>
    </div>
  );
}
