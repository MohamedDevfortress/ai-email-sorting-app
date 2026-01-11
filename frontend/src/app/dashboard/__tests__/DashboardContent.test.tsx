import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiDeleteWithBody = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: any[]) => mockApiGet(...args),
    post: (...args: any[]) => mockApiPost(...args),
    deleteWithBody: (...args: any[]) => mockApiDeleteWithBody(...args),
  },
}));

vi.mock('@/components/AccountSwitcher', () => ({
  default: () => <div data-testid="switcher">Switcher</div>,
}));

vi.mock('@/components/EmailDetailModal', () => ({
  default: () => null,
}));

const { default: DashboardContent } = await import('../DashboardContent');

describe('DashboardContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    mockApiGet.mockResolvedValue([
      { id: '1', name: 'Work', description: 'Work emails' },
    ]);
  });

  it('should render categories list', async () => {
    render(<DashboardContent />);
    
    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument();
    });
  });

  it('should show empty state', async () => {
    mockApiGet.mockResolvedValue([]);
    render(<DashboardContent />);
    
    await waitFor(() => {
      expect(screen.getByText('No categories yet')).toBeInTheDocument();
    });
  });
});
