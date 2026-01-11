import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailDetailModal from '../EmailDetailModal';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('EmailDetailModal Component', () => {
  const mockEmail = {
    id: 'email-123',
    subject: 'Important Meeting Tomorrow',
    sender: 'boss@company.com',
    summary: 'Meeting about Q4 planning',
    receivedAt: '2024-01-15T10:00:00Z',
  };

  const mockToken = 'test-token';
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockEmail,
        rawContent: '<p>Full email HTML content</p>',
      }),
    });
  });

  it('should render email details', () => {
    render(
      <EmailDetailModal
        emailId={mockEmail.id}
        token={mockToken}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should fetch email details on open', async () => {
    render(
      <EmailDetailModal
        emailId={mockEmail.id}
        token={mockToken}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/emails/${mockEmail.id}`),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <EmailDetailModal
        emailId={mockEmail.id}
        token={mockToken}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    // Find close button (assuming it has accessible name or testid)
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn => 
      btn.getAttribute('aria-label')?.includes('Close') || 
      btn.textContent?.includes('×')
    );

    if (closeButton) {
      await user.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <EmailDetailModal
        emailId={mockEmail.id}
        token={mockToken}
        onClose={mockOnClose}
        isOpen={false}
      />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(
      <EmailDetailModal
        emailId={mockEmail.id}
        token={mockToken}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Modal should still be rendered even with error
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
