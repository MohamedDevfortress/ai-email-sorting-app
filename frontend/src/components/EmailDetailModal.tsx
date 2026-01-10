'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, Calendar, User } from 'lucide-react';

interface EmailDetailModalProps {
  emailId: string;
  token: string;
  isOpen: boolean;
  onClose: () => void;
}

interface OriginalEmail {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  isHtml: boolean;
}

export default function EmailDetailModal({ emailId, token, isOpen, onClose }: EmailDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<OriginalEmail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOriginalEmail = async () => {
    if (!emailId || email) return; // Don't fetch if already loaded

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/emails/${emailId}/original`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setEmail(data);
      } else {
        setError('Failed to load email');
      }
    } catch (err) {
      setError('Error loading email');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch email when modal opens
  useState(() => {
    if (isOpen && !email) {
      fetchOriginalEmail();
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Original Email</DialogTitle>
          <DialogDescription>View the complete email content</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading email...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">{error}</div>
          </div>
        )}

        {email && !loading && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Email Headers */}
            <div className="space-y-2 border-b pb-4">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-1 text-gray-500" />
                <div className="flex-1">
                  <div className="font-semibold">{email.subject}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-1 text-gray-500" />
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-medium">From:</span> {email.from}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">To:</span> {email.to}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div className="text-sm text-gray-600">{email.date}</div>
              </div>
            </div>

            {/* Email Body */}
            <div className="prose prose-sm max-w-none">
              {email.isHtml ? (
                <div
                  className="email-content"
                  dangerouslySetInnerHTML={{ __html: email.body }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm">{email.body}</pre>
              )}
            </div>
          </div>
        )}

        <div className="border-t pt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
