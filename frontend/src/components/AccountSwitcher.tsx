'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PlusCircle, Check, Trash2 } from 'lucide-react';

interface ConnectedAccount {
  id: string;
  email: string;
  isActive: boolean;
  connectedAt: string;
}

interface AccountSwitcherProps {
  token: string;
}

export default function AccountSwitcher({ token }: AccountSwitcherProps) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/users/connected-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAccount = async (targetUserId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/users/switch-account/${targetUserId}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        // Store new token and reload
        localStorage.setItem('token', data.access_token);
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to activate account:', error);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/users/connected-accounts/${accountId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        fetchAccounts();
      }
    } catch (error) {
      console.error('Failed to remove account:', error);
    }
  };

  const handleAddAccount = () => {
    // Decode token to get current user ID
    const storedToken = localStorage.getItem('token');
    if (!storedToken) return;

    try {
      const payload = JSON.parse(atob(storedToken.split('.')[1]));
      const userId = payload.sub;
      
      // Redirect to OAuth flow with linkTo parameter
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/google?prompt=select_account&linkTo=${userId}`;
    } catch (e) {
      console.error('Failed to decode token:', e);
      // Fallback without linkTo
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/google?prompt=select_account`;
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading accounts...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>Manage your Gmail accounts</CardDescription>
          </div>
          <Button size="sm" onClick={handleAddAccount}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No connected accounts</p>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                account.isActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{account.email[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {account.email}
                    {account.isActive && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Connected {new Date(account.connectedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {!account.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleActivateAccount(account.id)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Switch
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveAccount(account.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
